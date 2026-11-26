"use server";

/**
 * Server actions for attaching imagery to a single story from the admin editor.
 * Uses Supabase Storage instead of the local filesystem (required on Vercel).
 * Same pipeline as `npm run editorial:attach-image` (fetch/read → sharp crop
 * to 1024×633 → derivatives → media_assets → body.image), but scoped to the
 * signed-in editor and to one story.
 */
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { editorialStories, mediaAssets } from "@/lib/db/schema";
import { normalizeCardImage } from "@/lib/image-derivatives";
import { requireEditor } from "@/lib/admin/articles";
import { MAX_IMAGE_BYTES, extensionForFormat, parseImageUrl } from "@/lib/images/attach-source";
import sharp from "sharp";

/** Supabase Storage bucket for story images. */
const BUCKET = "news-images";
const USER_AGENT = "DinosauriaNetwork/1.0 (mailto:research@dinosauria.net)";

/** Card render box is <img width=1024 height=633> (1.618:1). */
const CARD_RATIO = 1024 / 633;
const CARD_WIDTH = 1024;

/** Backwards-compatible alias used by attach/propose. */
export async function writeDerivatives(storagePath: string): Promise<string[]> {
  return (await normalizeCardImage(storagePath)).derivatives;
}

/**
 * Get a Supabase server client for storage operations.
 * Uses the request cookies to maintain the user's session.
 */
async function getSupabaseClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: async (cookiesToSet) => {
          for (const c of cookiesToSet) {
            try {
              await cookieStore.set(c.name, c.value, c.options as never);
            } catch {
              // Read-only context
            }
          }
        },
      },
    }
  );
}

/**
 * Upload a buffer to Supabase Storage and make it public.
 *
 * Returns { ok: true, publicUrl } where publicUrl is the storage object's public URL,
 * or { ok: false, error: str } on failure.
 */
async function uploadToSupabase(bytes: Buffer, filename: string, mimeType: string): Promise<{ ok: true; publicUrl: string } | { ok: false; error: string }> {
  const supabase = await getSupabaseClient();

  // Upload the base image
  const { data: baseData, error: baseErr } = await supabase.storage.from(BUCKET).upload(
    filename,
    bytes,
    { contentType: mimeType, upsert: true }
  );

  if (baseErr) return { ok: false, error: baseErr.message };

  // Get the public URL of the base image
  const { data: basePublic } = supabase.storage.from(BUCKET).getPublicUrl(baseData.path);
  const basePublicUrl = basePublic?.publicUrl ?? `https://${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace("https://", "")}/storage/v1/object/public/${BUCKET}/${baseData.path}`;

  // Generate derivatives with sharp and upload each one
  const widths = [1024, 640, 480];

  for (const width of widths) {
    const stem = `${filename}-${width}`;
    const processed = await sharp(bytes).resize({
      width,
      height: Math.round(width / CARD_RATIO),
      fit: "fill",
    }).toFormat("jpeg", { quality: 80 }).toBuffer();

    const { error: derivErr } = await supabase.storage.from(BUCKET).upload(
      stem + ".jpg",
      processed,
      { contentType: "image/jpeg", upsert: true }
    );

    if (derivErr) return { ok: false, error: derivErr.message };
  }

  return { ok: true, publicUrl: basePublicUrl };
}

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
async function readSource(formData: FormData): Promise<{ bytes: Buffer; source: string; remoteHost: string | null } | { error: string }> {
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
  const mimeType = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";

  // Process with sharp: crop to card ratio, generate derivatives
  const baseBuffer = await sharp(source.bytes).resize({
    width: CARD_WIDTH,
    height: Math.round(CARD_WIDTH / CARD_RATIO),
    fit: "fill",
  }).jpeg({ quality: 80 }).toBuffer();

  // Upload base + derivatives to Supabase Storage
  const result = await uploadToSupabase(baseBuffer, file, mimeType);
  if (!result.ok) return { ok: false, error: result.error };

  const storagePath = result.publicUrl;

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

/** Remove a dead/incorrect image reference from a story (leaves files on Supabase Storage). */
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