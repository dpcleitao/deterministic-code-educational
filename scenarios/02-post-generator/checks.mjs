// SPOILERS: the answer key for post-generator. Read it after your first run, not before.
import { readJson, readText, editJson, editText, pass, fail, num } from '../../bin/lib/checks.mjs';

export const steps = [
  { n: 1, label: 'Pick the facts' },
  { n: 2, label: 'Build the links' },
  { n: 3, label: 'Write the posts' },
  { n: 4, label: 'Fit the limits' },
  { n: 5, label: 'Schedule' },
  { n: 6, label: 'Put it together' },
];

export const solution = {
  scripts: ['links.mjs', ['measure.mjs', 'out/3-posts.json'], 'schedule.mjs'],
  produces: ['2-links.json', '4-final.json', '5-schedule.json'],
};

const PLATFORMS = ['x', 'linkedin', 'threads'];
const LIMITS = { x: 280, linkedin: 1300, threads: 500 };
const APPROVED = ['#FourDayWeek', '#FutureOfWork', '#Productivity'];
// Thursday 26 March is publish day. Friday is still GMT; the clocks go forward on Sunday 29 March,
// so 09:00 London on Monday and Tuesday is 08:00 UTC.
const SCHEDULE = { x: '2026-03-27T09:00:00Z', linkedin: '2026-03-30T08:00:00Z', threads: '2026-03-31T08:00:00Z' };
const LONDON_DATE = { x: '2026-03-27', linkedin: '2026-03-30', threads: '2026-03-31' };

const chars = (s) => [...s].length;
const occurrences = (text, needle) => text.split(needle).length - 1;

const everyPlatform = (fn) => {
  const wrong = PLATFORMS.map((k) => fn(k)).filter(Boolean);
  return wrong.length ? fail(wrong.join('; ')) : pass();
};

const parseLink = (out, k) => {
  const href = readJson(out, '2-links.json')[k];
  try {
    return new URL(href);
  } catch {
    return null;
  }
};

const textOf = (out, file, k) => {
  const v = readJson(out, file)[k];
  return typeof v === 'string' ? v : typeof v?.text === 'string' ? v.text : '';
};

const scheduleOf = (out) => {
  const list = readJson(out, '5-schedule.json');
  return Object.fromEntries(list.map((e) => [String(e.platform).toLowerCase(), new Date(e.post_at_utc)]));
};

const londonDate = (d) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);

