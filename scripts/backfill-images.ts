import { db } from '../lib/db/client';
import { sql } from 'drizzle-orm';
import fs from 'fs';

const raw = JSON.parse(fs.readFileSync('_data/news-posts.json', 'utf-8'));

(async () => {
  for (const post of raw) {
    if (!post.image) continue;
    const title = (post.post_title || post.title || '').slice(0, 500);
    try {
      await db.execute(sql`
        UPDATE research_papers
        SET metadata = COALESCE(metadata, '{}') || jsonb_build_object('image', ${post.image}, 'sourcePostId', ${post.id})
        WHERE title = ${title}
      `);
      console.log('Backfilled image:', title.slice(0, 50));
    } catch (e) {
      console.log('Skip:', title.slice(0, 50));
    }
  }
})();
