import { TRPCError } from "@trpc/server";
import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { attachments, histories, projects, records, recordTags, savedRecordSearches, schedules, stages, tagMergeOperations, tasks } from "../../drizzle/schema";
import { createSavedRecordSearch, deleteReviewNote, deleteSavedRecordSearch, getArchivedWorkspace, getContinueContext, getDb, getMonthlyReview, getPinnedRecordSummaries, getRecentRecordTags, getRecordDetail, getRecordSearch, getRecordTagOptions, getRecordTagStats, getReviewNote, getSavedRecordSearches, getWeeklySummary, getWorkspaceExportData, getWorkspaceSnapshot, moveSavedRecordSearch, saveReviewNote } from "../db";
import { protectedProcedure, router } from "../_core/trpc";
import { storagePut } from "../storage";
import { deriveTaskStateChange, TaskStatus } from "../domain/taskState";

const taskStatus = z.enum(["inbox", "planned", "in_progress", "done", "on_hold", "cancelled"]);
const scheduleStatus = z.enum(["planned", "in_progress", "completed", "cancelled"]);
const taskInput = z.object({
  title: z.string().trim().min(1).max(220),
  projectId: z.number().int().positive().nullable().optional(),
  stageId: z.number().int().positive().nullable().optional(),
  detail: z.string().max(8000).nullable().optional(),
  nextAction: z.string().trim().max(320).nullable().optional(),
  priority: z.enum(["low", "normal", "high"]).optional(),
  status: taskStatus.optional(),
});

const savedRecordSearchInput = z.object({
  name: z.string().trim().min(1).max(80),
  query: z.string().trim().max(240).nullable().optional(),
  projectId: z.number().int().positive().nullable().optional(),
  taskId: z.number().int().positive().nullable().optional(),
  sourceType: z.enum(["capture", "work_log", "journal", "link"]).nullable().optional(),
  period: z.enum(["all", "month"]).optional(),
  sort: z.enum(["newest", "oldest", "pinned"]).optional(),
  tag: z.string().trim().max(64).nullable().optional(),
});

async function databaseOrThrow() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "데이터베이스에 연결할 수 없습니다." });
  return db;
}

async function assertOwned<T extends { userId: number }>(row: T | undefined, userId: number, label: string) {
  if (!row || row.userId !== userId) throw new TRPCError({ code: "NOT_FOUND", message: `${label}을 찾을 수 없습니다.` });
  return row;
}

async function assertOptionalLinks(userId: number, links: { projectId?: number | null; stageId?: number | null; taskId?: number | null; scheduleId?: number | null }) {
  const db = await databaseOrThrow();
  if (links.projectId) {
    const [project] = await db.select().from(projects).where(and(eq(projects.id, links.projectId), eq(projects.userId, userId))).limit(1);
    await assertOwned(project, userId, "Project");
  }
  if (links.stageId) {
    const [stage] = await db.select().from(stages).where(and(eq(stages.id, links.stageId), eq(stages.userId, userId))).limit(1);
    await assertOwned(stage, userId, "Stage");
  }
  if (links.taskId) {
    const [task] = await db.select().from(tasks).where(and(eq(tasks.id, links.taskId), eq(tasks.userId, userId))).limit(1);
    await assertOwned(task, userId, "Task");
  }
  if (links.scheduleId) {
    const [schedule] = await db.select().from(schedules).where(and(eq(schedules.id, links.scheduleId), eq(schedules.userId, userId))).limit(1);
    await assertOwned(schedule, userId, "Schedule");
  }
}

type HistoryArgs = {
  userId: number;
  entityType: "Project" | "Stage" | "Task" | "Schedule" | "Record" | "Attachment";
  entityId: number;
  taskId?: number | null;
  eventType: "created" | "updated" | "started" | "completed" | "on_hold" | "archived" | "restored" | "linked";
  beforeData?: Record<string, unknown>;
  afterData?: Record<string, unknown>;
  note?: string | null;
};

async function addHistoryWithDb(db: any, args: HistoryArgs) {
  await db.insert(histories).values({
    userId: args.userId,
    entityType: args.entityType,
    entityId: args.entityId,
    taskId: args.taskId ?? null,
    eventType: args.eventType,
    beforeData: args.beforeData,
    afterData: args.afterData,
    note: args.note ?? null,
  });
}

async function addHistory(args: HistoryArgs) {
  await addHistoryWithDb(await databaseOrThrow(), args);
}

async function inTransaction<T>(db: any, operation: (transaction: any) => Promise<T>) {
  return typeof db.transaction === "function" ? db.transaction(operation) : operation(db);
}

function revisionConflict() {
  return new TRPCError({ code: "CONFLICT", message: "다른 기기에서 이미 변경됐습니다. 최신 내용을 불러온 뒤 다시 시도하세요." });
}

async function updateWithRevision(db: any, table: any, id: number, userId: number, currentRevision: number | undefined, expectedRevision: number | undefined, values: Record<string, unknown>) {
  if (expectedRevision !== undefined && expectedRevision !== currentRevision) throw revisionConflict();
  const revision = expectedRevision ?? currentRevision;
  const conditions = [eq(table.id, id), eq(table.userId, userId)];
  if (revision !== undefined) conditions.push(eq(table.revision, revision));
  const result = await db.update(table).set(revision === undefined ? values : { ...values, revision: revision + 1 }).where(and(...conditions));
  const header = Array.isArray(result) ? result[0] : result;
  if (header && typeof header.affectedRows === "number" && header.affectedRows === 0) throw revisionConflict();
}

