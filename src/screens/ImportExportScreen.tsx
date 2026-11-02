import React from 'react';
import { TimerDefinition } from '../types/timer';
import { ImportExportModal } from '../components/ImportExportModal';

export interface ImportExportScreenProps {
  timers: TimerDefinition[];
  onImportTimers: (imported: TimerDefinition[], mode: 'merge' | 'replace') => void;
  onBackToTimers: () => void;
}

export const ImportExportScreen: React.FC<ImportExportScreenProps> = ({
  timers,
  onImportTimers,
  onBackToTimers,
}) => {
  return (
    <ImportExportModal
      timers={timers}
      onImportTimers={onImportTimers}
      onClose={onBackToTimers}
    />
  );
};
