// SPOILERS: the answer key for release-notes. Read it after your first run, not before.
import { readJson, readText, writeText, editJson, editText, pass, fail, key, sameSet } from '../../bin/lib/checks.mjs';

export const steps = [
  { n: 1, label: 'List the commits' },
  { n: 2, label: 'Group them' },
  { n: 3, label: 'Next version' },
  { n: 4, label: 'Contributors' },
  { n: 5, label: 'Changelog entry' },
  { n: 6, label: 'Announcement' },
];

export const solution = {
  scripts: ['release.mjs'],
  produces: ['1-commits.json', '2-groups.json', '3-version.txt', '4-contributors.json', 'CHANGELOG-entry.md'],
};

// The 14 commits after tag v0.9.3. Jonas Berg's fix and the doctor command shipped in 0.9.3.
const SINCE_TAG = ['4f1c9e2', 'b83d0a7', '9e27c4d', '7ad5512', 'e0b4c18', '2c9f7b3', 'c71e8d0', '5b3a9f4', '31a6f0b', 'd4e8a21', 'a9c0f36', '0f6d2b8', '8e1b7c5', '6a2d4f9'];
const BANG = '5b3a9f4'; // feat(api)!: the easy breaking change
const FOOTER = '2c9f7b3'; // fix(auth) with BREAKING CHANGE: in its body, the hidden one
const FEATURES = ['e0b4c18', '0f6d2b8']; // CSV export (31a6f0b) was reverted inside this release
const FIXES = ['7ad5512', 'd4e8a21', '8e1b7c5'];
const PEOPLE = ['Lena Vogel', 'Marcus Reid', 'Priya Shah', 'Sam Okafor', 'Tomás Ortega', 'Wei Chen'];

const groups = (out) => {
  const g = readJson(out, '2-groups.json');
  return Object.fromEntries(['breaking', 'features', 'fixes', 'other'].map((k) => [k, (g[k] ?? []).map((h) => String(h).slice(0, 7))]));
};
const move = (out, hash, from, to) =>
  editJson(out, '2-groups.json', (g) => {
    g[from] = g[from].filter((h) => h !== hash);
    g[to].push(hash);
  });

