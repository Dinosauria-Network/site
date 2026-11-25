import { db } from '../lib/db/client';
import { editorialStories, mediaAssets } from '../lib/db/schema';
import { getStoryBySlug, argValue } from './lib/story';
import { and, eq } from 'drizzle-orm';
import { writeDerivatives, CARD_RATIO } from '../lib/image-derivatives';
import { extensionForFormat } from '../lib/images/attach-source';
import { searchCommonsForTaxon, taxonQuery } from '../lib/images/commons';
import sharp from 'sharp';
import type { Metadata } from 'sharp';
import fs from 'fs';
import path from 'path';

/**
 * usage:
 *   npm run editorial:attach-image -- --slug <slug> --url <url-or-local-path>
 *   npm run editorial:attach-image -- --slug <slug> [--query "<taxon>"] [--pick N | --yes]
 *   npm run editorial:attach-image -- --slug <slug> --retry
 *
 * Without --url the script searches Wikimedia Commons for a taxon token taken
 * from the story headline (or --query), prints the eligible candidates with
 * their licence, and attaches nothing unless --pick N / --yes says which one.
 * --retry re-fetches the originalUrl already recorded in media_assets, which
 * repairs rows where the ledger was written but the file never landed.
 */

const args = process.argv.slice(2);
const slugArg = argValue(args, '--slug');
const urlArg = argValue(args, '--url');
const queryArg = argValue(args, '--query');
const pickArg = argValue(args, '--pick');
const positionals = args.filter((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--'));
const slug = slugArg ?? positionals[0];
const source = urlArg ?? (slugArg ? undefined : positionals[1]);
const yes = args.includes('--yes');
const retry = args.includes('--retry');
/** Below this effective width the 1024px card would be visibly upscaled. */
const LOW_RES_WIDTH = 900;
/** Below this it is a thumbnail, not a news image — refuse outright. */
const HARD_MIN_WIDTH = 400;

const pick = pickArg !== undefined ? Number(pickArg) : undefined;
if (pickArg !== undefined && (!Number.isInteger(pick) || (pick as number) < 1)) {
  console.error('--pick expects a positive integer (1 = first candidate)');
  process.exit(1);
}

const usage = () => {
  console.error('usage: npm run editorial:attach-image -- --slug <slug> --url <url-or-local-path>');
  console.error('       npm run editorial:attach-image -- --slug <slug> [--query "<taxon>"] [--list | --pick N | --yes]');
  console.error('       npm run editorial:attach-image -- --slug <slug> --retry   (re-fetch the recorded originalUrl)');
};

if (!slug) { usage(); process.exit(1); }

// Slugs name a file inside public/images/news/ — never allow path traversal.
if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
  console.error('Invalid slug (lowercase letters, digits, hyphens only):', slug);
  process.exit(1);
}

const writeBytes = (buf: Buffer, ext: string) => {
  const dir = path.join(process.cwd(), 'public', 'images', 'news');
  const resolvedDir = path.join(path.resolve(dir), '');
  const file = `${slug}.${ext}`;
  const target = path.join(resolvedDir, file);
  if (!target.startsWith(resolvedDir)) {
    console.error('Refusing to write outside images/news:', target);
    process.exit(1);
  }
  fs.mkdirSync(resolvedDir, { recursive: true });
  const storagePath = `/images/news/${file}`;
  fs.writeFileSync(target, buf);
  return storagePath;
};

interface StoreMeta {
  /** What the bytes came from: a URL, a local path, or a Commons file page. */
  source: string;
  copyrightHolder: string;
  licenseName?: string;
  licenseUrl?: string;
  /** Extra body keys (e.g. imageLicense for a CC image the site must credit). */
  bodyExtra?: Record<string, unknown>;
  note?: string;
}

/** Validate → write → crop/derivatives → media_assets → body.image. */
const storeImage = async (
  story: Awaited<ReturnType<typeof getStoryBySlug>>,
  bytes: Buffer,
  info: StoreMeta
) => {
  // Reject anything that isn't a readable image before it ever lands in public/,
  // and take the extension from the decoded bytes rather than the URL.
  let decoded: Metadata;
  try { decoded = await sharp(bytes).metadata(); } catch {
    console.error('Not a readable image:', info.source);
    process.exit(1);
  }
  const ext = extensionForFormat(decoded.format);
  if (!ext) {
    console.error(`Unsupported image format (${decoded.format ?? 'unknown'}) — refusing to store it as a news image:`, info.source);
    process.exit(1);
  }
  // The card renders at 1024px wide. Publisher figures (~600-700px) are accepted
  // with a warning, but a thumbnail-sized file is a mistake, not a judgement call.
  const effectiveWidth = Math.min(decoded.width ?? 0, Math.round((decoded.height ?? 0) * CARD_RATIO));
  if (effectiveWidth < HARD_MIN_WIDTH) {
    console.error(
      `Refusing a ${effectiveWidth}px-wide image (minimum ${HARD_MIN_WIDTH}px after cropping) — it would look badly upscaled on every card.`,
      '\nTry --query "<taxon>" for a Commons candidate, or --url with a larger version.',
      info.source
    );
    process.exit(1);
  }
  if (effectiveWidth < LOW_RES_WIDTH) {
    console.warn(
      `warning: ${effectiveWidth}px wide after cropping — cards render at 1024px, so expect some upscaling.`,
      info.source
    );
  }
  const storagePath = writeBytes(bytes, ext);
  const mediaWhere = story.paperId
    ? and(eq(mediaAssets.paperId, story.paperId), eq(mediaAssets.storagePath, storagePath))
    : eq(mediaAssets.storagePath, storagePath);
  await db.delete(mediaAssets).where(mediaWhere);
  await writeDerivatives(storagePath);
  await db.insert(mediaAssets).values({
    paperId: story.paperId,
    originalUrl: info.source,
    storagePath,
    attribution: info.source,
    copyrightHolder: info.copyrightHolder,
    licenseName: info.licenseName,
    licenseUrl: info.licenseUrl,
    reuseStatus: 'pending_verification',
  });
  await db.update(editorialStories)
    .set({
      body: {
        ...(story.body as object),
        image: storagePath,
        imageAttribution: info.source,
        ...(info.bodyExtra ?? {}),
      },
    })
    .where(eq(editorialStories.id, story.id));
  console.log('attached image', storagePath, 'to', slug);
  if (info.note) console.log(info.note);
};

const fetchImage = async (url: string): Promise<Buffer> => {
  let res: Response;
  try {
    res = await fetch(url, { headers: { 'user-agent': 'DinosauriaNetwork/1.0 (mailto:research@dinosauria.net)' }, signal: AbortSignal.timeout(20_000), redirect: 'follow' });
  } catch (e) {
    console.error('Fetch failed:', String(e).slice(0, 160), url);
    process.exit(1);
  }
  if (!res.ok) { console.error('Fetch failed:', res.status, url); process.exit(1); }
  const ct = res.headers.get('content-type') ?? '';
  if (!ct.startsWith('image/')) { console.error('Not an image content-type:', ct || '(none)', url); process.exit(1); }
  const bytes = Buffer.from(await res.arrayBuffer());
  if (bytes.length > 5 * 1024 * 1024) { console.error('Image too large (>5MB), refusing:', url); process.exit(1); }
  return bytes;
};

/** Commons discovery: show eligible candidates, attach only on --pick/--yes. */
const discover = async (story: Awaited<ReturnType<typeof getStoryBySlug>>) => {
  const token = queryArg?.trim() || taxonQuery(story.headline);
  if (!token) {
    console.error('No known taxon in the headline — pass --query "<taxon>" (e.g. --query Triceratops).');
    process.exit(1);
  }

  console.log(`searching Commons for "${token}" …`);
  const candidates = await searchCommonsForTaxon(token, 10);
  if (!candidates.length) {
    console.error(`No eligible Commons image for "${token}" (needs CC BY/BY-SA/CC0/PD and ≥1200px).`);
    console.error('Attach one explicitly with --url <url>.');
    process.exit(1);
  }

  console.log(`\n${candidates.length} eligible candidate(s) for "${token}" (best first):`);
  candidates.forEach((c, i) => {
    console.log(`  ${String(i + 1).padStart(2)}. ${c.title}`);
    console.log(`      ${c.licenseShort || 'licence unknown'} · ${c.width}×${c.height}px`);
    console.log(`      ${c.pageUrl}`);
  });

  const chosen = pick ?? (yes ? 1 : 0);
  if (!chosen) {
    console.log('\nNothing attached. Re-run with --yes (take #1) or --pick <n>.');
    console.log(`  npm run editorial:attach-image -- --slug ${slug} --pick 2`);
    return;
  }
  if (chosen > candidates.length) {
    console.error(`--pick ${chosen} is out of range (1–${candidates.length}).`);
    process.exit(1);
  }

  const hit = candidates[chosen - 1];
  console.log(`\nattaching #${chosen}: ${hit.title} (${hit.licenseShort || 'licence unknown'})`);
  const bytes = await fetchImage(hit.url);
  await storeImage(story, bytes, {
    source: hit.pageUrl,
    copyrightHolder: 'commons.wikimedia.org',
    licenseName: hit.licenseShort,
    bodyExtra: { imageLicense: hit.licenseShort },
    note: `licence ${hit.licenseShort || '(unknown)'} recorded — verify on Commons and flip media_assets.reuse_status before publishing.`,
  });
};

/**
 * Repair a half-attached row: the ledger (or the older CLI) recorded an
 * originalUrl and a local storagePath, but the file never made it into public/.
 * Re-fetch the recorded source and run the normal store pipeline.
 */
const retryOriginal = async (story: Awaited<ReturnType<typeof getStoryBySlug>>) => {
  const rows = story.paperId
    ? await db
        .select({ originalUrl: mediaAssets.originalUrl, storagePath: mediaAssets.storagePath })
        .from(mediaAssets)
        .where(eq(mediaAssets.paperId, story.paperId))
    : [];
  const ref = (story.body as { image?: unknown } | null)?.image;
  const row =
    rows.find((r) => typeof ref === 'string' && r.storagePath === ref) ?? rows[0];

  if (!row?.originalUrl) {
    console.error('No originalUrl recorded for', slug, '— use --query "<taxon>" or --url <url>.');
    process.exit(1);
  }
  if (!/^https?:\/\//i.test(row.originalUrl)) {
    console.error('Recorded originalUrl is not a remote URL:', row.originalUrl);
    console.error('Pass --url <url-or-local-path> instead.');
    process.exit(1);
  }

  console.log('re-fetching recorded source:', row.originalUrl);
  const bytes = await fetchImage(row.originalUrl);
  await storeImage(story, bytes, {
    source: row.originalUrl,
    copyrightHolder: new URL(row.originalUrl).hostname,
    note: 're-fetched from the recorded originalUrl — review licence before publishing.',
  });
};

const run = async () => {
  const story = await getStoryBySlug(slug);

  if (!source) {
    if (retry) await retryOriginal(story);
    else await discover(story);
    return;
  }

  if (!/^https?:\/\//.test(source)) {
    // Local file
    const src = path.resolve(source);
    if (!fs.existsSync(src)) { console.error('Local file not found:', src); process.exit(1); }
    await storeImage(story, fs.readFileSync(src), {
      source: src,
      copyrightHolder: path.basename(src),
      note: '(local file — review license/copyright before publishing)',
    });
    return;
  }

  const bytes = await fetchImage(source);
  await storeImage(story, bytes, { source, copyrightHolder: new URL(source).hostname });
};

run().catch((e) => { console.error(e); process.exit(1); });
