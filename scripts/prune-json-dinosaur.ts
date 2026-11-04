import { classifyDinosaur } from '../lib/ai/jev-style';
import fs from 'fs';

const raw = JSON.parse(fs.readFileSync('_data/news-posts.json', 'utf-8'));
const key = process.env.JEVSTYLE_API_KEY || '';
if (!key) { console.log('No JEVSTYLE_API_KEY'); process.exit(1); }

async function run() {
  const keep = [];
  for (const p of raw) {
    try {
      const cls = await classifyDinosaur((p.post_title || p.title || '') + ' ' + (p.post_excerpt || p.excerpt || ''), key);
      const prob = (cls as any).answers?.dinosaur?.noul ?? (cls as any).questions?.dinosaur?.probability ?? 0;
      console.log(prob.toFixed(3), '|', (p.post_title || p.title || '').slice(0, 60));
      if (prob >= 0.25) keep.push(p);
    } catch { keep.push(p); }
  }
  fs.writeFileSync('_data/news-posts.json', JSON.stringify(keep, null, 2));
  console.log('Kept', keep.length, 'of', raw.length);
}
run();
