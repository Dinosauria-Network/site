import React from "react";
import type { FossilLocation } from "@/lib/genus-data";

interface GeologicTimeBarProps {
  locations: FossilLocation[];
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

// Ages, oldest -> youngest. `start` is the older boundary in Ma.
const AGES = [
  { name: "Induan", start: 252.17, end: 250.8, color: "#A4469F" },
  { name: "Olenekian", start: 250.8, end: 247.0, color: "#B051A5" },
  { name: "Anisian", start: 247.0, end: 241.464, color: "#BC75B7" },
  { name: "Ladinian", start: 241.464, end: 237.0, color: "#C983BF" },
  { name: "Carnian", start: 237.0, end: 227.3, color: "#C99BCB" },
  { name: "Norian", start: 227.3, end: 205.7, color: "#D6AAD3" },
  { name: "Rhaetian", start: 205.7, end: 201.4, color: "#D6AAD3" },
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
const RANGE = MIN_MA - MAX_MA;

export default function GeologicTimeBar(_props: GeologicTimeBarProps) {
  const width = 800;
  const rowH = 20;
  const gap = 0;
  const topPad = 6;
  const ageLabelH = 58; // vertical (rotated) age labels below the age band
  const axisH = 20;
  const rows = 5;
  const height = topPad + rows * rowH + (rows - 1) * gap + 4 + ageLabelH + axisH;

  const yPhan = topPad;
  const yMesoEra = yPhan + rowH + gap;
  const yPeriod = yMesoEra + rowH + gap;
  const yEpoch = yPeriod + rowH + gap;
  const yAge = yEpoch + rowH + gap;
  const ageLabelY = yAge + rowH + 4;
  const axisY = ageLabelY + ageLabelH;

  const xMeso = (ma: number) => ((MIN_MA - ma) / RANGE) * width;
  const xPhan = (ma: number) => ((541 - ma) / (541 - 0)) * width;

  // Center a label, but keep edge labels inside the chart.
  const labelPos = (center: number, text: string, fontSize: number) => {
    const half = (text.length * fontSize * 0.55) / 2;
    if (center - half < 0) return { x: 1, anchor: "start" as const };
    if (center + half > width) return { x: width - 1, anchor: "end" as const };
    return { x: center, anchor: "middle" as const };
  };

  return (
    <div className="genus-geotime">
      <h3 className="genus-geotime-title">Geologic time of fossil occurrences</h3>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="genus-geotime-svg"
        role="img"
        aria-label="Mesozoic geologic time scale showing periods, epochs, and ages"
      >
        {/* Row 0: Phanerozoic (single band) */}
        <rect
          x={xPhan(541)}
          y={yPhan}
          width={xPhan(0) - xPhan(541)}
          height={rowH}
          fill="#9AD9DD"
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
        {PERIODS.map((p) => {
          const w = xMeso(p.end) - xMeso(p.start);
          const lp = labelPos((xMeso(p.start) + xMeso(p.end)) / 2, p.name, 11);
          return (
            <g key={p.name}>
              <rect
                x={xMeso(p.start)}
                y={yPeriod}
                width={w}
                height={rowH}
                fill={p.color}
                stroke="#fff"
                strokeWidth={0.5}
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
        {EPOCHS.map((e) => {
          const w = xMeso(e.end) - xMeso(e.start);
          const lp = labelPos((xMeso(e.start) + xMeso(e.end)) / 2, e.name, 9);
          return (
            <g key={`${e.period}-${e.name}`}>
              <rect
                x={xMeso(e.start)}
                y={yEpoch}
                width={w}
                height={rowH}
                fill={e.color}
                stroke="#fff"
                strokeWidth={0.5}
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
        {AGES.map((a) => {
          const x0 = xMeso(a.start);
          const x1 = xMeso(a.end);
          const w = Math.max(1, x1 - x0);
          return (
            <g key={a.name}>
              <rect
                x={x0}
                y={yAge}
                width={w}
                height={rowH}
                fill={a.color}
                stroke="#fff"
                strokeWidth={0.3}
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
          x2={width}
          y2={axisY}
          stroke="#444"
          strokeWidth={1}
        />
        {[252, 201, 143, 66].map((ma) => (
          <g key={ma}>
            <line
              x1={xMeso(ma)}
              y1={axisY}
              x2={xMeso(ma)}
              y2={axisY + 4}
              stroke="#444"
              strokeWidth={1}
            />
            <text
              x={xMeso(ma)}
              y={axisY + 15}
              textAnchor={ma === 252 ? "start" : ma === 66 ? "end" : "middle"}
              fontSize={10}
              fill="#444"
            >
              {ma} Ma
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
