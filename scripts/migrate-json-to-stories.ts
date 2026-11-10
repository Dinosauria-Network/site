import { db } from '../lib/db/client';
import { researchPapers, editorialStories } from '../lib/db/schema';
import { sql, eq } from 'drizzle-orm';
import fs from 'fs';

interface NewsPost {
  id: number;
  post_title?: string;
  post_excerpt?: string;
  post_date?: string;
  post_date_gmt?: string;
  author?: string;
  syndication_source?: string;
  guid?: string;
  url?: string;
  image?: string;
  post_name?: string;
}

const cleanTitle = (t: string) => t.split(' | ').slice(0, 1).join('').trim();

const parseDate = (d?: string): Date | null => {
  if (!d) return null;
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? null : dt;
};

const run = async () => {
  const raw = fs.readFileSync('_data/news-posts.json', 'utf-8');
  const posts = JSON.parse(raw) as NewsPost[];
  if (!Array.isArray(posts)) throw new Error('news-posts.json is not an array');

  let created = 0, skipped = 0, noPaper = 0;
  for (const post of posts) {
    const slug = (post.post_name || '').trim();
    if (!slug) {
      console.log('SKIP (no slug):', post.id, post.post_title?.slice(0, 60));
      skipped++;
      continue;
    }

    const existing = await db.select({ id: editorialStories.id }).from(editorialStories).where(eq(editorialStories.slug, slug));
    const paperRows = await db.select({ id: researchPapers.id }).from(researchPapers)
      .where(sql`${researchPapers.metadata}->>'sourcePostId' = ${String(post.id)}`);
    if (!paperRows.length) {
      console.warn('WARN (no research_papers match, paperId will be null):', post.id);
      noPaper++;
    }

    const publishedAt = parseDate(post.post_date_gmt) ?? parseDate(post.post_date);

    if (existing.length) {
      await db.update(editorialStories).set({ paperId: paperRows[0]?.id ?? null, publishedAt }).where(eq(editorialStories.slug, slug));
      console.log('UPDATED (idempotent):', post.id, '|', slug);
      skipped++;
      continue;
    }
    await db.insert(editorialStories).values({
      slug,
      paperId: paperRows[0]?.id ?? null,
      headline: cleanTitle(post.post_title || 'Untitled'),
      description: post.post_excerpt ?? null,
      body: {
        image: post.image ?? null,
        source: post.syndication_source ?? null,
        author: post.author ?? 'Palai',
        url: post.url || post.guid || '',
        guid: post.guid ?? '',
        sourcePostId: post.id,
        postName: slug,
      },
      status: 'published',
      publishingMode: 'manual',
      featured: false,
      publishedAt,
    });
    console.log('CREATED:', post.id, '|', cleanTitle(post.post_title || '').slice(0, 60));
    created++;
  }

  console.log(`\nDone. created=${created} skipped=${skipped} noPaperId=${noPaper} total=${posts.length}`);
};

run().catch((err) => { console.error(err); process.exit(1); });
