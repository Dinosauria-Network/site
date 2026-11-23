import { describe, it, expect } from "vitest";
import {
  AGES,
  buildMesozoicTree,
  EPOCHS,
  MAX_MA,
  MIN_MA,
  PERIODS,
  ageColorForMa,
  ageForMa,
  colorForAgeRange,
  eraClassForPeriod,
  eraLabelForMa,
  epochColorForMa,
  epochForMa,
  periodForMa,
  periodFromInterval,
  periodFromMa,
} from "../lib/geologic-time";
import { getGenusPeriodLabel } from "../lib/genus-data";

describe("lib/geologic-time — periods", () => {
  it("exposes the three Mesozoic periods with expected bounds", () => {
    expect(PERIODS.map((p) => p.name)).toEqual(["Triassic", "Jurassic", "Cretaceous"]);
    expect(PERIODS[0]).toMatchObject({ start: 252.17, end: 201.4 });
    expect(PERIODS[1]).toMatchObject({ start: 201.4, end: 143.1 });
    expect(PERIODS[2]).toMatchObject({ start: 143.1, end: 66.0 });
  });

  it("finds the period containing a Ma value", () => {
    expect(periodForMa(252.17)?.name).toBe("Triassic");
    expect(periodForMa(201.4)?.name).toBe("Jurassic");
    expect(periodForMa(143.1)?.name).toBe("Cretaceous"); // boundary belongs to the younger period
    expect(periodForMa(100.5)?.name).toBe("Cretaceous");
    expect(periodForMa(66.0)?.name).toBe("Cretaceous");
    expect(periodForMa(undefined)).toBeUndefined();
  });
});

describe("lib/geologic-time — epochs", () => {
  it("finds the epoch (Early/Middle/Late) containing a Ma value", () => {
    expect(epochForMa(252.17)?.name).toBe("Early");
    expect(epochForMa(247.0)?.name).toBe("Middle");
    expect(epochForMa(237.0)?.name).toBe("Late");
    expect(epochForMa(143.1)?.name).toBe("Early");
    expect(epochForMa(100.5)?.name).toBe("Late");
    expect(epochForMa(66.0)?.name).toBe("Late");
    expect(epochForMa(undefined)).toBeUndefined();
  });

  it("derives the era label, e.g. Late Cretaceous", () => {
    expect(eraLabelForMa(72.2)).toBe("Late Cretaceous");
    expect(eraLabelForMa(143.1)).toBe("Early Cretaceous"); // boundary belongs to the younger epoch
  });

  it("returns an epoch colour for known and unknown Ma values", () => {
    expect(epochColorForMa(83.6)).toBeDefined();
    expect(epochColorForMa(252.17)).toBeDefined();
    expect(epochColorForMa(100.5)).toBeDefined();
    expect(epochColorForMa(300)).toBe("#999"); // outside Mesozoic -> fallback
  });
});

describe("lib/geologic-time — ages (stages)", () => {
  it("finds the age (stage) containing a Ma value", () => {
    expect(ageForMa(83.6)?.name).toBe("Campanian");
    expect(ageForMa(85.7)?.name).toBe("Santonian");
    expect(ageForMa(89.8)?.name).toBe("Coniacian"); // boundary belongs to the younger stage
    expect(ageForMa(72.2)?.name).toBe("Maastrichtian");
    expect(ageForMa(252.17)?.name).toBe("Induan");
    expect(ageForMa(undefined)).toBeUndefined();
  });

  it("exposes the expected stage set", () => {
    const names = AGES.map((a) => a.name);
    expect(names).toContain("Campanian");
    expect(names).toContain("Maastrichtian");
    expect(names).toContain("Norian");
  });
});

describe("lib/geologic-time — age colour", () => {
  it("colours an age by its stage colour", () => {
    // Campanian colour
    expect(ageColorForMa(80)).toBe("#ebec9e");
    // Maastrichtian colour
    expect(ageColorForMa(70)).toBe("#f9f1a8");
    // Fallback for out-of-range
    expect(ageColorForMa(300)).toBe("#999");
  });
});

