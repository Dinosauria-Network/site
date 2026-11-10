import { db } from '../lib/db/client';
import { researchPapers, editorialStories, mediaAssets } from '../lib/db/schema';
import { scrapeArticleMeta } from '../lib/article-scraper';
import { writeDerivatives } from '../lib/image-derivatives';
import { and, desc, eq, gte, notExists, sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

interface Args { limit: number; minScore: number; dryRun: boolean; }

const parseArgs = (): Args => {
  const args = process.argv.slice(2);
  const getNum = (flag: string, def: number) => {
    const i = args.indexOf(flag);
    const v = i >= 0 ? parseInt(args[i + 1], 10) : NaN;
    return Number.isFinite(v) && v > 0 ? v : def;
  };
  return {
    limit: getNum('--limit', 10),
    minScore: getNum('--min-score', Math.round(0.5 * 100) / 100),
    dryRun: args.includes('--dry-run'),
  };
};

const slugify = (s: string) => {
  const slug = s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70);
  return slug || `story-${Date.now()}`;
};

const cleanTitle = (t: string) => t.split(' | ').slice(0, 1).join('').trim();
const uniqueSentence = (s: string, n: number) => {
  const max = n;
  if (!s) return '';
  return s.length <= max ? s : s.slice(0, max).replace(/\s\S*$/, '') + '…';
};

const downloadImage = async (imageUrl: string, slug: string): Promise<string | null> => {
  try {
    const res = await fetch(imageUrl, { headers: { 'user-agent': 'DinosauriaBot/1.0' } });
    if (!res.ok) return null;
    const ctype = res.headers.get('content-type') || '';
    if (!ctype.startsWith('image/')) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > 5 * 1024 * 1024) return null;
    const ext = (ctype.split('/')[1] || 'jpeg').replace('jpeg', 'jpg').replace('+xml', '').replace('svg', 'svg');
    const file = `${slug}.${ext}`;
    fs.writeFileSync(path.join(process.cwd(), 'public', 'images', 'news', file), buf);
    return `/images/news/${file}`;
  } catch { return null; }
};

const run = async () => {
  const { limit, minScore, dryRun } = parseArgs();

  // Next numeric sourcePostId (continue past migrated posts' max id).
  const [{ value: dbMax }] = await db
    .select({ value: sql<number>`coalesce(max((body->>'sourcePostId')::int), 0)` })
    .from(editorialStories);
  const json = JSON.parse(fs.readFileSync('_data/news-posts.json', 'utf-8')) as any[];
  const jsonMax = Math.max(...json.map((p) => (p.id as number) || 0), 0);
  let nextPostId = Math.max(dbMax ?? 0, jsonMax) + 1;

  const rows = await db.select({
    id: researchPapers.id,
    title: researchPapers.title,
    abstract: researchPapers.abstract,
    doi: researchPapers.doi,
    journalName: researchPapers.journalName,
    publicationDate: researchPapers.publicationDate,
    metadata: researchPapers.metadata,
    editorialScore: researchPapers.editorialScore,
  }).from(researchPapers)
    .where(and(
      notExists(db.select({ x: editorialStories.id }).from(editorialStories).where(eq(editorialStories.paperId, researchPapers.id))),
      gte(researchPapers.editorialScore, minScore),
    ))
    .orderBy(desc(sql`coalesce(publication_date, created_at)`))
    .limit(limit);

  if (!rows.length) { console.log('No eligible papers (needs stored editorial_score >=', minScore, ')'); return; }

  let created = 0;
  for (const paper of rows) {
    const headline = cleanTitle(paper.title);
    const base = slugify(headline);
    let slug = base;
    let n = 2;
    const exists = async (s: string) => (await db.select({ v: editorialStories.id }).from(editorialStories).where(eq(editorialStories.slug, s))).length > 0;
    while (await exists(slug)) { slug = `${base}-${n}`; n++; }

    const meta = (paper.metadata ?? {}) as any;
    const url = paper.doi ? `https://doi.org/${paper.doi}` : (meta.url ?? meta.sourceUrl ?? '');
    const imageCandidateUrl = url ? (await scrapeArticleMeta(url))?.image : null;
    let image = null;
    if (imageCandidateUrl) {
      image = await downloadImage(imageCandidateUrl, slug);
      if (image) await writeDerivatives(image);
    }

    if (dryRun) {
      console.log(`[dry-run] WOULD CREATE ${slug} | ${uniqueSentence(headline, 60)} | img=${image ?? 'MISSING'}`);
      continue;
    }

    const [story] = await db.insert(editorialStories).values({
      slug,
      paperId: paper.id,
      headline,
      description: uniqueSentence(paper.abstract ?? '', 240),
      body: {
        image,
        imageAttribution: url || undefined,
        url,
        source: paper.journalName ?? 'Database',
        author: 'Dinosauria Network',
        sourcePostId: nextPostId,
        editorialScore: paper.editorialScore,
      },
      status: 'draft',
      publishingMode: 'auto',
      featured: false,
    }).returning({ id: editorialStories.id });

    if (image && imageCandidateUrl) {
      await db.insert(mediaAssets).values({
        paperId: paper.id,
        originalUrl: imageCandidateUrl,
        storagePath: image,
        attribution: url,
        copyrightHolder: url ? new URL(url).hostname : undefined,
        reuseStatus: 'pending_verification',
      });
    }

    console.log(`CREATED ${slug} | postId=${nextPostId} | ${uniqueSentence(headline, 55)} | img=${image ?? 'MISSING-NEEDS-ATTACH-IMAGE'}`);
    nextPostId++;
    created++;
  }

  console.log(`\nproposed=${created} limit=${limit} minScore=${minScore}`);
};

run().catch((e) => { console.error(e); process.exit(1); });
