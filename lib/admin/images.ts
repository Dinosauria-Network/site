"use server";

/**
 * Server actions for attaching imagery to a single story from the admin editor.
 * Same pipeline as `npm run editorial:attach-image` (fetch/read → sharp validate
 * → center-crop to 1024×633 → derivatives → media_assets → body.image), but
 * scoped to the signed-in editor and to one story.
 */
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { editorialStories, mediaAssets } from "@/lib/db/schema";
import { normalizeCardImage } from "@/lib/image-derivatives";
import { requireEditor } from "@/lib/admin/articles";
import { MAX_IMAGE_BYTES, extensionForFormat, parseImageUrl } from "@/lib/images/attach-source";

const NEWS_DIR = path.join(process.cwd(), "public", "images", "news");
const USER_AGENT = "DinosauriaNetwork/1.0 (mailto:research@dinosauria.net)";

export type AttachImageResult =
  | { ok: true; storagePath: string; source: string }
  | { ok: false; error: string };

type StoryRow = {
  id: string;
  slug: string;
  paperId: string | null;
  body: unknown;
};

async function loadStory(storyId: string): Promise<StoryRow | null> {
  if (!storyId) return null;
  const [story] = await db
    .select({
      id: editorialStories.id,
      slug: editorialStories.slug,
      paperId: editorialStories.paperId,
      body: editorialStories.body,
    })
    .from(editorialStories)
    .where(eq(editorialStories.id, storyId))
    .limit(1);
  return story ?? null;
}

/** Read the image bytes from an uploaded file or a remote URL. */
async function readSource(
  formData: FormData
): Promise<{ bytes: Buffer; source: string; remoteHost: string | null } | { error: string }> {
  const rawFile = formData.get("file");
  const file =
    typeof rawFile === "object" && rawFile !== null && "arrayBuffer" in rawFile
      ? (rawFile as File)
      : null;

  if (file && file.size > 0) {
    if (file.size > MAX_IMAGE_BYTES) return { error: "Image is larger than 5 MB" };
    return { bytes: Buffer.from(await file.arrayBuffer()), source: file.name || "upload", remoteHost: null };
  }

  const parsed = parseImageUrl(String(formData.get("url") ?? ""));
  if (!parsed.ok) return { error: parsed.error };

  let res: Response;
  try {
    res = await fetch(parsed.url, {
      headers: { "user-agent": USER_AGENT },
      signal: AbortSignal.timeout(15_000),
      redirect: "follow",
    });
  } catch {
    return { error: "Could not reach that URL (timeout or network error)" };
  }

  if (!res.ok) return { error: `Fetch failed: HTTP ${res.status}` };

  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.startsWith("image/")) {
    return { error: `That URL is not an image (content-type: ${contentType || "unknown"})` };
  }

  const bytes = Buffer.from(await res.arrayBuffer());
  if (bytes.length > MAX_IMAGE_BYTES) return { error: "Image is larger than 5 MB" };

  return { bytes, source: parsed.url, remoteHost: new URL(parsed.url).hostname };
}

/**
 * Attach (or replace) a story's image. Expects `storyId` plus either a `file`
 * upload or a `url`. Licence is left as `pending_verification` — a machine
 * match is never a human verification.
 */
export async function attachStoryImage(formData: FormData): Promise<AttachImageResult> {
  const editor = await requireEditor();
  if (!editor) return { ok: false, error: "Not signed in" };

  const story = await loadStory(String(formData.get("storyId") ?? ""));
  if (!story) return { ok: false, error: "Story not found" };

  // The slug becomes the filename, so it has to be a safe single path segment.
  if (!/^[a-z0-9][a-z0-9-]*$/.test(story.slug)) {
    return { ok: false, error: "This story's slug cannot be used as an image filename" };
  }

  const source = await readSource(formData);
  if ("error" in source) return { ok: false, error: source.error };

  // Trust the decoded bytes, not the declared type.
  let format: string | undefined;
  try {
    format = (await sharp(source.bytes).metadata()).format;
  } catch {
    return { ok: false, error: "That file is not a readable image" };
  }
  const ext = extensionForFormat(format);
  if (!ext) return { ok: false, error: `Unsupported image format: ${format ?? "unknown"}` };

  const file = `${story.slug}.${ext}`;
  const target = path.join(NEWS_DIR, file);
  if (!target.startsWith(NEWS_DIR + path.sep)) {
    return { ok: false, error: "Refusing to write outside public/images/news" };
  }

  try {
    await fs.mkdir(NEWS_DIR, { recursive: true });
    await fs.writeFile(target, source.bytes);
  } catch {
    return { ok: false, error: "Could not save the image file" };
  }

  const storagePath = `/images/news/${file}`;
  try {
    await normalizeCardImage(storagePath);
  } catch {
    return { ok: false, error: "Could not crop the image to the card ratio (is it too small?)" };
  }

  // Keep one ledger row per (paper, file), like the CLI does.
  const assetWhere = story.paperId
    ? and(eq(mediaAssets.paperId, story.paperId), eq(mediaAssets.storagePath, storagePath))
    : eq(mediaAssets.storagePath, storagePath);
  await db.delete(mediaAssets).where(assetWhere);
  await db.insert(mediaAssets).values({
    paperId: story.paperId,
    originalUrl: source.source,
    storagePath,
    attribution: source.source,
    copyrightHolder: source.remoteHost,
    reuseStatus: "pending_verification",
  });

  // Point the story at the new file and drop any licence/matching hints that
  // belonged to the previous image (they are no longer true).
  const body = { ...((story.body ?? {}) as Record<string, unknown>) };
  body.image = storagePath;
  body.imageAttribution = source.source;
  delete body.imageLicense;
  delete body.imageAutoMatch;
  delete body.imageAutoSource;

  await db
    .update(editorialStories)
    .set({ body, updatedAt: new Date() })
    .where(eq(editorialStories.id, story.id));

  return { ok: true, storagePath, source: source.source };
}

/** Remove a dead/incorrect image reference from a story (leaves files on disk). */
export async function clearStoryImage(storyId: string) {
  const editor = await requireEditor();
  if (!editor) return { ok: false as const, error: "Not signed in" };

  const story = await loadStory(storyId);
  if (!story) return { ok: false as const, error: "Story not found" };

  const body = { ...((story.body ?? {}) as Record<string, unknown>) };
  const removed = typeof body.image === "string" ? body.image : null;
  delete body.image;
  delete body.imageAttribution;
  delete body.imageLicense;
  delete body.imageAutoMatch;
  delete body.imageAutoSource;

  await db
    .update(editorialStories)
    .set({ body, updatedAt: new Date() })
    .where(eq(editorialStories.id, story.id));

  return { ok: true as const, removed };
}
