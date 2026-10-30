// SPOILERS: the answer key for sla-report. Read it after your first run, not before.
import { readJson, readText, editJson, editText, pass, fail, num, near, sameSet } from '../../bin/lib/checks.mjs';

export const steps = [
  { n: 1, label: 'Tickets in the week' },
  { n: 2, label: 'Business hours waited' },
  { n: 3, label: 'Breaches' },
  { n: 4, label: 'Breach rates' },
  { n: 5, label: 'Summary' },
];

export const solution = {
  scripts: ['sla.mjs'],
  produces: ['1-tickets.json', '2-hours.json', '3-breaches.json', '4-rates.json'],
};

// T01 was opened at 23:40 UTC on Sunday, which is 00:40 on Monday in London. T02 and T12 fall outside.
const IN_WEEK = ['T01', 'T03', 'T04', 'T05', 'T06', 'T07', 'T08', 'T09', 'T10', 'T11', 'T13', 'T14'];
const BREACHES = ['T03', 'T04', 'T09', 'T13'];
const HOURS = { T01: 0.33, T03: 16.5, T04: 1.5, T05: 2, T06: 0.83, T07: 3.5, T08: 0.92, T09: 4.5, T10: 8.5, T11: 0.83, T13: 37, T14: 0 };
const RATES = { P1: [0, 3], P2: [2, 6], P3: [2, 3] };

const hoursRight = (ids) => (out) => {
  const h = readJson(out, '2-hours.json');
  const wrong = ids
    .filter((id) => !(id in h) || !near(num(h[id], id), HOURS[id], 0.02))
    .map((id) => `${id} is ${h[id] ?? 'missing'}, want ${HOURS[id]}`);
  return wrong.length ? fail(wrong.join('; ')) : pass();
};
const setHours = (id, v) => (out) => editJson(out, '2-hours.json', (h) => void (h[id] = v));
const breachIds = (out) => readJson(out, '3-breaches.json').map((b) => String(b.id ?? b));

export const checks = [
  {
    id: 'week-timezone',
    step: 1,
    says: 'T01 is in the week: 23:40 UTC Sunday is Monday in London',
    run: (out) => (readJson(out, '1-tickets.json').some((t) => t.id === 'T01') ? pass() : fail('T01 is not listed')),
    break: (out) => editJson(out, '1-tickets.json', (l) => l.filter((t) => t.id !== 'T01')),
  },
  {
    id: 'week-exact',
    step: 1,
    says: 'Exactly the 12 tickets opened Monday to Sunday',
    run: (out) => sameSet(readJson(out, '1-tickets.json').map((t) => t.id), IN_WEEK, { label: 'tickets', normalise: (s) => s }),
    break: (out) => editJson(out, '1-tickets.json', (l) => [...l, { id: 'T12', customer: 'Acme', priority: 'P2', opened_at: '2026-04-06T10:00:00+01:00' }]),
  },
  {
    id: 'hours-same-day',
    step: 2,
    says: 'Same-day waits are right (T03, T04, T09)',
    run: hoursRight(['T03', 'T04', 'T09']),
    break: setHours('T09', 4),
  },
  {
    id: 'hours-overnight',
    step: 2,
    says: 'The clock stops overnight, and UTC stamps are read as London time (T01, T06, T08)',
    run: hoursRight(['T01', 'T06', 'T08']),
    break: setHours('T08', 16.42),
  },
  {
    id: 'hours-holidays',
    step: 2,
    says: 'Weekends and the Easter bank holidays do not count (T05, T07, T10, T11, T14)',
    run: hoursRight(['T05', 'T07', 'T10', 'T11', 'T14']),
    break: setHours('T05', 18.5),
  },
  {
    id: 'hours-unanswered',
    step: 2,
    says: 'The unanswered ticket is measured up to as_of (T13 is 37 hours)',
    run: hoursRight(['T13']),
    break: (out) => editJson(out, '2-hours.json', (h) => void delete h.T13),
  },
  {
    id: 'breach-enterprise',
    step: 3,
    says: "T04 breached: an Enterprise customer's P2 is held to the 1-hour target",
    run: (out) => (breachIds(out).includes('T04') ? pass() : fail('T04 is not a breach')),
    break: (out) => editJson(out, '3-breaches.json', (l) => l.filter((b) => b.id !== 'T04')),
  },
  {
    id: 'breach-exact',
    step: 3,
    says: 'Exactly four breaches: T03, T04, T09, T13',
    run: (out) => sameSet(breachIds(out), BREACHES, { label: 'breaches', normalise: (s) => s }),
    break: (out) => editJson(out, '3-breaches.json', (l) => [...l, { id: 'T05', hours: 2, target: 4 }]),
  },
  {
    id: 'rates',
    step: 4,
    says: 'Breach rates: P1 0 of 3, P2 2 of 6, P3 2 of 3',
    run: (out) => {
      const r = readJson(out, '4-rates.json');
      const wrong = Object.entries(RATES)
        .filter(([p, [b, t]]) => num(r[p]?.breached, `${p}.breached`) !== b || num(r[p]?.total, `${p}.total`) !== t)
        .map(([p, [b, t]]) => `${p} is ${r[p]?.breached} of ${r[p]?.total}, want ${b} of ${t}`);
      return wrong.length ? fail(wrong.join('; ')) : pass();
    },
    break: (out) => editJson(out, '4-rates.json', (r) => void (r.P2.total = 5)),
  },
  {
    id: 'summary-names',
    step: 5,
    says: 'The summary names every breach',
    run: (out) => {
      const t = readText(out, 'summary.md');
      const missing = BREACHES.filter((id) => !new RegExp(`\\b${id}\\b`).test(t));
      return missing.length ? fail(`does not mention ${missing.join(', ')}`) : pass();
    },
    break: (out) => editText(out, 'summary.md', (t) => t.replaceAll('T13', 'one ticket')),
  },
  {
    id: 'summary-numbers',
    step: 5,
    says: "The summary's hours match step 3",
    run: (out) => {
      const t = readText(out, 'summary.md');
      const wrong = readJson(out, '3-breaches.json').filter((b) => !t.includes(String(num(b.hours, `${b.id}.hours`))));
      return wrong.length ? fail(`hours not in the summary for ${wrong.map((b) => `${b.id} (${b.hours})`).join(', ')}`) : pass();
    },
    break: (out) => editText(out, 'summary.md', (t) => t.replace('16.5 h', '16 h')),
  },
];
