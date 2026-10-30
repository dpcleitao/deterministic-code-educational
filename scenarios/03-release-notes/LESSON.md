# Release notes: the lesson

> Spoilers. Read this after you have mapped the skill and run it at least once.

## The map

| Step | Kind | What the skill leaves unsaid |
| --- | --- | --- |
| 1 · Commits | Deterministic: could be code | "Since the last release" means after the `tag: v0.9.3` line |
| 2 · Groups | Deterministic: could be code | **What to do with a revert.** A feature added and reverted in the same release should not be announced |
| 3 · Version | Deterministic: could be code | **The pre-1.0 rule.** It is in `CONTRIBUTING.md`, which the skill never mentions |
| 4 · Contributors | Deterministic: could be code | **Co-authors, bots and aliases.** All three rules are in `CONTRIBUTING.md` and `.mailmap` |
| 5 · Changelog | Deterministic once 1–4 are right | Nothing |
| 6 · Announcement | Probabilistic | Nothing |

## What we planted

- **A breaking change hidden in a fix.** `2c9f7b3` is `fix(auth): …` with `BREAKING CHANGE:` in its body.
  The `!` on `5b3a9f4` is easy to spot; the footer is not.
- **0.9.3 → 0.10.0, not 1.0.0 and not 0.9.4.** Semver says nothing firm below 1.0. This project's rule is in
  `CONTRIBUTING.md`. A model that does not read it has to guess, and the guess is "the skill left it open".
- **A revert pair.** `31a6f0b` adds CSV export and `9e27c4d` reverts it.
- **Wei Chen** appears only in a `Co-authored-by:` trailer. **Jonas Berg** only worked on 0.9.3.
  **priya shah** is Priya Shah under another email. **dependabot[bot]** is not a person.

## What the solution changes

`release.mjs` parses the log and applies every rule from `CONTRIBUTING.md`. It even renders the changelog
entry from a template. The model writes only the announcement and must name the version exactly as in
`3-version.txt`.

The lesson: a step that looks like summarising ("sort these commits", "list the contributors") is often parsing
with rules. The rules live in files the skill never pointed to.
