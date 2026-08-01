# Workout Plan — Agent Handoff Document

## Project Overview

A self-contained, single-file HTML strength training dashboard for a user returning to lifting after 15 years. The app runs a 16-week full-body program (based on Jeremy Ethier's routine) with adaptive difficulty, cross-device sync via Firebase, and full offline capability. Hosted on GitHub Pages and designed for mobile use at home.

**Live URL:** https://phillrich13.github.io/Workout-Plan/
**Repo:** https://github.com/phillrich13/Workout-Plan
**Primary file:** `index.html` (single-file app — all HTML, CSS, and JS in one file)

---

## User Profile

- **Height:** 5'10", **Starting Weight:** 268.5 lbs
- **Current activity:** Walking 3-4 mi 5x/week, hiking 4-8 mi on Saturdays
- **Gym access:** Home gym (Bowflex SelectTech 552 dumbbells 5-52.5 lb, FLYBIRD adjustable bench, Bodylastics PRO 6-Band Set with door anchor, pull-up bar, floor mat)
- **Goals:**
  - **Lower body:** Strength for hiking harder trails
  - **Upper body:** Aesthetic physique
- **Experience:** No consistent strength training in 15 years

---

## Architecture

### Single-File Design
Everything lives in `index.html` — no build tools, no dependencies beyond two Firebase CDN scripts. This was a deliberate choice for simplicity and portability (can be opened as a local file or hosted anywhere).

### Data Flow
```
User input → state object → localStorage (immediate) → Firebase Realtime DB (async, debounced)
                                                      ↕
                                              Other devices (real-time listener)
```

### Firebase Configuration
- **Project:** `workout-plan-bba64`
- **Database URL:** `https://workout-plan-bba64-default-rtdb.firebaseio.com`
- **Database path:** `/workoutState`
- **Auth:** Anonymous authentication (`firebase.auth().signInAnonymously()`) with rules requiring `auth != null`
- **SDK:** Firebase compat v9.23.0 via CDN

### Offline Resilience
Firebase initialization is wrapped in a try/catch. If the SDK scripts fail to load (no internet, blocked CDN), the app runs fully in offline mode using localStorage. All sync functions check `if (!dbRef)` before attempting cloud operations. The sync status bar shows "Offline mode — data saved in browser."

---

## Program Structure

### Full Body — Same Workout 3x/Week
Based on Jeremy Ethier's "The ONLY Workout You Need For 2026" routine. All 3 days (Mon/Wed/Fri) share the same `FULL_BODY_EXERCISES` array:

| # | Exercise | Sets × Reps | Equipment | Input Type |
|---|----------|-------------|-----------|------------|
| 1 | Low Incline Dumbbell Press | 3×10-15 | Dumbbells + bench (2 notches) | weighted |
| 2 | Goblet Squat | 3×10-15 | Dumbbell | weighted |
| 3 | Inverted Rows | 3×8-15 | Bar at waist height (or pull-up bar lowered) | bodyweight |
| 4 | Dumbbell Romanian Deadlift | 3×10-15 | Dumbbells | weighted |
| 5 | Band Seated Row | 3×10-15 | Resistance band | band |
| 6 | Lateral Raise Superset | 3×10-20 | Dumbbells + bench | weighted |
| 7 | Dead Bug | 3×5/side | Bodyweight | bodyweight |
| 8 | Incline Dumbbell Curls | 3×8-12 | Dumbbells + bench | weighted |
| 9 | Dumbbell Overhead Extension | 3×8-12 | Dumbbell | weighted |

`PROGRAM.A`, `PROGRAM.B`, and `PROGRAM.C` all reference the same `FULL_BODY_EXERCISES` array. Day names are "Monday — Full Body", "Wednesday — Full Body", "Friday — Full Body". Badge is `"full"` for all three.

### Progression
No phases — same sets/reps throughout. Each exercise has a flat `rx` property (e.g., `{sets:3, reps:"10-15", rest:"60s"}`). Progression comes entirely from the adaptive difficulty system: rate each exercise 1-5, and the app suggests weight adjustments for the following week. The program runs for 16 weeks.

### Adaptive Difficulty System (Per-Exercise)
After each exercise, the user rates difficulty 1-5 via inline buttons. Ratings are stored per-exercise in the `difficulty` object (keyed by exercise name). The Exercise Guide tab includes descriptive context for each rating level (what it should feel like physically) along with the adjustment recommendation.

The system uses `getExerciseAdjustment(dayKey, week, exerciseName, baseRx)` to look up the previous week's difficulty rating and actual logged weights/reps, then computes concrete adjustments that are applied directly to the prescription display and weight hint:

- **1 (Too Easy):** Could do 5+ more reps easily → Weight: +10 lbs from last week's max. Reps: slight drop (-2 each bound, floor 5) to accommodate the heavier load.
- **2 (Easy):** 2-3 reps left in the tank → Weight: +5 lbs from last week's max. Reps: **no change** — the small weight increase is the progression.
- **3 (Just Right):** 1-2 reps left, last rep tough but clean → Weight: repeat last week's max. Reps: no change.
- **4 (Hard):** Barely finished, form breaking down → Weight: repeat last week's max. Reps: lower bound drops 2 (floor 5) to reduce volume at the same load.
- **5 (Too Hard):** Couldn't complete all reps → Weight: -10 lbs from last week's max. Reps: drop (-3 lower, -2 upper, floor 5).

**Rep adjustment mechanics** are handled by `adjustReps(baseRx, lowShift, highShift, minRep)`:
- Parses range reps ("12-15") and single reps ("8 each leg") with any suffix
- Applies shifts to lower and upper bounds independently, clamping to `minRep`
- Returns `null` if the shifts produce no actual change (so the original prescription displays)
- Minimum rep floor is 5 across all adjustments — if already at the floor, only weight changes

The adjusted rep count replaces the prescription column display (e.g., "3 x 10-13" instead of "3 x 12-15"). The weight hint replaces the static "Start: X lbs" text with a specific target based on actual logged data (e.g., "▲ Try 35 lbs (+5)").

**Fallback:** Week 1 or exercises without prior data show the static `startWeight` hint during weeks 1-2 and no adjustment hint otherwise.

A day is "complete" when all exercises in that day have been rated. Day tab checkmarks and the Progress tab use `isDayComplete()` to check this.

### Starting Weight Guidelines
Each exercise has a `startWeight` property. During weeks 1-2 (and only when no adaptive adjustment is available), these appear as inline hints (orange "▶ Start: X lbs") in the workout tab so the user doesn't need to flip to the guide. Once adaptive data exists, the specific weight target from `getExerciseAdjustment()` replaces this hint.

### Exercise Input Types
Each exercise has an optional `inputType` field:
- **`"weighted"` (default):** Shows weight (lbs) × reps inputs per set
- **`"bodyweight"`:** Shows a static dash for weight, reps input only (e.g., Dead Bug, Inverted Rows)
- **`"band"`:** Shows weight (lbs) inputs mapped to Bodylastics band system

---

## State Shape

```javascript
{
  currentWeek: 1,          // 1-16
  logs: {
    "W1-A": {              // Key format: W{week}-{day}
      difficulty: {         // Per-exercise ratings (object keyed by exercise name)
        "Low Incline Dumbbell Press": 3,
        "Goblet Squat": 2,
        // ...one entry per exercise
      },
      date: "2026-07-31",
      bodyWeight: 265,      // Optional weigh-in for that session
      sets: {
        "Low Incline Dumbbell Press": [
          { weight: 20, reps: 12 },  // Per-set tracking
          { weight: 20, reps: 12 },
          { weight: 20, reps: 10 }
        ]
      }
    }
  },
  bodyWeight: [             // Historical weigh-in array (sorted by date, deduplicated)
    { date: "2026-05-19", weight: 283.6 },
    // ... 36 seed entries from Apple Health Withings scale export ...
    { date: "2026-06-26", weight: 268.5 }
  ],
  startDate: "2026-06-26"
}
```

**Migration functions** (run on every `loadState` and cloud sync):
- `migrateDifficulty()` — Converts old numeric `difficulty` (single rating per day) to per-exercise object format
- `migrateBodyWeight()` — Merges `SEED_WEIGHTS` (36 historical weigh-ins) into `state.bodyWeight`, deduplicating by date
- `migrateExerciseRenames()` — Renames exercise keys in `sets` and `difficulty` objects across all logs when exercises are swapped out. Also runs one-time purge operations for exercises removed in major program changes. Current migrations:
  - **Renames:** `"Dumbbell Walking Lunges"` → `"Stationary Reverse Lunges"`, `"Goblet Squat (Dumbbell)"` → `"Goblet Squat"`
  - **Home gym purge** (`_homeGymMigrated`): Removes stale data from gym-to-home transitions (past weeks only)
  - **Full body purge** (`_fullBodyMigrated`): Removes all old 3-day-split exercises from past weeks when switching to the new full-body program

---

## UI Structure

### Tabs
1. **Workouts** — Main logging interface with day sub-tabs (Mon/Wed/Fri)
2. **Progress** — Workout count, streak, total weight loss (with % body weight), SVG weight-over-time chart, recent history
3. **Exercise Guide** — Collapsible sections with full form instructions, warm-up/cool-down routines

### Workout Tab Details
- **Week navigation** with prev/next buttons (weeks 1-16)
- **Day sub-tabs** (Mon | Wed | Fri) with checkmarks for completed days
- **Default tab:** On load, `getNextWorkoutDay()` finds the earliest incomplete workout across all active weeks/days and defaults to that day/week
- **Weigh-in input** on every workout day with a dedicated Save button (does not auto-save on change)
- **Prescription column** — Displays the base phase prescription adjusted by `getExerciseAdjustment()` when prior data exists (e.g., "3 x 10-13" instead of static "3 x 12-15")
- **Weight hint** — Below each exercise name, shows either the adaptive weight target (e.g., "▲ Try 35 lbs (+5)") or the static starting weight guide (weeks 1-2 only, when no prior data)
- **Desktop layout:** Table with exercise name, prescription, weight inputs, rep inputs
- **Mobile layout:** Card-based layout with set-by-set inputs (lbs × reps per set)
- **Per-exercise difficulty rating** buttons (1-5) inline with each exercise — clicking a rating only updates the visual highlight via `toggleRatingUI()`, no save or re-render
- Desktop table and mobile cards are toggled via CSS media query at 600px breakpoint

### Save/Edit Workout Flow
All inputs (weights, reps, difficulty ratings, weigh-in) are collected and saved together via a single **"Save Workout"** button at the bottom of the day card:

1. **Editing state:** Inputs are editable, difficulty buttons are clickable, "Save Workout" button is shown
2. **Save:** `saveAllSets(logKey, dayKey)` collects all visible input values (using `data-ex`, `data-set`, `data-field` attributes) and difficulty ratings (using `data-rating-ex`, `data-rating` attributes), writes to `state.logs`, calls `saveState()`, and re-renders
3. **Locked state:** After saving, all inputs become `readonly` with reduced opacity and `pointer-events: none`. The button changes to **"Edit Workout"**
4. **Unlock:** Clicking "Edit Workout" calls `unlockWorkout()` which sets `state._editing = true` and re-renders with editable inputs

The `_editing` flag is a transient UI state — it's stripped from the state object by `stateForStorage()` before saving to localStorage or Firebase. The `locked` flag in `renderWorkouts()` is derived from `hasSavedSets && !state._editing`.

### Profile Card
- Starting Weight (dynamic — earliest entry in `state.bodyWeight` array) with date subtext
- Current Weight (most recent entry in `state.bodyWeight` array) with date subtext
- Total Weight Loss card with percentage of body weight (negative for loss, positive for gain)
- Current Week

### Action Bar
- Sync Now — manual Firebase push/pull
- Export JSON — downloads state as `.json` file
- Import JSON — restores from a `.json` backup
- Reset All Data — clears state (with confirmation)

---

## Theme: Dark Floral

The app uses a dark mode with a floral color palette defined in CSS `:root` variables:

| Variable | Color | Usage |
|----------|-------|-------|
| `--bg` | `#141018` (deep plum-black) | Page background |
| `--surface` | `#1e1726` (dark eggplant) | Cards, containers |
| `--surface-2` | `#281f32` (lighter plum) | Hover states, nested surfaces |
| `--border` | `#3a2d47` (dusty purple) | All borders |
| `--text` | `#ede6f2` (lavender white) | Primary text |
| `--text-muted` | `#9b8aad` (muted purple) | Secondary text |
| `--accent` | `#e8729a` (rose pink) | Primary action color, active tabs |
| `--green/--sage` | `#8ecfa5` | Success, completed states |
| `--purple` | `#c4a6f5` | Upper body badges |
| `--lavender` | `#b8a1d9` | Muscle tags |
| `--yellow` | `#f0d57a` | Warning states |
| `--red` | `#e06b7a` | Danger, hard difficulty |

Background has subtle fixed radial gradients in rose, lavender, and sage for a soft floral glow. Header has unicode floral ornaments (`❀ ✿ ❀`).

---

## Exercise Data Schema

Each exercise object in the `PROGRAM` constant:

```javascript
{
  name: "Low Incline Dumbbell Press",
  videoStart: 41,                              // Seconds offset into VIDEO_ID video
  muscle: "Chest, Shoulders, Triceps",
  purpose: "How this builds your physique",   // or "Why this builds strength"
  startWeight: "15-20 lb dumbbells",           // Shown when no adaptive data
  inputType: "weighted",                       // "weighted" (default), or "bodyweight"
  rx: { sets: 3, reps: "10-15", rest: "60s" },
  note: "Outcome-focused description",
  guide: "Full form instructions for the Exercise Guide tab"
}
```

**Key design decisions on `note` vs `guide`:**
- `note` — Outcome-only (no form cues). Displayed in the Exercise Guide highlight box under "Why this matters for hiking" or "How this builds your physique" depending on `purpose`.
- `guide` — Full step-by-step form instructions. Only shown in the Exercise Guide tab's collapsible sections.

---

## Exercise Form Videos

All exercises use timestamped links into a single YouTube video: Jeremy Ethier's "The ONLY Workout You Need For 2026" (`VIDEO_ID = "n_YW24F5HGc"`). Each exercise has a `videoStart` property (seconds) instead of individual video IDs.

### How It Works
- In the Exercise Guide tab, `renderGuide()` renders a "Watch Form Video" button when `ex.videoStart != null`.
- Clicking the button calls `toggleVideo(id)`, which shows/hides a responsive 16:9 iframe and swaps button text to "Hide Video".
- The embed URL is `https://www.youtube.com/embed/${VIDEO_ID}?rel=0&start=${ex.videoStart}`.
- Iframes use `loading="lazy"` and `data-src` pattern — the iframe `src` is only set when the user clicks to watch.

### Timestamps
| Exercise | Timestamp | Seconds |
|----------|-----------|---------|
| Low Incline DB Press | 0:41 | 41 |
| Goblet Squat | 2:19 | 139 |
| Pull-Ups | 4:23 | 263 |
| RDL | 5:49 | 349 |
| Band Seated Row | 7:37 | 457 |
| Lateral Raise Superset | 8:55 | 535 |
| Dead Bug / Arms | 10:22 | 622 |

---

## Mobile Optimizations

- **Responsive breakpoint:** 600px
- **Desktop:** Exercise table layout (columns: Exercise, Prescription, Weight, Reps)
- **Mobile:** Card layout with set-by-set inputs (Set 1: lbs × reps, Set 2: lbs × reps, etc.)
- **Keyboard:** All number inputs have `inputmode="decimal"` (weight fields) or `inputmode="numeric"` (rep fields) to force numeric keyboard on mobile
- **CSS toggle:** Desktop table uses `.exercise-table`, mobile cards use `.exercise-cards`. Desktop hides cards with `display: none !important`; mobile media query reverses this.

---

## Backend Evolution (Historical Context)

The sync backend went through three iterations:

1. **localStorage only** — Initial version, no cross-device sync
2. **Google Sheets + Apps Script** — Attempted but failed due to corporate Zscaler proxy blocking cross-origin requests from GitHub Pages to Google Apps Script. Tried JSONP and XHR approaches, both blocked.
3. **Firebase Realtime Database** — Current solution. Works through corporate proxies, provides real-time sync, and has a generous free tier.

The Google Apps Script code (`google_apps_script.js`) was deleted when Firebase was adopted.

---

## Deployment

- **Hosting:** GitHub Pages from the repo's root (main branch)
- **Files:** Just `index.html` and `README.md`
- **Push notes:** The user's work laptop has a corporate security hook that blocks `git push` to non-corporate repos. Pushes need to be done manually via GitHub Desktop or from a personal machine.

---

## Weight Tracking

### Historical Data
36 weigh-ins from the user's Withings Body Smart scale (Apple Health export) are baked into the app as `SEED_WEIGHTS` (May 19 – Jun 26, 2026). These are merged into `state.bodyWeight` on every state load via `migrateBodyWeight()`.

### Weight Chart
The Progress tab includes an inline SVG line chart (`renderWeightChart()`) that:
- Draws a responsive polyline with area fill gradient
- Shows dot markers for each data point
- Auto-scales Y-axis to weight range with 5 gridline ticks
- Shows ~6 evenly-spaced X-axis date labels
- Displays start → current summary and a delta badge (green for loss, red for gain)

### Weigh-in Flow
When the user logs a weigh-in via the Save button on any workout day:
1. Stored in `state.logs[logKey].bodyWeight` (per-session)
2. Also appended to `state.bodyWeight[]` (deduplicated by date)
3. Chart re-renders, weight stats update, syncs to Firebase

---

## Known Constraints

1. **Home gym equipment only** — Bowflex SelectTech 552 dumbbells (5-52.5 lb), adjustable bench, pull-up bar, resistance bands with door anchor. No barbells or machines.
2. **Firebase auth** — Uses anonymous authentication with `auth != null` rules. Single-user personal project.
3. **Single-file architecture** — All ~2,000+ lines live in one HTML file. If the app grows significantly, consider splitting into separate CSS/JS files.
4. **Corporate proxy** — GitHub Pages works fine, but any backend that requires cross-origin requests to Google domains may be blocked by Zscaler on the user's work network.
5. **Weight data source** — Historical weigh-ins were extracted from `/Users/prichardson2/Documents/apple_health_export/export.xml` (Apple Health → Withings scale records). Future imports would need the same XML parsing approach.

### Program Evolution
The workout plan has gone through three major iterations:

1. **Original (Planet Fitness)** — 3-day split (Lower/Upper/Hybrid) using gym machines and cables
2. **Home Gym Transition** — Same 3-day split but swapped all machine/cable exercises for dumbbell + band equivalents
3. **Full Body (Current)** — Complete rewrite to Jeremy Ethier's full-body routine. All 3 days share the same 9 exercises. Old exercises purged via `_fullBodyMigrated` flag in `migrateExerciseRenames()`.

When changing exercises, add entries to `renames` (for same-movement swaps where data should carry over) or to `fullBodyPurge` (for completely different exercises where old data is irrelevant).

### Bodylastics Band System
Band exercises use `inputType: "band"` and are tracked by the band's max lb rating. The `BODYLASTICS_BANDS` constant defines all available single-band and stacked-band combinations (10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 170 lbs).

The adaptive difficulty system (`getExerciseAdjustment`) uses `getBandAtOrAbove()`, `getBandAtOrBelow()`, and `getBandNearest()` helpers to snap weight suggestions to available band combos instead of arbitrary lb increments. Messages display band labels (e.g., "Try 50 lb band" or "Jump to 20+50 lb bands") instead of generic "+5 lbs" hints.

**Working resistance** at typical exercise stretch is ~50-70% of the band's max rating. The Exercise Guide tab includes a Bodylastics Band Reference table showing max vs. working resistance and recommended exercises for each band.

---

## File Map

```
Workout-Plan/
├── index.html                     # The entire application (HTML + CSS + JS)
├── README.md                      # Public-facing readme
├── HANDOFF.md                     # This file
├── home_gym_shopping_list.py      # Script that generates the home gym shopping list Excel
└── Home_Gym_Shopping_List.xlsx    # Generated shopping list with prices and equipment map
```
