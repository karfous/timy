// @vitest-environment jsdom
import React, { act } from 'react';
import ReactDOM from 'react-dom/client';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  buildTimerPhases,
  computeTimerSnapshot,
  getTotalTimerDurationSec,
} from '../utils/timerEngine';
import {
  DEFAULT_TIMERS,
  parseDefaultTimerModules,
  loadTimers,
  saveTimers,
  loadActivePalette,
  saveActivePalette,
  addHistoryEntry,
  computeWorkoutStats,
  serializeTimersForExport,
  parseImportedTimersJson,
} from '../services/storage';
import { WorkoutTimerConfig, SimpleTimerConfig } from '../types/timer';
import { parseScreenFromHash } from '../components/Screen';
import { Card } from '../components/Card';
import { Heading } from '../components/Heading';
import { TagChip, TagList, TagFilterBar } from '../components/Tags';
import { TimerInfo, formatTimerInfoString } from '../components/TimerInfo';
import { App } from '../App';

describe('Timer Phase & 5-Second Countdown Engine', () => {
  it('builds phases for a workout timer with prep, work, and break on every lap', () => {
    const workout: WorkoutTimerConfig = {
      id: 'w1',
      name: 'HIIT 3x',
      kind: 'workout',
      laps: 3,
      workSec: 20,
      breakSec: 10,
      prepSec: 5,
      createdAt: 1000,
    };

    const phases = buildTimerPhases(workout);
    // 1 prep + 3 * (work + break) = 7 phases
    expect(phases).toHaveLength(7);
    expect(phases[0].type).toBe('prep');
    expect(phases[0].durationSec).toBe(5);
    expect(phases[1].type).toBe('work');
    expect(phases[2].type).toBe('break');
    expect(getTotalTimerDurationSec(workout)).toBe(5 + 3 * (20 + 10));
  });

  it('triggers last-5-seconds countdown flag (5, 4, 3, 2, 1) in every round', () => {
    const workout: WorkoutTimerConfig = {
      id: 'w2',
      name: 'Two Laps',
      kind: 'workout',
      laps: 2,
      workSec: 10,
      breakSec: 8,
      prepSec: 5,
      createdAt: 1000,
    };
    const phases = buildTimerPhases(workout);

    // Every phase in the workout should hit 5, 4, 3, 2, 1 seconds remaining
    for (const phase of phases) {
      for (const secLeft of [5, 4, 3, 2, 1]) {
        const testTime = phase.endSec - secLeft + 0.1;
        const snap = computeTimerSnapshot(phases, testTime);
        expect(snap.currentPhaseIndex).toBe(phase.index);
        expect(snap.phaseRemainingCeilSec).toBe(secLeft);
        expect(snap.isLastFiveSeconds).toBe(true);
      }
    }
  });

  it('handles simple countdown timer accurately', () => {
    const simple: SimpleTimerConfig = {
      id: 's1',
      name: '1 Min Hold',
      kind: 'simple',
      durationSec: 60,
      prepSec: 0,
      createdAt: 1000,
    };

    const phases = buildTimerPhases(simple);
    expect(phases).toHaveLength(1);
    const snapMid = computeTimerSnapshot(phases, 30);
    expect(snapMid.phaseRemainingCeilSec).toBe(30);
    expect(snapMid.isLastFiveSeconds).toBe(false);

    const snapFinal = computeTimerSnapshot(phases, 55.2);
    expect(snapFinal.phaseRemainingCeilSec).toBe(5);
    expect(snapFinal.isLastFiveSeconds).toBe(true);
  });

  it('builds laps and rounds with short breaks between rounds and long breaks between laps', () => {
    const workout: WorkoutTimerConfig = {
      id: 'w-laps-rounds',
      name: '3 Laps × 5 Rounds',
      kind: 'workout',
      laps: 3,
      rounds: 5,
      workSec: 30,
      breakSec: 10,
      longBreakSec: 60,
      prepSec: 5,
      tags: ['hiit', 'endurance'],
      createdAt: 1000,
    };

    const phases = buildTimerPhases(workout);
    // 1 prep + 3 laps * (5 work + 4 short breaks) + 2 long breaks between laps = 1 + 27 + 2 = 30 phases
    expect(phases).toHaveLength(30);

    const workPhases = phases.filter((p) => p.type === 'work');
    const shortBreakPhases = phases.filter(
      (p) => p.type === 'break' && !p.isLongBreak
    );
    const longBreakPhases = phases.filter(
      (p) => p.type === 'break' && p.isLongBreak
    );

    expect(workPhases).toHaveLength(15); // 3 * 5
    expect(shortBreakPhases).toHaveLength(12); // 3 * 4
    expect(longBreakPhases).toHaveLength(2); // 3 - 1
    expect(longBreakPhases[0].durationSec).toBe(60);
    expect(getTotalTimerDurationSec(workout)).toBe(
      5 + 3 * (5 * 30 + 4 * 10) + 2 * 60
    );
  });
});

