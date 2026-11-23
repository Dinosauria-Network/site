/**
 * enrich-genus-locations.ts
 *
 * Populate `meta.fossilLocations` on each genus entry in _data/genus-data.json
 * from the Paleobiology Database (PBDB) data service.
 *
 *   https://paleobiodb.org/data1.2/occs/list.json?base_name=<Genus>&show=loc,coords
 *
 * `base_name` (not `taxon_name`) is deliberate: it matches the genus *and* its
 * child taxa, which is where most PBDB occurrences are identified. With
 * taxon_name only 335 of 1,550 genera matched; base_name finds 1,461.
 *
 * Each occurrence carries country/state/county and lat/lng. We aggregate
 * occurrences into a small set of map points (rounded to ~0.5°) so the JSON
 * stays lean, then keep the most-repeated points per genus.
 *
 * Usage:
 *   npx tsx scripts/enrich-genus-locations.ts                # all genera
 *   npx tsx scripts/enrich-genus-locations.ts --limit 50     # first 50
 *   npx tsx scripts/enrich-genus-locations.ts --genus Triceratops
 *   npx tsx scripts/enrich-genus-locations.ts --force        # ignore cache
 *
 * Cache: _data/pbdb-cache.json (per-taxon raw locations) so re-runs are cheap
 * and a failed/slow API run is resumable. Entries are tagged with
 * CACHE_VERSION; bump it when the query or aggregation changes.
 */

import fs from 'fs';
import path from 'path';

interface Bubble {
  lat: number;
  lng: number;
  country: string;
  state?: string;
  count: number;
  /** Dominant geologic period for this bubble's occurrences. */
  period?: string;
  /** Age range (Ma) covered by the bubble's occurrences. */
  minMa?: number;
  maxMa?: number;
}

interface CacheEntry {
  fetchedAt: string;
  /** Bump when the query/aggregation changes so stale caches are ignored. */
  version: number;
  locations: Bubble[];
}

/** 1 = taxon_name; 2 = base_name; 3 = + geologic period/age per bubble. */
const CACHE_VERSION = 4;

type Cache = Record<string, CacheEntry>;

const DATA_PATH = path.join(process.cwd(), '_data', 'genus-data.json');
const CACHE_PATH = path.join(process.cwd(), '_data', 'pbdb-cache.json');
const MAX_POINTS = 60;

const COUNTRY_NAMES: Record<string, string> = {
  US: 'United States', CA: 'Canada', MX: 'Mexico', AR: 'Argentina', BR: 'Brazil',
  CL: 'Chile', CO: 'Colombia', PE: 'Peru', UY: 'Uruguay', VE: 'Venezuela',
  GB: 'United Kingdom', FR: 'France', DE: 'Germany', ES: 'Spain', PT: 'Portugal',
  IT: 'Italy', NL: 'Netherlands', BE: 'Belgium', CH: 'Switzerland', AT: 'Austria',
  SE: 'Sweden', NO: 'Norway', DK: 'Denmark', FI: 'Finland', PL: 'Poland',
  RU: 'Russia', UA: 'Ukraine', RO: 'Romania', HU: 'Hungary', CZ: 'Czechia',
  CN: 'China', MN: 'Mongolia', JP: 'Japan', KR: 'South Korea', IN: 'India',
  AU: 'Australia', NZ: 'New Zealand', ZA: 'South Africa', EG: 'Egypt',
  MA: 'Morocco', DZ: 'Algeria', TN: 'Tunisia', LY: 'Libya', NE: 'Niger',
  TD: 'Chad', SD: 'Sudan', ET: 'Ethiopia', KE: 'Kenya', TZ: 'Tanzania',
  MG: 'Madagascar', MW: 'Malawi', ZW: 'Zimbabwe', ZM: 'Zambia', MZ: 'Mozambique',
  NA: 'Namibia', BW: 'Botswana', LS: 'Lesotho', SZ: 'Eswatini',
  TR: 'Turkey', IR: 'Iran', IQ: 'Iraq', SA: 'Saudi Arabia', JO: 'Jordan',
  LB: 'Lebanon', SY: 'Syria', IL: 'Israel', IN_: 'India', PK: 'Pakistan',
  KZ: 'Kazakhstan', UZ: 'Uzbekistan', TM: 'Turkmenistan', TJ: 'Tajikistan',
  KG: 'Kyrgyzstan', AF: 'Afghanistan', TH: 'Thailand', VN: 'Vietnam',
  LA: 'Laos', KH: 'Cambodia', MM: 'Myanmar', MY: 'Malaysia', ID: 'Indonesia',
  PH: 'Philippines', PG: 'Papua New Guinea', TL: 'Timor-Leste',
  GL: 'Greenland', IS: 'Iceland', IE: 'Ireland', CU: 'Cuba', JM: 'Jamaica',
  DO: 'Dominican Republic', HT: 'Haiti', PR: 'Puerto Rico', TT: 'Trinidad and Tobago',
  CR: 'Costa Rica', PA: 'Panama', GT: 'Guatemala', BZ: 'Belize', HN: 'Honduras',
  SV: 'El Salvador', NI: 'Nicaragua', EC: 'Ecuador', BO: 'Bolivia', PY: 'Paraguay',
  SR: 'Suriname', GF: 'French Guiana', GY: 'Guyana',
};

