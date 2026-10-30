---
name: sla-report
description: Weekly support SLA report - which tickets missed their first-response target, and the breach rate by priority.
---

# SLA report

Work through these steps in order. Save each step's result in an `out` folder before moving on.
The reporting week is in `report.json`, support hours in `support.json`, targets in `sla.json`,
and the tickets in `tickets.csv`.

1. List the tickets opened in the reporting week.
   Save `out/1-tickets.json` as a list of `{ "id", "customer", "priority", "opened_at" }`.
2. For each ticket, work out how many business hours it waited for its first response.
   Save `out/2-hours.json` as `{ "<id>": <hours, to two decimal places> }`.
3. Mark the tickets that breached their target.
   Save `out/3-breaches.json` as a list of `{ "id", "hours", "target" }`.
4. Work out the breach rate for each priority.
   Save `out/4-rates.json` as `{ "<priority>": { "breached": <n>, "total": <n> } }`.
5. Write a short summary for the support lead: every breach, and one recommendation.
   Save it as `out/summary.md`.
