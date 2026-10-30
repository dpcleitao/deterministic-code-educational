#!/usr/bin/env node
// The lab runner. Runs a scenario's skill in fresh Claude Code sessions, keeps every
// step's file, and grades each step with plain code. See README.md for the walkthrough.
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { CheckFail, fail } from './lib/checks.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCENARIOS_DIR = path.join(ROOT, 'scenarios');
const RUNS_DIR = path.join(ROOT, 'runs');

// What a run may do without asking. Bash is narrowed to a few commands; a model that
// decides to compute something can still write a script and run it with node or python3.
const ALLOWED_TOOLS = [
  'Read', 'Write', 'Edit', 'Glob', 'Grep', 'Skill',
  'Bash(node *)', 'Bash(python3 *)', 'Bash(mkdir *)', 'Bash(ls *)', 'Bash(cat *)', 'Bash(date *)',
];

const USAGE = `Usage: node bin/lab.mjs <command> [options]

Commands
  list                          The scenarios, easiest first
  run <scenario>                Run a skill in fresh sessions and grade every step
      --runs <n>                  How many fresh sessions (default 5)
      --model <name>              Model alias or id passed to claude (default sonnet)
      --variant <skill|solution|path>
                                  Which SKILL.md folder to run (default skill: the original)
      --parallel <n>              Sessions at once (default 1, max 5)
      --budget <usd>              Spend ceiling per session (default 1)
      --allow-code                Let sessions run any shell command, not just the short list
      --keep                      Keep each session's temp folder
  check <scenario> <folder>     Grade one folder of step files (a run, or your own)
  report <runs-folder>          Print the table for a finished batch again
  compare <before> <after>      Two batches side by side, check by check
  selftest                      Prove every check: it passes on the right answers
                                and fails when its step is broken. No model calls.

<scenario> can be the number (01), the name (split-the-bill) or the folder name.`;

const tty = process.stdout.isTTY;
const paint = (code, s) => (tty ? `\x1b[${code}m${s}\x1b[0m` : s);
const green = (s) => paint(32, s);
const red = (s) => paint(31, s);
const dim = (s) => paint(2, s);
const bold = (s) => paint(1, s);

function die(message) {
  console.error(red(message));
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Scenarios

function scenarios() {
  return fs
    .readdirSync(SCENARIOS_DIR)
    .filter((d) => fs.existsSync(path.join(SCENARIOS_DIR, d, 'scenario.json')))
    .sort()
    .map((d) => ({
      id: d,
      dir: path.join(SCENARIOS_DIR, d),
      ...JSON.parse(fs.readFileSync(path.join(SCENARIOS_DIR, d, 'scenario.json'), 'utf8')),
    }));
}

function findScenario(arg) {
  if (!arg) die('Name a scenario. Try: node bin/lab.mjs list');
  const all = scenarios();
  const hit = all.find((s) => s.id === arg || s.id.startsWith(`${arg}-`) || s.id.endsWith(`-${arg}`));
  if (!hit) die(`No scenario "${arg}". Try: node bin/lab.mjs list`);
  return hit;
}

async function loadChecks(s) {
  return import(pathToFileURL(path.join(s.dir, 'checks.mjs')).href);
}

function skillNameOf(skillDir) {
  const file = path.join(skillDir, 'SKILL.md');
  if (!fs.existsSync(file)) die(`No SKILL.md in ${skillDir}`);
  const name = fs.readFileSync(file, 'utf8').match(/^name:\s*(.+)$/m);
  if (!name) die(`${file} has no name: in its frontmatter`);
  return name[1].trim();
}

function resolveVariant(s, variant) {
  if (variant === 'skill' || variant === 'solution') return path.join(s.dir, variant);
  const dir = path.resolve(variant);
  if (!fs.existsSync(dir)) die(`No folder at ${variant}`);
  return dir;
}

// ---------------------------------------------------------------------------
// Grading

function runCheck(check, outDir) {
  try {
    return check.run(outDir);
  } catch (err) {
    if (err instanceof CheckFail) return fail(err.message);
    return fail(`the check itself crashed: ${err.message}`);
  }
}

function grade(mod, outDir) {
  return Object.fromEntries(mod.checks.map((c) => [c.id, runCheck(c, outDir)]));
}

function outDirOf(folder) {
  return fs.existsSync(path.join(folder, 'out')) ? path.join(folder, 'out') : folder;
}

// ---------------------------------------------------------------------------
// Running sessions

function filesUnder(dir, base = dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? filesUnder(p, base) : [path.relative(base, p)];
  });
}

