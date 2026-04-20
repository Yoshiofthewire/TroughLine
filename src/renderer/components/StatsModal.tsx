import React from 'react';
import { Stats } from '../hooks/useStats';

interface StatsModalProps {
  stats: Stats;
  onClose: () => void;
}

export const StatsModal: React.FC<StatsModalProps> = ({ stats, onClose }) => {
  const winPct =
    stats.gamesPlayed > 0
      ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100)
      : 0;

  const maxDist = Math.max(...Object.values(stats.guessDistribution), 1);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal__title">Statistics</h2>

        <div className="stats-summary">
          <div className="stats-summary__item">
            <span className="stats-summary__value">{stats.gamesPlayed}</span>
            <span className="stats-summary__label">Played</span>
          </div>
          <div className="stats-summary__item">
            <span className="stats-summary__value">{winPct}</span>
            <span className="stats-summary__label">Win %</span>
          </div>
          <div className="stats-summary__item">
            <span className="stats-summary__value">{stats.currentStreak}</span>
            <span className="stats-summary__label">Current Streak</span>
          </div>
          <div className="stats-summary__item">
            <span className="stats-summary__value">{stats.maxStreak}</span>
            <span className="stats-summary__label">Max Streak</span>
          </div>
        </div>

        <div className="stats-distribution">
          <h3 className="stats-distribution__title">Mistake Distribution</h3>
          {[0, 1, 2, 3, 4].map((mistakes) => {
            const count = stats.guessDistribution[mistakes] ?? 0;
            const width = Math.max((count / maxDist) * 100, 8);
            return (
              <div key={mistakes} className="stats-distribution__row">
                <span className="stats-distribution__label">{mistakes}</span>
                <div className="stats-distribution__bar-bg">
                  <div
                    className="stats-distribution__bar"
                    style={{ width: `${width}%` }}
                  >
                    {count}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="modal__actions">
          <button className="controls__btn controls__btn--submit" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
