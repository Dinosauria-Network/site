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

/** Full Mesozoic span. */
export const MIN_MA = 252.17;
export const MAX_MA = 66.0;

/** Period containing a Ma value. */
export function periodForMa(ma: number | undefined): PeriodDef | undefined {
  if (ma === undefined) return undefined;
  return PERIODS.find((p) => ma <= p.start && ma >= p.end);
}

/** Epoch (Early/Middle/Late) containing a Ma value. */
export function epochForMa(ma: number | undefined): EpochDef | undefined {
  if (ma === undefined) return undefined;
  return EPOCHS.find((e) => ma <= e.start && ma >= e.end);
}

/** Stage (age) containing a Ma value. */
export function ageForMa(ma: number | undefined): AgeDef | undefined {
  if (ma === undefined) return undefined;
  return AGES.find((a) => ma <= a.start && ma >= a.end);
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
  const sub = prefix ? `${prefix}-${period.toLowerCase()}` : "";
  return `era ${period.toLowerCase()} ${sub}`.trim();
}

/** Colour for an epoch based on a Ma value. */
export function epochColorForMa(ma: number): string {
  const e = epochForMa(ma);
  if (e) return e.color;
  if (ma >= 201.4) return PERIODS[0].color;
  if (ma >= 143.1) return PERIODS[1].color;
  if (ma >= 66.0) return PERIODS[2].color;
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
