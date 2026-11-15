import { db } from '../../lib/db/client';
import { editorialStories } from '../../lib/db/schema';
import { eq } from 'drizzle-orm';

/** Story by slug, or exit(1) with a consistent message. */
export async function getStoryBySlug(slug: string) {
  const [story] = await db
    .select()
    .from(editorialStories)
    .where(eq(editorialStories.slug, slug))
    .limit(1);
  if (!story) { console.error('No story:', slug); process.exit(1); }
  return story;
}

/** Value of --flag in an argv-style list (e.g. ['--slug','x'] → 'x'). */
export function argValue(all: string[], flag: string): string | undefined {
  const i = all.indexOf(flag);
  return i >= 0 ? all[i + 1] : undefined;
}
