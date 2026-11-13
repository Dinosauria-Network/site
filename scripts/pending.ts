import { db } from '../lib/db/client';
import { editorialStories, mediaAssets } from '../lib/db/schema';
import { asc, eq, inArray } from 'drizzle-orm';

const json = process.argv.includes('--json');
const showAll = process.argv.includes('--all');

const run = async () => {
  // Default: drafts only. --all adds pending_review.
  const statuses = showAll ? (['draft', 'pending_review'] as const) : (['draft'] as const);
  const rows = await db.select().from(editorialStories)
    .where(inArray(editorialStories.status, statuses))
    .orderBy(asc(editorialStories.createdAt))
    .limit(50);

  // Re-sort by original publication date (publishedAt), falling back to createdAt.
  rows.sort((a, b) => {
    const aDate = a.publishedAt ?? a.createdAt;
    const bDate = b.publishedAt ?? b.createdAt;
    if (!aDate && !bDate) return 0;
    if (!aDate) return 1;
    if (!bDate) return -1;
    return aDate > bDate ? 1 : aDate < bDate ? -1 : 0;
  });

  if (json) { console.log(JSON.stringify(rows, null, 2)); return; }
  if (!rows.length) { console.log(`No ${showAll ? 'pending' : 'draft'} stories.`); return; }

  // One query for all assets tied to these stories' papers.
  const paperIds = [...new Set(rows.map((s) => s.paperId).filter((p): p is string => !!p))];
  const assets = paperIds.length
    ? await db.select().from(mediaAssets).where(inArray(mediaAssets.paperId, paperIds))
    : [];
  const assetByPaper = new Map<string, typeof assets[number][]>();
  for (const a of assets) {
    if (!a.paperId) continue;
    const list = assetByPaper.get(a.paperId) ?? [];
    list.push(a);
    assetByPaper.set(a.paperId, list);
  }

  const licenseLine = (s: any, body: any): string => {
    if (!body.image) return '';
    const mine = (s.paperId && assetByPaper.get(s.paperId)) || [];
    const asset = mine.find((a: any) => a.storagePath === body.image) ?? mine[0];
    if (asset) return ` | license=${asset.licenseName ?? 'unknown'} (${asset.reuseStatus})`;
    if (body.imageLicense) return ` | license=${body.imageLicense}`;
    return ' | license=not recorded';
  };

  const needsImage = rows.filter((s) => !((s.body as any)?.image));
  console.log(`Pending (${rows.length}):\n`);
  for (const s of rows) {
    const body = (s.body ?? {}) as any;
    const img = body.image ? 'img ok' : 'NEEDS IMAGE';
    const score = body.editorialScore ?? 'n/a';
    console.log(`[${s.status}] ${s.slug}\n  ${img} | score=${score} | postId=${body.sourcePostId ?? 'n/a'}${licenseLine(s, body)}\n  ${s.headline}\n  ${body.url ?? ''}\n`);
  }

  if (needsImage.length) {
    console.log(`NEEDS IMAGE (${needsImage.length}) — attach with: npm run editorial:attach-image -- --slug <slug> --url <url-or-path>`);
    for (const s of needsImage) console.log(`  - ${s.slug} (postId=${(s.body as any)?.sourcePostId ?? 'n/a'})`);
  }
};

run().catch((e) => { console.error(e); process.exit(1); });
