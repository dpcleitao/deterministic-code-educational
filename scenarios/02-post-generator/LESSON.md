# Social post generator: the lesson

> Spoilers. Read this after you have mapped the skill and run it at least once.

## The map

| Step | Kind | What the skill leaves unsaid |
| --- | --- | --- |
| 1 · Facts | Probabilistic | Nothing that changes a result: the article says which figure is the headline |
| 2 · Links | Deterministic: could be code | **The URL already has `?lang=en`.** Appending `?utm_source=…` breaks it |
| 3 · Posts | Probabilistic, with deterministic rules | Hashtag case and limit are in `campaign.json`, not the skill |
| 4 · Fit | Deterministic: **must** be code | **How to count.** A model cannot count 280 characters reliably, and it reports a number anyway |
| 5 · Schedule | Deterministic: could be code | **The clocks go forward on Sunday 29 March 2026.** 09:00 London is 09:00 UTC on Friday and 08:00 UTC on Monday |
| 6 · Pack | Mostly copying | Whether "put together" lets the model edit the posts again |

## What we planted

- **The link takes a third of an X post.** Each tagged link is about 120 characters, so the X post has about
  160 characters left for words. Drafts tend to run over.
- **An honest count.** `final-count-honest` compares the number the model *wrote down* with the real count.
  A post can fit and still carry a wrong count. That wrong number is the model reporting a measurement it
  never made.
- **Shortening mangles links.** A model cutting a post down will sometimes trim the UTM tags.
- **Daylight saving.** Most runs will get the weekdays right and the UTC hours wrong after the change.
  `schedule-days` and `schedule-utc` are separate so you can see which.

## What the solution changes

Links, measuring and scheduling move into three scripts. The interesting one is `measure.mjs`. The model still
writes and rewrites the posts, but code decides whether they fit. That pattern (the model proposes, code checks,
repeat) is how you keep a judgement step and still get a deterministic guarantee.
