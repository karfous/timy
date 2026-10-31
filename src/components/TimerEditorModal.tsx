import React, { useState, useEffect } from 'react';
import { X, Minus, Plus, Check, Timer, Repeat } from 'lucide-react';
import { TimerDefinition, TimerKind } from '../types/timer';
import { CircularTimeInput } from './CircularTimeInput';
import { formatHumanDuration } from '../utils/timerEngine';

interface TimerEditorModalProps {
  initialTimer?: TimerDefinition | null;
  onSave: (timer: TimerDefinition) => void;
  onClose: () => void;
}

export const TimerEditorModal: React.FC<TimerEditorModalProps> = ({
  initialTimer,
  onSave,
  onClose,
}) => {
  const [kind, setKind] = useState<TimerKind>(initialTimer?.kind ?? 'workout');
  const [name, setName] = useState<string>(initialTimer?.name ?? '');
  const [prepSec, setPrepSec] = useState<number>(initialTimer?.prepSec ?? 5);

  // Simple timer state
  const [durationSec, setDurationSec] = useState<number>(
    initialTimer?.kind === 'simple' ? initialTimer.durationSec : 180
  );

  // Workout timer state
  const [laps, setLaps] = useState<number>(
    initialTimer?.kind === 'workout' ? initialTimer.laps : 6
  );
  const [workSec, setWorkSec] = useState<number>(
    initialTimer?.kind === 'workout' ? initialTimer.workSec : 45
  );
  const [breakSec, setBreakSec] = useState<number>(
    initialTimer?.kind === 'workout' ? initialTimer.breakSec : 15
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const id =
      initialTimer?.id ??
      `timer-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const createdAt = initialTimer?.createdAt ?? Date.now();
    const cleanName =
      name.trim() ||
      (kind === 'simple'
        ? `Countdown ${formatHumanDuration(durationSec)}`
        : `Workout ${laps}×(${formatHumanDuration(workSec)}/${formatHumanDuration(breakSec)})`);

    if (kind === 'simple') {
      onSave({
        id,
        name: cleanName,
        kind: 'simple',
        durationSec: Math.max(1, durationSec),
        prepSec: Math.max(0, prepSec),
        createdAt,
      });
    } else {
      onSave({
        id,
        name: cleanName,
        kind: 'workout',
        laps: Math.max(1, laps),
        workSec: Math.max(1, workSec),
        breakSec: Math.max(0, breakSec),
        prepSec: Math.max(0, prepSec),
        createdAt,
      });
    }
  };

  const totalPreviewSec =
    kind === 'simple'
      ? prepSec + durationSec
      : prepSec + laps * (workSec + breakSec);

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
                  setPrepSec(Math.max(0, Math.min(60, parseInt(e.target.value || '0', 10))))
                }
              />
            </label>
          </div>

          {kind === 'workout' && (
            <div className="laps-control-bar">
              <div className="laps-label-col">
                <span className="field-label">Number of Laps (Rounds)</span>
                <span className="field-subtext">
                  5s countdown beeps play before every round
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
                    setLaps(Math.max(1, Math.min(99, parseInt(e.target.value || '1', 10))))
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
            <div className="dials-grid dual-dial">
              <CircularTimeInput
                label="Working Time"
                valueSec={workSec}
                minSec={1}
                onChange={setWorkSec}
                accentColorVar="var(--accent-primary)"
              />
              <CircularTimeInput
                label="Break Time"
                valueSec={breakSec}
                minSec={0}
                onChange={setBreakSec}
                accentColorVar="var(--accent-break)"
              />
            </div>
          )}

          {/* Summary Footer */}
          <div className="editor-footer">
            <div className="total-summary">
              <span className="summary-caption">Total Duration</span>
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

