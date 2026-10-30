---
name: dependency-triage
description: Triage a project's npm dependencies - what can update now, what needs a breaking upgrade, and what has a known vulnerability.
---

# Dependency triage

Steps 1 to 5 are version comparisons, so a script does them. Step 6 is yours.

1–5. From the folder you were started in, run:

   ```bash
   node "${CLAUDE_SKILL_DIR}/scripts/triage.mjs"
   ```

   It reads `package.json`, `installed.json`, `registry.json` and `advisories.json` and writes
   `out/1-deps.json` to `out/5-fixes.json`. Do not edit those files. If it stops with an error,
   report it and stop.

   The rules it applies, so you can explain them:
   - Versions compare number by number: 4.17.21 is newer than 4.17.4, and 2.29.10 is newer than 2.29.3.
   - A pre-release such as 5.1.0-beta.1 is never "newest stable" and never satisfies a plain range.
   - `^` allows changes that do not touch the first non-zero number: `^4.18.2` is below 5.0.0,
     `^0.4.2` is below 0.5.0, and `^0.0.3` is 0.0.3 only. `~2.29.3` is below 2.30.0.
   - A fix is the lowest published stable version above the installed one that no advisory covers.

6. Read the five files and write the upgrade plan for the team: what to do first and why, and which
   upgrades need a change to `package.json`. Take every version and every yes/no from the files;
   do not work any out yourself. Save it as `out/plan.md`.
