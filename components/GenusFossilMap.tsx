"use client";

import { useEffect, useRef, useState } from "react";
import type { FossilLocation } from "@/lib/genus-data";

interface GenusFossilMapProps {
  locations: FossilLocation[];
  genusName: string;
}

type GeoModule = typeof import("d3-geo");
type TopoModule = typeof import("topojson-client");

// Cached so the world atlas is loaded only once per session.
let atlasPromise: Promise<any> | null = null;
function loadAtlas() {
  if (!atlasPromise) {
    atlasPromise = import("@/lib/data/world-110m.json").then((m: any) => m.default ?? m);
  }
  return atlasPromise;
}

/**
 * Client-only world map in the Natural Earth projection (d3.geoNaturalEarth1),
 * with one circle per fossil-find bubble. Replaces the previous Leaflet/Web
 * Mercator map so the page no longer depends on slippy tiles.
 */
export default function GenusFossilMap({ locations, genusName }: GenusFossilMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let cancelled = false;

    const render = async () => {
      try {
        const [d3geo, topo, atlas] = await Promise.all([
          import("d3-geo") as Promise<GeoModule>,
          import("topojson-client") as Promise<TopoModule>,
          loadAtlas(),
        ]);
        if (cancelled) return;

        const width = Math.max(container.clientWidth || 640, 320);
        const height = Math.max(container.clientHeight || 380, 240);

        const projection = d3geo.geoNaturalEarth1();
        const path = d3geo.geoPath(projection);

        const countries = (topo as any).feature(
          atlas,
          atlas.objects.countries
        ) as { features: any[] };

        // Fit the projection to the marker points when there are at least two
        // distinct locations; otherwise centre on the single point at a
        // sensible scale.
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

        const spherePath = path({ type: "Sphere" } as any) || "";
        const countryPaths = countries.features
          .map((f: any) => path(f))
          .filter((d): d is string => Boolean(d))
          .map((d: string) => `<path d="${d}" fill="#e9e6de" stroke="#808080" stroke-width="0.5" />`)
          .join("");

        const markerSvg = pts
          .map(([lng, lat]) => {
            const xy = projection([lng, lat]);
            if (!xy) return "";
            const loc = locations.find((l) => l.lng === lng && l.lat === lat);
            const weight = loc?.count ?? 1;
            const r = Math.min(8, 3 + Math.sqrt(weight) * 1.2);
            const place = [loc?.state, loc?.country].filter(Boolean).join(", ");
            const title = `${genusName} — ${place}${weight > 1 ? ` (${weight} occurrences)` : ""}`;
            return `<circle cx="${xy[0].toFixed(1)}" cy="${xy[1].toFixed(1)}" r="${r}" fill="#b07a24" fill-opacity="0.85" stroke="#2f271d" stroke-width="1"><title>${escapeXml(title)}</title></circle>`;
          })
          .join("");

        const out =
          `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" height="100%" role="img" aria-label="Map of fossil find locations for ${escapeXml(genusName)}" style="background:#e9e6de;">` +
          `<path d="${spherePath}" fill="#f4f1e8" stroke="#808080" stroke-width="0.8" />` +
          `<g>${countryPaths}</g>` +
          `<g>${markerSvg}</g>` +
          `</svg>`;

        if (!cancelled) setSvg(out);
      } catch (e) {
        if (!cancelled) setError(String(e).slice(0, 200));
      }
    };

    render();

    const onResize = () => {
      // Re-render on resize for responsive sizing.
      if (containerRef.current) render();
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(container);

    return () => {
      cancelled = true;
      ro.disconnect();
    };
  }, [locations, genusName]);

  return (
    <div
      ref={containerRef}
      className="genus-fossil-map"
      role="region"
      aria-label={`Map of fossil find locations for ${genusName}`}
    >
      {error ? (
        <p className="genus-fossil-map-error">Map unavailable: {error}</p>
      ) : svg ? (
        <div dangerouslySetInnerHTML={{ __html: svg }} style={{ width: "100%", height: "100%" }} />
      ) : (
        <p className="genus-fossil-map-loading">Loading map…</p>
      )}
    </div>
  );
}

function escapeXml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
