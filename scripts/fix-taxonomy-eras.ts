/**
 * fix-taxonomy-eras.ts
 *
 * Reconcile the (historically unreliable) `taxonomy[].chronostratigraphy`
 * era/period assignments in _data/genus-data.json with the authoritative
 * period labels derived from PBDB fossil occurrence ages (lib/geologic-time).
 *
 * For every genus that has fossilLocations, the dominant epoch label becomes
 * the period term (e.g. "Late Cretaceous", "Middle Jurassic"). Genera without
 * fossil evidence are left untouched.
 *
 * Usage:
 *   npx tsx scripts/fix-taxonomy-eras.ts
 */

import fs from 'fs';
import path from 'path';
import { epochForMa } from '../lib/geologic-time';

const DATA_PATH = path.join(process.cwd(), '_data', 'genus-data.json');

interface TaxonomyTerm {
  term_id?: number;
  name?: string;
  slug?: string;
  taxonomy?: string;
}

interface FossilLocation {
  lat: number;
  lng: number;
  country?: string;
  state?: string;
  count?: number;
  period?: string;
  minMa?: number;
  maxMa?: number;
}

interface Genus {
  post_name?: string;
  post_title?: string;
  post_date?: string;
  author?: string;
  post_content?: string | null;
  post_excerpt?: string | null;
  post_status?: string;
  post_modified?: string;
  post_parent?: number;
  guid?: string;
  menu_order?: number;
  post_type?: string;
  post_mime_type?: string | null;
  comment_count?: number;
  taxonomy?: TaxonomyTerm[];
  meta?: {
    period?: string;
    author?: string;
    description_date?: number;
    fossilLocations?: FossilLocation[];
    fossilSource?: string;
  };
}

interface GenusData {
  postTypes?: { genus?: Genus[] };
}

function slugify(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function dominantPeriodLabel(locs: FossilLocation[]): string | undefined {
  let best: string | undefined;
  let bestWeight = 0;
  for (const loc of locs) {
    const lo = loc.minMa ?? loc.maxMa;
    const hi = loc.maxMa ?? loc.minMa;
    if (lo === undefined || hi === undefined) continue;
    const mid = (lo + hi) / 2;
    const e = epochForMa(mid);
    if (!e) continue;
    const label = `${e.name} ${e.period}`;
    const weight = loc.count ?? 1;
    if (weight > bestWeight) {
      bestWeight = weight;
      best = label;
    }
  }
  return best;
}

function main() {
  const raw = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8')) as GenusData;
  const genera = raw.postTypes?.genus ?? [];
  let changed = 0;
  let skipped = 0;

  for (const g of genera) {
    const locs = g.meta?.fossilLocations ?? [];
    const label = locs.length ? dominantPeriodLabel(locs) : undefined;
    if (!label) {
      skipped++;
      continue;
    }
    const terms = Array.isArray(g.taxonomy) ? g.taxonomy : [];
    const chrono = terms.filter((t) => t?.taxonomy === 'geological_time');
    const desiredSlug = slugify(label);
    let dirty = false;
    for (const t of chrono) {
      const nameChanged = (t.name ?? '') !== label;
      const slugChanged = (t.slug ?? '') !== desiredSlug;
      if (nameChanged || slugChanged) {
        t.name = label;
        t.slug = desiredSlug;
        dirty = true;
      }
    }
    if (dirty) {
      changed++;
    }
  }

  if (changed > 0) {
    fs.writeFileSync(DATA_PATH, JSON.stringify(raw, null, 2) + '\n');
  }

  console.log(`fix-taxonomy-eras: ${changed} genus entries updated, ${skipped} skipped (no locations).`);
}

main();
