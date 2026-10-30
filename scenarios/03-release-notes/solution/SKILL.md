---
name: release-notes
description: Prepare the next release from the git log - changelog entry, version number, contributors and a short announcement.
---

# Release notes

Steps 1 to 5 follow rules written in `CONTRIBUTING.md`, so a script does them. Step 6 is yours.

1–5. From the folder you were started in, run:

   ```bash
   node "${CLAUDE_SKILL_DIR}/scripts/release.mjs"
   ```

   It reads `commits.txt`, `package.json` and `.mailmap` and writes `out/1-commits.json`,
   `out/2-groups.json`, `out/3-version.txt`, `out/4-contributors.json` and `out/CHANGELOG-entry.md`.
   Do not edit those files. If the script stops with an error, report it and stop.

   What it does, so you can explain it:
   - Takes only the commits newer than the last `tag: v…` line.
   - Drops a commit and its `revert:` when both are in the range.
   - Marks a commit breaking if its type has a `!` or its body has a `BREAKING CHANGE:` footer.
   - Below 1.0.0, a breaking change bumps the minor version; otherwise the major.
   - Credits authors and `Co-authored-by:` names, maps aliases through `.mailmap`, leaves out bots,
     and sorts the names alphabetically.

6. Read `out/CHANGELOG-entry.md` and write a short announcement for the team chat: what is new and
   what people must change. Name the version exactly as in `out/3-version.txt`, and give every
   breaking change with what to use instead.
   Save it as `out/announcement.md`.
