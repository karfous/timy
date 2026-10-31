import { TimerDefinition, TimerPhase, TimerSnapshot } from '../types/timer';

/**
 * Builds the sequential list of phases for a Simple or Workout timer.
 * Every round has clear start/end second boundaries so the engine can
 * trigger 5-second warning beeps (5, 4, 3, 2, 1) before each transition.
 */
export function buildTimerPhases(timer: TimerDefinition): TimerPhase[] {
  const phases: TimerPhase[] = [];
  let cursorSec = 0;

  const prepSec = Math.max(0, Math.floor(timer.prepSec ?? 0));

  if (timer.kind === 'simple') {
    const totalLaps = 1;
    const totalRounds = 1;
    if (prepSec > 0) {
      phases.push({
        index: phases.length,
        type: 'prep',
        label: 'Prepare',
        durationSec: prepSec,
        startSec: cursorSec,
        endSec: cursorSec + prepSec,
        lap: 1,
        totalLaps,
        round: 1,
        totalRounds,
      });
      cursorSec += prepSec;
    }

    const duration = Math.max(1, Math.floor(timer.durationSec));
    phases.push({
      index: phases.length,
      type: 'simple',
      label: 'Countdown',
      durationSec: duration,
      startSec: cursorSec,
      endSec: cursorSec + duration,
      lap: 1,
      totalLaps,
      round: 1,
      totalRounds,
    });
    return phases;
  }

  // Workout timer
  const totalLaps = Math.max(1, Math.floor(timer.laps));
  const totalRounds = Math.max(1, Math.floor(timer.rounds ?? 1));
  const workSec = Math.max(1, Math.floor(timer.workSec));
  const breakSec = Math.max(0, Math.floor(timer.breakSec));
  const hasRoundsOrLongBreak =
    timer.rounds !== undefined || timer.longBreakSec !== undefined;
  const longBreakSec = Math.max(0, Math.floor(timer.longBreakSec ?? 0));

  if (prepSec > 0) {
    phases.push({
      index: phases.length,
      type: 'prep',
      label: 'Get Ready',
      durationSec: prepSec,
      startSec: cursorSec,
      endSec: cursorSec + prepSec,
      lap: 1,
      totalLaps,
      round: 1,
      totalRounds,
    });
    cursorSec += prepSec;
  }

  if (!hasRoundsOrLongBreak) {
    // Legacy single-level workout timer (laps only)
    for (let lap = 1; lap <= totalLaps; lap++) {
      phases.push({
        index: phases.length,
        type: 'work',
        label: `Work · Round ${lap}`,
        durationSec: workSec,
        startSec: cursorSec,
        endSec: cursorSec + workSec,
        lap,
        totalLaps,
        round: 1,
        totalRounds: 1,
      });
      cursorSec += workSec;

      if (breakSec > 0) {
        phases.push({
          index: phases.length,
          type: 'break',
          label: `Break · Round ${lap}`,
          durationSec: breakSec,
          startSec: cursorSec,
          endSec: cursorSec + breakSec,
          lap,
          totalLaps,
          round: 1,
          totalRounds: 1,
          isLongBreak: false,
        });
        cursorSec += breakSec;
      }
    }
    return phases;
  }

  // Multi-round per lap workout timer:
  // - Short break (`breakSec`) between rounds within a lap
  // - Long break (`longBreakSec`) between laps
  for (let lap = 1; lap <= totalLaps; lap++) {
    for (let round = 1; round <= totalRounds; round++) {
      const workLabel =
        totalLaps > 1
          ? `Work · Lap ${lap}/${totalLaps} · Round ${round}/${totalRounds}`
          : `Work · Round ${round}/${totalRounds}`;

      phases.push({
        index: phases.length,
        type: 'work',
        label: workLabel,
        durationSec: workSec,
        startSec: cursorSec,
        endSec: cursorSec + workSec,
        lap,
        totalLaps,
        round,
        totalRounds,
      });
      cursorSec += workSec;

      // Short break between rounds within the same lap
      if (round < totalRounds && breakSec > 0) {
        const shortBreakLabel =
          totalLaps > 1
            ? `Short Break · Lap ${lap} · Round ${round}`
            : `Short Break · Round ${round}`;
        phases.push({
          index: phases.length,
          type: 'break',
          label: shortBreakLabel,
          durationSec: breakSec,
          startSec: cursorSec,
          endSec: cursorSec + breakSec,
          lap,
          totalLaps,
          round,
          totalRounds,
          isLongBreak: false,
        });
        cursorSec += breakSec;
      }
    }

    // Long break between laps
    if (lap < totalLaps && longBreakSec > 0) {
      phases.push({
        index: phases.length,
        type: 'break',
        label: `Long Break · After Lap ${lap}`,
        durationSec: longBreakSec,
        startSec: cursorSec,
        endSec: cursorSec + longBreakSec,
        lap,
        totalLaps,
        round: totalRounds,
        totalRounds,
        isLongBreak: true,
      });
      cursorSec += longBreakSec;
    }
  }

  return phases;
}

