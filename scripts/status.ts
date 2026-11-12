import { db } from '../lib/db/client';
import { researchPapers, editorialStories, mediaAssets } from '../lib/db/schema';
import { count, inArray, isNull } from 'drizzle-orm';

/**
 * One-look corpus summary for the editorial pipeline.
 * Nothing here modifies anything.
 */
const run = async () => {
  const [papers] = await db.select({ value: count() }).from(researchPapers);
  const [unscored] = await db.select({ value: count() }).from(researchPapers).where(isNull(researchPapers.editorialScore));

  const statusRows = await db
    .select({ status: editorialStories.status, value: count() })
    .from(editorialStories)
    .groupBy(editorialStories.status);
  const byStatus = Object.fromEntries(statusRows.map((r) => [r.status, r.value]));

  const drafts = await db.select({ body: editorialStories.body, slug: editorialStories.slug })
    .from(editorialStories)
    .where(inArray(editorialStories.status, ['draft', 'pending_review']));
  const imageless = drafts.filter((d) => !((d.body as any)?.image)).length;

  const reuseRows = await db
    .select({ status: mediaAssets.reuseStatus, value: count() })
    .from(mediaAssets)
    .groupBy(mediaAssets.reuseStatus);
  const byReuse = Object.fromEntries(reuseRows.map((r) => [r.status, r.value]));

  const line = (label: string, value: unknown) => console.log(`${label.padEnd(34)} ${value}`);
  console.log('Editorial status\n');
  line('papers (total)', papers.value);
  line('papers unscored (editorial_score NULL)', unscored.value);
  line('stories draft', byStatus['draft'] ?? 0);
  line('stories pending_review', byStatus['pending_review'] ?? 0);
  line('stories published', byStatus['published'] ?? 0);
  line('stories rejected', byStatus['rejected'] ?? 0);
  line('draft/pending without image', imageless);
  line('media assets verified', byReuse['verified'] ?? 0);
  line('media assets pending_verification', byReuse['pending_verification'] ?? 0);
  line('media assets (other)', Object.entries(byReuse).filter(([k]) => k !== 'verified' && k !== 'pending_verification').map(([k, v]) => `${k}=${v}`).join(' ') || '—');
};

run().catch((e) => { console.error(e); process.exit(1); });