describe('Storage, Palettes, History & JSON Import/Export', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('saves and restores custom timers in localStorage', () => {
    const custom: SimpleTimerConfig = {
      id: 'custom-1',
      name: 'Custom 90s',
      kind: 'simple',
      durationSec: 90,
      prepSec: 5,
      createdAt: 12345,
    };
    saveTimers([custom]);
    const loaded = loadTimers();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].name).toBe('Custom 90s');
  });

  it('saves and restores custom color palette in localStorage', () => {
    const palette = {
      id: 'my-theme',
      name: 'Cyber Dark',
      isCustom: true,
      bgPrimary: '#050508',
      bgSurface: '#101018',
      textPrimary: '#ffffff',
      textMuted: '#888899',
      accentPrimary: '#00ffcc',
      accentBreak: '#ff00aa',
      accentWarn: '#ffcc00',
    };
    saveActivePalette(palette);
    const loaded = loadActivePalette();
    expect(loaded.id).toBe('my-theme');
    expect(loaded.accentPrimary).toBe('#00ffcc');
  });

  it('records workout history and computes stats', () => {
    addHistoryEntry({
      timerId: 't1',
      timerName: 'Tabata',
      kind: 'workout',
      completedAt: Date.now(),
      totalElapsedSec: 240,
      lapsCompleted: 8,
      totalLaps: 8,
      completedFully: true,
    });
    const history = addHistoryEntry({
      timerId: 't2',
      timerName: 'Plank',
      kind: 'simple',
      completedAt: Date.now(),
      totalElapsedSec: 60,
      lapsCompleted: 1,
      totalLaps: 1,
      completedFully: true,
    });

    const stats = computeWorkoutStats(history);
    expect(stats.totalRuns).toBe(2);
    expect(stats.completedRuns).toBe(2);
    expect(stats.totalActiveSec).toBe(300);
    expect(stats.totalLapsCompleted).toBe(9);
  });

  it('exports and re-imports timer definitions via JSON', () => {
    const timers = loadTimers();
    const json = serializeTimersForExport(timers);
    const reimported = parseImportedTimersJson(json);
    expect(reimported.length).toBe(timers.length);
    expect(reimported[0].name).toBe(timers[0].name);
  });

  it('loads default timers from src/defaultTimers/*.json and supports adding new JSON files', () => {
    expect(DEFAULT_TIMERS.length).toBeGreaterThanOrEqual(4);
    expect(DEFAULT_TIMERS.map((t) => t.id)).toEqual(
      expect.arrayContaining([
        'preset-tabata',
        'preset-boxing',
        'preset-emom',
        'preset-plank',
      ])
    );

    const parsedNew = parseDefaultTimerModules({
      '../defaultTimers/stretching.json': {
        default: {
          name: 'Morning Mobility',
          kind: 'simple',
          durationSec: 180,
        },
      },
    });
    expect(parsedNew).toHaveLength(1);
    expect(parsedNew[0].id).toBe('preset-stretching');
    expect(parsedNew[0].name).toBe('Morning Mobility');
    expect(parsedNew[0].prepSec).toBe(5);
  });
});

