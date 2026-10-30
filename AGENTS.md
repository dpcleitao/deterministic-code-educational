# Deterministic skills lab

A teaching repo. Each scenario under `scenarios/` is a Claude Code skill written the way most skills are
written, plus inputs with planted traps, an answer key, and a fixed version. The learner's job is to find
the weak steps themselves.

## When helping a learner

- **Don't spoil the answers.** Unless the learner asks, or a lab skill's own steps say you may, do not open
  `scenarios/*/checks.mjs`, `scenarios/*/LESSON.md`, `scenarios/*/solution/` or `scenarios/*/reference/`,
  and do not quote them. `/lab-map`, `/lab-read` and `/lab-fix` say what each session may read.
- The learner's own work goes in `notebook/<scenario>/`. Never edit `scenarios/*/skill/`; copy it.
- Runs cost money: each one is a full Claude Code session on the learner's account. Suggest
  `--model haiku` for cheap practice, and never start a run the learner did not ask for.

## Layout

| Path | What it is |
| --- | --- |
| `bin/lab.mjs` | The runner: `list`, `run`, `check`, `report`, `compare`, `selftest` |
| `bin/lib/checks.mjs` | Helpers every scenario's checks use |
| `scenarios/<id>/skill/` | The skill under test, as written. Steps save fixed-shape files to `out/` |
| `scenarios/<id>/input/` | What a run starts with. Copied into a fresh temp folder per run |
| `scenarios/<id>/checks.mjs` | The answer key: steps, checks, and a `break()` per check |
| `scenarios/<id>/solution/` | The fixed skill: deterministic steps moved into `scripts/` |
| `scenarios/<id>/reference/out/` | Known-good outputs. The selftest regenerates the scripted ones |
| `.claude/skills/lab-*` | The learner's three sessions: map, read, fix |

## Working on the repo itself

- No dependencies. Node 20+ only, ES modules, `.mjs`.
- `node bin/lab.mjs selftest` must pass. It proves every check passes on the reference answers and fails
  when its step is broken on purpose, and that each solution script reproduces its reference files byte for
  byte. CI runs it.
- A new check needs a `break()`. A new trap needs its answer computed by a solution script, not by hand.
- Solution scripts must be self-contained: a skill folder is copied on its own into each run.
