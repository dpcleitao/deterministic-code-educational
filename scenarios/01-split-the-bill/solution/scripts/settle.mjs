#!/usr/bin/env node
// Steps 1–4 of split-the-bill as code. Reads expenses.csv, people.txt and rates.csv from
// the working directory and writes out/1-expenses.json to out/4-transfers.json.
// Money is held in whole pennies throughout, so nothing drifts.
import fs from 'node:fs';

function readCsv(file) {
  const [head, ...rows] = fs.readFileSync(file, 'utf8').trim().split(/\r?\n/);
  const cols = head.split(',');
  return rows.map((row) => {
    const vals = row.split(',');
    // The last column may hold commas; everything past the others belongs to it.
    const fixed = [...vals.slice(0, cols.length - 1), vals.slice(cols.length - 1).join(',')];
    return Object.fromEntries(cols.map((c, i) => [c, fixed[i].trim()]));
  });
}

const people = fs.readFileSync('people.txt', 'utf8').split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
const rates = readCsv('rates.csv');
const expenses = readCsv('expenses.csv').map((e) => ({
  id: e.id,
  date: e.date,
  paid_by: e.paid_by,
  amount: Number(e.amount),
  currency: e.currency,
  split_between: e.split_between === 'all' ? [...people] : e.split_between.split(';').map((s) => s.trim()),
}));

for (const e of expenses) {
  for (const name of [e.paid_by, ...e.split_between]) {
    if (!people.includes(name)) throw new Error(`${e.id}: "${name}" is not in people.txt`);
  }
}

// The latest rate on or before the date, as an integer in ten-thousandths of a pound.
function rateFor(date, currency) {
  if (currency === 'GBP') return 10000;
  const r = rates
    .filter((r) => r.currency === currency && r.date <= date)
    .sort((a, b) => a.date.localeCompare(b.date))
    .at(-1);
  if (!r) throw new Error(`No ${currency} rate on or before ${date}`);
  return Math.round(Number(r.gbp_per_unit) * 10000);
}

// Half a penny rounds away from zero, so a refund rounds the same way as a cost.
const roundHalfUp = (x) => Math.sign(x) * Math.round(Math.abs(x));
const pence = Object.fromEntries(
  expenses.map((e) => [e.id, roundHalfUp((Math.round(e.amount * 100) * rateFor(e.date, e.currency)) / 10000)]),
);

const balance = Object.fromEntries(people.map((p) => [p, 0]));
for (const e of expenses) {
  const total = pence[e.id];
  balance[e.paid_by] += total;
  const base = Math.trunc(total / e.split_between.length);
  let left = total - base * e.split_between.length;
  for (const p of e.split_between) {
    const extra = Math.sign(left);
    balance[p] -= base + extra;
    left -= extra;
  }
}
const sum = Object.values(balance).reduce((a, b) => a + b, 0);
if (sum !== 0) throw new Error(`Balances add up to ${sum}p, not 0`);

// Largest debtor pays largest creditor until everyone is square: at most n−1 transfers.
const creditors = people.filter((p) => balance[p] > 0).map((p) => ({ p, v: balance[p] }));
const debtors = people.filter((p) => balance[p] < 0).map((p) => ({ p, v: -balance[p] }));
const transfers = [];
while (creditors.length && debtors.length) {
  creditors.sort((a, b) => b.v - a.v);
  debtors.sort((a, b) => b.v - a.v);
  const [c, d] = [creditors[0], debtors[0]];
  const v = Math.min(c.v, d.v);
  transfers.push({ from: d.p, to: c.p, gbp: v / 100 });
  c.v -= v;
  d.v -= v;
  if (!c.v) creditors.shift();
  if (!d.v) debtors.shift();
}

const write = (file, data) => fs.writeFileSync(`out/${file}`, JSON.stringify(data, null, 2) + '\n');
fs.mkdirSync('out', { recursive: true });
write('1-expenses.json', expenses);
write('2-gbp.json', Object.fromEntries(Object.entries(pence).map(([id, p]) => [id, p / 100])));
write('3-balances.json', Object.fromEntries(people.map((p) => [p, balance[p] / 100])));
write('4-transfers.json', transfers);
console.log(`Wrote out/1-expenses.json … out/4-transfers.json (${transfers.length} transfers)`);
