---
name: lab-read
description: Session 2 of a lab scenario. Read the results of a batch of runs, give every failed check a verdict, and read one passing run for mistakes no check caught. Use after `node bin/lab.mjs run`, or when the learner says "/lab-read".
---

# Read a batch of runs

Find the newest batch for the scenario under `runs/<id>/` unless the learner names one. Each batch has
`report.md`, `summary.json` and one `run-N/` folder per session, with that session's `out/` files and
`transcript.jsonl`.

You may now read `scenarios/<id>/checks.mjs` to see what each check looks for. Do not open `LESSON.md`
or `solution/` yet.

1. Print `report.md`. Read the table from the top: the first step that falls short is the one that matters.
2. For every failed check, open that run's file for that step and quote the relevant lines. Give one
   verdict:
   - **step wrong**: the skill was clear and the step got it wrong;
   - **skill left it open**: the skill never said, and the model guessed;
   - **bad input**: an earlier step handed this step a wrong file;
   - **check wrong**: the file is right and the check is mistaken.
3. Check "What each run did" in the report. Did any run write and run its own code, or try to and get
   blocked? Say how that changes what the pass rate means.
4. Pick one run that passed every check. Read all its files. List anything wrong that no check caught.
5. Compare with the predictions in `notebook/<id>/1-map.md`, if it exists. Which flags were right?

Save it to `notebook/<id>/2-verdicts.md`. Then tell the learner that `/lab-fix` makes the fix in a new
session.
