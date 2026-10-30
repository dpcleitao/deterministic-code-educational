---
name: lab-fix
description: Session 3 of a lab scenario. Fix the weakest step of a scenario's skill, either with one sentence or by moving the step into a script, then rerun and compare. Use when the learner says "/lab-fix" or wants to fix a scenario's skill.
---

# Fix the weak step

Read `notebook/<id>/2-verdicts.md` first. If it does not exist, ask the learner to run `/lab-read`.
Do not open `scenarios/<id>/solution/` or `LESSON.md` until the learner has run their fix.

1. Copy `scenarios/<id>/skill/` to `notebook/<id>/skill/`. Change only the copy. Keep the `name:` and
   every file name and shape the original uses, so the same checks still apply.
2. Take the earliest step whose verdict was **step wrong** or **skill left it open**.
   - If it is counting, sorting, arithmetic, dates, versions or building a string, it should be code. Write a
     small script in `notebook/<id>/skill/scripts/` with no dependencies beyond Node. Run it on
     `scenarios/<id>/input/` and show its output. In `SKILL.md`, tell the model to run it with
     `node "${CLAUDE_SKILL_DIR}/scripts/<name>.mjs"` from the folder it was started in, and not to edit
     what it writes.
   - If it needs judgement, change the fewest words that close the gap. If the right answer depends on a
     rule only the learner knows, ask for the rule.
   - If the verdict was **check wrong**, say so and stop: the fix belongs in `checks.mjs`.
3. Grade your script's output before spending a run:
   `node bin/lab.mjs check <id> <folder with an out/ inside>`.
4. Tell the learner to run the fixed copy and compare:

   ```bash
   node bin/lab.mjs run <id> --runs 5 --variant notebook/<id>/skill
   node bin/lab.mjs compare runs/<id>/<before-batch> runs/<id>/<after-batch>
   ```

5. Once they have, they can read `scenarios/<id>/LESSON.md` and diff their copy against `solution/`.

Save what you changed and why to `notebook/<id>/3-fix.md`.
