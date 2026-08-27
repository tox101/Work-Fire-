import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  getWorkspaceSnapshot: vi.fn(),
  getContinueContext: vi.fn(),
  storagePut: vi.fn(),
}));

vi.mock("../db", () => ({
  getDb: mocks.getDb,
  getWorkspaceSnapshot: mocks.getWorkspaceSnapshot,
  getContinueContext: mocks.getContinueContext,
}));
vi.mock("../storage", () => ({ storagePut: mocks.storagePut }));

import { attachments, histories, projects, records, recordTags, savedRecordSearches, schedules, stages, tagMergeOperations, tasks } from "../../drizzle/schema";
import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/context";

function authenticatedContext(): TrpcContext {
  return {
    user: { id: 17, openId: "mutation-user", email: null, name: "Mutation User", loginMethod: "manus", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

function buildDb(rows: Map<unknown, unknown[]>) {
  const updateSets: Array<{ table: unknown; values: unknown }> = [];
  const insertValues: Array<{ table: unknown; values: unknown }> = [];
  const db = {
    select: vi.fn(() => ({
      from: vi.fn((table: unknown) => ({
        where: vi.fn(() => {
          const selected = rows.get(table) ?? [];
          const result = Object.assign(Promise.resolve(selected), { limit: vi.fn().mockResolvedValue(selected) });
          return Object.assign(result, { orderBy: vi.fn(() => Object.assign(Promise.resolve(selected), { limit: vi.fn().mockResolvedValue(selected) })) });
        }),
      })),
    })),
    update: vi.fn((table: unknown) => ({
      set: vi.fn((values: unknown) => {
        updateSets.push({ table, values });
        return { where: vi.fn().mockResolvedValue(undefined) };
      }),
    })),
    insert: vi.fn((table: unknown) => ({
      values: vi.fn((values: unknown) => {
        insertValues.push({ table, values });
        if (table === attachments) return { $returningId: vi.fn().mockResolvedValue([{ id: 31 }]) };
        if (table === tasks) return { $returningId: vi.fn().mockResolvedValue([{ id: 41 }]) };
        if (table === records) return { $returningId: vi.fn().mockResolvedValue([{ id: 51 }]) };
        if (table === tagMergeOperations) return { $returningId: vi.fn().mockResolvedValue([{ id: 61 }]) };
        return Promise.resolve(undefined);
      }),
    })),
    delete: vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) })),
  };
  (db as any).transaction = vi.fn(async (operation: (transaction: typeof db) => Promise<unknown>) => operation(db));
  return { db, updateSets, insertValues };
}

