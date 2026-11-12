/**
 * Wikimedia Commons image search for Tier-2 auto-attach (used by editorial:propose).
 *
 * Deliberately conservative — an auto-attached image must pass ALL of:
 *   - licence is CC BY / CC BY-SA (no NC, no ND — the pipeline center-crops cards), CC0 or Public domain
 *   - width >= 1200px
 *   - one of the query tokens (the detected taxon token + its exact-token aliases) actually appears in the file title
 * Ranking: paleo-context token in title wins, then width. Anything else returns null and the
 * story is left imageless for the normal attach-image flow. Never throws.
 */

export interface CommonsCandidate {
  title: string;      // "File:..."
  pageUrl: string;    // commons description page — use for attribution
  url: string;        // direct file URL
  width: number;
  height: number;
  licenseShort: string;
}

const UA = 'DinosauriaNetwork/1.0 (mailto:research@dinosauria.network)';
const TIMEOUT_MS = 12_000;
const MIN_WIDTH = 1200;

const clean = (s: string) => (s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

function fetchJson(url: string): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  return fetch(url, { redirect: 'follow', signal: controller.signal, headers: { 'User-Agent': UA } })
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
    .finally(() => clearTimeout(timer));
}

/** CC BY / CC BY-SA family (any version) without NC/ND, CC0, public domain. */
export function isAllowedLicense(short: string | undefined): boolean {
  const s = (short || '').toLowerCase().replace(/\s+/g, ' ').trim();
  if (!s) return false;
  if (/nc|nd/.test(s)) return false; // derivatives (crop) forbidden / commercial ambiguity
  if (/^cc0/.test(s)) return true;
  if (/public domain|^pd(-|$)/.test(s)) return true;
  return /^cc by(-sa)?(\s|$)/.test(s);
}

const PALE = [
  'fossil', 'skeleton', 'restoration', 'reconstruction', 'skull', 'bone', 'holotype',
  'specimen', 'track', 'trace', 'dinosaur', 'pterosaur', 'crocodyl', 'sauropod', 'theropod',
  'ornithom', 'ornithopod', 'ichnite', 'ichno', 'cast of', 'footprint',
];
const paleoScore = (title: string) => (PALE.some((p) => title.toLowerCase().includes(p)) ? 1 : 0);

export async function searchCommons(tokens: string[], limit = 10): Promise<CommonsCandidate[]> {
  const terms = [...new Set(tokens.map((t) => t.trim().toLowerCase()).filter(Boolean))];
  const seen = new Map<string, CommonsCandidate>();
  for (const term of terms) {
    const params = new URLSearchParams({
      action: 'query',
      generator: 'search',
      gsrsearch: `${term} filetype:bitmap`,
      gsrnamespace: '6',
      gsrlimit: String(limit),
      prop: 'imageinfo',
      iiprop: 'url|size|extmetadata',
      format: 'json',
      formatversion: '2',
    });
    const j = await fetchJson(`https://commons.wikimedia.org/w/api.php?${params}`);
    for (const p of (j?.query?.pages ?? [])) {
      const title: string = p?.title ?? '';
      if (seen.has(title)) continue;
      const ii = (p.imageinfo || [])[0];
      if (!ii || ii.width < MIN_WIDTH) continue;
      const licenseShort = clean(ii.extmetadata?.LicenseShortName?.value);
      if (!isAllowedLicense(licenseShort)) continue;
      const tl = title.toLowerCase();
      if (!terms.some((t) => tl.includes(t))) continue;
      seen.set(title, {
        title,
        pageUrl: ii.descriptionurl || `https://commons.wikimedia.org/wiki/${title.replace(/ /g, '_')}`,
        url: String(ii.url).split('?')[0],
        width: ii.width,
        height: ii.height,
        licenseShort,
      });
    }
  }
  return [...seen.values()].sort(
    (a, b) => paleoScore(b.title) - paleoScore(a.title) || b.width - a.width
  );
}

/** Exact-token aliases for clade/genus mismatches (case-insensitive). */
const ALIASES: Record<string, string[]> = {
  anhangueridae: ['Anhanguera'],
  crocodylomorpha: ['Teleosauroid', 'Steneosaurus', 'Macrospondylus'],
  sauropod: ['Titanosaur', 'Patagotitan'],
  albertosaurine: ['Albertosaurus'],
  tyrannosaurine: ['Tyrannosaurus'],
};

/** Best Commons match for a taxon token, or null when nothing confident exists. */
export async function findCommonsMatch(token: string): Promise<CommonsCandidate | null> {
  try {
    const hits = await searchCommons([token, ...(ALIASES[token.toLowerCase()] ?? [])], 10);
    return hits[0] ?? null;
  } catch {
    return null;
  }
}

/**
 * Known-genus validation. The previous fallback ("first non-stoplist
 * capitalized token") matched common words on sentence-style blog titles in
 * production — "Introducing" (from "Introducing Laueropterus"), "Veracity"
 * (from "Veracity of Ikejiri's …") and "Diaz" (from "Diaz et al."). A token
 * must now be a taxon this site knows (the ~1550 genera in
 * _data/genus-data.json); otherwise no match is attempted. Misses genera
 * absent from the dataset — the conservative choice for an auto-attach path.
 */
import fs from 'fs';
import path from 'path';

let genusSet: Set<string> | null = null;
function loadGenera(): Set<string> {
  if (genusSet) return genusSet;
  try {
    const j = JSON.parse(fs.readFileSync(path.join(process.cwd(), '_data', 'genus-data.json'), 'utf8'));
    genusSet = new Set(
      (j.postTypes?.genus ?? []).map((g: any) => String(g.post_title ?? '').toLowerCase()).filter(Boolean),
    );
  } catch (e) {
    console.warn('warn: genus-data.json unreadable — taxon validation disabled (Tier-2 attaches nothing)');
    genusSet = new Set();
  }
  return genusSet;
}

/**
 * Extract the taxon token from a title. Returns a genus this site knows, or
 * null. Every common-English/sentence-initial word is impossible by
 * construction — no fallback guesses.
 */
/** Known-genus or known clade-alias token, or null — never a guess. */
export function taxonQuery(title: string): string | null {
  const known = loadGenera();
  const cladeKeys = new Set(Object.keys(ALIASES));
  const tokens = title.match(/[A-Za-z][A-Za-z-]*/g) ?? [];
  for (const raw of tokens) {
    const t = raw.toLowerCase();
    if (known.has(t) || cladeKeys.has(t)) return raw.charAt(0).toUpperCase() + t.slice(1);
  }
  return null;
}