const countryName = (code?: string) => {
  if (!code) return 'Unknown';
  const key = code.replace(/[^A-Za-z]/g, '').toUpperCase();
  return COUNTRY_NAMES[key] ?? code;
};

/** Derive a Mesozoic period from a PBDB interval name (e.g. "Late Cretaceous"). */
function periodFromInterval(name: string): string | undefined {
  const n = name.toLowerCase();
  if (n.includes('cretaceous')) return 'Cretaceous';
  if (n.includes('jurassic')) return 'Jurassic';
  if (n.includes('triassic')) return 'Triassic';
  return undefined;
}

function dominantPeriod(counts: Record<string, number>): string | undefined {
  let best: string | undefined;
  let max = 0;
  for (const [k, v] of Object.entries(counts)) {
    if (v > max) { max = v; best = k; }
  }
  return best;
}
function periodFromMa(ma: number): string {
  if (!Number.isFinite(ma)) return 'Unknown';
  if (ma >= 201.4) return 'Triassic';
  if (ma >= 143.1) return 'Jurassic';
  if (ma >= 66.0) return 'Cretaceous';
  if (ma >= 252.0) return 'Permian';
  return 'Cenozoic';
}

function recordMa(r: PbdbRecord): number | null {
  const eag = Number(r.eag);
  const lag = Number(r.lag);
  if (Number.isFinite(eag) && Number.isFinite(lag)) return (eag + lag) / 2;
  if (Number.isFinite(eag)) return eag;
  if (Number.isFinite(lag)) return lag;
  return null;
}

/** Age range for one occurrence: lo = younger, hi = older (Ma). */
function recordAgeRange(r: PbdbRecord): { lo: number; hi: number } | null {
  const eag = Number(r.eag);
  const lag = Number(r.lag);
  if (Number.isFinite(eag) && Number.isFinite(lag) && lag < eag) {
    return { lo: lag, hi: eag };
  }
  if (Number.isFinite(eag)) return { lo: eag, hi: eag };
  if (Number.isFinite(lag)) return { lo: lag, hi: lag };
  return null;
}

/** Only the PBDB fields we actually read (`show=loc,coords`). */
interface PbdbRecord {
  lat?: string | number;
  lng?: string | number;
  cc2?: string;
  stp?: string;
  /** Early interval name, e.g. "Late Cretaceous". */
  oei?: string;
  /** Early/late age in Ma. */
  eag?: string | number;
  lag?: string | number;
}

/** The shape of one entry in _data/genus-data.json postTypes.genus. */
interface GenusEntry {
  post_name?: string;
  post_title?: string;
  meta?: Record<string, unknown>;
}

interface GenusDataFile {
  postTypes?: { genus?: GenusEntry[] };
}

/** Strip wrapping quotes/punctuation and diacritics (e.g. “Gspsaurus”, Troödon). */
const normalizeTaxon = (name: string) =>
  name
    .replace(/^[^A-Za-z]+/, '')
    .replace(/[^A-Za-z]+$/, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

const parseArgs = () => {
  const args = process.argv.slice(2);
  const num = (flag: string, def: number) => {
    const i = args.indexOf(flag);
    const v = i >= 0 ? Number(args[i + 1]) : NaN;
    return Number.isFinite(v) && v > 0 ? v : def;
  };
  const genusIdx = args.indexOf('--genus');
  return {
    limit: num('--limit', Infinity),
    onlyGenus: genusIdx >= 0 ? args[genusIdx + 1] : null,
    force: args.includes('--force'),
  };
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Read the cache; tolerate a missing/corrupt file. */
function readCache(): Cache {
  try {
    return JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8')) as Cache;
  } catch {
    return {};
  }
}

function writeCache(cache: Cache) {
  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache));
}

