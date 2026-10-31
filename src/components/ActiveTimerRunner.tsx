import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Volume2,
  VolumeX,
  Flame,
  Coffee,
  Timer as TimerIcon,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { TimerDefinition, PhaseType } from '../types/timer';
import {
  buildTimerPhases,
  computeTimerSnapshot,
  formatMMSS,
  formatHumanDuration,
} from '../utils/timerEngine';
import { soundEngine } from '../services/audio';

interface ActiveTimerRunnerProps {
  timer: TimerDefinition;
  muted: boolean;
  onToggleMute: () => void;
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
  muted,
  onToggleMute,
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
      // Restart from 0
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

  const handleReset = useCallback(() => {
    // Log partial session if user ran at least 5 seconds of active time
    if (elapsedSec >= 5 && !hasRecordedCompletionRef.current) {
      const totalLaps = timer.kind === 'workout' ? timer.laps : 1;
      const completedLaps = Math.max(0, snapshot.currentPhase.lap - 1);
      onWorkoutFinished({
        timerId: timer.id,
        timerName: timer.name,
        kind: timer.kind,
        totalElapsedSec: Math.round(elapsedSec),
        lapsCompleted: completedLaps,
        totalLaps,
        completedFully: false,
      });
    }

    setIsRunning(false);
    setElapsedSec(0);
    accumulatedSecRef.current = 0;
    lastResumeTimestampRef.current = null;
    lastBeepKeyRef.current = '';
    lastAnnouncedPhaseRef.current = -1;
    hasRecordedCompletionRef.current = false;
  }, [elapsedSec, snapshot.currentPhase.lap, timer, onWorkoutFinished]);

  const handleSkipPhase = useCallback(() => {
    const nextIndex = snapshot.currentPhaseIndex + 1;
    if (nextIndex < phases.length) {
      const nextStart = phases[nextIndex].startSec;
      accumulatedSecRef.current = nextStart;
      if (isRunning) {
        lastResumeTimestampRef.current = performance.now();
      }
      lastBeepKeyRef.current = '';
      setElapsedSec(nextStart);
    } else {
      // Finish timer
      accumulatedSecRef.current = snapshot.totalDurationSec;
      setElapsedSec(snapshot.totalDurationSec);
    }
  }, [snapshot.currentPhaseIndex, snapshot.totalDurationSec, phases, isRunning]);

  const nextPhase =
    snapshot.currentPhaseIndex + 1 < phases.length
      ? phases[snapshot.currentPhaseIndex + 1]
      : null;

  const getPhaseColor = (type: PhaseType, isWarn: boolean): string => {
    if (isWarn) return 'var(--accent-warn)';
    if (type === 'break') return 'var(--accent-break)';
    if (type === 'prep') return 'var(--accent-warn)';
    return 'var(--accent-primary)';
  };

  const activeColor = getPhaseColor(
    snapshot.currentPhase.type,
    snapshot.isLastFiveSeconds
  );

  const renderPhaseIcon = (type: PhaseType) => {
    if (snapshot.isComplete) return <CheckCircle2 size={15} strokeWidth={1.75} />;
    if (type === 'work') return <Flame size={15} strokeWidth={1.75} />;
    if (type === 'break') return <Coffee size={15} strokeWidth={1.75} />;
    if (type === 'prep') return <Sparkles size={15} strokeWidth={1.75} />;
    return <TimerIcon size={15} strokeWidth={1.75} />;
  };

  // SVG Ring Geometry
  const size = 310;
  const center = size / 2;
  const outerRadius = 136;
  const innerRadius = 122;
  const outerCircumference = 2 * Math.PI * outerRadius;
  const innerCircumference = 2 * Math.PI * innerRadius;

  // Remaining fraction for current phase (drains smoothly from 1 to 0)
  const remainingFraction = snapshot.isComplete
    ? 0
    : Math.max(0, Math.min(1, 1 - snapshot.phaseProgress));
  const outerOffset = outerCircumference * (1 - remainingFraction);
  const innerOffset = innerCircumference * (1 - snapshot.totalProgress);

