import {
  ColorPalette,
  TimerDefinition,
  WorkoutHistoryEntry,
  WorkoutStats,
} from '../types/timer';

const KEYS = {
  TIMERS: 'pulse_timers_v1',
  SEEDED_DEFAULT_IDS: 'pulse_seeded_default_ids_v1',
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

const defaultTimerModules = import.meta.glob('../defaultTimers/*.json', {
  eager: true,
});

export function normalizeTags(rawTags: unknown): string[] {
  if (!Array.isArray(rawTags)) return [];
  const seen = new Set<string>();
  const clean: string[] = [];
  for (const entry of rawTags) {
    if (typeof entry !== 'string') continue;
    const trimmed = entry.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      clean.push(trimmed);
    }
  }
  return clean;
}

function sanitizeTimerEntry(
  item: unknown,
  fallbackId: string,
  fallbackCreatedAt: number
): TimerDefinition | null {
  if (!isValidTimerDefinition(item)) return null;
  const raw = item as unknown as Record<string, unknown>;
  const id =
    typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : fallbackId;
  const createdAt =
    typeof raw.createdAt === 'number' ? raw.createdAt : fallbackCreatedAt;
  const prepSec =
    typeof raw.prepSec === 'number' && raw.prepSec >= 0
      ? Math.floor(raw.prepSec)
      : 5;
  const tags = normalizeTags(raw.tags);

  if (item.kind === 'simple') {
    return {
      id,
      name: item.name.trim(),
      kind: 'simple',
      durationSec: Math.max(1, Math.floor(item.durationSec)),
      prepSec,
      tags,
      createdAt,
    };
  }

  const rounds =
    typeof raw.rounds === 'number' && raw.rounds >= 1
      ? Math.max(1, Math.floor(raw.rounds))
      : undefined;
  const longBreakSec =
    typeof raw.longBreakSec === 'number' && raw.longBreakSec >= 0
      ? Math.max(0, Math.floor(raw.longBreakSec))
      : undefined;

  return {
    id,
    name: item.name.trim(),
    kind: 'workout',
    laps: Math.max(1, Math.floor(item.laps)),
    ...(rounds !== undefined ? { rounds } : {}),
    workSec: Math.max(1, Math.floor(item.workSec)),
    breakSec: Math.max(0, Math.floor(item.breakSec)),
    ...(longBreakSec !== undefined ? { longBreakSec } : {}),
    prepSec,
    tags,
    createdAt,
  };
}

export function parseDefaultTimerModules(
  modules: Record<string, unknown>
): TimerDefinition[] {
  const results: TimerDefinition[] = [];
  const entries = Object.entries(modules).sort(([pathA], [pathB]) =>
    pathA.localeCompare(pathB)
  );

  entries.forEach(([filePath, mod], fileIndex) => {
    const payload =
      mod && typeof mod === 'object' && 'default' in mod
        ? (mod as { default: unknown }).default
        : mod;

    const fileSlug =
      filePath
        .split('/')
        .pop()
        ?.replace(/\.json$/i, '')
        .trim() || `file-${fileIndex + 1}`;

    let rawList: unknown[] = [];
    if (Array.isArray(payload)) {
      rawList = payload;
    } else if (payload && typeof payload === 'object') {
      const obj = payload as Record<string, unknown>;
      if (Array.isArray(obj.timers)) {
        rawList = obj.timers;
      } else {
        rawList = [obj];
      }
    }

    rawList.forEach((rawItem, itemIndex) => {
      const fallbackId =
        rawList.length === 1
          ? `preset-${fileSlug}`
          : `preset-${fileSlug}-${itemIndex + 1}`;
      const fallbackCreatedAt = 1700000100000 + fileIndex * 1000 + itemIndex;
      const sanitized = sanitizeTimerEntry(
        rawItem,
        fallbackId,
        fallbackCreatedAt
      );
      if (sanitized) {
        results.push(sanitized);
      }
    });
  });

  return results.sort((a, b) => a.createdAt - b.createdAt);
}

export const DEFAULT_TIMERS: TimerDefinition[] =
  parseDefaultTimerModules(defaultTimerModules);

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

function loadSeededDefaultIds(): Set<string> | null {
  const raw = safeGetItem(KEYS.SEEDED_DEFAULT_IDS);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return new Set(parsed.filter((id): id is string => typeof id === 'string'));
  } catch {
    return null;
  }
}

function saveSeededDefaultIds(ids: Iterable<string>): void {
  safeSetItem(KEYS.SEEDED_DEFAULT_IDS, JSON.stringify(Array.from(ids)));
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
      saveTimers(DEFAULT_TIMERS);
      return DEFAULT_TIMERS;
    }
    const defaultMap = new Map(DEFAULT_TIMERS.map((d) => [d.id, d]));
    let didBackfillDefaults = false;
    const valid = parsed.filter(isValidTimerDefinition).map((item) => {
      const def = defaultMap.get(item.id);
      if (!def) return item;
      let updated: TimerDefinition = item;
      if (item.tags === undefined && def.tags && def.tags.length > 0) {
        updated = { ...updated, tags: def.tags };
        didBackfillDefaults = true;
      }
      if (
        updated.kind === 'workout' &&
        def.kind === 'workout' &&
        updated.rounds === undefined &&
        def.rounds !== undefined
      ) {
        updated = {
          ...updated,
          laps: def.laps,
          rounds: def.rounds,
          longBreakSec: def.longBreakSec,
        };
        didBackfillDefaults = true;
      }
      return updated;
    });
    if (valid.length === 0) {
      saveTimers(DEFAULT_TIMERS);
      return DEFAULT_TIMERS;
    }

    // Check if new default timer JSON files were added to src/defaultTimers/
    const seededIds = loadSeededDefaultIds();
    const existingIds = new Set(valid.map((t) => t.id));
    const newDefaultTimers = DEFAULT_TIMERS.filter((def) => {
      if (existingIds.has(def.id)) return false;
      // If seededIds exists, only add defaults that have never been seeded before
      return seededIds ? !seededIds.has(def.id) : true;
    });

    if (newDefaultTimers.length > 0 || !seededIds || didBackfillDefaults) {
      const merged = [...valid, ...newDefaultTimers];
      saveTimers(merged);
      return merged;
    }

    return valid;
  } catch {
    return DEFAULT_TIMERS;
  }
}

export function saveTimers(timers: TimerDefinition[]): void {
  safeSetItem(KEYS.TIMERS, JSON.stringify(timers));
  const seeded = loadSeededDefaultIds() ?? new Set<string>();
  for (const def of DEFAULT_TIMERS) {
    seeded.add(def.id);
  }
  for (const t of timers) {
    if (DEFAULT_TIMERS.some((def) => def.id === t.id)) {
      seeded.add(t.id);
    }
  }
  saveSeededDefaultIds(seeded);
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
    const fallbackId = `timer-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const entry = sanitizeTimerEntry(item, fallbackId, Date.now());
    if (entry) {
      sanitized.push(entry);
    }
  }

  if (sanitized.length === 0) {
    throw new Error('None of the entries matched a valid Simple or Workout timer schema.');
  }

  return sanitized;
}

