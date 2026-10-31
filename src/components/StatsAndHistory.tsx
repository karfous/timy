import React from 'react';
import {
  Activity,
  Clock,
  Award,
  Flame,
  Trash2,
  CheckCircle2,
  StopCircle,
} from 'lucide-react';
import { WorkoutHistoryEntry } from '../types/timer';
import { computeWorkoutStats } from '../services/storage';
import { formatHumanDuration } from '../utils/timerEngine';

interface StatsAndHistoryProps {
  history: WorkoutHistoryEntry[];
  onClearHistory: () => void;
}

export const StatsAndHistory: React.FC<StatsAndHistoryProps> = ({
  history,
  onClearHistory,
}) => {
  const stats = computeWorkoutStats(history);

  const formatTimestamp = (ts: number) => {
    try {
      return new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(ts));
    } catch {
      return new Date(ts).toLocaleString();
    }
  };

  return (
    <section className="panel-section" aria-label="Workout Statistics and History">
      <div className="section-header">
        <div>
          <h2 className="section-title">
            <Activity size={18} strokeWidth={1.6} />
            <span>Workout Stats & History</span>
          </h2>
          <p className="section-subtitle">
            Automatically saved in localStorage after every run.
          </p>
        </div>

        {history.length > 0 && (
          <button
            type="button"
            className="btn-ghost small danger-hover"
            onClick={onClearHistory}
          >
            <Trash2 size={14} strokeWidth={1.6} />
            <span>Clear History</span>
          </button>
        )}
      </div>

      {/* Stats Summary Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            <Award size={18} strokeWidth={1.6} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.totalRuns}</span>
            <span className="stat-label">
              Total Runs ({stats.completedRuns} finished)
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <Clock size={18} strokeWidth={1.6} />
          </div>
          <div className="stat-info">
            <span className="stat-value">
              {formatHumanDuration(stats.totalActiveSec)}
            </span>
            <span className="stat-label">Total Active Time</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <Flame size={18} strokeWidth={1.6} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.totalLapsCompleted}</span>
            <span className="stat-label">Total Laps Completed</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <Activity size={18} strokeWidth={1.6} />
          </div>
          <div className="stat-info">
            <span className="stat-value">
              {formatHumanDuration(stats.todayActiveSec)}
            </span>
            <span className="stat-label">
              Today ({stats.todayRuns} {stats.todayRuns === 1 ? 'run' : 'runs'})
            </span>
          </div>
        </div>
      </div>

      {/* History List */}
      <div className="history-list-container">
        <h3 className="subsection-title">Recent Sessions</h3>
        {history.length === 0 ? (
          <div className="empty-state">
            <p>No workout runs recorded yet. Start any timer to log your first session!</p>
          </div>
        ) : (
          <ul className="history-list">
            {history.map((entry) => (
              <li key={entry.id} className="history-item">
                <div className="history-item-left">
                  <span
                    className={`history-status-dot ${
                      entry.completedFully ? 'complete' : 'partial'
                    }`}
                    title={
                      entry.completedFully ? 'Completed full timer' : 'Partial session'
                    }
                  >
                    {entry.completedFully ? (
                      <CheckCircle2 size={16} strokeWidth={1.7} />
                    ) : (
                      <StopCircle size={16} strokeWidth={1.7} />
                    )}
                  </span>
                  <div>
                    <div className="history-timer-name">{entry.timerName}</div>
                    <div className="history-meta">
                      <span>{formatTimestamp(entry.completedAt)}</span>
                      <span>·</span>
                      <span>
                        {entry.kind === 'workout'
                          ? `${entry.lapsCompleted}/${entry.totalLaps} laps`
                          : entry.completedFully
                          ? 'Completed'
                          : 'Stopped early'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="history-duration-badge">
                  {formatHumanDuration(entry.totalElapsedSec)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};

