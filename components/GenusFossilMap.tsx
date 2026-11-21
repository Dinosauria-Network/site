"use client";

import { useEffect, useRef, useState } from "react";
import type { FossilLocation } from "@/lib/genus-data";

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

// Higher-res atlases fetched on demand when the user zooms in.
const atlasCache: Record<string, Promise<any>> = {};
function loadAtlasRes(res: "50m" | "10m") {
  if (!atlasCache[res]) {
    atlasCache[res] = fetch(`https://cdn.jsdelivr.net/npm/world-atlas@2/countries-${res}.json`).then((r) => {
      if (!r.ok) throw new Error(`atlas ${res} HTTP ${r.status}`);
      return r.json();
    });
  }
  return atlasCache[res];
}

function escapeXml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Client-only world map in the Natural Earth projection (d3.geoNaturalEarth1),
 * with one circle per fossil-find bubble. Supports pan and zoom via d3-zoom.
 * Coastline detail increases as the user zooms in (110m -> 50m -> 10m).
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
        const spherePath = zoomLayer.append("path")
          .attr("d", path({ type: "Sphere" } as any) || "")
          .attr("fill", "#f4f1e8")
          .attr("stroke", "#808080")
          .attr("stroke-width", 0.8)
          .attr("vector-effect", "non-scaling-stroke");

        // Countries (swappable for higher-res versions on zoom).
        const countrySel = zoomLayer.selectAll("path.country")
          .data((topo as any).feature(atlas110, atlas110.objects.countries).features)
          .enter()
          .append("path")
          .attr("class", "country")
          .attr("d", (d: any) => path(d) || "")
          .attr("fill", "#e9e6de")
          .attr("stroke", "#808080")
          .attr("stroke-width", 0.5)
          .attr("vector-effect", "non-scaling-stroke");

        // Markers.
        const markerData = pts.map(([lng, lat]) => {
          const loc = locations.find((l) => l.lng === lng && l.lat === lat);
          const weight = loc?.count ?? 1;
          const r = Math.min(8, 3 + Math.sqrt(weight) * 1.2);
          const place = [loc?.state, loc?.country].filter(Boolean).join(", ");
          const title = `${genusName} — ${place}${weight > 1 ? ` (${weight} occurrences)` : ""}`;
          return { lng, lat, r, title };
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
          .attr("fill", "#b07a24")
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

        // Progressive detail loader.
        let currentLevel: "110m" | "50m" | "10m" = "110m";
        let loadingDetail = false;
        const upgradeDetail = async (target: "50m" | "10m") => {
          if (loadingDetail || currentLevel === target || (target === "50m" && currentLevel === "10m")) return;
          loadingDetail = true;
          detailText.text("loading detail…");
          try {
            const atlas = await loadAtlasRes(target);
            if (cancelled) return;
            const features = (topo as any).feature(atlas, atlas.objects.countries).features;
            countrySel.data(features).attr("d", (d: any) => path(d) || "");
            currentLevel = target;
            detailText.text(`detail: ${target}`);
          } catch {
            detailText.text(`detail: ${currentLevel}`);
          } finally {
            loadingDetail = false;
          }
        };

        // Pan & zoom.
        const zoom = d3zoom.zoom()
          .scaleExtent([1, 8])
          .on("zoom", (event: any) => {
            zoomLayer.attr("transform", event.transform);
            const k = event.transform.k || 1;
            markers.attr("r", (d: any) => d.r / k);
            setScale(k);
            // Upgrade detail based on zoom level.
            if (k >= 4 && currentLevel !== "10m") upgradeDetail("10m");
            else if (k >= 2 && currentLevel === "110m") upgradeDetail("50m");
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