export const checks = [
  {
    id: 'headline-figure',
    step: 1,
    says: 'The headline figure is 92%',
    run: (out) => {
      const h = String(readJson(out, '1-facts.json').headline ?? '');
      return h.includes('92%') ? pass() : fail(`headline is "${h}"`);
    },
    break: (out) => editJson(out, '1-facts.json', (f) => void (f.headline = '68% of staff felt less burnt out')),
  },
  {
    id: 'links-utm',
    step: 2,
    says: 'Every link carries the three UTM tags for its platform',
    run: (out) =>
      everyPlatform((k) => {
        const url = parseLink(out, k);
        if (!url) return `${k}: not a valid URL`;
        const want = { utm_source: k, utm_medium: 'social', utm_campaign: '4dw-results-2026' };
        const bad = Object.entries(want).filter(([p, v]) => url.searchParams.get(p) !== v);
        return bad.length ? `${k}: ${bad.map(([p]) => `${p}=${url.searchParams.get(p)}`).join(', ')}` : null;
      }),
    break: (out) => editJson(out, '2-links.json', (l) => void (l.threads = l.threads.replace('utm_source=threads', 'utm_source=Threads'))),
  },
  {
    id: 'links-keep-query',
    step: 2,
    says: 'Every link keeps the ?lang=en the article URL already had',
    run: (out) =>
      everyPlatform((k) => {
        const url = parseLink(out, k);
        if (!url) return `${k}: not a valid URL`;
        if (url.pathname !== '/blog/four-day-week-results') return `${k}: path is ${url.pathname}`;
        return url.searchParams.get('lang') === 'en' ? null : `${k}: lost lang=en (${url.href})`;
      }),
    break: (out) => editJson(out, '2-links.json', (l) => void (l.x = l.x.replace('?lang=en&', '?'))),
  },
  {
    id: 'posts-link',
    step: 3,
    says: "Every draft has its own platform's link, exactly once",
    run: (out) => {
      const links = readJson(out, '2-links.json');
      return everyPlatform((k) => {
        const text = textOf(out, '3-posts.json', k);
        const n = occurrences(text, links[k]);
        return n === 1 ? null : `${k}: its link appears ${n} times`;
      });
    },
    break: (out) => {
      const links = readJson(out, '2-links.json');
      editJson(out, '3-posts.json', (p) => void (p.x = p.x.replace(links.x, links.linkedin)));
    },
  },
  {
    id: 'posts-hashtags',
    step: 3,
    says: 'Two hashtags at most per draft, only approved ones, spelled exactly',
    run: (out) =>
      everyPlatform((k) => {
        const tags = textOf(out, '3-posts.json', k).match(/#[\p{L}\p{N}_]+/gu) ?? [];
        const unapproved = tags.filter((t) => !APPROVED.includes(t));
        if (unapproved.length) return `${k}: ${unapproved.join(' ')} is not on the approved list`;
        return tags.length > 2 ? `${k}: ${tags.length} hashtags` : null;
      }),
    break: (out) => editJson(out, '3-posts.json', (p) => void (p.threads += ' #fourdayweek')),
  },
  {
    id: 'final-fits',
    step: 4,
    says: "Every final post is within its platform's limits",
    run: (out) =>
      everyPlatform((k) => {
        const text = textOf(out, '4-final.json', k);
        if (!text) return `${k}: no final post`;
        if (chars(text) > LIMITS[k]) return `${k}: ${chars(text)} characters, limit ${LIMITS[k]}`;
        const first = chars(text.split('\n')[0]);
        return k === 'linkedin' && first > 150 ? `linkedin: first line is ${first} characters, limit 150` : null;
      }),
    break: (out) => editJson(out, '4-final.json', (f) => void (f.x.text += ' Read the full twelve-month report today.'.repeat(2))),
  },
  {
    id: 'final-count-honest',
    step: 4,
    says: 'The character count the step reported is the real count',
    run: (out) => {
      const final = readJson(out, '4-final.json');
      return everyPlatform((k) => {
        const text = textOf(out, '4-final.json', k);
        const said = num(final[k]?.characters, `${k}.characters`);
        return said === chars(text) ? null : `${k}: said ${said}, actually ${chars(text)}`;
      });
    },
    break: (out) => editJson(out, '4-final.json', (f) => void (f.x.characters = 279)),
  },
  {
    id: 'final-keeps-link',
    step: 4,
    says: 'Shortening kept every link whole',
    run: (out) => {
      const links = readJson(out, '2-links.json');
      return everyPlatform((k) => {
        const n = occurrences(textOf(out, '4-final.json', k), links[k]);
        return n === 1 ? null : `${k}: its link appears ${n} times`;
      });
    },
    break: (out) =>
      editJson(out, '4-final.json', (f) => void (f.x.text = f.x.text.replace('&utm_campaign=4dw-results-2026', ''))),
  },
  {
    id: 'schedule-days',
    step: 5,
    says: 'Posts go out on the next three weekdays: Fri 27, Mon 30, Tue 31 March',
    run: (out) => {
      const s = scheduleOf(out);
      return everyPlatform((k) => {
        if (!s[k] || Number.isNaN(s[k].getTime())) return `${k}: no valid time`;
        const d = londonDate(s[k]);
        return d === LONDON_DATE[k] ? null : `${k}: ${d}, want ${LONDON_DATE[k]}`;
      });
    },
    break: (out) => editJson(out, '5-schedule.json', (l) => void (l[1].post_at_utc = '2026-03-28T09:00:00Z')),
  },
  {
    id: 'schedule-utc',
    step: 5,
    says: 'Every time is 09:00 London in UTC, after the clocks change too',
    run: (out) => {
      const s = scheduleOf(out);
      return everyPlatform((k) => {
        if (!s[k] || Number.isNaN(s[k].getTime())) return `${k}: no valid time`;
        return s[k].getTime() === new Date(SCHEDULE[k]).getTime()
          ? null
          : `${k}: ${s[k].toISOString()}, want ${SCHEDULE[k]}`;
      });
    },
    break: (out) => editJson(out, '5-schedule.json', (l) => void (l[1].post_at_utc = '2026-03-30T09:00:00Z')),
  },
  {
    id: 'pack-matches',
    step: 6,
    says: 'posts.md has every final post word for word',
    run: (out) => {
      const squash = (s) => s.replace(/\s+/g, ' ').trim();
      const pack = squash(readText(out, 'posts.md'));
      return everyPlatform((k) => (pack.includes(squash(textOf(out, '4-final.json', k))) ? null : `${k}: not word for word`));
    },
    break: (out) => editText(out, 'posts.md', (m) => m.replace('Sick days fell by 41%', 'Sick days fell sharply')),
  },
];
