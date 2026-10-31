import React from 'react';
import { TimerDefinition } from '../types/timer';
import { ActiveTimerRunner } from '../components/ActiveTimerRunner';

export interface WorkoutScreenProps {
  timer: TimerDefinition;
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
  onBackToTimers,
  onWorkoutFinished,
}) => {
  return (
    <ActiveTimerRunner
      timer={timer}
      onCloseWorkout={onBackToTimers}
      onWorkoutFinished={onWorkoutFinished}
    />
  );
};
