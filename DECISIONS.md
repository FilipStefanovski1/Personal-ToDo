# Decisions

Short log of choices that aren't obvious from the code, so a future session
doesn't re-litigate them. Newest first.

## Goals reference data; they never own it

A goal stores only a source, a target and a period. Progress, milestones,
status and pace are recomputed from the completion history on every render.

That single rule buys everything the sprint brief asked for. Editing 150 → 175
can't corrupt anything, because there's nothing stored to corrupt. Deleting a
goal is a one-line filter that provably can't touch a completion. Un-checking a
day in March correctly rewinds every goal that counted it. And a goal created
in September immediately shows January's sessions, because the records were
always there — asking the user to backfill would be exactly the busywork the
brief said to avoid.

Milestones follow from the same rule. Storing "reached 100 on Sep 18" goes
stale the moment an earlier day is corrected; walking the period's dates in
order costs nothing and is always right. Thresholds are 25/50/75/100% of the
target, deduped (a target of 2 doesn't emit four milestones).

## Goal periods: year, custom range, ongoing — and deliberately not weekly

Weekly and monthly *recurring* goals were considered and rejected. `timesPerWeek`
habit schedules plus the Today week strip already answer "gym 3× a week", and a
rolling goal would generate 52 separate results a year to store, display and
reason about. A goal here is one named stretch of time with one result.

`ongoing` has no end, so it reports no pace and no days remaining — null rather
than zero, because "0 days left" on a lifetime goal is a lie.

## Pace is a mark on the bar, not a number to parse

The bar carries a tick at where a steady pace would put you today. Whether the
fill has passed the tick answers "am I on track?" pre-attentively; the numbers
underneath are for when you want detail. Pace is `target × elapsed / total`,
which only makes sense for a bounded period — ongoing goals and periods that
haven't started return null and render no tick.

## Goal status is derived, and unfinished goals stay visible

`completed` when the target was reached (with the date it happened),
`ended` when the period closed short, `active` otherwise. An ended goal reads
"Finished at 88%" — the brief was explicit that a personal history app
shouldn't pretend unfinished goals didn't happen, and shouldn't call them
failures either. Archiving hides a goal from the active list; it never deletes
the record.

A goal whose habit was deleted is kept and marked "detached" rather than
silently dropped. Removing it stays the user's decision.

## Today surfaces at most one goal, and only a fixable one

Tone was the design constraint. A goal appears only when a single day would
visibly change it: within 3 of the target, or within 3 of the pace. Anything
further behind gets no line at all, because "28 sessions behind" on a Tuesday
morning is not information. When the habit was already done today the copy
congratulates instead of asking twice.

## Milestones and moments are one list

`Moment` is its own record (date + title + emoji), not a flag on a day note. A
note is "what happened today", written often; a moment is rare, titled, and
belongs to the year's story. Merging the models would mean every note carrying
an is-this-important flag.

But the *presentation* merges them. On the Year page, "Gym — 75 times · Jul 24"
sits beside "Shipped Aminta v1 · Mar 14" in one chronological Highlights list.
Keeping achievements in a separate panel would make them feel like analytics;
interleaved, they read as things that happened, which is the archive the app is
building toward.

## "Clear all history" keeps goals, drops moments

Goals are structure — they survive a wipe and simply recompute to zero. Moments
are records of things that happened, so they go with the history.

## Display vs judgement are separate concerns

`CategoryProgress` carries both `due` (what the checklist shows) and
`scheduled` (what a daily goal is judged against). They were one list, and
conflating them was a real bug: Activity's items were scheduled daily, so the
category was judged every day and failed on every rest day, flattening the
streak to 0 and consistency to 53% against data with 13 gym sessions.

Rule: `timesPerWeek` items are always tappable but never part of a *daily*
obligation. "Train 3× a week" must not fail four times a week. Their target is
weekly and lives at the item level.

Consequence: a category whose items are all `timesPerWeek` has no daily goal,
so it reports no daily streak (`judgedDays === 0`) and the UI shows an em-dash
rather than a meaningless `0d`. An `any` category counts *days you did
something* rather than days a goal rode on.

If you add a new stat, key it off `progress.judged`, and keep raw completion
tallies **outside** that guard — an unjudged day still holds real records.

## Anything `position: fixed` must be portaled

Every page wrapper carries the `animate-rise` entrance animation. A settled CSS
transform — even at its identity matrix — establishes a containing block for
fixed descendants, so a fixed overlay anchors to the page wrapper rather than
the viewport. This shipped broken: the habit editor rendered ~70px above the
top of the viewport with its title and name field cut off.

Use `components/ui/Portal` for any new overlay, dialog or floating control.

## Statistics are never invented

Every figure is computed from stored records. The app seeds structure but never
completion history, so a fresh install genuinely reads zero.

Rates anchor on the **first recorded completion**, not `createdAt` — creating a
habit isn't the same as starting to track it, and anchoring on creation reports
a demoralising 0% on day one. Gaps *after* you start still count.

Where there isn't enough data for a number to mean anything, the UI says so
rather than showing a confident zero: consistency needs a finished day, best
month needs two months to compare, averages show an em-dash until a day is over.
Today is always excluded from denominators while it's still in progress.

## Variants live in a side table

`AppData.variants` is keyed by date and habit, not stored on the completion
record. Completions are the most precious data in the app; a cosmetic feature
shouldn't touch their shape. Un-completing a habit drops its variant with it.

Completing stays exactly one tap — variant chips appear only *after* a habit is
checked off, so labelling is optional and never gates the thing you came to do.

## Migrations run on load, never on import

`migrateStoredData` upgrades stored data. `parseImport` deliberately doesn't:
restoring a backup is an explicit act and its history must survive untouched,
however old.

The v2→v3 migration removed generated demo history. Completions carry no
provenance, so no individual record could be identified as generated; what was
reliable was the shape (one contiguous block ending at install). It drops
everything before today and keeps today — it can leave a few generated entries
on the install day but can never delete a real one.

Schema is at v7. Every bump so far has been purely additive.

## Tests

`npm test` runs a dependency-free suite on Node's built-in runner with native
TypeScript stripping; `tests/resolve-hooks.mjs` bridges Next's `@/` alias so the
real source imports unmodified.

`npm run test:tz` runs it across five timezones — the date layer is the most
dangerous code here, and a UTC-shift bug files completions on the wrong day.

Behaviours are paired with counterfactuals: a test that a sick day bridges a
streak sits next to one proving the same gap breaks it without the flag.
Writing them caught two real bugs (a finished month compared against a
truncated previous month; a hardcoded schema version).

## Year grid renders ~4,000 cells

No per-cell React handlers — hover and click are resolved by delegation from
the track using `data-` attributes. Measured: DOM interactive 43ms, hover
handler 0.9ms. Keep it that way if you add cell interactions.
