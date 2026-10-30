---
name: split-the-bill
description: Settle up a group trip. Reads the trip's expenses and works out who owes whom.
---

# Split the bill

Work through these steps in order. Save each step's result in an `out` folder before moving on.

1. Read `expenses.csv` and list every expense. Expand `all` to everyone in `people.txt`.
   Save `out/1-expenses.json` as a list of
   `{ "id", "date", "paid_by", "amount", "currency", "split_between": [names] }`.
2. Convert each expense to pounds using the rate for its date in `rates.csv`.
   Save `out/2-gbp.json` as `{ "<id>": <amount in GBP> }`.
3. Work out each person's balance: what they paid minus their share of the expenses they were part of.
   Save `out/3-balances.json` as `{ "<name>": <balance in GBP> }`. Positive means they are owed money.
4. Work out the transfers that settle everyone up, using as few transfers as possible.
   Save `out/4-transfers.json` as a list of `{ "from", "to", "gbp" }`.
5. Write a short, friendly message for the group chat that says who pays whom.
   Save it as `out/message.md`.