export const checks = [
  {
    id: 'since-tag',
    step: 1,
    says: 'Exactly the 14 commits after tag v0.9.3',
    run: (out) => sameSet(readJson(out, '1-commits.json').map((c) => String(c.hash).slice(0, 7)), SINCE_TAG, { label: 'commits' }),
    break: (out) => editJson(out, '1-commits.json', (l) => [...l, { hash: '1d7e3c0', author: 'Priya Shah', subject: 'chore(release): 0.9.3' }]),
  },
  {
    id: 'breaking-bang',
    step: 2,
    says: 'feat(api)! is breaking',
    run: (out) => (groups(out).breaking.includes(BANG) ? pass() : fail(`${BANG} is not in breaking`)),
    break: (out) => move(out, BANG, 'breaking', 'features'),
  },
  {
    id: 'breaking-footer',
    step: 2,
    says: 'The fix with a BREAKING CHANGE footer is breaking',
    run: (out) => (groups(out).breaking.includes(FOOTER) ? pass() : fail(`${FOOTER} (fix(auth), footer in its body) is not in breaking`)),
    break: (out) => move(out, FOOTER, 'breaking', 'fixes'),
  },
  {
    id: 'features-exact',
    step: 2,
    says: 'Features are the two that shipped; the reverted CSV export is not one',
    run: (out) => sameSet(groups(out).features, FEATURES, { label: 'features' }),
    break: (out) => editJson(out, '2-groups.json', (g) => void g.features.push('31a6f0b')),
  },
  {
    id: 'fixes-exact',
    step: 2,
    says: 'Fixes are the three non-breaking fixes',
    run: (out) => sameSet(groups(out).fixes, FIXES, { label: 'fixes' }),
    break: (out) => move(out, FOOTER, 'breaking', 'fixes'),
  },
  {
    id: 'one-group-each',
    step: 2,
    says: 'No commit is in two groups',
    run: (out) => {
      const all = Object.values(groups(out)).flat();
      const twice = [...new Set(all.filter((h, i) => all.indexOf(h) !== i))];
      return twice.length ? fail(`in two groups: ${twice.join(', ')}`) : pass();
    },
    break: (out) => editJson(out, '2-groups.json', (g) => void g.features.push(BANG)),
  },
  {
    id: 'version',
    step: 3,
    says: 'The next version is 0.10.0 (below 1.0, breaking bumps the minor)',
    run: (out) => {
      const v = readText(out, '3-version.txt').trim().replace(/^v/, '');
      return v === '0.10.0' ? pass() : fail(`got ${v}`);
    },
    break: (out) => writeText(out, '3-version.txt', '1.0.0\n'),
  },
  {
    id: 'contributors-exact',
    step: 4,
    says: 'Six people: co-author in, bot out, aliases merged, 0.9.3 work left out',
    run: (out) => sameSet(readJson(out, '4-contributors.json').map(String), PEOPLE, { label: 'people' }),
    break: (out) => editJson(out, '4-contributors.json', (l) => [...l, 'dependabot[bot]']),
  },
  {
    id: 'contributors-sorted',
    step: 4,
    says: 'Contributors are in alphabetical order',
    run: (out) => {
      const names = readJson(out, '4-contributors.json').map(String);
      const sorted = [...names].sort((a, b) => key(a).localeCompare(key(b), 'en'));
      return names.every((n, i) => n === sorted[i]) ? pass() : fail(`order is ${names.join(', ')}`);
    },
    break: (out) => editJson(out, '4-contributors.json', (l) => l.reverse()),
  },
  {
    id: 'changelog-heading',
    step: 5,
    says: 'The changelog heading names 0.10.0',
    run: (out) => {
      const headings = readText(out, 'CHANGELOG-entry.md').split('\n').filter((l) => /^#{1,3}\s/.test(l));
      return headings.some((h) => /\b0\.10\.0\b/.test(h)) ? pass() : fail(`headings: ${headings.slice(0, 2).join(' | ') || 'none'}`);
    },
    break: (out) => editText(out, 'CHANGELOG-entry.md', (t) => t.replace('[0.10.0]', '[1.0.0]')),
  },
  {
    id: 'changelog-no-revert',
    step: 5,
    says: 'The changelog does not announce the reverted CSV export',
    run: (out) => (/csv/i.test(readText(out, 'CHANGELOG-entry.md')) ? fail('it mentions CSV export') : pass()),
    break: (out) => editText(out, 'CHANGELOG-entry.md', (t) => t.replace('### Features\n', '### Features\n\n- **export:** add CSV export (31a6f0b)')),
  },
  {
    id: 'changelog-breaking',
    step: 5,
    says: 'The changelog names both breaking changes (fetchAll, onExpire)',
    run: (out) => {
      const t = readText(out, 'CHANGELOG-entry.md');
      const missing = ['fetchAll', 'onExpire'].filter((w) => !t.includes(w));
      return missing.length ? fail(`does not mention ${missing.join(', ')}`) : pass();
    },
    break: (out) => editText(out, 'CHANGELOG-entry.md', (t) => t.replace(/.*onExpire.*\n/, '')),
  },
  {
    id: 'announce-version',
    step: 6,
    says: 'The announcement says 0.10.0 and never 1.0.0',
    run: (out) => {
      const t = readText(out, 'announcement.md');
      if (/\b1\.0\.0\b/.test(t)) return fail('it says 1.0.0');
      return /\b0\.10\.0\b/.test(t) ? pass() : fail('it does not say 0.10.0');
    },
    break: (out) => editText(out, 'announcement.md', (t) => t.replace('0.10.0', '1.0.0')),
  },
  {
    id: 'announce-migration',
    step: 6,
    says: 'The announcement tells people what to use instead (client.list, onRefresh)',
    run: (out) => {
      const t = readText(out, 'announcement.md');
      const missing = ['client.list', 'onRefresh'].filter((w) => !t.includes(w));
      return missing.length ? fail(`does not mention ${missing.join(', ')}`) : pass();
    },
    break: (out) => editText(out, 'announcement.md', (t) => t.replace(/.*onRefresh.*\n/, '')),
  },
];
