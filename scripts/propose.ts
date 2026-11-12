import { db } from '../lib/db/client';
import { researchPapers, editorialStories, mediaAssets } from '../lib/db/schema';
import { scrapeArticleMeta } from '../lib/article-scraper';
import { writeDerivatives } from '../lib/image-derivatives';
import { taxonQuery, findCommonsMatch } from '../lib/images/commons';
import { extractLicense, stripTags, sentencePrefix } from '../lib/license';
import { and, count, desc, eq, gte, inArray, isNull, lt, notExists, or, sql } from 'drizzle-orm';
import { SITE_NAME } from '../lib/site';
import fs from 'fs';
import path from 'path';

interface Args { limit: number; minScore: number; dryRun: boolean; since: Date | null; sinceLabel: string; doi: string[] | null }

/**
 * --since YYYY[-MM[-DD]]  only papers published on/after this date are eligible
 * --since all             disable the recency filter entirely
 * default                 2024-01-01 (this is a news site: latest work first)
 * Papers with NULL publication_date are skipped while a filter is active.
 * --doi ABC,def           target specific DOIs directly (bypasses --since and --min-score);
 *                         repeat or comma-separate
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

const parseDoi = (args: string[]): string[] | null => {
  const out: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--doi') {
      const raw = (args[i + 1] || '').trim();
      if (!raw) { console.error('--doi needs a value, e.g. --doi 10.1234/abc'); process.exit(1); }
      out.push(...raw.split(',').map(s => s.trim()).filter(Boolean));
    }
  }
  return out.length ? out : null;
};

const parseArgs = (): Args => {
  const args = process.argv.slice(2);
  const getNum = (flag: string, def: number) => {
    const i = args.indexOf(flag);
    const v = i >= 0 ? parseInt(args[i + 1], 10) : NaN;
    return Number.isFinite(v) && v > 0 ? v : def;
  };
  const { since, sinceLabel } = parseSince(args);
  const doi = parseDoi(args);
  return {
    limit: getNum('--limit', 10),
    minScore: getNum('--min-score', Math.round(0.5 * 100) / 100),
    dryRun: args.includes('--dry-run'),
    since: doi ? null : since,
    sinceLabel: doi ? 'n/a (--doi)' : sinceLabel,
    doi,
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

const isCcLicense = (name?: string) => /^cC/i.test(name || '');

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
  const { limit, minScore, dryRun, since, sinceLabel, doi } = parseArgs();

  // Next numeric sourcePostId: DB stories + retired JSON posts, so a draft never
  // claims an id that a legacy /news/[id] post already uses. JSON read is best-effort.
  const [{ value: dbMax }] = await db
    .select({ value: sql<number>`coalesce(max((body->>'sourcePostId')::int), 0)` })
    .from(editorialStories);
  let jsonMax = 0;
  try {
    const json = JSON.parse(fs.readFileSync('_data/news-posts.json', 'utf-8')) as any[];
    jsonMax = Math.max(...json.map((p) => (p.id as number) || 0), 0);
  } catch (e) {
    console.warn('warn: _data/news-posts.json unreadable — using DB-only sourcePostId sequence');
  }
  let nextPostId = Math.max(dbMax ?? 0, jsonMax) + 1;

  const notProposed = notExists(db.select({ x: editorialStories.id }).from(editorialStories).where(eq(editorialStories.paperId, researchPapers.id)));
  const doiFilter = doi?.length ? inArray(researchPapers.doi, doi) : undefined;
  const conditions: any[] = [notProposed];
  if (!doi) {
    conditions.push(gte(researchPapers.editorialScore, minScore));
    if (since) conditions.push(gte(researchPapers.publicationDate, since));
  } else if (doiFilter) {
    conditions.push(doiFilter);
  }
  const eligible = and(...conditions)!;

  if (since && !doi) {
    const [{ value: skipped }] = await db.select({ value: count() }).from(researchPapers)
      .where(and(
        notProposed,
        gte(researchPapers.editorialScore, minScore),
        or(isNull(researchPapers.publicationDate), lt(researchPapers.publicationDate, since)),
      ));
    if (skipped > 0) console.log(`note: skipped ${skipped} eligible paper(s) published before --since ${sinceLabel} (use --since all to include)`);
  }
  if (doi?.length) console.log(`note: --doi targets ${doi.length} paper(s), ignoring --since/--min-score`);

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

  if (!rows.length) {
    console.log(doi?.length
      ? 'No papers found for the given DOI(s) (or all already proposed).'
      : 'No eligible papers (needs stored editorial_score >=' + minScore + ' since ' + sinceLabel + ')');
    return;
  }

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
    const rawAbstract = typeof paper.abstract === 'string' ? paper.abstract : '';
    const abstract = stripTags(rawAbstract).replace(/^abstract[:\s—–-]+/i, '');
    let description = sentencePrefix(abstract, 240);
    if (!description.trim()) {
      description = headline; // honest fallback — never store a blank excerpt
      console.warn('WARN:', slug, 'has no abstract; description falls back to headline');
    }
    // License hint from EPMC isOpenAccess / Crossref license[] — used only for asset metadata, never to block.
    const license = extractLicense(meta);
    // Dry-run must not write files — scrape for the report only, never download.
    const imageCandidateUrl = url ? (await scrapeArticleMeta(url))?.image : null;
    let image = null;
    if (imageCandidateUrl && !dryRun) {
      image = await downloadImage(imageCandidateUrl, slug);
      if (image) await writeDerivatives(image);
      if (image && !isCcLicense(license?.name)) {
        console.warn('WARN: fetching og:image from a work with unknown/non-CC licence — licence risk is yours, not the pipeline\'s');
      }
    }

    // Tier 2: still no image — conservative Commons auto-attach.
    // Attaches only on a stem match in the file title + CC/CC0/PD licence + >=1200px;
    // otherwise the story stays imageless for the normal attach-image flow.
    let autoMatch: { genus: string; title: string; url: string; pageUrl: string; licenseShort: string } | null = null;
    if (!image && headline) {
      const genus = taxonQuery(headline);
      if (genus) {
        const hit = await findCommonsMatch(genus);
        if (hit) {
          if (dryRun) {
            console.log(`[dry-run] WOULD Commons-attach: ${hit.title} | ${hit.licenseShort} | ${hit.width}px | ${hit.pageUrl}`);
          } else {
            const stored = await downloadImage(hit.url, slug);
            if (stored) {
              image = stored;
              await writeDerivatives(image);
              autoMatch = { genus, title: hit.title, url: hit.url, pageUrl: hit.pageUrl, licenseShort: hit.licenseShort };
              console.log(`Commons auto-attach: ${slug} ← ${hit.title} (${hit.licenseShort})`);
            }
          }
        } else if (dryRun) {
          console.log(`[dry-run] Commons: no confident match for stem "${genus}"`);
        }
      } else if (dryRun) {
        console.log('[dry-run] Commons: no taxon token detected in title');
      }
    }

    if (dryRun) {
      console.log(`[dry-run] WOULD CREATE ${slug} | ${uniqueSentence(headline, 60)} | img=${imageCandidateUrl ? 'og-image' : 'MISSING'}${license ? ` | lic=${license.name}` : ''}`);
      continue;
    }

    const [story] = await db.insert(editorialStories).values({
      slug,
      paperId: paper.id,
      headline,
      description,
      body: {
        image,
        imageAttribution: autoMatch ? autoMatch.pageUrl : (url || undefined),
        imageLicense: autoMatch ? autoMatch.licenseShort : (license?.name || undefined),
        imageLicenseUrl: license?.url || undefined,
        ...(autoMatch ? { imageAutoMatch: autoMatch.genus, imageAutoSource: autoMatch.title } : {}),
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

    if (image && autoMatch) {
      await db.insert(mediaAssets).values({
        paperId: paper.id,
        originalUrl: autoMatch.url,
        storagePath: image,
        attribution: `${autoMatch.pageUrl} — auto-matched on genus "${autoMatch.genus}"`,
        copyrightHolder: 'commons.wikimedia.org',
        licenseName: autoMatch.licenseShort,
        reuseStatus: 'pending_verification', // human flips to verified before publishing
      });
    } else if (image && imageCandidateUrl) {
      await db.insert(mediaAssets).values({
        paperId: paper.id,
        originalUrl: imageCandidateUrl,
        storagePath: image,
        attribution: url,
        copyrightHolder: new URL(url).hostname,
        licenseName: license?.name,
        licenseUrl: license?.url,
        reuseStatus: license?.name && isCcLicense(license.name) ? 'verified' : 'pending_verification',
      });
    }

    console.log(`CREATED ${slug} | postId=${nextPostId} | ${uniqueSentence(headline, 55)} | img=${image ?? 'MISSING-NEEDS-ATTACH-IMAGE'}${autoMatch ? ` (commons:${autoMatch.genus})` : ''}${license ? ` | lic=${license.name}` : ''}`);
    nextPostId++;
    created++;
  }

  console.log(`\nproposed=${created} limit=${limit} minScore=${doi?.length ? 'n/a (--doi)' : minScore} since=${sinceLabel}${doi?.length ? ` dois=${doi.join(',')}` : ''}`);
};

run().catch((e) => { console.error(e); process.exit(1); });
