import { db } from '../lib/db/client';
import { editorialStories, publicationEvents } from '../lib/db/schema';
import { eq } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

const positional = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const slug = (process.argv.slice(2).find((a, i) => process.argv.slice(2)[i - 1] === '--slug')) ?? positional[0];
if (!slug) { console.error('usage: npm run editorial:publish -- <slug>'); process.exit(1); }

const run = async () => {
  const [story] = await db.select().from(editorialStories).where(eq(editorialStories.slug, slug)).limit(1);
  if (!story) { console.error('No story:', slug); process.exit(1); }
  if (story.status === 'published') { console.log('Already published:', slug); return; }

  const body = (story.body ?? {}) as { image?: string | null };
  if (!body.image) {
    console.error('Refusing to publish: no image attached to', slug);
    console.error('Attach one with: npm run editorial:attach-image -- ' + slug + ' <path-or-url>');
    process.exit(1);
  }
  const storagePath = path.join(process.cwd(), 'public', body.image);
  if (!fs.existsSync(storagePath)) {
    console.error('Refusing to publish: image file is missing on disk:', storagePath);
    process.exit(1);
  }
  if (!(story.description ?? '').trim()) {
    console.error('Refusing to publish: description is empty for', slug);
    process.exit(1);
  }

  await db.update(editorialStories)
    .set({ status: 'published', publishedAt: new Date() })
    .where(eq(editorialStories.id, story.id));
  await db.insert(publicationEvents).values({
    storyId: story.id,
    eventType: 'published',
    previousStatus: story.status,
    newStatus: 'published',
  });
  console.log('published:', slug);
};

run().catch((e) => { console.error(e); process.exit(1); });
