// SPOILERS: the answer key for dependency-triage. Read it after your first run, not before.
import fs from 'node:fs';
import { readJson, readText, editJson, editText, pass, fail, sameSet } from '../../bin/lib/checks.mjs';

export const steps = [
  { n: 1, label: 'List the dependencies' },
  { n: 2, label: 'Newest in range' },
  { n: 3, label: 'Newest stable' },
  { n: 4, label: 'Match advisories' },
  { n: 5, label: 'Find the fixes' },
  { n: 6, label: 'Write the plan' },
];

export const solution = {
  scripts: ['triage.mjs'],
  produces: ['1-deps.json', '2-in-range.json', '3-latest.json', '4-vulnerable.json', '5-fixes.json'],
};

// Cross-checked against the semver package npm itself uses.
const NAMES = ['routekit', 'dashkit', 'schemata', 'datewise', '@acme/ui-kit', 'tinypad', 'fetchline', 'colorize'];
const VULNERABLE = ['dashkit', 'fetchline', '@acme/ui-kit'];
const PUBLISHED = new Set(Object.values(JSON.parse(fs.readFileSync(new URL('./input/registry.json', import.meta.url), 'utf8'))).flat());

const versionsMatch = (file, want) => (out) => {
  const got = readJson(out, file);
  const wrong = Object.entries(want)
    .filter(([n, v]) => String(got[n] ?? '').replace(/^v/, '') !== v)
    .map(([n, v]) => `${n} is ${got[n] ?? 'missing'}, want ${v}`);
  return wrong.length ? fail(wrong.join('; ')) : pass();
};

const fixFor = (out, name) => readJson(out, '5-fixes.json')[name] ?? {};
const allowsMatch = (want) => (out) => {
  const wrong = Object.entries(want)
    .filter(([n, v]) => fixFor(out, n).range_allows !== v)
    .map(([n, v]) => `${n}: range_allows is ${fixFor(out, n).range_allows}, want ${v}`);
  return wrong.length ? fail(wrong.join('; ')) : pass();
};

const set = (file, name, value) => (out) => editJson(out, file, (d) => void (d[name] = value));

