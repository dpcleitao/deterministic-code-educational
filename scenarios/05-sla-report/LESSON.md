# SLA breach report: the lesson

> Spoilers. Read this after you have mapped the skill and run it at least once.

## The map

| Step | Kind | What the skill leaves unsaid |
| --- | --- | --- |
| 1 · Tickets in the week | Deterministic: could be code | **Which timezone the week is in.** Timestamps mix `Z` and `+01:00` |
| 2 · Hours | Deterministic: **must** be code | **Unanswered tickets.** `as_of` is in `report.json` but the skill never mentions it |
| 3 · Breaches | Deterministic: could be code | **The Enterprise rule** is in `sla.json`'s notes, in plain sight |
| 4 · Rates | Deterministic: could be code | Whether to group by the ticket's priority or its target |
| 5 · Summary | Probabilistic | It must copy the hours, not recompute them |

## What we planted

- **T01** was opened at 23:40 UTC on Sunday 29 March, after the clocks went forward. In London that is
  00:40 on Monday, so it is in the week.
- **T05** waited from Thursday 16:30 to Tuesday 10:00, more than four days on the wall clock. Good Friday and
  Easter Monday are holidays, so it waited 2 support hours. It did not breach.
- **T08** waited 16 hours overnight. That is 55 support minutes, so it did not breach.
- **T06** is stamped in UTC. 08:15Z is 09:15 in London, inside support hours.
- **T04** waited 1.5 hours on a P2, which looks fine. Umbrella is Enterprise, so the target is 1 hour.
  It breached.
- **T13** has no response. Measured up to `as_of`, it waited 37 support hours against a 16-hour target.
- **T14** was opened and answered on Good Friday. It waited zero support hours.

## What the solution changes

`sla.mjs` counts support minutes one at a time in London time. That is slow to describe and simple to trust.
It needs no special case for the clock change or the holidays: it asks the calendar each minute. The model
writes only the summary.

This is the scenario where a step that looks like reading ("how long did it wait?") hides the most arithmetic.
