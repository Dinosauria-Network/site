import { describe, it, expect, beforeEach } from "vitest";
import { computeBoost, clearBoostCache } from "../lib/editorial/boost";

describe("lib/editorial/boost", () => {
  beforeEach(() => clearBoostCache());

  it("boosts when the term appears in the title", () => {
    const r = computeBoost("A Maastrichtian dinosaur fauna", "", 0.407);
    expect(r.boosts).toEqual(["Maastrichtian +0.15"]);
    expect(r.effectiveScore).toBeCloseTo(0.557, 3);
  });

  it("boosts when the term appears in the abstract (title+abstract scope)", () => {
    const r = computeBoost("Some paper", "from the Maastrichtian of Patagonia", 0.407);
    expect(r.boosts).toEqual(["Maastrichtian +0.15"]);
    expect(r.effectiveScore).toBeCloseTo(0.557, 3);
  });

  it("does not boost when the term is absent", () => {
    const r = computeBoost("A Jurassic sauropod", "from the Morrison Formation", 0.407);
    expect(r.boosts).toEqual([]);
    expect(r.effectiveScore).toBe(0.407);
  });

  it("is case-insensitive", () => {
    const r = computeBoost("maastrichtian climate", "", 0.4);
    expect(r.boosts).toHaveLength(1);
  });

  it("caps effective score at 1.0", () => {
    const r = computeBoost("Maastrichtian fauna", "", 0.95);
    expect(r.effectiveScore).toBe(1.0);
  });

  it("never lowers the raw score", () => {
    const r = computeBoost("Unrelated paper", "", 0.6);
    expect(r.effectiveScore).toBeGreaterThanOrEqual(0.6);
  });
});
