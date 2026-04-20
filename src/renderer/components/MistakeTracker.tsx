import React from 'react';

interface MistakeTrackerProps {
  mistakesRemaining: number;
  maxMistakes: number;
}

export const MistakeTracker: React.FC<MistakeTrackerProps> = ({
  mistakesRemaining,
  maxMistakes,
}) => {
  return (
    <div className="mistake-tracker">
      <span className="mistake-tracker__label">Mistakes remaining:</span>
      <div className="mistake-tracker__dots">
        {Array.from({ length: maxMistakes }).map((_, i) => (
          <span
            key={i}
            className={`mistake-tracker__dot ${
              i < mistakesRemaining ? 'mistake-tracker__dot--active' : ''
            }`}
          />
        ))}
      </div>
    </div>
  );
};