describe('Screen Routing, Mobile Hamburger Overlay & Workout Screen Lock', () => {
  beforeEach(() => {
    (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
    window.localStorage.clear();
    window.location.hash = '#/timers';
    document.documentElement.classList.remove('workout-screen-locked');
    document.body.classList.remove('workout-screen-locked');
  });

  it('parses valid screen routes from hash and falls back to timers', () => {
    expect(parseScreenFromHash('#/timers')).toBe('timers');
    expect(parseScreenFromHash('#/workout')).toBe('workout');
    expect(parseScreenFromHash('#/stats')).toBe('stats');
    expect(parseScreenFromHash('#/palette')).toBe('palette');
    expect(parseScreenFromHash('#/unknown')).toBe('timers');
    expect(parseScreenFromHash('')).toBe('timers');
  });

  it('shows only timers on Timers screen, switches to non-scrollable Workout screen on timer selection, and toggles Hamburger/X overlay menu', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = ReactDOM.createRoot(container);

    act(() => {
      root.render(React.createElement(App));
    });

    // Initially on Timers screen: shows Saved Timers, no Workout runner rendered
    expect(container.querySelector('[data-screen="timers"]')).not.toBeNull();
    expect(container.querySelector('[data-screen="workout"]')).toBeNull();
    expect(document.body.classList.contains('workout-screen-locked')).toBe(false);

    // Click a timer card to choose it -> switches to Workout screen with locked viewport
    const firstPresetCard = container.querySelector('.preset-card') as HTMLElement;
    expect(firstPresetCard).not.toBeNull();

    act(() => {
      firstPresetCard.click();
    });

    expect(window.location.hash).toBe('#/workout');
    expect(container.querySelector('[data-screen="workout"]')).not.toBeNull();
    expect(container.querySelector('[data-screen="timers"]')).toBeNull();
    expect(document.body.classList.contains('workout-screen-locked')).toBe(true);
    expect(
      container.querySelector('.app-shell')?.classList.contains('app-shell-locked')
    ).toBe(true);

    // On Workout screen: no TIMY top-bar or hamburger menu, no card, no circular SVG, no control buttons, no tags
    expect(container.querySelector('.top-bar')).toBeNull();
    expect(container.querySelector('.runner-card')).toBeNull();
    expect(container.querySelector('.runner-svg')).toBeNull();
    expect(container.querySelector('.control-btn')).toBeNull();
    expect(container.querySelector('.tag-chip')).toBeNull();

    // Only closing X button in top-right corner, L x/y in bottom-left, R x/y in bottom-right, slim progress column & rotated times in digits section
    const closeWorkoutBtn = container.querySelector(
      '.workout-close-x-btn'
    ) as HTMLButtonElement;
    expect(closeWorkoutBtn).not.toBeNull();
    expect(
      container.querySelector('.workout-corner-left')?.textContent
    ).toMatch(/^L \d+\/\d+$/);
    expect(
      container.querySelector('.workout-corner-right')?.textContent
    ).toMatch(/^R \d+\/\d+$/);
    expect(
      container.querySelector('.workout-digits-section .workout-progress-column')
    ).not.toBeNull();
    expect(
      container.querySelector('.workout-digits-section .workout-rotated-times')
    ).not.toBeNull();

    // Paused info (name & rounds/breaks) visible when not running, hidden when digits are tapped to start
    const pausedInfo = container.querySelector('.workout-paused-info') as HTMLElement;
    const digitsBtn = container.querySelector('.workout-digits-touch') as HTMLButtonElement;
    expect(pausedInfo.classList.contains('is-running-hidden')).toBe(false);

    act(() => {
      digitsBtn.click();
    });
    expect(pausedInfo.classList.contains('is-running-hidden')).toBe(true);

    act(() => {
      digitsBtn.click();
    });
    expect(pausedInfo.classList.contains('is-running-hidden')).toBe(false);

    // Clicking top-right X button closes Workout screen back to Timers screen
    act(() => {
      closeWorkoutBtn.click();
    });
    expect(window.location.hash).toBe('#/timers');
    expect(container.querySelector('[data-screen="timers"]')).not.toBeNull();

    // Click Hamburger button -> opens overlay with 3 options (Timers, Stats, Palette) and switches button to X state
    const hamburgerBtn = container.querySelector('.hamburger-btn') as HTMLButtonElement;
    expect(hamburgerBtn.classList.contains('is-open')).toBe(false);
    expect(container.querySelector('.mobile-menu-overlay')).toBeNull();

    act(() => {
      hamburgerBtn.click();
    });

    expect(hamburgerBtn.classList.contains('is-open')).toBe(true);
    expect(hamburgerBtn.getAttribute('aria-label')).toContain('Close');
    const overlayItems = Array.from(
      container.querySelectorAll('.mobile-menu-item')
    ).map((el) => el.textContent?.trim());
    expect(overlayItems).toHaveLength(3);
    expect(overlayItems[0]).toBe('Timers');
    expect(overlayItems[1]).toContain('Stats');
    expect(overlayItems[2]).toBe('Palette');

    // Click Palette in overlay -> switches to Palette screen, closes overlay, unlocks viewport
    const paletteItem = container.querySelectorAll(
      '.mobile-menu-item'
    )[2] as HTMLButtonElement;
    act(() => {
      paletteItem.click();
    });

    expect(window.location.hash).toBe('#/palette');
    expect(container.querySelector('[data-screen="palette"]')).not.toBeNull();
    expect(container.querySelector('.mobile-menu-overlay')).toBeNull();
    expect(document.body.classList.contains('workout-screen-locked')).toBe(false);

    act(() => {
      root.unmount();
    });
    container.remove();
  });
});