describe("lib/geologic-time — colorForAgeRange", () => {
  it("uses stage colour when the range fits one stage", () => {
    // Campanian range
    expect(colorForAgeRange(72.2, 83.6)).toBe("#ebec9e");
    // Single precise point
    expect(colorForAgeRange(77.9, 77.9)).toBe("#ebec9e");
  });
  it("falls back to epoch colour for coarse ranges", () => {
    // Spans multiple stages -> Late Cretaceous epoch colour
    expect(colorForAgeRange(66, 83.6)).toBe("#abd671");
    expect(colorForAgeRange(83.6, 89.8)).toBe("#abd671");
    expect(colorForAgeRange(66, 100.5)).toBe("#abd671");
  });
});

describe("lib/geologic-time — period classification helpers", () => {
  it("classifies periods from a Ma value", () => {
    expect(periodFromMa(252.17)).toBe("Triassic");
    expect(periodFromMa(150)).toBe("Jurassic");
    expect(periodFromMa(80)).toBe("Cretaceous");
    expect(periodFromMa(null)).toBe("Unknown");
    expect(periodFromMa(undefined)).toBe("Unknown");
  });

  it("classifies periods from a PBDB interval name", () => {
    expect(periodFromInterval("Late Cretaceous")).toBe("Cretaceous");
    expect(periodFromInterval("Middle Jurassic")).toBe("Jurassic");
    expect(periodFromInterval("Early Triassic")).toBe("Triassic");
    expect(periodFromInterval(undefined)).toBeUndefined();
  });

  it("maps era labels to CSS classes", () => {
    expect(eraClassForPeriod("Late Cretaceous")).toBe("era cretaceous late-cretaceous");
    expect(eraClassForPeriod("Middle Jurassic")).toBe("era jurassic middle-jurassic");
    expect(eraClassForPeriod(undefined)).toBe("era");
  });
});

describe("lib/geologic-time — full span", () => {
  it("exposes the full Mesozoic span", () => {
    expect(MIN_MA).toBe(252.17);
    expect(MAX_MA).toBe(66.0);
  });
});

describe("lib/genus-data — getGenusPeriodLabel", () => {
  it("derives the period label from fossil locations", () => {
    const genus = {
      meta: {
        fossilLocations: [
          { lat: 44, lng: 103, country: "Mongolia", count: 4, period: "Cretaceous", minMa: 72.2, maxMa: 83.6 },
        ],
      },
    };
    expect(getGenusPeriodLabel(genus as never)).toBe("Late Cretaceous");
  });

  it("falls back to the taxonomy name when no locations exist", () => {
    const genus = {
      taxonomy: [{ name: "Triceratops", taxonomy: "geological_time" }],
    };
    expect(getGenusPeriodLabel(genus as never)).toBe("Triceratops");
  });
});

describe("lib/geologic-time — buildMesozoicTree", () => {
  it("builds the nested era -> period -> epoch -> age tree", () => {
    const tree = buildMesozoicTree();
    expect(tree.name).toBe("Mesozoic");
    expect(tree.type).toBe("era");
    expect(tree.contains).toHaveLength(3);
    const [cretaceous, jurassic, triassic] = tree.contains ?? [];
    expect(cretaceous?.name).toBe("Cretaceous");
    expect(jurassic?.name).toBe("Jurassic");
    expect(triassic?.name).toBe("Triassic");
  });

  it("nests periods -> epochs -> ages with newest entries first", () => {
    const tree = buildMesozoicTree();
    const cretaceous = tree.contains?.[0];
    expect(cretaceous?.type).toBe("period");
    const late = cretaceous?.contains?.[0];
    expect(late?.name).toBe("Late");
    expect(late?.type).toBe("epoch");
    const ages = late?.contains ?? [];
    expect(ages).toHaveLength(6);
    expect(ages[0]?.name).toBe("Maastrichtian");
    expect(ages[0]?.type).toBe("age");
    expect(ages[0]?.end).toBe(66);
    expect(ages[0]?.endText).toBe("66.00");
  });
});
