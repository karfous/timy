import {
  ColorPalette,
  TimerDefinition,
  WorkoutHistoryEntry,
  WorkoutStats,
} from '../types/timer';

const KEYS = {
  TIMERS: 'pulse_timers_v1',
  ACTIVE_TIMER_ID: 'pulse_active_timer_id_v1',
  PALETTES: 'pulse_custom_palettes_v1',
  ACTIVE_PALETTE: 'pulse_active_palette_v1',
  HISTORY: 'pulse_workout_history_v1',
  MUTED: 'pulse_audio_muted_v1',
} as const;

export const DEFAULT_PALETTES: ColorPalette[] = [
  {
    id: 'obsidian-dark',
    name: 'Obsidian Dark (Default)',
    isCustom: false,
    bgPrimary: '#0b0d10',
    bgSurface: '#13171d',
    textPrimary: '#f3f5f8',
    textMuted: '#7c8594',
    accentPrimary: '#38bdf8',
    accentBreak: '#34d399',
    accentWarn: '#fbbf24',
  },
  {
    id: 'neon-lime',
    name: 'Volt Athlete',
    isCustom: false,
    bgPrimary: '#090b0a',
    bgSurface: '#121614',
    textPrimary: '#f4f7f5',
    textMuted: '#78877e',
    accentPrimary: '#a3e635',
    accentBreak: '#2dd4bf',
    accentWarn: '#fb923c',
  },
  {
    id: 'crimson-night',
    name: 'Ember Pulse',
    isCustom: false,
    bgPrimary: '#0f0a0c',
    bgSurface: '#191115',
    textPrimary: '#faf5f7',
    textMuted: '#8f7a82',
    accentPrimary: '#fb7185',
    accentBreak: '#60a5fa',
    accentWarn: '#facc15',
  },
  {
    id: 'minimal-light',
    name: 'Paper Daylight',
    isCustom: false,
    bgPrimary: '#f8fafc',
    bgSurface: '#ffffff',
    textPrimary: '#0f172a',
    textMuted: '#64748b',
    accentPrimary: '#0284c7',
    accentBreak: '#059669',
    accentWarn: '#d97706',
  },
];

export const DEFAULT_TIMERS: TimerDefinition[] = [
  {
    id: 'preset-tabata',
    name: 'Tabata HIIT',
    kind: 'workout',
    laps: 8,
    workSec: 20,
    breakSec: 10,
    prepSec: 5,
    createdAt: 1700000001000,
  },
  {
    id: 'preset-boxing',
    name: 'Boxing Rounds',
    kind: 'workout',
    laps: 5,
    workSec: 180,
    breakSec: 60,
    prepSec: 5,
    createdAt: 1700000002000,
  },
  {
    id: 'preset-emom',
    name: 'Circuit 45 / 15',
    kind: 'workout',
    laps: 6,
    workSec: 45,
    breakSec: 15,
    prepSec: 5,
    createdAt: 1700000003000,
  },
  {
    id: 'preset-plank',
    name: 'Quick 2m Hold',
    kind: 'simple',
    durationSec: 120,
    prepSec: 5,
    createdAt: 1700000004000,
  },
];

function safeGetItem(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetItem(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore storage quota / privacy mode errors
  }
}

export function loadTimers(): TimerDefinition[] {
  const raw = safeGetItem(KEYS.TIMERS);
  if (!raw) {
    saveTimers(DEFAULT_TIMERS);
    return DEFAULT_TIMERS;
  }
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return DEFAULT_TIMERS;
    }
    const valid = parsed.filter(isValidTimerDefinition);
    return valid.length > 0 ? valid : DEFAULT_TIMERS;
  } catch {
    return DEFAULT_TIMERS;
  }
}

export function saveTimers(timers: TimerDefinition[]): void {
  safeSetItem(KEYS.TIMERS, JSON.stringify(timers));
}

export function loadActiveTimerId(timers: TimerDefinition[]): string {
  const savedId = safeGetItem(KEYS.ACTIVE_TIMER_ID);
  if (savedId && timers.some((t) => t.id === savedId)) {
    return savedId;
  }
  return timers[0]?.id ?? '';
}

export function saveActiveTimerId(id: string): void {
  safeSetItem(KEYS.ACTIVE_TIMER_ID, id);
}

export function loadCustomPalettes(): ColorPalette[] {
  const raw = safeGetItem(KEYS.PALETTES);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidPalette);
  } catch {
    return [];
  }
}

export function saveCustomPalettes(palettes: ColorPalette[]): void {
  safeSetItem(KEYS.PALETTES, JSON.stringify(palettes));
}

export function loadActivePalette(): ColorPalette {
  const raw = safeGetItem(KEYS.ACTIVE_PALETTE);
  if (!raw) return DEFAULT_PALETTES[0];
  try {
    const parsed = JSON.parse(raw);
    if (isValidPalette(parsed)) {
      return parsed;
    }
    return DEFAULT_PALETTES[0];
  } catch {
    return DEFAULT_PALETTES[0];
  }
}

export function saveActivePalette(palette: ColorPalette): void {
  safeSetItem(KEYS.ACTIVE_PALETTE, JSON.stringify(palette));
}

