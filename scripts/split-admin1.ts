/**
 * Split Natural Earth's 10m admin-1 (state/province) geojson into
 * per-country files under public/data/admin1/, plus an index.json of
 * bounding boxes used to decide which countries to fetch on zoom.
 *
 * Usage:
 *   npx tsx scripts/split-admin1.ts [path-to-ne_10m_admin_1.geojson]
 *
 * Default input: /tmp/ne_10m_admin_1_states_provinces.geojson
 * (download it first: curl -o /tmp/... https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_1_states_provinces.geojson)
 */
import fs from 'fs';
import path from 'path';

const INPUT = process.argv[2] || '/tmp/ne_10m_admin_1_states_provinces.geojson';
const OUT_DIR = path.join(process.cwd(), 'public', 'data', 'admin1');

interface Feature { type: string; properties: any; geometry: any; }
interface FC { type: string; features: Feature[]; }

function bboxOf(features: Feature[]): [number, number, number, number] {
  let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
  const walk = (coords: any) => {
    if (typeof coords[0] === 'number') {
      const [lng, lat] = coords;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    } else {
      for (const c of coords) walk(c);
    }
  };
  for (const f of features) walk(f.geometry.coordinates);
  return [minLng, minLat, maxLng, maxLat];
}

const raw = JSON.parse(fs.readFileSync(INPUT, 'utf-8')) as FC;
fs.mkdirSync(OUT_DIR, { recursive: true });

// Clean previous output.
for (const f of fs.readdirSync(OUT_DIR)) {
  if (f.endsWith('.json')) fs.unlinkSync(path.join(OUT_DIR, f));
}

const byCountry: Record<string, Feature[]> = {};
for (const f of raw.features) {
  const code = String(f.properties?.iso_a2 || f.properties?.iso_a2_eh || '').toLowerCase();
  const key = code && code !== '-99' && code !== 'null' ? code : 'unknown';
  (byCountry[key] ||= []).push(f);
}

const index: Record<string, [number, number, number, number]> = {};
let total = 0;
for (const [code, features] of Object.entries(byCountry)) {
  const fc: FC = { type: 'FeatureCollection', features };
  fs.writeFileSync(path.join(OUT_DIR, `${code}.json`), JSON.stringify(fc));
  index[code] = bboxOf(features);
  total += features.length;
}

fs.writeFileSync(path.join(OUT_DIR, 'index.json'), JSON.stringify(index));
console.log(`Wrote ${Object.keys(byCountry).length} country files, ${total} features, index with ${Object.keys(index).length} entries.`);
