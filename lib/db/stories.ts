import { db } from '@/lib/db/client';
import { editorialStories } from '@/lib/db/schema';
import { and, count, desc, eq, sql } from 'drizzle-orm';
import type { NewsPost } from '@/lib/genus-data';

export interface StoriesPage {
  posts: NewsPost[];
  total: number;
  totalPages: number;
  currentPage: number;
}

interface StoryBody {
  image?: string | null;
  source?: string | null;
  author?: string | null;
  url?: string | null;
  guid?: string | null;
  sourcePostId?: number | null;
  postName?: string | null;
}

function storyToNewsPost(s: typeof editorialStories.$inferSelect): NewsPost {
  const body = (s.body ?? {}) as StoryBody;
  const date = s.publishedAt ?? s.createdAt;
  // '' is not nullish — use || so empty strings fall through instead of
  // rendering a blank excerpt on the card.
  const fallbackExcerpt = (s.headline || '').replace(/\s+/g, ' ').trim().slice(0, 100);
  return {
    id: body.sourcePostId ?? s.slug,
    title: s.headline ?? '',
    excerpt: s.description || s.deck || fallbackExcerpt || '',
    date: date ? date.toISOString().split('T')[0] : '',
    author: body.author ?? 'Palai',
    source: body.source ?? 'Database',
    url: body.url ?? '',
    guid: body.guid ?? '',
    image: body.image ?? '',
    post_name: s.slug,
    syndication_source: body.source ?? undefined,
  };
}

/**
 * Detail page lookup (fallback to JSON for curated posts): match a numeric
 * sourcePostId stored on the published story's body.
 */
export async function getPublishedStoryByNumericId(id: number) {
  const [row] = await db.select().from(editorialStories)
    .where(and(
      eq(editorialStories.status, 'published'),
      sql`body->>'sourcePostId' = ${String(id)}`,
    ))
    .limit(1);
  return row ?? null;
}

/**
 * Homepage / news archive data source: published editorial stories from the DB,
 * newest first. Falls back to the legacy JSON reader if the DB can't be reached
 * (e.g. build environments without DATABASE_URL) so pages still render.
 */
export async function getPublishedStoriesPaginated(
  page: number,
  perPage: number,
): Promise<StoriesPage> {
  try {
    const where = eq(editorialStories.status, 'published');
    const offset = Math.max(0, (page - 1) * perPage);

    const [{ value: total }] = await db
      .select({ value: count() })
      .from(editorialStories)
      .where(where);

    const rows = await db
      .select()
      .from(editorialStories)
      .where(where)
      .orderBy(desc(editorialStories.publishedAt), desc(editorialStories.createdAt))
      .limit(perPage)
      .offset(offset);

    return {
      posts: rows.map(storyToNewsPost),
      total,
      totalPages: Math.max(1, Math.ceil(total / perPage)),
      currentPage: page,
    };
  } catch (error) {
    console.error('Failed to fetch editorial_stories from DB; falling back to JSON posts:', error);
    const { getPostsPaginated: getJsonPostsPaginated } = await import('@/lib/genus-data');
    return getJsonPostsPaginated(page, perPage);
  }
}
