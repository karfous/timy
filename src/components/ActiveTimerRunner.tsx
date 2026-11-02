import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { X } from 'lucide-react';
import { TimerDefinition, PhaseType } from '../types/timer';
import {
  buildTimerPhases,
  computeTimerSnapshot,
  formatMMSS,
} from '../utils/timerEngine';
import { soundEngine } from '../services/audio';
import { TimerInfo } from './TimerInfo';

interface ActiveTimerRunnerProps {
  timer: TimerDefinition;
  onCloseWorkout?: () => void;
  onWorkoutFinished: (entry: {
    timerId: string;
    timerName: string;
    kind: TimerDefinition['kind'];
    totalElapsedSec: number;
    lapsCompleted: number;
    totalLaps: number;
    completedFully: boolean;
  }) => void;
}

export const ActiveTimerRunner: React.FC<ActiveTimerRunnerProps> = ({
  timer,
  onCloseWorkout,
  onWorkoutFinished,
}) => {
  const phases = useMemo(() => buildTimerPhases(timer), [timer]);
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);

  // Refs for drift-free timing and beep deduplication
  const accumulatedSecRef = useRef(0);
  const lastResumeTimestampRef = useRef<number | null>(null);
  const lastBeepKeyRef = useRef<string>('');
  const lastAnnouncedPhaseRef = useRef<number>(-1);
  const hasRecordedCompletionRef = useRef<boolean>(false);

  // Reset state whenever selected timer changes
  useEffect(() => {
    setIsRunning(false);
    setElapsedSec(0);
    accumulatedSecRef.current = 0;
    lastResumeTimestampRef.current = null;
    lastBeepKeyRef.current = '';
    lastAnnouncedPhaseRef.current = -1;
    hasRecordedCompletionRef.current = false;
  }, [timer]);

  // Keep Screen Wake Lock active while running
  useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null;
    if (isRunning && 'wakeLock' in navigator) {
      navigator.wakeLock
        .request('screen')
        .then((sentinel) => {
          wakeLock = sentinel;
        })
        .catch(() => {});
    }
    return () => {
      if (wakeLock) {
        wakeLock.release().catch(() => {});
      }
    };
  }, [isRunning]);

  const snapshot = useMemo(
    () => computeTimerSnapshot(phases, elapsedSec),
    [phases, elapsedSec]
  );

  // Trigger 5-second countdown beeps in EVERY round & phase transition tones
  useEffect(() => {
    if (!isRunning) return;

    // 1. Check if workout just completed
    if (snapshot.isComplete) {
      setIsRunning(false);
      lastResumeTimestampRef.current = null;
      accumulatedSecRef.current = snapshot.totalDurationSec;

      if (!hasRecordedCompletionRef.current) {
        hasRecordedCompletionRef.current = true;
        soundEngine.playWorkoutCompleteBeep();
        const totalLaps = timer.kind === 'workout' ? timer.laps : 1;
        onWorkoutFinished({
          timerId: timer.id,
          timerName: timer.name,
          kind: timer.kind,
          totalElapsedSec: Math.round(snapshot.totalDurationSec),
          lapsCompleted: totalLaps,
          totalLaps,
          completedFully: true,
        });
      }
      return;
    }

    // 2. Check if we transitioned into a new phase
    if (
      lastAnnouncedPhaseRef.current !== snapshot.currentPhaseIndex &&
      lastAnnouncedPhaseRef.current !== -1
    ) {
      lastAnnouncedPhaseRef.current = snapshot.currentPhaseIndex;
      soundEngine.playRoundStartBeep(snapshot.currentPhase.type);
    } else if (lastAnnouncedPhaseRef.current === -1) {
      lastAnnouncedPhaseRef.current = snapshot.currentPhaseIndex;
      soundEngine.playRoundStartBeep(snapshot.currentPhase.type);
    }

    // 3. Check 5-second countdown warning beeps (5, 4, 3, 2, 1 before every new round / completion)
    const ceilRem = snapshot.phaseRemainingCeilSec;
    if (ceilRem >= 1 && ceilRem <= 5) {
      const beepKey = `${snapshot.currentPhaseIndex}-${ceilRem}`;
      if (lastBeepKeyRef.current !== beepKey) {
        lastBeepKeyRef.current = beepKey;
        soundEngine.playCountdownBeep(ceilRem);
      }
    }
  }, [isRunning, snapshot, timer, onWorkoutFinished]);

  // High-precision wall-clock loop
  useEffect(() => {
    if (!isRunning) return;

    lastResumeTimestampRef.current = performance.now();
    let frameId: number;

    const tick = () => {
      if (lastResumeTimestampRef.current !== null) {
        const now = performance.now();
        const deltaSec = (now - lastResumeTimestampRef.current) / 1000;
        const nextElapsed = accumulatedSecRef.current + deltaSec;
        setElapsedSec(nextElapsed);
      }
      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);

    // Fallback interval for when browser tab is in background and rAF is throttled
    const bgInterval = window.setInterval(() => {
      if (lastResumeTimestampRef.current !== null) {
        const now = performance.now();
        const deltaSec = (now - lastResumeTimestampRef.current) / 1000;
        const nextElapsed = accumulatedSecRef.current + deltaSec;
        setElapsedSec(nextElapsed);
      }
    }, 200);

    return () => {
      cancelAnimationFrame(frameId);
      clearInterval(bgInterval);
    };
  }, [isRunning]);

  const handleStartPause = useCallback(() => {
    soundEngine.unlock();
    if (snapshot.isComplete) {
      // Restart from 0 when tapping digits after completion
      accumulatedSecRef.current = 0;
      lastResumeTimestampRef.current = performance.now();
      lastBeepKeyRef.current = '';
      lastAnnouncedPhaseRef.current = -1;
      hasRecordedCompletionRef.current = false;
      setElapsedSec(0);
      setIsRunning(true);
      return;
    }

    if (isRunning) {
      // Pause and commit accumulated time
      if (lastResumeTimestampRef.current !== null) {
        const delta = (performance.now() - lastResumeTimestampRef.current) / 1000;
        accumulatedSecRef.current += delta;
      }
      lastResumeTimestampRef.current = null;
      setIsRunning(false);
    } else {
      lastResumeTimestampRef.current = performance.now();
      setIsRunning(true);
    }
  }, [isRunning, snapshot.isComplete]);

  const getPhaseColor = (type: PhaseType, isWarn: boolean): string => {
    if (isWarn) return 'var(--accent-warn)';
    if (type === 'break') return 'var(--accent-break)';
    if (type === 'prep') return 'var(--accent-warn)';
    return 'var(--text-primary)';
  };

  const activeColor = getPhaseColor(
    snapshot.currentPhase.type,
    snapshot.isLastFiveSeconds
  );

  const totalProgressPercent = Math.max(
    0,
    Math.min(100, snapshot.totalProgress * 100)
  );

  const totalElapsedFormatted = formatMMSS(Math.floor(snapshot.totalElapsedSec));
  const totalRemainingFormatted = formatMMSS(snapshot.totalRemainingSec);

  return (
    <section
      className="workout-minimal-surface"
      aria-label="Active Workout Timer"
    >
      {/* Top Bar: Info (visible only when not running, no tags) + Closing X in Top-Right */}
      <div className="workout-top-zone">
        <div
          className={`workout-paused-info ${
            isRunning ? 'is-running-hidden' : ''
          }`}
          aria-hidden={isRunning}
        >
          <h2 className="workout-timer-name">{timer.name}</h2>
          <div className="workout-timer-specs">
            <TimerInfo timer={timer} />
          </div>
        </div>

        {onCloseWorkout && (
          <button
            type="button"
            className="workout-close-x-btn"
            onClick={onCloseWorkout}
            aria-label="Close workout screen"
            title="Close workout"
          >
            <X size={22} strokeWidth={1.8} />
          </button>
        )}
      </div>

      {/* Middle Digits Section: Tap digits to start/pause + Right slim rising progress column & rotated total times */}
      <div className="workout-digits-section">
        <button
          type="button"
          className={`workout-digits-touch ${
            snapshot.isLastFiveSeconds ? 'warn-text' : ''
          }`}
          onClick={handleStartPause}
          style={{ color: activeColor }}
          aria-live="polite"
          aria-label={
            isRunning
              ? `Timer running, ${formatMMSS(
                  snapshot.phaseRemainingCeilSec
                )} remaining. Tap digits to pause`
              : `Timer paused at ${formatMMSS(
                  snapshot.phaseRemainingCeilSec
                )}. Tap digits to start`
          }
        >
          <span className="workout-digits-value">
            {formatMMSS(snapshot.phaseRemainingCeilSec)}
          </span>
        </button>

        {/* Right-edge total progress rail (strictly inside the digits section, never covering Rounds) */}
        <div
          className="workout-progress-rail"
          aria-label="Total workout progress"
        >
          <div className="workout-rotated-times">
            <span className="workout-total-elapsed">{totalElapsedFormatted}</span>
            <span className="workout-total-sep">/</span>
            <span className="workout-total-left">-{totalRemainingFormatted}</span>
          </div>

          <div
            className="workout-progress-column"
            role="progressbar"
            aria-valuenow={Math.round(totalProgressPercent)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="workout-progress-fill"
              style={{ height: `${totalProgressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Bottom Corners: Laps (Bottom-Left) & Rounds (Bottom-Right) */}
      <div className="workout-bottom-corners">
        <div className="workout-corner-stat workout-corner-left" aria-label="Laps">
          L {snapshot.currentPhase.lap}/{snapshot.currentPhase.totalLaps}
        </div>
        <div className="workout-corner-stat workout-corner-right" aria-label="Rounds">
          R {snapshot.currentPhase.round}/{snapshot.currentPhase.totalRounds}
        </div>
      </div>
    </section>
  );
};
