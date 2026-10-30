// Helpers shared by every scenario's checks.mjs.
// A check reads one step's file and returns pass/fail with a one-line reason.
// It is plain code, so the same file gets the same verdict every time.
import fs from 'node:fs';
import path from 'node:path';

// Thrown when a step's file is missing or malformed: the check fails with this message.
export class CheckFail extends Error {}

export const pass = (detail = '') => ({ pass: true, detail });
export const fail = (detail) => ({ pass: false, detail });

export function readText(out, file) {
  const p = path.join(out, file);
  if (!fs.existsSync(p)) throw new CheckFail(`out/${file} is missing`);
  return fs.readFileSync(p, 'utf8');
}

export function readJson(out, file) {
  const text = readText(out, file);
  try {
    return JSON.parse(text);
  } catch {
    throw new CheckFail(`out/${file} is not valid JSON`);
  }
}

export function writeText(out, file, text) {
  fs.writeFileSync(path.join(out, file), text);
}

export function writeJson(out, file, data) {
  writeText(out, file, JSON.stringify(data, null, 2) + '\n');
}

// Used by a check's break(): change one step's file so its check should fail.
export function editJson(out, file, fn) {
  const data = readJson(out, file);
  const result = fn(data);
  writeJson(out, file, result === undefined ? data : result);
}

export function editText(out, file, fn) {
  writeText(out, file, fn(readText(out, file)));
}

// Compare names without tripping on case or accents ("Chloé" and "chloe" match).
export const key = (s) =>
  String(s).normalize('NFD').replace(/\p{Diacritic}/gu, '').trim().toLowerCase();

// Accept 12.5, "12.50" or "£12.50"; anything else fails the check.
export function num(value, label = 'value') {
  const n = typeof value === 'string' ? Number(value.replace(/[£$€,\s]/g, '')) : value;
  if (typeof n !== 'number' || Number.isNaN(n)) {
    throw new CheckFail(`${label} is ${JSON.stringify(value)}, not a number`);
  }
  return n;
}

export const near = (a, b, tolerance) => Math.abs(a - b) <= tolerance + 1e-9;

// Exact set comparison with a readable reason: what is missing and what should not be there.
export function sameSet(got, want, { label = 'items', normalise = key } = {}) {
  const g = new Map(got.map((x) => [normalise(x), x]));
  const w = new Map(want.map((x) => [normalise(x), x]));
  const missing = [...w.keys()].filter((k) => !g.has(k)).map((k) => w.get(k));
  const extra = [...g.keys()].filter((k) => !w.has(k)).map((k) => g.get(k));
  const dupes = got.length - g.size;
  if (!missing.length && !extra.length && !dupes) return pass(`${want.length} ${label}, all correct`);
  const parts = [];
  if (missing.length) parts.push(`missing ${missing.join(', ')}`);
  if (extra.length) parts.push(`should not include ${extra.join(', ')}`);
  if (dupes) parts.push(`${dupes} listed twice`);
  return fail(parts.join('; '));
}
