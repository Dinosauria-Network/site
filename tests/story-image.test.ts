import { describe, it, expect } from "vitest";
import path from "node:path";
import { readStoryImage } from "../lib/admin/story-image";

// A file that is guaranteed to exist in the repo's public/ tree.
const EXISTING = "/images/news/cortical-bone-geometry-and-static-gravitational-loads-in-neosauropod-d.jpg";

describe("lib/admin/story-image", () => {
  it("returns none when body.image is absent", () => {
    expect(readStoryImage(null)).toEqual({ src: null, referenced: null, status: "none" });
    expect(readStoryImage({})).toEqual({ src: null, referenced: null, status: "none" });
    expect(readStoryImage({ image: "   " })).toEqual({ src: null, referenced: null, status: "none" });
  });

  it("accepts a local path whose file exists", () => {
    const r = readStoryImage({ image: EXISTING });
    expect(r.status).toBe("ok");
    expect(r.src).toBe(EXISTING);
    expect(r.referenced).toBe(EXISTING);
  });

  it("flags a local path with no file on disk as missing", () => {
    const r = readStoryImage({ image: "/images/news/definitely-not-a-real-file-xyz.png" });
    expect(r.status).toBe("missing");
    expect(r.src).toBeNull();
    expect(r.referenced).toBe("/images/news/definitely-not-a-real-file-xyz.png");
  });

  it("never previews remote publisher URLs", () => {
    const r = readStoryImage({ image: "https://media.springernature.com/m685/foo.png" });
    expect(r.status).toBe("missing");
    expect(r.src).toBeNull();
    expect(r.referenced).toBe("https://media.springernature.com/m685/foo.png");
  });

  it("refuses paths that escape public/", () => {
    const escaped = "/images/../../etc/passwd";
    const r = readStoryImage({ image: escaped });
    expect(r.src).toBeNull();
    expect(r.status).toBe("missing");
    // Sanity: the resolver never hands back a path outside public/.
    expect(r.src ?? "").not.toContain(path.sep + "..");
  });
});
