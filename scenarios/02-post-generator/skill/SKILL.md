---
name: post-generator
description: Turn a blog article into social posts for each platform in a campaign, with tagged links and a posting schedule.
---

# Post generator

Work through these steps in order. Save each step's result in an `out` folder before moving on.
Everything you need about the campaign is in `campaign.json`.

1. Read the article. Pick its headline figure and three supporting facts.
   Save `out/1-facts.json` as `{ "headline": "...", "supporting": ["...", "...", "..."] }`.
2. Build the link for each platform: the article URL with UTM tags. `utm_source` is the platform key;
   add the medium and campaign from `campaign.json`.
   Save `out/2-links.json` as `{ "<platform key>": "<url>" }`.
3. Write one post per platform. Lead with the headline figure, include that platform's link, and use
   the approved hashtags. Match the tone to the platform.
   Save `out/3-posts.json` as `{ "<platform key>": "<post text>" }`.
4. Check each post against its platform's character limits, counting every character including the
   link, and shorten any that are over.
   Save `out/4-final.json` as `{ "<platform key>": { "text": "...", "characters": <count> } }`.
5. Schedule the posts: one per weekday after the publish date, at the post time in the campaign's
   timezone, in the order the platforms are listed.
   Save `out/5-schedule.json` as a list of `{ "platform", "post_at_utc" }`, times in UTC (ISO 8601).
6. Put it together for the client. Save `out/posts.md` with each final post and when it goes out.