export function getTotalTimerDurationSec(timer: TimerDefinition): number {
  const phases = buildTimerPhases(timer);
  return phases.length > 0 ? phases[phases.length - 1].endSec : 0;
}

/**
 * Computes an exact, drift-free snapshot of the timer at `elapsedSec` (can be fractional).
 */
export function computeTimerSnapshot(
  phases: TimerPhase[],
  elapsedSec: number
): TimerSnapshot {
  if (phases.length === 0) {
    const fallbackPhase: TimerPhase = {
      index: 0,
      type: 'simple',
      label: 'Timer',
      durationSec: 1,
      startSec: 0,
      endSec: 1,
      lap: 1,
      totalLaps: 1,
      round: 1,
      totalRounds: 1,
    };
    return {
      isComplete: true,
      totalDurationSec: 0,
      totalElapsedSec: 0,
      totalRemainingSec: 0,
      currentPhaseIndex: 0,
      currentPhase: fallbackPhase,
      phaseElapsedSec: 0,
      phaseRemainingSec: 0,
      phaseRemainingCeilSec: 0,
      phaseProgress: 1,
      totalProgress: 1,
      isLastFiveSeconds: false,
    };
  }

  const totalDurationSec = phases[phases.length - 1].endSec;
  const clampedElapsed = Math.max(0, Math.min(elapsedSec, totalDurationSec));
  const isComplete = clampedElapsed >= totalDurationSec;

  let currentPhase = phases[phases.length - 1];
  for (let i = 0; i < phases.length; i++) {
    const p = phases[i];
    if (clampedElapsed < p.endSec || i === phases.length - 1) {
      currentPhase = p;
      break;
    }
  }

  const phaseElapsedSec = Math.max(
    0,
    Math.min(clampedElapsed - currentPhase.startSec, currentPhase.durationSec)
  );
  const phaseRemainingSec = Math.max(0, currentPhase.durationSec - phaseElapsedSec);
  const phaseRemainingCeilSec = isComplete ? 0 : Math.ceil(phaseRemainingSec);
  const phaseProgress =
    currentPhase.durationSec > 0 ? phaseElapsedSec / currentPhase.durationSec : 1;
  const totalProgress = totalDurationSec > 0 ? clampedElapsed / totalDurationSec : 1;

  const isLastFiveSeconds =
    !isComplete && phaseRemainingCeilSec >= 1 && phaseRemainingCeilSec <= 5;

  return {
    isComplete,
    totalDurationSec,
    totalElapsedSec: clampedElapsed,
    totalRemainingSec: Math.max(0, totalDurationSec - clampedElapsed),
    currentPhaseIndex: currentPhase.index,
    currentPhase,
    phaseElapsedSec,
    phaseRemainingSec,
    phaseRemainingCeilSec,
    phaseProgress,
    totalProgress,
    isLastFiveSeconds,
  };
}

export function formatMMSS(totalSeconds: number): string {
  const safe = Math.max(0, Math.ceil(totalSeconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function formatHumanDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;

  if (hours > 0) {
    return `${hours}h ${mins}m ${secs}s`;
  }
  if (mins > 0) {
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  }
  return `${secs}s`;
}
