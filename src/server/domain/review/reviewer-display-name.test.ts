import { describe, expect, it } from "vitest";
import { reviewerDisplayName } from "@/server/domain/review/reviewer-display-name";

describe("reviewerDisplayName", () => {
  it("keeps the first name and initials the last one", () => {
    expect(reviewerDisplayName("Camila Rodríguez")).toBe("Camila R.");
  });

  it("uses only the last word for the initial when there are middle names", () => {
    expect(reviewerDisplayName("Camila Andrea Rodríguez")).toBe("Camila R.");
  });

  it("returns the name as-is when there is only one word", () => {
    expect(reviewerDisplayName("Camila")).toBe("Camila");
  });
});
