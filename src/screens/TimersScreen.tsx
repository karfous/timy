import React, { useMemo, useRef, useState } from 'react';
import {
  Plus,
  Edit3,
  Trash2,
  FileJson,
  Repeat,
  Clock,
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

const SWIPE_THRESHOLD = 70;

interface SwipeableTimerTileProps {
  timer: TimerDefinition;
  isSelected: boolean;
  canDelete: boolean;
  selectedTags: string[];
  onChooseTimer: (id: string) => void;
  onEditTimer: (timer: TimerDefinition) => void;
  onDeleteTimer: (id: string) => void;
  onToggleTag: (tag: string) => void;
}

export const SwipeableTimerTile: React.FC<SwipeableTimerTileProps> = ({
  timer,
  isSelected,
  canDelete,
  selectedTags,
  onChooseTimer,
  onEditTimer,
  onDeleteTimer,
  onToggleTag,
}) => {
  const [offsetX, setOffsetX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isHorizontalGesture = useRef<boolean | null>(null);
  const suppressClick = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length > 1) return;
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isHorizontalGesture.current = null;
    suppressClick.current = false;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isHorizontalGesture.current === false) return; // Vertical scroll, ignore

    const deltaX = e.touches[0].clientX - touchStartX.current;
    const deltaY = e.touches[0].clientY - touchStartY.current;

    // Determine direction on first significant movement
    if (isHorizontalGesture.current === null) {
      if (Math.abs(deltaY) > 8 && Math.abs(deltaY) > Math.abs(deltaX)) {
        isHorizontalGesture.current = false;
        setIsDragging(false);
        setOffsetX(0);
        return;
      }
      if (Math.abs(deltaX) > 8 && Math.abs(deltaX) > Math.abs(deltaY)) {
        isHorizontalGesture.current = true;
        suppressClick.current = true;
      }
    }

    if (isHorizontalGesture.current === true) {
      if (deltaX > 0) {
        // Swiping right: Edit
        setOffsetX(Math.min(deltaX, 130));
      } else {
        // Swiping left: Delete
        if (!canDelete) {
          // Damped resistance if delete is disabled (e.g. only 1 timer remaining)
          setOffsetX(Math.max(deltaX * 0.15, -25));
        } else {
          setOffsetX(Math.max(deltaX, -130));
        }
      }
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    if (isHorizontalGesture.current === true) {
      if (offsetX >= SWIPE_THRESHOLD) {
        onEditTimer(timer);
      } else if (offsetX <= -SWIPE_THRESHOLD && canDelete) {
        onDeleteTimer(timer.id);
      }
      setTimeout(() => {
        suppressClick.current = false;
      }, 150);
    }
    setOffsetX(0);
    isHorizontalGesture.current = null;
  };

  const handleTouchCancel = () => {
    setIsDragging(false);
    setOffsetX(0);
    isHorizontalGesture.current = null;
    suppressClick.current = false;
  };

  const handleClick = () => {
    if (suppressClick.current) {
      return;
    }
    onChooseTimer(timer.id);
  };

  return (
    <li className="preset-card-swipe-container">
      <div
        className={`preset-swipe-backdrop ${
          offsetX > 0
            ? 'swipe-active-edit'
            : offsetX < 0
            ? 'swipe-active-delete'
            : ''
        }`}
        aria-hidden="true"
      >
        <div
          className={`swipe-action-hint swipe-hint-left ${
            offsetX >= SWIPE_THRESHOLD ? 'hint-ready' : ''
          }`}
        >
          <Edit3 size={18} strokeWidth={2} />
          <span>Edit</span>
        </div>
        <div
          className={`swipe-action-hint swipe-hint-right ${
            offsetX <= -SWIPE_THRESHOLD && canDelete ? 'hint-ready' : ''
          }`}
        >
          <span>{canDelete ? 'Delete' : 'Cannot delete'}</span>
          <Trash2 size={18} strokeWidth={2} />
        </div>
      </div>

      <Card
        as="div"
        variant="item"
        interactive
        selected={isSelected}
        className="preset-card"
        style={{
          transform: offsetX !== 0 ? `translateX(${offsetX}px)` : undefined,
          transition: isDragging
            ? 'none'
            : 'transform 0.22s cubic-bezier(0.2, 0.9, 0.4, 1.1)',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onChooseTimer(timer.id);
          }
        }}
      >
        <div className="preset-card-main">
          <Heading
            level={3}
            size="sm"
            icon={
              <span className="preset-kind-icon">
                {timer.kind === 'workout' ? (
                  <Repeat size={14} strokeWidth={1.7} />
                ) : (
                  <Clock size={14} strokeWidth={1.7} />
                )}
              </span>
            }
            title={timer.name}
            className="preset-title-row"
            titleClassName="preset-name"
          />

          <div className="preset-details">
            <TimerInfo timer={timer} />
          </div>

          <TagList
            tags={timer.tags}
            selectedTags={selectedTags}
            onToggleTag={onToggleTag}
          />
        </div>

        <div
          className="preset-card-actions"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="icon-btn"
            aria-label={`Edit ${timer.name}`}
            title="Edit timer"
            onClick={() => onEditTimer(timer)}
          >
            <Edit3 size={15} strokeWidth={1.7} />
          </button>
          {canDelete && (
            <button
              type="button"
              className="icon-btn danger-hover"
              aria-label={`Delete ${timer.name}`}
              title="Delete timer"
              onClick={() => onDeleteTimer(timer.id)}
            >
              <Trash2 size={15} strokeWidth={1.7} />
            </button>
          )}
        </div>
      </Card>
    </li>
  );
};

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
      <div className="sidebar-header">
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
          {filteredTimers.map((item) => (
            <SwipeableTimerTile
              key={item.id}
              timer={item}
              isSelected={item.id === activeTimerId}
              canDelete={timers.length > 1}
              selectedTags={selectedTags}
              onChooseTimer={onChooseTimer}
              onEditTimer={onEditTimer}
              onDeleteTimer={onDeleteTimer}
              onToggleTag={handleToggleTagFilter}
            />
          ))}
        </ul>
      )}
    </Card>
  );
};
