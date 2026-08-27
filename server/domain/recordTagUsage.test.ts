import { describe, expect, it } from "vitest";
import { orderRecordTagUsageStats } from "./recordTagUsage";

describe("orderRecordTagUsageStats", () => {
  it("puts the most recently used tag first, then usage count and Korean tag name", () => {
    const ordered = orderRecordTagUsageStats([
      { tag: "회고", usageCount: 4, lastUsedAt: new Date("2026-08-01T09:00:00Z") },
      { tag: "계획", usageCount: 2, lastUsedAt: new Date("2026-08-02T09:00:00Z") },
      { tag: "검토", usageCount: 1, lastUsedAt: new Date("2026-08-02T09:00:00Z") },
    ]);

    expect(ordered.map(item => item.tag)).toEqual(["계획", "검토", "회고"]);
  });
});