export const checks = [
  {
    id: 'deps-listed',
    step: 1,
    says: 'All 8 dependencies are listed with the right range and installed version',
    run: (out) => {
      const list = readJson(out, '1-deps.json');
      const names = sameSet(list.map((d) => d.name), NAMES, { label: 'dependencies', normalise: (s) => s });
      if (!names.pass) return names;
      const off = list.filter((d) => (d.name === 'fetchline' && d.range !== '6.19.2') || (d.name === 'datewise' && d.installed !== '2.29.3'));
      return off.length ? fail(`wrong range or version for ${off.map((d) => d.name).join(', ')}`) : pass();
    },
    break: (out) => editJson(out, '1-deps.json', (l) => l.filter((d) => d.name !== 'tinypad')),
  },
  {
    id: 'in-range-caret',
    step: 2,
    says: 'Ordinary ^ ranges, numbers compared as numbers (colorize 5.10.0 beats 5.9.2)',
    run: versionsMatch('2-in-range.json', { routekit: '4.21.1', dashkit: '4.17.21', schemata: '3.24.1', colorize: '5.10.0' }),
    break: set('2-in-range.json', 'colorize', '5.9.2'),
  },
  {
    id: 'in-range-below-1',
    step: 2,
    says: '^ below 1.0: ^0.4.2 stops before 0.5.0, ^0.0.3 means 0.0.3 only',
    run: versionsMatch('2-in-range.json', { '@acme/ui-kit': '0.4.9', tinypad: '0.0.3' }),
    break: set('2-in-range.json', '@acme/ui-kit', '0.12.1'),
  },
  {
    id: 'in-range-tilde-pin',
    step: 2,
    says: '~2.29.3 allows 2.29.10; an exact pin allows nothing newer',
    run: versionsMatch('2-in-range.json', { datewise: '2.29.10', fetchline: '6.19.2' }),
    break: set('2-in-range.json', 'fetchline', '6.19.8'),
  },
  {
    id: 'latest-no-prerelease',
    step: 3,
    says: 'Newest stable skips betas and release candidates',
    run: versionsMatch('3-latest.json', { routekit: '5.0.1', schemata: '3.24.1', '@acme/ui-kit': '0.12.1', dashkit: '4.17.21' }),
    break: set('3-latest.json', 'routekit', '5.1.0-beta.1'),
  },
  {
    id: 'latest-numeric',
    step: 3,
    says: 'Newest stable compares numbers, not text (datewise 3.6.0, colorize 5.10.0)',
    run: versionsMatch('3-latest.json', { datewise: '3.6.0', colorize: '5.10.0', tinypad: '0.1.0', fetchline: '7.0.0' }),
    break: set('3-latest.json', 'colorize', '5.9.2'),
  },
  {
    id: 'vuln-text-compare',
    step: 4,
    says: 'dashkit 4.17.4 is vulnerable: 4.17.4 is below 4.17.21',
    run: (out) => (readJson(out, '4-vulnerable.json').some((v) => v.name === 'dashkit') ? pass() : fail('dashkit is not listed')),
    break: (out) => editJson(out, '4-vulnerable.json', (l) => l.filter((v) => v.name !== 'dashkit')),
  },
  {
    id: 'vuln-exact',
    step: 4,
    says: 'Exactly three vulnerable packages; schemata and routekit are not',
    run: (out) => sameSet(readJson(out, '4-vulnerable.json').map((v) => v.name), VULNERABLE, { label: 'packages', normalise: (s) => s }),
    break: (out) => editJson(out, '4-vulnerable.json', (l) => [...l, { name: 'schemata', installed: '3.22.4', advisory: 'ADV-2026-0219' }]),
  },
  {
    id: 'fix-versions',
    step: 5,
    says: 'Each fix is the lowest safe version: 4.17.21, 6.19.8, 0.5.0',
    run: (out) => {
      const want = { dashkit: '4.17.21', fetchline: '6.19.8', '@acme/ui-kit': '0.5.0' };
      const wrong = Object.entries(want)
        .filter(([n, v]) => String(fixFor(out, n).fixed_in ?? '') !== v)
        .map(([n, v]) => `${n} is ${fixFor(out, n).fixed_in ?? 'missing'}, want ${v}`);
      return wrong.length ? fail(wrong.join('; ')) : pass();
    },
    break: (out) => editJson(out, '5-fixes.json', (f) => void (f['@acme/ui-kit'].fixed_in = '0.12.1')),
  },
  {
    id: 'fix-range-below-1',
    step: 5,
    says: "^0.4.2 does not allow the ui-kit fix (0.5.0)",
    run: allowsMatch({ '@acme/ui-kit': false }),
    break: (out) => editJson(out, '5-fixes.json', (f) => void (f['@acme/ui-kit'].range_allows = true)),
  },
  {
    id: 'fix-range-others',
    step: 5,
    says: 'dashkit can update within its range; the fetchline pin cannot',
    run: allowsMatch({ dashkit: true, fetchline: false }),
    break: (out) => editJson(out, '5-fixes.json', (f) => void (f.fetchline.range_allows = true)),
  },
  {
    id: 'plan-names-vulnerable',
    step: 6,
    says: 'The plan names all three vulnerable packages',
    run: (out) => {
      const t = readText(out, 'plan.md');
      const missing = VULNERABLE.filter((n) => !t.includes(n));
      return missing.length ? fail(`does not mention ${missing.join(', ')}`) : pass();
    },
    break: (out) => editText(out, 'plan.md', (t) => t.replaceAll('fetchline', 'the HTTP client')),
  },
  {
    id: 'plan-real-versions',
    step: 6,
    says: 'Every version the plan mentions was actually published',
    run: (out) => {
      const made = [...new Set(readText(out, 'plan.md').match(/\b\d+\.\d+\.\d+(?:-[\w.]+)?\b/g) ?? [])].filter((v) => !PUBLISHED.has(v));
      return made.length ? fail(`never published: ${made.join(', ')}`) : pass();
    },
    break: (out) => editText(out, 'plan.md', (t) => t.replace('The fix is 0.5.0', 'The fix is 0.5.2')),
  },
];
