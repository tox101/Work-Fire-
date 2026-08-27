import { describe, expect, it } from "vitest";
import { formatRecordsCsv, formatWorkspaceMarkdown } from "../../client/src/lib/workspaceExport";

const data = { exportedAt: new Date("2026-08-27T00:00:00.000Z"), projects: [{ id: 1, title: "개인 OS", description: null, status: "active", createdAt: new Date("2026-08-01T00:00:00.000Z") }], stages: [{ id: 2, projectId: 1, title: "기록", status: "active", createdAt: new Date("2026-08-01T00:00:00.000Z") }], tasks: [{ id: 3, projectId: 1, stageId: 2, title: "원문 보존", detail: null, nextAction: "기록", status: "planned", priority: "normal", createdAt: new Date("2026-08-01T00:00:00.000Z") }], records: [{ id: 4, projectId: 1, stageId: 2, taskId: 3, content: "줄바꿈\n\"따옴표\"", sourceType: "capture", recordKind: "linked", isPinned: false, createdAt: new Date("2026-08-27T00:00:00.000Z"), tags: ["원문"] }] };

describe("Workspace export", () => {
  it("preserves original Record text and links in Markdown and CSV", () => {
    expect(formatWorkspaceMarkdown(data)).toContain("줄바꿈\n\"따옴표\"");
    expect(formatWorkspaceMarkdown(data)).toContain("#원문");
    expect(formatRecordsCsv(data)).toContain('"줄바꿈\n""따옴표"""');
    expect(formatRecordsCsv(data)).toContain('"개인 OS"');
  });
});
