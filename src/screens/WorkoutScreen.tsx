import React from 'react';
import { TimerDefinition } from '../types/timer';
import { ActiveTimerRunner } from '../components/ActiveTimerRunner';

export interface WorkoutScreenProps {
  timer: TimerDefinition;
  muted: boolean;
  onToggleMute: () => void;
  onBackToTimers: () => void;
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

export const WorkoutScreen: React.FC<WorkoutScreenProps> = ({
  timer,
  muted,
  onToggleMute,
  onBackToTimers,
  onWorkoutFinished,
}) => {
  return (
    <div className="workout-screen-layout">
      <ActiveTimerRunner
        timer={timer}
        muted={muted}
        onToggleMute={onToggleMute}
        onBackToTimers={onBackToTimers}
        onWorkoutFinished={onWorkoutFinished}
      />
    </div>
  );
};

