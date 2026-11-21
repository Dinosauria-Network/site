"use client";

import { useEffect, useRef } from "react";
import type { FossilLocation } from "@/lib/genus-data";

interface GenusFossilMapProps {
  locations: FossilLocation[];
  genusName: string;
}

// Cached so the world atlas is loaded only once per session.
let atlasPromise: Promise<any> | null = null;
function loadAtlas() {
  if (!atlasPromise) {
    atlasPromise = import("@/lib/data/world-110m.json").then((m: any) => m.default ?? m);
  }
  return atlasPromise;
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
 */
export default function GenusFossilMap({ locations, genusName }: GenusFossilMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let cancelled = false;
    let cleanupZoom: (() => void) | null = null;

    const build = async () => {
      // Tear down any previous render.
      container.innerHTML = "";

      try {
        const [d3geo, d3zoom, d3select, topo, atlas] = await Promise.all([
          import("d3-geo"),
          import("d3-zoom"),
          import("d3-selection"),
          import("topojson-client"),
          loadAtlas(),
        ]);
        if (cancelled || !containerRef.current) return;
        const node = containerRef.current;

        const width = Math.max(node.clientWidth || 640, 320);
        const height = Math.max(node.clientHeight || 380, 240);

        const projection = d3geo.geoNaturalEarth1();
        const path = d3geo.geoPath(projection);

        const countries = (topo as any).feature(atlas, atlas.objects.countries) as { features: any[] };

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
          .attr("aria-label", `Map of fossil find locations for ${genusName}`)
          .style("background", "#e9e6de")
          .style("touch-action", "none");

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
          .data(countries.features)
          .enter()
          .append("path")
          .attr("class", "country")
          .attr("d", (d: any) => path(d) || "")
          .attr("fill", "#e9e6de")
          .attr("stroke", "#808080")
          .attr("stroke-width", 0.5)
          .attr("vector-effect", "non-scaling-stroke");

        // Markers.
        const radii: number[] = [];
        const markerData = pts.map(([lng, lat]) => {
          const loc = locations.find((l) => l.lng === lng && l.lat === lat);
          const weight = loc?.count ?? 1;
          const r = Math.min(8, 3 + Math.sqrt(weight) * 1.2);
          radii.push(r);
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

        // Pan & zoom.
        const zoom = d3zoom.zoom()
          .scaleExtent([1, 8])
          .on("zoom", (event: any) => {
            zoomLayer.attr("transform", event.transform);
            const k = event.transform.k || 1;
            markers.attr("r", (d: any) => d.r / k);
          });

        svg.call(zoom as any);

        // Hint text.
        svg.append("text")
          .attr("x", 8)
          .attr("y", height - 8)
          .attr("font-size", 10)
          .attr("fill", "#555")

        cleanupZoom = () => {
          svg.on(".zoom", null);
        };
      } catch (e) {
        if (cancelled || !containerRef.current) return;
        containerRef.current.innerHTML = `<p class="genus-fossil-map-error">Map unavailable: ${escapeXml(String(e).slice(0, 200))}</p>`;
      }
    };

    build();

    // Rebuild (debounced) on resize for responsive sizing.
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
      if (containerRef.current) containerRef.current.innerHTML = "";
    };
  }, [locations, genusName]);

  return (
    <div
      ref={containerRef}
      className="genus-fossil-map"
      role="region"
      aria-label={`Map of fossil find locations for ${genusName}`}
    />
  );
}
