import React, { useRef, useState } from 'react';
import {
  Hand,
  Volume2,
  VolumeX,
  Download,
  Upload,
  Check,
  AlertCircle,
  Database,
  CheckCircle2,
} from 'lucide-react';
import { AppBackupPayload, AppSettings, Handedness } from '../types/timer';
import { parseFullBackupJson } from '../services/storage';
import { Card } from '../components/Card';
import { Heading } from '../components/Heading';

export interface SettingsScreenProps {
  settings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => void;
  timersCount: number;
  historyCount: number;
  palettesCount: number;
  onBackup: () => void;
  onRestoreBackup: (backup: AppBackupPayload) => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  settings,
  onUpdateSettings,
  timersCount,
  historyCount,
  palettesCount,
  onBackup,
  onRestoreBackup,
}) => {
  const [feedbackMsg, setFeedbackMsg] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [backedUpRecently, setBackedUpRecently] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleHandednessChange = (handedness: Handedness) => {
    onUpdateSettings({
      ...settings,
      handedness,
    });
  };

  const handleToggleSound = () => {
    onUpdateSettings({
      ...settings,
      soundMuted: !settings.soundMuted,
    });
  };

  const handleBackupClick = () => {
    onBackup();
    setBackedUpRecently(true);
    setFeedbackMsg({
      type: 'success',
      text: 'Backup downloaded successfully! All application data has been exported.',
    });
    setTimeout(() => setBackedUpRecently(false), 3000);
  };

  const handleRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        if (typeof reader.result !== 'string') {
          throw new Error('Failed to read backup file.');
        }
        const parsed = parseFullBackupJson(reader.result);
        onRestoreBackup(parsed);
        setFeedbackMsg({
          type: 'success',
          text: `Backup restored successfully! Loaded ${parsed.timers.length} timer(s) and settings.`,
        });
      } catch (err) {
        setFeedbackMsg({
          type: 'error',
          text: err instanceof Error ? err.message : 'Invalid backup JSON file.',
        });
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    reader.readAsText(file);
  };

  return (
    <Card
      as="section"
      variant="surface"
      className="panel-section settings-screen-panel"
      aria-label="Application Settings"
    >
      {feedbackMsg && (
        <div
          className={`settings-feedback-banner ${feedbackMsg.type === 'success' ? 'success' : 'error'
            }`}
          role="status"
          aria-live="polite"
        >
          {feedbackMsg.type === 'success' ? (
            <CheckCircle2 size={16} strokeWidth={2} />
          ) : (
            <AlertCircle size={16} strokeWidth={2} />
          )}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* Handedness / Layout Orientation */}
      <div className="settings-group">
        <div className="settings-group-header">
          <Heading
            level={3}
            size="sm"
            icon={<Hand size={16} strokeWidth={1.7} />}
            title="Hand Orientation"
            subtitle="Choose your dominant hand. Changes primary button and header hamburger placement for one-handed reach."
            className="settings-group-title"
          />
        </div>

        <div className="handedness-options" role="radiogroup" aria-label="Hand orientation">
          {/* Right Handed (Default) */}
          <Card
            variant="item"
            interactive
            selected={settings.handedness === 'right'}
            className={`handedness-card ${settings.handedness === 'right' ? 'selected' : ''}`}
            onClick={() => handleHandednessChange('right')}
            role="radio"
            aria-checked={settings.handedness === 'right'}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleHandednessChange('right');
              }
            }}
          >
            <div className="handedness-card-header">
              <span className="handedness-name">Right-handed</span>
              <span className="handedness-badge">Default</span>
              {settings.handedness === 'right' && (
                <span className="check-indicator" aria-hidden="true">
                  <Check size={16} strokeWidth={2.2} />
                </span>
              )}
            </div>
            <p className="handedness-desc">
              Primary buttons are aligned to the right side; header hamburger menu is on the top right.
            </p>
          </Card>

          {/* Left Handed */}
          <Card
            variant="item"
            interactive
            selected={settings.handedness === 'left'}
            className={`handedness-card ${settings.handedness === 'left' ? 'selected' : ''}`}
            onClick={() => handleHandednessChange('left')}
            role="radio"
            aria-checked={settings.handedness === 'left'}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleHandednessChange('left');
              }
            }}
          >
            <div className="handedness-card-header">
              <span className="handedness-name">Left-handed</span>
              {settings.handedness === 'left' && (
                <span className="check-indicator" aria-hidden="true">
                  <Check size={16} strokeWidth={2.2} />
                </span>
              )}
            </div>
            <p className="handedness-desc">
              Primary buttons are aligned to the left side; header hamburger menu moves to the top left.
            </p>
          </Card>
        </div>
      </div>

      {/* Audio Preferences */}
      <div className="settings-group">
        <div className="settings-group-header">
          <Heading
            level={3}
            size="sm"
            icon={
              settings.soundMuted ? (
                <VolumeX size={16} strokeWidth={1.7} />
              ) : (
                <Volume2 size={16} strokeWidth={1.7} />
              )
            }
            title="Audio & Beeps"
            subtitle="Audio beeps during 5-second countdowns and phase transitions."
            className="settings-group-title"
          />
        </div>

        <div className="settings-toggle-row">
          <div className="settings-toggle-info">
            <span className="toggle-label">Workout Sound Effects</span>
            <span className="toggle-sublabel">
              {settings.soundMuted
                ? 'Sound is currently muted'
                : 'Plays alert beeps at 5, 4, 3, 2, 1s and phase changes'}
            </span>
          </div>
          <button
            type="button"
            className={`btn-ghost small ${settings.soundMuted ? '' : 'active-toggle'}`}
            onClick={handleToggleSound}
            aria-pressed={!settings.soundMuted}
            aria-label="Toggle workout sound effects"
          >
            {settings.soundMuted ? (
              <>
                <VolumeX size={15} strokeWidth={1.8} />
                <span>Muted</span>
              </>
            ) : (
              <>
                <Volume2 size={15} strokeWidth={1.8} />
                <span>Enabled</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Backup & Export Everything */}
      <div className="settings-group">
        <div className="settings-group-header">
          <Heading
            level={3}
            size="sm"
            icon={<Database size={16} strokeWidth={1.7} />}
            title="Backup & Restore"
            subtitle="Export all timers, custom palettes, workout history, and settings at once."
            className="settings-group-title"
          />
        </div>

        <Card variant="item" className="backup-panel-card">
          <div className="backup-stats-row">
            <div className="backup-stat-pill">
              <strong>{timersCount}</strong>
              <span>Timers</span>
            </div>
            <div className="backup-stat-pill">
              <strong>{palettesCount}</strong>
              <span>Custom Palettes</span>
            </div>
            <div className="backup-stat-pill">
              <strong>{historyCount}</strong>
              <span>Completed Runs</span>
            </div>
          </div>

          <div className="backup-action-bar">
            <label className="btn-ghost small restore-label-btn" title="Restore data from a backup JSON file">
              <Upload size={14} strokeWidth={1.8} />
              <span>Restore Backup</span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleRestoreFile}
                className="hidden-file-input"
                aria-label="Restore backup from file"
              />
            </label>

            <button
              type="button"
              className="btn-solid backup-btn"
              onClick={handleBackupClick}
              title="Export all data at once to a JSON file"
            >
              {backedUpRecently ? (
                <>
                  <Check size={16} strokeWidth={2} />
                  <span>Backup Saved!</span>
                </>
              ) : (
                <>
                  <Download size={16} strokeWidth={1.8} />
                  <span>Backup</span>
                </>
              )}
            </button>
          </div>
        </Card>
      </div>
    </Card>
  );
};

