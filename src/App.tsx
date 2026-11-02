import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Activity,
  Palette,
  Timer as TimerIcon,
  Menu,
  X,
} from 'lucide-react';
import {
  ColorPalette,
  TimerDefinition,
  WorkoutHistoryEntry,
} from './types/timer';
import {
  loadTimers,
  saveTimers,
  loadActiveTimerId,
  saveActiveTimerId,
  loadCustomPalettes,
  saveCustomPalettes,
  loadActivePalette,
  saveActivePalette,
  applyPaletteToDocument,
  loadHistory,
  addHistoryEntry,
  clearHistory,
  loadAudioMuted,
} from './services/storage';
import { soundEngine } from './services/audio';
import { Screen, ScreenRoute, useScreenRouter } from './components/Screen';
import { TimersScreen } from './screens/TimersScreen';
import { CreateTimerScreen } from './screens/CreateTimerScreen';
import { ImportExportScreen } from './screens/ImportExportScreen';
import { WorkoutScreen } from './screens/WorkoutScreen';
import { StatsScreen } from './screens/StatsScreen';
import { PaletteScreen } from './screens/PaletteScreen';

export const App: React.FC = () => {
  const [timers, setTimers] = useState<TimerDefinition[]>(() => loadTimers());
  const [activeTimerId, setActiveTimerId] = useState<string>(() =>
    loadActiveTimerId(loadTimers())
  );
  const [activePalette, setActivePalette] = useState<ColorPalette>(() =>
    loadActivePalette()
  );
  const [customPalettes, setCustomPalettes] = useState<ColorPalette[]>(() =>
    loadCustomPalettes()
  );
  const [history, setHistory] = useState<WorkoutHistoryEntry[]>(() =>
    loadHistory()
  );

  useEffect(() => {
    soundEngine.setMuted(loadAudioMuted());
  }, []);

  const { activeScreen, navigateToScreen } = useScreenRouter('timers');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [editingTimer, setEditingTimer] = useState<TimerDefinition | null>(null);

  // Collect all unique tags across saved timers
  const allTags = useMemo(() => {
    const map = new Map<string, string>();
    for (const timer of timers) {
      for (const tag of timer.tags ?? []) {
        const clean = tag.trim();
        if (!clean) continue;
        const lower = clean.toLowerCase();
        if (!map.has(lower)) {
          map.set(lower, clean);
        }
      }
    }
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
  }, [timers]);

  // Apply palette CSS variables on mount and whenever palette changes
  useEffect(() => {
    applyPaletteToDocument(activePalette);
    saveActivePalette(activePalette);
  }, [activePalette]);

  // Persist timers whenever modified
  useEffect(() => {
    saveTimers(timers);
  }, [timers]);

  // Persist selected timer ID
  useEffect(() => {
    if (activeTimerId) {
      saveActiveTimerId(activeTimerId);
    }
  }, [activeTimerId]);

  // Close mobile overlay menu on Escape key
  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileMenuOpen]);

  const activeTimer =
    timers.find((t) => t.id === activeTimerId) ?? timers[0];

  const handleSelectMenuScreen = useCallback(
    (screen: ScreenRoute) => {
      navigateToScreen(screen);
      setIsMobileMenuOpen(false);
    },
    [navigateToScreen]
  );

  const handleChooseTimer = useCallback(
    (id: string) => {
      setActiveTimerId(id);
      navigateToScreen('workout');
    },
    [navigateToScreen]
  );

  const handleSaveTimer = (saved: TimerDefinition) => {
    setTimers((prev) => {
      const exists = prev.some((t) => t.id === saved.id);
      if (exists) {
        return prev.map((t) => (t.id === saved.id ? saved : t));
      }
      return [saved, ...prev];
    });
    setActiveTimerId(saved.id);
    setEditingTimer(null);
    navigateToScreen('timers');
  };

  const handleDeleteTimer = (id: string) => {
    if (timers.length <= 1) return; // Keep at least 1 timer
    setTimers((prev) => {
      const filtered = prev.filter((t) => t.id !== id);
      if (activeTimerId === id && filtered.length > 0) {
        setActiveTimerId(filtered[0].id);
      }
      return filtered;
    });
  };

  const handleImportTimers = (
    imported: TimerDefinition[],
    mode: 'merge' | 'replace'
  ) => {
    if (mode === 'replace') {
      setTimers(imported);
      if (imported[0]) {
        setActiveTimerId(imported[0].id);
      }
    } else {
      setTimers((prev) => {
        const map = new Map(prev.map((t) => [t.id, t]));
        for (const item of imported) {
          map.set(item.id, item);
        }
        return Array.from(map.values());
      });
      if (imported[0]) {
        setActiveTimerId(imported[0].id);
      }
    }
  };

  const handleWorkoutFinished = useCallback(
    (entry: {
      timerId: string;
      timerName: string;
      kind: TimerDefinition['kind'];
      totalElapsedSec: number;
      lapsCompleted: number;
      totalLaps: number;
      completedFully: boolean;
    }) => {
      const updated = addHistoryEntry({
        ...entry,
        completedAt: Date.now(),
      });
      setHistory(updated);
    },
    []
  );

  const handleClearHistory = () => {
    setHistory(clearHistory());
  };

  const handleSaveCustomPalette = (palette: ColorPalette) => {
    setCustomPalettes((prev) => {
      const exists = prev.some((p) => p.id === palette.id);
      const next = exists
        ? prev.map((p) => (p.id === palette.id ? palette : p))
        : [...prev, palette];
      saveCustomPalettes(next);
      return next;
    });
    setActivePalette(palette);
  };

  const handleDeleteCustomPalette = (id: string) => {
    setCustomPalettes((prev) => {
      const next = prev.filter((p) => p.id !== id);
      saveCustomPalettes(next);
      return next;
    });
  };

  const isWorkoutLocked = activeScreen === 'workout';

  return (
    <div
      className={`app-shell ${isWorkoutLocked ? 'app-shell-locked' : ''}`}
      data-active-screen={activeScreen}
    >
      {/* Minimalist Top Bar (hidden on Workout Screen) */}
      {!isWorkoutLocked && (
        <header className="top-bar">
          <div
            className="brand-block"
            role="button"
            tabIndex={0}
            onClick={() => handleSelectMenuScreen('timers')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleSelectMenuScreen('timers');
              }
            }}
          >
            <span className="brand-dot" />
            <h1 className="brand-title">TIMY</h1>
            <span className="brand-tag">WORKOUT TIMER</span>
          </div>

          {/* Desktop Navigation */}
          <nav className="main-nav desktop-nav" aria-label="Main navigation">
            <button
              type="button"
              className={`nav-tab ${
                activeScreen === 'timers' ||
                activeScreen === 'create' ||
                activeScreen === 'import'
                  ? 'active'
                  : ''
              }`}
              onClick={() => handleSelectMenuScreen('timers')}
            >
              <TimerIcon size={16} strokeWidth={1.6} />
              <span>Timers</span>
            </button>
            <button
              type="button"
              className={`nav-tab ${activeScreen === 'stats' ? 'active' : ''}`}
              onClick={() => handleSelectMenuScreen('stats')}
            >
              <Activity size={16} strokeWidth={1.6} />
              <span>Stats</span>
              {history.length > 0 && (
                <span className="nav-badge">{history.length}</span>
              )}
            </button>
            <button
              type="button"
              className={`nav-tab ${activeScreen === 'palette' ? 'active' : ''}`}
              onClick={() => handleSelectMenuScreen('palette')}
            >
              <Palette size={16} strokeWidth={1.6} />
              <span>Palette</span>
            </button>
          </nav>

          {/* Mobile Hamburger / Close (X) Button */}
          <button
            type="button"
            className={`hamburger-btn ${isMobileMenuOpen ? 'is-open' : ''}`}
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-overlay-menu"
            aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          >
            {isMobileMenuOpen ? (
              <X size={20} strokeWidth={1.8} />
            ) : (
              <Menu size={20} strokeWidth={1.8} />
            )}
          </button>
        </header>
      )}

      {/* Mobile Fullscreen Overlay Menu */}
      {isMobileMenuOpen && (
        <div
          id="mobile-overlay-menu"
          className="mobile-menu-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation menu"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <nav
            className="mobile-overlay-nav"
            aria-label="Mobile menu options"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className={`mobile-menu-item ${
                activeScreen === 'timers' ||
                activeScreen === 'create' ||
                activeScreen === 'import' ||
                activeScreen === 'workout'
                  ? 'active'
                  : ''
              }`}
              onClick={() => handleSelectMenuScreen('timers')}
            >
              <TimerIcon size={20} strokeWidth={1.7} />
              <span>Timers</span>
            </button>

            <button
              type="button"
              className={`mobile-menu-item ${
                activeScreen === 'stats' ? 'active' : ''
              }`}
              onClick={() => handleSelectMenuScreen('stats')}
            >
              <Activity size={20} strokeWidth={1.7} />
              <span>Stats</span>
              {history.length > 0 && (
                <span className="nav-badge">{history.length}</span>
              )}
            </button>

            <button
              type="button"
              className={`mobile-menu-item ${
                activeScreen === 'palette' ? 'active' : ''
              }`}
              onClick={() => handleSelectMenuScreen('palette')}
            >
              <Palette size={20} strokeWidth={1.7} />
              <span>Palette</span>
            </button>
          </nav>
        </div>
      )}

      {/* Main Content Area with Screen Routing */}
      <main className="main-content">
        <Screen
          id="timers"
          activeScreen={activeScreen}
          ariaLabel="Timers Screen"
        >
          <TimersScreen
            timers={timers}
            activeTimerId={activeTimer?.id ?? ''}
            allTags={allTags}
            onChooseTimer={handleChooseTimer}
            onCreateNewTimer={() => {
              setEditingTimer(null);
              navigateToScreen('create');
            }}
            onEditTimer={(timer) => {
              setEditingTimer(timer);
              navigateToScreen('create');
            }}
            onDeleteTimer={handleDeleteTimer}
            onOpenImportExport={() => navigateToScreen('import')}
          />
        </Screen>

        <Screen
          id="create"
          activeScreen={activeScreen}
          ariaLabel="Create Timer Screen"
        >
          <CreateTimerScreen
            initialTimer={editingTimer}
            availableTags={allTags}
            onSave={handleSaveTimer}
            onCancel={() => {
              setEditingTimer(null);
              navigateToScreen('timers');
            }}
          />
        </Screen>

        <Screen
          id="import"
          activeScreen={activeScreen}
          ariaLabel="Import and Export Screen"
        >
          <ImportExportScreen
            timers={timers}
            onImportTimers={handleImportTimers}
            onBackToTimers={() => navigateToScreen('timers')}
          />
        </Screen>

        {activeTimer && (
          <Screen
            id="workout"
            activeScreen={activeScreen}
            ariaLabel="Workout Screen"
            lockViewport
          >
            <WorkoutScreen
              timer={activeTimer}
              onBackToTimers={() => navigateToScreen('timers')}
              onWorkoutFinished={handleWorkoutFinished}
            />
          </Screen>
        )}

        <Screen
          id="stats"
          activeScreen={activeScreen}
          ariaLabel="Stats Screen"
        >
          <StatsScreen
            history={history}
            onClearHistory={handleClearHistory}
          />
        </Screen>

        <Screen
          id="palette"
          activeScreen={activeScreen}
          ariaLabel="Palette Screen"
        >
          <PaletteScreen
            activePalette={activePalette}
            customPalettes={customPalettes}
            onSelectPalette={setActivePalette}
            onSaveCustomPalette={handleSaveCustomPalette}
            onDeleteCustomPalette={handleDeleteCustomPalette}
          />
        </Screen>
      </main>
    </div>
  );
};

export default App;
