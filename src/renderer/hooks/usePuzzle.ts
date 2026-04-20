import { useState, useCallback } from 'react';
import { Puzzle } from '../types/puzzle';
import puzzlesData from '../../data/puzzles.json';

export type GameMode = 'daily' | 'random';

const PLAYED_KEY = 'troughline_played';
const DAILY_KEY = 'troughline_daily';

interface DailyState {
  date: string;
  completed: boolean;
  won: boolean;
}

function getTodayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getDailyState(): DailyState | null {
  try {
    const stored = localStorage.getItem(DAILY_KEY);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

function saveDailyState(state: DailyState) {
  localStorage.setItem(DAILY_KEY, JSON.stringify(state));
}

export function isDailyCompleted(): boolean {
  const state = getDailyState();
  return state !== null && state.date === getTodayString() && state.completed;
}

export function markDailyCompleted(won: boolean) {
  saveDailyState({ date: getTodayString(), completed: true, won });
}

function getPlayedIds(): number[] {
  try {
    const stored = localStorage.getItem(PLAYED_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function markPlayed(id: number) {
  const played = getPlayedIds();
  if (!played.includes(id)) {
    played.push(id);
    localStorage.setItem(PLAYED_KEY, JSON.stringify(played));
  }
}

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Deterministic hash for daily puzzle selection
function dateHash(dateStr: string): number {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = (hash * 31 + dateStr.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function getDailyPuzzle(): Puzzle {
  const allPuzzles = puzzlesData as Puzzle[];
  const today = getTodayString();
  const index = dateHash(today) % allPuzzles.length;
  return allPuzzles[index];
}

function pickRandomPuzzle(): Puzzle {
  const allPuzzles = puzzlesData as Puzzle[];
  const played = getPlayedIds();
  const unplayed = allPuzzles.filter((p) => !played.includes(p.id));
  const pool = unplayed.length > 0 ? unplayed : allPuzzles;
  if (unplayed.length === 0) {
    localStorage.removeItem(PLAYED_KEY);
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

function pickPuzzle(mode: GameMode): Puzzle {
  return mode === 'daily' ? getDailyPuzzle() : pickRandomPuzzle();
}

export function usePuzzle(initialMode: GameMode = 'daily') {
  const [mode, setMode] = useState<GameMode>(initialMode);

  const [puzzle, setPuzzle] = useState<Puzzle>(() => {
    const p = pickPuzzle(initialMode);
    if (initialMode === 'random') markPlayed(p.id);
    return p;
  });

  const [shuffledWords, setShuffledWords] = useState<string[]>(() => {
    return shuffleArray(puzzle.groups.flatMap((g) => g.words));
  });

  const switchMode = useCallback((newMode: GameMode) => {
    setMode(newMode);
    const p = pickPuzzle(newMode);
    if (newMode === 'random') markPlayed(p.id);
    setPuzzle(p);
    setShuffledWords(shuffleArray(p.groups.flatMap((g) => g.words)));
  }, []);

  const newGame = useCallback(() => {
    if (mode === 'daily') {
      // Daily mode: just reload today's puzzle
      const p = getDailyPuzzle();
      setPuzzle(p);
      setShuffledWords(shuffleArray(p.groups.flatMap((g) => g.words)));
    } else {
      const p = pickRandomPuzzle();
      markPlayed(p.id);
      setPuzzle(p);
      setShuffledWords(shuffleArray(p.groups.flatMap((g) => g.words)));
    }
  }, [mode]);

  const shuffleWords = useCallback((solvedWords: string[]) => {
    setShuffledWords((prev) => {
      const remaining = prev.filter((w) => !solvedWords.includes(w));
      return [...solvedWords, ...shuffleArray(remaining)];
    });
  }, []);

  return { puzzle, shuffledWords, mode, newGame, shuffleWords, switchMode };
}
