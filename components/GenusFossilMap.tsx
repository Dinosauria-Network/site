"use client";

import { useEffect, useRef } from "react";
import type { FossilLocation } from "@/lib/genus-data";

interface GenusFossilMapProps {
  locations: FossilLocation[];
  genusName: string;
}

/**
 * Client-only Leaflet map for a genus's fossil find bubbles.
 * Leaflet is imported dynamically so the server render stays static.
 */
export default function GenusFossilMap({ locations, genusName }: GenusFossilMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<{ remove: () => void } | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;
    let cancelled = false;

    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current) return;

      const map = L.map(containerRef.current, {
        scrollWheelZoom: false,
        worldCopyJump: true,
        attributionControl: true,
      });
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 8,
        minZoom: 1,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      const points: [number, number][] = [];
      for (const loc of locations) {
        const weight = loc.count ?? 1;
        const marker = L.circleMarker([loc.lat, loc.lng], {
          radius: Math.min(16, 4 + Math.sqrt(weight) * 1.6),
          weight: 1,
          color: "#2f271d",
          fillColor: "#b07a24",
          fillOpacity: 0.78,
        }).addTo(map);

        const place = [loc.state, loc.country].filter(Boolean).join(", ");
        const countLine = weight > 1 ? `<br/><span>${weight} occurrences</span>` : "";
        marker.bindPopup(`<strong>${genusName}</strong><br/>${place}${countLine}`);
        marker.bindTooltip(place, { direction: "top", opacity: 0.9 });
        points.push([loc.lat, loc.lng]);
      }

      if (points.length === 1) {
        map.setView(points[0], 4);
      } else if (points.length > 1) {
        map.fitBounds(points, { padding: [28, 28], maxZoom: 4 });
      } else {
        map.setView([15, 0], 1);
      }
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
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
