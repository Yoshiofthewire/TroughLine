#!/usr/bin/env node
/**
 * Generate puzzles from wiki_groups.json scraped data.
 * Each puzzle needs 4 groups of 4 words + a red herring.
 *
 * Usage:  node scripts/generate_wiki_puzzles.js [count]
 *         default count = 1000
 */

const fs = require('fs/promises');
const path = require('path');

const WIKI_GROUPS_FILE = path.resolve(__dirname, '..', 'src', 'data', 'wiki_groups.json');
const TARGET_FILE = path.resolve(__dirname, '..', 'src', 'data', 'puzzles.json');
const WANTED = parseInt(process.argv[2] || '1000', 10);
const MAX_ATTEMPTS = 500;

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function sample(arr, n) {
  const s = [];
  const a = arr.slice();
  for (let i = 0; i < n && a.length; i++) {
    const idx = Math.floor(Math.random() * a.length);
    s.push(a.splice(idx, 1)[0]);
  }
  return s;
}

function pickFalseCategoryName(words) {
  const firstLetters = words.map((w) => (w && w[0]) || '');
  if (firstLetters.every((f) => f === firstLetters[0]) && firstLetters[0]) {
    return `Words starting with '${firstLetters[0]}'`;
  }
  const lengths = words.map((w) => w.length);
  if (lengths.every((l) => l === lengths[0])) {
    return `Words of length ${lengths[0]}`;
  }
  const letters = words.map((w) => new Set(w.split('')));
  const common = [...letters[0]].filter((ch) => letters.slice(1).every((s) => s.has(ch)));
  if (common.length > 0) return `Words containing '${common[0]}'`;
  return 'Looks related';
}

const colorMap = { 1: 'yellow', 2: 'green', 3: 'blue', 4: 'purple' };

(async () => {
  console.log(`Loading wiki groups from ${WIKI_GROUPS_FILE}...`);

  let wikiGroups;
  try {
    const raw = await fs.readFile(WIKI_GROUPS_FILE, 'utf8');
    wikiGroups = JSON.parse(raw);
  } catch (e) {
    console.error('Could not read wiki_groups.json:', e.message);
    process.exit(1);
  }

  // Filter: need at least 4 words per group
  const categories = wikiGroups.filter((g) => g.words && g.words.length >= 4);
  console.log(`Loaded ${categories.length} usable categories (from ${wikiGroups.length} total)`);

  if (categories.length < 4) {
    console.error('Need at least 4 categories to generate puzzles');
    process.exit(1);
  }

  // Read existing puzzles to get next ID
  let existing = [];
  try {
    const txt = await fs.readFile(TARGET_FILE, 'utf8');
    existing = JSON.parse(txt);
  } catch {
    existing = [];
  }
  let nextId = existing.reduce((m, p) => Math.max(m, p.id || 0), 0) + 1;
  console.log(`Starting from puzzle ID ${nextId}, generating ${WANTED} puzzles...`);

  const newPuzzles = [];

  for (let i = 0; i < WANTED; i++) {
    let created = false;

    for (let attempt = 0; attempt < MAX_ATTEMPTS && !created; attempt++) {
      // Pick 4 distinct categories
      const cats = shuffle(categories).slice(0, 4);
      const used = new Set();
      const groups = [];
      let ok = true;

      for (const cat of cats) {
        const pool = cat.words.filter((w) => !used.has(w));
        if (pool.length < 4) {
          ok = false;
          break;
        }
        const sel = sample(pool, 4);
        for (const s of sel) used.add(s);
        groups.push({ name: cat.name, words: sel });
      }

      if (!ok) continue;
      if (used.size !== 16) continue;

      // Assign random difficulties
      const shuffledDiff = shuffle([1, 2, 3, 4]);
      const groupsWithMeta = groups.map((g, idx) => ({
        name: g.name,
        words: g.words,
        difficulty: shuffledDiff[idx],
        color: colorMap[shuffledDiff[idx]],
      }));

      // Red herring: pick 1 word from 3 different groups
      const gh = shuffle(groupsWithMeta).slice(0, 3);
      const rhWords = gh.map((g) => sample(g.words, 1)[0]);
      const falseName = pickFalseCategoryName(rhWords);

      const theme = groupsWithMeta.map((g) => g.name).join(', ');

      const puzzle = {
        id: nextId++,
        theme,
        groups: groupsWithMeta.sort((a, b) => a.difficulty - b.difficulty),
        redHerring: { falseCategoryName: falseName, words: rhWords },
      };

      // Validate: all 16 words unique
      const allWords = puzzle.groups.flatMap((g) => g.words);
      if (new Set(allWords).size !== 16) {
        nextId--; // revert ID
        continue;
      }

      newPuzzles.push(puzzle);
      created = true;
    }

    if (!created) {
      console.warn(`Failed to create puzzle #${i + 1} after ${MAX_ATTEMPTS} attempts`);
      break;
    }

    if ((i + 1) % 100 === 0) {
      console.log(`Created ${i + 1}/${WANTED} puzzles`);
    }
  }

  // Replace existing puzzles with new ones
  try {
    await fs.writeFile(TARGET_FILE, JSON.stringify(newPuzzles, null, 2), 'utf8');
    console.log(`\nWrote ${newPuzzles.length} puzzles to ${TARGET_FILE}`);
  } catch (e) {
    console.error('Failed to write puzzles.json:', e.message);
    process.exit(1);
  }

  console.log('Done.');
})();
