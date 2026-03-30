# UCSD Fitness Planner App

A Vercel-ready Next.js + TypeScript dashboard that combines:

- Gym occupancy and best-time-to-go data from your GitHub scraper repo
- Editable meal planning seeded from your uploaded spreadsheet
- Editable nighttime weightlifting workout plan
- Weekly drag-and-drop calendar with notes and checkboxes
- Browser-local persistence using `localStorage`

## Pages

- `/` Home dashboard
- `/meal-plan`
- `/workout-plan`
- `/weekly-calendar`

## 1. Install

```bash
npm install
```

## 2. Run locally

```bash
npm run dev
```

## 3. Deploy to Vercel

Import this folder as a Vercel project.

## 4. Configure live gym data source

Set this environment variable in Vercel:

```bash
NEXT_PUBLIC_GYM_DATA_BASE_URL=https://aarond67.github.io/ucsd-gym-tracker
```

That should point to the GitHub Pages site that serves:

- `best_time_today.txt`
- `ucsd_occupancy_history.csv`
- `best_times_summary.csv`
- chart PNG files

## Notes

- Meal, workout, and calendar edits are saved locally in the browser.
- This means your changes persist in Chrome on that device, but they are not written back into GitHub.
- The app uses native drag-and-drop for the weekly calendar to keep the setup light.
