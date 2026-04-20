import React from 'react';
import { DifficultyColor, COLOR_HEX } from '../types/puzzle';

interface WordTileProps {
  word: string;
  isSelected: boolean;
  isDisabled: boolean;
  onClick: () => void;
}

export const WordTile: React.FC<WordTileProps> = ({
  word,
  isSelected,
  isDisabled,
  onClick,
}) => {
  if (isDisabled) return null;

  return (
    <button
      className={`word-tile ${isSelected ? 'word-tile--selected' : ''}`}
      onClick={onClick}
      disabled={isDisabled}
    >
      {word}
    </button>
  );
};
