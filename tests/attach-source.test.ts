import { describe, it, expect } from "vitest";
import { parseImageUrl, extensionForFormat, MAX_IMAGE_BYTES } from "../lib/images/attach-source";

describe("lib/images/attach-source", () => {
  it("accepts public http(s) image URLs", () => {
    expect(parseImageUrl("https://upload.wikimedia.org/wikipedia/commons/a/b/Foo.jpg")).toEqual({
      ok: true,
      url: "https://upload.wikimedia.org/wikipedia/commons/a/b/Foo.jpg",
    });
    expect(parseImageUrl("  http://example.org/x.png  ").ok).toBe(true);
  });

  it("rejects empty input", () => {
    expect(parseImageUrl("")).toMatchObject({ ok: false });
    expect(parseImageUrl("   ")).toMatchObject({ ok: false });
    expect(parseImageUrl(null)).toMatchObject({ ok: false });
  });

  it("rejects non-web protocols", () => {
    for (const bad of ["file:///etc/passwd", "ftp://example.org/x.jpg", "data:image/png;base64,AAA", "javascript:alert(1)"]) {
      expect(parseImageUrl(bad)).toMatchObject({ ok: false });
    }
  });

  it("rejects URLs with embedded credentials", () => {
    expect(parseImageUrl("https://user:pass@example.org/x.jpg")).toMatchObject({ ok: false });
  });

  it("refuses private and internal hosts", () => {
    for (const bad of [
      "http://localhost/x.jpg",
      "http://127.0.0.1/x.jpg",
      "http://10.1.2.3/x.jpg",
      "http://192.168.0.5/x.jpg",
      "http://172.16.0.1/x.jpg",
      "http://169.254.169.254/latest/meta-data",
      "http://[::1]/x.jpg",
      "http://metadata.internal/x.jpg",
    ]) {
      expect(parseImageUrl(bad)).toMatchObject({ ok: false });
    }
  });

  it("does not block ordinary domains that merely look like hex", () => {
    expect(parseImageUrl("https://fcbank.com/logo.png").ok).toBe(true);
    expect(parseImageUrl("https://fdic.gov/x.png").ok).toBe(true);
    // 172.32.x is public space even though it starts with 172.
    expect(parseImageUrl("http://172.32.0.1/x.jpg").ok).toBe(true);
  });

  it("maps decoded formats to extensions and refuses unsafe ones", () => {
    expect(extensionForFormat("jpeg")).toBe("jpg");
    expect(extensionForFormat("png")).toBe("png");
    expect(extensionForFormat("webp")).toBe("webp");
    expect(extensionForFormat("avif")).toBe("avif");
    expect(extensionForFormat("svg")).toBeNull();
    expect(extensionForFormat("gif")).toBeNull();
    expect(extensionForFormat(undefined)).toBeNull();
  });

  it("uses the same 5 MB cap as the CLI", () => {
    expect(MAX_IMAGE_BYTES).toBe(5 * 1024 * 1024);
  });
});
