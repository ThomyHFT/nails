import { describe, expect, it } from "vitest";
import { isValidInstagramHandle, normalizeInstagramHandle } from "@/server/domain/review/instagram-handle";

describe("normalizeInstagramHandle", () => {
  it("strips a leading @", () => {
    expect(normalizeInstagramHandle("@Camila")).toBe("camila");
  });

  it("lowercases a bare handle", () => {
    expect(normalizeInstagramHandle("camila")).toBe("camila");
  });

  it("strips a full instagram.com URL", () => {
    expect(normalizeInstagramHandle("https://instagram.com/camila")).toBe("camila");
    expect(normalizeInstagramHandle("instagram.com/camila")).toBe("camila");
    expect(normalizeInstagramHandle("https://www.instagram.com/camila/")).toBe("camila");
  });
});

describe("isValidInstagramHandle", () => {
  it("accepts letters, numbers, dot and underscore up to 30 characters", () => {
    expect(isValidInstagramHandle("camila.r_02")).toBe(true);
  });

  it("rejects invalid characters", () => {
    expect(isValidInstagramHandle("camila r!")).toBe(false);
  });

  it("rejects handles longer than 30 characters", () => {
    expect(isValidInstagramHandle("a".repeat(31))).toBe(false);
  });

  it("rejects an empty handle", () => {
    expect(isValidInstagramHandle("")).toBe(false);
  });
});
