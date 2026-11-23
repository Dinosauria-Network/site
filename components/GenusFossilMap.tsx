"use client";

import { useEffect, useRef, useState } from "react";
import type { FossilLocation } from "@/lib/genus-data";
import { epochColorForMa } from "@/lib/geologic-time";

const PERIOD_COLORS: Record<string, string> = {
  Triassic: "#812B92",
  Jurassic: "#34B2C9",
  Cretaceous: "#82cc73",
  Permian: "#f04c23",
  Cenozoic: "#ffe951",
};

interface GenusFossilMapProps {
  locations: FossilLocation[];
  genusName: string;
  highlightAgeRange?: [number, number] | undefined;
  onMarkerHover?: (info?: { ma?: number; period?: string; location?: FossilLocation }) => void;
  onMarkerClick?: (info?: { ma?: number; period?: string; location?: FossilLocation }) => void;
}

// Bundled low-res atlas for instant first paint. Failed loads are dropped from
// the cache slot so a later mount can retry instead of pinning a dead promise.
let atlas110Promise: Promise<any> | null = null;
function loadAtlas110(): Promise<any> {
  if (!atlas110Promise) {
    atlas110Promise = import("@/lib/data/world-110m.json")
      .then((m: any) => m.default ?? m)
      .catch((e: unknown) => {
        atlas110Promise = null;
        throw e;
      });
  }
  return atlas110Promise;
}

// Global 50m admin-1 (state/province) borders fetched on demand. Retries on next call after failure.
let admin50Promise: Promise<any> | null = null;
function loadAdmin50(): Promise<any> {
  if (!admin50Promise) {
    admin50Promise = fetch("https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_1_states_provinces.geojson")
      .then((r) => {
        if (!r.ok) throw new Error(`admin-1 50m HTTP ${r.status}`);
        return r.json();
      })
      .catch((e: unknown) => {
        admin50Promise = null;
        throw e;
      });
  }
  return admin50Promise;
}

// 50m country outlines (more detailed than the bundled 110m atlas), fetched on
// demand and cached. Retries on next call after failure.
let countries50Promise: Promise<any> | null = null;
function loadCountries50(): Promise<any> {
  if (!countries50Promise) {
    countries50Promise = fetch("https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson")
      .then((r) => {
        if (!r.ok) throw new Error(`countries 50m HTTP ${r.status}`);
        return r.json();
      })
      .catch((e: unknown) => {
        countries50Promise = null;
        throw e;
      });
  }
  return countries50Promise;
}

// Per-country 10m admin-1 index (bounding boxes). Retries on next call after failure.
let admin10IndexPromise: Promise<Record<string, [number, number, number, number]>> | null = null;
function loadAdmin10Index(): Promise<Record<string, [number, number, number, number]>> {
  if (!admin10IndexPromise) {
    admin10IndexPromise = fetch("/data/admin1/index.json")
      .then((r) => {
        if (!r.ok) throw new Error(`admin1 index HTTP ${r.status}`);
        return r.json();
      })
      .catch((e: unknown) => {
        admin10IndexPromise = null;
        throw e;
      });
  }
  return admin10IndexPromise;
}

