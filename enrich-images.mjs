#!/usr/bin/env node
import fs from 'fs';
import { extract } from 'article-parser';

const DATA = '_data/news-posts.json';
const posts = JSON.parse(fs.readFileSync(DATA, 'utf-8'));
let updated = 0;

for (const p of posts) {
  if (p.id <= 8) continue; // only new scraped posts
  if (p.image && p.image !== '') continue;
  if (!p.guid) continue;
  try {
    const art = await extract(p.guid);
    if (art.image) {
      p.image = art.image;
      updated++;
      console.log('✓ id=' + p.id + ' → ' + art.image.substring(0, 60));
    } else if (art.images && art.images.length) {
      p.image = art.images[0];
      updated++;
      console.log('✓ id=' + p.id + ' (images[0]) → ' + art.images[0].substring(0, 60));
    } else {
      console.log('✗ id=' + p.id + ' — no image from ' + p.guid);
    }
  } catch (e) {
    console.log('✗ id=' + p.id + ' — error: ' + e.message);
  }
}

fs.writeFileSync(DATA, JSON.stringify(posts, null, 2));
console.log('\nUpdated ' + updated + ' posts with article images.');
