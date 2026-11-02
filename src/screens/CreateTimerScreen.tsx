import React from 'react';
import { TimerDefinition } from '../types/timer';
import { TimerEditorModal } from '../components/TimerEditorModal';

export interface CreateTimerScreenProps {
  initialTimer?: TimerDefinition | null;
  availableTags?: string[];
  onSave: (timer: TimerDefinition) => void;
  onCancel: () => void;
}

export const CreateTimerScreen: React.FC<CreateTimerScreenProps> = ({
  initialTimer,
  availableTags,
  onSave,
  onCancel,
}) => {
  return (
    <TimerEditorModal
      initialTimer={initialTimer}
      availableTags={availableTags}
      onSave={onSave}
      onClose={onCancel}
    />
  );
};

