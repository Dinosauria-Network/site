import { db } from '../lib/db/client';
import { researchPapers, editorialStories, mediaAssets } from '../lib/db/schema';
import { scrapeArticleMeta } from '../lib/article-scraper';
import { writeDerivatives } from '../lib/image-derivatives';
import { and, count, desc, eq, gte, isNull, lt, notExists, or, sql } from 'drizzle-orm';
import { SITE_NAME } from '../lib/site';
import fs from 'fs';
import path from 'path';

interface Args { limit: number; minScore: number; dryRun: boolean; since: Date | null; sinceLabel: string; }

/**
 * --since YYYY[-MM[-DD]]  only papers published on/after this date are eligible
 * --since all             disable the recency filter entirely
 * default                 2024-01-01 (this is a news site: latest work first)
 * Papers with NULL publication_date are skipped while a filter is active.
 */
const parseSince = (args: string[]): { since: Date | null; sinceLabel: string } => {
  const i = args.indexOf('--since');
  if (i < 0) return { since: new Date(Date.UTC(2024, 0, 1)), sinceLabel: '2024-01-01 (default)' };
  const raw = (args[i + 1] || '').toLowerCase();
  if (raw === 'all') return { since: null, sinceLabel: 'all (filter disabled)' };
  const m = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/.exec(raw);
  if (!m) { console.error('bad --since value:', raw, '(expected YYYY, YYYY-MM, YYYY-MM-DD, or "all")'); process.exit(1); }
  const year = Number(m[1]);
  const month = m[2] ? Number(m[2]) : 1;
  const day = m[3] ? Number(m[3]) : 1;
  if (month < 1 || month > 12 || day < 1 || day > 31) { console.error('bad --since value:', raw); process.exit(1); }
  return { since: new Date(Date.UTC(year, month - 1, day)), sinceLabel: raw };
};

const parseArgs = (): Args => {
  const args = process.argv.slice(2);
  const getNum = (flag: string, def: number) => {
    const i = args.indexOf(flag);
    const v = i >= 0 ? parseInt(args[i + 1], 10) : NaN;
    return Number.isFinite(v) && v > 0 ? v : def;
  };
  const { since, sinceLabel } = parseSince(args);
  return {
    limit: getNum('--limit', 10),
    minScore: getNum('--min-score', Math.round(0.5 * 100) / 100),
    dryRun: args.includes('--dry-run'),
    since,
    sinceLabel,
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
  const { limit, minScore, dryRun, since, sinceLabel } = parseArgs();

  // Next numeric sourcePostId (continue past migrated posts' max id).
  const [{ value: dbMax }] = await db
    .select({ value: sql<number>`coalesce(max((body->>'sourcePostId')::int), 0)` })
    .from(editorialStories);
  const json = JSON.parse(fs.readFileSync('_data/news-posts.json', 'utf-8')) as any[];
  const jsonMax = Math.max(...json.map((p) => (p.id as number) || 0), 0);
  let nextPostId = Math.max(dbMax ?? 0, jsonMax) + 1;

  const notProposed = notExists(db.select({ x: editorialStories.id }).from(editorialStories).where(eq(editorialStories.paperId, researchPapers.id)));
  const eligible = and(
    notProposed,
    gte(researchPapers.editorialScore, minScore),
    ...(since ? [gte(researchPapers.publicationDate, since)] : []),
  )!;

  if (since) {
    const [{ value: skipped }] = await db.select({ value: count() }).from(researchPapers)
      .where(and(
        notProposed,
        gte(researchPapers.editorialScore, minScore),
        or(isNull(researchPapers.publicationDate), lt(researchPapers.publicationDate, since)),
      ));
    if (skipped > 0) console.log(`note: skipped ${skipped} eligible paper(s) published before --since ${sinceLabel} (use --since all to include)`);
  }

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
    .where(eligible)
    .orderBy(desc(sql`coalesce(publication_date, created_at)`))
    .limit(limit);

  if (!rows.length) { console.log('No eligible papers (needs stored editorial_score >=', minScore, 'since', sinceLabel, ')'); return; }

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
    const abstract = typeof paper.abstract === 'string' ? paper.abstract : '';
    let description = uniqueSentence(abstract, 240);
    if (!description.trim()) {
      description = headline; // honest fallback — never store a blank excerpt
      console.log('note:', slug, 'has no abstract; description falls back to headline');
    }
    // Dry-run must not write files — scrape for the report only, never download.
    const imageCandidateUrl = url ? (await scrapeArticleMeta(url))?.image : null;
    let image = null;
    if (imageCandidateUrl && !dryRun) {
      image = await downloadImage(imageCandidateUrl, slug);
      if (image) await writeDerivatives(image);
    }

    if (dryRun) {
      console.log(`[dry-run] WOULD CREATE ${slug} | ${uniqueSentence(headline, 60)} | img=${imageCandidateUrl ? 'og-image' : 'MISSING'}`);
      continue;
    }

    const [story] = await db.insert(editorialStories).values({
      slug,
      paperId: paper.id,
      headline,
      description,
      body: {
        image,
        imageAttribution: url || undefined,
        url,
        source: paper.journalName ?? 'Database',
        author: SITE_NAME,
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

  console.log(`\nproposed=${created} limit=${limit} minScore=${minScore} since=${sinceLabel}`);
};

run().catch((e) => { console.error(e); process.exit(1); });
