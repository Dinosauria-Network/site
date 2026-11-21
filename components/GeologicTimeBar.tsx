import React from "react";
import type { FossilLocation } from "@/lib/genus-data";

interface GeologicTimeBarProps {
  locations: FossilLocation[];
}

// Epoch subdivisions with colors from app/mesozoic/page.tsx.
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

const PERIOD_COLORS: Record<string, string> = {
  Triassic: "#812B92",
  Jurassic: "#34B2C9",
  Cretaceous: "#82cc73",
  Permian: "#f04c23",
  Cenozoic: "#ffe951",
};

const MIN_MA = 252.17;
const MAX_MA = 66.0;
const RANGE = MIN_MA - MAX_MA;

export default function GeologicTimeBar({ locations }: GeologicTimeBarProps) {
  const width = 800;
  const height = 90;
  const barTop = 34;
  const barH = 22;
  const x = (ma: number) => ((MIN_MA - ma) / RANGE) * width;

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

  // Period spans for labels above the bar.
  const periodSpans = [
    { name: "Triassic", start: 252.17, end: 201.4, color: "#812B92" },
    { name: "Jurassic", start: 201.4, end: 143.1, color: "#34B2C9" },
    { name: "Cretaceous", start: 143.1, end: 66.0, color: "#82cc73" },
  ];

  return (
    <div className="genus-geotime">
      <h3 className="genus-geotime-title">Geologic time of fossil occurrences</h3>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height={height}
        role="img"
        aria-label="Geologic time bar showing Mesozoic periods, epochs, and occurrence ages"
      >
        {/* period labels above */}
        {periodSpans.map((p) => (
          <text
            key={p.name}
            x={(x(p.start) + x(p.end)) / 2}
            y={barTop - 18}
            textAnchor="middle"
            fontSize={13}
            fontWeight={700}
            fill={p.color}
          >
            {p.name}
          </text>
        ))}
        {/* epoch segments */}
        {EPOCHS.map((e) => (
          <g key={`${e.period}-${e.name}`}>
            <rect
              x={x(e.start)}
              y={barTop}
              width={x(e.end) - x(e.start)}
              height={barH}
              fill={e.color}
              stroke="#fff"
              strokeWidth={0.5}
            />
            {x(e.end) - x(e.start) > 28 && (
              <text
                x={(x(e.start) + x(e.end)) / 2}
                y={barTop + barH / 2 + 4}
                textAnchor="middle"
                fontSize={9}
                fill="#000"
              >
                {e.name}
              </text>
            )}
          </g>
        ))}
        {/* period boundaries */}
        {[201.4, 143.1].map((ma) => (
          <line
            key={ma}
            x1={x(ma)}
            y1={barTop}
            x2={x(ma)}
            y2={barTop + barH}
            stroke="#000"
            strokeWidth={1.5}
          />
        ))}
        {/* axis ticks */}
        {[252, 201, 143, 66].map((ma) => (
          <g key={ma}>
            <line x1={x(ma)} y1={barTop + barH} x2={x(ma)} y2={barTop + barH + 4} stroke="#444" strokeWidth={1} />
            <text x={x(ma)} y={barTop + barH + 16} textAnchor="middle" fontSize={10} fill="#444">
              {ma} Ma
            </text>
          </g>
        ))}
        {/* occurrence markers */}
        {markers.map((m) => (
          <circle
            key={m.i}
            cx={x(m.mid)}
            cy={barTop - 6}
            r={Math.min(6, 2 + Math.sqrt(m.count))}
            fill={m.color}
            stroke="#2f271d"
            strokeWidth={0.8}
          >
            <title>{m.period} (~{Math.round(m.mid)} Ma)</title>
          </circle>
        ))}
      </svg>
    </div>
  );
}