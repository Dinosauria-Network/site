"use client";

import { useEffect, useRef, useState } from "react";
import type { FossilLocation } from "@/lib/genus-data";

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
}

// Bundled low-res atlas for instant first paint.
let atlas110Promise: Promise<any> | null = null;
function loadAtlas110() {
  if (!atlas110Promise) {
    atlas110Promise = import("@/lib/data/world-110m.json").then((m: any) => m.default ?? m);
  }
  return atlas110Promise;
}

// Global 50m admin-1 (state/province) borders fetched on demand.
let admin50Promise: Promise<any> | null = null;
function loadAdmin50() {
  if (!admin50Promise) {
    admin50Promise = fetch("https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_1_states_provinces.geojson").then((r) => {
      if (!r.ok) throw new Error(`admin-1 50m HTTP ${r.status}`);
      return r.json();
    });
  }
  return admin50Promise;
}

// Per-country 10m admin-1 index (bounding boxes).
let admin10IndexPromise: Promise<Record<string, [number, number, number, number]>> | null = null;
function loadAdmin10Index() {
  if (!admin10IndexPromise) {
    admin10IndexPromise = fetch("/data/admin1/index.json").then((r) => {
      if (!r.ok) throw new Error(`admin1 index HTTP ${r.status}`);
      return r.json();
    });
  }
  return admin10IndexPromise;
}

