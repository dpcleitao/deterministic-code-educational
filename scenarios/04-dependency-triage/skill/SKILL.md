---
name: dependency-triage
description: Triage a project's npm dependencies - what can update now, what needs a breaking upgrade, and what has a known vulnerability.
---

# Dependency triage

Work through these steps in order. Save each step's result in an `out` folder before moving on.
The project's ranges are in `package.json`, what is installed is in `installed.json`, the versions
published for each package are in `registry.json`, and known vulnerabilities are in `advisories.json`.

1. List every dependency with its range and installed version.
   Save `out/1-deps.json` as a list of `{ "name", "range", "installed" }`.
2. For each dependency, find the newest published version its range allows.
   Save `out/2-in-range.json` as `{ "<name>": "<version>" }`.
3. For each dependency, find the newest stable version published.
   Save `out/3-latest.json` as `{ "<name>": "<version>" }`.
4. Check each installed version against the advisories.
   Save `out/4-vulnerable.json` as a list of `{ "name", "installed", "advisory" }`, one per match.
5. For each vulnerable package, find the lowest published version that fixes it, and whether the
   current range allows that version.
   Save `out/5-fixes.json` as `{ "<name>": { "fixed_in": "<version>", "range_allows": true|false } }`.
6. Write the upgrade plan for the team: what to do first and why, and which upgrades need a change
   to `package.json`. Save it as `out/plan.md`.
