import { describe, expect, it } from "vitest";
import { filterActiveWorkspaceItems } from "./workspaceActiveItems";

describe("filterActiveWorkspaceItems", () => {
  it("보관된 Project의 잔여 Stage·Task와 취소 Task를 활성 선택지에서 제외한다", () => {
    const filtered = filterActiveWorkspaceItems(
      [{ id: 1, status: "active" }, { id: 2, status: "archived" }],
      [
        { id: 11, projectId: 1, status: "active" },
        { id: 12, projectId: 1, status: "archived" },
        { id: 21, projectId: 2, status: "active" },
      ],
      [
        { id: 101, projectId: 1, stageId: null, status: "planned" },
        { id: 102, projectId: 1, stageId: 11, status: "in_progress" },
        { id: 103, projectId: null, stageId: null, status: "inbox" },
        { id: 104, projectId: 2, stageId: null, status: "planned" },
        { id: 105, projectId: 2, stageId: 21, status: "planned" },
        { id: 106, projectId: 1, stageId: 12, status: "planned" },
        { id: 107, projectId: 1, stageId: null, status: "cancelled" },
      ],
    );

    expect(filtered.projects.map(item => item.id)).toEqual([1]);
    expect(filtered.stages.map(item => item.id)).toEqual([11]);
    expect(filtered.tasks.map(item => item.id)).toEqual([101, 102, 103]);
  });
});
