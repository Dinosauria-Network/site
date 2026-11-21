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

// Ages per period (from app/mesozoic/page.tsx), oldest->youngest (high Ma -> low Ma).
const AGES: Record<string, { name: string; start: number; end: number; color: string }[]> = {
  Triassic: [
    { name: "Induan", start: 252.17, end: 250.8, color: "#A4469F" },
    { name: "Olenekian", start: 250.8, end: 247.0, color: "#B051A5" },
    { name: "Anisian", start: 247.0, end: 241.464, color: "#BC75B7" },
    { name: "Ladinian", start: 241.464, end: 237.0, color: "#C983BF" },
    { name: "Carnian", start: 237.0, end: 227.3, color: "#C99BCB" },
    { name: "Norian", start: 227.3, end: 205.7, color: "#D6AAD3" },
    { name: "Rhaetian", start: 205.7, end: 201.4, color: "#D6AAD3" },
  ],
  Jurassic: [
    { name: "Hettangian", start: 201.4, end: 192.9, color: "#4EB3D3" },
    { name: "Sinemurian", start: 192.9, end: 184.2, color: "#67BCD8" },
    { name: "Pliensbachian", start: 184.2, end: 174.7, color: "#80C5DD" },
    { name: "Toarcian", start: 174.7, end: 168.2, color: "#99CEE3" },
    { name: "Aalenian", start: 168.2, end: 165.3, color: "#9AD9DD" },
    { name: "Bajocian", start: 165.3, end: 161.5, color: "#A6DDE0" },
    { name: "Bathonian", start: 161.5, end: 154.8, color: "#B3E2E3" },
    { name: "Callovian", start: 154.8, end: 149.2, color: "#BFE7E5" },
    { name: "Oxfordian", start: 149.2, end: 143.1, color: "#BFE7F1" },
    { name: "Kimmeridgian", start: 143.1, end: 143.1, color: "#CCECF4" },
  ],
  Cretaceous: [
    { name: "Berriasian", start: 143.1, end: 137.05, color: "#8ed184" },
    { name: "Valanginian", start: 137.05, end: 132.6, color: "#9ad58d" },
    { name: "Hauterivian", start: 132.6, end: 125.77, color: "#a7d996" },
    { name: "Barremian", start: 125.77, end: 121.4, color: "#b4de9f" },
    { name: "Aptian", start: 121.4, end: 113.2, color: "#c1e2a8" },
    { name: "Albian", start: 113.2, end: 100.5, color: "#cee7b1" },
    { name: "Cenomanian", start: 100.5, end: 93.9, color: "#b8da7a" },
    { name: "Turonian", start: 93.9, end: 89.8, color: "#c5df83" },
    { name: "Coniacian", start: 89.8, end: 85.7, color: "#d2e38c" },
    { name: "Santonian", start: 85.7, end: 83.6, color: "#dfe895" },
    { name: "Campanian", start: 83.6, end: 72.2, color: "#ebec9e" },
    { name: "Maastrichtian", start: 72.2, end: 66.0, color: "#f9f1a8" },
  ],
};

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
  const rowH = 20;
  const gap = 4;
  const topPad = 16;
  const bottomPad = 22;
  const rows = 5;
  const height = topPad + rows * rowH + (rows - 1) * gap + bottomPad;

  const yPhan = topPad;
  const yMesoEra = yPhan + rowH + gap;
  const yPeriod = yMesoEra + rowH + gap;
  const yEpoch = yPeriod + rowH + gap;
  const yAge = yEpoch + rowH + gap;

  const xMeso = (ma: number) => ((MIN_MA - ma) / RANGE) * width;
  const xPhan = (ma: number) => ((541 - ma) / (541 - 0)) * width;

  const periodCounts: Record<string, number> = {};
  for (const loc of locations) {
    if (loc.period) periodCounts[loc.period] = (periodCounts[loc.period] || 0) + (loc.count ?? 1);
  }
  const dominantPeriod = Object.entries(periodCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "Cretaceous";

  const epochRow = EPOCHS.filter((e) => e.period === dominantPeriod);
  const ageRow = AGES[dominantPeriod] || [];

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
        aria-label="Geologic time chart showing Phanerozoic, Mesozoic periods, epochs, ages, and occurrence ages"
      >
        {/* Row 0: Phanerozoic (single band) */}
        <rect
          x={xPhan(541)}
          y={yPhan}
          width={xPhan(0) - xPhan(541)}
          height={rowH}
          fill="#e9e6de"
          stroke="#fff"
          strokeWidth={0.5}
        />
        <text
          x={(xPhan(541) + xPhan(0)) / 2}
          y={yPhan + rowH / 2 + 4}
          textAnchor="middle"
          fontSize={12}
          fontWeight={700}
          fill="#000"
        >
          Phanerozoic
        </text>

        {/* Row 1: Mesozoic (single band) */}
        <rect
          x={xMeso(252.17)}
          y={yMesoEra}
          width={xMeso(66) - xMeso(252.17)}
          height={rowH}
          fill="#67C5CA"
          stroke="#fff"
          strokeWidth={0.5}
          opacity={0.9}
        />
        <text
          x={(xMeso(252.17) + xMeso(66)) / 2}
          y={yMesoEra + rowH / 2 + 4}
          textAnchor="middle"
          fontSize={12}
          fontWeight={700}
          fill="#000"
        >
          Mesozoic
        </text>

        {/* Row 2: Mesozoic periods */}
        {PERIODS.map((p) => (
          <g key={p.name}>
            <rect
              x={xMeso(p.start)}
              y={yPeriod}
              width={xMeso(p.end) - xMeso(p.start)}
              height={rowH}
              fill={p.color}
              stroke="#fff"
              strokeWidth={0.5}
              opacity={p.name === dominantPeriod ? 1 : 0.55}
            />
            {xMeso(p.end) - xMeso(p.start) > 30 && (
              <text
                x={(xMeso(p.start) + xMeso(p.end)) / 2}
                y={yPeriod + rowH / 2 + 4}
                textAnchor="middle"
                fontSize={11}
                fontWeight={600}
                fill={p.name === "Jurassic" || p.name === "Triassic" ? "#fff" : "#000"}
              >
                {p.name}
              </text>
            )}
          </g>
        ))}

        {/* Row 3: epochs of dominant period */}
        {epochRow.map((e) => (
          <g key={`${e.period}-${e.name}`}>
            <rect
              x={xMeso(e.start)}
              y={yEpoch}
              width={xMeso(e.end) - xMeso(e.start)}
              height={rowH}
              fill={e.color}
              stroke="#fff"
              strokeWidth={0.5}
            />
            {xMeso(e.end) - xMeso(e.start) > 24 && (
              <text
                x={(xMeso(e.start) + xMeso(e.end)) / 2}
                y={yEpoch + rowH / 2 + 4}
                textAnchor="middle"
                fontSize={9}
                fill="#000"
              >
                {e.name}
              </text>
            )}
          </g>
        ))}
        {dominantPeriod && (
          <text x={-4} y={yEpoch + rowH / 2 + 4} textAnchor="end" fontSize={9} fontWeight={600} fill="#444">
            {dominantPeriod}
          </text>
        )}

        {/* Row 4: ages of dominant period */}
        {ageRow.map((a) => (
          <g key={a.name}>
            <rect
              x={xMeso(a.start)}
              y={yAge}
              width={Math.max(1, xMeso(a.end) - xMeso(a.start))}
              height={rowH}
              fill={a.color}
              stroke="#fff"
              strokeWidth={0.3}
            />
            {xMeso(a.end) - xMeso(a.start) > 18 && (
              <text
                x={(xMeso(a.start) + xMeso(a.end)) / 2}
                y={yAge + rowH / 2 + 3}
                textAnchor="middle"
                fontSize={7}
                fill="#000"
              >
                {a.name}
              </text>
            )}
          </g>
        ))}
        {dominantPeriod && (
          <text x={-4} y={yAge + rowH / 2 + 3} textAnchor="end" fontSize={9} fontWeight={600} fill="#444">
            ages
          </text>
        )}

        {/* occurrence markers on the epoch row */}
        {markers.map((m) => (
          <circle
            key={m.i}
            cx={xMeso(m.mid)}
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
            <line x1={xMeso(ma)} y1={yPeriod + rowH} x2={xMeso(ma)} y2={yPeriod + rowH + 4} stroke="#444" strokeWidth={1} />
            <text x={xMeso(ma)} y={yPeriod + rowH + 16} textAnchor="middle" fontSize={10} fill="#444">
              {ma} Ma
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}