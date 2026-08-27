import { describe, expect, it } from "vitest";
import { getWeeklyChange } from "./weeklyComparison";

describe("weekly comparison", () => {
  it("returns positive, negative, and unchanged metric deltas", () => {
    expect(getWeeklyChange(
      { completedTaskCount: 5, recordCount: 2, completedScheduleCount: 4 },
      { completedTaskCount: 3, recordCount: 4, completedScheduleCount: 4 },
    )).toEqual({ completedTaskCount: 2, recordCount: -2, completedScheduleCount: 0 });
  });
});
