import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Edit3,
  Trash2,
  FileJson,
  Activity,
  Palette,
  Timer as TimerIcon,
  Repeat,
  Clock,
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
  saveAudioMuted,
} from './services/storage';
import { soundEngine } from './services/audio';
import {
  formatHumanDuration,
  getTotalTimerDurationSec,
} from './utils/timerEngine';
import { ActiveTimerRunner } from './components/ActiveTimerRunner';
import { TimerEditorModal } from './components/TimerEditorModal';
import { PaletteEditor } from './components/PaletteEditor';
import { StatsAndHistory } from './components/StatsAndHistory';
import { ImportExportModal } from './components/ImportExportModal';

type ActiveView = 'workout' | 'stats' | 'palette';

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
  const [muted, setMuted] = useState<boolean>(() => {
    const initialMuted = loadAudioMuted();
    soundEngine.setMuted(initialMuted);
    return initialMuted;
  });

  const [activeView, setActiveView] = useState<ActiveView>('workout');
  const [editingTimer, setEditingTimer] = useState<TimerDefinition | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);

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

  const activeTimer =
    timers.find((t) => t.id === activeTimerId) ?? timers[0];

  const handleToggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      soundEngine.setMuted(next);
      saveAudioMuted(next);
      return next;
    });
  }, []);

  const handleSaveTimer = (saved: TimerDefinition) => {
    setTimers((prev) => {
      const exists = prev.some((t) => t.id === saved.id);
      if (exists) {
        return prev.map((t) => (t.id === saved.id ? saved : t));
      }
      return [saved, ...prev];
    });
    setActiveTimerId(saved.id);
    setIsEditorOpen(false);
    setEditingTimer(null);
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

  return (
    <div className="app-shell">
      {/* Minimalist Top Bar */}
      <header className="top-bar">
        <div className="brand-block">
          <span className="brand-dot" />
          <h1 className="brand-title">PULSE</h1>
          <span className="brand-tag">WORKOUT TIMER</span>
        </div>

        <nav className="main-nav" aria-label="Main navigation">
          <button
            type="button"
            className={`nav-tab ${activeView === 'workout' ? 'active' : ''}`}
            onClick={() => setActiveView('workout')}
          >
            <TimerIcon size={16} strokeWidth={1.6} />
            <span>Timer</span>
          </button>
          <button
            type="button"
            className={`nav-tab ${activeView === 'stats' ? 'active' : ''}`}
            onClick={() => setActiveView('stats')}
          >
            <Activity size={16} strokeWidth={1.6} />
            <span>History & Stats</span>
            {history.length > 0 && (
              <span className="nav-badge">{history.length}</span>
            )}
          </button>
          <button
            type="button"
            className={`nav-tab ${activeView === 'palette' ? 'active' : ''}`}
            onClick={() => setActiveView('palette')}
          >
            <Palette size={16} strokeWidth={1.6} />
            <span>Palette</span>
          </button>
        </nav>
      </header>

      {/* Main Content Area */}
      <main className="main-content">
        {activeView === 'workout' && activeTimer && (
          <div className="workout-layout">
            {/* Active Timer Runner */}
            <ActiveTimerRunner
              timer={activeTimer}
              muted={muted}
              onToggleMute={handleToggleMute}
              onWorkoutFinished={handleWorkoutFinished}
            />

            {/* Saved Timers Sidebar */}
            <aside className="presets-sidebar" aria-label="Saved Timers">
              <div className="sidebar-header">
                <h2 className="sidebar-title">Saved Timers</h2>
                <div className="sidebar-actions">
                  <button
                    type="button"
                    className="btn-ghost small"
                    onClick={() => setIsImportExportOpen(true)}
                    title="Export or Import JSON"
                  >
                    <FileJson size={15} strokeWidth={1.6} />
                    <span>JSON</span>
                  </button>
                  <button
                    type="button"
                    className="btn-solid small"
                    onClick={() => {
                      setEditingTimer(null);
                      setIsEditorOpen(true);
                    }}
                  >
                    <Plus size={15} strokeWidth={1.8} />
                    <span>New Timer</span>
                  </button>
                </div>
              </div>

              <ul className="presets-list">
                {timers.map((item) => {
                  const isSelected = item.id === activeTimer.id;
                  const totalSec = getTotalTimerDurationSec(item);
                  return (
                    <li
                      key={item.id}
                      className={`preset-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => setActiveTimerId(item.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setActiveTimerId(item.id);
                        }
                      }}
                    >
                      <div className="preset-card-main">
                        <div className="preset-title-row">
                          <span className="preset-kind-icon">
                            {item.kind === 'workout' ? (
                              <Repeat size={14} strokeWidth={1.7} />
                            ) : (
                              <Clock size={14} strokeWidth={1.7} />
                            )}
                          </span>
                          <span className="preset-name">{item.name}</span>
                        </div>

                        <div className="preset-details">
                          {item.kind === 'workout' ? (
                            <>
                              <span>{item.laps} laps</span>
                              <span>·</span>
                              <span className="work-tag">
                                {formatHumanDuration(item.workSec)} work
                              </span>
                              <span>/</span>
                              <span className="break-tag">
                                {formatHumanDuration(item.breakSec)} rest
                              </span>
                            </>
                          ) : (
                            <span>
                              Simple · {formatHumanDuration(item.durationSec)}
                            </span>
                          )}
                          <span>·</span>
                          <span>Total {formatHumanDuration(totalSec)}</span>
                        </div>
                      </div>

                      <div
                        className="preset-card-actions"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          className="icon-btn small"
                          aria-label={`Edit ${item.name}`}
                          title="Edit timer"
                          onClick={() => {
                            setEditingTimer(item);
                            setIsEditorOpen(true);
                          }}
                        >
                          <Edit3 size={14} strokeWidth={1.6} />
                        </button>
                        {timers.length > 1 && (
                          <button
                            type="button"
                            className="icon-btn small danger-hover"
                            aria-label={`Delete ${item.name}`}
                            title="Delete timer"
                            onClick={() => handleDeleteTimer(item.id)}
                          >
                            <Trash2 size={14} strokeWidth={1.6} />
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </aside>
          </div>
        )}

        {activeView === 'stats' && (
          <StatsAndHistory
            history={history}
            onClearHistory={handleClearHistory}
          />
        )}

        {activeView === 'palette' && (
          <PaletteEditor
            activePalette={activePalette}
            customPalettes={customPalettes}
            onSelectPalette={setActivePalette}
            onSaveCustomPalette={handleSaveCustomPalette}
            onDeleteCustomPalette={handleDeleteCustomPalette}
          />
        )}
      </main>

      {/* Modals */}
      {isEditorOpen && (
        <TimerEditorModal
          initialTimer={editingTimer}
          onSave={handleSaveTimer}
          onClose={() => {
            setIsEditorOpen(false);
            setEditingTimer(null);
          }}
        />
      )}

      {isImportExportOpen && (
        <ImportExportModal
          timers={timers}
          onImportTimers={handleImportTimers}
          onClose={() => setIsImportExportOpen(false)}
        />
      )}
    </div>
  );
};

export default App;

