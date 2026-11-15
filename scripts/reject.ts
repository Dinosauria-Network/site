import { db } from '../lib/db/client';
import { editorialStories, publicationEvents } from '../lib/db/schema';
import { getStoryBySlug, argValue } from './lib/story';
import { eq } from 'drizzle-orm';

const all = process.argv.slice(2);
const slug = argValue(all, '--slug') ?? all.find((a) => !a.startsWith('--'));
if (!slug) { console.error('usage: npm run editorial:reject -- <slug>'); process.exit(1); }

const run = async () => {
  const story = await getStoryBySlug(slug);
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
