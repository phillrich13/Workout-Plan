# Workout Plan — Agent Handoff Document

## Project Overview

A self-contained, single-file HTML strength training dashboard for a user returning to lifting after 15 years. The app is a 16-week progressive program with adaptive difficulty, cross-device sync via Firebase, and full offline capability. It's hosted on GitHub Pages and designed to be used primarily on mobile at the gym.

**Live URL:** https://phillrich13.github.io/Workout-Plan/
**Repo:** https://github.com/phillrich13/Workout-Plan
**Primary file:** `index.html` (single-file app — all HTML, CSS, and JS in one file)

---

## User Profile

- **Height:** 5'10", **Starting Weight:** 268.5 lbs
- **Current activity:** Walking 3-4 mi 5x/week, hiking 4-8 mi on Saturdays
- **Gym access:** Planet Fitness (Smith machines, cables, dumbbells, machines — no free barbells/squat racks)
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
- **Auth:** None (public read/write rules — this is a personal project)
- **SDK:** Firebase compat v9.23.0 via CDN

### Offline Resilience
Firebase initialization is wrapped in a try/catch. If the SDK scripts fail to load (no internet, blocked CDN), the app runs fully in offline mode using localStorage. All sync functions check `if (!dbRef)` before attempting cloud operations. The sync status bar shows "Offline mode — data saved in browser."

---

## Program Structure

### Three Training Days
| Key | Day | Focus | Badge |
|-----|-----|-------|-------|
| `A` | Monday | Lower Body + Core | `lower` (sage) |
| `B` | Wednesday | Upper Body Push + Pull | `upper` (purple) |
| `C` | Friday | Lower Power + Upper Accessories | `full` (rose) |

### Four Phases (4 weeks each)
| Phase | Weeks | Sets | Reps | Rest |
|-------|-------|------|------|------|
| Foundation | 1-4 | 2-3 | 12-15 | 45-60s |
| Building | 5-8 | 3 | 10-12 | 60-75s |
| Strength | 9-12 | 3-4 | 8-10 | 75-90s |
| Performance | 13-16 | 3-4 | 6-8 | 90s |

### Adaptive Difficulty System (Per-Exercise)
After each exercise, the user rates difficulty 1-5 via inline buttons. Ratings are stored per-exercise in the `difficulty` object (keyed by exercise name). The app displays per-exercise adjustment recommendations the following week:
- **1 (Too Easy):** Increase weight 5-10 lbs
- **2 (Moderate):** Small increase (+2.5-5 lbs)
- **3 (Just Right):** Repeat same weight/reps
- **4 (Hard):** Same weight, fewer reps
- **5 (Too Hard):** Reduce weight 5-10 lbs

A day is "complete" when all exercises in that day have been rated. Day tab checkmarks and the Progress tab use `isDayComplete()` to check this.

### Starting Weight Guidelines
Each exercise has a `startWeight` property. During weeks 1-2, these appear as inline hints (orange "▶ Start: X lbs") in the workout tab so the user doesn't need to flip to the guide.

### Exercise Input Types
Each exercise has an optional `inputType` field:
- **`"weighted"` (default):** Shows weight (lbs) × reps inputs per set
- **`"timed"`:** Shows a static dash for weight, seconds input for duration (e.g., Plank Hold)
- **`"bodyweight"`:** Shows a static dash for weight, reps input only (e.g., Dead Bug)

---

## State Shape

```javascript
{
  currentWeek: 1,          // 1-16
  logs: {
    "W1-A": {              // Key format: W{week}-{day}
      difficulty: {         // Per-exercise ratings (object keyed by exercise name)
        "Goblet Squat (Dumbbell)": 3,
        "Smith Machine Romanian Deadlift": 2,
        // ...one entry per exercise
      },
      date: "2026-06-26",
      bodyWeight: 268,      // Optional weigh-in for that session
      sets: {
        "Goblet Squat (Dumbbell)": [
          { weight: 25, reps: 12 },  // Per-set tracking
          { weight: 25, reps: 12 },
          { weight: 25, reps: 10 }
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

---

## UI Structure

### Tabs
1. **Workouts** — Main logging interface with day sub-tabs (Mon/Wed/Fri)
2. **Progress** — Workout count, streak, total weight loss (with % body weight), phase progression bars, SVG weight-over-time chart, recent history
3. **Exercise Guide** — Collapsible sections with full form instructions, warm-up/cool-down routines

### Workout Tab Details
- **Week navigation** with prev/next buttons (weeks 1-16)
- **Day sub-tabs** (Mon | Wed | Fri) with checkmarks for completed days
- **Weigh-in input** on every workout day
- **Desktop layout:** Table with exercise name, prescription, weight inputs, rep inputs
- **Mobile layout:** Card-based layout with set-by-set inputs (lbs × reps per set)
- **Per-exercise difficulty rating** buttons (1-5) inline with each exercise, with per-exercise adjustment hints
- Desktop table and mobile cards are toggled via CSS media query at 600px breakpoint

### Profile Card
- Starting Weight (dynamic — earliest entry in `state.bodyWeight` array)
- Current Weight (most recent entry in `state.bodyWeight` array)
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
  name: "Smith Machine Bench Press",
  muscle: "Chest, Front Delts, Triceps",
  purpose: "How this builds your physique",   // or "Why this matters for hiking"
  startWeight: "Bar only or +10-20 lbs",      // Shown weeks 1-2 only
  inputType: "weighted",                       // "weighted" (default), "timed", or "bodyweight"
  phases: {
    1: { sets: 3, reps: "12-15", rest: "60s" },
    2: { sets: 3, reps: "10-12", rest: "75s" },
    3: { sets: 4, reps: "8-10",  rest: "90s" },
    4: { sets: 4, reps: "6-8",   rest: "90s" }
  },
  note: "Outcome-focused description (hiking benefit or physique result)",
  guide: "Full form instructions for the Exercise Guide tab"
}
```

**Key design decisions on `note` vs `guide`:**
- `note` — Outcome-only (no form cues). Displayed in the Exercise Guide highlight box under "Why this matters for hiking" or "How this builds your physique" depending on `purpose`.
- `guide` — Full step-by-step form instructions. Only shown in the Exercise Guide tab's collapsible sections.

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

1. **Planet Fitness equipment only** — No barbells, no squat racks, no power racks. Program uses Smith machines, cables, dumbbells, and plate-loaded machines only.
2. **Firebase auth is open** — The database has public read/write rules. Acceptable for a single-user personal project but would need auth if shared.
3. **Single-file architecture** — All ~1,790 lines live in one HTML file. If the app grows significantly, consider splitting into separate CSS/JS files.
4. **Corporate proxy** — GitHub Pages works fine, but any backend that requires cross-origin requests to Google domains may be blocked by Zscaler on the user's work network.
5. **Weight data source** — Historical weigh-ins were extracted from `/Users/prichardson2/Documents/apple_health_export/export.xml` (Apple Health → Withings scale records). Future imports would need the same XML parsing approach.

---

## File Map

```
Workout-Plan/
├── index.html      # The entire application (HTML + CSS + JS)
├── README.md       # Public-facing readme
└── HANDOFF.md      # This file
```
