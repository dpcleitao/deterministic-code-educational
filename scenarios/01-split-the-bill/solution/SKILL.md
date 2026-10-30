---
name: split-the-bill
description: Settle up a group trip. Reads the trip's expenses and works out who owes whom.
---

# Split the bill

Steps 1 to 4 are counting and arithmetic, so a script does them. Step 5 is yours.

1–4. From the folder you were started in, run:

   ```bash
   node "${CLAUDE_SKILL_DIR}/scripts/settle.mjs"
   ```

   It reads `expenses.csv`, `people.txt` and `rates.csv` and writes `out/1-expenses.json`,
   `out/2-gbp.json`, `out/3-balances.json` and `out/4-transfers.json`. Do not edit those files.
   If the script stops with an error, report the error and stop.

   The rules it applies, so you can explain them if asked:
   - An expense uses the latest rate published on or before its date. There are no rates at weekends.
   - Each expense is converted and rounded to the penny on its own.
   - A share is split to the penny. Leftover pennies go to the first names in the list.
   - A refund (a negative amount) is split like any cost, so it reduces everyone's share.
   - Balances add up to exactly £0.00.

5. Read `out/4-transfers.json` and write a short, friendly message for the group chat that says
   who pays whom. Copy every amount exactly as it is in the file, as £0.00.
   Save it as `out/message.md`.
