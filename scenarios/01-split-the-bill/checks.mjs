// SPOILERS: the answer key for split-the-bill. Read it after your first run, not before.
import { readJson, readText, editJson, editText, pass, fail, key, num, near, sameSet } from '../../bin/lib/checks.mjs';

export const steps = [
  { n: 1, label: 'List the expenses' },
  { n: 2, label: 'Convert to pounds' },
  { n: 3, label: 'Work out balances' },
  { n: 4, label: 'Work out transfers' },
  { n: 5, label: 'Write the message' },
];

export const solution = {
  scripts: ['settle.mjs'],
  produces: ['1-expenses.json', '2-gbp.json', '3-balances.json', '4-transfers.json'],
};

const IDS = ['E01', 'E02', 'E03', 'E04', 'E05', 'E06', 'E07', 'E08', 'E09', 'E10', 'E11', 'E12', 'E13'];
// Weekday rate for E02 and E13; Friday's rate carried into the weekend for E04 and E07.
const GBP = { E02: 158.38, E13: 37.53, E04: 81.57, E07: 117.77, E12: -51.18 };
const BALANCES = { Ana: -9.19, Ben: 519.65, Chloé: -248.96, Dev: -261.5 };

const gbpOf = (out, id) => {
  const gbp = readJson(out, '2-gbp.json');
  return num(gbp[id], `${id}`);
};

const amountsRight = (ids) => (out) => {
  const wrong = ids
    .map((id) => [id, gbpOf(out, id)])
    .filter(([id, v]) => !near(v, GBP[id], 0.005))
    .map(([id, v]) => `${id} is ${v}, want ${GBP[id]}`);
  return wrong.length ? fail(wrong.join('; ')) : pass();
};

const balancesOf = (out) => {
  const b = readJson(out, '3-balances.json');
  return Object.fromEntries(Object.entries(b).map(([name, v]) => [key(name), num(v, name)]));
};

export const checks = [
  {
    id: 'all-listed',
    step: 1,
    says: 'All 13 expenses are listed, once each',
    run: (out) => sameSet(readJson(out, '1-expenses.json').map((e) => e.id), IDS, { label: 'expenses' }),
    break: (out) => editJson(out, '1-expenses.json', (list) => list.slice(1)),
  },
  {
    id: 'splits-expanded',
    step: 1,
    says: '"all" means four people; E05 is split three ways',
    run(out) {
      const list = readJson(out, '1-expenses.json');
      const split = (id) => list.find((e) => e.id === id)?.split_between ?? [];
      const all = sameSet(split('E01'), ['Ana', 'Ben', 'Chloé', 'Dev']);
      if (!all.pass) return fail(`E01: ${all.detail}`);
      const e05 = sameSet(split('E05'), ['Ana', 'Ben', 'Chloé']);
      return e05.pass ? pass() : fail(`E05: ${e05.detail}`);
    },
    break: (out) =>
      editJson(out, '1-expenses.json', (list) => {
        list.find((e) => e.id === 'E05').split_between.push('Dev');
      }),
  },
  {
    id: 'weekday-rate',
    step: 2,
    says: 'Euros use the rate for their date (E02, E13)',
    run: amountsRight(['E02', 'E13']),
    break: (out) => editJson(out, '2-gbp.json', (g) => void (g.E13 = 37.45)),
  },
  {
    id: 'weekend-rate',
    step: 2,
    says: "Weekend expenses use Friday's rate (E04, E07)",
    run: amountsRight(['E04', 'E07']),
    break: (out) => editJson(out, '2-gbp.json', (g) => void (g.E04 = 81.89)),
  },
  {
    id: 'refund-negative',
    step: 2,
    says: 'The refund stays a refund (E12 is −£51.18)',
    run: amountsRight(['E12']),
    break: (out) => editJson(out, '2-gbp.json', (g) => void (g.E12 = 51.18)),
  },
  {
    id: 'balances-right',
    step: 3,
    says: 'Every balance is right (within 5p)',
    run(out) {
      const b = balancesOf(out);
      const wrong = Object.entries(BALANCES)
        .filter(([name, want]) => !(key(name) in b) || !near(b[key(name)], want, 0.05))
        .map(([name, want]) => `${name} is ${b[key(name)] ?? 'missing'}, want ${want}`);
      return wrong.length ? fail(wrong.join('; ')) : pass();
    },
    break: (out) => editJson(out, '3-balances.json', (b) => void (b.Ana = -9.74)),
  },
  {
    id: 'balances-zero',
    step: 3,
    says: 'Balances add up to exactly £0.00',
    run(out) {
      const total = Object.values(balancesOf(out)).reduce((a, v) => a + Math.round(v * 100), 0);
      return total === 0 ? pass() : fail(`they add up to £${(total / 100).toFixed(2)}`);
    },
    break: (out) => editJson(out, '3-balances.json', (b) => void (b.Ana = -9.2)),
  },
  {
    id: 'transfers-settle',
    step: 4,
    says: "The transfers settle step 3's balances exactly",
    run(out) {
      const b = balancesOf(out);
      const net = Object.fromEntries(Object.keys(b).map((k) => [k, 0]));
      for (const t of readJson(out, '4-transfers.json')) {
        const pennies = Math.round(num(t.gbp, 'gbp') * 100);
        net[key(t.from)] = (net[key(t.from)] ?? 0) - pennies;
        net[key(t.to)] = (net[key(t.to)] ?? 0) + pennies;
      }
      const off = Object.keys(net).filter((k) => net[k] !== Math.round((b[k] ?? 0) * 100));
      return off.length
        ? fail(off.map((k) => `${k} ends £${((net[k] - Math.round((b[k] ?? 0) * 100)) / 100).toFixed(2)} out`).join('; '))
        : pass();
    },
    break: (out) => editJson(out, '4-transfers.json', (t) => void (t[0].gbp += 0.01)),
  },
  {
    id: 'transfers-few',
    step: 4,
    says: 'Three transfers or fewer',
    run(out) {
      const n = readJson(out, '4-transfers.json').length;
      return n <= 3 ? pass() : fail(`${n} transfers`);
    },
    break: (out) =>
      editJson(out, '4-transfers.json', (t) => [...t, { from: 'Ana', to: 'Dev', gbp: 1 }, { from: 'Dev', to: 'Ana', gbp: 1 }]),
  },
  {
    id: 'message-matches',
    step: 5,
    says: 'The message gives every transfer with its exact amount',
    run(out) {
      const msg = key(readText(out, 'message.md'));
      const missing = readJson(out, '4-transfers.json')
        .filter((t) => !msg.includes(key(t.from)) || !msg.includes(key(t.to)) || !msg.includes(num(t.gbp).toFixed(2)))
        .map((t) => `${t.from} → ${t.to} £${num(t.gbp).toFixed(2)}`);
      return missing.length ? fail(`not in the message: ${missing.join(', ')}`) : pass();
    },
    break: (out) => editText(out, 'message.md', (m) => m.replace('£248.96', '£249')),
  },
];