// Per-country 10m cache. Failed loads are dropped so the country retries later.
const admin10Cache: Record<string, Promise<any>> = {};
function loadCountry10(code: string): Promise<any> {
  if (!admin10Cache[code]) {
    admin10Cache[code] = fetch(`/data/admin1/${code}.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`admin1 ${code} HTTP ${r.status}`);
        return r.json();
      })
      .catch((e: unknown) => {
        delete admin10Cache[code];
        throw e;
      });
  }
  return admin10Cache[code];
}

function escapeXml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// Colour markers whose age (midpoint Ma) falls inside the highlighted range.
function applyMarkerHighlight(markers: any, range?: [number, number]) {
  if (!markers) return;
  if (!range) {
    markers.transition().duration(250).attr("stroke", "#2f271d").attr("stroke-width", 1);
    return;
  }
  const [lo, hi] = range;
  const inRange = (d: any) => d.midMa !== undefined && d.midMa >= lo && d.midMa <= hi;
  markers
    .transition()
    .duration(250)
    .attr("stroke", (d: any) => (inRange(d) ? "#ff6b35" : "#2f271d"))
    .attr("stroke-width", (d: any) => (inRange(d) ? 3 : 1));
}

function visibleCountryCodes(
  projection: any,
  width: number,
  height: number,
  index: Record<string, [number, number, number, number]>,
  transform?: any
) {
  const corners = [[0, 0], [width, 0], [0, height], [width, height]];
  const lngs: number[] = [];
  const lats: number[] = [];
  for (const [sx, sy] of corners) {
    // Screen -> base projection coords, then base -> lon/lat.
    const [x, y] = transform ? transform.invert([sx, sy]) : [sx, sy];
    const inv = projection.invert([x, y]);
    if (inv) { lngs.push(inv[0]); lats.push(inv[1]); }
  }
  if (!lngs.length) return [];
  let minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  // Handle antimeridian wraparound.
  if (maxLng - minLng > 180) {
    // Viewport crosses the antimeridian; include all countries.
    return Object.keys(index);
  }
  const result: string[] = [];
  for (const [code, [cMinLng, cMinLat, cMaxLng, cMaxLat]] of Object.entries(index)) {
    if (cMaxLng < minLng || cMinLng > maxLng) continue;
    if (cMaxLat < minLat || cMinLat > maxLat) continue;
    result.push(code);
  }
  return result;
}

/**
 * Client-only world map in the Natural Earth projection (d3.geoNaturalEarth1),
 * with one circle per fossil-find bubble. Supports pan and zoom via d3-zoom.
 * Sub-country borders: global 50m (on zoom >=2x), then per-country 10m
 * (on zoom >=4x, fetched in chunks for visible countries only).
 */
export default function GenusFossilMap({ locations, genusName, highlightAgeRange, onMarkerHover, onMarkerClick }: GenusFossilMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgHostRef = useRef<HTMLDivElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const tooltipPlaceRef = useRef<HTMLDivElement | null>(null);
  const tooltipCountRef = useRef<HTMLDivElement | null>(null);
  const tooltipTimeRef = useRef<HTMLDivElement | null>(null);
  const zoomRef = useRef<any>(null);
  const svgRef = useRef<any>(null);
  const markersRef = useRef<any>(null);
  const highlightRangeRef = useRef<[number, number] | undefined>(highlightAgeRange);
  const initialTransformRef = useRef<any>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let cancelled = false;
    let cleanupZoom: (() => void) | null = null;

    const build = async () => {
      if (svgHostRef.current) svgHostRef.current.innerHTML = "";
      setScale(1);

      try {
        const [d3geo, d3zoom, d3select, topo, atlas110] = await Promise.all([
          import("d3-geo"),
          import("d3-zoom"),
          import("d3-selection"),
          import("topojson-client"),
          loadAtlas110(),
        ]);
        if (cancelled || !svgHostRef.current) return;
        const node = svgHostRef.current;

        const width = Math.max(node.clientWidth || 640, 320);
        const height = Math.max(node.clientHeight || 380, 240);

        // Base projection always draws the whole world. The initial view is a
        // d3-zoom transform that fits the genus' fossil points, so zooming out
        // to k=1 reveals the entire globe (and reset returns to this fit).
        const projection = d3geo.geoNaturalEarth1();
        const path = d3geo.geoPath(projection);
        projection.fitExtent(
          [
            [0, 0],
            [width, height],
          ],
          { type: "Sphere" } as any
        );

        const pts = locations
          .map((l) => [l.lng, l.lat] as [number, number])
          .filter(([lng, lat]) => Number.isFinite(lng) && Number.isFinite(lat));

        let initialTransform = d3zoom.zoomIdentity;
        const projected = pts
          .map((p) => projection(p))
          .filter((p): p is [number, number] => Boolean(p));
        if (projected.length) {
          const xs = projected.map((p) => p[0]);
          const ys = projected.map((p) => p[1]);
          const minX = Math.min(...xs);
          const maxX = Math.max(...xs);
          const minY = Math.min(...ys);
          const maxY = Math.max(...ys);
          const pad = 40;
          const bboxW = Math.max(maxX - minX, 0.001);
          const bboxH = Math.max(maxY - minY, 0.001);
          let k = Math.min((width - 2 * pad) / bboxW, (height - 2 * pad) / bboxH);
          k = Math.max(1, Math.min(8, k));
          const cx = (minX + maxX) / 2;
          const cy = (minY + maxY) / 2;
          const tx = width / 2 - cx * k;
          const ty = height / 2 - cy * k;
          initialTransform = d3zoom.zoomIdentity.translate(tx, ty).scale(k);
        }
        initialTransformRef.current = initialTransform;

        const svg = d3select.select(node).append("svg")
          .attr("viewBox", `0 0 ${width} ${height}`)
          .attr("width", "100%")
          .attr("height", "100%")
          .attr("role", "img")
          .attr("tabindex", "0")
          .attr("aria-label", `Map of fossil find locations for ${genusName}`)
          .attr("aria-describedby", "genus-fossil-map-hint")
          .style("background", "#e9e6de")
          .style("touch-action", "none")
          .style("outline", "none");

        const zoomLayer = svg.append("g").attr("class", "zoom-layer");

        // Sphere outline (ocean).
        zoomLayer.append("path")
          .attr("d", path({ type: "Sphere" } as any) || "")
          .attr("fill", "#f4f1e8")
          .attr("stroke", "#808080")
          .attr("stroke-width", 0.8)
          .attr("vector-effect", "non-scaling-stroke");

        // Countries.
        zoomLayer.selectAll("path.country")
          .data((topo as any).feature(atlas110, atlas110.objects.countries).features)
          .enter()
          .append("path")
          .attr("class", "country")
          .attr("d", (d: any) => path(d) || "")
          .attr("fill", "#e9e6de")
          .attr("stroke", "#808080")
          .attr("stroke-width", 0.5)
          .attr("vector-effect", "non-scaling-stroke");

        // Global 50m admin-1 (loaded on zoom >=2).
        const admin50Group = zoomLayer.append("g").attr("class", "admin50").style("display", "none");
        let admin50Loaded = false;

        // Per-country 10m admin-1 (loaded on zoom >=4).
        const admin10Group = zoomLayer.append("g").attr("class", "admin10").style("display", "none");
        const loaded10 = new Set<string>();

        // 50m country outlines (more detailed than the bundled 110m atlas).
        const country50Group = zoomLayer.append("g").attr("class", "country50").style("display", "none");
        let country50Loaded = false;

        // Custom HTML tooltip that follows the pointer (no native title attr).
        const tooltip = tooltipRef.current;
        const tooltipPlace = tooltipPlaceRef.current;
        const tooltipCount = tooltipCountRef.current;
        const tooltipTime = tooltipTimeRef.current;

        function positionTooltip(event: any) {
          if (!tooltip || !containerRef.current) return;
          const rect = containerRef.current.getBoundingClientRect();
          const x = event.clientX - rect.left;
          const y = event.clientY - rect.top;
          tooltip.style.left = `${x}px`;
          tooltip.style.top = `${y}px`;
          tooltip.style.transform =
            y < 96 ? "translate(-50%, 14px)" : "translate(-50%, calc(-100% - 14px))";
        }

        function showTooltip(event: any, d: any) {
          if (!tooltip) return;
          if (tooltipPlace) tooltipPlace.textContent = d.place || genusName;
          if (tooltipCount) {
            tooltipCount.textContent = d.count > 1 ? `${d.count} occurrences` : "";
            tooltipCount.style.display = d.count > 1 ? "" : "none";
          }
          if (tooltipTime) {
            tooltipTime.textContent = d.timeLabel || "";
            tooltipTime.style.display = d.timeLabel ? "" : "none";
          }
          positionTooltip(event);
          tooltip.style.display = "block";
        }

        function hideTooltip() {
          if (tooltip) tooltip.style.display = "none";
        }

        // Markers.
        const markerData = locations.map((loc) => {
          const lng = loc.lng;
          const lat = loc.lat;
          const weight = loc.count ?? 1;
          const r = Math.min(8, 3 + Math.sqrt(weight) * 1.2);
          const place = [loc.state, loc.country].filter(Boolean).join(", ");
          const lo = loc.minMa ?? loc.maxMa;
          const hi = loc.maxMa ?? loc.minMa;
          const mid = lo !== undefined && hi !== undefined ? (lo + hi) / 2 : undefined;
          let timeLabel = loc.period || "";
          if (lo !== undefined && hi !== undefined && mid !== undefined) {
            const range =
              Math.abs(Math.round(hi) - Math.round(lo)) > 2
                ? `${Math.round(hi)}–${Math.round(lo)} Ma`
                : `~${Math.round(mid)} Ma`;
            timeLabel = loc.period ? `${loc.period} · ${range}` : range;
          }
          return { lng, lat, r, place, count: weight, timeLabel, period: loc.period, midMa: mid, location: loc };
        });

        const markers = zoomLayer.selectAll("circle.marker")
          .data(markerData)
          .enter()
          .append("circle")
          .attr("class", "marker")
          .attr("cx", (d: any) => {
            const xy = projection([d.lng, d.lat]);
            return xy ? xy[0] : 0;
          })
          .attr("cy", (d: any) => {
            const xy = projection([d.lng, d.lat]);
            return xy ? xy[1] : 0;
          })
          .attr("r", (d: any) => d.r)
          .attr("fill", (d: any) => (d.midMa !== undefined ? epochColorForMa(d.midMa) : (PERIOD_COLORS[d.period] || "#999")))
          .attr("fill-opacity", 0.85)
          .attr("stroke", "#2f271d")
          .attr("stroke-width", 1)
          .attr("vector-effect", "non-scaling-stroke")
          .style("cursor", "pointer")
          .on("mouseenter", (event: any, d: any) => {
            showTooltip(event, d);
            const lo = d.location?.minMa ?? d.location?.maxMa;
            const hi = d.location?.maxMa ?? d.location?.minMa;
            onMarkerHover?.({
              ma: (lo !== undefined && hi !== undefined ? (lo + hi) / 2 : d.midMa) as number,
              period: d.location?.period || d.period,
              location: d.location,
            });
          })
          .on("mousemove", (event: any) => {
            positionTooltip(event);
          })
          .on("mouseleave", () => {
            hideTooltip();
            onMarkerHover?.(undefined);
          })
          .on("click", (event: any, d: any) => {
            const lo = d.location?.minMa ?? d.location?.maxMa;
            const hi = d.location?.maxMa ?? d.location?.minMa;
            onMarkerClick?.({
              ma: (lo !== undefined && hi !== undefined ? (lo + hi) / 2 : d.midMa) as number,
              period: d.location?.period || d.period,
              location: d.location,
            });
          });

        markersRef.current = markers;
        applyMarkerHighlight(markers, highlightRangeRef.current);

        // Labels — country names from the bundled 110m atlas; lazy-loaded cities at 4x.
        const labelLayer = zoomLayer.append("g").attr("class", "map-labels").style("pointer-events", "none");
        const cityLayer = zoomLayer.append("g").attr("class", "map-cities").style("pointer-events", "none");

        const countryFeatures = (topo as any).feature(atlas110, atlas110.objects.countries).features;
        const countryLabels = countryFeatures
          .map((f: any) => {
            const c = path.centroid(f);
            const area = Math.abs(path.area(f));
            return { name: String(f.properties?.name || ""), x: c[0], y: c[1], area, show: false };
          })
          .filter((d: any) => d.name && Number.isFinite(d.x) && Number.isFinite(d.y));

        const countryText = labelLayer
          .selectAll("text.country-label")
          .data(countryLabels)
          .enter()
          .append("text")
          .attr("class", "country-label")
          .attr("x", (d: any) => d.x)
          .attr("y", (d: any) => d.y)
          .attr("text-anchor", "middle")
          .attr("font-size", 11)
          .attr("font-weight", 600)
          .attr("fill", "#2f271d")
          .attr("stroke", "#f4f1e8")
          .attr("stroke-width", 3)
          .attr("stroke-linejoin", "round")
          .attr("paint-order", "stroke")
          .style("display", "none")
          .text((d: any) => d.name);

        let cityText: any = null;
        let cityData: any[] = [];
        let citiesRequested = false;

        let lastK = 1;
        let lastTransform: { x: number; y: number } = { x: 0, y: 0 };

        function overlaps(boxes: number[][], sx: number, sy: number, w: number) {
          for (const b of boxes) {
            if (!(sx + w < b[0] || sx > b[2] || sy - 6 > b[3] || sy < b[1])) return true;
          }
          return false;
        }

        function updateLabels(k: number, t: any) {
          lastK = k;
          lastTransform = t;
          const boxes: number[][] = [];

          // Country labels at zoom >= 2x, largest first.
          const countries = countryLabels.slice().sort((a: any, b: any) => b.area - a.area);
          for (const d of countries) {
            d.show = false;
            if (k < 2 || d.area * k * k < 700) continue;
            const sx = t.x + d.x * k;
            const sy = t.y + d.y * k;
            if (sx < 10 || sx > width - 10 || sy < 10 || sy > height - 6) continue;
            const tw = d.name.length * 5.6;
            if (overlaps(boxes, sx, sy, tw)) continue;
            boxes.push([sx - tw / 2, sy - 6, sx + tw / 2, sy + 6]);
            d.show = true;
          }
          countryText.style("display", (d: any) => (d.show ? null : "none"))
            .attr("font-size", 11 / k)
            .attr("stroke-width", 3 / k);

          // Cities at zoom >= 4x, lazy load.
          if (k >= 4 && !citiesRequested) {
            citiesRequested = true;
            fetch("/data/cities.json")
              .then((r) => {
                if (!r.ok) throw new Error(`cities HTTP ${r.status}`);
                return r.json();
              })
              .then((cities: any[]) => {
                if (cancelled) return;
                cityData = cities
                  .map((c: any) => {
                    const xy = projection([c.lng, c.lat]);
                    return xy ? { name: c.name, x: xy[0], y: xy[1], pop: c.pop, show: false } : null;
                  })
                  .filter(Boolean);
                cityText = cityLayer
                  .selectAll("text.city-label")
                  .data(cityData)
                  .enter()
                  .append("g")
                  .attr("class", "city")
                  .style("display", "none");
                cityText.append("circle")
                  .attr("r", 2.5)
                  .attr("fill", "#2f271d")
                  .attr("stroke", "#f4f1e8")
                  .attr("stroke-width", 1);
                cityText.append("text")
                  .attr("x", 5)
                  .attr("y", 3.5)
                  .attr("font-size", 10)
                  .attr("font-weight", 500)
                  .attr("fill", "#2f271d")
                  .attr("stroke", "#f4f1e8")
                  .attr("stroke-width", 3)
                  .attr("stroke-linejoin", "round")
                  .attr("paint-order", "stroke")
                  .text((d: any) => d.name);
                updateLabels(lastK, lastTransform);
              })
              .catch(() => { citiesRequested = false; });
          } else if (cityText) {
            const k = lastK;
            const t = lastTransform;
            const minPop = k >= 6.5 ? 800_000 : k >= 5 ? 2_500_000 : 5_000_000;
            const boxes: number[][] = [];
            const cities = cityData.slice().sort((a: any, b: any) => b.pop - a.pop);
            for (const c of cities) {
              c.show = false;
              if (c.pop < minPop) continue;
              const sx = t.x + c.x * k;
              const sy = t.y + c.y * k;
              if (sx < 10 || sx > width - 10 || sy < 8 || sy > height - 8) continue;
              const tw = 8 + c.name.length * 5.2;
              if (overlaps(boxes, sx, sy, tw)) continue;
              boxes.push([sx - 4, sy - 6, sx + tw, sy + 6]);
              c.show = true;
            }
            cityText.style("display", (d: any) => (d.show ? null : "none"));
            cityText.select("text")
              .attr("font-size", 10 / k)
              .attr("x", 5 / k)
              .attr("y", 3.5 / k)
              .attr("stroke-width", 3 / k);
            cityText.select("circle")
              .attr("r", 2.5 / k)
              .attr("stroke-width", 1 / k);
          }
        }
        const detailText = svg.append("text")
          .attr("x", width - 8)
          .attr("y", height - 8)
          .attr("text-anchor", "end")
          .attr("font-size", 10)
          .attr("fill", "#555")
          .text("detail: 110m");

        // Pan & zoom. The translate extent is the whole-world sphere, so
        // zooming all the way out (k=1) locks to the centered full globe.
        const zoom = d3zoom.zoom()
          .scaleExtent([1, 16])
          .translateExtent([
            [0, 0],
            [width, height],
          ])
          .on("start", hideTooltip)
          .on("zoom", (event: any) => {
            zoomLayer.attr("transform", event.transform);
            const k = event.transform.k || 1;
            markers.attr("r", (d: any) => d.r / k);
            setScale(k);
            updateLabels(k, event.transform);

            // Global 50m admin-1 when zoomed in.
            if (k >= 2) {
              admin50Group.style("display", null);
              if (!admin50Loaded) {
                admin50Loaded = true;
                detailText.text("loading regions…");
                loadAdmin50().then((geo) => {
                  if (cancelled) return;
                  const features = (geo.features as any[]).filter((d: any) => path.area(d) > 2);
                  admin50Group.selectAll("path.region50")
                    .data(features)
                    .enter()
                    .append("path")
                    .attr("class", "region50")
                    .attr("d", (d: any) => path(d) || "")
                    .attr("fill", "none")
                    .attr("stroke", "#a8a8a8")
                    .attr("stroke-width", 0.3)
                    .attr("vector-effect", "non-scaling-stroke")
                    .attr("opacity", 0.75)
                    .attr("data-country", (d: any) => String(d.properties?.iso_a2 || "").toLowerCase());
                  detailText.text("detail: 50m");
                }).catch(() => {
                  admin50Group.style("display", "none");
                  admin50Loaded = false;
                  detailText.text("detail: 110m");
                });
              }
              // 50m country outline (more detailed than the 110m atlas) takes
              // over from the crude country border; admin-1 detail shows too.
              country50Group.style("display", null);
              if (!country50Loaded) {
                country50Loaded = true;
                loadCountries50().then((geo) => {
                  if (cancelled) return;
                  country50Group.selectAll("path.country50")
                    .data(geo.features)
                    .enter()
                    .append("path")
                    .attr("class", "country50")
                    .attr("d", (d: any) => path(d) || "")
                    .attr("fill", "none")
                    .attr("stroke", "#333333")
                    .attr("stroke-width", 0.5)
                    .attr("vector-effect", "non-scaling-stroke")
                    .attr("opacity", 0.9);
                  // 50m outline available: drop the crude 110m border.
                  zoomLayer.selectAll("path.country").attr("stroke", "none");
                  detailText.text("detail: 50m");
                }).catch(() => {
                  country50Group.style("display", "none");
                  country50Loaded = false;
                  // Fall back to the 110m country border.
                  zoomLayer.selectAll("path.country").attr("stroke", "#808080").attr("stroke-width", 0.5);
                });
              }
              zoomLayer.selectAll("path.country").attr("stroke", "none");
            } else {
              admin50Group.style("display", "none");
              country50Group.style("display", "none");
              zoomLayer.selectAll("path.country").attr("stroke", "#808080").attr("stroke-width", 0.5);
            }

            // Per-country 10m when zoomed in further: fetch visible countries only.
            if (k >= 4) {
              admin10Group.style("display", null);
              // Keep the 50m country outline visible alongside the 10m admin-1
              // detail so countries stay identifiable (admin-1 lines are finer).
              country50Group.style("display", null);
              loadAdmin10Index().then((index) => {
                if (cancelled) return;
                const codes = visibleCountryCodes(projection, width, height, index, event.transform);
                const toLoad = codes.filter((c) => !loaded10.has(c));
                if (toLoad.length) {
                  detailText.text("loading detail…");
                }
                for (const code of toLoad) {
                  loaded10.add(code);
                  loadCountry10(code).then((geo) => {
                    if (cancelled) return;
                    const features = (geo.features as any[]).filter((d: any) => path.area(d) > 2);
                    admin10Group.selectAll(`path.region10-${code}`)
                      .data(features)
                      .enter()
                      .append("path")
                      .attr("class", `region10-${code}`)
                      .attr("d", (d: any) => path(d) || "")
                      .attr("fill", "none")
                      .attr("stroke", "#a8a8a8")
                      .attr("stroke-width", 0.25)
                      .attr("vector-effect", "non-scaling-stroke")
                      .attr("opacity", 0.7)
                      .attr("data-country", code);
                    // Hide the coarser 50m paths for this country.
                    admin50Group.selectAll("path.region50")
                      .filter((d: any) => String(d?.properties?.iso_a2 || "").toLowerCase() === code)
                      .style("display", "none");
                    detailText.text("detail: 10m");
                  }).catch(() => {
                    loaded10.delete(code);
                  });
                }
                if (!toLoad.length) {
                  detailText.text(loaded10.size ? "detail: 10m" : "detail: 50m");
                }
              }).catch(() => {
                // index failed; ignore
              });
            } else {
              admin10Group.style("display", "none");
              if (k >= 2) country50Group.style("display", null);
            }
          });

        svg.call(zoom as any);
        svgRef.current = svg;
        zoomRef.current = zoom;

        // Start from the fitted view (k=1 remains the whole world).
        (svg as any).call(zoom.transform, initialTransform);

        svg.append("text")
          .attr("id", "genus-fossil-map-hint")
          .attr("x", 8)
          .attr("y", height - 8)
          .attr("font-size", 10)
          .attr("fill", "#555")
          .text("Drag to pan · scroll to zoom · arrow keys to pan");

        cleanupZoom = () => {
          svg.on(".zoom", null);
        };
      } catch (e) {
        if (cancelled || !svgHostRef.current) return;
        svgHostRef.current.innerHTML = `<p class="genus-fossil-map-error">Map unavailable: ${escapeXml(String(e).slice(0, 200))}</p>`;
      }
    };

    build();

    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    const onResize = () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (!cancelled) build();
      }, 200);
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(container);

    return () => {
      cancelled = true;
      ro.disconnect();
      if (resizeTimer) clearTimeout(resizeTimer);
      if (cleanupZoom) cleanupZoom();
      markersRef.current = null;
      if (tooltipRef.current) tooltipRef.current.style.display = "none";
      if (svgHostRef.current) svgHostRef.current.innerHTML = "";
    };
  }, [locations, genusName]);

  // Keep the map in sync when the time bar highlights an age range.
  useEffect(() => {
    highlightRangeRef.current = highlightAgeRange;
    applyMarkerHighlight(markersRef.current, highlightAgeRange);
  }, [highlightAgeRange]);

  return (
    <div
      ref={containerRef}
      className="genus-fossil-map"
      role="region"
      aria-label={`Map of fossil find locations for ${genusName}`}
    >
      <div ref={svgHostRef} style={{ width: "100%", height: "100%" }} />
      <div
        ref={tooltipRef}
        className="genus-fossil-map-tooltip"
        style={{ display: "none" }}
        aria-hidden="true"
      >
        <div ref={tooltipPlaceRef} className="genus-fossil-map-tooltip-place" />
        <div ref={tooltipCountRef} className="genus-fossil-map-tooltip-count" />
        <div ref={tooltipTimeRef} className="genus-fossil-map-tooltip-time" />
      </div>
      <div className="genus-fossil-map-controls">
        <button
          type="button"
          className="genus-fossil-map-btn"
          aria-label="Zoom in"
          disabled={scale >= 16}
          onClick={() => {
            if (svgRef.current && zoomRef.current) {
              svgRef.current.transition().duration(400).call(zoomRef.current.scaleBy, 1.5);
            }
          }}
        >
          +
        </button>
        <button
          type="button"
          className="genus-fossil-map-btn"
          aria-label="Zoom out to whole world"
          disabled={scale <= 1}
          onClick={() => {
            if (svgRef.current && zoomRef.current) {
              svgRef.current.transition().duration(400).call(zoomRef.current.scaleBy, 1 / 1.5);
            }
          }}
        >
          −
        </button>
        <button
          type="button"
          className="genus-fossil-map-btn genus-fossil-map-btn-reset"
          aria-label="Reset map view"
          title="Reset view"
          onClick={() => {
            if (svgRef.current && zoomRef.current && initialTransformRef.current) {
              svgRef.current
                .transition()
                .duration(300)
                .call(zoomRef.current.transform, initialTransformRef.current);
            }
          }}
        >
          ⌂
        </button>
      </div>
    </div>
  );
}
