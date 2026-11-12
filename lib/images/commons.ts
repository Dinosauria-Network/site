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

const STOPLIST = new Set([
  'the', 'new', 'from', 'with', 'into', 'over', 'under', 'some', 'first', 'second',
  'third', 'upper', 'lower', 'middle', 'early', 'late', 'review', 'analysis', 'growth',
  'dynamics', 'notes', 'note', 'evidence', 'record', 'study', 'description', 'systematics',
  'discovery', 'fossil', 'remains', 'specimens', 'locality', 'formation', 'member',
  'basin', 'group', 'region', 'tracksite', 'jura', 'jurassic', 'cretaceous', 'triassic',
  'permian', 'pennsylvanian', 'devonian', 'mesozoic', 'cenozoic', 'maastrichtian',
  'campanian', 'coniacian', 'turonian', 'aptan', 'albian',
  'canada', 'alberta', 'mongolia', 'argentina', 'brazil', 'morocco', 'peru', 'china',
  'australia', 'japan', 'russia', 'europ', 'asia', 'africa', 'america', 'zealand',
  'american', 'european', 'asian', 'african', 'australian', 'eastern', 'western',
  'northern', 'southern', 'chico', 'querulpa', 'oldman', 'tyrannosaur', 'titanosaur',
  'arequipa', 'lisbon', 'madrid', 'paris', 'london', 'tokyo', 'berlin', 'beijing',
  'correction', 'corrections', 'erratum', 'errata', 'corrigendum', 'editorial',
  'comment', 'reply', 'response', 'obituary', 'keynote', 'abstract', 'supplement',
  'first', 'second', 'third', 'fourth', 'preface', 'foreword', 'index', 'contents',
]);

/**
 * Extract the most likely taxon token from a paper title.
 * Prefers a "Genus species" pair; falls back to the first non-stoplist capitalized token.
 * Returns null when nothing plausible is found (caller attaches nothing).
 */
export function taxonQuery(title: string): string | null {
  const pairs = title.match(/\b[A-Z][a-z]{2,}\s+[a-z]{2,}\b/g) ?? [];
  for (const pair of pairs) {
    const [genus, second] = pair.split(/\s+/);
    // Skip when either word is a non-taxon (e.g. "Oldman Formation", "Chico tracksite",
    // "Middle Jurassic") — place names and era words are useless queries.
    if (STOPLIST.has(genus.toLowerCase())) continue;
    if (STOPLIST.has(second.toLowerCase())) continue;
    return genus;
  }
  const singles = title.match(/\b[A-Z][a-z]{4,}\b/g) ?? [];
  for (const t of singles) {
    if (!STOPLIST.has(t.toLowerCase())) return t;
  }
  return null;
}
