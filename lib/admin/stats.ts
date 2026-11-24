/** Server actions (Phase 5) — used by the admin UI for counts and direct mutations. */
import { requireRole } from "@/lib/supabase/roles";
import { db } from "@/lib/db/client";
import { researchPapers, editorialStories, mediaAssets, sourceRegistry } from "@/lib/db/schema";
import { count, eq } from "drizzle-orm";

export async function requireAdmin(): Promise<string> {
  return requireRole("admin");
}

interface CorpusStats {
  papers: number;
  imageCount: number;
  sourceCount: number;
  stories: Record<string, number>;
}

/** Corpus stats shown on the admin dashboard. */
export async function adminStats(): Promise<CorpusStats> {
  const [paperRow] = await db.select({ value: count() }).from(researchPapers);
  const [imageRow] = await db.select({ value: count() }).from(mediaAssets);
  const [sourceRow] = await db.select({ value: count() }).from(sourceRegistry);
  const rows = await db
    .select({ status: editorialStories.status, n: count() })
    .from(editorialStories)
    .groupBy(editorialStories.status)
    .orderBy(eq(editorialStories.status, editorialStories.status));
  return {
    papers: Number(paperRow?.value ?? 0),
    imageCount: Number(imageRow?.value ?? 0),
    sourceCount: Number(sourceRow?.value ?? 0),
    stories: Object.fromEntries(rows.map((r) => [r.status, Number(r.n)])),
  };
}