  return (
    <section className="runner-card" aria-label="Active Workout Timer">
      {/* Top Status Bar */}
      <div className="runner-header">
        <div className="runner-title-group">
          <h2 className="runner-timer-name">{timer.name}</h2>
          <span className="runner-subtitle">
            {timer.kind === 'workout'
              ? `${timer.laps} rounds · ${formatHumanDuration(timer.workSec)} work / ${formatHumanDuration(timer.breakSec)} break`
              : `Simple timer · ${formatHumanDuration(timer.durationSec)}`}
          </span>
        </div>

        <button
          type="button"
          className="icon-btn"
          onClick={onToggleMute}
          aria-label={muted ? 'Unmute audio beeps' : 'Mute audio beeps'}
          title={muted ? 'Audio muted (click to unmute)' : '5s countdown beeps enabled'}
        >
          {muted ? <VolumeX size={18} strokeWidth={1.5} /> : <Volume2 size={18} strokeWidth={1.5} />}
        </button>
      </div>

      {/* Main Concentric Progress Ring */}
      <div className="runner-ring-container">
        <svg viewBox={`0 0 ${size} ${size}`} className="runner-svg">
          {/* Outer Track: Current Phase */}
          <circle
            cx={center}
            cy={center}
            r={outerRadius}
            fill="none"
            stroke="var(--ring-track)"
            strokeWidth="4"
          />
          <circle
            cx={center}
            cy={center}
            r={outerRadius}
            fill="none"
            stroke={activeColor}
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeDasharray={outerCircumference}
            strokeDashoffset={outerOffset}
            transform={`rotate(-90 ${center} ${center})`}
            className="runner-ring-animated"
          />

          {/* Inner Track: Total Workout Progress (shown for multi-phase timers) */}
          {phases.length > 1 && (
            <>
              <circle
                cx={center}
                cy={center}
                r={innerRadius}
                fill="none"
                stroke="var(--ring-track)"
                strokeWidth="2"
                opacity="0.6"
              />
              <circle
                cx={center}
                cy={center}
                r={innerRadius}
                fill="none"
                stroke="var(--text-muted)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray={innerCircumference}
                strokeDashoffset={innerOffset}
                transform={`rotate(-90 ${center} ${center})`}
                opacity="0.75"
              />
            </>
          )}
        </svg>

        {/* Center Readout */}
        <div className="runner-center-content">
          <div
            className={`phase-badge ${snapshot.isLastFiveSeconds ? 'pulse-warn' : ''}`}
            style={{
              borderColor: activeColor,
              color: activeColor,
            }}
          >
            {renderPhaseIcon(snapshot.currentPhase.type)}
            <span>
              {snapshot.isComplete ? 'COMPLETED' : snapshot.currentPhase.label.toUpperCase()}
            </span>
          </div>

          <div
            className={`main-time-display ${snapshot.isLastFiveSeconds ? 'warn-text' : ''}`}
            aria-live="polite"
          >
            {formatMMSS(snapshot.phaseRemainingCeilSec)}
          </div>

          {snapshot.isLastFiveSeconds && (
            <div className="five-sec-alert">
              Beep · {snapshot.phaseRemainingCeilSec}s to{' '}
              {nextPhase ? nextPhase.label : 'Finish'}
            </div>
          )}

          {!snapshot.isLastFiveSeconds && (
            <div className="runner-meta-row">
              {timer.kind === 'workout' && (
                <span className="lap-pill">
                  Lap {snapshot.currentPhase.lap} / {snapshot.currentPhase.totalLaps}
                </span>
              )}
              <span className="total-remaining-text">
                Total left {formatMMSS(snapshot.totalRemainingSec)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Upcoming Phase Preview Strip */}
      <div className="next-phase-strip">
        <span className="next-phase-label">Up next</span>
        <span className="next-phase-value">
          {snapshot.isComplete
            ? 'Session finished'
            : nextPhase
            ? `${nextPhase.label} (${formatMMSS(nextPhase.durationSec)})`
            : 'Workout Complete'}
        </span>
      </div>

      {/* Control Buttons */}
      <div className="runner-controls">
        <button
          type="button"
          className="control-btn secondary"
          onClick={handleReset}
          disabled={elapsedSec === 0 && !isRunning}
          aria-label="Reset timer"
          title="Reset timer"
        >
          <RotateCcw size={18} strokeWidth={1.6} />
          <span>Reset</span>
        </button>

        <button
          type="button"
          className="control-btn primary"
          onClick={handleStartPause}
          style={{
            backgroundColor: activeColor,
          }}
          aria-label={isRunning ? 'Pause timer' : 'Start timer'}
        >
          {isRunning ? (
            <>
              <Pause size={20} strokeWidth={1.8} />
              <span>Pause</span>
            </>
          ) : (
            <>
              <Play size={20} strokeWidth={1.8} />
              <span>{snapshot.isComplete ? 'Restart' : elapsedSec > 0 ? 'Resume' : 'Start'}</span>
            </>
          )}
        </button>

        <button
          type="button"
          className="control-btn secondary"
          onClick={handleSkipPhase}
          disabled={snapshot.isComplete}
          aria-label="Skip current round"
          title="Skip to next phase"
        >
          <SkipForward size={18} strokeWidth={1.6} />
          <span>Skip</span>
        </button>
      </div>
    </section>
  );
};
