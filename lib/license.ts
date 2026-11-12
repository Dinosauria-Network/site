/**
 * Extract a best-effort license hint from paper metadata.
 * Crossref deposits licence as metadata.license[]; Europe PMC tags OA works with isOpenAccess.
 * Returns null when nothing is declared — callers must not block on this.
 */
export function extractLicense(metadata: unknown): { name?: string; url?: string } | null {
  const m = (metadata ?? {}) as Record<string, any>;
  // Crossref
  if (Array.isArray(m.license) && m.license.length > 0) {
    const lic = m.license[0];
    const url = lic?.URL || lic?.url || '';
    // Map CC URLs to friendly names
    const name = ccName(url) || lic?.content_version || lic?.contentVersion || 'License';
    return { name, url };
  }
  // Europe PMC open-access without explicit licence URL
  if (m.isOpenAccess === 'Y' || m.is_open_access === true) {
    return { name: 'Open Access', url: undefined };
  }
  return null;
}

function ccName(url: string): string | undefined {
  const u = (url || '').toLowerCase().replace('creativecommons.org/licenses/', '');
  if (u.includes('by-nd')) return 'CC BY-ND';
  if (u.includes('by-sa')) return 'CC BY-SA';
  if (u.includes('by-nc-nd')) return 'CC BY-NC-ND';
  if (u.includes('by-nc-sa')) return 'CC BY-NC-SA';
  if (u.includes('by-nc')) return 'CC BY-NC';
  if (u.includes('by/')) return 'CC BY';
  if (u.includes('zero')) return 'CC0';
  return undefined;
}

/** Strip JATS/HTML tags and collapse whitespace. */
export function stripTags(html: string | null | undefined): string {
  if (!html) return '';
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Sentence-bound prefix of `text` at most `max` chars; whole sentences only. */
export function sentencePrefix(text: string, max = 240): string {
  if (!text) return '';
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  const sentences = trimmed.match(/[^.!?]+[.!?]+(?=\s|$)/g) ?? [trimmed];
  let out = '';
  for (const s of sentences) {
    if ((out + s).length > max) break;
    out += s;
  }
  return (out || trimmed.slice(0, max).replace(/\s\S*$/, '').trim()).trim();
}
