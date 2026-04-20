import React from 'react';

interface HelpModalProps {
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ onClose }) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal__title">How to Play</h2>
        <div className="modal__body">
          <p>Find groups of four words that share something in common.</p>
          <ul>
            <li>Select four words and tap <strong>Submit</strong> to check if they form a group.</li>
            <li>Find all four groups without making 4 mistakes!</li>
          </ul>
          <h3>Difficulty</h3>
          <p>Categories are color-coded by difficulty:</p>
          <div className="help-colors">
            <span className="help-color help-color--yellow">Straightforward</span>
            <span className="help-color help-color--green">Moderate</span>
            <span className="help-color help-color--blue">Tricky</span>
            <span className="help-color help-color--purple">Very Tricky</span>
          </div>
          <h3>Watch Out!</h3>
          <p>Some words may seem to belong together but are actually in different groups — these are red herrings!</p>
        </div>
        <div className="modal__actions">
          <button className="controls__btn controls__btn--submit" onClick={onClose}>
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
};
