import { describe, it, expect } from "vitest";
import { parseSinceArg, normalizeCrossrefRecord, normalizeAuthor } from "../lib/ingestion/crossref-adapter";
import { decodeEntities } from "../lib/ingestion/rss";
import { parseArxivAuthors } from "../lib/ingestion/arxiv";

describe("parseSinceArg", () => {
  it("defaults to 3 days ago", () => {
    const r = parseSinceArg([]);
    expect(r).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
  it("parses YYYY-MM-DD", () => {
    expect(parseSinceArg(["--since", "2026-11-20"])).toBe("2026-11-20");
  });
  it("parses YYYY-MM", () => {
    expect(parseSinceArg(["--since", "2026-11"])).toBe("2026-11-01");
  });
  it("parses YYYY", () => {
    expect(parseSinceArg(["--since", "2026"])).toBe("2026-01-01");
  });
  it("returns undefined for --since all", () => {
    expect(parseSinceArg(["--since", "all"])).toBeUndefined();
  });
  it("throws on invalid input", () => {
    expect(() => parseSinceArg(["--since", "nope"])).toThrow();
  });
});

describe("normalizeAuthor", () => {
  it("joins given + family", () => {
    expect(normalizeAuthor({ given: "Jane", family: "Doe" })).toEqual({ fullName: "Jane Doe", orcid: undefined, institution: undefined });
  });
  it("keeps ORCID", () => {
    expect(normalizeAuthor({ given: "Jane", family: "Doe", ORCID: "0000-0001" })).toMatchObject({ orcid: "0000-0001" });
  });
  it("falls back to name", () => {
    expect(normalizeAuthor({ name: "Acme Corp" })).toEqual({ fullName: "Acme Corp", orcid: undefined, institution: undefined });
  });
  it("returns Unknown for empty", () => {
    expect(normalizeAuthor({})).toEqual({ fullName: "Unknown", orcid: undefined, institution: undefined });
  });
});

describe("normalizeCrossrefRecord", () => {
  it("normalizes a minimal work item", () => {
    const r = normalizeCrossrefRecord({ DOI: "10.1/x", title: ["A paper"], type: "journal-article", publisher: "P" });
    expect(r.doi).toBe("10.1/x");
    expect(r.title).toBe("A paper");
    expect(r.peerReviewStatus).toBe("peer_reviewed");
    expect(r.publisher).toBe("P");
  });
  it("strips tags from title", () => {
    const r = normalizeCrossrefRecord({ DOI: "10.1/y", title: ["<i>Title</i>"], type: "journal-article" });
    expect(r.title).toBe("Title");
  });
  it("handles preprint type", () => {
    const r = normalizeCrossrefRecord({ DOI: "10.1/z", title: ["Preprint"], type: "preprint" });
    expect(r.peerReviewStatus).toBe("preprint");
  });
});

describe("decodeEntities", () => {
  it("decodes numeric and named entities", () => {
    expect(decodeEntities("B&#45;12 &amp; &lt;x&gt;")).toBe("B-12 & <x>");
  });
  it("decodes hex entities", () => {
    expect(decodeEntities("&#x26;")).toBe("&");
  });
});

describe("parseArxivAuthors", () => {
  it("extracts multiple author names", () => {
    const xml = `<entry><author><name>Alice Smith</name></author><author><name>Bob Jones</name></author></entry>`;
    expect(parseArxivAuthors(xml)).toEqual([{ fullName: "Alice Smith" }, { fullName: "Bob Jones" }]);
  });
  it("returns empty for no authors", () => {
    expect(parseArxivAuthors("<entry></entry>")).toEqual([]);
  });
});
