import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

/**
 * ArticleCard renders <source srcSet media> with -1024/-640/-480 derivatives.
 * Every DB-pipeline image must ship with all three alongside the base file.
 * Idempotent: skips variants that already exist.
 */
export async function writeDerivatives(storagePath: string): Promise<string[]> {
  const base = path.join(process.cwd(), 'public', storagePath);
  const ext = path.extname(base);
  const stem = base.slice(0, base.length - ext.length);
  const created: string[] = [];
  for (const width of [1024, 640, 480]) {
    const out = `${stem}-${width}.jpg`;
    if (fs.existsSync(out)) continue;
    await sharp(base)
      .resize({ width, withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toFile(out);
    created.push(path.relative(process.cwd(), out));
  }
  return created;
}
