import { db } from '../lib/db/client';
import { editorialStories, publicationEvents } from '../lib/db/schema';
import { getStoryBySlug } from './lib/story';
import { eq } from 'drizzle-orm';

/**
 * editorial:unpublish — escape hatch for the daily auto-publish gate.
 * Takes a published story back to draft and records the event.
 * The on-disk image and the media_assets row are left untouched.
 */
const slug = process.argv.slice(2).find((a) => !a.startsWith('--'));
if (!slug) { console.error('usage: npm run editorial:unpublish -- <slug>'); process.exit(1); }

const run = async () => {
  const story = await getStoryBySlug(slug);
  if (story.status !== 'published') { console.error('Not published:', slug, '(status:', story.status + ')'); process.exit(1); }

  await db.update(editorialStories)
    .set({ status: 'draft', publishedAt: null, updatedAt: new Date() })
    .where(eq(editorialStories.id, story.id));
  await db.insert(publicationEvents).values({
    storyId: story.id,
    eventType: 'unpublished',
    previousStatus: 'published',
    newStatus: 'draft',
    metadata: { reason: 'editorial:unpublish' },
  });
  console.log('unpublished (back to draft):', slug);
};

run().catch((e) => { console.error(e); process.exit(1); });
