import React from 'react';
import { Group, COLOR_HEX, DifficultyColor } from '../types/puzzle';
import { SolvedGroup } from './SolvedGroup';

interface GameOverModalProps {
  status: 'won' | 'lost';
  groups: Group[];
  solvedGroups: Group[];
  guessHistory: string[][];
  onNewGame: () => void;
}

const EMOJI_MAP: Record<DifficultyColor, string> = {
  yellow: '🟨',
  green: '🟩',
  blue: '🟦',
  purple: '🟪',
};

function buildShareText(groups: Group[], guessHistory: string[][]): string {
  const lines = guessHistory.map((guess) => {
    return guess
      .map((word) => {
        const group = groups.find((g) => g.words.includes(word));
        return group ? EMOJI_MAP[group.color] : '⬜';
      })
      .join('');
  });
  return `TroughLine\n${lines.join('\n')}`;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  status,
  groups,
  solvedGroups,
  guessHistory,
  onNewGame,
}) => {
  const unsolvedGroups = groups.filter(
    (g) => !solvedGroups.some((sg) => sg.name === g.name)
  );
  const allGroupsSorted = [...groups].sort((a, b) => a.difficulty - b.difficulty);

  const handleShare = () => {
    const text = buildShareText(groups, guessHistory);
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2 className="modal__title">
          {status === 'won' ? 'Congratulations!' : 'Better luck next time'}
        </h2>

        {status === 'lost' && unsolvedGroups.length > 0 && (
          <div className="modal__reveal">
            {unsolvedGroups
              .sort((a, b) => a.difficulty - b.difficulty)
              .map((g) => (
                <SolvedGroup key={g.name} group={g} />
              ))}
          </div>
        )}

        <div className="modal__share-preview">
          {guessHistory.map((guess, i) => (
            <div key={i} className="modal__share-row">
              {guess.map((word, j) => {
                const group = groups.find((g) => g.words.includes(word));
                return (
                  <span
                    key={j}
                    className="modal__share-cell"
                    style={{
                      backgroundColor: group
                        ? COLOR_HEX[group.color]
                        : '#ccc',
                    }}
                  />
                );
              })}
            </div>
          ))}
        </div>

        <div className="modal__actions">
          <button className="controls__btn" onClick={handleShare}>
            Share
          </button>
          <button className="controls__btn controls__btn--submit" onClick={onNewGame}>
            New Game
          </button>
        </div>
      </div>
    </div>
  );
};
