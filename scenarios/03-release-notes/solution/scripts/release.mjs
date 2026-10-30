#!/usr/bin/env node
// Steps 1–5 of release-notes as code, following the rules in CONTRIBUTING.md.
// Reads commits.txt, package.json and .mailmap; writes out/1-commits.json … out/CHANGELOG-entry.md.
import fs from 'node:fs';

// --- Parse `git log` output: one block per "commit <hash>" line.
const commits = fs
  .readFileSync('commits.txt', 'utf8')
  .split(/^commit /m)
  .filter((block) => block.trim())
  .map((block) => {
    const lines = block.split(/\r?\n/);
    const [hash, decoration = ''] = lines[0].split(/\s+(?=\()/);
    const author = lines.find((l) => l.startsWith('Author:')).match(/^Author:\s*(.+?)\s*<(.+)>/);
    const message = lines.filter((l) => l.startsWith('    ')).map((l) => l.slice(4));
    const blank = lines.findIndex((l, i) => i > 0 && l.trim() === '');
    const body = lines.slice(blank + 1).map((l) => l.replace(/^ {4}/, '')).slice(1).join('\n').trim();
    return { hash: hash.trim(), decoration, name: author[1], email: author[2], subject: message[0], body };
  });

// --- Step 1: everything newer than the last release tag (the log is newest first).
const tagAt = commits.findIndex((c) => /tag: v\d/.test(c.decoration));
if (tagAt === -1) throw new Error('No release tag (tag: v…) in commits.txt');
let range = commits.slice(0, tagAt);

// A revert and the commit it reverts cancel out when both are in this release.
const reverted = new Set();
for (const c of range) {
  const target = c.subject.startsWith('revert') && c.body.match(/This reverts commit ([0-9a-f]+)/);
  if (target && range.some((x) => x.hash === target[1])) reverted.add(target[1]).add(c.hash);
}
const kept = range.filter((c) => !reverted.has(c.hash));

// --- Step 2: Conventional Commits.
const parsed = kept.map((c) => {
  const m = c.subject.match(/^(\w+)(?:\(([^)]*)\))?(!)?:\s*(.+)$/) ?? [];
  const footer = c.body.match(/^BREAKING[ -]CHANGE:\s*(.+)$/m);
  return { ...c, type: m[1] ?? 'other', scope: m[2] ?? null, text: m[4] ?? c.subject, breaking: Boolean(m[3] || footer), note: footer?.[1] ?? null };
});
const group = (c) => (c.breaking ? 'breaking' : c.type === 'feat' ? 'features' : c.type === 'fix' ? 'fixes' : 'other');
const groups = { breaking: [], features: [], fixes: [], other: [] };
for (const c of parsed) groups[group(c)].push(c);

// --- Step 3: semver, with the pre-1.0 rule from CONTRIBUTING.md.
const current = JSON.parse(fs.readFileSync('package.json', 'utf8')).version;
let [major, minor, patch] = current.split('.').map(Number);
if (groups.breaking.length) [major, minor, patch] = major === 0 ? [0, minor + 1, 0] : [major + 1, 0, 0];
else if (major > 0 && groups.features.length) [minor, patch] = [minor + 1, 0];
else patch += 1;
const version = `${major}.${minor}.${patch}`;

// --- Step 4: people, not bots; aliases through .mailmap; co-authors count.
const mailmap = new Map();
if (fs.existsSync('.mailmap')) {
  for (const line of fs.readFileSync('.mailmap', 'utf8').split(/\r?\n/)) {
    const m = line.match(/^(.+?)\s*<([^>]+)>\s*<([^>]+)>/);
    if (m) mailmap.set(m[3].toLowerCase(), m[1]).set(m[2].toLowerCase(), m[1]);
  }
}
const people = new Set();
const credit = (name, email) => {
  if (/\[bot\]/i.test(name) || /\[bot\]/i.test(email)) return;
  people.add(mailmap.get(email.toLowerCase()) ?? name);
};
for (const c of range) {
  credit(c.name, c.email);
  for (const [, name, email] of c.body.matchAll(/^Co-authored-by:\s*(.+?)\s*<(.+)>/gim)) credit(name, email);
}
const contributors = [...people].sort((a, b) => a.localeCompare(b, 'en'));

// --- Step 5: the changelog entry.
const line = (c) => `- ${c.scope ? `**${c.scope}:** ` : ''}${c.text} (${c.hash})${c.note ? `\n  ${c.note}` : ''}`;
const sections = [
  ['Breaking changes', groups.breaking],
  ['Features', groups.features],
  ['Fixes', groups.fixes],
  ['Other', groups.other],
];
const entry = [
  `## [${version}]`,
  ...sections.filter(([, list]) => list.length).map(([title, list]) => `\n### ${title}\n\n${list.map(line).join('\n')}`),
  `\n### Thanks\n\n${contributors.join(', ')}`,
].join('\n');

const write = (file, text) => fs.writeFileSync(`out/${file}`, text);
const json = (data) => JSON.stringify(data, null, 2) + '\n';
fs.mkdirSync('out', { recursive: true });
write('1-commits.json', json(range.map((c) => ({ hash: c.hash, author: c.name, subject: c.subject }))));
write('2-groups.json', json(Object.fromEntries(Object.entries(groups).map(([g, list]) => [g, list.map((c) => c.hash)]))));
write('3-version.txt', version + '\n');
write('4-contributors.json', json(contributors));
write('CHANGELOG-entry.md', entry + '\n');
console.log(`${current} → ${version}: ${range.length} commits, ${reverted.size} dropped as reverted, ${contributors.length} people`);
