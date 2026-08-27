import { beforeEach, describe, expect, it, vi } from "vitest";

const { getDb, getWorkspaceSnapshot, getContinueContext, getPinnedRecordSummaries, getRecentRecordTags, getRecordTagStats, getSavedRecordSearches, createSavedRecordSearch, deleteSavedRecordSearch, moveSavedRecordSearch, getWeeklySummary, getMonthlyReview, getRecordDetail, getRecordSearch, getReviewNote, saveReviewNote, deleteReviewNote } = vi.hoisted(() => ({
  getDb: vi.fn(),
  getWorkspaceSnapshot: vi.fn(),
  getContinueContext: vi.fn(),
  getPinnedRecordSummaries: vi.fn(),
  getRecentRecordTags: vi.fn(),
  getRecordTagStats: vi.fn(),
  getSavedRecordSearches: vi.fn(),
  createSavedRecordSearch: vi.fn(),
  deleteSavedRecordSearch: vi.fn(),
  moveSavedRecordSearch: vi.fn(),
  getWeeklySummary: vi.fn(),
  getMonthlyReview: vi.fn(),
  getRecordDetail: vi.fn(),
  getRecordSearch: vi.fn(),
  getReviewNote: vi.fn(),
  saveReviewNote: vi.fn(),
  deleteReviewNote: vi.fn(),
}));

vi.mock("../db", () => ({ getDb, getWorkspaceSnapshot, getContinueContext, getPinnedRecordSummaries, getRecentRecordTags, getRecordTagStats, getSavedRecordSearches, createSavedRecordSearch, deleteSavedRecordSearch, moveSavedRecordSearch, getWeeklySummary, getMonthlyReview, getRecordDetail, getRecordSearch, getReviewNote, saveReviewNote, deleteReviewNote }));

import { histories, projects } from "../../drizzle/schema";
import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/context";

