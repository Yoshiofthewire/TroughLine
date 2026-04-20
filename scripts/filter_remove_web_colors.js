const fs = require('fs');
const path = require('path');

const puzzlesPath = path.join(process.cwd(), 'src', 'data', 'puzzles.json');
const outPath = path.join(process.cwd(), 'src', 'data', 'puzzles.filtered.json');

function looksLikeHexColor(s){
  if(!s || typeof s !== 'string') return false;
  return /#[0-9A-Fa-f]{3,6}/.test(s);
}

function groupUsesWebColors(g){
  if(!g) return false;
  if(/web\s*colors?/i.test(g.name || '')) return true;
  if(Array.isArray(g.words) && g.words.some(looksLikeHexColor)) return true;
  return false;
}

function puzzleUsesWebColors(p){
  if(!p || !Array.isArray(p.groups)) return false;
  if(p.groups.some(groupUsesWebColors)) return true;
  if(p.redHerring){
    if(/web\s*colors?/i.test(p.redHerring.falseCategoryName || '')) return true;
    if(Array.isArray(p.redHerring.words) && p.redHerring.words.some(looksLikeHexColor)) return true;
  }
  return false;
}

try{
  const raw = fs.readFileSync(puzzlesPath, 'utf8');
  const puzzles = JSON.parse(raw);
  const total = puzzles.length;
  const filtered = puzzles.filter(p => !puzzleUsesWebColors(p));
  fs.writeFileSync(outPath, JSON.stringify(filtered, null, 2), 'utf8');
  console.log('WROTE', outPath, '-', filtered.length, 'remaining from', total);
  const removed = total - filtered.length;
  console.log('REMOVED', removed, 'puzzles');
  process.exit(0);
}catch(err){
  console.error(err && err.stack ? err.stack : err);
  process.exit(2);
}
