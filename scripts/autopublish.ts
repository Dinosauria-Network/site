import { db } from '../lib/db/client';
import { editorialStories, mediaAssets, researchPapers, publicationEvents } from '../lib/db/schema';
import { eq, inArray } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

/**
 * editorial:autopublish — the daily-cron publish gate.
 *
 * A draft is published only when ALL of the following hold:
 *   1. Jev-Style score >= --min-score (default 0.75)
 *   2. description is non-empty
 *   3. an image is attached (body.image)
 *   4. the matching media_assets row (storagePath = body.image) records a
 *      machine-known CC licence: CC BY / CC BY-SA (any version, no NC/ND),
 *      CC0, or Public domain. Commons extmetadata licences are fine;
 *      publisher og:image with no licence recorded is NOT eligible.
 *   5. the story is not erratum-type (Correction/Erratum/Corrigendum/Addendum)
 *
 * Everything else stays draft with a reason printed. Nothing is published
 * from unverified licences; media_assets.reuseStatus is never flipped —
 * 'pending_verification' rows published this way remain pending for a later
 * human audit (by design; machine licence ≠ human verification).
 * Every publish writes a publication_events row with metadata.autoPublished=true.
 * --dry-run prints the same report and writes nothing.
 */

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const minScoreIdx = args.indexOf('--min-score');
const minScore = minScoreIdx >= 0 ? Number(args[minScoreIdx + 1]) || 0.75 : 0.75;

/** CC BY family (BY / BY-SA / BY-ND, any version), CC0, and Public domain. Accepts short ("CC BY-ND 4.0") and long ("Creative Commons Attribution-Share Alike 4.0 International") forms. The full BY family is accepted — ND records a derivative constraint to audit, an unknown licence does not. */
const isMachineKnownCc = (lic?: string | null): boolean => {
  if (!lic) return false;
  const s = lic.toLowerCase().replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();
  if (/noncommercial|nc\b|nc,|creative commons noncommercial/.test(s)) return false; // NC — unconfirmed reuse rights
  if (/\bcc0\b|creative commons zero/.test(s)) return true;
  if (/public domain/.test(s)) return true;
  return /cc\s?by/.test(s) || /creative commons attribution/.test(s);
};

const ERRATUM_RE = /^(correction|erratum|corrigendum|errata|addendum|note added)\b/i;

const run = async () => {
  const drafts = await db.select({
    story: editorialStories,
    paperScore: researchPapers.editorialScore,
  })
    .from(editorialStories)
    .leftJoin(researchPapers, eq(editorialStories.paperId, researchPapers.id))
    .where(eq(editorialStories.status, 'draft'));

  if (!drafts.length) {
    console.log('autopublish: no drafts in the queue.');
    return;
  }

  const paperIds = drafts.map((d) => d.story.paperId).filter((x): x is string => !!x);
  const assets = paperIds.length
    ? await db.select().from(mediaAssets).where(inArray(mediaAssets.paperId, paperIds))
    : [];
  const assetsFor = (paperId: string | null) => assets.filter((a) => a.paperId === paperId);

  const published: string[] = [];
  const skipped: string[] = [];

  for (const { story, paperScore } of drafts) {
    const body = (story.body ?? {}) as any;
    const image: string | undefined = body.image || undefined;
    // Boosts are intentionally NOT applied here — autopublish uses the raw
    // Jev-Style score so a boosted paper still needs human review to publish.
    const score: number | null = paperScore ?? (typeof body.editorialScore === 'number' ? body.editorialScore : null);
    const reasons: string[] = [];

    if (score == null) reasons.push('no Jev-Style score');
    else if (score < minScore) reasons.push(`score ${score.toFixed(3)} < ${minScore}`);
    if (!story.description?.trim()) reasons.push('empty description');
    if (!image) reasons.push('no image');
    if (image) {
      const mine = assetsFor(story.paperId).filter((a) => a.storagePath === image);
      const lic = mine[0]?.licenseName;
      if (!mine.length) reasons.push('image has no media_assets row');
      else if (!isMachineKnownCc(lic)) reasons.push(`licence not machine-known CC (${lic ?? 'unknown'})`);
      else if (image) {
        const imagePath = path.join(process.cwd(), 'public', 'images', 'news', image);
        if (!fs.existsSync(imagePath)) {
          reasons.push('image file missing on disk');
        }
      }
    }
    if (ERRATUM_RE.test((story.headline || '').trim())) reasons.push('erratum-type headline');

    if (reasons.length) {
      skipped.push(`${story.slug} — ${reasons.join('; ')}`);
      continue;
    }

    if (!dryRun) {
      await db.update(editorialStories)
        // Keep the story's date (paper/feed publication date set at propose);
        // now() only for rows created before that behaviour.
        .set({ status: 'published', publishedAt: story.publishedAt ?? new Date(), updatedAt: new Date() })
        .where(eq(editorialStories.id, story.id));
      await db.insert(publicationEvents).values({
        storyId: story.id,
        eventType: 'published',
        previousStatus: 'draft',
        newStatus: 'published',
        metadata: { autoPublished: true, minScore, score },
      });
    }
    published.push(`${story.slug}${dryRun ? ' (dry-run)' : ''}`);
  }

  console.log(`autopublish: ${published.length} eligible, ${skipped.length} staying draft (min-score ${minScore}${dryRun ? ', dry-run' : ''})`);
  for (const s of published) console.log('  PUBLISH', s);
  for (const s of skipped) console.log('  hold   ', s);
};

run().catch((e) => { console.error(e); process.exit(1); });
