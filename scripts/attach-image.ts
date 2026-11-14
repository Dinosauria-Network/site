import { db } from '../lib/db/client';
import { editorialStories, mediaAssets } from '../lib/db/schema';
import { getStoryBySlug } from './lib/story';
import { and, eq } from 'drizzle-orm';
import { writeDerivatives } from '../lib/image-derivatives';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const args = process.argv.slice(2);
const slugFlag = args.find((a, i) => args[i - 1] === '--slug');
const urlFlag = args.find((a, i) => args[i - 1] === '--url');
const positional = args.filter((a) => !a.startsWith('--'));
const slug = slugFlag ?? positional[0];
const source = urlFlag ?? positional[1];

if (!slug || !source) {
  console.error('usage: npm run editorial:attach-image -- --slug <slug> --url <url-or-local-path>');
  process.exit(1);
}

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

const run = async () => {
  const story = await getStoryBySlug(slug);

  let bytes: Buffer;
  if (/^https?:\/\//.test(source)) {
    const res = await fetch(source, { headers: { 'user-agent': 'DinosauriaNetwork/1.0 (mailto:research@dinosauria.net)' } });
    if (!res.ok) { console.error('Fetch failed:', res.status, source); process.exit(1); }
    const ct = res.headers.get('content-type') ?? '';
    if (!ct.startsWith('image/')) { console.error('Not an image content-type:', ct); process.exit(1); }
    bytes = Buffer.from(await res.arrayBuffer());
    if (bytes.length > 5 * 1024 * 1024) { console.error('Image too large (>5MB), refusing'); process.exit(1); }
    const ext = (ct.split('/')[1] || 'jpeg').replace('jpeg', 'jpg').replace('+xml', '').replace('svg', 'svg');
    const storagePath = writeBytes(bytes, ext);
    // paperId is nullable on stories — fall back to storagePath-only dedupe.
    const mediaWhere = story.paperId
      ? and(eq(mediaAssets.paperId, story.paperId), eq(mediaAssets.storagePath, storagePath))
      : eq(mediaAssets.storagePath, storagePath);
    await db.delete(mediaAssets).where(mediaWhere);
    await writeDerivatives(storagePath);
    await db.insert(mediaAssets).values({
      paperId: story.paperId,
      originalUrl: source,
      storagePath,
      attribution: source,
      copyrightHolder: new URL(source).hostname,
      reuseStatus: 'pending_verification',
    });
    await db.update(editorialStories)
      .set({ body: { ...(story.body as object), image: storagePath, imageAttribution: source } })
      .where(eq(editorialStories.id, story.id));
    console.log('attached image', storagePath, 'to', slug);
    return;
  }

  const src = path.resolve(source);
  if (!fs.existsSync(src)) { console.error('Local file not found:', src); process.exit(1); }
  bytes = fs.readFileSync(src);
  // Reject anything that isn't a readable image before it ever lands in public/
  try { await sharp(bytes).metadata(); } catch { console.error('Local file is not a valid image:', src); process.exit(1); }
  const ext = (path.extname(src).replace('.', '') || 'jpg').replace('jpeg', 'jpg');
  const storagePath = writeBytes(bytes, ext);
  const mediaWhere2 = story.paperId
    ? and(eq(mediaAssets.paperId, story.paperId), eq(mediaAssets.storagePath, storagePath))
    : eq(mediaAssets.storagePath, storagePath);
  await db.delete(mediaAssets).where(mediaWhere2);
  await writeDerivatives(storagePath);
  await db.insert(mediaAssets).values({
    paperId: story.paperId,
    originalUrl: src,
    storagePath,
    reuseStatus: 'pending_verification',
  });
  await db.update(editorialStories)
    .set({ body: { ...(story.body as object), image: storagePath } })
    .where(eq(editorialStories.id, story.id));
  console.log('attached image', storagePath, 'to', slug, '(local file — review license/copyright before publishing)');
};

run().catch((e) => { console.error(e); process.exit(1); });
