import { db } from '../lib/db/client';
import { editorialStories } from '../lib/db/schema';
import { asc, inArray } from 'drizzle-orm';

const json = process.argv.includes('--json');

const run = async () => {
  const rows = await db.select().from(editorialStories)
    .where(inArray(editorialStories.status, ['draft', 'pending_review']))
    .orderBy(asc(editorialStories.createdAt))
    .limit(50);

  if (json) { console.log(JSON.stringify(rows, null, 2)); return; }
  if (!rows.length) { console.log('No pending drafts.'); return; }
  console.log(`Pending (${rows.length}):\n`);
  for (const s of rows) {
    const body = (s.body ?? {}) as any;
    const img = body.image ? 'img ok' : 'NEEDS IMAGE';
    const score = body.editorialScore ?? 'n/a';
    console.log(`[${s.status}] ${s.slug}\n  ${img} | score=${score} | postId=${body.sourcePostId ?? 'n/a'}\n  ${s.headline}\n  ${body.url ?? ''}\n`);
  }
};

run().catch((e) => { console.error(e); process.exit(1); });
