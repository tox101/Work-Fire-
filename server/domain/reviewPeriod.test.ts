import { describe, expect, it } from "vitest";
import { formatReviewMonth, getMonthWindow, isSameMonth, shiftMonth, startOfMonth } from "../../client/src/lib/reviewPeriod";

describe("Review month period", () => {
  it("normalizes a selected month and moves across year boundaries", () => {
    const december = startOfMonth(new Date("2026-12-31T13:30:00.000Z"));
    const january = shiftMonth(december, 1);
    expect(getMonthWindow(december)).toEqual({ start: new Date("2026-12-01T00:00:00.000Z"), end: new Date("2027-01-01T00:00:00.000Z") });
    expect(january).toEqual(new Date("2027-01-01T00:00:00.000Z"));
  });

  it("formats the selected review month and identifies the current month boundary", () => {
    const august = new Date("2026-08-18T00:00:00.000Z");
    expect(formatReviewMonth(august)).toBe("2026년 8월");
    expect(isSameMonth(august, new Date("2026-08-01T00:00:00.000Z"))).toBe(true);
    expect(isSameMonth(august, new Date("2026-09-01T00:00:00.000Z"))).toBe(false);
  });
});