// Per-country 10m cache.
const admin10Cache: Record<string, Promise<any>> = {};
function loadCountry10(code: string) {
  if (!admin10Cache[code]) {
    admin10Cache[code] = fetch(`/data/admin1/${code}.json`).then((r) => {
      if (!r.ok) throw new Error(`admin1 ${code} HTTP ${r.status}`);
      return r.json();
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

function visibleCountryCodes(projection: any, width: number, height: number, index: Record<string, [number, number, number, number]>) {
  const corners = [[0, 0], [width, 0], [0, height], [width, height]];
  const lngs: number[] = [];
  const lats: number[] = [];
  for (const [x, y] of corners) {
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
export default function GenusFossilMap({ locations, genusName }: GenusFossilMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgHostRef = useRef<HTMLDivElement | null>(null);
  const zoomRef = useRef<any>(null);
  const svgRef = useRef<any>(null);
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

        const projection = d3geo.geoNaturalEarth1();
        const path = d3geo.geoPath(projection);

        const pts = locations
          .map((l) => [l.lng, l.lat] as [number, number])
          .filter(([lng, lat]) => Number.isFinite(lng) && Number.isFinite(lat));

        const distinct = new Set(pts.map((p) => p.join(",")));
        if (pts.length && distinct.size >= 2) {
          projection.fitExtent(
            [
              [16, 16],
              [width - 16, height - 16],
            ],
            { type: "FeatureCollection", features: pts.map((p) => ({ type: "Feature", geometry: { type: "Point", coordinates: p }, properties: {} })) } as any
          );
        } else if (pts.length === 1) {
          projection.center(pts[0]).scale(400);
        } else {
          projection.scale(width / 6).translate([width / 2, height / 2]);
        }

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

        // Markers.
        const markerData = pts.map(([lng, lat]) => {
          const loc = locations.find((l) => l.lng === lng && l.lat === lat);
          const weight = loc?.count ?? 1;
          const r = Math.min(8, 3 + Math.sqrt(weight) * 1.2);
          const place = [loc?.state, loc?.country].filter(Boolean).join(", ");
          const title = `${genusName} — ${place}${weight > 1 ? ` (${weight} occurrences)` : ""}`;
          return { lng, lat, r, title, period: loc?.period };
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
          .attr("fill", (d: any) => PERIOD_COLORS[d.period] || "#999")
          .attr("fill-opacity", 0.85)
          .attr("stroke", "#2f271d")
          .attr("stroke-width", 1)
          .attr("vector-effect", "non-scaling-stroke")
          .style("cursor", "pointer");

        markers.append("title").text((d: any) => d.title);

        // Detail indicator.
        const detailText = svg.append("text")
          .attr("x", width - 8)
          .attr("y", height - 8)
          .attr("text-anchor", "end")
          .attr("font-size", 10)
          .attr("fill", "#555")
          .text("detail: 110m");

        // Pan & zoom.
        const zoom = d3zoom.zoom()
          .scaleExtent([1, 8])
          .on("zoom", (event: any) => {
            zoomLayer.attr("transform", event.transform);
            const k = event.transform.k || 1;
            markers.attr("r", (d: any) => d.r / k);
            setScale(k);

            // Global 50m admin-1 when zoomed in.
            if (k >= 2) {
              admin50Group.style("display", null);
              if (!admin50Loaded) {
                admin50Loaded = true;
                detailText.text("loading regions…");
                loadAdmin50().then((geo) => {
                  if (cancelled) return;
                  const features = geo.features;
                  admin50Group.selectAll("path.region50")
                    .data(features)
                    .enter()
                    .append("path")
                    .attr("class", "region50")
                    .attr("d", (d: any) => path(d) || "")
                    .attr("fill", "none")
                    .attr("stroke", "#808080")
                    .attr("stroke-width", 0.4)
                    .attr("vector-effect", "non-scaling-stroke")
                    .attr("opacity", 0.6)
                    .attr("data-country", (d: any) => String(d.properties?.iso_a2 || "").toLowerCase());
                  detailText.text("detail: 50m");
                }).catch(() => {
                  admin50Group.style("display", "none");
                  admin50Loaded = false;
                  detailText.text("detail: 110m");
                });
              }
            } else {
              admin50Group.style("display", "none");
            }

            // Per-country 10m when zoomed in further: fetch visible countries only.
            if (k >= 4) {
              admin10Group.style("display", null);
              loadAdmin10Index().then((index) => {
                if (cancelled) return;
                const codes = visibleCountryCodes(projection, width, height, index);
                const toLoad = codes.filter((c) => !loaded10.has(c));
                if (toLoad.length) {
                  detailText.text("loading detail…");
                }
                for (const code of toLoad) {
                  loaded10.add(code);
                  loadCountry10(code).then((geo) => {
                    if (cancelled) return;
                    const features = geo.features;
                    admin10Group.selectAll(`path.region10-${code}`)
                      .data(features)
                      .enter()
                      .append("path")
                      .attr("class", `region10-${code}`)
                      .attr("d", (d: any) => path(d) || "")
                      .attr("fill", "none")
                      .attr("stroke", "#808080")
                      .attr("stroke-width", 0.3)
                      .attr("vector-effect", "non-scaling-stroke")
                      .attr("opacity", 0.8)
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
            }
          });

        svg.call(zoom as any);
        svgRef.current = svg;
        zoomRef.current = zoom;

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
      if (svgHostRef.current) svgHostRef.current.innerHTML = "";
    };
  }, [locations, genusName]);

  return (
    <div
      ref={containerRef}
      className="genus-fossil-map"
      role="region"
      aria-label={`Map of fossil find locations for ${genusName}`}
    >
      <div ref={svgHostRef} style={{ width: "100%", height: "100%" }} />
      <div className="genus-fossil-map-controls">
        <button
          type="button"
          className="genus-fossil-map-btn"
          aria-label="Zoom in"
          disabled={scale >= 8}
          onClick={() => {
            if (svgRef.current && zoomRef.current) zoomRef.current.scaleBy(svgRef.current, 1.5);
          }}
        >
          +
        </button>
        <button
          type="button"
          className="genus-fossil-map-btn"
          aria-label="Zoom out"
          disabled={scale <= 1}
          onClick={() => {
            if (svgRef.current && zoomRef.current) zoomRef.current.scaleBy(svgRef.current, 1 / 1.5);
          }}
        >
          −
        </button>
      </div>
    </div>
  );
}
