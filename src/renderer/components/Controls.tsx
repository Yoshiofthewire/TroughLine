import React from 'react';

interface ControlsProps {
  selectedCount: number;
  canSubmit: boolean;
  isPlaying: boolean;
  onShuffle: () => void;
  onDeselectAll: () => void;
  onSubmit: () => void;
}

export const Controls: React.FC<ControlsProps> = ({
  selectedCount,
  canSubmit,
  isPlaying,
  onShuffle,
  onDeselectAll,
  onSubmit,
}) => {
  if (!isPlaying) return null;

  return (
    <div className="controls">
      <button className="controls__btn" onClick={onShuffle}>
        Shuffle
      </button>
      <button
        className="controls__btn"
        onClick={onDeselectAll}
        disabled={selectedCount === 0}
      >
        Deselect All
      </button>
      <button
        className="controls__btn controls__btn--submit"
        onClick={onSubmit}
        disabled={!canSubmit}
      >
        Submit
      </button>
    </div>
  );
};
