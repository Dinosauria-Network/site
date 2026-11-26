import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getSafeBaseUrl, warnOnHostMismatch } from "../lib/supabase/base-url";

/**
 * Regression cover for the live auth failure: the site serves from
 * www.dinosauria.net while NEXT_PUBLIC_SITE_URL was the apex, and the callback
 * redirected to the apex. Supabase session cookies are host-only, so the
 * redirect silently dropped the session that had just been written and every
 * admin request came back as "no auth cookie".
 *
 * Rule under test: the request's own host always wins over the env var.
 */

const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
const originalVercelUrl = process.env.VERCEL_URL;

function req(headers: Record<string, string>, url = "https://www.dinosauria.net/auth/callback") {
  return { url, headers: new Headers(headers) };
}

beforeEach(() => {
  delete process.env.NEXT_PUBLIC_SITE_URL;
  delete process.env.VERCEL_URL;
});

afterEach(() => {
  if (originalSiteUrl === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
  else process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;
  if (originalVercelUrl === undefined) delete process.env.VERCEL_URL;
  else process.env.VERCEL_URL = originalVercelUrl;
});

describe("getSafeBaseUrl", () => {
  it("keeps the request host when the env var names a different host", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://dinosauria.net";
    expect(
      getSafeBaseUrl(
        req({
          host: "www.dinosauria.net",
          "x-forwarded-host": "www.dinosauria.net",
          "x-forwarded-proto": "https",
        })
      )
    ).toBe("https://www.dinosauria.net");
  });

  it("prefers x-forwarded-host over host", () => {
    expect(
      getSafeBaseUrl(
        req({
          host: "internal:3000",
          "x-forwarded-host": "www.dinosauria.net",
          "x-forwarded-proto": "https",
        })
      )
    ).toBe("https://www.dinosauria.net");
  });

  it("takes the first entry of a comma-separated forwarded header", () => {
    expect(
      getSafeBaseUrl(
        req({
          "x-forwarded-host": "www.dinosauria.net, proxy.internal",
          "x-forwarded-proto": "https, http",
        })
      )
    ).toBe("https://www.dinosauria.net");
  });

  it("uses http for localhost and keeps the port", () => {
    expect(getSafeBaseUrl(req({ host: "localhost:3000" }))).toBe(
      "http://localhost:3000"
    );
  });

  it("falls back to NEXT_PUBLIC_SITE_URL when there is no host header", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://dinosauria.net/";
    expect(getSafeBaseUrl(req({}))).toBe("https://dinosauria.net");
  });

  it("falls back to the request origin when nothing else is available", () => {
    expect(getSafeBaseUrl(req({}, "https://example.org/a/b"))).toBe(
      "https://example.org"
    );
  });

  it("falls back to VERCEL_URL, then localhost", () => {
    process.env.VERCEL_URL = "site-abc.vercel.app";
    expect(getSafeBaseUrl(req({}, "not a url"))).toBe(
      "https://site-abc.vercel.app"
    );

    delete process.env.VERCEL_URL;
    expect(getSafeBaseUrl(req({}, "not a url"))).toBe("http://localhost:3000");
  });
});

describe("warnOnHostMismatch", () => {
  it("reports a mismatch between the configured host and the request host", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://dinosauria.net";
    const message = warnOnHostMismatch(req({ host: "www.dinosauria.net" }));
    expect(message).toContain("dinosauria.net");
    expect(message).toContain("www.dinosauria.net");
  });

  it("stays quiet when they agree", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://www.dinosauria.net";
    expect(warnOnHostMismatch(req({ host: "www.dinosauria.net" }))).toBeNull();
  });

  it("stays quiet when the env var is unset", () => {
    expect(warnOnHostMismatch(req({ host: "www.dinosauria.net" }))).toBeNull();
  });
});
