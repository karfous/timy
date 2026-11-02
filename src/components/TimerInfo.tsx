import React from 'react';
import { TimerDefinition } from '../types/timer';

export interface TimerInfoData {
  laps: number;
  rounds: number;
  workSec: number;
  breakSec: number;
  longBreakSec: number;
}

export function extractTimerInfoData(timer: TimerDefinition): TimerInfoData {
  if (timer.kind === 'simple') {
    return {
      laps: 1,
      rounds: 1,
      workSec: Math.max(1, Math.floor(timer.durationSec)),
      breakSec: 0,
      longBreakSec: 0,
    };
  }

  return {
    laps: Math.max(1, Math.floor(timer.laps)),
    rounds: Math.max(1, Math.floor(timer.rounds ?? 1)),
    workSec: Math.max(1, Math.floor(timer.workSec)),
    breakSec: Math.max(0, Math.floor(timer.breakSec)),
    longBreakSec: Math.max(0, Math.floor(timer.longBreakSec ?? 0)),
  };
}

/**
 * Formats timer specs in the compact format:
 * "L3 | R4 | W20 | BR 10(60)"
 * (Laps | Rounds | Workout time in seconds | Short Break(Long Break) in seconds)
 */
export function formatTimerInfoString(timer: TimerDefinition): string {
  const { laps, rounds, workSec, breakSec, longBreakSec } =
    extractTimerInfoData(timer);
  return `L${laps} | R${rounds} | W${workSec} | BR ${breakSec} (${longBreakSec})`;
}

export interface TimerInfoProps {
  timer: TimerDefinition;
  className?: string;
}

/**
 * Compact TimerInfo component showing timer parameters as:
 * "L3 | R4 | W20 | BR 10 (60)"
 */
export const TimerInfo: React.FC<TimerInfoProps> = ({
  timer,
  className = '',
}) => {
  const { laps, rounds, workSec, breakSec, longBreakSec } =
    extractTimerInfoData(timer);

  return (
    <div
      className={`timer-info ${className}`.trim()}
      aria-label={`Laps ${laps}, Rounds ${rounds}, Work ${workSec} seconds, Break ${breakSec} seconds short and ${longBreakSec} seconds long`}
    >
      <span className="timer-info-part timer-info-laps">L{laps}</span>
      <span className="timer-info-divider" aria-hidden="true">
        {' | '}
      </span>
      <span className="timer-info-part timer-info-rounds">R{rounds}</span>
      <span className="timer-info-divider" aria-hidden="true">
        {' | '}
      </span>
      <span className="timer-info-part timer-info-work">W{workSec}</span>
      <span className="timer-info-divider" aria-hidden="true">
        {' | '}
      </span>
      <span className="timer-info-part timer-info-break">
        BR {breakSec}
        <span className="timer-info-long-break"> ({longBreakSec})</span>
      </span>
    </div>
  );
};

