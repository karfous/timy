# Pulse — Minimalistic Workout Timer PWA

A clean, thin, modern, dark-mode-first **Workout & Interval Timer** built with **React + TypeScript + Vite**, designed to work completely offline as a **Progressive Web App (PWA)** and deploy seamlessly to **GitHub Pages**.

## Features

- **Minimalist Dark UI & Custom Palette Editor**:
  - Default dark theme (`Obsidian Dark`) plus built-in themes and a live **Color Palette Editor** saved to `localStorage`.
- **Two Concentric Circular Time Dials + Direct Numeric Input**:
  - Drag the **outer ring** for **Minutes (`0–60`)** and the **inner ring** for **Seconds (`0–59`)**, or type numbers directly in the center (`MM:SS` or total seconds).
- **Simple & Workout Interval Timers**:
  - Define **Simple Countdown Timers** or **Workout Interval Timers** with configurable **Number of Laps**, **Working Time**, **Break Time**, and optional **Prepare Countdown**.
- **5-Second Countdown Beeps in Every Round**:
  - Synthesized Web Audio API beeps play during the final **5 seconds (`5, 4, 3, 2, 1`)** of every round/phase before transitioning, plus distinct start/break/completion chimes.
- **`localStorage` Persistence**:
  - Automatically saves your custom color palettes, timer definitions, active timer selection, and workout run history/statistics across page refreshes.
- **Export & Import JSON**:
  - Export your timer definitions to a `.json` file (or clipboard) and import timer definitions anytime.
- **Offline PWA & GitHub Pages Ready**:
  - Configured with `vite-plugin-pwa` (Service Worker precaching + Web App Manifest) and relative asset paths (`base: './'`) plus `.github/workflows/deploy.yml`.

## Scripts

```bash
# Start local development server
npm run dev

# Run unit tests
npm test

# Build production offline PWA bundle into dist/
npm run build

# Preview production build locally
npm run preview
```
