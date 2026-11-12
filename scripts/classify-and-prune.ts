import { db } from '../lib/db/client';
import { researchPapers, editorialStories } from '../lib/db/schema';
import { classifyDinosaur } from '../lib/ai/jev-style';

/**
 * Classify unscored papers and persist editorial_score.
 *
 * Only rows with editorial_score IS NULL get classified (re-scoring everything
 * every run wastes Jev-Style calls and muddles review history). Results are
 * ordered by publication_date DESC so the newest papers score first — matches
 * the news-site ordering used everywhere else.
 *
 * By default this is score-and-report only. Pass --prune to additionally delete
 * papers below the threshold (default 0.25) — a paper linked to any story
 * (draft or published) is never deleted. `editorial:generate` and
 * `editorial:classify` are both aliases of this script, per AGENTS.md.
 *
 * Args:
 *   --limit N     max rows to score (default 30)
 *   --threshold   delete cutoff (default 0.25)
 *   --prune       actually delete below-threshold papers (default: dry-run)
 *   --since       only score papers published on/after YYYY[-MM[-DD]] or "all"
 */
const parseLimit = (args: string[], def = 30) => {
  const i = args.indexOf('--limit');
  const v = i >= 0 ? parseInt(args[i + 1], 10) : NaN;
  return Number.isFinite(v) && v > 0 ? v : def;
};
const parseThreshold = (args: string[], def = 0.25) => {
  const i = args.indexOf('--threshold');
  const v = i >= 0 ? parseFloat(args[i + 1]) : NaN;
  return Number.isFinite(v) && v >= 0 && v <= 1 ? v : def;
};

const run = async () => {
  const args = process.argv.slice(2);
  const limit = parseLimit(args);
  const threshold = parseThreshold(args);
  const prune = args.includes('--prune');

  const sinceArg = args.indexOf('--since');
  let since: Date | null = null;
  if (sinceArg >= 0) {
    const raw = (args[sinceArg + 1] || '').toLowerCase();
    if (raw !== 'all') {
      const m = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/.exec(raw);
      if (!m) { console.error('bad --since value:', raw); process.exit(1); }
      const y = Number(m[1]);
      const month = m[2] ? Number(m[2]) : 1;
      const day = m[3] ? Number(m[3]) : 1;
      if (month < 1 || month > 12 || day < 1 || day > 31) { console.error('bad --since value:', raw); process.exit(1); }
      since = new Date(Date.UTC(y, month - 1, day));
    }
  }

  const key = process.env.JEVSTYLE_API_KEY || '';

  // Phase 1 — score papers that have no stored score yet (never re-scores).
  if (key) {
    const where = [
      isNull(researchPapers.editorialScore),
      ...(since ? [gte(researchPapers.publicationDate, since)] : []),
    ];
    const papers = await db.select().from(researchPapers)
      .where(and(...where))
      .orderBy(desc(sql`coalesce(publication_date, created_at)`))
      .limit(limit);

    if (papers.length) {
      console.log(`Scoring ${papers.length} unscored paper(s) (limit=${limit} threshold=${threshold}${prune ? ' | --prune ON' : ''}):`);
      for (const p of papers) {
        try {
          const cls = await classifyDinosaur(p.title + ' ' + (p.abstract || ''), key) as any;
          const prob = cls.answers?.dinosaur?.noul ?? cls.questions?.dinosaur?.probability ?? 0;
          await db.update(researchPapers)
            .set({ editorialScore: prob })
            .where(eq(researchPapers.id, p.id));
          console.log(`${prob.toFixed(3)} | ${p.title?.slice(0, 60)} | id=${p.id}`);
        } catch (e) { console.log('ERR', p.id, String(e).slice(0, 120)); }
      }
    } else {
      console.log('No unscored papers to classify.');
    }
  } else {
    console.log('No JEVSTYLE_API_KEY set — skipping scoring.');
  }

  // Phase 2 — sweep papers below threshold. Never touches a paper linked to a
  // story (deleting it would set-null the story's paper_id and sever the
  // citation for a post that may already be live).
  if (prune) {
    const low = await db.select({ id: researchPapers.id, title: researchPapers.title, score: researchPapers.editorialScore })
      .from(researchPapers)
      .where(lt(researchPapers.editorialScore, threshold));
    let deleted = 0, skipped = 0;
    for (const p of low) {
      const linked = await db.select({ x: editorialStories.id }).from(editorialStories).where(eq(editorialStories.paperId, p.id)).limit(1);
      if (linked.length) { skipped++; console.log(`skipped (has story) ${p.score?.toFixed(3)} | ${p.title?.slice(0, 60)}`); continue; }
      await db.delete(researchPapers).where(eq(researchPapers.id, p.id));
      console.log(`pruned ${p.score?.toFixed(3)} | ${p.title?.slice(0, 60)}`);
      deleted++;
    }
    console.log(`\nDeleted ${deleted} paper(s) below threshold ${threshold}.${skipped ? ` Skipped ${skipped} below-threshold paper(s) linked to a story.` : ''}`);
  } else {
    console.log(`\nDry-run complete. Re-run with --prune to delete below ${threshold} (papers linked to a story are never deleted).`);
  }
};

import { and, desc, eq, gte, isNull, lt, sql } from 'drizzle-orm';
run().catch((e) => { console.error(e); process.exit(1); });
