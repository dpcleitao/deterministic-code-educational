#!/usr/bin/env node
// Step 4 of post-generator as code. Counts characters (Unicode code points) so nobody has to
// guess, and checks each post still carries its link. The model rewrites; this script judges.
//   node measure.mjs out/3-posts.json   → writes out/4-final.json, exits 1 if anything is wrong
import fs from 'node:fs';

const source = process.argv[2] ?? 'out/3-posts.json';
const campaign = JSON.parse(fs.readFileSync('campaign.json', 'utf8'));
const links = JSON.parse(fs.readFileSync('out/2-links.json', 'utf8'));
const posts = JSON.parse(fs.readFileSync(source, 'utf8'));

const count = (s) => [...s].length;
const final = {};
const problems = [];
for (const p of campaign.platforms) {
  const text = posts[p.key];
  if (typeof text !== 'string') {
    problems.push(`${p.key}: no post in ${source}`);
    continue;
  }
  final[p.key] = { text, characters: count(text) };
  if (count(text) > p.max_chars) problems.push(`${p.key}: ${count(text)} characters, limit ${p.max_chars}`);
  const firstLine = text.split('\n')[0];
  if (p.first_line_max_chars && count(firstLine) > p.first_line_max_chars) {
    problems.push(`${p.key}: first line is ${count(firstLine)} characters, limit ${p.first_line_max_chars}`);
  }
  const uses = text.split(links[p.key]).length - 1;
  if (uses !== 1) problems.push(`${p.key}: the link appears ${uses} times, want exactly 1`);
}
fs.writeFileSync('out/4-final.json', JSON.stringify(final, null, 2) + '\n');
for (const [k, v] of Object.entries(final)) console.log(`${k}: ${v.characters} characters`);
if (problems.length) {
  console.log(`\nFix these and measure again:\n- ${problems.join('\n- ')}`);
  process.exit(1);
}
console.log('All posts fit.');
