import React from 'react';
import { WorkoutHistoryEntry } from '../types/timer';
import { StatsAndHistory } from '../components/StatsAndHistory';

export interface StatsScreenProps {
  history: WorkoutHistoryEntry[];
  onClearHistory: () => void;
}

export const StatsScreen: React.FC<StatsScreenProps> = ({
  history,
  onClearHistory,
}) => {
  return (
    <StatsAndHistory
      history={history}
      onClearHistory={onClearHistory}
    />
  );
};

