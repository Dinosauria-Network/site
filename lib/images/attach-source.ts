/** Guards for attaching a remote image to a story. Pure — no DB, no fs. */

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // matches the CLI's 5 MB cap

const FORMAT_TO_EXT: Record<string, string> = {
  jpeg: "jpg",
  png: "png",
  webp: "webp",
  avif: "avif",
};

/**
 * Extension for a sharp-detected format, or null when we refuse to store it.
 * The decision is made from the decoded bytes, never the URL or content-type,
 * and SVG is deliberately absent (script-in-svg is an XSS vector).
 */
export function extensionForFormat(format: string | null | undefined): string | null {
  return format ? FORMAT_TO_EXT[format] ?? null : null;
}

function isPrivateHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost")) return true;
  if (host.endsWith(".local") || host.endsWith(".internal") || host.endsWith(".home.arpa")) return true;

  const v4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const a = Number(v4[1]);
    const b = Number(v4[2]);
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true; // link-local / cloud metadata
    return false;
  }

  // IPv6 literals only — a "fc…" prefix on a normal domain is fine.
  if (host.includes(":")) {
    if (host === "::1" || host === "::") return true;
    if (host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80")) return true;
  }

  return false;
}

export type ParsedImageUrl = { ok: true; url: string } | { ok: false; error: string };

/** Validate a pasted image URL before the server fetches it. */
export function parseImageUrl(raw: string | null | undefined): ParsedImageUrl {
  const value = (raw ?? "").trim();
  if (!value) return { ok: false, error: "Paste an image URL or choose a file" };

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return { ok: false, error: "That is not a valid URL" };
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, error: "Only http(s) URLs are supported" };
  }
  if (url.username || url.password) {
    return { ok: false, error: "URLs with embedded credentials are not allowed" };
  }
  if (isPrivateHost(url.hostname)) {
    return { ok: false, error: "Refusing to fetch from a private or internal host" };
  }

  return { ok: true, url: url.toString() };
}
