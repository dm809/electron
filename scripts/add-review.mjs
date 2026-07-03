import fs from 'fs';

const [, , name, rating, text, date] = process.argv;

if (!name || !text) {
  console.error('Usage: node add-review.mjs name rating text [date]');
  process.exit(1);
}

const path = 'data/reviews.json';
let list = [];
try {
  list = JSON.parse(fs.readFileSync(path, 'utf8') || '[]');
} catch {
  list = [];
}

const review = {
  name: String(name).trim(),
  rating: Math.min(5, Math.max(1, Number(rating) || 5)),
  text: String(text).trim(),
  date: date || new Date().toISOString(),
};

const key = (r) => `${r.name}|${r.rating}|${r.text}`.toLowerCase();
const seen = new Set();
const merged = [review, ...list].filter((r) => {
  const k = key(r);
  if (seen.has(k)) return false;
  seen.add(k);
  return r.name && r.text;
});

fs.writeFileSync(path, `${JSON.stringify(merged, null, 2)}\n`);
console.log(`OK: ${merged.length} reviews`);
