import React, { useMemo, useState } from 'react';
import {
  Plus,
  Edit3,
  Trash2,
  FileJson,
  Repeat,
  Clock,
  Tag,
  Play,
} from 'lucide-react';
import { TimerDefinition } from '../types/timer';
import {
  formatHumanDuration,
  getTotalTimerDurationSec,
} from '../utils/timerEngine';

export interface TimersScreenProps {
  timers: TimerDefinition[];
  activeTimerId: string;
  allTags: string[];
  onChooseTimer: (id: string) => void;
  onCreateNewTimer: () => void;
  onEditTimer: (timer: TimerDefinition) => void;
  onDeleteTimer: (id: string) => void;
  onOpenImportExport: () => void;
}

export const TimersScreen: React.FC<TimersScreenProps> = ({
  timers,
  activeTimerId,
  allTags,
  onChooseTimer,
  onCreateNewTimer,
  onEditTimer,
  onDeleteTimer,
  onOpenImportExport,
}) => {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const filteredTimers = useMemo(() => {
    if (selectedTags.length === 0) return timers;
    return timers.filter((timer) => {
      const timerTagsLower = (timer.tags ?? []).map((t) => t.toLowerCase());
      return selectedTags.every((sel) =>
        timerTagsLower.includes(sel.toLowerCase())
      );
    });
  }, [timers, selectedTags]);

  const handleToggleTagFilter = (tag: string) => {
    setSelectedTags((prev) => {
      const exists = prev.some((t) => t.toLowerCase() === tag.toLowerCase());
      if (exists) {
        return prev.filter((t) => t.toLowerCase() !== tag.toLowerCase());
      }
      return [...prev, tag];
    });
  };

  return (
    <section className="timers-screen-panel" aria-label="Saved Timers">
      <div className="sidebar-header">
        <div>
          <h2 className="sidebar-title">Saved Timers</h2>
          <p className="section-subtitle">
            Choose a timer to launch the workout screen
          </p>
        </div>
        <div className="sidebar-actions">
          <button
            type="button"
            className="btn-ghost small"
            onClick={onOpenImportExport}
            title="Export or Import JSON"
          >
            <FileJson size={15} strokeWidth={1.6} />
            <span>JSON</span>
          </button>
          <button
            type="button"
            className="btn-solid small"
            onClick={onCreateNewTimer}
          >
            <Plus size={15} strokeWidth={1.8} />
            <span>New Timer</span>
          </button>
        </div>
      </div>

      {allTags.length > 0 && (
        <div className="tags-filter-bar" aria-label="Filter timers by tag">
          <button
            type="button"
            className={`tag-filter-pill ${
              selectedTags.length === 0 ? 'active' : ''
            }`}
            onClick={() => setSelectedTags([])}
          >
            All ({timers.length})
          </button>
          {allTags.map((tag) => {
            const isTagSelected = selectedTags.some(
              (t) => t.toLowerCase() === tag.toLowerCase()
            );
            return (
              <button
                key={tag}
                type="button"
                className={`tag-filter-pill ${isTagSelected ? 'active' : ''}`}
                onClick={() => handleToggleTagFilter(tag)}
              >
                <Tag size={11} strokeWidth={1.7} />
                <span>{tag}</span>
              </button>
            );
          })}
        </div>
      )}

      {filteredTimers.length === 0 ? (
        <div className="empty-state small">
          <p>No timers match the selected tag filter.</p>
          <button
            type="button"
            className="btn-ghost small"
            style={{ marginTop: '0.5rem' }}
            onClick={() => setSelectedTags([])}
          >
            Clear tag filter
          </button>
        </div>
      ) : (
        <ul className="presets-list timers-grid-list">
          {filteredTimers.map((item) => {
            const isSelected = item.id === activeTimerId;
            const totalSec = getTotalTimerDurationSec(item);
            const roundsPerLap =
              item.kind === 'workout' ? item.rounds ?? 1 : 1;
            return (
              <li
                key={item.id}
                className={`preset-card ${isSelected ? 'selected' : ''}`}
                onClick={() => onChooseTimer(item.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onChooseTimer(item.id);
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
                        <span>
                          {item.laps} {item.laps === 1 ? 'lap' : 'laps'} ×{' '}
                          {roundsPerLap}{' '}
                          {roundsPerLap === 1 ? 'round' : 'rounds'}
                        </span>
                        <span>·</span>
                        <span className="work-tag">
                          {formatHumanDuration(item.workSec)} work
                        </span>
                        <span>/</span>
                        <span className="break-tag">
                          {formatHumanDuration(item.breakSec)} short
                        </span>
                        {item.longBreakSec ? (
                          <>
                            <span>/</span>
                            <span className="long-break-tag">
                              {formatHumanDuration(item.longBreakSec)} long
                            </span>
                          </>
                        ) : null}
                      </>
                    ) : (
                      <span>
                        Simple · {formatHumanDuration(item.durationSec)}
                      </span>
                    )}
                    <span>·</span>
                    <span>Total {formatHumanDuration(totalSec)}</span>
                  </div>

                  {item.tags && item.tags.length > 0 && (
                    <div
                      className="preset-tags-row"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {item.tags.map((tag) => {
                        const isActiveFilter = selectedTags.some(
                          (t) => t.toLowerCase() === tag.toLowerCase()
                        );
                        return (
                          <button
                            key={tag}
                            type="button"
                            className={`tag-chip interactive ${
                              isActiveFilter ? 'active' : ''
                            }`}
                            onClick={() => handleToggleTagFilter(tag)}
                            title={`Filter by #${tag}`}
                          >
                            #{tag}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div
                  className="preset-card-actions"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    className="icon-btn small"
                    aria-label={`Start ${item.name}`}
                    title="Open workout screen"
                    onClick={() => onChooseTimer(item.id)}
                  >
                    <Play size={13} strokeWidth={1.8} />
                  </button>
                  <button
                    type="button"
                    className="icon-btn small"
                    aria-label={`Edit ${item.name}`}
                    title="Edit timer"
                    onClick={() => onEditTimer(item)}
                  >
                    <Edit3 size={14} strokeWidth={1.6} />
                  </button>
                  {timers.length > 1 && (
                    <button
                      type="button"
                      className="icon-btn small danger-hover"
                      aria-label={`Delete ${item.name}`}
                      title="Delete timer"
                      onClick={() => onDeleteTimer(item.id)}
                    >
                      <Trash2 size={14} strokeWidth={1.6} />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

