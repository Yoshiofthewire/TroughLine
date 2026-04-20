import React from 'react';
import { Group, COLOR_HEX } from '../types/puzzle';

interface SolvedGroupProps {
  group: Group;
}

export const SolvedGroup: React.FC<SolvedGroupProps> = ({ group }) => {
  return (
    <div
      className="solved-group"
      style={{ backgroundColor: COLOR_HEX[group.color] }}
    >
      <div className="solved-group__name">{group.name}</div>
      <div className="solved-group__words">{group.words.join(', ')}</div>
    </div>
  );
};