function runOnce({ s, variantDir, skillName, model, budget, batchDir, index, keep, allowCode }) {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), `lab-${s.id}-`));
  fs.cpSync(path.join(s.dir, 'input'), work, { recursive: true });
  const skillDest = path.join(work, '.claude', 'skills', skillName);
  fs.cpSync(variantDir, skillDest, { recursive: true });
  const before = new Set(filesUnder(work));

  const args = [
    '-p', `/${skillName} Use the files in this folder.`,
    '--model', model,
    '--permission-mode', 'dontAsk',
    '--allowedTools', (allowCode ? [...ALLOWED_TOOLS, 'Bash'] : ALLOWED_TOOLS).join(','),
    // Only this temp folder's settings: your own hooks and plugins stay out of the test.
    '--setting-sources', 'project',
    '--strict-mcp-config',
    '--no-session-persistence',
    '--output-format', 'stream-json',
    '--verbose',
    '--max-budget-usd', String(budget),
  ];

  const started = Date.now();
  return new Promise((resolve) => {
    const child = spawn('claude', args, { cwd: work, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    const timer = setTimeout(() => child.kill('SIGTERM'), 15 * 60 * 1000);
    const done = (code) => {
      clearTimeout(timer);
      const runDir = path.join(batchDir, `run-${index + 1}`);
      fs.mkdirSync(runDir, { recursive: true });
      if (fs.existsSync(path.join(work, 'out'))) {
        fs.cpSync(path.join(work, 'out'), path.join(runDir, 'out'), { recursive: true });
      } else {
        fs.mkdirSync(path.join(runDir, 'out'));
      }
      // The transcript, one event per line: what the session read, wrote and ran.
      fs.writeFileSync(path.join(runDir, 'transcript.jsonl'), stdout);
      if (stderr.trim()) fs.writeFileSync(path.join(runDir, 'stderr.txt'), stderr);
      const events = stdout.split('\n').flatMap((line) => {
        try {
          return [JSON.parse(line)];
        } catch {
          return [];
        }
      });
      const result = events.findLast((e) => e.type === 'result') ?? null;
      const tools = {};
      for (const e of events.filter((e) => e.type === 'assistant')) {
        for (const part of e.message?.content ?? []) {
          if (part.type === 'tool_use') tools[part.name] = (tools[part.name] ?? 0) + 1;
        }
      }
      const denied = (result?.permission_denials ?? []).map((d) => d.tool_input?.command ?? d.tool_name);
      // Files the session wrote anywhere but out/: a step saving in the wrong place shows up here.
      const stray = filesUnder(work).filter((f) => !before.has(f) && !f.startsWith(`out${path.sep}`));
      if (!keep) fs.rmSync(work, { recursive: true, force: true });
      resolve({
        run: index + 1,
        finished: code === 0 && result && !result.is_error,
        exitCode: code,
        costUsd: result?.total_cost_usd ?? null,
        turns: result?.num_turns ?? null,
        seconds: Math.round((Date.now() - started) / 1000),
        tools,
        denied,
        stray,
        workdir: keep ? work : null,
        error: code === 0 ? null : (result?.result ?? stderr.trim().split('\n').slice(-3).join(' ')),
      });
    };
    child.on('close', done);
    child.on('error', (err) => {
      stderr += err.message;
      done(-1);
    });
  });
}

async function pool(count, width, task) {
  const results = new Array(count);
  let next = 0;
  const worker = async () => {
    while (next < count) {
      const i = next++;
      results[i] = await task(i);
    }
  };
  await Promise.all(Array.from({ length: Math.min(width, count) }, worker));
  return results;
}

async function cmdRun(s, opts) {
  if (spawnSync('claude', ['--version']).status !== 0) {
    die('Claude Code is not on your PATH. Install it first: https://claude.com/claude-code');
  }
  const mod = await loadChecks(s);
  const variantDir = resolveVariant(s, opts.variant);
  const skillName = skillNameOf(variantDir);
  const runs = Number(opts.runs);
  const parallel = Math.min(5, Math.max(1, Number(opts.parallel)));
  const label =
    (['skill', 'solution'].includes(opts.variant) ? opts.variant : path.basename(variantDir)) +
    (opts['allow-code'] ? '+code' : '');
  const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19);
  const batchDir = path.join(RUNS_DIR, s.id, `${stamp}_${label}_${opts.model}`);
  fs.mkdirSync(batchDir, { recursive: true });

  console.log(`${bold(s.id)} · ${label} · ${opts.model} · ${runs} fresh session${runs === 1 ? '' : 's'}`);
  console.log(dim(`Saving to ${path.relative(process.cwd(), batchDir)}`));

  const results = await pool(runs, parallel, async (index) => {
    const r = await runOnce({
      s, variantDir, skillName, model: opts.model, budget: opts.budget, batchDir, index, keep: opts.keep,
      allowCode: opts['allow-code'],
    });
    r.checks = grade(mod, path.join(batchDir, `run-${r.run}`, 'out'));
    const passed = Object.values(r.checks).filter((c) => c.pass).length;
    const status = r.finished ? green('finished') : red(`stopped (${r.error ?? 'exit ' + r.exitCode})`);
    console.log(`  run ${r.run}: ${status} · ${passed}/${mod.checks.length} checks · ${r.seconds}s`);
    return r;
  });

  const summary = {
    scenario: s.id,
    variant: label,
    variantDir: path.relative(ROOT, variantDir),
    model: opts.model,
    date: new Date().toISOString(),
    runs: results,
  };
  fs.writeFileSync(path.join(batchDir, 'summary.json'), JSON.stringify(summary, null, 2));
  const text = report(mod, summary);
  fs.writeFileSync(path.join(batchDir, 'report.md'), '```\n' + stripAnsi(text) + '\n```\n');
  console.log('\n' + text);
}

