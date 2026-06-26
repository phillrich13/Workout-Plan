# Strength Training Plan

Interactive 16-week strength training program with adaptive progression, built as a single-page HTML app.

**Live dashboard:** [https://phillrich13.github.io/Workout-Plan/](https://phillrich13.github.io/Workout-Plan/)

## Features

- **16-week progressive program** across 4 phases (Foundation → Building → Strength → Performance)
- **3 training days/week** — Lower Body + Core, Upper Body Push/Pull, Hybrid day
- **Adaptive difficulty** — rate each workout 1-5, get adjustment recommendations for the following week
- **Google Sheets sync** — workout data syncs across all devices via a Google Sheets backend
- **Offline capable** — falls back to browser localStorage when offline
- **Planet Fitness compatible** — machines, dumbbells, Smith machine, cables only
- **Exercise guide** with form instructions, warm-up, and cool-down routines

## Google Sheets Sync Setup

1. Open your [Google Sheet](https://docs.google.com/spreadsheets/d/1ofvUHiTohMHF8hlf3KV4eu8t1ei0NAstAPpiP9QbQ9E/edit)
2. Go to **Extensions > Apps Script**
3. Delete any existing code and paste the contents of `google_apps_script.js`
4. Click **Deploy > New deployment > Web app**
5. Set "Execute as" = **Me**, "Who has access" = **Anyone**
6. Copy the Web App URL
7. Open the dashboard, expand "Google Sheets Setup" at the bottom, paste the URL, and click **Save & Connect**

## Local Development

Just open `index.html` in any browser. No build step or server required.
