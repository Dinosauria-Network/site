import React from "react";
import type { FossilLocation } from "@/lib/genus-data";

interface GeologicTimeBarProps {
  locations: FossilLocation[];
  highlightMa?: number | undefined;
  onHighlightAge?: (range?: [number, number] | undefined) => void;
  periods?: string[] | undefined;
}

// Colors and boundaries from app/mesozoic/page.tsx.
const EPOCHS = [
  { name: "Early", period: "Triassic", start: 252.17, end: 247.0, color: "#983999" },
  { name: "Middle", period: "Triassic", start: 247.0, end: 237.0, color: "#B168B1" },
  { name: "Late", period: "Triassic", start: 237.0, end: 201.4, color: "#bd8cc3" },
  { name: "Early", period: "Jurassic", start: 201.4, end: 174.7, color: "#42AED0" },
  { name: "Middle", period: "Jurassic", start: 174.7, end: 161.5, color: "#80CFD8" },
  { name: "Late", period: "Jurassic", start: 161.5, end: 143.1, color: "#B3E3EE" },
  { name: "Early", period: "Cretaceous", start: 143.1, end: 100.5, color: "#8fd07b" },
  { name: "Late", period: "Cretaceous", start: 100.5, end: 66.0, color: "#abd671" },
];

// Ages/stages, oldest -> youngest. `start` is the older boundary in Ma.
// Boundaries mirror app/mesozoic/page.tsx (ICS). Keep the two in sync.
const AGES = [
  // Triassic
  { name: "Induan", start: 252.17, end: 250.8, color: "#A4469F" },
  { name: "Olenekian", start: 250.8, end: 247.0, color: "#B051A5" },
  { name: "Anisian", start: 247.0, end: 241.464, color: "#BC75B7" },
  { name: "Ladinian", start: 241.464, end: 237.0, color: "#C983BF" },
  { name: "Carnian", start: 237.0, end: 227.3, color: "#C99BCB" },
  { name: "Norian", start: 227.3, end: 205.7, color: "#D6AAD3" },
  { name: "Rhaetian", start: 205.7, end: 201.4, color: "#D6AAD3" },
  // Jurassic
  { name: "Hettangian", start: 201.4, end: 199.5, color: "#4EB3D3" },
  { name: "Sinemurian", start: 199.5, end: 192.9, color: "#67BCD8" },
  { name: "Pliensbachian", start: 192.9, end: 184.2, color: "#80C5DD" },
  { name: "Toarcian", start: 184.2, end: 174.7, color: "#99CEE3" },
  { name: "Aalenian", start: 174.7, end: 170.9, color: "#9AD9DD" },
  { name: "Bajocian", start: 170.9, end: 168.2, color: "#A6DDE0" },
  { name: "Bathonian", start: 168.2, end: 165.3, color: "#B3E2E3" },
  { name: "Callovian", start: 165.3, end: 161.5, color: "#BFE7E5" },
  { name: "Oxfordian", start: 161.5, end: 154.8, color: "#BFE7F1" },
  { name: "Kimmeridgian", start: 154.8, end: 149.2, color: "#CCECF4" },
  { name: "Tithonian", start: 149.2, end: 143.1, color: "#D9F1F7" },
  // Cretaceous
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
];

const PERIODS = [
  { name: "Triassic", start: 252.17, end: 201.4, color: "#812B92" },
  { name: "Jurassic", start: 201.4, end: 143.1, color: "#34B2C9" },
  { name: "Cretaceous", start: 143.1, end: 66.0, color: "#82cc73" },
];

export function epochColorForMa(ma: number): string {
  for (const e of EPOCHS) {
    if (ma <= e.start && ma >= e.end) return e.color;
  }
  // fallback by period color
  if (ma >= 201.4) return "#812B92";
  if (ma >= 143.1) return "#34B2C9";
  if (ma >= 66.0) return "#82cc73";
  return "#999";
}

const MIN_MA = 252.17;
const MAX_MA = 66.0;

// Which periods are represented by the genus' fossil locations.
function presentPeriods(locations: FossilLocation[]): Set<string> {
  const out = new Set<string>();
  for (const loc of locations) {
    const lo = loc.minMa ?? loc.maxMa;
    const hi = loc.maxMa ?? loc.minMa;
    if (lo !== undefined && hi !== undefined) {
      for (const p of PERIODS) {
        if (hi >= p.end && lo <= p.start) out.add(p.name);
      }
    } else if (loc.period) {
      out.add(loc.period);
    }
  }
  return out;
}

