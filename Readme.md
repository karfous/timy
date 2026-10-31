# Timy — Minimal Workout & Interval Timer

A minimalistic, offline-capable Progressive Web App (PWA) timer for workouts and intervals, built with React, TypeScript, and Vite.

**Live Demo:** https://karfous.github.io/timy/

## Features

- **Minimalist Dark UI & Custom Themes:** Clean, high-contrast dark theme by default with a built-in palette editor and saved custom themes.
- **Circular Dial & Direct Numeric Input:** Set durations by dragging the interactive circular dial or typing numbers directly.
- **Simple & Interval Workout Timers:** Configure single countdown timers or multi-lap workout timers with custom work and break intervals.
- **Audio Cues:** Synthesized Web Audio API countdown beeps during the last 5 seconds before each round transition.
- **Offline & LocalStorage Persistence:** Automatically persists saved timers, custom color palettes, and workout history/stats locally, and works completely offline as an installable PWA.
- **Import / Export:** Backup and share timer definitions via JSON.

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run unit tests
npm test

# Build for production
npm run build
```

## Deployment

Pushes to the `main` branch automatically build and deploy to GitHub Pages via [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).
