# Dependency triage: the lesson

> Spoilers. Read this after you have mapped the skill and run it at least once.

## The map

Every step except the last is a version comparison. None of them looks like arithmetic, which is why this
scenario is hard to spot.

| Step | Kind | The trap |
| --- | --- | --- |
| 1 · List | Deterministic | None: a warm-up |
| 2 · In range | Deterministic: **must** be code | `^0.4.2` stops before 0.5.0. `^0.0.3` is 0.0.3 only. `~2.29.3` allows 2.29.10 |
| 3 · Latest | Deterministic: could be code | Pre-releases (`5.1.0-beta.1`) are not stable. The registry lists versions out of order |
| 4 · Advisories | Deterministic: **must** be code | **`4.17.4` is below `4.17.21`.** As text it sorts above it |
| 5 · Fixes | Deterministic: **must** be code | The ui-kit fix is 0.5.0, and `^0.4.2` does not allow it |
| 6 · Plan | Probabilistic | It must not invent versions |

## What we planted

- **Text comparison.** Compared as strings, "4.17.4" > "4.17.21" and "5.9.2" > "5.10.0". A model that
  reasons in characters can mark dashkit safe when it is not.
- **Caret below 1.0.** This is npm's rule, and it surprises people too. A plan that says "run npm update
  to fix the ui-kit XSS" is confidently wrong.
- **An exact pin.** `fetchline` is pinned to `6.19.2`, so even a patch release needs a change to `package.json`.
- **Distractor advisories.** schemata and routekit have advisories that do not cover the installed versions.

The answer key was cross-checked against the `semver` package npm itself uses.

## What the solution changes

`triage.mjs` implements the part of semver this project needs, in under 100 lines. The model writes only the
plan and is told to take every version and yes/no from the files. `plan-real-versions` is a deterministic check
on a judgement step: every version the plan names must actually exist in the registry.