function clampDomain(locations: FossilLocation[]): { visStart: number; visEnd: number } {
  const present = presentPeriods(locations);
  if (present.size === 0) return { visStart: MIN_MA, visEnd: MAX_MA };
  const visStart = Math.max(...Array.from(present).map((n) => PERIODS.find((p) => p.name === n)!.start)); // oldest boundary
  const visEnd = Math.min(...Array.from(present).map((n) => PERIODS.find((p) => p.name === n)!.end)); // youngest boundary
  return { visStart, visEnd };
}

// Find the period containing a Ma value.
function periodForMa(ma: number | undefined): { name: string; start: number; end: number } | undefined {
  if (ma === undefined) return undefined;
  return PERIODS.find((p) => ma <= p.start && ma >= p.end);
}

// Find the epoch containing a Ma value.
function epochForMa(ma: number | undefined): { name: string; period: string; start: number; end: number } | undefined {
  if (ma === undefined) return undefined;
  return EPOCHS.find((e) => ma <= e.start && ma >= e.end);
}

// Find the age containing a Ma value.
function ageForMa(ma: number | undefined): { name: string; start: number; end: number } | undefined {
  if (ma === undefined) return undefined;
  return AGES.find((a) => ma <= a.start && ma >= a.end);
}

export default function GeologicTimeBar({ locations, highlightMa, onHighlightAge, periods }: GeologicTimeBarProps) {
  const { visStart, visEnd } = clampDomain(locations);
  const visRange = visStart - visEnd;

  // Use passed periods if provided, otherwise derive from locations
  const periodSet = periods ? new Set(periods) : presentPeriods(locations);
  const activePeriods = PERIODS.filter((p) => periodSet.has(p.name));

  const activeEpochs = EPOCHS.filter((e) =>
    activePeriods.some((p) => p.name === e.period)
  );
  const activeAges = AGES.filter((a) =>
    activePeriods.some((p) => a.start > p.end && a.end < p.start)
  );

  const xMeso = (ma: number) => ((visStart - ma) / visRange) * 800;

  const labelPos = (center: number, text: string, fontSize: number) => {
    const half = (text.length * fontSize * 0.55) / 2;
    if (center - half < 0) return { x: 1, anchor: "start" as const };
    if (center + half > 800) return { x: 799, anchor: "end" as const };
    return { x: center, anchor: "middle" as const };
  };

  const ticks: { x: number; label: string; anchor: "start" | "middle" | "end" }[] = [
    { x: 0, label: `${Math.round(visStart)} Ma`, anchor: "start" },
  ];
  const candidates = [237, 201, 175, 143, 100];
  for (const c of candidates) {
    if (c < visStart - 18 && c > visEnd + 18) {
      ticks.push({ x: xMeso(c), label: `${c} Ma`, anchor: "middle" });
    }
  }
  ticks.push({ x: 800, label: `${Math.round(visEnd)} Ma`, anchor: "end" });

  const topPad = 6;
  const rowH = 20;
  const gap = 0;
  const height = topPad + 5 * rowH + 4 + 58 + 20;

  const yPhan = topPad;
  const yMesoEra = yPhan + rowH;
  const yPeriod = yMesoEra + rowH;
  const yEpoch = yPeriod + rowH;
  const yAge = yEpoch + rowH;
  const ageLabelY = yAge + rowH + 4;
  const axisY = ageLabelY + 58;

  return (
    <div className="genus-geotime">
      <h3 className="genus-geotime-title">Geologic time of fossil occurrences</h3>
      <svg
        viewBox={`0 0 800 ${height}`}
        className="genus-geotime-svg"
        role="img"
        aria-label="Mesozoic geologic time scale showing periods, epochs, and ages"
      >
        {/* Row 0: Phanerozoic — full width, since it spans far beyond the Mesozoic shown below */}
        <rect
          x={0}
          y={yPhan}
          width={800}
          height={rowH}
          fill="#9AD9DD"
          stroke="#fff"
          strokeWidth={0.5}
        />
        <text
          x={400}
          y={yPhan + rowH / 2 + 4}
          textAnchor="middle"
          fontSize={12}
          fontWeight={700}
          fill="#000"
        >
          Phanerozoic
        </text>

        {/* Row 1: Mesozoic era (clamped to visible window) */}
        <rect
          x={xMeso(visStart)}
          y={yMesoEra}
          width={xMeso(visEnd) - xMeso(visStart)}
          height={rowH}
          fill="#67C5CA"
          stroke="#fff"
          strokeWidth={0.5}
          opacity={0.9}
        />
        <text
          x={(xMeso(visStart) + xMeso(visEnd)) / 2}
          y={yMesoEra + rowH / 2 + 4}
          textAnchor="middle"
          fontSize={12}
          fontWeight={700}
          fill="#000"
        >
          Mesozoic
        </text>

        {/* Row 2: Mesozoic periods */}
        {activePeriods.map((p) => {
          const w = xMeso(p.end) - xMeso(p.start);
          const lp = labelPos((xMeso(p.start) + xMeso(p.end)) / 2, p.name, 11);
          const isHighlighted = periodForMa(highlightMa)?.name === p.name;
          return (
            <g key={p.name}>
              <rect
                x={xMeso(p.start)}
                y={yPeriod}
                width={w}
                height={rowH}
                fill={p.color}
                stroke={isHighlighted ? "#2f271d" : "#fff"}
                strokeWidth={isHighlighted ? 2 : 0.5}
                onMouseEnter={() => onHighlightAge?.([p.start, p.end])}
                onMouseLeave={() => onHighlightAge?.(undefined)}
                style={{ cursor: "pointer" }}
              />
              {w > 30 && (
                <text
                  x={lp.x}
                  y={yPeriod + rowH / 2 + 4}
                  textAnchor={lp.anchor}
                  fontSize={11}
                  fontWeight={600}
                  fill={p.name === "Jurassic" || p.name === "Triassic" ? "#fff" : "#000"}
                >
                  {p.name}
                </text>
              )}
            </g>
          );
        })}

        {/* Row 3: epochs */}
        {activeEpochs.map((e) => {
          const w = xMeso(e.end) - xMeso(e.start);
          const lp = labelPos((xMeso(e.start) + xMeso(e.end)) / 2, e.name, 9);
          const highlightedEpoch = epochForMa(highlightMa);
          const isHighlighted =
            highlightedEpoch?.name === e.name && highlightedEpoch?.period === e.period;
          return (
            <g key={`${e.period}-${e.name}`}>
              <rect
                x={xMeso(e.start)}
                y={yEpoch}
                width={w}
                height={rowH}
                fill={e.color}
                stroke={isHighlighted ? "#2f271d" : "#fff"}
                strokeWidth={isHighlighted ? 2 : 0.5}
                onMouseEnter={() => onHighlightAge?.([e.start, e.end])}
                onMouseLeave={() => onHighlightAge?.(undefined)}
                style={{ cursor: "pointer" }}
              />
              {w > 20 && (
                <text
                  x={lp.x}
                  y={yEpoch + rowH / 2 + 4}
                  textAnchor={lp.anchor}
                  fontSize={9}
                  fill="#000"
                >
                  {e.name}
                </text>
              )}
            </g>
          );
        })}

        {/* Row 4: ages */}
        {activeAges.map((a) => {
          const x0 = xMeso(a.start);
          const x1 = xMeso(a.end);
          const w = Math.max(1, x1 - x0);
          const isHighlighted = ageForMa(highlightMa)?.name === a.name;
          return (
            <g key={a.name}>
              <rect
                x={x0}
                y={yAge}
                width={w}
                height={rowH}
                fill={a.color}
                stroke={isHighlighted ? "#2f271d" : "#fff"}
                strokeWidth={isHighlighted ? 2 : 0.3}
                onMouseEnter={() => onHighlightAge?.([a.start, a.end])}
                onMouseLeave={() => onHighlightAge?.(undefined)}
                style={{ cursor: "pointer" }}
              />
              {w >= 5 && (
                <text
                  x={(x0 + x1) / 2 + 2.5}
                  y={ageLabelY}
                  transform={`rotate(-90 ${(x0 + x1) / 2 + 2.5} ${ageLabelY})`}
                  textAnchor="end"
                  fontSize={7}
                  fill="#000"
                >
                  {a.name}
                </text>
              )}
            </g>
          );
        })}

        {/* age axis at the bottom of the chart */}
        <line
          x1={0}
          y1={axisY}
          x2={800}
          y2={axisY}
          stroke="#444"
          strokeWidth={1}
        />
        {ticks.map((t, idx) => (
          <g key={idx}>
            <line
              x1={t.x}
              y1={axisY}
              x2={t.x}
              y2={axisY + 4}
              stroke="#444"
              strokeWidth={1}
            />
            <text
              x={t.x}
              y={axisY + 15}
              textAnchor={t.anchor}
              fontSize={10}
              fill="#444"
            >
              {t.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
