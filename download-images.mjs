#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const posts = JSON.parse(fs.readFileSync('_data/news-posts.json', 'utf-8'));
const newsDir = path.join(process.cwd(), 'public', 'images', 'news');
const uniqueUrls = new Map();

for (const p of posts) {
  if (p.id > 8 && p.image && p.image.startsWith('http')) {
    uniqueUrls.set(p.image, p.id);
  }
}

console.log(`Found ${uniqueUrls.size} unique external images to download`);
let downloaded = 0;

for (const [url, id] of uniqueUrls) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DinosauriaBot/1.0)' },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!res.ok || !res.body) {
      console.warn(`✗ id=${id} HTTP ${res.status}`);
      continue;
    }

    const bytes = Buffer.from(await res.arrayBuffer());
    const ext = path.extname(new URL(url).pathname).toLowerCase() || '.webp';
    const baseName = path.basename(new URL(url).pathname).replace(/\.[^.]+$/, '');
    const filename = `${baseName}${ext}`;
    const destPath = path.join(newsDir, filename);

    fs.writeFileSync(destPath, bytes);
    downloaded++;

    // Also create responsive versions
    const sizes = ['-1024', '-640', '-480'];
    for (const s of sizes) {
      try {
        const dest = path.join(newsDir, `${baseName}${s}.jpg`);
        // Copy the file - we don't have ImageMagick, just copy as-is or rename
        fs.copyFileSync(destPath, path.join(newsDir, `${baseName}${s}.jpg`));
      } catch {}
    }

    console.log(`✓ id=${id} → ${filename}`);
  } catch (e) {
    console.warn(`✗ id=${id} — ${e.message.substring(0, 80)}`);
  }
}

// Update posts with local paths
for (const p of posts) {
  if (p.id > 8 && p.image && p.image.startsWith('http')) {
    const url = new URL(p.image);
    const baseName = path.basename(url.pathname).replace(/\.[^.]+$/, '');
    const ext = path.extname(url.pathname).toLowerCase();
    const imgExt = ext === '.webp' ? '.webp' : '.jpg';
    p.image = `/images/news/${baseName}${imgExt}`;
  }
}

fs.writeFileSync('_data/news-posts.json', JSON.stringify(posts, null, 2));

console.log(`\nDone. Downloaded ${downloaded}/${uniqueUrls.size} images.`);
