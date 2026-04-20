#!/usr/bin/env node
const fs = require('fs/promises');
const path = require('path');

const RAW_BASE = 'https://raw.githubusercontent.com/dariusk/corpora/master/data';
const SOURCE_PATHS = [
  'animals/common.json',
  'animals/dogs.json',
  'animals/cats.json',
  'foods/fruits.json',
  'foods/vegetables.json',
  'foods/breads_and_pastries.json',
  'foods/herbs_n_spices.json',
  'foods/pizzaToppings.json',
  'music/instruments.json',
  'music/genres.json',
  'objects/objects.json',
  'objects/clothing.json',
  'objects/containers.json',
  'colors/wikipedia.json',
  'geography/countries.json',
  'plants/plants.json',
  'sports/sports.json',
  'words/nouns.json',
  'words/adjs.json',
];

const TARGET_FILE = path.resolve(__dirname, '..', 'src', 'data', 'puzzles.json');
const MAX_ATTEMPTS_PER_PUZZLE = 500;

function titleCase(str) {
  return str
    .replace(/[-_]/g, ' ')
    .split(/\s+/)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');
}

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

function cleanWord(w) {
  if (!w) return null;
  let s = String(w).trim();
  // Remove weird quotes
  s = s.replace(/["'“”‘’]/g, '');
  // Collapse multiple spaces
  s = s.replace(/\s+/g, ' ').trim();
  if (s.length === 0) return null;
  return s.toUpperCase();
}

async function fetchJson(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn('Failed to fetch', url, res.status);
      return null;
    }
    return await res.json();
  } catch (e) {
    console.warn('Fetch error', url, e && e.message);
    return null;
  }
}

function extractStrings(data) {
  const out = new Set();
  const seen = new Set();
  function recurse(v) {
    if (v == null) return;
    if (typeof v === 'string') {
      out.add(v);
      return;
    }
    if (typeof v === 'number' || typeof v === 'boolean') return;
    if (Array.isArray(v)) {
      for (const e of v) recurse(e);
      return;
    }
    if (typeof v === 'object') {
      // prevent cycles
      if (seen.has(v)) return;
      seen.add(v);
      for (const key of Object.keys(v)) recurse(v[key]);
    }
  }
  recurse(data);
  return Array.from(out);
}

function pickFalseCategoryName(words) {
  // Try common first letter
  const firstLetters = words.map((w) => (w && w[0]) || '');
  const allSameFirst = firstLetters.every((f) => f === firstLetters[0]);
  if (allSameFirst && firstLetters[0]) return `Words starting with '${firstLetters[0]}'`;

  // Try common length
  const lengths = words.map((w) => w.length);
  const allSameLen = lengths.every((l) => l === lengths[0]);
  if (allSameLen) return `Words of length ${lengths[0]}`;

  // Fallback: words sharing a letter
  const letters = words.map((w) => new Set(w.split('')));
  const common = [...letters[0]].filter((ch) => letters.slice(1).every((s) => s.has(ch)));
  if (common.length > 0) return `Words containing '${common[0]}'`;

  // Last resort
  return 'Looks related';
}

(async () => {
  const wanted = parseInt(process.argv[2] || '1000', 10);
  console.log(`Generating ${wanted} puzzles — fetching sources...`);

  const categories = [];

  for (const p of SOURCE_PATHS) {
    const url = `${RAW_BASE}/${p}`;
    const data = await fetchJson(url);
    if (!data) continue;
    // remove hex color tokens like #FF0000 that appear in some sources
    const strings = extractStrings(data)
      .map(cleanWord)
      .filter(Boolean)
      .filter((s) => !/#[0-9A-Fa-f]{3,6}/.test(s));
    const uniq = Array.from(new Set(strings));
    if (uniq.length < 8) continue; // skip tiny lists
    const key = titleCase(path.basename(p, '.json'));
    categories.push({ name: key, words: uniq });
    console.log(`Loaded ${uniq.length} words for category: ${key}`);
  }

  if (categories.length < 8) {
    console.error('Not enough categories loaded to generate puzzles. Aborting.');
    process.exit(1);
  }

  // Read existing puzzles
  let existing = [];
  try {
    const txt = await fs.readFile(TARGET_FILE, 'utf8');
    existing = JSON.parse(txt);
  } catch (e) {
    console.warn('Could not read existing puzzles.json — starting fresh');
    existing = [];
  }
  const existingIds = new Set(existing.map((p) => p.id));
  let nextId = existing.reduce((m, p) => Math.max(m, p.id || 0), 0) + 1;

  const newPuzzles = [];

  const colorMap = { 1: 'yellow', 2: 'green', 3: 'blue', 4: 'purple' };

  const hexRegex = /#[0-9A-Fa-f]{3,6}/;

  for (let i = 0; i < wanted; i++) {
    let created = false;
    for (let attempt = 0; attempt < MAX_ATTEMPTS_PER_PUZZLE && !created; attempt++) {
      // pick 4 distinct categories
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
      if (used.size !== 16) continue; // ensure unique words across groups

      // Assign difficulties randomly
      const shuffledDifficulties = shuffle([1, 2, 3, 4]);
      const groupsWithMeta = groups.map((g, idx) => {
        const diff = shuffledDifficulties[idx];
        return {
          name: g.name,
          words: g.words,
          difficulty: diff,
          color: colorMap[diff],
        };
      });

      // red herring: pick 3 distinct groups and one word from each
      const gh = shuffle(groupsWithMeta).slice(0, 3);
      const rhWords = gh.map((g) => sample(g.words, 1)[0]);
      const falseName = pickFalseCategoryName(rhWords);

      const theme = `Mixed: ${groupsWithMeta.map((g) => g.name).join(', ')}`;

      const puzzle = {
        id: nextId++,
        theme,
        groups: [
          // ensure groups are ordered by difficulty 1..4 in the output (helps readability)
        ],
        redHerring: { falseCategoryName: falseName, words: rhWords },
      };

      // order groups by difficulty ascending so 1=yellow etc
      puzzle.groups = groupsWithMeta.sort((a, b) => a.difficulty - b.difficulty);

      // final validation: no hex tokens or 'Web Colors' groups
      if (puzzle.groups.some((g) => /web\s*colors?/i.test(g.name))) continue;
      if (puzzle.groups.some((g) => g.words.some((w) => hexRegex.test(w)))) continue;
      if (puzzle.redHerring && puzzle.redHerring.words.some((w) => hexRegex.test(w))) continue;

      const allWords = puzzle.groups.flatMap((g) => g.words);
      const uniqueAll = Array.from(new Set(allWords));
      if (allWords.length !== 16 || uniqueAll.length !== 16) {
        continue;
      }

      newPuzzles.push(puzzle);
      created = true;
    }
    if (!created) {
      console.warn(`Failed to create puzzle #${i + 1} after ${MAX_ATTEMPTS_PER_PUZZLE} attempts`);
      break;
    }
    if ((i + 1) % 50 === 0) console.log(`Created ${i + 1}/${wanted} puzzles`);
  }

  // Append to existing and write file
  const combined = existing.concat(newPuzzles);
  try {
    await fs.writeFile(TARGET_FILE, JSON.stringify(combined, null, 2), 'utf8');
    console.log(`Wrote ${newPuzzles.length} puzzles to ${TARGET_FILE}`);
  } catch (e) {
    console.error('Failed to write puzzles.json', e && e.message);
    process.exit(1);
  }

  console.log('Done.');
})();
