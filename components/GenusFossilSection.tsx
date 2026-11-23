"use client";

import { useState, useCallback } from "react";
import type { FossilLocation } from "@/lib/genus-data";
import GenusFossilMap from "@/components/GenusFossilMap";
import GeologicTimeBar from "@/components/GeologicTimeBar";

interface GenusFossilSectionProps {
  locations: FossilLocation[];
  genusName: string;
  activePeriods?: string[];
  regions: {
    shown: [string, number][];
    hiddenRegions: number;
    totalOccurrences: number;
  } | null;
}

export default function GenusFossilSection({
  locations,
  genusName,
  activePeriods,
  regions,
}: GenusFossilSectionProps) {
  // Highlight state shared between the map and the geologic time bar.
  const [highlightMa, setHighlightMa] = useState<number | undefined>();
  const [highlightAgeRange, setHighlightAgeRange] = useState<[number, number] | undefined>();

  // Hovering a map marker -> light up the matching point on the time scale.
  const handleMarkerHover = useCallback(
    (info?: { ma?: number; period?: string; location?: FossilLocation }) => {
      setHighlightMa(info?.ma);
      setHighlightAgeRange(undefined);
    },
    []
  );

  // Hovering a period/epoch/age bar -> highlight map markers in that age range.
  const handleHighlightAge = useCallback((range?: [number, number]) => {
    setHighlightAgeRange(range);
    setHighlightMa(range ? (range[0] + range[1]) / 2 : undefined);
  }, []);

  return (
    <section className="genus-fossil-section" aria-labelledby="fossil-heading">
      <h2 id="fossil-heading">Where fossils have been found</h2>
      <p className="genus-fossil-note">
        Occurrence localities from the{" "}
        <a
          href={`https://paleobiodb.org/navigator/#taxa=${encodeURIComponent(genusName)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Paleobiology Database
        </a>
        .
      </p>

      {/* Interactive Map */}
      <GenusFossilMap
        locations={locations}
        genusName={genusName}
        highlightAgeRange={highlightAgeRange}
        onMarkerHover={handleMarkerHover}
      />

      {/* Geologic Time Scale (periods derived from the locations) */}
      <GeologicTimeBar
        locations={locations}
        periods={activePeriods}
        highlightMa={highlightMa}
        onHighlightAge={handleHighlightAge}
      />

      {regions && (
        <>
          <p className="genus-fossil-summary">
            {regions.totalOccurrences.toLocaleString("en-US")}{" "}
            {regions.totalOccurrences === 1 ? "occurrence" : "occurrences"} in the database, most
            reported from:
          </p>
          <ul className="genus-fossil-list">
            {regions.shown.map(([region, count]) => (
              <li key={region}>
                {region}
                {count > 1 ? ` (${count} occurrences)` : ""}
              </li>
            ))}
            {regions.hiddenRegions > 0 && (
              <li className="genus-fossil-more">
                +{regions.hiddenRegions} more{" "}
                {regions.hiddenRegions === 1 ? "region" : "regions"} on the map
              </li>
            )}
          </ul>
        </>
      )}
    </section>
  );
}
