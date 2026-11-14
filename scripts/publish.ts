import { db } from '../lib/db/client';
import { editorialStories, publicationEvents, researchPapers } from '../lib/db/schema';
import { getStoryBySlug, argValue } from './lib/story';
import { eq } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

const all = process.argv.slice(2);
const explicitDate = argValue(all, '--date');
const usePaperDate = all.includes('--use-paper-date');
const positional = all.filter((a, i) => !a.startsWith('--') && a !== explicitDate);
const slug = (argValue(all, '--slug') ?? positional[0]);
if (!slug) { console.error('usage: npm run editorial:publish -- <slug> [--date YYYY-MM-DD | --use-paper-date]'); process.exit(1); }
const parseDate = (s: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) { console.error('bad --date:', s, '(expected YYYY-MM-DD)'); process.exit(1); }
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12));
  if (isNaN(d.getTime())) { console.error('bad --date:', s); process.exit(1); }
  return d;
};

const run = async () => {
  const story = await getStoryBySlug(slug);
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

  // publishedAt: --date wins; then --use-paper-date (paper pub date clamped to
  // today — an article can never go live before it exists); default preserves the story date set at propose time (the paper's publication date), falling back to now for drafts created before that behaviour.
  let publishedAt = story.publishedAt ?? new Date();
  let dateOverride = false;
  if (explicitDate) { publishedAt = parseDate(explicitDate); dateOverride = true; }
  else if (usePaperDate && story.paperId) {
    const [paper] = await db.select({ d: researchPapers.publicationDate }).from(researchPapers).where(eq(researchPapers.id, story.paperId)).limit(1);
    if (paper?.d) {
      publishedAt = paper.d > new Date() ? new Date() : paper.d;
      dateOverride = true;
      console.log('publishedAt =', publishedAt.toISOString().split('T')[0], '(paper date', paper.d.toISOString().split('T')[0], publishedAt < paper.d ? '— clamped to today)' : ')');
    } else {
      console.log('paper has no publication date — publishing with today as publishedAt');
    }
  }

  await db.update(editorialStories)
    .set({ status: 'published', publishedAt })
    .where(eq(editorialStories.id, story.id));
  await db.insert(publicationEvents).values({
    storyId: story.id,
    eventType: 'published',
    previousStatus: story.status,
    newStatus: 'published',
    metadata: dateOverride ? { publishedAtOverride: publishedAt.toISOString() } : {},
  });
  console.log('published:', slug);
};

run().catch((e) => { console.error(e); process.exit(1); });
