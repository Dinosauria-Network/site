"use server";

/** Server actions for the admin Article editor (Phase 5). */
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { editorialStories, publicationEvents, userProfiles } from "@/lib/db/schema";
import { createServerClientNow } from "@/lib/supabase/server";

/** Authenticated editor user (returns email or null). */
export async function requireEditor(): Promise<string | null> {
  const supabase = await createServerClientNow();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.email ?? null;
}

/** Resolve the editor's userProfiles.id from their Supabase email. */
async function editorUserId(email: string | null): Promise<string | null> {
  if (!email) return null;
  const [row] = await db
    .select({ id: userProfiles.id })
    .from(userProfiles)
    .where(eq(userProfiles.email, email.toLowerCase()))
    .limit(1);
  return row?.id ?? null;
}

/** Set a story's status, recording a publication_event and the editor. */
export async function setStoryStatus(storyId: string, status: "draft" | "published" | "rejected" | "pending_review") {
  const editor = await requireEditor();
  const editorId = await editorUserId(editor);
  const story = await db.select().from(editorialStories).where(eq(editorialStories.id, storyId)).limit(1);
  if (!story.length) return { ok: false as const, error: "Story not found" };
  const previousStatus = story[0].status;
  if (previousStatus === status) return { ok: true as const };
  await db
    .update(editorialStories)
    .set({ status, updatedAt: new Date() })
    .where(eq(editorialStories.id, storyId));
  if (status === "published" && !story[0].publishedAt) {
    await db.update(editorialStories).set({ publishedAt: new Date() }).where(eq(editorialStories.id, storyId));
  }
  await db.insert(publicationEvents).values({
    storyId,
    userId: editorId,
    eventType: "status",
    previousStatus,
    newStatus: status,
    metadata: { via: "admin", email: editor },
  });
  return { ok: true as const, previousStatus, newStatus: status, editor };
}

/** Hard-delete a story (cascades to its publication_events). */
export async function deleteStory(storyId: string) {
  const editor = await requireEditor();
  const story = await db.select().from(editorialStories).where(eq(editorialStories.id, storyId)).limit(1);
  if (!story.length) return { ok: false as const, error: "Story not found" };
  const headline = story[0].headline;
  await db.delete(editorialStories).where(eq(editorialStories.id, storyId));
  return { ok: true as const, deletedStoryId: storyId, headline, editor };
}

/** Toggle featured on/off for a story. */
export async function setStoryFeatured(storyId: string, featured: boolean) {
  await db
    .update(editorialStories)
    .set({ featured, updatedAt: new Date() })
    .where(eq(editorialStories.id, storyId));
  return { ok: true as const, featured };
}

/** Update editable fields (headline/description/deck/slug) for a story. */
export async function updateStoryFields(
  storyId: string,
  fields: Partial<{ headline: string; description: string; deck: string | null; slug: string }>
) {
  await db
    .update(editorialStories)
    .set({ ...fields, updatedAt: new Date() })
    .where(eq(editorialStories.id, storyId));
  return { ok: true as const };
}