function authenticatedContext(): TrpcContext {
  return {
    user: {
      id: 17,
      openId: "workspace-user",
      email: "workspace@example.com",
      name: "Workspace User",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("workspace data flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a user-scoped Project and appends its History event", async () => {
    const projectValues = vi.fn().mockReturnValue({ $returningId: vi.fn().mockResolvedValue([{ id: 44 }]) });
    const historyValues = vi.fn().mockResolvedValue(undefined);
    const selectLimit = vi.fn().mockResolvedValue([{
      id: 44,
      userId: 17,
      title: "게임 제작",
      description: null,
      color: "#141414",
      status: "active",
      sortOrder: 0,
      archivedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }]);
    const db = {
      insert: vi.fn((table: unknown) => ({ values: table === projects ? projectValues : historyValues })),
      select: vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn(() => ({ limit: selectLimit })) })) })),
    };
    getDb.mockResolvedValue(db);

    const result = await appRouter.createCaller(authenticatedContext()).workspace.createProject({ title: "게임 제작" });

    expect(result).toMatchObject({ id: 44, userId: 17, title: "게임 제작" });
    expect(projectValues).toHaveBeenCalledWith(expect.objectContaining({ userId: 17, title: "게임 제작" }));
    expect(historyValues).toHaveBeenCalledWith(expect.objectContaining({
      userId: 17,
      entityType: "Project",
      entityId: 44,
      eventType: "created",
      afterData: { title: "게임 제작" },
    }));
    expect(db.insert).toHaveBeenCalledWith(histories);
  });

  it("loads Today and Continue data only through the authenticated user id", async () => {
    getWorkspaceSnapshot.mockResolvedValue({ projects: [], stages: [], tasks: [], schedules: [], recentRecords: [] });
    getContinueContext.mockResolvedValue(null);
    const workspace = appRouter.createCaller(authenticatedContext()).workspace;
    const start = new Date("2026-08-26T00:00:00.000Z");
    const end = new Date("2026-08-27T00:00:00.000Z");

    await expect(workspace.overview({ start, end })).resolves.toMatchObject({ schedules: [] });
    await expect(workspace.continue()).resolves.toBeNull();
    expect(getWorkspaceSnapshot).toHaveBeenCalledWith(17, start, end);
    expect(getContinueContext).toHaveBeenCalledWith(17);
  });

  it("loads Today pinned Record summaries only through the authenticated user id", async () => {
    getPinnedRecordSummaries.mockResolvedValue([{ id: 3, content: "원문 그대로", sourceType: "capture" }]);

    await expect(appRouter.createCaller(authenticatedContext()).workspace.pinnedRecordSummaries()).resolves.toEqual([{ id: 3, content: "원문 그대로", sourceType: "capture" }]);
    expect(getPinnedRecordSummaries).toHaveBeenCalledWith(17);
  });

  it("loads recent Record tags only through the authenticated user id", async () => {
    getRecentRecordTags.mockResolvedValue(["회의", "중요"]);

    await expect(appRouter.createCaller(authenticatedContext()).workspace.recentRecordTags()).resolves.toEqual(["회의", "중요"]);
    expect(getRecentRecordTags).toHaveBeenCalledWith(17);
  });

  it("loads Record tag usage only through the authenticated user id", async () => {
    const tagStats = [
      { tag: "계획", usageCount: 2, lastUsedAt: new Date("2026-08-27T01:30:00Z") },
      { tag: "검토", usageCount: 1, lastUsedAt: new Date("2026-08-27T01:29:00Z") },
    ];
    getRecordTagStats.mockResolvedValue(tagStats);

    await expect(appRouter.createCaller(authenticatedContext()).workspace.recordTagStats()).resolves.toEqual(tagStats);
    expect(getRecordTagStats).toHaveBeenCalledWith(17);
    expect(getRecordTagStats).not.toHaveBeenCalledWith(99);
  });

  it("lists, saves, and deletes Record searches only through the authenticated user id", async () => {
    const input = { name: "이번 달 Capture", query: null, projectId: null, taskId: null, sourceType: "capture" as const, period: "month" as const, sort: "newest" as const, tag: null };
    getSavedRecordSearches.mockResolvedValueOnce([{ id: 8, userId: 17, name: "기존" }]).mockResolvedValueOnce([]);
    createSavedRecordSearch.mockResolvedValue({ id: 9, userId: 17, ...input });
    deleteSavedRecordSearch.mockResolvedValue({ success: true });
    const workspace = appRouter.createCaller(authenticatedContext()).workspace;

    await expect(workspace.savedRecordSearches()).resolves.toEqual([{ id: 8, userId: 17, name: "기존" }]);
    await expect(workspace.createSavedRecordSearch(input)).resolves.toMatchObject({ id: 9, userId: 17, name: "이번 달 Capture" });
    await expect(workspace.deleteSavedRecordSearch({ id: 9 })).resolves.toEqual({ success: true });
    expect(getSavedRecordSearches).toHaveBeenNthCalledWith(1, 17);
    expect(getSavedRecordSearches).toHaveBeenNthCalledWith(2, 17);
    expect(createSavedRecordSearch).toHaveBeenCalledWith(17, input);
    expect(deleteSavedRecordSearch).toHaveBeenCalledWith(17, 9);
  });

  it("rejects a saved Record search name that already belongs to the authenticated user", async () => {
    getSavedRecordSearches.mockResolvedValue([{ id: 8, userId: 17, name: "이번 달 Capture" }]);
    const input = { name: "이번 달 Capture", query: null, projectId: null, taskId: null, sourceType: "capture" as const, period: "month" as const, sort: "newest" as const, tag: null };

    await expect(appRouter.createCaller(authenticatedContext()).workspace.createSavedRecordSearch(input)).rejects.toMatchObject({ code: "CONFLICT" });
    expect(createSavedRecordSearch).not.toHaveBeenCalled();
  });

  it("moves a saved Record search only within the authenticated user scope", async () => {
    moveSavedRecordSearch.mockResolvedValue({ success: true });

    await expect(appRouter.createCaller(authenticatedContext()).workspace.moveSavedRecordSearch({ id: 9, direction: "up" })).resolves.toEqual({ success: true });
    expect(moveSavedRecordSearch).toHaveBeenCalledWith(17, 9, "up");
  });

  it("loads a weekly summary only through the authenticated user id", async () => {
    getWeeklySummary.mockResolvedValue({ completedTaskCount: 3, recordCount: 5, completedScheduleCount: 2, change: { completedTaskCount: 1, recordCount: -1, completedScheduleCount: 0 } });
    const start = new Date("2026-08-24T00:00:00.000Z");
    const end = new Date("2026-08-31T00:00:00.000Z");

    await expect(appRouter.createCaller(authenticatedContext()).workspace.weeklySummary({ start, end })).resolves.toEqual({ completedTaskCount: 3, recordCount: 5, completedScheduleCount: 2, change: { completedTaskCount: 1, recordCount: -1, completedScheduleCount: 0 } });
    expect(getWeeklySummary).toHaveBeenCalledWith(17, start, end);
  });

  it("searches Records only through the authenticated user id and explicit filters", async () => {
    const start = new Date("2026-08-01T00:00:00.000Z");
    const end = new Date("2026-09-01T00:00:00.000Z");
    const input = { query: "원문", projectId: 2, taskId: null, sourceType: "capture" as const, start, end };
    getRecordSearch.mockResolvedValue([{ id: 3, content: "원문" }]);

    await expect(appRouter.createCaller(authenticatedContext()).workspace.recordSearch(input)).resolves.toEqual([{ id: 3, content: "원문" }]);
    expect(getRecordSearch).toHaveBeenCalledWith(17, input);
  });

  it("loads a Record detail only through the authenticated user id", async () => {
    getRecordDetail.mockResolvedValue({ id: 3, content: "원문", attachments: [] });

    await expect(appRouter.createCaller(authenticatedContext()).workspace.recordDetail({ recordId: 3 })).resolves.toMatchObject({ id: 3, content: "원문" });
    expect(getRecordDetail).toHaveBeenCalledWith(17, 3);
  });

  it("loads a monthly Review only through the authenticated user id", async () => {
    getMonthlyReview.mockResolvedValue({ completedTaskCount: 7, recordCount: 12, completedScheduleCount: 4, activeProjects: [] });
    const start = new Date("2026-08-01T00:00:00.000Z");
    const end = new Date("2026-09-01T00:00:00.000Z");

    await expect(appRouter.createCaller(authenticatedContext()).workspace.monthlyReview({ start, end })).resolves.toEqual({ completedTaskCount: 7, recordCount: 12, completedScheduleCount: 4, activeProjects: [] });
    expect(getMonthlyReview).toHaveBeenCalledWith(17, start, end);
  });

  it("loads, saves, and clears a monthly review note only through the authenticated user id", async () => {
    const periodStart = new Date("2026-08-01T00:00:00.000Z");
    const periodEnd = new Date("2026-09-01T00:00:00.000Z");
    getReviewNote.mockResolvedValue(null);
    saveReviewNote.mockResolvedValue({ id: 3, userId: 17, content: "정리" });
    deleteReviewNote.mockResolvedValue({ success: true });
    const workspace = appRouter.createCaller(authenticatedContext()).workspace;

    await expect(workspace.reviewNote({ periodStart, periodEnd })).resolves.toBeNull();
    await expect(workspace.saveReviewNote({ periodStart, periodEnd, content: "정리" })).resolves.toMatchObject({ id: 3, userId: 17 });
    await expect(workspace.deleteReviewNote({ periodStart, periodEnd })).resolves.toEqual({ success: true });
    expect(getReviewNote).toHaveBeenCalledWith(17, periodStart, periodEnd);
    expect(saveReviewNote).toHaveBeenCalledWith(17, periodStart, periodEnd, "정리");
    expect(deleteReviewNote).toHaveBeenCalledWith(17, periodStart, periodEnd);
  });
});
