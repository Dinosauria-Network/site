import { db } from '../lib/db/client';
import { editorialStories, publicationEvents } from '../lib/db/schema';
import { eq } from 'drizzle-orm';

const positional = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const slug = (process.argv.slice(2).find((a, i) => process.argv.slice(2)[i - 1] === '--slug')) ?? positional[0];
if (!slug) { console.error('usage: npm run editorial:reject -- <slug>'); process.exit(1); }

const run = async () => {
  const [story] = await db.select().from(editorialStories).where(eq(editorialStories.slug, slug)).limit(1);
  if (!story) { console.error('No story:', slug); process.exit(1); }
  if (story.status === 'rejected') { console.log('Already rejected:', slug); return; }

  await db.update(editorialStories).set({ status: 'rejected' }).where(eq(editorialStories.id, story.id));
  await db.insert(publicationEvents).values({
    storyId: story.id,
    eventType: 'rejected',
    previousStatus: story.status,
    newStatus: 'rejected',
  });
  console.log('rejected:', slug);
};

run().catch((e) => { console.error(e); process.exit(1); });
