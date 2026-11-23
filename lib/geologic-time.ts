/**
 * Shared Mesozoic geologic time data and lookups.
 *
 * Single source of truth for periods, epochs (Early/Middle/Late), and stages
 * (ages). Boundaries follow the ICS values mirrored in `app/mesozoic/page.tsx`
 * and are consistent with the Paleobiology Database occurrence ages used by
 * the genus fossil map and geologic time bar.
 */

export interface PeriodDef {
  name: string;
  start: number;
  end: number;
  color: string;
}

export interface EpochDef {
  period: string;
  name: string;
  start: number;
  end: number;
  color: string;
}

export interface AgeDef {
  name: string;
  start: number;
  end: number;
  color: string;
  /** Chart annotation text for the age's boundary (e.g. "72.2 ±0.2"). */
  endText?: string;
}

/** Periods, oldest -> youngest. `start` is the older boundary, `end` the younger. */
export const PERIODS: PeriodDef[] = [
  { name: "Triassic", start: 252.17, end: 201.4, color: "#812B92" },
  { name: "Jurassic", start: 201.4, end: 143.1, color: "#34B2C9" },
  { name: "Cretaceous", start: 143.1, end: 66.0, color: "#82cc73" },
];

/** Epochs (Early/Middle/Late within each period). */
export const EPOCHS: EpochDef[] = [
  { period: "Triassic", name: "Early", start: 252.17, end: 247.0, color: "#983999" },
  { period: "Triassic", name: "Middle", start: 247.0, end: 237.0, color: "#B168B1" },
  { period: "Triassic", name: "Late", start: 237.0, end: 201.4, color: "#bd8cc3" },
  { period: "Jurassic", name: "Early", start: 201.4, end: 174.7, color: "#42AED0" },
  { period: "Jurassic", name: "Middle", start: 174.7, end: 161.5, color: "#80CFD8" },
  { period: "Jurassic", name: "Late", start: 161.5, end: 143.1, color: "#B3E3EE" },
  { period: "Cretaceous", name: "Early", start: 143.1, end: 100.5, color: "#8fd07b" },
  { period: "Cretaceous", name: "Late", start: 100.5, end: 66.0, color: "#abd671" },
];

