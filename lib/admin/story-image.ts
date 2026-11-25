import fs from "node:fs";
import path from "node:path";

const PUBLIC_ROOT = path.join(process.cwd(), "public");
const NEWS_DIR = path.join(PUBLIC_ROOT, "images", "news");

/**
 * ok         = local file confirmed on disk
 * missing    = local reference we can prove is dead (or a remote URL we refuse)
 * unverified = `public/` isn't readable from this runtime, so let the browser decide
 * none       = no image was ever set
 */
export type StoryImageStatus = "ok" | "missing" | "unverified" | "none";

export interface StoryImage {
  /** Candidate path for <img src>, or null when nothing should be rendered. */
  src: string | null;
  /** The raw `body.image` value, kept so the UI can explain a dead reference. */
  referenced: string | null;
  status: StoryImageStatus;
}

/**
 * Resolve a story's image for the admin UI.
 *
 * The public site renders whatever `editorial_stories.body.image` holds, so the
 * admin reads that same field — not `media_assets`, which is only the asset
 * ledger and can disagree with what a reader actually sees. Only local
 * `/images/...` paths are previewable (remote publisher URLs aren't licensed for
 * reuse), and a dangling reference would otherwise paint a broken square in the
 * articles table, so the file is checked when the filesystem allows it.
 */
export function readStoryImage(body: unknown): StoryImage {
  const raw = (body as { image?: unknown } | null | undefined)?.image;
  const referenced = typeof raw === "string" && raw.trim() !== "" ? raw.trim() : null;

  if (!referenced) return { src: null, referenced: null, status: "none" };
  if (!referenced.startsWith("/images/")) return { src: null, referenced, status: "missing" };

  const abs = path.join(PUBLIC_ROOT, referenced.replace(/^\/+/, ""));
  // Refuse anything that escapes public/ after normalisation.
  if (!abs.startsWith(PUBLIC_ROOT + path.sep)) return { src: null, referenced, status: "missing" };

  // On a runtime without `public/` on disk (e.g. a serverless bundle) we cannot
  // judge existence; hand the path to the browser and let its 404 handler decide.
  if (!fs.existsSync(NEWS_DIR)) return { src: referenced, referenced, status: "unverified" };

  return fs.existsSync(abs)
    ? { src: referenced, referenced, status: "ok" }
    : { src: null, referenced, status: "missing" };
}