export function applyPaletteToDocument(palette: ColorPalette): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.style.setProperty('--bg-primary', palette.bgPrimary);
  root.style.setProperty('--bg-surface', palette.bgSurface);
  root.style.setProperty('--text-primary', palette.textPrimary);
  root.style.setProperty('--text-muted', palette.textMuted);
  root.style.setProperty('--accent-primary', palette.accentPrimary);
  root.style.setProperty('--accent-break', palette.accentBreak);
  root.style.setProperty('--accent-warn', palette.accentWarn);

  // Determine whether background is dark or light for native browser controls
  const isLight = isColorLight(palette.bgPrimary);
  root.style.setProperty('color-scheme', isLight ? 'light' : 'dark');
}

function isColorLight(hex: string): boolean {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return false;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6;
}

export function loadHistory(): WorkoutHistoryEntry[] {
  const raw = safeGetItem(KEYS.HISTORY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

export function saveHistory(entries: WorkoutHistoryEntry[]): void {
  safeSetItem(KEYS.HISTORY, JSON.stringify(entries));
}

export function addHistoryEntry(
  entry: Omit<WorkoutHistoryEntry, 'id'>
): WorkoutHistoryEntry[] {
  const current = loadHistory();
  const newEntry: WorkoutHistoryEntry = {
    ...entry,
    id: `run-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  };
  const updated = [newEntry, ...current].slice(0, 200); // keep most recent 200 runs
  saveHistory(updated);
  return updated;
}

export function clearHistory(): WorkoutHistoryEntry[] {
  saveHistory([]);
  return [];
}

export function computeWorkoutStats(history: WorkoutHistoryEntry[]): WorkoutStats {
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ).getTime();

  let totalActiveSec = 0;
  let totalLapsCompleted = 0;
  let completedRuns = 0;
  let todayActiveSec = 0;
  let todayRuns = 0;

  for (const item of history) {
    totalActiveSec += item.totalElapsedSec || 0;
    totalLapsCompleted += item.lapsCompleted || 0;
    if (item.completedFully) {
      completedRuns += 1;
    }
    if (item.completedAt >= startOfToday) {
      todayActiveSec += item.totalElapsedSec || 0;
      todayRuns += 1;
    }
  }

  return {
    totalRuns: history.length,
    completedRuns,
    totalActiveSec,
    totalLapsCompleted,
    todayActiveSec,
    todayRuns,
  };
}

export function loadAudioMuted(): boolean {
  return safeGetItem(KEYS.MUTED) === 'true';
}

export function saveAudioMuted(muted: boolean): void {
  safeSetItem(KEYS.MUTED, muted ? 'true' : 'false');
}

export function isValidTimerDefinition(item: unknown): item is TimerDefinition {
  if (!item || typeof item !== 'object') return false;
  const obj = item as Record<string, unknown>;
  if (typeof obj.name !== 'string' || !obj.name.trim()) return false;
  if (obj.kind === 'simple') {
    return typeof obj.durationSec === 'number' && obj.durationSec >= 1;
  }
  if (obj.kind === 'workout') {
    return (
      typeof obj.laps === 'number' &&
      obj.laps >= 1 &&
      typeof obj.workSec === 'number' &&
      obj.workSec >= 1 &&
      typeof obj.breakSec === 'number' &&
      obj.breakSec >= 0
    );
  }
  return false;
}

function isValidPalette(item: unknown): item is ColorPalette {
  if (!item || typeof item !== 'object') return false;
  const obj = item as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.bgPrimary === 'string' &&
    typeof obj.bgSurface === 'string' &&
    typeof obj.textPrimary === 'string' &&
    typeof obj.textMuted === 'string' &&
    typeof obj.accentPrimary === 'string' &&
    typeof obj.accentBreak === 'string' &&
    typeof obj.accentWarn === 'string'
  );
}

export function serializeTimersForExport(timers: TimerDefinition[]): string {
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    timers,
  };
  return JSON.stringify(payload, null, 2);
}

export function parseImportedTimersJson(jsonText: string): TimerDefinition[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error('Invalid JSON format. Please check the file or pasted text.');
  }

  let rawList: unknown[] = [];
  if (Array.isArray(parsed)) {
    rawList = parsed;
  } else if (parsed && typeof parsed === 'object') {
    const obj = parsed as Record<string, unknown>;
    if (Array.isArray(obj.timers)) {
      rawList = obj.timers;
    } else if (isValidTimerDefinition(obj)) {
      rawList = [obj];
    }
  }

  if (rawList.length === 0) {
    throw new Error('No timer definitions found in the provided JSON.');
  }

  const sanitized: TimerDefinition[] = [];
  for (const item of rawList) {
    if (!isValidTimerDefinition(item)) continue;
    const id =
      typeof item.id === 'string' && item.id.trim()
        ? item.id
        : `timer-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const createdAt =
      typeof item.createdAt === 'number' ? item.createdAt : Date.now();
    const prepSec =
      typeof item.prepSec === 'number' && item.prepSec >= 0
        ? Math.floor(item.prepSec)
        : 5;

    if (item.kind === 'simple') {
      sanitized.push({
        id,
        name: item.name.trim(),
        kind: 'simple',
        durationSec: Math.max(1, Math.floor(item.durationSec)),
        prepSec,
        createdAt,
      });
    } else {
      sanitized.push({
        id,
        name: item.name.trim(),
        kind: 'workout',
        laps: Math.max(1, Math.floor(item.laps)),
        workSec: Math.max(1, Math.floor(item.workSec)),
        breakSec: Math.max(0, Math.floor(item.breakSec)),
        prepSec,
        createdAt,
      });
    }
  }

  if (sanitized.length === 0) {
    throw new Error('None of the entries matched a valid Simple or Workout timer schema.');
  }

  return sanitized;
}

