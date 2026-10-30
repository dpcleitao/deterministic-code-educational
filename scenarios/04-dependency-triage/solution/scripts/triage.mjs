#!/usr/bin/env node
// Steps 1–5 of dependency-triage as code: the small part of semver this project needs
// (x.y.z, pre-releases, ^, ~, exact pins, and comparator lists like ">=6.0.0 <6.19.8").
import fs from 'node:fs';

const read = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const ranges = read('package.json').dependencies;
const installed = read('installed.json');
const registry = read('registry.json');
const advisories = read('advisories.json');

function parse(v) {
  const m = String(v).trim().match(/^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/);
  if (!m) throw new Error(`Not a version: ${v}`);
  return { major: +m[1], minor: +m[2], patch: +m[3], pre: m[4] ? m[4].split('.') : [] };
}

// Number by number, never as text. A pre-release sorts before its release.
function compare(a, b) {
  const [x, y] = [parse(a), parse(b)];
  for (const k of ['major', 'minor', 'patch']) if (x[k] !== y[k]) return x[k] - y[k];
  if (!x.pre.length || !y.pre.length) return y.pre.length - x.pre.length;
  for (let i = 0; i < Math.max(x.pre.length, y.pre.length); i++) {
    const [p, q] = [x.pre[i], y.pre[i]];
    if (p === undefined) return -1;
    if (q === undefined) return 1;
    const [np, nq] = [/^\d+$/.test(p), /^\d+$/.test(q)];
    if (np && nq && +p !== +q) return +p - +q;
    if (np !== nq) return np ? -1 : 1;
    if (p !== q) return p < q ? -1 : 1;
  }
  return 0;
}

const isStable = (v) => parse(v).pre.length === 0;

// A range as a list of [operator, version] comparators that must all hold.
function comparators(range) {
  const r = range.trim();
  if (r.startsWith('^')) {
    const { major, minor, patch } = parse(r.slice(1));
    const upper = major > 0 ? `${major + 1}.0.0` : minor > 0 ? `0.${minor + 1}.0` : `0.0.${patch + 1}`;
    return [['>=', r.slice(1)], ['<', upper]];
  }
  if (r.startsWith('~')) {
    const { major, minor } = parse(r.slice(1));
    return [['>=', r.slice(1)], ['<', `${major}.${minor + 1}.0`]];
  }
  return r.split(/\s+/).map((part) => {
    const m = part.match(/^(>=|<=|>|<|=)?(.+)$/);
    return [m[1] ?? '=', m[2]];
  });
}

function satisfies(version, range) {
  // A pre-release only matches a range that names a pre-release on the same x.y.z (npm's rule).
  if (!isStable(version)) {
    const v = parse(version);
    const named = comparators(range).some(([, c]) => {
      const p = parse(c);
      return p.pre.length && p.major === v.major && p.minor === v.minor && p.patch === v.patch;
    });
    if (!named) return false;
  }
  return comparators(range).every(([op, c]) => {
    const d = compare(version, c);
    return { '>=': d >= 0, '<=': d <= 0, '>': d > 0, '<': d < 0, '=': d === 0 }[op];
  });
}

const newest = (versions) => [...versions].sort(compare).at(-1) ?? null;

const names = Object.keys(ranges);
const deps = names.map((name) => ({ name, range: ranges[name], installed: installed[name] }));
const inRange = Object.fromEntries(names.map((n) => [n, newest(registry[n].filter((v) => satisfies(v, ranges[n])))]));
const latest = Object.fromEntries(names.map((n) => [n, newest(registry[n].filter(isStable))]));

const vulnerable = [];
for (const a of advisories) {
  const v = installed[a.package];
  if (v && satisfies(v, a.vulnerable)) vulnerable.push({ name: a.package, installed: v, advisory: a.id });
}

const fixes = {};
for (const { name, installed: v } of vulnerable) {
  const covered = (x) => advisories.some((a) => a.package === name && satisfies(x, a.vulnerable));
  const fix = registry[name].filter((x) => isStable(x) && compare(x, v) > 0 && !covered(x)).sort(compare)[0] ?? null;
  fixes[name] = { fixed_in: fix, range_allows: fix ? satisfies(fix, ranges[name]) : false };
}

const write = (file, data) => fs.writeFileSync(`out/${file}`, JSON.stringify(data, null, 2) + '\n');
fs.mkdirSync('out', { recursive: true });
write('1-deps.json', deps);
write('2-in-range.json', inRange);
write('3-latest.json', latest);
write('4-vulnerable.json', vulnerable);
write('5-fixes.json', fixes);
console.log(`Wrote out/1-deps.json … out/5-fixes.json: ${vulnerable.length} vulnerable`);
