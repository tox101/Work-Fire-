import { describe, expect, it } from "vitest";
import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/context";

function anonymousContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("workspace router access control", () => {
  it("protects project, task, schedule, record, attachment, history, and Continue data", async () => {
    const workspace = appRouter.createCaller(anonymousContext()).workspace;
    const day = new Date("2026-08-26T00:00:00.000Z");

    const requests = [
      workspace.overview({ start: day, end: new Date("2026-08-27T00:00:00.000Z") }),
      workspace.continue(),
      workspace.createProject({ title: "비공개 Project" }),
      workspace.createStage({ projectId: 1, title: "비공개 Stage" }),
      workspace.createTask({ title: "비공개 Task" }),
      workspace.setTaskStatus({ id: 1, status: "done" }),
      workspace.createSchedule({ title: "비공개 일정" }),
      workspace.updateSchedule({ id: 1, title: "변경" }),
      workspace.captureRecord({ content: "비공개 기록" }),
      workspace.uploadAttachment({ recordId: 1, fileName: "private.txt", mimeType: "text/plain", base64Data: "cHJpdmF0ZQ==" }),
      workspace.taskHistory({ taskId: 1 }),
    ];

    for (const request of requests) {
      await expect(request).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    }
  });
});