describe("workspace mutations", () => {
  beforeEach(() => vi.clearAllMocks());

  it("marks Schedule start time and persists a Schedule History event", async () => {
    const schedule = { id: 7, userId: 17, taskId: null, title: "독립 일정", status: "planned", actualStartedAt: null };
    const { db, updateSets, insertValues } = buildDb(new Map([[schedules, [schedule]]]));
    mocks.getDb.mockResolvedValue(db);

    await expect(appRouter.createCaller(authenticatedContext()).workspace.setScheduleStatus({ id: 7, status: "in_progress" })).resolves.toEqual({ success: true });

    expect(updateSets).toContainEqual(expect.objectContaining({ table: schedules, values: expect.objectContaining({ status: "in_progress", actualStartedAt: expect.any(Date) }) }));
    expect(insertValues).toContainEqual(expect.objectContaining({ table: histories, values: expect.objectContaining({ entityType: "Schedule", entityId: 7, eventType: "started" }) }));
  });

  it("archives a Task rather than deleting its task record", async () => {
    const task = { id: 8, userId: 17, status: "planned" };
    const { db, updateSets, insertValues } = buildDb(new Map([[tasks, [task]]]));
    mocks.getDb.mockResolvedValue(db);

    await expect(appRouter.createCaller(authenticatedContext()).workspace.archiveTask({ id: 8 })).resolves.toEqual({ success: true });

    expect(updateSets).toContainEqual(expect.objectContaining({ table: tasks, values: expect.objectContaining({ status: "cancelled", archivedAt: expect.any(Date) }) }));
    expect(insertValues).toContainEqual(expect.objectContaining({ table: histories, values: expect.objectContaining({ entityType: "Task", entityId: 8, eventType: "archived" }) }));
  });

  it("rejects a stale Task revision instead of overwriting another device's update", async () => {
    const task = { id: 8, userId: 17, status: "planned", revision: 2, projectId: null, stageId: null, nextAction: null };
    const { db, updateSets } = buildDb(new Map([[tasks, [task]]]));
    mocks.getDb.mockResolvedValue(db);

    await expect(appRouter.createCaller(authenticatedContext()).workspace.updateTask({ id: 8, expectedRevision: 1, title: "늦게 도착한 변경" })).rejects.toMatchObject({ code: "CONFLICT" });

    expect(updateSets).toEqual([]);
  });

  it("rejects stale Project, Stage, and Schedule revisions without overwriting current data", async () => {
    const project = { id: 3, userId: 17, title: "최신 Project", revision: 2 };
    const stage = { id: 4, userId: 17, title: "최신 Stage", status: "active", revision: 2 };
    const schedule = { id: 5, userId: 17, title: "최신 일정", taskId: null, revision: 2, plannedStartAt: null };
    const { db, updateSets } = buildDb(new Map([[projects, [project]], [stages, [stage]], [schedules, [schedule]]]));
    mocks.getDb.mockResolvedValue(db);
    const workspace = appRouter.createCaller(authenticatedContext()).workspace;

    await expect(workspace.updateProject({ id: 3, expectedRevision: 1, title: "늦은 Project" })).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(workspace.updateStage({ id: 4, expectedRevision: 1, title: "늦은 Stage" })).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(workspace.updateSchedule({ id: 5, expectedRevision: 1, title: "늦은 일정" })).rejects.toMatchObject({ code: "CONFLICT" });

    expect(updateSets).toEqual([]);
  });

  it("archives only explicitly selected owned Project, Stage, and Task rows and records History", async () => {
    const project = { id: 3, userId: 17, status: "active" }; const stage = { id: 4, userId: 17, status: "active" }; const task = { id: 5, userId: 17, status: "planned" };
    const { db, updateSets, insertValues } = buildDb(new Map([[projects, [project]], [stages, [stage]], [tasks, [task]]]));
    mocks.getDb.mockResolvedValue(db);

    await expect(appRouter.createCaller(authenticatedContext()).workspace.bulkArchiveWorkspaceItems({ projectIds: [3], stageIds: [4], taskIds: [5] })).resolves.toEqual({ success: true, counts: { projects: 1, stages: 1, tasks: 1 } });
    expect(updateSets).toContainEqual(expect.objectContaining({ table: projects, values: expect.objectContaining({ status: "archived", archivedAt: expect.any(Date) }) }));
    expect(updateSets).toContainEqual(expect.objectContaining({ table: stages, values: { status: "archived" } }));
    expect(updateSets).toContainEqual(expect.objectContaining({ table: tasks, values: expect.objectContaining({ status: "cancelled", archivedAt: expect.any(Date) }) }));
    expect(insertValues.filter(item => item.table === histories)).toHaveLength(3);
  });

  it("restores an owned archived Project and a Task to its recorded pre-archive state", async () => {
    const project = { id: 3, userId: 17, status: "archived", revision: 1 };
    const task = { id: 5, userId: 17, status: "cancelled", archivedAt: new Date(), revision: 1, projectId: null, stageId: null };
    const archiveHistory = { id: 12, userId: 17, entityType: "Task", entityId: 5, eventType: "archived", beforeData: { status: "on_hold" }, occurredAt: new Date() };
    const { db, updateSets, insertValues } = buildDb(new Map([[projects, [project]], [tasks, [task]], [histories, [archiveHistory]]]));
    mocks.getDb.mockResolvedValue(db);
    const workspace = appRouter.createCaller(authenticatedContext()).workspace;

    await expect(workspace.restoreArchivedWorkspaceItem({ entityType: "Project", id: 3, expectedRevision: 1 })).resolves.toEqual({ success: true });
    await expect(workspace.restoreArchivedWorkspaceItem({ entityType: "Task", id: 5, expectedRevision: 1 })).resolves.toEqual({ success: true });

    expect(updateSets).toContainEqual(expect.objectContaining({ table: projects, values: { status: "active", archivedAt: null, revision: 2 } }));
    expect(updateSets).toContainEqual(expect.objectContaining({ table: tasks, values: { status: "on_hold", archivedAt: null, revision: 2 } }));
    expect(insertValues).toContainEqual(expect.objectContaining({ table: histories, values: expect.objectContaining({ entityType: "Project", entityId: 3, eventType: "restored" }) }));
    expect(insertValues).toContainEqual(expect.objectContaining({ table: histories, values: expect.objectContaining({ entityType: "Task", entityId: 5, eventType: "restored", afterData: { status: "on_hold" } }) }));
  });

  it("rejects an explicitly selected Project that is not owned by the authenticated user", async () => {
    const { db } = buildDb(new Map([[projects, [{ id: 3, userId: 18, status: "active" }]]]));
    mocks.getDb.mockResolvedValue(db);

    await expect(appRouter.createCaller(authenticatedContext()).workspace.bulkArchiveWorkspaceItems({ projectIds: [3], stageIds: [], taskIds: [] })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("pins a Record only within the authenticated user scope and records History", async () => {
    const record = { id: 9, userId: 17, taskId: null, isPinned: false };
    const { db, updateSets, insertValues } = buildDb(new Map([[records, [record]]]));
    mocks.getDb.mockResolvedValue(db);

    await expect(appRouter.createCaller(authenticatedContext()).workspace.setRecordPinned({ recordId: 9, isPinned: true })).resolves.toEqual({ success: true });
    expect(updateSets).toContainEqual(expect.objectContaining({ table: records, values: { isPinned: true } }));
    expect(insertValues).toContainEqual(expect.objectContaining({ table: histories, values: expect.objectContaining({ entityType: "Record", entityId: 9, eventType: "updated", beforeData: { isPinned: false }, afterData: { isPinned: true } }) }));
  });

  it("adds a normalized Record tag only within the authenticated user scope and records History", async () => {
    const record = { id: 10, userId: 17, taskId: null, isPinned: false };
    const { db, insertValues } = buildDb(new Map([[records, [record]], [recordTags, []]]));
    mocks.getDb.mockResolvedValue(db);

    await expect(appRouter.createCaller(authenticatedContext()).workspace.addRecordTag({ recordId: 10, tag: "  회고   중요 " })).resolves.toEqual({ success: true, tag: "회고 중요" });
    expect(insertValues).toContainEqual(expect.objectContaining({ table: recordTags, values: { userId: 17, recordId: 10, tag: "회고 중요" } }));
    expect(insertValues).toContainEqual(expect.objectContaining({ table: histories, values: expect.objectContaining({ entityType: "Record", entityId: 10, eventType: "updated", afterData: { tag: "회고 중요" } }) }));
  });

  it("captures explicit normalized tags without changing the original Record content", async () => {
    const record = { id: 51, userId: 17, content: "원문은 그대로", taskId: null };
    const { db, insertValues } = buildDb(new Map([[records, [record]]]));
    mocks.getDb.mockResolvedValue(db);

    await expect(appRouter.createCaller(authenticatedContext()).workspace.captureRecord({ content: "원문은 그대로", tags: ["  회의  ", "회의", "중요"] })).resolves.toEqual(record);

    expect(insertValues).toContainEqual(expect.objectContaining({ table: records, values: expect.objectContaining({ userId: 17, content: "원문은 그대로" }) }));
    expect(insertValues).toContainEqual(expect.objectContaining({ table: recordTags, values: [{ userId: 17, recordId: 51, tag: "회의" }, { userId: 17, recordId: 51, tag: "중요" }] }));
    expect(insertValues).toContainEqual(expect.objectContaining({ table: histories, values: expect.objectContaining({ entityType: "Record", entityId: 51, afterData: expect.objectContaining({ tags: ["회의", "중요"] }) }) }));
  });

  it("returns an existing Record for a repeated mobile Capture request without creating a duplicate", async () => {
    const requestId = "209b34b6-f0c3-4d63-9368-793e6924a5a3";
    const record = { id: 52, userId: 17, content: "재전송 원문", clientRequestId: requestId, taskId: null };
    const { db, insertValues } = buildDb(new Map([[records, [record]]]));
    mocks.getDb.mockResolvedValue(db);

    await expect(appRouter.createCaller(authenticatedContext()).workspace.captureRecord({ content: "재전송 원문", clientRequestId: requestId })).resolves.toEqual(record);

    expect(insertValues).toEqual([]);
  });

  it("merges an owned Record tag without duplicate links and records the change", async () => {
    const record = { id: 10, userId: 17, taskId: null };
    const { db, updateSets, insertValues } = buildDb(new Map([[records, [record]], [recordTags, []]]));
    const tagSelections = [[{ recordId: 10 }], []] as Array<Array<{ recordId: number }>>;
    db.select.mockImplementation(() => ({
      from: vi.fn((table: unknown) => ({
        where: vi.fn(() => {
          const selected = table === recordTags ? (tagSelections.shift() ?? []) : (table === records ? [record] : []);
          return Object.assign(Promise.resolve(selected), { limit: vi.fn().mockResolvedValue(selected) });
        }),
      })),
    }));
    mocks.getDb.mockResolvedValue(db);

    await expect(appRouter.createCaller(authenticatedContext()).workspace.mergeRecordTag({ sourceTag: "  회의  ", targetTag: "프로젝트" })).resolves.toMatchObject({ success: true, sourceTag: "회의", targetTag: "프로젝트", affectedRecordCount: 1 });
    expect(updateSets).toContainEqual(expect.objectContaining({ table: recordTags, values: { tag: "프로젝트" } }));
    expect(insertValues).toContainEqual(expect.objectContaining({ table: histories, values: expect.objectContaining({ entityType: "Record", entityId: 10, beforeData: { tag: "회의" }, afterData: { tag: "프로젝트" } }) }));
  });

  it("rejects a Record tag merge when the source tag is not owned by the authenticated user", async () => {
    const { db } = buildDb(new Map([[recordTags, []]]));
    mocks.getDb.mockResolvedValue(db);

    await expect(appRouter.createCaller(authenticatedContext()).workspace.mergeRecordTag({ sourceTag: "다른 사용자 태그", targetTag: "내 태그" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("undoes a recent owned tag merge by restoring renamed and collapsed tag links", async () => {
    const operation = { id: 61, userId: 17, sourceTag: "업무", targetTag: "일", recordChanges: [{ recordId: 9, mode: "renamed" }, { recordId: 10, mode: "collapsed" }], savedSearchIds: [], undoneAt: null };
    const { db, updateSets, insertValues } = buildDb(new Map([[tagMergeOperations, [operation]], [recordTags, [{ tag: "일" }]], [records, [{ id: 9, userId: 17, taskId: null }]], [savedRecordSearches, []]]));
    mocks.getDb.mockResolvedValue(db);

    await expect(appRouter.createCaller(authenticatedContext()).workspace.undoRecordTagMerge({ operationId: 61 })).resolves.toMatchObject({ success: true, sourceTag: "업무", targetTag: "일", affectedRecordCount: 2 });

    expect(updateSets).toContainEqual(expect.objectContaining({ table: recordTags, values: { tag: "업무" } }));
    expect(updateSets).toContainEqual(expect.objectContaining({ table: tagMergeOperations, values: expect.objectContaining({ undoneAt: expect.any(Date) }) }));
    expect(insertValues).toContainEqual(expect.objectContaining({ table: recordTags, values: { userId: 17, recordId: 10, tag: "업무" } }));
    expect(insertValues).toContainEqual(expect.objectContaining({ table: histories, values: expect.objectContaining({ eventType: "updated", note: "Record 태그 병합 되돌리기: 일 → 업무" }) }));
  });

  it("creates a planned Task draft only with owned Project and Stage links", async () => {
    const project = { id: 5, userId: 17, title: "월간 계획" };
    const stage = { id: 6, userId: 17, projectId: 5, title: "시작" };
    const createdTask = { id: 41, userId: 17, projectId: 5, stageId: 6, title: "첫 Task", status: "planned", nextAction: "환경 열기" };
    const { db, insertValues } = buildDb(new Map([[projects, [project]], [stages, [stage]], [tasks, [createdTask]]]));
    mocks.getDb.mockResolvedValue(db);

    await expect(appRouter.createCaller(authenticatedContext()).workspace.createTask({ projectId: 5, stageId: 6, title: "첫 Task", nextAction: "환경 열기", status: "planned" })).resolves.toEqual(createdTask);

    expect(insertValues).toContainEqual(expect.objectContaining({ table: tasks, values: expect.objectContaining({ userId: 17, projectId: 5, stageId: 6, title: "첫 Task", nextAction: "환경 열기", status: "planned" }) }));
    expect(insertValues).toContainEqual(expect.objectContaining({ table: histories, values: expect.objectContaining({ userId: 17, entityType: "Task", entityId: 41, taskId: 41, eventType: "created", afterData: { title: "첫 Task", status: "planned" } }) }));
  });

  it("rejects a saved Record search that refers to another user's Project or Task", async () => {
    const foreignProject = { id: 5, userId: 18, title: "다른 사용자 Project" };
    const foreignTask = { id: 6, userId: 18, title: "다른 사용자 Task" };
    const { db } = buildDb(new Map([[projects, [foreignProject]], [tasks, [foreignTask]]]));
    mocks.getDb.mockResolvedValue(db);
    const workspace = appRouter.createCaller(authenticatedContext()).workspace;
    const baseInput = { name: "검증", query: null, sourceType: null, period: "all" as const, sort: "newest" as const, tag: null };

    await expect(workspace.createSavedRecordSearch({ ...baseInput, projectId: 5, taskId: null })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(workspace.createSavedRecordSearch({ ...baseInput, name: "검증 Task", projectId: null, taskId: 6 })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("stores Attachment metadata and History after an owned Record upload", async () => {
    const record = { id: 9, userId: 17, taskId: 8 };
    const attachment = { id: 31, userId: 17, recordId: 9, storageKey: "17/records/9/notes_abc.txt", url: "/manus-storage/17/records/9/notes_abc.txt", fileName: "notes.txt", mimeType: "text/plain", size: 5 };
    const { db, insertValues } = buildDb(new Map([[records, [record]], [attachments, [attachment]]]));
    mocks.getDb.mockResolvedValue(db);
    mocks.storagePut.mockResolvedValue({ key: attachment.storageKey, url: attachment.url });

    const result = await appRouter.createCaller(authenticatedContext()).workspace.uploadAttachment({ recordId: 9, fileName: "notes.txt", mimeType: "text/plain", base64Data: "aGVsbG8=" });

    expect(result).toMatchObject({ id: 31, recordId: 9, fileName: "notes.txt" });
    expect(mocks.storagePut).toHaveBeenCalledWith("17/records/9/notes.txt", expect.any(Buffer), "text/plain");
    expect(insertValues).toContainEqual(expect.objectContaining({ table: attachments, values: expect.objectContaining({ userId: 17, recordId: 9, fileName: "notes.txt", size: 5 }) }));
    expect(insertValues).toContainEqual(expect.objectContaining({ table: histories, values: expect.objectContaining({ entityType: "Attachment", entityId: 31, taskId: 8, eventType: "created" }) }));
  });

  it("returns an existing Attachment for a repeated mobile upload without storage re-upload", async () => {
    const uploadId = "6697eaca-2c6f-45e0-9ae0-4dd03513b09a";
    const attachment = { id: 32, userId: 17, recordId: 9, clientUploadId: uploadId, fileName: "photo.png" };
    const { db, insertValues } = buildDb(new Map([[attachments, [attachment]]]));
    mocks.getDb.mockResolvedValue(db);

    await expect(appRouter.createCaller(authenticatedContext()).workspace.uploadAttachment({ recordId: 9, fileName: "photo.png", mimeType: "image/png", clientUploadId: uploadId, base64Data: "aGVsbG8=" })).resolves.toEqual(attachment);

    expect(mocks.storagePut).not.toHaveBeenCalled();
    expect(insertValues).toEqual([]);
  });
});
