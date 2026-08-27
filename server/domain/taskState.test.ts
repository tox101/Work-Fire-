import { describe, expect, it } from "vitest";
import { deriveTaskStateChange } from "./taskState";

describe("deriveTaskStateChange", () => {
  const now = new Date("2026-08-26T00:00:00.000Z");

  it("records actual start time only when work begins", () => {
    const result = deriveTaskStateChange({ currentStatus: "planned", targetStatus: "in_progress", currentStartedAt: null, now });
    expect(result.eventType).toBe("started");
    expect(result.values).toMatchObject({ status: "in_progress", startedAt: now });
  });

  it("records completion and clears it again when a completed task is reopened", () => {
    const completed = deriveTaskStateChange({ currentStatus: "in_progress", targetStatus: "done", currentStartedAt: now, now });
    const reopened = deriveTaskStateChange({ currentStatus: "done", targetStatus: "planned", currentStartedAt: now, now });
    expect(completed.values).toMatchObject({ status: "done", completedAt: now });
    expect(reopened.values).toMatchObject({ status: "planned", completedAt: null });
  });

  it("keeps the task on hold without changing a recorded start time", () => {
    const result = deriveTaskStateChange({ currentStatus: "in_progress", targetStatus: "on_hold", currentStartedAt: now, nextAction: "다음 자료 확인", now });
    expect(result.eventType).toBe("on_hold");
    expect(result.values).toEqual({ status: "on_hold", nextAction: "다음 자료 확인" });
  });
});