describe('Reusable UI Components: Card, Heading, Tags, and TimerInfo', () => {
  it('formats workout and simple timers in "L3 | R4 | W20 | BR 10(60)" format', () => {
    const workout: WorkoutTimerConfig = {
      id: 'w-info',
      name: 'HIIT',
      kind: 'workout',
      laps: 3,
      rounds: 4,
      workSec: 20,
      breakSec: 10,
      longBreakSec: 60,
      createdAt: 1000,
    };
    expect(formatTimerInfoString(workout)).toBe('L3 | R4 | W20 | BR 10(60)');

    const container = document.createElement('div');
    const root = ReactDOM.createRoot(container);
    act(() => {
      root.render(React.createElement(TimerInfo, { timer: workout }));
    });
    expect(container.textContent).toBe('L3 | R4 | W20 | BR 10(60)');

    act(() => {
      root.unmount();
    });
  });

  it('renders Card component in desktop and mobile states and Heading / Tags components', () => {
    const container = document.createElement('div');
    const root = ReactDOM.createRoot(container);

    act(() => {
      root.render(
        React.createElement(
          'div',
          null,
          React.createElement(
            Card,
            { state: 'desktop', variant: 'item', selected: true },
            React.createElement(Heading, {
              title: 'Desktop Card Title',
              subtitle: 'Subtitle text',
            }),
            React.createElement(TagList, {
              tags: ['hiit', 'cardio'],
              selectedTags: ['hiit'],
            })
          ),
          React.createElement(
            Card,
            { state: 'mobile', variant: 'surface' },
            React.createElement(TagChip, { tag: 'boxing', active: true }),
            React.createElement(TagFilterBar, {
              allTags: ['hiit', 'boxing'],
              selectedTags: ['boxing'],
              totalCount: 4,
              onToggleTag: () => {},
              onClearTags: () => {},
            })
          )
        )
      );
    });

    const cards = container.querySelectorAll('.ui-card');
    expect(cards).toHaveLength(2);
    expect(cards[0].getAttribute('data-card-state')).toBe('desktop');
    expect(cards[0].classList.contains('ui-card--desktop')).toBe(true);
    expect(cards[0].classList.contains('ui-card--selected')).toBe(true);

    expect(cards[1].getAttribute('data-card-state')).toBe('mobile');
    expect(cards[1].classList.contains('ui-card--mobile')).toBe(true);

    expect(container.querySelector('.ui-heading-title')?.textContent).toContain(
      'Desktop Card Title'
    );
    expect(container.querySelectorAll('.tag-chip').length).toBeGreaterThanOrEqual(3);

    act(() => {
      root.unmount();
    });
  });
});



