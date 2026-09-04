# Year — a personal habit tracker

A daily habit checklist joined to a year-long, colour-coded visual history.

Categories organise things; the individual items inside them are what actually
get tracked. Vitamin C and Magnesium are separate habits with separate colours,
streaks and history, so missing one shows up as exactly that. Every item owns a
colour; every day you complete it, that item's cell fills in. By December the
year reads as one dense, colourful sheet — enough to see at a glance that you
kept up creatine all year but barely ran in winter.

Runs entirely in the browser — no backend, no environment variables, no account.

## Running it

```bash
npm install
```

```bash
npm run dev
```

Then open http://localhost:3000.

```bash
npm run build
```

## Deploying to Vercel

Import the repository on Vercel and deploy. It's a stock Next.js App Router
project: framework auto-detects, no build settings to change, and no environment
variables to set.

## Goals

A goal is a thing, a number and a stretch of time — "Gym 150 times this year".
Everything else is derived from the records you already keep, so setting a goal
in September immediately shows the sessions you did in January. There is
nothing to keep up to date by hand.

The progress bar carries a **pace marker**: a tick at where a steady pace would
put you today. Whether the fill has passed the tick answers "am I on track?"
before you read a number.

Goals can count a habit (days it was completed) or a category (days it had any
completion), over this year, a date range, or an ongoing stretch with no end.
Targets pre-fill from the habit's own schedule — a 3×/week habit suggests 156
for a year.

Milestones at a quarter, half and three quarters appear automatically with the
date each was crossed. A goal that reaches its target records the day; one
whose period ends short reads "Finished at 88%" and stays in the record, because
a history app shouldn't pretend unfinished goals didn't happen.

Goals reference data and never own it: deleting a goal cannot touch a single
completion, and editing a target only re-derives the numbers.

The day a goal lands, Today says so once — a tinted card in the goal's own
colour, no confetti, nothing to dismiss. It's derived from the date the target
was crossed, so it appears on the tap that finished it and is gone tomorrow.

## Moments

Days can carry a marked moment — "Shipped Aminta v1", "Ran my first 10K". On the
Year page these interleave with goal milestones into one chronological
**Highlights** list, so achievements read as things that happened rather than as
analytics. On Month they sit in the journal alongside that day's note.

## Notes and variants

Any day takes an optional short note — "squat PR", "Solana meetup". Completions
record *that* something happened; notes record *what*, which is what makes a
year worth scrolling back through. They surface as a strip across the year grid
and, interleaved with that month's moments, as a readable list on the Month
page. Nothing ever asks you for one.

A habit can define optional variants — Gym as Push / Pull / Legs. Completing
stays exactly one tap; the variant chips appear only after it's checked off, so
labelling is an optional second tap. The year tooltip then reads "Gym — Pull",
and the habit's stats card breaks the year down per variant.

## Categories and goals

A category is a visual grouping with a daily goal. It is never itself completed
— its progress is always derived from its children, so nothing about it lives in
the completion history.

| Goal | Meaning | Example |
| --- | --- | --- |
| **Complete all** | Every due item must be done | Supplements — all five |
| **Complete any** | At least one item counts | Activity — a gym session is enough |
| **Custom goal** | At least N items | Health — 2 of 4 |

The goal type changes what gets measured. Activity reports active days and your
most common activity; Supplements reports perfect days and average completion.
Asking an Activity group for "perfect days" would be meaningless, so it isn't
shown there.

Goal type also drives the day streak on Today and the consistency figure on
Year: one basketball session satisfies Activity, exactly as an "any" group is
meant to work.

A category is only judged on days when at least one of its items is on a
*fixed* schedule (every day, or specific weekdays). Items set to N× per week
stay tappable every day but carry a weekly target rather than a daily
obligation — "train 3× a week" shouldn't fail four times a week, and a rest day
shouldn't break a streak. Seeded Activity works this way.

## Feeling sick

