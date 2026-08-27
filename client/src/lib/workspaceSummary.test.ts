import { describe, expect, it } from "vitest";
import { getProjectProgress, getSuggestedTask } from "./workspaceSummary";

const tasks = [
  { id: 1, projectId: 10, status: "planned", title: "계획 작업", nextAction: "초안 작성" },
  { id: 2, projectId: 10, status: "done", title: "완료 작업", nextAction: null },
  { id: 3, projectId: 10, status: "cancelled", title: "보관 작업", nextAction: null },
  { id: 4, projectId: 20, status: "in_progress", title: "진행 작업", nextAction: "계속" },
];

describe("workspace summary", () => {
  it("prioritizes an in-progress task before planned work", () => {
    expect(getSuggestedTask(tasks)).toMatchObject({ id: 4, status: "in_progress" });
  });

  it("calculates progress without cancelled Tasks and counts today-linked Tasks", () => {
    expect(getProjectProgress(10, tasks, new Set([1, 3]))).toEqual({
      total: 2,
      completed: 1,
      percent: 50,
      todayTaskCount: 1,
    });
  });
});
