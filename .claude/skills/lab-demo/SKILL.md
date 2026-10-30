---
name: lab-demo
description: Run one lab scenario's skill live in this chat on its demo data, saving each step's file, then grade every step. Use when the learner says "/lab-demo", "show me the skill running", "try scenario 02", or wants to see a skill's outputs before running the real tests.
---

# Demo a scenario in the chat

The learner names a scenario (`02`, `post-generator` or `02-post-generator`) and, optionally, which
version: `skill` (the original, the default) or `solution` (the fixed one). Find its folder under
`scenarios/`; call it `<id>` below.

This is a preview so the learner can watch each step happen. Say so once at the start: this session has
seen the repo, so it is not a clean test, and the real measurement is
`node bin/lab.mjs run <id> --runs 5` in fresh sessions.

## Rules for the demo

- **Do not open** `scenarios/<id>/checks.mjs`, `LESSON.md`, `reference/`, or (when demoing the original)
  `solution/`. Work only from the SKILL.md you are demoing and the input files, exactly as a fresh
  session would.
- Do not fix the skill as you go. If a step is unclear, do what the words say and note what you had to
  guess. The guesses are the lesson.

## Steps

1. Set up a clean demo folder (it is ignored by git):

   ```bash
   rm -rf demo/<id> && mkdir -p demo/<id> && cp -R scenarios/<id>/input/. demo/<id>/
   ```

2. Read `scenarios/<id>/<version>/SKILL.md`. Treat `demo/<id>/` as the folder you were started in:
   read inputs from it and save every file the skill names to `demo/<id>/out/`. Where the solution says
   to run `node "${CLAUDE_SKILL_DIR}/scripts/<script>"`, run it from the demo folder with the script's
   path inside the scenario:

   ```bash
   cd demo/<id> && node ../../scenarios/<id>/solution/scripts/<script> [args]; cd ../..
   ```

3. Work through the steps in order. After each one, show the learner, in a line or two, what the
   step produced: the file name and the part that matters (a number, a list, a post). Show the whole
   file only when it is short.

4. Grade the steps:

   ```bash
   node bin/lab.mjs check <id> demo/<id>
   ```

   Show the result. For each failed check, quote the line from the step's file that failed it. Do not
   say why it was wrong or what the trap was: that is `/lab-read`'s job, and `LESSON.md` tells it.

5. Finish with the next commands:
   - `/lab-map <id>` to map the skill before measuring it, if they have not yet;
   - `node bin/lab.mjs run <id> --runs 5 --model haiku` for the real test in fresh sessions;
   - `/lab-demo <id> solution` to watch the fixed version on the same data.

The demo's files stay in `demo/<id>/out/` until the next demo of that scenario replaces them.