Every day, past or present, carries a plain red **Feeling sick** toggle above
its checklist (Today and the Month view's day panel share the same component).
Marking a day sick excuses every category's goal for that date — nothing is
"due," so nothing can be missed. Streaks and consistency figures skip the day
entirely rather than counting it as a failure, the same way they already skip
a day nothing was scheduled on.

It's an override on the *requirement*, not on the *record*: if you still take
something despite being sick, that completion is stored and counted exactly as
usual — the year grid still lights up for it, and raw totals still include it.
Only the goal judgment for that date is waived, via a `sickDays: DateKey[]`
list on `AppData` that every stats function threads through as an optional
`ReadonlySet<DateKey>`, defaulting to empty so nothing beyond it changes.

## The screens

- **Today** — the hero date, then a checklist grouped by category with derived
  counts (`SUPPLEMENTS 4 / 5`, `ACTIVITY 2 activities today`). Hierarchy comes
  from spacing and hairlines rather than nested cards. A strip of the last 14
  days sits above it so fixing a day you forgot to tick never means leaving the
  screen, and a week strip below shows how the current week is going —
  measured by goal attainment, which nothing else answers. When a past year
  has anything recorded on this same date, one quiet "On this day" line names
  the most recent one — never a list of every year, since Today is meant to
  stay a checklist, not a scrollback.
- **Month** — where you read your life back. Four numbers that each answer a
  different question (how much, how often, how well, what you leaned on), a
  calendar where each day carries a colour stripe and a mark if it has a note,
  and that month's notes as a readable list. Click any past day to edit it.
- **Year** — the main event. Two layouts:
  - **By item** — one row of 365 cells per individual item, in that item's
    colour, grouped under understated category headings that collapse. Month
    labels and separators, sticky labels, and a marker on today. Opens scrolled
    to the current month. A neutral strip along the top marks the days that
    carry a note. Clicking any cell opens that whole day.
  - **Combined** — a 53×7 week grid where days with several completed items
    split into flat colour bands.

  Below the grid: goal progress, the year's Highlights, and personal bests —
  the busiest week of the year, plus each habit's strongest month where there
  genuinely was one. A month has to beat the runner-up outright to count, and
  the list ranks by that margin, so a real spike outranks a daily supplement's
  fourth perfect month. A "Review" link opens that year's recap.
- **Year Review** (`/year/[year]/review`) — the year told back in a few
  minutes' reading rather than measured. Opening numbers chosen editorially,
  not every stat available; a twelve-column rhythm strip that's the shape of
  the year at a glance (bar height is completions, the thin bar beneath is
  consistency — two geometric readings, not a colour code); the strongest
  month by consistency, not volume; personal records; goals grouped by what
  actually happened — reached, still in progress, or the period closed short,
  with no group called a failure; moments and milestones in one chronological
  list with a deliberate size difference; a short paragraph for the habits
  that carried the year; and a few plainly-stated patterns (most consistent
  weekday, first vs. second half, notes written) — each shown only when the
  data actually supports it. A past year gets "YOUR YEAR" and a finished
  verdict on every goal; the current year gets "SO FAR" and nothing dressed up
  as more final than it is. Every number is recomputed on open — nothing about
  a year is cached, so correcting a day in March updates that year's review
  exactly like it updates everywhere else.
- **Habits** — create categories and the items inside them. Rename, re-icon,
  recolour, archive, delete, change the schedule, change the group goal, define
  optional variants (Gym → Push / Pull / Legs), and reorder both levels by
  drag-and-drop (with arrow buttons alongside, since dragging isn't available
  on touch).
- **Goals** — set and inspect targets, see milestones with the dates they were
  crossed, archive finished ones.
- **Settings** — theme, week start, cell size, archived visibility, and JSON
  export / import / reset.

## Colours

Sixteen curated swatches are the primary picker, sharing a saturation and
lightness range so a grid full of them reads as cohesive rather than as rainbow
noise. A hex field is there for anything specific.

## Architecture

```
app/                     routes: today (/), month, year, year/[year]/review, goals, habits, settings
components/
  habits/                checklist rows, category sections, editors, stats
  goals/                 goal row, editor, Today nudge
  moments/               moment editor and the day's moments
  calendar/              month grid, month summary and journal
  year-grid/             the two year layouts + their geometry
  recap/                 Year Review sections — rhythm strip, goals, highlights, …
  ui/                    Card, Button, Segmented, Switch, tooltip, …
lib/
  dates.ts               local-timezone date keys (see below)
  schedule.ts            what's due when
  categories.ts          category goal evaluation and derived progress
  goals.ts               goal progress, pace, milestones, year highlights
  stats.ts               streaks, rates, category/week/month/year summaries
  recap.ts               Year Review reducers — monthly breakdown, patterns, goal results
  normalize.ts           validates any untrusted data into AppData
  migrations.ts          schema upgrades, applied on load only
  store.tsx              React context over the storage provider
  transfer.ts            export / import
storage/
  provider.ts            the StorageProvider interface
  localStorageProvider.ts
  index.ts               picks the active provider
types/index.ts           Category, Habit, HabitCompletion, AppSettings, …
tests/                   node --test suite, no framework
```

`Category` and `Habit` are separate concepts. A habit carries a `categoryId`;
`order` is scoped to its category, so items sort independently inside each
group. Category progress is computed in `lib/categories.ts` and never stored.

### Swapping localStorage for Supabase

Nothing in `app/` or `components/` touches `window.localStorage`. The only seam
is `StorageProvider` in `storage/provider.ts`:

```ts
interface StorageProvider {
  load(): Promise<AppData | null>;
  save(data: AppData): Promise<void>;
  clear(): Promise<void>;
}
```

Every method is already async. To move to a backend, add
`storage/supabaseProvider.ts` implementing that interface and return it from
`getStorageProvider()` in `storage/index.ts`. No component or hook changes.

`lib/transfer.ts` exports completions as a flat `HabitCompletion[]` — the same
shape a `completions` table would have, row for row.

### Dates

Completion data is keyed by **local** calendar date (`2026-08-17`), built from
`getFullYear/getMonth/getDate`. `toISOString().slice(0,10)` is deliberately never
used: west of UTC it returns tomorrow's date after ~17:00 local, which would
silently file completions on the wrong day. `daysBetween` normalises through
`Date.UTC` so DST transitions don't produce 23- or 25-hour "days".

Future dates can't be completed — `setCompletion` refuses them, and future cells
are non-interactive in the UI.

## Statistics are never invented

Every figure on every screen is computed from stored completion records. The app
seeds structure — categories and items — but **never** seeds completion history,
so a fresh install genuinely reads 0 and the year grid is genuinely empty. That
emptiness is the point: the colour arrives as you earn it.

Rates are measured from the day tracking actually started, not from when a habit
was created. Creating a habit isn't the same as beginning to track it, and
anchoring on creation would count the gap as misses and report a demoralising 0%
on day one. Gaps *after* you start still count against you.

Where there isn't enough real data for a number to mean anything, the UI says so
rather than showing a confident zero:

- **Consistency** — "Not enough data yet" until a day has finished.
- **Best month** — needs at least two months with data; naming a "best" out of
  one month tells you nothing.
- **Average / rate** — an em-dash until a day has finished (today is excluded
  while it's still in progress).
- **Category and item cards** — "Your patterns will appear here over time."

## Data, backup, and first launch

Everything lives under the `habit-year:v1` localStorage key (the key name is
kept for continuity; the schema inside is versioned separately and is now at
v7). On a genuinely empty install the app seeds Supplements, Activity and Other
with their items and **no history at all**. **Settings → Clear all history**
resets completions, notes, variants, sick days and moments to zero while keeping
the structure — categories, items and goals survive, and the goals simply
recount from nothing; **Reset everything** clears the lot.

Migrations run on load from storage — never on import, since restoring a backup
is an explicit act and that history must survive untouched:

- **v1 → v2** — habits saved before categories existed move into a fallback
  **Other** category, history intact.
- **v2 → v3** — earlier versions generated ~30 days of demo completions on first
  launch. Completions are stored as bare habit ids under a date key, with no
  timestamp or provenance flag, so no individual record can be identified as
  generated. What is reliable is the shape: the generator ran once at install,
  writing a contiguous block ending that day. So v3 drops everything dated
  before today and keeps today untouched — it may leave a few generated entries
  on the install day, but it can never delete a real one.
- **v3 → v4** — added sick days. Purely additive: data without the field just
  normalizes to an empty list, so no migration step is needed.
- **v4 → v7** — day notes, habit variants, then goals and moments. All purely
  additive in the same way: an older backup imports with the new fields empty
  and every completion untouched.

Because localStorage is per-browser and can be cleared by the browser itself,
**Settings → Export JSON** is the backup. Import accepts both the export bundle
and a raw internal snapshot, and drops anything malformed rather than failing.

## PWA

`app/manifest.ts` plus icons in `public/icons` make it installable. On iPhone:
open in Safari → Share → Add to Home Screen. It then launches standalone, with
safe-area padding for the notch and home indicator.

## Tests

```bash
npm run verify
```

Typecheck, tests and a production build. `npm test` alone runs the suite;
`npm run test:tz` runs it across five timezones, which is the check that
actually catches date bugs.

No test framework and no build step — Node's built-in runner with native
TypeScript stripping. `tests/resolve-hooks.mjs` bridges the `@/` alias so the
real source is imported unmodified.

## Stack

Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Lucide icons.
No other runtime dependencies, and no dev dependencies beyond the toolchain —
the test suite runs on Node itself.

See `DECISIONS.md` for the non-obvious architectural choices and why they're
that way.
