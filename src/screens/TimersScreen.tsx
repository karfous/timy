import React, { useMemo, useState } from 'react';
import {
  Plus,
  Edit3,
  Trash2,
  FileJson,
  Repeat,
  Clock,
  Play,
} from 'lucide-react';
import { TimerDefinition } from '../types/timer';
import { Card } from '../components/Card';
import { Heading } from '../components/Heading';
import { TagFilterBar, TagList } from '../components/Tags';
import { TimerInfo } from '../components/TimerInfo';

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
    <Card
      as="section"
      variant="surface"
      className="timers-screen-panel"
      aria-label="Saved Timers"
    >
      <Heading
        level={2}
        size="md"
        title="Saved Timers"
        subtitle="Choose a timer to launch the workout screen"
        className="sidebar-header"
        titleClassName="sidebar-title"
        actions={
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
        }
      />

      <TagFilterBar
        allTags={allTags}
        selectedTags={selectedTags}
        totalCount={timers.length}
        onToggleTag={handleToggleTagFilter}
        onClearTags={() => setSelectedTags([])}
      />

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
            return (
              <Card
                as="li"
                key={item.id}
                variant="item"
                interactive
                selected={isSelected}
                className="preset-card"
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
                  <Heading
                    level={3}
                    size="sm"
                    icon={
                      <span className="preset-kind-icon">
                        {item.kind === 'workout' ? (
                          <Repeat size={14} strokeWidth={1.7} />
                        ) : (
                          <Clock size={14} strokeWidth={1.7} />
                        )}
                      </span>
                    }
                    title={item.name}
                    className="preset-title-row"
                    titleClassName="preset-name"
                  />

                  <div className="preset-details">
                    <TimerInfo timer={item} />
                  </div>

                  <TagList
                    tags={item.tags}
                    selectedTags={selectedTags}
                    onToggleTag={handleToggleTagFilter}
                  />
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
              </Card>
            );
          })}
        </ul>
      )}
    </Card>
  );
};
