/**
 * Dev-only preview visibility for unpublished editorial stories (drafts /
 * pending_review).
 *
 * - development: any `?preview` enables drafts (bare `?preview` works;
 *   `0`/`false` disable)
 * - production:  completely disabled — unpublished stories can never be
 *   loaded via query params in a prod build. To review drafts for publish,
 *   use `npm run editorial:pending` / `editorial:publish`.
 *
 * `previewValue` returns the (normalized) value used for card links, or null.
 */
export function previewValue(
  searchParams?: { [key: string]: string | string[] | undefined },
): string | null {
  if (process.env.NODE_ENV !== 'development') return null;
  const raw = searchParams?.preview;
  if (raw === undefined || raw === null) return null; // absent
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === '0' || value === 'false') return null;
  // Bare `?preview` resolves to '' — the flag is present, so it enables.
  return String(value) || '1';
}

export function isPreviewEnabled(
  searchParams?: { [key: string]: string | string[] | undefined },
): boolean {
  return previewValue(searchParams) !== null;
}
