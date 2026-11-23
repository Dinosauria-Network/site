"use client";

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
  highlightMa?: number | undefined;
  highlightAgeRange?: [number, number] | undefined;
  onMarkerHover?: (info?: { ma?: number; period?: string; location?: FossilLocation }) => void;
  onHighlightAge?: (range?: [number, number] | undefined) => void;
}

export default function GenusFossilSection({
  locations,
  genusName,
  activePeriods,
  regions,
  highlightMa,
  highlightAgeRange,
  onMarkerHover,
  onHighlightAge,
}: GenusFossilSectionProps) {
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
        onMarkerHover={onMarkerHover}
      />

      {/* Geologic Time Scale (periods derived from the locations) */}
      <GeologicTimeBar
        locations={locations}
        periods={activePeriods}
        highlightMa={highlightMa}
        onHighlightAge={onHighlightAge}
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
