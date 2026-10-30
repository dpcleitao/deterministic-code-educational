---
name: release-notes
description: Prepare the next release from the git log - changelog entry, version number, contributors and a short announcement.
---

# Release notes

Work through these steps in order. Save each step's result in an `out` folder before moving on.
The git log is in `commits.txt`, newest first.

1. List the commits since the last release.
   Save `out/1-commits.json` as a list of `{ "hash", "author", "subject" }`.
2. Sort them into Breaking, Features, Fixes and Other. Each commit goes in one group.
   Save `out/2-groups.json` as `{ "breaking": [hashes], "features": [hashes], "fixes": [hashes], "other": [hashes] }`.
3. Work out the next version number from the current one in `package.json`.
   Save it as the only line in `out/3-version.txt`.
4. List the contributors to credit.
   Save `out/4-contributors.json` as a list of names.
5. Write the changelog entry, with a heading for the version and a section per group.
   Save it as `out/CHANGELOG-entry.md`.
6. Write a short announcement for the team chat: what is new and what people must change.
   Save it as `out/announcement.md`.
