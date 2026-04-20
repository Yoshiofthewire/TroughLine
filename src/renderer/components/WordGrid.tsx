import React from 'react';
import { Group } from '../types/puzzle';
import { WordTile } from './WordTile';

interface WordGridProps {
  words: string[];
  selectedWords: string[];
  solvedGroups: Group[];
  onWordClick: (word: string) => void;
}

export const WordGrid: React.FC<WordGridProps> = ({
  words,
  selectedWords,
  solvedGroups,
  onWordClick,
}) => {
  const solvedWords = solvedGroups.flatMap((g) => g.words);
  const remainingWords = words.filter((w) => !solvedWords.includes(w));

  return (
    <div className="word-grid">
      {remainingWords.map((word) => (
        <WordTile
          key={word}
          word={word}
          isSelected={selectedWords.includes(word)}
          isDisabled={false}
          onClick={() => onWordClick(word)}
        />
      ))}
    </div>
  );
};
