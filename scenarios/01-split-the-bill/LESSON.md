# Split the bill: the lesson

> Spoilers. Read this after you have mapped the skill and run it at least once.

## The map

| Step | Kind | What the skill leaves unsaid |
| --- | --- | --- |
| 1 · List | Deterministic: could be code | Nothing that changes a result |
| 2 · Convert | Deterministic: could be code | **Which rate to use at the weekend.** `rates.csv` has none for 9 or 10 May |
| 3 · Balances | Deterministic: could be code | **Where leftover pennies go.** £10.00 split three ways is £3.33, £3.33, £3.34 |
| 4 · Transfers | Deterministic: could be code | Nothing, once the balances are right |
| 5 · Message | Probabilistic | Nothing, but it must copy the numbers, not retype them |

## What we planted

- **Weekend expenses.** E04, E05, E07 and E08 fall on a Saturday or Sunday. The standard rule is the
  latest rate on or before the date (Friday's). A model may use Monday's, average the two, or stop and ask.
- **A refund.** E12 is −€60. It must stay negative and reduce everyone's share. It is easy to treat it as
  a cost and push Ana the wrong way.
- **Rounding.** Shares are split to the penny. The balances must add up to exactly £0.00. A model doing
  the sums in its head often lands a penny or two out. The check allows 5p per person but no drift in the total.
- **A three-way split.** E05 leaves Dev out and E06 leaves Ana out.

## Why the checks are shaped this way

`transfers-settle` checks step 4 against the balances step 3 *wrote*, not the right balances. So if step 3 is
wrong and step 4 is right, only step 3 fails. That separates "the step was wrong" from "an earlier step handed it
a wrong input".

## What the solution changes

Steps 1 to 4 move into `solution/scripts/settle.mjs`. It works in whole pennies, uses the last rate on or before
each date, and refuses to write anything if the balances do not add up to zero. The model keeps step 5 and is told
to copy amounts exactly. Compare `skill/SKILL.md` and `solution/SKILL.md`: the rules that were unsaid are now
written down *and* enforced.

## What to look for when you read a passing run

Open `3-balances.json` in a run that passed. Are the pennies the same as `reference/out/3-balances.json`? A pass
within 5p can still be a different answer on every run. That is the point of moving it into code.
