import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

/** Card render box is <img width=1024 height=633> (1.618:1). */
export const CARD_RATIO = 1024 / 633;
export const CARD_WIDTH = 1024;

const TOLERANCE = 0.005;

/**
 * Normalizes a base news image to the card ratio (center-crop, no
 * upscale) and (re)generates the -1024/-640/-480.jpg derivatives.
 * Idempotent for bases already on-ratio; derivatives are rewritten
 * from the (possibly cropped) base.
 */
/** Resolve storagePath inside public/ and refuse anything that escapes it. */
function publicPath(storagePath: string): string {
  const pubRoot = path.resolve(process.cwd(), 'public');
  // Strip leading slashes so "/images/news/x.jpg" stays relative to public/.
  const base = path.join(pubRoot, storagePath.replace(/^[/\\]+/, ''));
  if (!base.startsWith(pubRoot + path.sep)) {
    throw new Error(`storagePath escapes public/: ${storagePath}`);
  }
  return base;
}

export async function normalizeCardImage(storagePath: string): Promise<{
  croppedBase: boolean;
  derivatives: string[];
}> {
  const base = publicPath(storagePath);
  const ext = path.extname(base).toLowerCase();
  const stem = base.slice(0, base.length - ext.length);

  const meta = await sharp(base).metadata();
  if (!meta.width || !meta.height) throw new Error(`unreadable image: ${base}`);

  let croppedBase = false;
  const ratio = meta.width / meta.height;
  if (Math.abs(ratio - CARD_RATIO) > TOLERANCE) {
    const tmp = `${base}.tmp-${process.pid}`;
    // Largest centered crop that reaches the target ratio (no enlargement).
    const cropW = ratio > CARD_RATIO ? Math.round(meta.height * CARD_RATIO) : meta.width;
    const cropH = ratio > CARD_RATIO ? meta.height : Math.round(meta.width / CARD_RATIO);
    const left = Math.round((meta.width - cropW) / 2);
    const top = Math.round((meta.height - cropH) / 2);
    let pipe = sharp(base).extract({ left, top, width: cropW, height: cropH });
    if (cropW > CARD_WIDTH) pipe = pipe.resize({ width: CARD_WIDTH });
    if (ext === '.webp') await pipe.webp({ quality: 82 }).toFile(tmp);
    else if (ext === '.png') await pipe.png({ quality: 80, compressionLevel: 9 }).toFile(tmp);
    else await pipe.jpeg({ quality: 80 }).toFile(tmp);
    fs.renameSync(tmp, base);
    croppedBase = true;
  }

  const created: string[] = [];
  for (const width of [1024, 640, 480]) {
    const out = `${stem}-${width}.jpg`;
    await sharp(base)
      .resize({ width, height: Math.round(width / CARD_RATIO), fit: 'fill' })
      .jpeg({ quality: 80 })
      .toFile(out);
    created.push(path.relative(process.cwd(), out));
  }
  return { croppedBase, derivatives: created };
}

/** Backwards-compatible alias used by attach/propose. */
export async function writeDerivatives(storagePath: string): Promise<string[]> {
  return (await normalizeCardImage(storagePath)).derivatives;
}
