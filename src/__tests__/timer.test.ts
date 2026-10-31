// @vitest-environment jsdom
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

