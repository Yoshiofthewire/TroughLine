#!/usr/bin/env node
/**
 * Scrape random Wikipedia categories via the MediaWiki API.
 * Produces puzzle-ready groups: each group = { name, words: string[] }
 * where words are short article titles (uppercased, 1–2 words preferred).
 *
 * Usage:  node scripts/scrape_wiki_categories.js [targetGroups]
 *         default targetGroups = 1000
 */

const fs = require('fs/promises');
const path = require('path');

const TARGET = parseInt(process.argv[2] || '1000', 10);
const OUT_FILE = path.resolve(__dirname, '..', 'src', 'data', 'wiki_groups.json');

const API = 'https://en.wikipedia.org/w/api.php';
const UA = 'TroughLinePuzzleBot/1.0 (puzzle game data; contact: none)';

// Limits per API call
const RANDOM_BATCH = 50;       // max random per request
const CM_LIMIT = 100;          // category members per request
const DELAY_MS = 500;          // ms between each API call (serial)
const DELAY_BETWEEN_BATCHES = 1000; // ms between random-category batches

// Filter settings
const MIN_MEMBERS = 4;         // need at least 4 words for a group
const MAX_WORD_LEN = 14;       // skip very long titles
const MAX_WORDS_IN_TITLE = 3;  // skip multi-word article titles (>3 words)
const MAX_CAT_NAME_LEN = 60;   // skip absurdly long category names

// Only filter out maintenance/meta categories; allow most content categories
const BAD_CAT_PATTERNS = [
  /stubs$/i,
  /articles\s+(needing|with|lacking|containing)/i,
  /wikipedia/i,
  /wikidata/i,
  /commons\s+category/i,
  /template/i,
  /navigational\s+boxes/i,
  /use\s+(dmy|mdy)\s+dates/i,
  /cs1/i,
  /webarchive/i,
  /pages\s+(using|with)/i,
  /short\s+description/i,
  /coordinates/i,
  /geobox/i,
  /infobox/i,
  /redirect/i,
  /all\s+stub/i,
  /cleanup/i,
  /accuracy\s+disputes/i,
  /living\s+people/i,
  /\d{4}\s+deaths$/i,
  /\d{4}\s+births$/i,
  /by\s+(year|century|decade|language)/i,
  /census/i,
  /constituencies/i,
];

const BAD_MEMBER_PATTERNS = [
  /^list\s+of/i,
  /^index\s+of/i,
  /^outline\s+of/i,
  /^history\s+of/i,
  /^glossary\s+of/i,
  /\(.+\)/,  // disambiguation / qualifier in parens
];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

const MAX_RETRIES = 8;

async function apiFetch(params) {
  const url = new URL(API);
  params.format = 'json';
  params.formatversion = '2';
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(url.toString(), { headers: { 'User-Agent': UA } });
    if (res.ok) return res.json();
    if (res.status === 429 || res.status >= 500) {
      const wait = Math.min(3000 * Math.pow(2, attempt), 120000);
      console.warn(`  Rate-limited (${res.status}), waiting ${(wait / 1000).toFixed(0)}s (attempt ${attempt + 1}/${MAX_RETRIES})...`);
      await sleep(wait);
      continue;
    }
    throw new Error(`API ${res.status}: ${res.statusText}`);
  }
  throw new Error(`API failed after ${MAX_RETRIES} retries`);
}

async function getRandomCategories(n) {
  const data = await apiFetch({
    action: 'query',
    list: 'random',
    rnnamespace: '14',
    rnlimit: String(Math.min(n, 50)),
  });
  return (data.query?.random || []).map((r) => r.title);
}

async function getCategoryMembers(catTitle) {
  const data = await apiFetch({
    action: 'query',
    list: 'categorymembers',
    cmtitle: catTitle,
    cmlimit: String(CM_LIMIT),
    cmtype: 'page',
  });
  return (data.query?.categorymembers || []).map((m) => m.title);
}

function cleanCategoryName(raw) {
  return raw.replace(/^Category:/, '').trim();
}

function isBadCategory(name) {
  if (name.length > MAX_CAT_NAME_LEN) return true;
  return BAD_CAT_PATTERNS.some((re) => re.test(name));
}

function cleanMember(title) {
  if (BAD_MEMBER_PATTERNS.some((re) => re.test(title))) return null;
  let t = title.split(',')[0].trim();
  const words = t.split(/\s+/);
  if (words.length > MAX_WORDS_IN_TITLE) return null;
  if (t.length > MAX_WORD_LEN) return null;
  if (t.length < 2) return null;
  if (/\d/.test(t)) return null;
  return t.toUpperCase();
}

async function tryCategory(catTitle, seenNames) {
  const name = cleanCategoryName(catTitle);
  if (seenNames.has(name) || isBadCategory(name)) return null;

  let members;
  try {
    members = await getCategoryMembers(catTitle);
  } catch (e) {
    console.warn(`  Error: ${catTitle}: ${e.message}`);
    return null;
  }

  const cleaned = [];
  const memberSet = new Set();
  for (const m of members) {
    const c = cleanMember(m);
    if (c && !memberSet.has(c)) {
      memberSet.add(c);
      cleaned.push(c);
    }
  }
  if (cleaned.length < MIN_MEMBERS) return null;

  seenNames.add(name);
  return { name, words: cleaned };
}

(async () => {
  console.log(`Target: ${TARGET} usable groups`);

  // Try to resume from existing file
  let groups = [];
  try {
    const existing = await fs.readFile(OUT_FILE, 'utf8');
    groups = JSON.parse(existing);
    if (Array.isArray(groups) && groups.length > 0) {
      console.log(`Resuming from ${groups.length} existing groups in ${OUT_FILE}`);
    } else {
      groups = [];
    }
  } catch {
    groups = [];
  }

  const seenNames = new Set(groups.map((g) => g.name));
  let totalRequests = 0;
  let emptyRounds = 0;
  let lastSaveCount = groups.length;

  while (groups.length < TARGET && emptyRounds < 50) {
    // Fetch a batch of random categories
    const cats = await getRandomCategories(RANDOM_BATCH);
    totalRequests++;
    await sleep(DELAY_BETWEEN_BATCHES);

    // Filter candidates
    const candidates = cats.filter((c) => {
      const name = cleanCategoryName(c);
      return !seenNames.has(name) && !isBadCategory(name);
    });

    if (candidates.length === 0) {
      emptyRounds++;
      continue;
    }

    // Process serially with a delay between each
    let batchHits = 0;
    for (const catTitle of candidates) {
      if (groups.length >= TARGET) break;
      const result = await tryCategory(catTitle, seenNames);
      totalRequests++;
      if (result) {
        groups.push(result);
        batchHits++;
      }
      await sleep(DELAY_MS);
    }

    if (batchHits === 0) {
      emptyRounds++;
    } else {
      emptyRounds = 0;
    }

    // Periodic save every 25 new groups
    if (groups.length - lastSaveCount >= 25) {
      await fs.writeFile(OUT_FILE, JSON.stringify(groups, null, 2), 'utf8');
      lastSaveCount = groups.length;
      console.log(`  [saved] ${groups.length}/${TARGET} groups (${totalRequests} API calls)`);
    }

    console.log(`Batch: +${batchHits} → ${groups.length}/${TARGET} (${totalRequests} API calls)`);
  }

  console.log(`\nDone! Collected ${groups.length} groups in ${totalRequests} API calls.`);
  await fs.writeFile(OUT_FILE, JSON.stringify(groups, null, 2), 'utf8');
  console.log(`Saved to ${OUT_FILE}`);
})();