// ---------------------------------------------------------------------------
// Reports

const stripAnsi = (s) => s.replace(/\x1b\[[0-9;]*m/g, '');
const dots = (list) => list.map((ok) => (ok ? green('●') : red('○'))).join('');

function report(mod, summary) {
  const runs = summary.runs;
  const lines = [];
  const finished = runs.filter((r) => r.finished).length;
  const cost = runs.reduce((sum, r) => sum + (r.costUsd ?? 0), 0);
  lines.push(bold(`${summary.scenario} · ${summary.variant} · ${summary.model} · ${runs.length} runs`));
  lines.push(`finished ${finished}/${runs.length} · cost $${cost.toFixed(cost < 1 ? 3 : 2)} · ● pass  ○ fail, one dot per run`);
  for (const step of mod.steps) {
    lines.push('', `step ${step.n}  ${bold(step.label)}`);
    for (const c of mod.checks.filter((c) => c.step === step.n)) {
      const oks = runs.map((r) => r.checks[c.id]?.pass ?? false);
      const n = oks.filter(Boolean).length;
      lines.push(`  ${dots(oks)}  ${String(n).padStart(2)}/${runs.length}  ${c.says}`);
    }
  }
  const failures = mod.checks.flatMap((c) =>
    runs.filter((r) => !r.checks[c.id]?.pass).map((r) => `  step ${c.step} · run ${r.run} · ${c.says}\n      ${dim(r.checks[c.id]?.detail ?? 'not graded')}`),
  );
  if (failures.length) lines.push('', bold('Why each check failed'), ...failures);
  const stray = runs.filter((r) => r.stray?.length);
  if (stray.length) {
    lines.push('', bold('Files saved outside out/'));
    for (const r of stray) lines.push(`  run ${r.run}: ${r.stray.join(', ')}`);
  }
  // A run that wrote and ran its own code is a different experiment from one that did the sums in its head.
  lines.push('', bold('What each run did'));
  for (const r of runs) {
    const used = Object.entries(r.tools ?? {}).map(([t, n]) => `${t} ${n}`).join(', ') || 'no tools recorded';
    lines.push(`  run ${r.run}: ${used}${r.denied?.length ? dim(` · blocked: ${r.denied.join(' | ').slice(0, 120)}`) : ''}`);
  }
  lines.push('', dim('A pass only means the check passed. Open one passing run and read it too.'));
  return lines.join('\n');
}

function loadBatch(dir) {
  const file = path.join(path.resolve(dir), 'summary.json');
  if (!fs.existsSync(file)) die(`No summary.json in ${dir}`);
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

async function cmdReport(dir) {
  const summary = loadBatch(dir);
  console.log(report(await loadChecks(findScenario(summary.scenario)), summary));
}

async function cmdCompare(beforeDir, afterDir) {
  const before = loadBatch(beforeDir);
  const after = loadBatch(afterDir);
  if (before.scenario !== after.scenario) die('Those batches are from different scenarios.');
  const mod = await loadChecks(findScenario(before.scenario));
  const count = (b, id) => b.runs.filter((r) => r.checks[id]?.pass).length;
  console.log(bold(`${before.scenario}: ${before.variant}/${before.model} → ${after.variant}/${after.model}`));
  for (const step of mod.steps) {
    console.log(`\nstep ${step.n}  ${bold(step.label)}`);
    for (const c of mod.checks.filter((c) => c.step === step.n)) {
      const a = count(before, c.id);
      const b = count(after, c.id);
      const arrow = b > a ? green('↑') : b < a ? red('↓') : ' ';
      console.log(`  ${a}/${before.runs.length} → ${b}/${after.runs.length} ${arrow}  ${c.says}`);
    }
  }
}

async function cmdCheck(s, folder) {
  if (!folder) die('Give the folder to grade, e.g. runs/01-split-the-bill/<batch>/run-1');
  const mod = await loadChecks(s);
  const results = grade(mod, outDirOf(path.resolve(folder)));
  for (const step of mod.steps) {
    console.log(`\nstep ${step.n}  ${bold(step.label)}`);
    for (const c of mod.checks.filter((c) => c.step === step.n)) {
      const r = results[c.id];
      console.log(`  ${r.pass ? green('●') : red('○')}  ${c.says}${r.pass ? '' : '\n      ' + dim(r.detail)}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Self-test: check the checks

async function cmdSelftest() {
  let problems = 0;
  const problem = (msg) => {
    problems++;
    console.log(`  ${red('✗')} ${msg}`);
  };
  for (const s of scenarios()) {
    console.log(bold(s.id));
    const problemsBefore = problems;
    const mod = await loadChecks(s);
    const work = fs.mkdtempSync(path.join(os.tmpdir(), `lab-selftest-${s.id}-`));
    const out = path.join(work, 'out');
    fs.cpSync(path.join(s.dir, 'input'), work, { recursive: true });
    fs.mkdirSync(out);

    // Judgement files (the ones a model writes) come from the reference answers;
    // the solution's scripts must reproduce every other file byte for byte.
    const refOut = path.join(s.dir, 'reference', 'out');
    const produced = new Set(mod.solution.produces);
    for (const f of filesUnder(refOut)) {
      if (!produced.has(f)) fs.cpSync(path.join(refOut, f), path.join(out, f));
    }
    for (const entry of mod.solution.scripts) {
      const [script, ...args] = [entry].flat();
      const r = spawnSync('node', [path.join(s.dir, 'solution', 'scripts', script), ...args], { cwd: work, encoding: 'utf8' });
      if (r.status !== 0) problem(`solution script ${script} exited ${r.status}: ${r.stderr || r.stdout}`);
    }
    for (const f of produced) {
      const got = fs.existsSync(path.join(out, f)) ? fs.readFileSync(path.join(out, f), 'utf8') : null;
      const want = fs.readFileSync(path.join(refOut, f), 'utf8');
      if (got !== want) problem(`solution output out/${f} differs from reference/out/${f}`);
    }

    const results = grade(mod, out);
    for (const c of mod.checks) {
      if (!mod.steps.some((st) => st.n === c.step)) problem(`${c.id} names step ${c.step}, which is not in steps`);
      if (!results[c.id].pass) problem(`${c.id} fails on the reference answers: ${results[c.id].detail}`);
      if (typeof c.break !== 'function') {
        problem(`${c.id} has no break(): nothing proves it can fail`);
        continue;
      }
      const broken = path.join(work, `broken-${c.id}`);
      fs.cpSync(out, broken, { recursive: true });
      c.break(broken);
      const r = runCheck(c, broken);
      if (r.pass) problem(`${c.id} still passes after its step was broken on purpose`);
    }
    fs.rmSync(work, { recursive: true, force: true });
    if (problems === problemsBefore) console.log(`  ${green('✓')} ${mod.checks.length} checks pass on the right answers and fail when broken`);
  }
  if (problems) die(`\n${problems} problem${problems === 1 ? '' : 's'}`);
  console.log(green('\nEvery check is proven.'));
}

// ---------------------------------------------------------------------------

function cmdList() {
  for (const s of scenarios()) {
    console.log(`${bold(s.id)}  ${dim(s.difficulty)}\n  ${s.title}: ${s.blurb}\n`);
  }
}

const { values: opts, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    runs: { type: 'string', default: '5' },
    model: { type: 'string', default: 'sonnet' },
    variant: { type: 'string', default: 'skill' },
    parallel: { type: 'string', default: '1' },
    budget: { type: 'string', default: '1' },
    keep: { type: 'boolean', default: false },
    'allow-code': { type: 'boolean', default: false },
    help: { type: 'boolean', short: 'h', default: false },
  },
});

const [command, a, b] = positionals;
if (opts.help || !command) {
  console.log(USAGE);
} else if (command === 'list') {
  cmdList();
} else if (command === 'run') {
  await cmdRun(findScenario(a), opts);
} else if (command === 'check') {
  await cmdCheck(findScenario(a), b);
} else if (command === 'report') {
  await cmdReport(a);
} else if (command === 'compare') {
  await cmdCompare(a, b);
} else if (command === 'selftest') {
  await cmdSelftest();
} else {
  die(`Unknown command "${command}".\n\n${USAGE}`);
}
