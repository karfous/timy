export type TimerKind = 'simple' | 'workout';

export interface SimpleTimerConfig {
  id: string;
  name: string;
  kind: 'simple';
  durationSec: number;
  prepSec?: number;
  createdAt: number;
}

export interface WorkoutTimerConfig {
  id: string;
  name: string;
  kind: 'workout';
  laps: number;
  workSec: number;
  breakSec: number;
  prepSec?: number;
  createdAt: number;
}

export type TimerDefinition = SimpleTimerConfig | WorkoutTimerConfig;

export type PhaseType = 'prep' | 'work' | 'break' | 'simple';

export interface TimerPhase {
  index: number;
  type: PhaseType;
  label: string;
  durationSec: number;
  startSec: number;
  endSec: number;
  lap: number;
  totalLaps: number;
}

export interface TimerSnapshot {
  isComplete: boolean;
  totalDurationSec: number;
  totalElapsedSec: number;
  totalRemainingSec: number;
  currentPhaseIndex: number;
  currentPhase: TimerPhase;
  phaseElapsedSec: number;
  phaseRemainingSec: number;
  phaseRemainingCeilSec: number;
  phaseProgress: number; // 0 to 1
  totalProgress: number; // 0 to 1
  isLastFiveSeconds: boolean;
}

export interface WorkoutHistoryEntry {
  id: string;
  timerId: string;
  timerName: string;
  kind: TimerKind;
  completedAt: number;
  totalElapsedSec: number;
  lapsCompleted: number;
  totalLaps: number;
  completedFully: boolean;
}

export interface WorkoutStats {
  totalRuns: number;
  completedRuns: number;
  totalActiveSec: number;
  totalLapsCompleted: number;
  todayActiveSec: number;
  todayRuns: number;
}

export interface ColorPalette {
  id: string;
  name: string;
  isCustom?: boolean;
  bgPrimary: string;
  bgSurface: string;
  textPrimary: string;
  textMuted: string;
  accentPrimary: string;
  accentBreak: string;
  accentWarn: string;
}

