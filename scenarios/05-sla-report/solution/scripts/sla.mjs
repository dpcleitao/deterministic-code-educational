#!/usr/bin/env node
// Steps 1–4 of sla-report as code. Business hours are counted minute by minute in the support
// timezone: slow to describe, simple to trust, and right across weekends, holidays and clock changes.
import fs from 'node:fs';

const read = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const readCsv = (f) => {
  const [head, ...rows] = fs.readFileSync(f, 'utf8').trim().split(/\r?\n/);
  const cols = head.split(',');
  return rows.map((r) => {
    const v = r.split(',');
    return Object.fromEntries(cols.map((c, i) => [c, (i === cols.length - 1 ? v.slice(i).join(',') : v[i] ?? '').trim()]));
  });
};

const report = read('report.json');
const support = read('support.json');
const sla = read('sla.json');
const plans = Object.fromEntries(readCsv('customers.csv').map((c) => [c.customer, c.plan]));
const tickets = readCsv('tickets.csv');

const fmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: support.timezone, hourCycle: 'h23', weekday: 'short',
  year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
});
// The wall clock in the support timezone: { weekday: 'Mon', date: '2026-03-30', time: '09:20' }.
function local(ms) {
  const p = Object.fromEntries(fmt.formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  return { weekday: p.weekday, date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
}

const MINUTE = 60 * 1000;
function businessHours(fromMs, toMs) {
  let minutes = 0;
  for (let t = fromMs; t < toMs; t += MINUTE) {
    const l = local(t);
    if (support.days.includes(l.weekday) && !support.holidays.includes(l.date) && l.time >= support.open && l.time < support.close) {
      minutes++;
    }
  }
  return Math.round((minutes / 60) * 100) / 100;
}

const inWeek = tickets.filter((t) => {
  const d = local(Date.parse(t.opened_at)).date;
  return d >= report.week_start && d <= report.week_end;
});

const asOf = Date.parse(report.as_of);
const hours = Object.fromEntries(
  inWeek.map((t) => [t.id, businessHours(Date.parse(t.opened_at), t.first_response_at ? Date.parse(t.first_response_at) : asOf)]),
);

const targetOf = (t) => {
  const level = plans[t.customer] === 'Enterprise' && t.priority === 'P2' ? sla.enterprise_p2_target : t.priority;
  return sla.first_response_targets_business_hours[level];
};
const breaches = inWeek.filter((t) => hours[t.id] > targetOf(t)).map((t) => ({ id: t.id, hours: hours[t.id], target: targetOf(t) }));

const rates = {};
for (const p of Object.keys(sla.first_response_targets_business_hours)) {
  const group = inWeek.filter((t) => t.priority === p);
  rates[p] = { breached: group.filter((t) => breaches.some((b) => b.id === t.id)).length, total: group.length };
}

const write = (file, data) => fs.writeFileSync(`out/${file}`, JSON.stringify(data, null, 2) + '\n');
fs.mkdirSync('out', { recursive: true });
write('1-tickets.json', inWeek.map(({ id, customer, priority, opened_at }) => ({ id, customer, priority, opened_at })));
write('2-hours.json', hours);
write('3-breaches.json', breaches);
write('4-rates.json', rates);
console.log(`Wrote out/1-tickets.json … out/4-rates.json: ${inWeek.length} tickets, ${breaches.length} breaches`);
