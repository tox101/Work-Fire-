import { describe, expect, it } from "vitest";
import { getProjectNextStage, getProjectProgress, getStageGuide, getSuggestedTask } from "../../client/src/lib/workspaceSummary";

const tasks = [
  { id: 1, projectId: 10, status: "planned", title: "계획 작업", nextAction: "초안 작성" },
  { id: 2, projectId: 10, status: "done", title: "완료 작업", nextAction: null },
  { id: 3, projectId: 10, status: "cancelled", title: "보관 작업", nextAction: null },
  { id: 4, projectId: 20, status: "in_progress", title: "진행 작업", nextAction: "계속" },
];

describe("workspace summary", () => {
  it("prioritizes in-progress work for the Today suggestion", () => {
    expect(getSuggestedTask(tasks)).toMatchObject({ id: 4, status: "in_progress" });
  });

  it("excludes cancelled Tasks from progress and counts today-linked Tasks", () => {
    expect(getProjectProgress(10, tasks, new Set([1, 3]))).toEqual({
      total: 2,
      completed: 1,
      percent: 50,
      todayTaskCount: 1,
    });
  });

  it("suggests completing a Stage only after its active Tasks are done", () => {
    expect(getStageGuide("active", [{ status: "done" }, { status: "done" }])).toEqual({ message: "모든 Task 완료 · Stage 완료 처리", canComplete: true });
    expect(getStageGuide("active", [{ status: "planned" }])).toEqual({ message: "다음 진행: 남은 Task 1개", canComplete: false });
  });

  it("selects the first active Stage as the Project's next Stage", () => {
    const stages = [{ id: 1, title: "기획", status: "done" }, { id: 2, title: "구현", status: "active" }];
    expect(getProjectNextStage(stages, new Map([[2, [{ status: "planned" }]]]))).toEqual({ stage: stages[1], message: "다음 진행: 남은 Task 1개", canComplete: false });
  });
});