export const workspaceRouter = router({
  overview: protectedProcedure.input(z.object({ start: z.date(), end: z.date() })).query(async ({ ctx, input }) => {
    return getWorkspaceSnapshot(ctx.user.id, input.start, input.end);
  }),

  continue: protectedProcedure.query(async ({ ctx }) => getContinueContext(ctx.user.id)),

  archivedWorkspace: protectedProcedure.query(async ({ ctx }) => getArchivedWorkspace(ctx.user.id)),

  exportWorkspaceData: protectedProcedure.query(async ({ ctx }) => getWorkspaceExportData(ctx.user.id)),

  restoreArchivedWorkspaceItem: protectedProcedure.input(z.object({ entityType: z.enum(["Project", "Stage", "Task"]), id: z.number().int().positive(), expectedRevision: z.number().int().positive().optional() })).mutation(async ({ ctx, input }) => {
    const db = await databaseOrThrow();
    if (input.entityType === "Project") {
      const [project] = await db.select().from(projects).where(and(eq(projects.id, input.id), eq(projects.userId, ctx.user.id))).limit(1);
      await assertOwned(project, ctx.user.id, "Project");
      if (project.status !== "archived") throw new TRPCError({ code: "BAD_REQUEST", message: "이미 활성 상태인 Project입니다." });
      await updateWithRevision(db, projects, input.id, ctx.user.id, project.revision, input.expectedRevision, { status: "active", archivedAt: null });
      await addHistory({ userId: ctx.user.id, entityType: "Project", entityId: input.id, eventType: "restored", beforeData: { status: project.status }, afterData: { status: "active" }, note: "보관함에서 복원" });
      return { success: true };
    }
    if (input.entityType === "Stage") {
      const [stage] = await db.select().from(stages).where(and(eq(stages.id, input.id), eq(stages.userId, ctx.user.id))).limit(1);
      await assertOwned(stage, ctx.user.id, "Stage");
      const [project] = await db.select().from(projects).where(and(eq(projects.id, stage.projectId), eq(projects.userId, ctx.user.id))).limit(1);
      await assertOwned(project, ctx.user.id, "Project");
      if (project.status !== "active") throw new TRPCError({ code: "CONFLICT", message: "상위 Project를 먼저 복원하세요." });
      if (stage.status !== "archived") throw new TRPCError({ code: "BAD_REQUEST", message: "이미 활성 상태인 Stage입니다." });
      await updateWithRevision(db, stages, input.id, ctx.user.id, stage.revision, input.expectedRevision, { status: "active" });
      await addHistory({ userId: ctx.user.id, entityType: "Stage", entityId: input.id, eventType: "restored", beforeData: { status: stage.status }, afterData: { status: "active" }, note: "보관함에서 복원" });
      return { success: true };
    }
    const [task] = await db.select().from(tasks).where(and(eq(tasks.id, input.id), eq(tasks.userId, ctx.user.id))).limit(1);
    await assertOwned(task, ctx.user.id, "Task");
    if (task.projectId) {
      const [project] = await db.select().from(projects).where(and(eq(projects.id, task.projectId), eq(projects.userId, ctx.user.id))).limit(1);
      await assertOwned(project, ctx.user.id, "Project");
      if (project.status !== "active") throw new TRPCError({ code: "CONFLICT", message: "상위 Project를 먼저 복원하세요." });
    }
    if (task.stageId) {
      const [stage] = await db.select().from(stages).where(and(eq(stages.id, task.stageId), eq(stages.userId, ctx.user.id))).limit(1);
      await assertOwned(stage, ctx.user.id, "Stage");
      if (stage.status === "archived") throw new TRPCError({ code: "CONFLICT", message: "상위 Stage를 먼저 복원하세요." });
    }
    if (task.status !== "cancelled" || !task.archivedAt) throw new TRPCError({ code: "BAD_REQUEST", message: "보관된 Task가 아닙니다." });
    const historyRows = await db.select().from(histories).where(and(eq(histories.userId, ctx.user.id), eq(histories.entityType, "Task"), eq(histories.entityId, input.id), eq(histories.eventType, "archived"))).orderBy(desc(histories.occurredAt)).limit(1);
    const formerStatus = historyRows[0]?.beforeData && typeof historyRows[0].beforeData === "object" && "status" in historyRows[0].beforeData ? historyRows[0].beforeData.status : null;
    const status = formerStatus === "inbox" || formerStatus === "planned" || formerStatus === "in_progress" || formerStatus === "done" || formerStatus === "on_hold" ? formerStatus : "planned";
    await updateWithRevision(db, tasks, input.id, ctx.user.id, task.revision, input.expectedRevision, { status, archivedAt: null });
    await addHistory({ userId: ctx.user.id, entityType: "Task", entityId: input.id, taskId: input.id, eventType: "restored", beforeData: { status: task.status }, afterData: { status }, note: "보관함에서 복원" });
    return { success: true };
  }),

  pinnedRecordSummaries: protectedProcedure.query(async ({ ctx }) => getPinnedRecordSummaries(ctx.user.id)),

  recordSearch: protectedProcedure.input(z.object({
    query: z.string().trim().max(240).optional(),
    projectId: z.number().int().positive().nullable().optional(),
    taskId: z.number().int().positive().nullable().optional(),
    sourceType: z.enum(["capture", "work_log", "journal", "link"]).nullable().optional(),
    start: z.date().nullable().optional(),
    end: z.date().nullable().optional(),
    sort: z.enum(["newest", "oldest", "pinned"]).optional(),
    tag: z.string().trim().max(64).nullable().optional(),
  })).query(async ({ ctx, input }) => getRecordSearch(ctx.user.id, input)),

  recordTagOptions: protectedProcedure.query(async ({ ctx }) => getRecordTagOptions(ctx.user.id)),

  recentRecordTags: protectedProcedure.query(async ({ ctx }) => getRecentRecordTags(ctx.user.id)),

  recordTagStats: protectedProcedure.query(async ({ ctx }) => getRecordTagStats(ctx.user.id)),

  savedRecordSearches: protectedProcedure.query(async ({ ctx }) => getSavedRecordSearches(ctx.user.id)),

  createSavedRecordSearch: protectedProcedure.input(savedRecordSearchInput).mutation(async ({ ctx, input }) => {
    await assertOptionalLinks(ctx.user.id, { projectId: input.projectId, taskId: input.taskId });
    const existing = await getSavedRecordSearches(ctx.user.id);
    if (existing.some(item => item.name === input.name)) throw new TRPCError({ code: "CONFLICT", message: "같은 이름의 저장 검색이 있습니다." });
    return createSavedRecordSearch(ctx.user.id, input);
  }),

  deleteSavedRecordSearch: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    return deleteSavedRecordSearch(ctx.user.id, input.id);
  }),

  moveSavedRecordSearch: protectedProcedure.input(z.object({ id: z.number().int().positive(), direction: z.enum(["up", "down"]) })).mutation(async ({ ctx, input }) => {
    const moved = await moveSavedRecordSearch(ctx.user.id, input.id, input.direction);
    if (!moved) throw new TRPCError({ code: "NOT_FOUND", message: "저장 검색을 찾을 수 없습니다." });
    return moved;
  }),

  recordDetail: protectedProcedure.input(z.object({ recordId: z.number().int().positive() })).query(async ({ ctx, input }) => getRecordDetail(ctx.user.id, input.recordId)),

  setRecordPinned: protectedProcedure.input(z.object({ recordId: z.number().int().positive(), isPinned: z.boolean() })).mutation(async ({ ctx, input }) => {
    const db = await databaseOrThrow();
    const [existing] = await db.select().from(records).where(and(eq(records.id, input.recordId), eq(records.userId, ctx.user.id))).limit(1);
    await assertOwned(existing, ctx.user.id, "Record");
    await db.update(records).set({ isPinned: input.isPinned }).where(and(eq(records.id, input.recordId), eq(records.userId, ctx.user.id)));
    await addHistory({ userId: ctx.user.id, entityType: "Record", entityId: input.recordId, taskId: existing.taskId, eventType: "updated", beforeData: { isPinned: existing.isPinned }, afterData: { isPinned: input.isPinned }, note: input.isPinned ? "Record 고정" : "Record 고정 해제" });
    return { success: true };
  }),

  addRecordTag: protectedProcedure.input(z.object({ recordId: z.number().int().positive(), tag: z.string().trim().min(1).max(64) })).mutation(async ({ ctx, input }) => {
    const db = await databaseOrThrow();
    const tag = input.tag.replace(/\s+/g, " ");
    const [record] = await db.select().from(records).where(and(eq(records.id, input.recordId), eq(records.userId, ctx.user.id))).limit(1);
    await assertOwned(record, ctx.user.id, "Record");
    const [existing] = await db.select().from(recordTags).where(and(eq(recordTags.userId, ctx.user.id), eq(recordTags.recordId, input.recordId), eq(recordTags.tag, tag))).limit(1);
    if (!existing) await db.insert(recordTags).values({ userId: ctx.user.id, recordId: input.recordId, tag });
    await addHistory({ userId: ctx.user.id, entityType: "Record", entityId: input.recordId, taskId: record.taskId, eventType: "updated", afterData: { tag }, note: `Record 태그 추가: ${tag}` });
    return { success: true, tag };
  }),

  removeRecordTag: protectedProcedure.input(z.object({ recordId: z.number().int().positive(), tag: z.string().trim().min(1).max(64) })).mutation(async ({ ctx, input }) => {
    const db = await databaseOrThrow();
    const [record] = await db.select().from(records).where(and(eq(records.id, input.recordId), eq(records.userId, ctx.user.id))).limit(1);
    await assertOwned(record, ctx.user.id, "Record");
    const tag = input.tag.replace(/\s+/g, " ");
    await db.delete(recordTags).where(and(eq(recordTags.userId, ctx.user.id), eq(recordTags.recordId, input.recordId), eq(recordTags.tag, tag)));
    await addHistory({ userId: ctx.user.id, entityType: "Record", entityId: input.recordId, taskId: record.taskId, eventType: "updated", beforeData: { tag }, note: `Record 태그 제거: ${tag}` });
    return { success: true };
  }),

  recentTagMergeOperations: protectedProcedure.query(async ({ ctx }) => {
    const db = await databaseOrThrow();
    const rows = await db.select().from(tagMergeOperations).where(eq(tagMergeOperations.userId, ctx.user.id)).orderBy(desc(tagMergeOperations.createdAt)).limit(8);
    return rows.filter(row => !row.undoneAt);
  }),

  mergeRecordTag: protectedProcedure.input(z.object({ sourceTag: z.string().trim().min(1).max(64), targetTag: z.string().trim().min(1).max(64) })).mutation(async ({ ctx, input }) => {
    const db = await databaseOrThrow();
    const sourceTag = input.sourceTag.replace(/\s+/g, " ");
    const targetTag = input.targetTag.replace(/\s+/g, " ");
    if (sourceTag === targetTag) throw new TRPCError({ code: "BAD_REQUEST", message: "서로 다른 태그 이름을 입력하세요." });
    return inTransaction(db, async transaction => {
      const sourceRows = await transaction.select({ recordId: recordTags.recordId }).from(recordTags).where(and(eq(recordTags.userId, ctx.user.id), eq(recordTags.tag, sourceTag)));
      if (!sourceRows.length) throw new TRPCError({ code: "NOT_FOUND", message: "원본 태그를 찾을 수 없습니다." });
      const targetRows = await transaction.select({ recordId: recordTags.recordId }).from(recordTags).where(and(eq(recordTags.userId, ctx.user.id), eq(recordTags.tag, targetTag)));
      const targetRecordIds = new Set(targetRows.map((row: { recordId: number }) => row.recordId));
      const recordChanges: Array<{ recordId: number; mode: "renamed" | "collapsed" }> = [];
      for (const { recordId } of sourceRows) {
        const [record] = await transaction.select().from(records).where(and(eq(records.id, recordId), eq(records.userId, ctx.user.id))).limit(1);
        await assertOwned(record, ctx.user.id, "Record");
        const mode = targetRecordIds.has(recordId) ? "collapsed" : "renamed";
        if (mode === "collapsed") await transaction.delete(recordTags).where(and(eq(recordTags.userId, ctx.user.id), eq(recordTags.recordId, recordId), eq(recordTags.tag, sourceTag)));
        else await transaction.update(recordTags).set({ tag: targetTag }).where(and(eq(recordTags.userId, ctx.user.id), eq(recordTags.recordId, recordId), eq(recordTags.tag, sourceTag)));
        recordChanges.push({ recordId, mode });
        await addHistoryWithDb(transaction, { userId: ctx.user.id, entityType: "Record", entityId: recordId, taskId: record.taskId, eventType: "updated", beforeData: { tag: sourceTag }, afterData: { tag: targetTag }, note: `Record 태그 병합: ${sourceTag} → ${targetTag}` });
      }
      const affectedSearches = await transaction.select({ id: savedRecordSearches.id }).from(savedRecordSearches).where(and(eq(savedRecordSearches.userId, ctx.user.id), eq(savedRecordSearches.tag, sourceTag)));
      await transaction.update(savedRecordSearches).set({ tag: targetTag }).where(and(eq(savedRecordSearches.userId, ctx.user.id), eq(savedRecordSearches.tag, sourceTag)));
      const [operation] = await transaction.insert(tagMergeOperations).values({ userId: ctx.user.id, sourceTag, targetTag, recordChanges, savedSearchIds: affectedSearches.map((row: { id: number }) => row.id) }).$returningId();
      return { success: true, operationId: operation.id, sourceTag, targetTag, affectedRecordCount: sourceRows.length };
    });
  }),

  undoRecordTagMerge: protectedProcedure.input(z.object({ operationId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const db = await databaseOrThrow();
    return inTransaction(db, async transaction => {
      const [operation] = await transaction.select().from(tagMergeOperations).where(and(eq(tagMergeOperations.id, input.operationId), eq(tagMergeOperations.userId, ctx.user.id))).limit(1);
      if (!operation || operation.undoneAt) throw new TRPCError({ code: "NOT_FOUND", message: "되돌릴 태그 병합을 찾을 수 없습니다." });
      const recordChanges = Array.isArray(operation.recordChanges) ? operation.recordChanges : [];
      const savedSearchIds = Array.isArray(operation.savedSearchIds) ? operation.savedSearchIds : [];
      for (const change of recordChanges) {
        const rows = await transaction.select({ tag: recordTags.tag }).from(recordTags).where(and(eq(recordTags.userId, ctx.user.id), eq(recordTags.recordId, change.recordId)));
        const tags = new Set(rows.map((row: { tag: string }) => row.tag));
        if (tags.has(operation.sourceTag) || !tags.has(operation.targetTag)) throw new TRPCError({ code: "CONFLICT", message: "병합 뒤 태그가 변경되어 안전하게 되돌릴 수 없습니다." });
      }
      if (savedSearchIds.length) {
        const searches = await transaction.select().from(savedRecordSearches).where(and(eq(savedRecordSearches.userId, ctx.user.id), inArray(savedRecordSearches.id, savedSearchIds)));
        if (searches.length !== savedSearchIds.length || searches.some((search: { tag: string | null }) => search.tag !== operation.targetTag)) throw new TRPCError({ code: "CONFLICT", message: "병합 뒤 저장 검색이 변경되어 안전하게 되돌릴 수 없습니다." });
      }
      for (const change of recordChanges) {
        const [record] = await transaction.select().from(records).where(and(eq(records.id, change.recordId), eq(records.userId, ctx.user.id))).limit(1);
        await assertOwned(record, ctx.user.id, "Record");
        if (change.mode === "collapsed") await transaction.insert(recordTags).values({ userId: ctx.user.id, recordId: change.recordId, tag: operation.sourceTag });
        else await transaction.update(recordTags).set({ tag: operation.sourceTag }).where(and(eq(recordTags.userId, ctx.user.id), eq(recordTags.recordId, change.recordId), eq(recordTags.tag, operation.targetTag)));
        await addHistoryWithDb(transaction, { userId: ctx.user.id, entityType: "Record", entityId: change.recordId, taskId: record.taskId, eventType: "updated", beforeData: { tag: operation.targetTag }, afterData: { tag: operation.sourceTag }, note: `Record 태그 병합 되돌리기: ${operation.targetTag} → ${operation.sourceTag}` });
      }
      if (savedSearchIds.length) await transaction.update(savedRecordSearches).set({ tag: operation.sourceTag }).where(and(eq(savedRecordSearches.userId, ctx.user.id), inArray(savedRecordSearches.id, savedSearchIds)));
      await transaction.update(tagMergeOperations).set({ undoneAt: new Date() }).where(and(eq(tagMergeOperations.id, operation.id), eq(tagMergeOperations.userId, ctx.user.id)));
      return { success: true, sourceTag: operation.sourceTag, targetTag: operation.targetTag, affectedRecordCount: recordChanges.length };
    });
  }),

  weeklySummary: protectedProcedure.input(z.object({ start: z.date(), end: z.date() })).query(async ({ ctx, input }) => {
    return getWeeklySummary(ctx.user.id, input.start, input.end);
  }),

  monthlyReview: protectedProcedure.input(z.object({ start: z.date(), end: z.date() })).query(async ({ ctx, input }) => {
    return getMonthlyReview(ctx.user.id, input.start, input.end);
  }),

  reviewNote: protectedProcedure.input(z.object({ periodStart: z.date(), periodEnd: z.date() })).query(async ({ ctx, input }) => {
    return getReviewNote(ctx.user.id, input.periodStart, input.periodEnd);
  }),

  saveReviewNote: protectedProcedure.input(z.object({ periodStart: z.date(), periodEnd: z.date(), content: z.string().trim().min(1).max(12000) })).mutation(async ({ ctx, input }) => {
    return saveReviewNote(ctx.user.id, input.periodStart, input.periodEnd, input.content);
  }),

  deleteReviewNote: protectedProcedure.input(z.object({ periodStart: z.date(), periodEnd: z.date() })).mutation(async ({ ctx, input }) => {
    return deleteReviewNote(ctx.user.id, input.periodStart, input.periodEnd);
  }),

  createProject: protectedProcedure.input(z.object({ title: z.string().trim().min(1).max(160), description: z.string().max(4000).optional(), color: z.string().max(24).optional() })).mutation(async ({ ctx, input }) => {
    const db = await databaseOrThrow();
    const [created] = await db.insert(projects).values({ userId: ctx.user.id, title: input.title, description: input.description ?? null, color: input.color ?? "#141414" }).$returningId();
    const [project] = await db.select().from(projects).where(and(eq(projects.id, created.id), eq(projects.userId, ctx.user.id))).limit(1);
    await addHistory({ userId: ctx.user.id, entityType: "Project", entityId: created.id, eventType: "created", afterData: { title: input.title } });
    return project;
  }),

  updateProject: protectedProcedure.input(z.object({ id: z.number().int().positive(), expectedRevision: z.number().int().positive().optional(), title: z.string().trim().min(1).max(160).optional(), description: z.string().max(4000).nullable().optional(), color: z.string().max(24).optional() })).mutation(async ({ ctx, input }) => {
    const db = await databaseOrThrow();
    const [existing] = await db.select().from(projects).where(and(eq(projects.id, input.id), eq(projects.userId, ctx.user.id))).limit(1);
    await assertOwned(existing, ctx.user.id, "Project");
    const { id, expectedRevision, ...values } = input;
    await updateWithRevision(db, projects, id, ctx.user.id, existing.revision, expectedRevision, values);
    await addHistory({ userId: ctx.user.id, entityType: "Project", entityId: id, eventType: "updated", beforeData: { title: existing.title }, afterData: values });
    return { success: true };
  }),

  archiveProject: protectedProcedure.input(z.object({ id: z.number().int().positive(), expectedRevision: z.number().int().positive().optional() })).mutation(async ({ ctx, input }) => {
    const db = await databaseOrThrow();
    const [existing] = await db.select().from(projects).where(and(eq(projects.id, input.id), eq(projects.userId, ctx.user.id))).limit(1);
    await assertOwned(existing, ctx.user.id, "Project");
    await updateWithRevision(db, projects, input.id, ctx.user.id, existing.revision, input.expectedRevision, { status: "archived", archivedAt: new Date() });
    await addHistory({ userId: ctx.user.id, entityType: "Project", entityId: input.id, eventType: "archived", beforeData: { status: existing.status }, afterData: { status: "archived" } });
    return { success: true };
  }),

  createStage: protectedProcedure.input(z.object({ projectId: z.number().int().positive(), title: z.string().trim().min(1).max(160) })).mutation(async ({ ctx, input }) => {
    const db = await databaseOrThrow();
    const [project] = await db.select().from(projects).where(and(eq(projects.id, input.projectId), eq(projects.userId, ctx.user.id))).limit(1);
    await assertOwned(project, ctx.user.id, "Project");
    const [created] = await db.insert(stages).values({ userId: ctx.user.id, projectId: input.projectId, title: input.title }).$returningId();
    const [stage] = await db.select().from(stages).where(and(eq(stages.id, created.id), eq(stages.userId, ctx.user.id))).limit(1);
    await addHistory({ userId: ctx.user.id, entityType: "Stage", entityId: created.id, eventType: "created", afterData: { title: input.title, projectId: input.projectId } });
    return stage;
  }),

  updateStage: protectedProcedure.input(z.object({ id: z.number().int().positive(), expectedRevision: z.number().int().positive().optional(), title: z.string().trim().min(1).max(160).optional(), status: z.enum(["active", "done", "archived"]).optional() })).mutation(async ({ ctx, input }) => {
    const db = await databaseOrThrow();
    const [existing] = await db.select().from(stages).where(and(eq(stages.id, input.id), eq(stages.userId, ctx.user.id))).limit(1);
    await assertOwned(existing, ctx.user.id, "Stage");
    const { id, expectedRevision, ...values } = input;
    await updateWithRevision(db, stages, id, ctx.user.id, existing.revision, expectedRevision, values);
    await addHistory({ userId: ctx.user.id, entityType: "Stage", entityId: id, eventType: values.status === "archived" ? "archived" : "updated", beforeData: { title: existing.title, status: existing.status }, afterData: values });
    return { success: true };
  }),

  createTask: protectedProcedure.input(taskInput).mutation(async ({ ctx, input }) => {
    const db = await databaseOrThrow();
    await assertOptionalLinks(ctx.user.id, input);
    const [created] = await db.insert(tasks).values({ ...input, userId: ctx.user.id, projectId: input.projectId ?? null, stageId: input.stageId ?? null, detail: input.detail ?? null, nextAction: input.nextAction ?? null }).$returningId();
    const [task] = await db.select().from(tasks).where(and(eq(tasks.id, created.id), eq(tasks.userId, ctx.user.id))).limit(1);
    await addHistory({ userId: ctx.user.id, entityType: "Task", entityId: created.id, taskId: created.id, eventType: "created", afterData: { title: input.title, status: input.status ?? "inbox" } });
    return task;
  }),

  updateTask: protectedProcedure.input(taskInput.partial().extend({ id: z.number().int().positive(), expectedRevision: z.number().int().positive().optional() })).mutation(async ({ ctx, input }) => {
    const db = await databaseOrThrow();
    const [existing] = await db.select().from(tasks).where(and(eq(tasks.id, input.id), eq(tasks.userId, ctx.user.id))).limit(1);
    await assertOwned(existing, ctx.user.id, "Task");
    await assertOptionalLinks(ctx.user.id, input);
    const { id, expectedRevision, ...values } = input;
    await updateWithRevision(db, tasks, id, ctx.user.id, existing.revision, expectedRevision, values);
    await addHistory({ userId: ctx.user.id, entityType: "Task", entityId: id, taskId: id, eventType: "updated", beforeData: { title: existing.title, status: existing.status, nextAction: existing.nextAction }, afterData: values });
    return { success: true };
  }),

  archiveTask: protectedProcedure.input(z.object({ id: z.number().int().positive(), expectedRevision: z.number().int().positive().optional() })).mutation(async ({ ctx, input }) => {
    const db = await databaseOrThrow();
    const [existing] = await db.select().from(tasks).where(and(eq(tasks.id, input.id), eq(tasks.userId, ctx.user.id))).limit(1);
    await assertOwned(existing, ctx.user.id, "Task");
    await updateWithRevision(db, tasks, input.id, ctx.user.id, existing.revision, input.expectedRevision, { status: "cancelled", archivedAt: new Date() });
    await addHistory({ userId: ctx.user.id, entityType: "Task", entityId: input.id, taskId: input.id, eventType: "archived", beforeData: { status: existing.status }, afterData: { status: "cancelled" } });
    return { success: true };
  }),

  bulkArchiveWorkspaceItems: protectedProcedure.input(z.object({ projectIds: z.array(z.number().int().positive()).max(50).default([]), stageIds: z.array(z.number().int().positive()).max(50).default([]), taskIds: z.array(z.number().int().positive()).max(50).default([]) }).refine(input => input.projectIds.length + input.stageIds.length + input.taskIds.length > 0, { message: "보관할 항목을 선택하세요." })).mutation(async ({ ctx, input }) => {
    const db = await databaseOrThrow();
    const now = new Date();
    const projectIds = Array.from(new Set(input.projectIds)); const stageIds = Array.from(new Set(input.stageIds)); const taskIds = Array.from(new Set(input.taskIds));
    const [ownedProjects, ownedStages, ownedTasks] = await Promise.all([
      Promise.all(projectIds.map(async id => { const [row] = await db.select().from(projects).where(and(eq(projects.id, id), eq(projects.userId, ctx.user.id))).limit(1); return assertOwned(row, ctx.user.id, "Project"); })),
      Promise.all(stageIds.map(async id => { const [row] = await db.select().from(stages).where(and(eq(stages.id, id), eq(stages.userId, ctx.user.id))).limit(1); return assertOwned(row, ctx.user.id, "Stage"); })),
      Promise.all(taskIds.map(async id => { const [row] = await db.select().from(tasks).where(and(eq(tasks.id, id), eq(tasks.userId, ctx.user.id))).limit(1); return assertOwned(row, ctx.user.id, "Task"); })),
    ]);
    for (const project of ownedProjects) { await db.update(projects).set({ status: "archived", archivedAt: now }).where(and(eq(projects.id, project.id), eq(projects.userId, ctx.user.id))); await addHistory({ userId: ctx.user.id, entityType: "Project", entityId: project.id, eventType: "archived", beforeData: { status: project.status }, afterData: { status: "archived" }, note: "일괄 정리" }); }
    for (const stage of ownedStages) { await db.update(stages).set({ status: "archived" }).where(and(eq(stages.id, stage.id), eq(stages.userId, ctx.user.id))); await addHistory({ userId: ctx.user.id, entityType: "Stage", entityId: stage.id, eventType: "archived", beforeData: { status: stage.status }, afterData: { status: "archived" }, note: "일괄 정리" }); }
    for (const task of ownedTasks) { await db.update(tasks).set({ status: "cancelled", archivedAt: now }).where(and(eq(tasks.id, task.id), eq(tasks.userId, ctx.user.id))); await addHistory({ userId: ctx.user.id, entityType: "Task", entityId: task.id, taskId: task.id, eventType: "archived", beforeData: { status: task.status }, afterData: { status: "cancelled" }, note: "일괄 정리" }); }
    return { success: true, counts: { projects: ownedProjects.length, stages: ownedStages.length, tasks: ownedTasks.length } };
  }),

  setTaskStatus: protectedProcedure.input(z.object({ id: z.number().int().positive(), expectedRevision: z.number().int().positive().optional(), status: taskStatus, nextAction: z.string().trim().max(320).nullable().optional() })).mutation(async ({ ctx, input }) => {
    const db = await databaseOrThrow();
    const [existing] = await db.select().from(tasks).where(and(eq(tasks.id, input.id), eq(tasks.userId, ctx.user.id))).limit(1);
    await assertOwned(existing, ctx.user.id, "Task");
    const { values, eventType } = deriveTaskStateChange({
      currentStatus: existing.status as TaskStatus,
      targetStatus: input.status,
      currentStartedAt: existing.startedAt,
      nextAction: input.nextAction,
      now: new Date(),
    });
    await updateWithRevision(db, tasks, input.id, ctx.user.id, existing.revision, input.expectedRevision, values);
    await addHistory({ userId: ctx.user.id, entityType: "Task", entityId: input.id, taskId: input.id, eventType, beforeData: { status: existing.status }, afterData: { status: input.status, nextAction: values.nextAction ?? existing.nextAction } });
    return { success: true };
  }),

  createSchedule: protectedProcedure.input(z.object({ title: z.string().trim().min(1).max(220), taskId: z.number().int().positive().nullable().optional(), plannedStartAt: z.date().nullable().optional(), plannedEndAt: z.date().nullable().optional(), notes: z.string().max(4000).nullable().optional() })).mutation(async ({ ctx, input }) => {
    const db = await databaseOrThrow();
    await assertOptionalLinks(ctx.user.id, input);
    const [created] = await db.insert(schedules).values({ userId: ctx.user.id, title: input.title, taskId: input.taskId ?? null, plannedStartAt: input.plannedStartAt ?? null, plannedEndAt: input.plannedEndAt ?? null, notes: input.notes ?? null }).$returningId();
    const [schedule] = await db.select().from(schedules).where(and(eq(schedules.id, created.id), eq(schedules.userId, ctx.user.id))).limit(1);
    await addHistory({ userId: ctx.user.id, entityType: "Schedule", entityId: created.id, taskId: input.taskId, eventType: "created", afterData: { title: input.title, plannedStartAt: input.plannedStartAt?.toISOString() ?? null } });
    return schedule;
  }),

  updateSchedule: protectedProcedure.input(z.object({ id: z.number().int().positive(), expectedRevision: z.number().int().positive().optional(), title: z.string().trim().min(1).max(220).optional(), taskId: z.number().int().positive().nullable().optional(), plannedStartAt: z.date().nullable().optional(), plannedEndAt: z.date().nullable().optional(), notes: z.string().max(4000).nullable().optional() })).mutation(async ({ ctx, input }) => {
    const db = await databaseOrThrow();
    const [existing] = await db.select().from(schedules).where(and(eq(schedules.id, input.id), eq(schedules.userId, ctx.user.id))).limit(1);
    await assertOwned(existing, ctx.user.id, "Schedule");
    await assertOptionalLinks(ctx.user.id, input);
    const { id, expectedRevision, ...values } = input;
    await updateWithRevision(db, schedules, id, ctx.user.id, existing.revision, expectedRevision, values);
    await addHistory({ userId: ctx.user.id, entityType: "Schedule", entityId: id, taskId: input.taskId ?? existing.taskId, eventType: "updated", beforeData: { title: existing.title, plannedStartAt: existing.plannedStartAt?.toISOString() ?? null, taskId: existing.taskId }, afterData: values });
    return { success: true };
  }),

  setScheduleStatus: protectedProcedure.input(z.object({ id: z.number().int().positive(), expectedRevision: z.number().int().positive().optional(), status: scheduleStatus })).mutation(async ({ ctx, input }) => {
    const db = await databaseOrThrow();
    const [existing] = await db.select().from(schedules).where(and(eq(schedules.id, input.id), eq(schedules.userId, ctx.user.id))).limit(1);
    await assertOwned(existing, ctx.user.id, "Schedule");
    const now = new Date();
    const values: { status: typeof input.status; actualStartedAt?: Date; actualCompletedAt?: Date } = { status: input.status };
    if (input.status === "in_progress" && !existing.actualStartedAt) values.actualStartedAt = now;
    if (input.status === "completed") values.actualCompletedAt = now;
    await updateWithRevision(db, schedules, input.id, ctx.user.id, existing.revision, input.expectedRevision, values);
    await addHistory({ userId: ctx.user.id, entityType: "Schedule", entityId: input.id, taskId: existing.taskId, eventType: input.status === "in_progress" ? "started" : input.status === "completed" ? "completed" : "updated", beforeData: { status: existing.status }, afterData: { status: input.status } });
    return { success: true };
  }),

  captureRecord: protectedProcedure.input(z.object({ content: z.string().trim().min(1).max(12000), sourceType: z.enum(["capture", "work_log", "journal", "link"]).optional(), projectId: z.number().int().positive().nullable().optional(), stageId: z.number().int().positive().nullable().optional(), taskId: z.number().int().positive().nullable().optional(), scheduleId: z.number().int().positive().nullable().optional(), clientRequestId: z.string().uuid().nullable().optional(), tags: z.array(z.string().trim().min(1).max(64)).max(8).optional() })).mutation(async ({ ctx, input }) => {
    const db = await databaseOrThrow();
    if (input.clientRequestId) {
      const [existing] = await db.select().from(records).where(and(eq(records.userId, ctx.user.id), eq(records.clientRequestId, input.clientRequestId))).limit(1);
      if (existing) return existing;
    }
    await assertOptionalLinks(ctx.user.id, input);
    const linked = Boolean(input.projectId || input.stageId || input.taskId || input.scheduleId);
    const tags = Array.from(new Set((input.tags ?? []).map(tag => tag.replace(/\s+/g, " "))));
    const { tags: _tags, ...recordInput } = input;
    try {
      return await inTransaction(db, async transaction => {
        const [created] = await transaction.insert(records).values({ ...recordInput, userId: ctx.user.id, sourceType: input.sourceType ?? "capture", projectId: input.projectId ?? null, stageId: input.stageId ?? null, taskId: input.taskId ?? null, scheduleId: input.scheduleId ?? null, recordKind: linked ? "linked" : "captured" }).$returningId();
        if (tags.length) await transaction.insert(recordTags).values(tags.map(tag => ({ userId: ctx.user.id, recordId: created.id, tag })));
        const [record] = await transaction.select().from(records).where(and(eq(records.id, created.id), eq(records.userId, ctx.user.id))).limit(1);
        await addHistoryWithDb(transaction, { userId: ctx.user.id, entityType: "Record", entityId: created.id, taskId: input.taskId, eventType: linked ? "linked" : "created", afterData: { sourceType: input.sourceType ?? "capture", taskId: input.taskId ?? null, tags } });
        return record;
      });
    } catch (error) {
      if (input.clientRequestId) {
        const [existing] = await db.select().from(records).where(and(eq(records.userId, ctx.user.id), eq(records.clientRequestId, input.clientRequestId))).limit(1);
        if (existing) return existing;
      }
      throw error;
    }
  }),

  uploadAttachment: protectedProcedure.input(z.object({
    recordId: z.number().int().positive(),
    fileName: z.string().trim().min(1).max(320),
    mimeType: z.string().trim().min(1).max(180),
    clientUploadId: z.string().uuid().nullable().optional(),
    base64Data: z.string().min(1).max(10_700_000),
  })).mutation(async ({ ctx, input }) => {
    const db = await databaseOrThrow();
    if (input.clientUploadId) {
      const [existing] = await db.select().from(attachments).where(and(eq(attachments.userId, ctx.user.id), eq(attachments.clientUploadId, input.clientUploadId))).limit(1);
      if (existing) return existing;
    }
    const [record] = await db.select().from(records).where(and(eq(records.id, input.recordId), eq(records.userId, ctx.user.id))).limit(1);
    await assertOwned(record, ctx.user.id, "Record");

    const buffer = Buffer.from(input.base64Data, "base64");
    if (buffer.byteLength === 0 || buffer.byteLength > 8 * 1024 * 1024) {
      throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "첨부 파일은 8MB 이하만 저장할 수 있습니다." });
    }
    const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storageFileName = input.clientUploadId ? `${input.clientUploadId}-${safeName}` : safeName;
    const { key, url } = await storagePut(`${ctx.user.id}/records/${input.recordId}/${storageFileName}`, buffer, input.mimeType);
    try {
      return await inTransaction(db, async transaction => {
        const [created] = await transaction.insert(attachments).values({
          userId: ctx.user.id,
          recordId: input.recordId,
          clientUploadId: input.clientUploadId ?? null,
          storageKey: key,
          url,
          fileName: input.fileName,
          mimeType: input.mimeType,
          size: buffer.byteLength,
        }).$returningId();
        const [attachment] = await transaction.select().from(attachments).where(and(eq(attachments.id, created.id), eq(attachments.userId, ctx.user.id))).limit(1);
        await addHistoryWithDb(transaction, { userId: ctx.user.id, entityType: "Attachment", entityId: created.id, taskId: record.taskId, eventType: "created", afterData: { fileName: input.fileName, recordId: input.recordId } });
        return attachment;
      });
    } catch (error) {
      if (input.clientUploadId) {
        const [existing] = await db.select().from(attachments).where(and(eq(attachments.userId, ctx.user.id), eq(attachments.clientUploadId, input.clientUploadId))).limit(1);
        if (existing) return existing;
      }
      throw error;
    }
  }),

  taskHistory: protectedProcedure.input(z.object({ taskId: z.number().int().positive() })).query(async ({ ctx, input }) => {
    const db = await databaseOrThrow();
    return db.select().from(histories).where(and(eq(histories.userId, ctx.user.id), eq(histories.taskId, input.taskId))).orderBy(desc(histories.occurredAt));
  }),
});
