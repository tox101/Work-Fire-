import { describe, expect, it } from "vitest";
import { buildMonthlyReview } from "./monthlyReview";

describe("monthly Review summary", () => {
  it("keeps monthly counts and computes each active Project's progress and next action", () => {
    expect(buildMonthlyReview({
      completedTasks: [
        { projectId: 1, startedAt: new Date("2026-08-03T09:00:00.000Z"), completedAt: new Date("2026-08-03T10:30:00.000Z") },
        { projectId: 2, startedAt: new Date("2026-08-04T13:00:00.000Z"), completedAt: new Date("2026-08-04T13:45:00.000Z") },
        { projectId: 1, startedAt: null, completedAt: new Date("2026-08-05T10:00:00.000Z") },
        { projectId: 1, startedAt: new Date("2026-08-06T12:00:00.000Z"), completedAt: new Date("2026-08-06T11:30:00.000Z") },
        { projectId: 3, startedAt: new Date("2026-08-07T09:00:00.000Z"), completedAt: new Date("2026-08-07T09:30:00.000Z") },
        { projectId: null, startedAt: new Date("2026-08-08T10:00:00.000Z"), completedAt: new Date("2026-08-08T10:20:00.000Z") },
      ],
      recordCount: 9,
      completedScheduleCount: 3,
      completedTaskDetails: [
        { id: 31, title: "Review 카드 구현", projectId: 1, projectTitle: "개인 OS", stageTitle: "Review", nextAction: "변화 확인", startedAt: new Date("2026-08-03T09:00:00.000Z"), completedAt: new Date("2026-08-03T10:30:00.000Z"), records: [{ id: 71, content: "완료 근거 기록", attachments: [{ id: 81, fileName: "review.png", url: "https://example.com/review.png", mimeType: "image/png" }] }] },
        { id: 32, title: "독립 정리", projectId: null, projectTitle: null, stageTitle: null, nextAction: null, startedAt: null, completedAt: new Date("2026-08-04T11:00:00.000Z") },
      ],
      previousCompletedTasks: [
        { projectId: 1, startedAt: new Date("2026-07-03T09:00:00.000Z"), completedAt: new Date("2026-07-03T09:30:00.000Z") },
        { projectId: 2, startedAt: new Date("2026-07-04T09:00:00.000Z"), completedAt: new Date("2026-07-04T10:00:00.000Z") },
        { projectId: null, startedAt: null, completedAt: new Date("2026-07-04T09:00:00.000Z") },
      ],
      previousRecordCount: 6,
      activeProjects: [{ id: 1, title: "개인 OS" }, { id: 2, title: "학습" }],
      allProjects: [{ id: 1, title: "개인 OS" }, { id: 2, title: "학습" }, { id: 3, title: "보관된 Project" }],
      tasks: [
        { projectId: 1, status: "done", nextAction: null },
        { projectId: 1, status: "planned", nextAction: "초안 작성" },
        { projectId: 1, status: "in_progress", nextAction: "핵심 화면 마무리" },
        { projectId: 1, status: "cancelled", nextAction: "제외" },
        { projectId: 2, status: "done", nextAction: null },
      ],
    })).toEqual({
      completedTaskCount: 6,
      recordCount: 9,
      completedScheduleCount: 3,
      durationSummary: { trackedTaskCount: 4, totalMinutes: 185, averageMinutes: 46 },
      comparison: {
        previous: { completedTaskCount: 3, recordCount: 6, totalMinutes: 90 },
        change: { completedTaskCount: 3, recordCount: 3, totalMinutes: 95 },
      },
      projectTimeDistribution: [
        { projectId: 1, title: "개인 OS", totalMinutes: 90, trackedTaskCount: 1, sharePercent: 55 },
        { projectId: 2, title: "학습", totalMinutes: 45, trackedTaskCount: 1, sharePercent: 27 },
        { projectId: 3, title: "보관된 Project", totalMinutes: 30, trackedTaskCount: 1, sharePercent: 18 },
      ],
      projectTimeComparison: [
        { projectId: 1, title: "개인 OS", totalMinutes: 90, trackedTaskCount: 1, previousTotalMinutes: 30, previousTrackedTaskCount: 1, changeMinutes: 60 },
        { projectId: 3, title: "보관된 Project", totalMinutes: 30, trackedTaskCount: 1, previousTotalMinutes: 0, previousTrackedTaskCount: 0, changeMinutes: 30 },
        { projectId: 2, title: "학습", totalMinutes: 45, trackedTaskCount: 1, previousTotalMinutes: 60, previousTrackedTaskCount: 1, changeMinutes: -15 },
      ],
      completedTaskDetails: [
        { id: 32, title: "독립 정리", projectTitle: null, stageTitle: null, nextAction: null, completedAt: new Date("2026-08-04T11:00:00.000Z"), durationMinutes: null, records: [] },
        { id: 31, title: "Review 카드 구현", projectTitle: "개인 OS", stageTitle: "Review", nextAction: "변화 확인", completedAt: new Date("2026-08-03T10:30:00.000Z"), durationMinutes: 90, records: [{ id: 71, content: "완료 근거 기록", attachments: [{ id: 81, fileName: "review.png", url: "https://example.com/review.png", mimeType: "image/png" }] }] },
      ],
      unassignedDurationSummary: { trackedTaskCount: 1, totalMinutes: 20, averageMinutes: 20 },
      activeProjects: [
        { id: 1, title: "개인 OS", completedTaskCount: 1, totalTaskCount: 3, nextAction: "핵심 화면 마무리" },
        { id: 2, title: "학습", completedTaskCount: 1, totalTaskCount: 1, nextAction: null },
      ],
    });
  });
});
