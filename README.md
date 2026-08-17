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

## The screens

- **Today** — the hero date, then a checklist grouped by category with derived
  counts (`SUPPLEMENTS 4 / 5`, `ACTIVITY 2 activities today`). Hierarchy comes
  from spacing and hairlines rather than nested cards. A strip of the last 14
  days sits above it so fixing a day you forgot to tick never means leaving the
  screen.
- **Month** — a conventional calendar with tiny colour blocks per day. Click any
  past day to edit that day's checklist. Future days are not clickable.
- **Year** — the main event. Two layouts:
  - **By item** — one row of 365 cells per individual item, in that item's
    colour, grouped under understated category headings that collapse. Month
    labels across the top, sticky labels, and a marker on today. Opens scrolled
    to the current month.
  - **Combined** — a 53×7 week grid where days with several completed items
    split into flat colour bands.
- **Habits** — create categories and the items inside them. Rename, re-icon,
  recolour, archive, delete, change the schedule, change the group goal, and
  reorder both levels by drag-and-drop (with arrow buttons alongside, since
  dragging isn't available on touch).
- **Settings** — theme, week start, cell size, archived visibility, and JSON
  export / import / reset.

## Colours

Sixteen curated swatches are the primary picker, sharing a saturation and
lightness range so a grid full of them reads as cohesive rather than as rainbow
noise. A hex field is there for anything specific.

## Architecture

```
app/                     routes: today (/), month, year, habits, settings
components/
  habits/                checklist rows, category sections, editors, stats
  calendar/              month grid
  year-grid/             the two year layouts + their geometry
  ui/                    Card, Button, Segmented, Switch, tooltip, …
lib/
  dates.ts               local-timezone date keys (see below)
  schedule.ts            what's due when
  categories.ts          goal evaluation and derived category progress
  stats.ts               streaks, rates, category stats, year summary
  normalize.ts           validates any untrusted data into AppData; v1 → v2
  store.tsx              React context over the storage provider
  transfer.ts            export / import
storage/
  provider.ts            the StorageProvider interface
  localStorageProvider.ts
  index.ts               picks the active provider
types/index.ts           Category, Habit, HabitCompletion, AppSettings, …
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

## Data, backup, and first launch

Everything lives under the `habit-year:v1` localStorage key (the key name is
kept for continuity; the schema inside is versioned separately and is now at
v2). On a genuinely empty install the app seeds Supplements, Activity and Other
plus ~30 days of plausible history so the year view is immediately colourful;
**Settings → Clear demo data** wipes the history and keeps the structure, and
**Reset everything** clears the lot.

Data saved before categories existed is migrated on load: those habits are moved
into a fallback **Other** category with their history intact. The same repair
runs on import, so a v1 export file still loads.

Because localStorage is per-browser and can be cleared by the browser itself,
**Settings → Export JSON** is the backup. Import accepts both the export bundle
and a raw internal snapshot, and drops anything malformed rather than failing.

## PWA

`app/manifest.ts` plus icons in `public/icons` make it installable. On iPhone:
open in Safari → Share → Add to Home Screen. It then launches standalone, with
safe-area padding for the notch and home indicator.

## Stack

Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Lucide icons.
No other runtime dependencies.
