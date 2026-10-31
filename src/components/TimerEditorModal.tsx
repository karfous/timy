import React, { useState, useEffect } from 'react';
import { X, Minus, Plus, Check, Timer, Repeat, Tag } from 'lucide-react';
import { TimerDefinition, TimerKind } from '../types/timer';
import { CircularTimeInput } from './CircularTimeInput';
import {
  formatHumanDuration,
  getTotalTimerDurationSec,
} from '../utils/timerEngine';
import { normalizeTags } from '../services/storage';

interface TimerEditorModalProps {
  initialTimer?: TimerDefinition | null;
  availableTags?: string[];
  onSave: (timer: TimerDefinition) => void;
  onClose: () => void;
}

export const TimerEditorModal: React.FC<TimerEditorModalProps> = ({
  initialTimer,
  availableTags = [],
  onSave,
  onClose,
}) => {
  const [kind, setKind] = useState<TimerKind>(initialTimer?.kind ?? 'workout');
  const [name, setName] = useState<string>(initialTimer?.name ?? '');
  const [prepSec, setPrepSec] = useState<number>(initialTimer?.prepSec ?? 5);
  const [tags, setTags] = useState<string[]>(initialTimer?.tags ?? []);
  const [tagInput, setTagInput] = useState<string>('');

  // Simple timer state
  const [durationSec, setDurationSec] = useState<number>(
    initialTimer?.kind === 'simple' ? initialTimer.durationSec : 180
  );

  // Workout timer state: Laps & Rounds per Lap + Work / Short Break / Long Break
  const [laps, setLaps] = useState<number>(
    initialTimer?.kind === 'workout' ? initialTimer.laps : 3
  );
  const [rounds, setRounds] = useState<number>(
    initialTimer?.kind === 'workout' ? initialTimer.rounds ?? 5 : 5
  );
  const [workSec, setWorkSec] = useState<number>(
    initialTimer?.kind === 'workout' ? initialTimer.workSec : 45
  );
  const [breakSec, setBreakSec] = useState<number>(
    initialTimer?.kind === 'workout' ? initialTimer.breakSec : 15
  );
  const [longBreakSec, setLongBreakSec] = useState<number>(
    initialTimer?.kind === 'workout' ? initialTimer.longBreakSec ?? 60 : 60
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleAddTagFromInput = () => {
    if (!tagInput.trim()) return;
    const pieces = tagInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    setTags((prev) => normalizeTags([...prev, ...pieces]));
    setTagInput('');
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddTagFromInput();
    } else if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
      setTags((prev) => prev.slice(0, -1));
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags((prev) =>
      prev.filter((t) => t.toLowerCase() !== tagToRemove.toLowerCase())
    );
  };

  const handleToggleSuggestedTag = (tag: string) => {
    const exists = tags.some((t) => t.toLowerCase() === tag.toLowerCase());
    if (exists) {
      handleRemoveTag(tag);
    } else {
      setTags((prev) => normalizeTags([...prev, tag]));
    }
  };

  const buildDraftTimer = (finalTags: string[]): TimerDefinition => {
    const id =
      initialTimer?.id ??
      `timer-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const createdAt = initialTimer?.createdAt ?? Date.now();
    const cleanName =
      name.trim() ||
      (kind === 'simple'
        ? `Countdown ${formatHumanDuration(durationSec)}`
        : `Workout ${laps}×${rounds} (${formatHumanDuration(workSec)})`);

    if (kind === 'simple') {
      return {
        id,
        name: cleanName,
        kind: 'simple',
        durationSec: Math.max(1, durationSec),
        prepSec: Math.max(0, prepSec),
        tags: finalTags,
        createdAt,
      };
    }

    return {
      id,
      name: cleanName,
      kind: 'workout',
      laps: Math.max(1, laps),
      rounds: Math.max(1, rounds),
      workSec: Math.max(1, workSec),
      breakSec: Math.max(0, breakSec),
      longBreakSec: Math.max(0, longBreakSec),
      prepSec: Math.max(0, prepSec),
      tags: finalTags,
      createdAt,
    };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pendingPieces = tagInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const finalTags = normalizeTags([...tags, ...pendingPieces]);
    onSave(buildDraftTimer(finalTags));
  };

  const totalPreviewSec = getTotalTimerDurationSec(buildDraftTimer(tags));

  const unusedSuggestions = availableTags.filter(
    (sug) => !tags.some((t) => t.toLowerCase() === sug.toLowerCase())
  );

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-panel editor-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="editor-modal-title"
      >
        <div className="modal-header">
          <h3 id="editor-modal-title">
            {initialTimer ? 'Edit Timer' : 'New Timer Definition'}
          </h3>
          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={18} strokeWidth={1.6} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="editor-form">
          {/* Timer Kind Switcher */}
          <div className="segmented-control" role="tablist" aria-label="Timer type">
            <button
              type="button"
              role="tab"
              aria-selected={kind === 'workout'}
              className={`segment-btn ${kind === 'workout' ? 'active' : ''}`}
              onClick={() => setKind('workout')}
            >
              <Repeat size={15} strokeWidth={1.6} />
              <span>Workout Interval</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={kind === 'simple'}
              className={`segment-btn ${kind === 'simple' ? 'active' : ''}`}
              onClick={() => setKind('simple')}
            >
              <Timer size={15} strokeWidth={1.6} />
              <span>Simple Timer</span>
            </button>
          </div>

          {/* Timer Name & Prep Countdown Row */}
          <div className="form-row-grid">
            <label className="field-block">
              <span className="field-label">Timer Name</span>
              <input
                type="text"
                className="text-input"
                placeholder={
                  kind === 'workout' ? 'e.g. Morning HIIT' : 'e.g. Plank Hold'
                }
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>

            <label className="field-block prep-field">
              <span className="field-label">Get Ready (sec)</span>
              <input
                type="number"
                min={0}
                max={60}
                className="text-input"
                value={prepSec}
                onChange={(e) =>
                  setPrepSec(
                    Math.max(0, Math.min(60, parseInt(e.target.value || '0', 10)))
                  )
                }
              />
            </label>
          </div>

          {/* Tags Editor */}
          <div className="field-block">
            <span className="field-label">
              <Tag size={12} style={{ display: 'inline', marginRight: 4 }} />
              Tags
            </span>
            <div className="tags-editor-box">
              {tags.map((tag) => (
                <span key={tag} className="tag-chip editable">
                  <span>#{tag}</span>
                  <button
                    type="button"
                    className="tag-chip-remove"
                    onClick={() => handleRemoveTag(tag)}
                    aria-label={`Remove tag ${tag}`}
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
              <input
                type="text"
                className="tag-inline-input"
                placeholder={
                  tags.length === 0
                    ? 'Add tags (press Enter or comma, e.g. hiit, cardio)...'
                    : 'Add tag...'
                }
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagInputKeyDown}
                aria-label="Add tag"
              />
              {tagInput.trim() && (
                <button
                  type="button"
                  className="btn-ghost small tag-add-btn"
                  onClick={handleAddTagFromInput}
                >
                  <Plus size={13} />
                  <span>Add</span>
                </button>
              )}
            </div>
            {unusedSuggestions.length > 0 && (
              <div className="tag-suggestions-row">
                <span className="field-subtext">Existing tags:</span>
                {unusedSuggestions.map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    className="tag-suggestion-pill"
                    onClick={() => handleToggleSuggestedTag(sug)}
                  >
                    +{sug}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Laps & Rounds Controls for Workout Timers */}
          {kind === 'workout' && (
            <div className="laps-rounds-grid">
              <div className="laps-control-bar">
                <div className="laps-label-col">
                  <span className="field-label">Laps</span>
                  <span className="field-subtext">
                    Long break between laps
                  </span>
                </div>

                <div className="stepper-group">
                  <button
                    type="button"
                    className="stepper-btn"
                    onClick={() => setLaps((l) => Math.max(1, l - 1))}
                    aria-label="Decrease laps"
                  >
                    <Minus size={16} />
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={laps}
                    onChange={(e) =>
                      setLaps(
                        Math.max(1, Math.min(99, parseInt(e.target.value || '1', 10)))
                      )
                    }
                    aria-label="Number of laps"
                    className="laps-number-input"
                  />
                  <button
                    type="button"
                    className="stepper-btn"
                    onClick={() => setLaps((l) => Math.min(99, l + 1))}
                    aria-label="Increase laps"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>

              <div className="laps-control-bar">
                <div className="laps-label-col">
                  <span className="field-label">Rounds per Lap</span>
                  <span className="field-subtext">
                    Short break between rounds
                  </span>
                </div>

                <div className="stepper-group">
                  <button
                    type="button"
                    className="stepper-btn"
                    onClick={() => setRounds((r) => Math.max(1, r - 1))}
                    aria-label="Decrease rounds per lap"
                  >
                    <Minus size={16} />
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={rounds}
                    onChange={(e) =>
                      setRounds(
                        Math.max(1, Math.min(99, parseInt(e.target.value || '1', 10)))
                      )
                    }
                    aria-label="Rounds per lap"
                    className="laps-number-input"
                  />
                  <button
                    type="button"
                    className="stepper-btn"
                    onClick={() => setRounds((r) => Math.min(99, r + 1))}
                    aria-label="Increase rounds per lap"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Concentric Circular Dials */}
          {kind === 'simple' ? (
            <div className="dials-grid single-dial">
              <CircularTimeInput
                label="Countdown Duration"
                valueSec={durationSec}
                minSec={1}
                onChange={setDurationSec}
                accentColorVar="var(--accent-primary)"
              />
            </div>
          ) : (
            <div className="dials-grid triple-dial">
              <CircularTimeInput
                label="Working Time"
                valueSec={workSec}
                minSec={1}
                onChange={setWorkSec}
                accentColorVar="var(--accent-primary)"
              />
              <CircularTimeInput
                label="Short Break (Rounds)"
                valueSec={breakSec}
                minSec={0}
                onChange={setBreakSec}
                accentColorVar="var(--accent-break)"
              />
              <CircularTimeInput
                label="Long Break (Laps)"
                valueSec={longBreakSec}
                minSec={0}
                onChange={setLongBreakSec}
                accentColorVar="var(--accent-warn)"
              />
            </div>
          )}

          {/* Summary Footer */}
          <div className="editor-footer">
            <div className="total-summary">
              <span className="summary-caption">
                {kind === 'workout'
                  ? `Total Duration (${laps} ${laps === 1 ? 'lap' : 'laps'} × ${rounds} ${rounds === 1 ? 'round' : 'rounds'})`
                  : 'Total Duration'}
              </span>
              <strong className="summary-value">
                {formatHumanDuration(totalPreviewSec)}
              </strong>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn-ghost"
                onClick={onClose}
              >
                Cancel
              </button>
              <button type="submit" className="btn-solid">
                <Check size={16} strokeWidth={1.8} />
                <span>Save Timer</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
