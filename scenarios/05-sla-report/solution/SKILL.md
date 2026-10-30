---
name: sla-report
description: Weekly support SLA report - which tickets missed their first-response target, and the breach rate by priority.
---

# SLA report

Steps 1 to 4 are clock and calendar arithmetic, so a script does them. Step 5 is yours.

1–4. From the folder you were started in, run:

   ```bash
   node "${CLAUDE_SKILL_DIR}/scripts/sla.mjs"
   ```

   It reads `report.json`, `support.json`, `sla.json`, `customers.csv` and `tickets.csv` and writes
   `out/1-tickets.json` to `out/4-rates.json`. Do not edit those files. If it stops with an error,
   report it and stop.

   The rules it applies, so you can explain them:
   - The reporting week runs Monday to Sunday in the support timezone, whatever offset a timestamp has.
   - Only support hours count: weekdays, open to close, not holidays. The clocks changing is handled.
   - A ticket with no response yet is measured up to `as_of` in `report.json`.
   - Enterprise customers' P2 tickets are held to the P1 target.
   - Breach rates are grouped by the ticket's own priority.

5. Read the four files and write a short summary for the support lead: every breach with its hours
   and target, and one recommendation. Take every number from the files. Save it as `out/summary.md`.
