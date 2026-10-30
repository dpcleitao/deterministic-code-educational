# Find the weak step: a deterministic skills lab

Five Claude Code skills that each look fine, produce a confident answer, and are wrong in ways you can
only see one step at a time. You run each one in fresh sessions, grade every step with plain code, find
the step that fails, and fix it, usually by moving that step out of the model and into a script.

The idea in one line: **a model decides; code counts.** Most skills mix the two and never say which is
which. When the final answer is off, nothing tells you which step moved.

## What you need

- [Claude Code](https://claude.com/claude-code), logged in. Each run is one full session on your account.
- Node.js 20 or newer. Nothing to install: the repo has no dependencies.
- macOS or Linux. On Windows, use WSL.

```bash
git clone https://github.com/dpcleitao/deterministic-code-educational
cd deterministic-code-educational
node bin/lab.mjs selftest
```

The selftest makes no model calls. It shows every check passing on the right answers and failing when its
step is broken on purpose.

## See one run first

Every scenario ships with its own invented demo data in `scenarios/<id>/input/`: a blog post and
campaign brief, a trip's expenses, a git log, a project's npm packages, a week of support tickets.
To watch a skill work on it, open Claude Code in this folder and type:

```
/lab-demo 02
```

Claude copies the demo data into `demo/02-post-generator/`, follows the skill step by step in the chat,
saves each step's file to `demo/02-post-generator/out/`, and then grades every step. `/lab-demo 02 solution`
does the same with the fixed version. The demo runs in a session that can see the repo, so treat it as a
preview. The real test is five fresh sessions, below.

## The scenarios

Start at the top. Each one is harder to see than the last.

| | Scenario | What it does | Why it is tricky |
| --- | --- | --- | --- |
| 01 | Split the bill | Settles up a group trip in euros and pounds | The arithmetic is obvious. The weekend exchange rate and the refund are not |
| 02 | Social post generator | Turns a blog post into scheduled posts for X, LinkedIn and Threads | Everyone expects the 280-character limit. Few expect the URL or the calendar |
| 03 | Release notes | Turns a git log into a changelog, a version number and credits | Looks like summarising. It is parsing, with rules the skill never points to |
| 04 | Dependency triage | Decides which npm packages to update and which have known holes | Every step looks like reading. Every step is a comparison |
| 05 | SLA breach report | Finds support tickets that missed their target, in business hours | Clocks, timezones, holidays and a rule hidden in plain sight |

```bash
node bin/lab.mjs list
```

## How a scenario works: three sessions

Each scenario takes three short Claude Code sessions. Each session saves its work to `notebook/`, so you
can stop between them. Open Claude Code in this folder for each one.

**Session 1: map it.** Before running anything, predict where it will break.

```
/lab-map 01
```

Claude reads only the skill and its inputs. It marks each step deterministic or probabilistic, flags what
the skill leaves unsaid, draws the steps, and predicts the pass rate per step.

**Between sessions: run it.** In your terminal, not inside Claude Code:

```bash
node bin/lab.mjs run 01 --runs 5 --model haiku
```

That is five fresh sessions. Each starts in an empty temp folder with only the skill and its inputs, so the
model never sees the answers. Every step's file is kept and graded. You get a table like this:

```
step 2  Convert to pounds
  ●●○●○   3/5  Euros use the rate for their date (E02, E13)
  ○○○○○   0/5  Weekend expenses use Friday's rate (E04, E07)
```

That table shows what the format looks like. It does not predict your results. Try `--model sonnet`
and `--model opus` too: different models fail in different places.

**Session 2: read it.**

```
/lab-read 01
```

Claude gives every failed check one of four verdicts: the step was wrong, the skill left it open, an earlier
step handed it bad input, or the check itself was wrong. Then it reads a run that passed everything,
looking for mistakes no check caught.

**Session 3: fix it.**

```
/lab-fix 01
```

Claude copies the skill into `notebook/01-split-the-bill/skill/` and fixes the earliest weak step. Where the
step is arithmetic, sorting, dates or versions, that means a script. Then you run the copy and compare:

```bash
node bin/lab.mjs run 01 --runs 5 --model haiku --variant notebook/01-split-the-bill/skill
node bin/lab.mjs compare runs/01-split-the-bill/<before> runs/01-split-the-bill/<after>
```

Finally read `scenarios/01-split-the-bill/LESSON.md`. It lists what was planted and why each check is shaped
the way it is. Then diff your fix against `solution/`.

## The runner

```
node bin/lab.mjs run <scenario>      --runs 5  --model sonnet  --variant skill|solution|<folder>
node bin/lab.mjs check <scenario> <folder>    grade one folder of step files, no model call
node bin/lab.mjs report <batch>               print a batch's table again
node bin/lab.mjs compare <before> <after>     two batches, check by check
node bin/lab.mjs selftest                     prove every check
```

Things worth knowing:

- **What a run may do.** Read, write and edit files, and run `node`, `python3`, `mkdir`, `ls`, `cat` and
  `date`. Sessions load only the temp folder's settings, so your own hooks, plugins and MCP servers stay out
  of the test. The report shows which tools each run used and any command that was blocked. A model that
  decides to write its own script is running a different experiment, so it is worth knowing. Pass
  `--allow-code` to let sessions run any shell command.
- **Cost.** Every run reports what it spent. `--budget` caps each session (default $1). Haiku is the cheap
  way to practise. More runs give a steadier rate: five shows you the shape, not a number to quote.
- **Results** go to `runs/<scenario>/<batch>/`, which git ignores. `report.md` is the table. Each
  `run-N/out/` holds that session's step files and final output (the posts, the message, the plan), and
  `run-N/transcript.jsonl` records everything the session did. You can also ask Claude in this folder to
  start a run for you; it runs the same command.

## Why every step saves a file

You can only check a step if it leaves something behind. Every skill here saves one file per step, in a
fixed shape, to `out/`. That is what lets a check be exact. The checks are plain code in
`scenarios/<id>/checks.mjs`, so the same file gets the same verdict every time.

Two habits worth keeping:

- **Break it first.** Each check has a `break()` that makes its step wrong on purpose. The selftest
  proves the check then fails. A check that cannot fail is not checking anything.
- **Read a pass.** A pass only means the check passed. Open a passing run and read it.

## Add your own scenario

Copy a scenario folder. Write the skill as you normally would, but have each step save a fixed-shape file.
Make an input where you know the right answers, and plant the traps on purpose. Write a solution script
that computes the answers, write a check (with a `break()`) for each step, and run the selftest.

## Licence

MIT. See `LICENSE`.
