// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import {
  buildTimerPhases,
  computeTimerSnapshot,
  getTotalTimerDurationSec,
} from '../utils/timerEngine';
import {
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
});