/** Fetch + aggregate PBDB occurrences for one genus. */
async function fetchLocations(taxon: string): Promise<Bubble[]> {
  // base_name includes the genus *and* its child taxa (species), which is
  // where most PBDB occurrences are identified. taxon_name alone misses them.
  const queryName = normalizeTaxon(taxon);
  if (!queryName) return [];
  const url =
    'https://paleobiodb.org/data1.2/occs/list.json' +
    `?base_name=${encodeURIComponent(queryName)}&show=loc,coords&limit=3000`;
  const res = await fetch(url, {
    headers: {
      'user-agent': 'DinosauriaNetwork/1.0 (https://dinosauria.net; mailto:research@dinosauria.net)',
      accept: 'application/json',
    },
    signal: AbortSignal.timeout(25_000),
  });
  if (!res.ok) {
    // Throw rather than returning [] so a transport/auth failure is never
    // cached as "this genus has no fossils".
    throw new Error(`PBDB HTTP ${res.status} for ${queryName} (from "${taxon}")`);
  }
  const data = (await res.json()) as { records?: PbdbRecord[] };
  const records = data.records ?? [];

  // Aggregate occurrence points into ~0.5° bubbles (≈55 km).
  const buckets = new Map<string, Bubble>();
  for (const r of records) {
    const lat = Number(r.lat);
    const lng = Number(r.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const key = `${lat.toFixed(1)},${lng.toFixed(1)}`;
    const ma = recordMa(r);
    const period = ma !== null ? periodFromMa(ma) : (r.oei ? periodFromInterval(r.oei) : undefined);
    const rng = recordAgeRange(r);
    const existing = buckets.get(key);
    if (existing) {
      existing.count += 1;
      if (rng) {
        if (existing.minMa === undefined || rng.lo < existing.minMa) existing.minMa = rng.lo;
        if (existing.maxMa === undefined || rng.hi > existing.maxMa) existing.maxMa = rng.hi;
      }
      // Keep the most common period: track counts.
      if (period) {
        (existing as any)._periodCounts = (existing as any)._periodCounts || {};
        (existing as any)._periodCounts[period] = ((existing as any)._periodCounts[period] || 0) + 1;
        existing.period = dominantPeriod((existing as any)._periodCounts);
      }
    } else {
      const pc: Record<string, number> = {};
      if (period) pc[period] = 1;
      const bubble: Bubble = {
        lat: Number(lat.toFixed(2)),
        lng: Number(lng.toFixed(2)),
        country: countryName(r.cc2),
        state: r.stp && r.stp !== '__' ? String(r.stp) : undefined,
        count: 1,
        period,
        minMa: rng ? rng.lo : (ma !== null ? ma : undefined),
        maxMa: rng ? rng.hi : (ma !== null ? ma : undefined),
      };
      (bubble as any)._periodCounts = pc;
      buckets.set(key, bubble);
    }
  }

  // Clean up helper fields before returning.
  const result = [...buckets.values()]
    .map((b) => {
      delete (b as any)._periodCounts;
      return b;
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, MAX_POINTS);
  return result;
}

async function main() {
  const { limit, onlyGenus, force } = parseArgs();
  const raw = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8')) as GenusDataFile;
  const genera: GenusEntry[] = raw?.postTypes?.genus ?? [];
  if (!genera.length) {
    console.error('No genera found in', DATA_PATH);
    process.exit(1);
  }

  const cache = readCache();
  let processed = 0;
  let skipped = 0;
  let withData = 0;

  for (const genus of genera) {
    if (onlyGenus && genus.post_name !== onlyGenus.toLowerCase() && genus.post_title !== onlyGenus) {
      continue;
    }
    if (processed >= limit) break;
    const taxon = genus.post_title as string;
    if (!taxon) continue;

    const cached = cache[taxon];
    if (cached && cached.version === CACHE_VERSION && !force) {
      // Apply cached result (idempotent re-run).
      applyLocations(genus, cached.locations);
      processed++;
      if (cached.locations.length) withData++;
      continue;
    }

    process.stdout.write(`  ${taxon}… `);
    try {
      const locations = await fetchLocations(taxon);
      cache[taxon] = { fetchedAt: new Date().toISOString(), version: CACHE_VERSION, locations };
      writeCache(cache);
      applyLocations(genus, locations);
      processed++;
      if (locations.length) withData++;
      console.log(`${locations.length} location(s)`);
    } catch (e) {
      console.warn(`failed: ${String(e).slice(0, 140)}`);
      skipped++;
    }
    // Be polite to the public API.
    await sleep(180);
  }

  fs.writeFileSync(DATA_PATH, JSON.stringify(raw, null, 2) + '\n');
  console.log(
    `\nProcessed ${processed} genus entries (${withData} with locations), skipped ${skipped}. Wrote ${DATA_PATH}.`
  );
}

function applyLocations(genus: GenusEntry, locations: Bubble[]) {
  const meta = (genus.meta && typeof genus.meta === 'object' ? genus.meta : {}) as Record<string, unknown>;
  if (locations.length) {
    meta.fossilLocations = locations;
    meta.fossilSource = 'Paleobiology Database';
  } else {
    delete meta.fossilLocations;
    delete meta.fossilSource;
  }
  genus.meta = meta;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
