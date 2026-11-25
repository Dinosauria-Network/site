/** Server-side admin queries — the dashboard module's aggregates (Phase 5). */
import { requireRole } from "@/lib/supabase/roles";
import { db } from "@/lib/db/client";
import { researchPapers, editorialStories, mediaAssets, sourceRegistry } from "@/lib/db/schema";
import { count, sql } from "drizzle-orm";
import { readStoryImage } from "@/lib/admin/story-image";

export async function requireAdmin(): Promise<string> {
  return requireRole("admin");
}

export interface PipelineRow {
  status: string;
  count: number;
}

export interface ScoreBucket {
  /** Inclusive lower bound, e.g. 0.3 (bucket covers 0.3–0.4). */
  from: number;
  count: number;
}

export interface DashboardStats {
  totals: { papers: number; stories: number; images: number; sources: number };
  pipeline: PipelineRow[];
  ingestion: { days: { day: string; count: number }[]; total: number };
  scores: ScoreBucket[];
  attention: {
    unscoredPapers: number;
    draftsWithoutImage: number;
    pendingAssets: number;
    deadImageRefs: number;
    publishedLast30: number;
  };
}

const STATUS_ORDER = ['draft', 'pending_review', 'approved', 'published', 'rejected', 'archived'];

/** The dashboard's headline numbers, pipeline, ingestion series, score buckets and needs-attention counts. */
export async function adminStats(): Promise<DashboardStats> {
  const [paperRow] = await db.select({ value: count() }).from(researchPapers);
  const [imageRow] = await db.select({ value: count() }).from(mediaAssets);
  const [sourceRow] = await db.select({ value: count() }).from(sourceRegistry);

  const [statusRows, ingestionRes, scoreRes, unscoredRes, draftNoImgRes, pendingRes, publishedRes, imageRefs] =
    await Promise.all([
      db.select({ status: editorialStories.status, n: count() }).from(editorialStories).groupBy(editorialStories.status),
      // Zero-filled window in the database's own clock, so a quiet day shows as
      // a gap rather than vanishing. One extra day is fetched so trailing empty
      // days (the current UTC day before any ingest has run) can be trimmed.
      db.execute(sql`
        with days as (
          select generate_series(
            date_trunc('day', now()) - interval '7 days',
            date_trunc('day', now()),
            interval '1 day'
          ) as d
        )
        select to_char(days.d, 'YYYY-MM-DD') as day, count(p.id)::int as n
        from days
        left join research_papers p on date_trunc('day', p.created_at) = days.d
        group by days.d
        order by days.d`),
      db.execute(sql`
        with buckets as (select generate_series(1, 10) as b)
        select buckets.b as b, count(p.id)::int as n
        from buckets
        left join research_papers p
          on p.editorial_score is not null
         and width_bucket(p.editorial_score, 0, 1.0000001, 10) = buckets.b
        group by buckets.b
        order by buckets.b`),
      db.execute(sql`select count(*)::int as n from research_papers where editorial_score is null`),
      db.execute(sql`
        select count(*)::int as n from editorial_stories
        where status = 'draft'
          and coalesce(body->>'image', '') = ''`),
      db.execute(sql`select count(*)::int as n from media_assets where reuse_status = 'pending_verification'`),
      db.execute(sql`
        select count(*)::int as n from editorial_stories
        where status = 'published' and published_at >= now() - interval '30 days'`),
      // Dangling references: the story points at a local image that isn't on disk.
      db.execute(sql`
        select body from editorial_stories
        where coalesce(body->>'image', '') <> ''`),
    ]);

  const byStatus = new Map(statusRows.map((r) => [r.status ?? 'unknown', Number(r.n)]));
  const pipeline = [...byStatus.entries()]
    .map(([status, n]) => ({ status, count: n }))
    .sort((a, b) => {
      const ia = STATUS_ORDER.indexOf(a.status);
      const ib = STATUS_ORDER.indexOf(b.status);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });

  const allDays = (ingestionRes.rows as Array<{ day: string; n: number }>).map((r) => ({
    day: r.day,
    count: Number(r.n),
  }));
  // A dashboard read at 01:00 UTC would otherwise end with a lone zero bar and
  // look like ingestion had stopped. Trim trailing empty days, keeping 4+ bars.
  let days = allDays;
  while (days.length > 4 && days[days.length - 1].count === 0) days = days.slice(0, -1);

  const scores = (scoreRes.rows as Array<{ b: number; n: number }>).map((r) => ({
    from: Math.round((Number(r.b) - 1) * 10) / 100,
    count: Number(r.n),
  }));

  const deadImageRefs = (imageRefs.rows as Array<{ body: unknown }>).filter(
    (r) => readStoryImage(r.body).status === 'missing'
  ).length;

  const num = (res: { rows: Array<Record<string, unknown>> }) => Number(res.rows[0]?.n ?? 0);

  return {
    totals: {
      papers: Number(paperRow?.value ?? 0),
      stories: statusRows.reduce((sum, r) => sum + Number(r.n), 0),
      images: Number(imageRow?.value ?? 0),
      sources: Number(sourceRow?.value ?? 0),
    },
    pipeline,
    ingestion: { days, total: days.reduce((sum, d) => sum + d.count, 0) },
    scores,
    attention: {
      unscoredPapers: num(unscoredRes),
      draftsWithoutImage: num(draftNoImgRes),
      pendingAssets: num(pendingRes),
      deadImageRefs,
      publishedLast30: num(publishedRes),
    },
  };
}