/** Stages (ages), oldest -> youngest. `start` is the older boundary, `end` the younger. */
export const AGES: AgeDef[] = [
  // Triassic
  { name: "Induan", start: 252.17, end: 250.8, color: "#A4469F", endText: "250.8" },
  { name: "Olenekian", start: 250.8, end: 247.0, color: "#B051A5", endText: "247.0" },
  { name: "Anisian", start: 247.0, end: 241.464, color: "#BC75B7", endText: "241.464 ±0.28" },
  { name: "Ladinian", start: 241.464, end: 237.0, color: "#C983BF", endText: "~237" },
  { name: "Carnian", start: 237.0, end: 227.3, color: "#C99BCB", endText: "~227.3" },
  { name: "Norian", start: 227.3, end: 205.7, color: "#D6AAD3", endText: "~205.7" },
  { name: "Rhaetian", start: 205.7, end: 201.4, color: "#D6AAD3", endText: "~201.4 ±0.2" },
  // Jurassic
  { name: "Hettangian", start: 201.4, end: 199.5, color: "#4EB3D3", endText: "199.5 ±0.3" },
  { name: "Sinemurian", start: 199.5, end: 192.9, color: "#67BCD8", endText: "192.9 ±0.3" },
  { name: "Pliensbachian", start: 192.9, end: 184.2, color: "#80C5DD", endText: "184.2 ±0.3" },
  { name: "Toarcian", start: 184.2, end: 174.7, color: "#99CEE3", endText: "174.7 ±0.8" },
  { name: "Aalenian", start: 174.7, end: 170.9, color: "#9AD9DD", endText: "170.9 ±0.8" },
  { name: "Bajocian", start: 170.9, end: 168.2, color: "#A6DDE0", endText: "168.2 ±1.2" },
  { name: "Bathonian", start: 168.2, end: 165.3, color: "#B3E2E3", endText: "165.3 ±1.1" },
  { name: "Callovian", start: 165.3, end: 161.5, color: "#BFE7E5", endText: "161.5 ±1.0" },
  { name: "Oxfordian", start: 161.5, end: 154.8, color: "#BFE7F1", endText: "154.8 ±0.8" },
  { name: "Kimmeridgian", start: 154.8, end: 149.2, color: "#CCECF4", endText: "149.2 ±0.7" },
  { name: "Tithonian", start: 149.2, end: 143.1, color: "#D9F1F7", endText: "143.1 ±0.6" },
  // Cretaceous
  { name: "Berriasian", start: 143.1, end: 137.05, color: "#8ed184", endText: "137.05 ±0.2" },
  { name: "Valanginian", start: 137.05, end: 132.6, color: "#9ad58d", endText: "132.6 ±0.6" },
  { name: "Hauterivian", start: 132.6, end: 125.77, color: "#a7d996", endText: "125.77" },
  { name: "Barremian", start: 125.77, end: 121.4, color: "#b4de9f", endText: "121.4 ±0.6" },
  { name: "Aptian", start: 121.4, end: 113.2, color: "#c1e2a8", endText: "113.2 ±0.3" },
  { name: "Albian", start: 113.2, end: 100.5, color: "#cee7b1", endText: "100.5 ±0.1" },
  { name: "Cenomanian", start: 100.5, end: 93.9, color: "#b8da7a", endText: "93.9 ±0.2" },
  { name: "Turonian", start: 93.9, end: 89.8, color: "#c5df83", endText: "89.8 ±0.3" },
  { name: "Coniacian", start: 89.8, end: 85.7, color: "#d2e38c", endText: "85.7 ±0.2" },
  { name: "Santonian", start: 85.7, end: 83.6, color: "#dfe895", endText: "83.6 ±0.2" },
  { name: "Campanian", start: 83.6, end: 72.2, color: "#ebec9e", endText: "72.2 ±0.2" },
  { name: "Maastrichtian", start: 72.2, end: 66.0, color: "#f9f1a8", endText: "66.00" },
];


/** Geological time node types for the nested era/period/epoch/age tree. */
export type GeologicalNodeType = "era" | "period" | "epoch" | "age";

export interface GeologicalNode {
  name: string;
  type?: GeologicalNodeType;
  end?: number;
  endText?: string;
  bgColor?: string;
  color?: string;
  contains?: GeologicalNode[];
}

/**
 * Build the nested Mesozoic geologic time tree
 * (era -> period -> epoch -> age), newest period first, newest age first
 * within each epoch — the shape rendered by the /mesozoic chart table.
 */
export function buildMesozoicTree(): GeologicalNode {
  const tree: GeologicalNode = {
    name: "Mesozoic",
    type: "era",
    end: MAX_MA,
    endText: "66.0 ±0.2",
    bgColor: "#67C5CA",
    color: "#000",
    contains: [],
  };
  const periods = [...PERIODS].reverse(); // newest -> oldest
  tree.contains = periods.map((p) => ({
    name: p.name,
    type: "period" as const,
    bgColor: p.color,
    color: p.name === "Cretaceous" ? "#000" : "#fff",
    contains: EPOCHS.filter((e) => e.period === p.name)
      .reverse()
      .map((e) => ({
        name: e.name,
        type: "epoch" as const,
        bgColor: e.color,
        color: "#000",
        contains: AGES.filter((a) => e.start >= a.start && e.end <= a.end)
          .reverse()
          .map((a) => ({
            name: a.name,
            type: "age" as const,
            bgColor: a.color,
            color: "#000",
            end: a.end,
            endText: a.endText,
          })),
      })),
  }));
  return tree;
}

