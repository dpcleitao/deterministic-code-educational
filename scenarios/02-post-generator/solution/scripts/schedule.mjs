#!/usr/bin/env node
// Step 5 of post-generator as code. One post per weekday after the publish date, at the local
// post time, converted to UTC. Intl knows when the clocks change; a model guessing usually doesn't.
import fs from 'node:fs';

const campaign = JSON.parse(fs.readFileSync('campaign.json', 'utf8'));

// How far ahead of UTC the zone is at a given instant, in milliseconds.
function offsetAt(instant, timeZone) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).formatToParts(instant).map((x) => [x.type, x.value]),
  );
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return asUtc - instant.getTime();
}

// The UTC instant when the wall clock in timeZone reads the given local date and time.
function localToUtc(date, time, timeZone) {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  const first = guess - offsetAt(new Date(guess), timeZone);
  return new Date(guess - offsetAt(new Date(first), timeZone));
}

const day = new Date(`${campaign.publish_date}T00:00:00Z`);
const schedule = [];
for (const platform of campaign.platforms) {
  do day.setUTCDate(day.getUTCDate() + 1);
  while ([0, 6].includes(day.getUTCDay()));
  const date = day.toISOString().slice(0, 10);
  const at = localToUtc(date, campaign.post_time, campaign.timezone);
  schedule.push({ platform: platform.key, post_at_utc: at.toISOString().replace('.000Z', 'Z') });
}
fs.mkdirSync('out', { recursive: true });
fs.writeFileSync('out/5-schedule.json', JSON.stringify(schedule, null, 2) + '\n');
console.log('Wrote out/5-schedule.json');
