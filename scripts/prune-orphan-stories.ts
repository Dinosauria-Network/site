import { db } from '../lib/db/client';
import { researchPapers } from '../lib/db/schema';
import { inArray, isNotNull } from 'drizzle-orm';
import fs from 'fs';

const POSTS_PATH = '_data/news-posts.json';

const run = async () => {
  const posts = JSON.parse(fs.readFileSync(POSTS_PATH, 'utf-8')) as any[];
  const liveIds = new Set(posts.map(p => p.id));

  const rows = await db.select({ id: researchPapers.id, title: researchPapers.title, metadata: researchPapers.metadata })
    .from(researchPapers)
    .where(isNotNull(researchPapers.metadata));

  const orphans = rows.filter(r => {
    const sp = (r.metadata as any)?.sourcePostId;
    return typeof sp === 'number' && !liveIds.has(sp);
  });

  console.log('current JSON ids:', [...liveIds].sort((a, b) => a - b).join(','));
  console.log('orphan rows to delete:', orphans.length);
  if (process.argv.includes('--delete')) {
    const ids = orphans.map(o => o.id);
    if (ids.length) await db.delete(researchPapers).where(inArray(researchPapers.id, ids));
    console.log('deleted:', ids.length);
  } else {
    console.log('dry run — pass --delete to remove them');
  }
};
run();