/** Full Mesozoic span. */
export const MIN_MA = 252.17;
export const MAX_MA = 66.0;

/** Period containing a Ma value. */
export function periodForMa(ma: number | undefined): PeriodDef | undefined {
  if (ma === undefined) return undefined;
  // Inclusive bounds at shared boundaries mean both neighbours can match;
  // keep the most recent (youngest) containing period.
  let found: PeriodDef | undefined;
  for (const p of PERIODS) {
    if (ma <= p.start && ma >= p.end) found = p;
  }
  return found;
}

/** Epoch (Early/Middle/Late) containing a Ma value. */
export function epochForMa(ma: number | undefined): EpochDef | undefined {
  if (ma === undefined) return undefined;
  let found: EpochDef | undefined;
  for (const e of EPOCHS) {
    if (ma <= e.start && ma >= e.end) found = e;
  }
  return found;
}

/** Stage (age) containing a Ma value. */
export function ageForMa(ma: number | undefined): AgeDef | undefined {
  if (ma === undefined) return undefined;
  let found: AgeDef | undefined;
  for (const a of AGES) {
    if (ma <= a.start && ma >= a.end) found = a;
  }
  return found;
}

/** Dominant era/epoch label for a genus, e.g. "Late Cretaceous". */
export function eraLabelForMa(ma: number | undefined): string | undefined {
  const e = epochForMa(ma);
  if (!e) return undefined;
  return `${e.name} ${e.period}`;
}

/** CSS class for a period/era label, e.g. "Late Cretaceous" -> "era cretaceous late-cretaceous". */
export function eraClassForPeriod(label?: string | null): string {
  if (!label) return "era";
  const earlyMatch = label.match(/^(Late|Early|Middle)?\s*(Cretaceous|Jurassic|Triassic)$/i);
  if (!earlyMatch) return "era cretaceous";
  const [, prefix, period] = earlyMatch;
  const sub = prefix ? `${prefix.toLowerCase()}-${period.toLowerCase()}` : "";
  return `era ${period.toLowerCase()} ${sub}`.trim();
}

/** Colour for an epoch based on a Ma value. */
export function epochColorForMa(ma: number): string {
  const e = epochForMa(ma);
  if (e) return e.color;
  // Fallback by period colour, bounded to the Mesozoic span.
  if (ma >= MIN_MA && ma <= MAX_MA) {
    if (ma >= 201.4) return PERIODS[0].color;
    if (ma >= 143.1) return PERIODS[1].color;
    if (ma >= 66.0) return PERIODS[2].color;
  }
  return "#999";
}

/** Colour for an age (stage) based on a Ma value, falling back to epoch/period. */
export function ageColorForMa(ma: number): string {
  const a = ageForMa(ma);
  if (a) return a.color;
  const e = epochForMa(ma);
  if (e) return e.color;
  if (ma >= MIN_MA && ma <= MAX_MA) {
    if (ma >= 201.4) return PERIODS[0].color;
    if (ma >= 143.1) return PERIODS[1].color;
    if (ma >= 66.0) return PERIODS[2].color;
  }
  return "#999";
}

/** Period name from a Ma value (coarse classification). */
export function periodFromMa(ma: number | null | undefined): string {
  if (ma === null || ma === undefined || !Number.isFinite(ma)) return "Unknown";
  if (ma >= 201.4) return "Triassic";
  if (ma >= 143.1) return "Jurassic";
  if (ma >= 66.0) return "Cretaceous";
  if (ma >= 252.0) return "Permian";
  return "Cenozoic";
}

/** Period name from a PBDB interval label (e.g. "Late Cretaceous"). */
export function periodFromInterval(name: string | undefined): string | undefined {
  const n = (name ?? "").toLowerCase();
  if (n.includes("cretaceous")) return "Cretaceous";
  if (n.includes("jurassic")) return "Jurassic";
  if (n.includes("triassic")) return "Triassic";
  return undefined;
}
