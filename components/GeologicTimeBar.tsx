import React from "react";
import type { FossilLocation } from "@/lib/genus-data";

interface GeologicTimeBarProps {
  locations: FossilLocation[];
}

// Colors from app/mesozoic/page.tsx.
const PERIOD_COLORS: Record<string, string> = {
  Triassic: "#812B92",
  Jurassic: "#34B2C9",
  Cretaceous: "#82cc73",
  Permian: "#f04c23",
  Cenozoic: "#ffe951",
};

const EPOCHS = [
  { name: "Early", period: "Triassic", start: 252.17, end: 247.0, color: "#983999" },
  { name: "Middle", period: "Triassic", start: 247.0, end: 237.0, color: "#B168B1" },
  { name: "Late", period: "Triassic", start: 237.0, end: 201.4, color: "#bd8cc3" },
  { name: "Early", period: "Jurassic", start: 201.4, end: 174.7, color: "#42AED0" },
  { name: "Middle", period: "Jurassic", start: 174.7, end: 163.5, color: "#80CFD8" },
  { name: "Late", period: "Jurassic", start: 163.5, end: 143.1, color: "#B3E3EE" },
  { name: "Early", period: "Cretaceous", start: 143.1, end: 100.5, color: "#8fd07b" },
  { name: "Late", period: "Cretaceous", start: 100.5, end: 66.0, color: "#abd671" },
];

const PERIODS = [
  { name: "Triassic", start: 252.17, end: 201.4, color: "#812B92" },
  { name: "Jurassic", start: 201.4, end: 143.1, color: "#34B2C9" },
  { name: "Cretaceous", start: 143.1, end: 66.0, color: "#82cc73" },
];

const MIN_MA = 252.17;
const MAX_MA = 66.0;
const RANGE = MIN_MA - MAX_MA;

export default function GeologicTimeBar({ locations }: GeologicTimeBarProps) {
  const width = 800;
  // rows: phanerozoic (top), mesozoic, period epochs (bottom)
  const rowH = 22;
  const gap = 4;
  const topPad = 18; // period labels above mesozoic row
  const bottomPad = 22; // axis
  const rows = 2;
  const height = topPad + rows * rowH + (rows - 1) * gap + bottomPad;

  // y positions of each row (top-down)
  const yMeso = topPad;
  const yEpoch = yMeso + rowH + gap;

  const xMeso = (ma: number) => ((MIN_MA - ma) / RANGE) * width;
  const xEpoch = (ma: number) => xMeso(ma); // same scale as mesozoic

  // dominant period for highlighting
  const periodCounts: Record<string, number> = {};
  for (const loc of locations) {
    if (loc.period) periodCounts[loc.period] = (periodCounts[loc.period] || 0) + (loc.count ?? 1);
  }
  const dominantPeriod = Object.entries(periodCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

  const epochRow = EPOCHS.filter((e) => e.period === dominantPeriod);
  const epochRange = epochRow.length
    ? { start: epochRow[0].start, end: epochRow[epochRow.length - 1].end }
    : { start: MIN_MA, end: MAX_MA };

  const markers = locations
    .map((loc, i) => {
      const lo = loc.minMa ?? loc.maxMa;
      const hi = loc.maxMa ?? loc.minMa;
      if (lo === undefined || hi === undefined) return null;
      const mid = (lo + hi) / 2;
      const clamped = Math.max(MAX_MA, Math.min(MIN_MA, mid));
      const period = loc.period || "Cretaceous";
      const color = PERIOD_COLORS[period] || "#999";
      return { i, mid: clamped, color, period, count: loc.count ?? 1 };
    })
    .filter(Boolean) as { i: number; mid: number; color: string; period: string; count: number }[];

  return (
    <div className="genus-geotime">
      <h3 className="genus-geotime-title">Geologic time of fossil occurrences</h3>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height={height}
        role="img"
        aria-label="Geologic time chart showing Mesozoic periods, epochs, and occurrence ages"
      >
        {/* Row 1: Mesozoic periods */}
        {PERIODS.map((p) => (
          <g key={p.name}>
            <rect
              x={xMeso(p.start)}
              y={yMeso}
              width={xMeso(p.end) - xMeso(p.start)}
              height={rowH}
              fill={p.color}
              stroke="#fff"
              strokeWidth={0.5}
              opacity={p.name === dominantPeriod ? 1 : 0.6}
            />
            {xMeso(p.end) - xMeso(p.start) > 30 && (
              <text
                x={(xMeso(p.start) + xMeso(p.end)) / 2}
                y={yMeso + rowH / 2 + 4}
                textAnchor="middle"
                fontSize={13}
                fontWeight={600}
                fill={p.name === "Jurassic" || p.name === "Triassic" ? "#fff" : "#000"}
              >
                {p.name}
              </text>
            )}
          </g>
        ))}

        {/* Row 2: epochs of the dominant period */}
        {epochRow.map((e) => (
          <g key={`${e.period}-${e.name}`}>
            <rect
              x={xEpoch(e.start)}
              y={yEpoch}
              width={xEpoch(e.end) - xEpoch(e.start)}
              height={rowH}
              fill={e.color}
              stroke="#fff"
              strokeWidth={0.5}
            />
            {xEpoch(e.end) - xEpoch(e.start) > 24 && (
              <text
                x={(xEpoch(e.start) + xEpoch(e.end)) / 2}
                y={yEpoch + rowH / 2 + 4}
                textAnchor="middle"
                fontSize={10}
                fill="#000"
              >
                {e.name}
              </text>
            )}
          </g>
        ))}
        {/* epoch row label */}
        {dominantPeriod && (
          <text
            x={-4}
            y={yEpoch + rowH / 2 + 4}
            textAnchor="end"
            fontSize={10}
            fontWeight={600}
            fill="#444"
          >
            {dominantPeriod}
          </text>
        )}

        {/* occurrence markers on the epoch row */}
        {markers.map((m) => (
          <circle
            key={m.i}
            cx={xEpoch(m.mid)}
            cy={yEpoch - 6}
            r={Math.min(6, 2 + Math.sqrt(m.count))}
            fill={m.color}
            stroke="#2f271d"
            strokeWidth={0.8}
          >
            <title>{m.period} (~{Math.round(m.mid)} Ma)</title>
          </circle>
        ))}

        {/* axis ticks on mesozoic row */}
        {[252, 201, 143, 66].map((ma) => (
          <g key={ma}>
            <line x1={xMeso(ma)} y1={yMeso + rowH} x2={xMeso(ma)} y2={yMeso + rowH + 4} stroke="#444" strokeWidth={1} />
            <text x={xMeso(ma)} y={yMeso + rowH + 16} textAnchor="middle" fontSize={10} fill="#444">
              {ma} Ma
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}