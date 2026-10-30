---
name: lab-map
description: Session 1 of a lab scenario. Map a scenario's skill into its steps, mark each one deterministic or probabilistic, and predict which steps will fail. Use when the learner says "map", "/lab-map", or starts a scenario.
---

# Map a scenario's skill

The learner names a scenario: a number like `01` or a name like `split-the-bill`. Find its folder
under `scenarios/`.

**Read only `scenarios/<id>/skill/SKILL.md` and the files in `scenarios/<id>/input/`.** Do not open
`checks.mjs`, `LESSON.md`, `solution/` or `reference/`. They hold the answers, and the point of this
session is to find the weak steps before seeing them.

1. List every step of the skill in order. For each step, say:
   - whether code could do it (deterministic) or it needs judgement (probabilistic), and why;
   - what it takes in and which file it leaves behind;
   - anything the skill leaves unsaid that could change the result. Look in the input files for rules
     the skill never mentions.
2. Rank the unsaid things by how likely each is to change the result. Keep the top three.
3. Draw the steps as a Mermaid flowchart: square boxes `["…"]` for deterministic steps, rounded boxes
   `("…")` for probabilistic ones, and a `{{"unsaid: …"}}` node linked with `-.-` for each of the top three.
4. Predict, for each step, how many of five fresh runs will get it right on the model the learner plans
   to use, with one sentence of reasoning.

Save all of it to `notebook/<id>/1-map.md`. Then tell the learner the command for the next session:

```bash
node bin/lab.mjs run <id> --runs 5
```

and that `/lab-read` reads the result in a new session.
