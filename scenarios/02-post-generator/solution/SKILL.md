---
name: post-generator
description: Turn a blog article into social posts for each platform in a campaign, with tagged links and a posting schedule.
---

# Post generator

Writing the posts is your job. Building links, counting characters and working out dates are not:
scripts do those, and you run them from the folder you were started in. Everything about the
campaign is in `campaign.json`. Save every file in `out/`.

1. Read the article. Pick its headline figure and three supporting facts.
   Save `out/1-facts.json` as `{ "headline": "...", "supporting": ["...", "...", "..."] }`.
2. Build the links:

   ```bash
   node "${CLAUDE_SKILL_DIR}/scripts/links.mjs"
   ```

   This writes `out/2-links.json`. It keeps the query the article URL already has.
3. Write one post per platform. Lead with the headline figure, paste that platform's link from
   `out/2-links.json` exactly once, and use at most two hashtags, only from the approved list,
   spelled exactly as listed. Match the tone to the platform.
   Save `out/3-posts.json` as `{ "<platform key>": "<post text>" }`.
4. Measure the posts. Do not count characters yourself:

   ```bash
   node "${CLAUDE_SKILL_DIR}/scripts/measure.mjs" out/3-posts.json
   ```

   It writes `out/4-final.json` and lists every post that is over a limit or has lost its link.
   If it lists any, save shorter versions of those posts (keep the link whole) to `out/4-texts.json`,
   with the same shape as `out/3-posts.json`, and run it again on that file. Repeat until it prints
   `All posts fit.`
5. Schedule the posts:

   ```bash
   node "${CLAUDE_SKILL_DIR}/scripts/schedule.mjs"
   ```

   This writes `out/5-schedule.json`. It skips weekends and handles the clocks changing.
6. Put it together for the client. Save `out/posts.md` with each final post copied exactly from
   `out/4-final.json`, and when it goes out from `out/5-schedule.json`.
