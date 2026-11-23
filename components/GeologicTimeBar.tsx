import React from "react";
import type { FossilLocation } from "@/lib/genus-data";
import {
  AGES,
  EPOCHS,
  MAX_MA,
  MIN_MA,
  PERIODS,
  ageForMa,
  epochForMa,
  periodForMa,
} from "@/lib/geologic-time";

interface GeologicTimeBarProps {
  locations: FossilLocation[];
  highlightMa?: number | undefined;
  onHighlightAge?: (range?: [number, number] | undefined) => void;
  periods?: string[] | undefined;
}

// Eras/periods/ages now live in @/lib/geologic-time (single source of truth).

export function epochColorForMa(ma: number): string {
  const e = epochForMa(ma);
  if (e) return e.color;
  // fallback by period color
  if (ma >= 201.4) return PERIODS[0].color;
  if (ma >= 143.1) return PERIODS[1].color;
  if (ma >= 66.0) return PERIODS[2].color;
  return "#999";
}


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
