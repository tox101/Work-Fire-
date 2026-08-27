import { and, asc, desc, eq, gte, inArray, isNotNull, like, lt, ne, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { orderRecordTagUsageStats } from "./domain/recordTagUsage";
import {
  attachments,
  histories,
  InsertUser,
  projects,
  records,
  recordTags,
  reviewNotes,
  savedRecordSearches,
  schedules,
  stages,
  tasks,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { getWeeklyChange } from "./domain/weeklyComparison";
import { buildMonthlyReview } from "./domain/monthlyReview";
import { filterActiveWorkspaceItems } from "./domain/workspaceActiveItems";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId, lastSignedIn: user.lastSignedIn ?? new Date() };
  const updateSet: Record<string, unknown> = { lastSignedIn: values.lastSignedIn };
  const textFields = ["name", "email", "loginMethod"] as const;
  textFields.forEach(field => {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  });
  values.role = user.role ?? (user.openId === ENV.ownerOpenId ? "admin" : "user");
  updateSet.role = values.role;
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getWorkspaceSnapshot(userId: number, start: Date, end: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database connection is unavailable");

  const [projectRows, stageRows, taskRows, scheduleRows, recentRecords] = await Promise.all([
    db.select().from(projects).where(and(eq(projects.userId, userId), eq(projects.status, "active"))).orderBy(asc(projects.sortOrder), desc(projects.updatedAt)),
    db.select().from(stages).where(and(eq(stages.userId, userId), ne(stages.status, "archived"))).orderBy(asc(stages.sortOrder), desc(stages.updatedAt)),
    db.select().from(tasks).where(and(eq(tasks.userId, userId), ne(tasks.status, "cancelled"))).orderBy(desc(tasks.updatedAt)),
    db.select().from(schedules)
      .where(and(eq(schedules.userId, userId), gte(schedules.plannedStartAt, start), lt(schedules.plannedStartAt, end)))
      .orderBy(asc(schedules.plannedStartAt)),
    db.select().from(records).where(eq(records.userId, userId)).orderBy(desc(records.createdAt)).limit(12),
  ]);

  const activeItems = filterActiveWorkspaceItems(projectRows, stageRows, taskRows);
  return { ...activeItems, schedules: scheduleRows, recentRecords };
}

export async function getArchivedWorkspace(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection is unavailable");
  const [archivedProjects, archivedStages, archivedTasks, historyRows] = await Promise.all([
    db.select().from(projects).where(and(eq(projects.userId, userId), eq(projects.status, "archived"))).orderBy(desc(projects.archivedAt), desc(projects.updatedAt)),
    db.select().from(stages).where(and(eq(stages.userId, userId), eq(stages.status, "archived"))).orderBy(desc(stages.updatedAt)),
    db.select().from(tasks).where(and(eq(tasks.userId, userId), eq(tasks.status, "cancelled"), isNotNull(tasks.archivedAt))).orderBy(desc(tasks.archivedAt), desc(tasks.updatedAt)),
    db.select({ entityType: histories.entityType, entityId: histories.entityId, eventType: histories.eventType, occurredAt: histories.occurredAt, note: histories.note }).from(histories).where(eq(histories.userId, userId)).orderBy(desc(histories.occurredAt)),
  ]);
  const latestArchiveByEntity = new Map<string, { occurredAt: Date; note: string | null }>();
  historyRows.filter(row => row.eventType === "archived").forEach(row => {
    const key = `${row.entityType}:${row.entityId}`;
    if (!latestArchiveByEntity.has(key)) latestArchiveByEntity.set(key, { occurredAt: row.occurredAt, note: row.note });
  });
  const withHistory = <T extends { id: number }>(entityType: "Project" | "Stage" | "Task", items: T[]) => items.map(item => ({ ...item, archiveHistory: latestArchiveByEntity.get(`${entityType}:${item.id}`) ?? null }));
  return { projects: withHistory("Project", archivedProjects), stages: withHistory("Stage", archivedStages), tasks: withHistory("Task", archivedTasks) };
}

export async function getWorkspaceExportData(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection is unavailable");
  const [projectRows, stageRows, taskRows, recordRows, tagRows] = await Promise.all([
    db.select().from(projects).where(eq(projects.userId, userId)).orderBy(asc(projects.sortOrder), asc(projects.createdAt)),
    db.select().from(stages).where(eq(stages.userId, userId)).orderBy(asc(stages.sortOrder), asc(stages.createdAt)),
    db.select().from(tasks).where(eq(tasks.userId, userId)).orderBy(asc(tasks.createdAt)),
    db.select().from(records).where(eq(records.userId, userId)).orderBy(asc(records.createdAt)),
    db.select({ recordId: recordTags.recordId, tag: recordTags.tag }).from(recordTags).where(eq(recordTags.userId, userId)).orderBy(asc(recordTags.createdAt)),
  ]);
  const tagsByRecord = new Map<number, string[]>();
  tagRows.forEach(row => tagsByRecord.set(row.recordId, [...(tagsByRecord.get(row.recordId) ?? []), row.tag]));
  return { exportedAt: new Date(), projects: projectRows, stages: stageRows, tasks: taskRows, records: recordRows.map(record => ({ ...record, tags: tagsByRecord.get(record.id) ?? [] })) };
}

export type RecordSearchInput = {
  query?: string;
  projectId?: number | null;
  taskId?: number | null;
  sourceType?: "capture" | "work_log" | "journal" | "link" | null;
  start?: Date | null;
  end?: Date | null;
  sort?: "newest" | "oldest" | "pinned";
  tag?: string | null;
};

export async function getRecordSearch(userId: number, input: RecordSearchInput) {
  const db = await getDb();
  if (!db) throw new Error("Database connection is unavailable");

  const query = input.query?.trim();
  const conditions = [eq(records.userId, userId)];
  if (query) conditions.push(like(records.content, `%${query}%`));
  if (input.projectId) conditions.push(or(eq(records.projectId, input.projectId), eq(tasks.projectId, input.projectId))!);
  if (input.taskId) conditions.push(eq(records.taskId, input.taskId));
  if (input.sourceType) conditions.push(eq(records.sourceType, input.sourceType));
  if (input.start) conditions.push(gte(records.createdAt, input.start));
  if (input.end) conditions.push(lt(records.createdAt, input.end));
  if (input.tag) {
    const taggedRows = await db.select({ recordId: recordTags.recordId }).from(recordTags)
      .where(and(eq(recordTags.userId, userId), eq(recordTags.tag, input.tag)));
    const taggedRecordIds = taggedRows.map(row => row.recordId);
    if (!taggedRecordIds.length) return [];
    conditions.push(inArray(records.id, taggedRecordIds));
  }

  const order = input.sort === "oldest" ? [asc(records.createdAt)] : input.sort === "pinned" ? [desc(records.isPinned), desc(records.createdAt)] : [desc(records.createdAt)];
  const rows = await db.select({ id: records.id, content: records.content, sourceType: records.sourceType, isPinned: records.isPinned, createdAt: records.createdAt, projectId: records.projectId, projectTitle: projects.title, taskId: records.taskId, taskTitle: tasks.title, stageTitle: stages.title }).from(records)
    .leftJoin(projects, and(eq(records.projectId, projects.id), eq(projects.userId, userId)))
    .leftJoin(tasks, and(eq(records.taskId, tasks.id), eq(tasks.userId, userId)))
    .leftJoin(stages, and(eq(records.stageId, stages.id), eq(stages.userId, userId)))
    .where(and(...conditions)).orderBy(...order).limit(100);
  const recordIds = rows.map(row => row.id);
  const attachmentRows = recordIds.length ? await db.select({ recordId: attachments.recordId }).from(attachments).where(and(eq(attachments.userId, userId), inArray(attachments.recordId, recordIds))) : [];
  const attachmentCountByRecord = new Map<number, number>();
  attachmentRows.forEach(row => attachmentCountByRecord.set(row.recordId, (attachmentCountByRecord.get(row.recordId) ?? 0) + 1));
  const tagRows = recordIds.length ? await db.select({ recordId: recordTags.recordId, tag: recordTags.tag }).from(recordTags)
    .where(and(eq(recordTags.userId, userId), inArray(recordTags.recordId, recordIds))).orderBy(asc(recordTags.tag)) : [];
  const tagsByRecord = new Map<number, string[]>();
  tagRows.forEach(row => tagsByRecord.set(row.recordId, [...(tagsByRecord.get(row.recordId) ?? []), row.tag]));
  return rows.map(row => ({ ...row, attachmentCount: attachmentCountByRecord.get(row.id) ?? 0, tags: tagsByRecord.get(row.id) ?? [] }));
}

export async function getRecordTagOptions(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection is unavailable");
  const rows = await db.select({ tag: recordTags.tag }).from(recordTags).where(eq(recordTags.userId, userId)).orderBy(asc(recordTags.tag));
  return Array.from(new Set(rows.map(row => row.tag)));
}

export async function getRecentRecordTags(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection is unavailable");
  const rows = await db.select({ tag: recordTags.tag }).from(recordTags)
    .where(eq(recordTags.userId, userId)).orderBy(desc(recordTags.createdAt), asc(recordTags.tag)).limit(100);
  return Array.from(new Set(rows.map(row => row.tag))).slice(0, 8);
}

export async function getRecordTagStats(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection is unavailable");
  const usageCount = sql<number>`count(*)`;
  const lastUsedAt = sql<Date>`max(${recordTags.createdAt})`;
  const stats = await db.select({ tag: recordTags.tag, usageCount, lastUsedAt }).from(recordTags)
    .where(eq(recordTags.userId, userId))
    .groupBy(recordTags.tag)
    .orderBy(desc(lastUsedAt), desc(usageCount), asc(recordTags.tag))
    .limit(12);
  return orderRecordTagUsageStats(stats);
}

export type SavedRecordSearchInput = {
  name: string;
  query?: string | null;
  projectId?: number | null;
  taskId?: number | null;
  sourceType?: "capture" | "work_log" | "journal" | "link" | null;
  period?: "all" | "month";
  sort?: "newest" | "oldest" | "pinned";
  tag?: string | null;
};

export async function getSavedRecordSearches(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection is unavailable");
  return db.select().from(savedRecordSearches)
    .where(eq(savedRecordSearches.userId, userId))
    .orderBy(asc(savedRecordSearches.sortOrder), desc(savedRecordSearches.updatedAt), asc(savedRecordSearches.name));
}

export async function createSavedRecordSearch(userId: number, input: SavedRecordSearchInput) {
  const db = await getDb();
  if (!db) throw new Error("Database connection is unavailable");
  const existing = await getSavedRecordSearches(userId);
  const [created] = await db.insert(savedRecordSearches).values({
    userId,
    name: input.name,
    query: input.query ?? null,
    projectId: input.projectId ?? null,
    taskId: input.taskId ?? null,
    sourceType: input.sourceType ?? null,
    period: input.period ?? "all",
    sort: input.sort ?? "newest",
    tag: input.tag ?? null,
    sortOrder: existing.length,
  }).$returningId();
  const [savedSearch] = await db.select().from(savedRecordSearches)
    .where(and(eq(savedRecordSearches.id, created.id), eq(savedRecordSearches.userId, userId))).limit(1);
  return savedSearch!;
}

export async function deleteSavedRecordSearch(userId: number, id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection is unavailable");
  await db.delete(savedRecordSearches).where(and(eq(savedRecordSearches.id, id), eq(savedRecordSearches.userId, userId)));
  return { success: true };
}

export async function moveSavedRecordSearch(userId: number, id: number, direction: "up" | "down") {
  const db = await getDb();
  if (!db) throw new Error("Database connection is unavailable");
  const ordered = await getSavedRecordSearches(userId);
  const index = ordered.findIndex(item => item.id === id);
  const destination = direction === "up" ? index - 1 : index + 1;
  if (index < 0) return null;
  if (destination >= 0 && destination < ordered.length) [ordered[index], ordered[destination]] = [ordered[destination], ordered[index]];
  await Promise.all(ordered.map((item, sortOrder) => db.update(savedRecordSearches).set({ sortOrder }).where(and(eq(savedRecordSearches.id, item.id), eq(savedRecordSearches.userId, userId)))));
  return { success: true };
}

export async function getPinnedRecordSummaries(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection is unavailable");

  return db.select({
    id: records.id,
    content: records.content,
    sourceType: records.sourceType,
    createdAt: records.createdAt,
    projectTitle: projects.title,
    stageTitle: stages.title,
    taskTitle: tasks.title,
  }).from(records)
    .leftJoin(projects, and(eq(records.projectId, projects.id), eq(projects.userId, userId)))
    .leftJoin(tasks, and(eq(records.taskId, tasks.id), eq(tasks.userId, userId)))
    .leftJoin(stages, and(eq(records.stageId, stages.id), eq(stages.userId, userId)))
    .where(and(eq(records.userId, userId), eq(records.isPinned, true)))
    .orderBy(desc(records.updatedAt), desc(records.createdAt))
    .limit(3);
}

export async function getRecordDetail(userId: number, recordId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection is unavailable");

  const [record] = await db.select({ id: records.id, content: records.content, sourceType: records.sourceType, recordKind: records.recordKind, isPinned: records.isPinned, createdAt: records.createdAt, updatedAt: records.updatedAt, projectTitle: projects.title, stageTitle: stages.title, taskTitle: tasks.title }).from(records)
    .leftJoin(projects, and(eq(records.projectId, projects.id), eq(projects.userId, userId)))
    .leftJoin(tasks, and(eq(records.taskId, tasks.id), eq(tasks.userId, userId)))
    .leftJoin(stages, and(eq(records.stageId, stages.id), eq(stages.userId, userId)))
    .where(and(eq(records.userId, userId), eq(records.id, recordId))).limit(1);
  if (!record) return null;

  const attachmentRows = await db.select({ id: attachments.id, fileName: attachments.fileName, url: attachments.url, mimeType: attachments.mimeType, size: attachments.size, capturedAt: attachments.capturedAt }).from(attachments)
    .where(and(eq(attachments.userId, userId), eq(attachments.recordId, recordId))).orderBy(asc(attachments.capturedAt));
  const tagRows = await db.select({ tag: recordTags.tag }).from(recordTags)
    .where(and(eq(recordTags.userId, userId), eq(recordTags.recordId, recordId))).orderBy(asc(recordTags.tag));
  return { ...record, attachments: attachmentRows, tags: tagRows.map(row => row.tag) };
}

export async function getWeeklySummary(userId: number, start: Date, end: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database connection is unavailable");

  const duration = end.getTime() - start.getTime();
  const previousStart = new Date(start.getTime() - duration);

  const countWindow = async (windowStart: Date, windowEnd: Date) => {
    const [completedTasks, createdRecords, completedSchedules] = await Promise.all([
      db.select({ id: tasks.id }).from(tasks).where(and(eq(tasks.userId, userId), eq(tasks.status, "done"), gte(tasks.completedAt, windowStart), lt(tasks.completedAt, windowEnd))),
      db.select({ id: records.id }).from(records).where(and(eq(records.userId, userId), gte(records.createdAt, windowStart), lt(records.createdAt, windowEnd))),
      db.select({ id: schedules.id }).from(schedules).where(and(eq(schedules.userId, userId), eq(schedules.status, "completed"), gte(schedules.actualCompletedAt, windowStart), lt(schedules.actualCompletedAt, windowEnd))),
    ]);
    return { completedTaskCount: completedTasks.length, recordCount: createdRecords.length, completedScheduleCount: completedSchedules.length };
  };

  const [current, previous] = await Promise.all([countWindow(start, end), countWindow(previousStart, start)]);

  return {
    ...current,
    change: getWeeklyChange(current, previous),
  };
}

export async function getMonthlyReview(userId: number, start: Date, end: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database connection is unavailable");

  const previousStart = new Date(start);
  previousStart.setMonth(previousStart.getMonth() - 1);

  const [completedTasks, monthRecords, completedSchedules, previousCompletedTasks, previousRecords, activeProjects, allProjects, userTasks] = await Promise.all([
    db.select({ id: tasks.id, title: tasks.title, projectId: tasks.projectId, stageId: tasks.stageId, nextAction: tasks.nextAction, startedAt: tasks.startedAt, completedAt: tasks.completedAt, projectTitle: projects.title, stageTitle: stages.title }).from(tasks).leftJoin(projects, and(eq(tasks.projectId, projects.id), eq(projects.userId, userId))).leftJoin(stages, and(eq(tasks.stageId, stages.id), eq(stages.userId, userId))).where(and(eq(tasks.userId, userId), eq(tasks.status, "done"), gte(tasks.completedAt, start), lt(tasks.completedAt, end))),
    db.select({ id: records.id }).from(records).where(and(eq(records.userId, userId), gte(records.createdAt, start), lt(records.createdAt, end))),
    db.select({ id: schedules.id }).from(schedules).where(and(eq(schedules.userId, userId), eq(schedules.status, "completed"), gte(schedules.actualCompletedAt, start), lt(schedules.actualCompletedAt, end))),
    db.select({ id: tasks.id, projectId: tasks.projectId, startedAt: tasks.startedAt, completedAt: tasks.completedAt }).from(tasks).where(and(eq(tasks.userId, userId), eq(tasks.status, "done"), gte(tasks.completedAt, previousStart), lt(tasks.completedAt, start))),
    db.select({ id: records.id }).from(records).where(and(eq(records.userId, userId), gte(records.createdAt, previousStart), lt(records.createdAt, start))),
    db.select({ id: projects.id, title: projects.title }).from(projects).where(and(eq(projects.userId, userId), eq(projects.status, "active"))).orderBy(asc(projects.sortOrder), desc(projects.updatedAt)),
    db.select({ id: projects.id, title: projects.title }).from(projects).where(eq(projects.userId, userId)).orderBy(asc(projects.sortOrder), desc(projects.updatedAt)),
    db.select({ projectId: tasks.projectId, status: tasks.status, nextAction: tasks.nextAction }).from(tasks).where(eq(tasks.userId, userId)),
  ]);

  const completedTaskIds = completedTasks.map(task => task.id);
  const linkedRecords = completedTaskIds.length ? await db.select({ id: records.id, taskId: records.taskId, content: records.content }).from(records).where(and(eq(records.userId, userId), inArray(records.taskId, completedTaskIds))).orderBy(desc(records.createdAt)) : [];
  const linkedRecordIds = linkedRecords.map(record => record.id);
  const linkedAttachments = linkedRecordIds.length ? await db.select({ id: attachments.id, recordId: attachments.recordId, fileName: attachments.fileName, url: attachments.url, mimeType: attachments.mimeType }).from(attachments).where(and(eq(attachments.userId, userId), inArray(attachments.recordId, linkedRecordIds))).orderBy(desc(attachments.createdAt)) : [];
  const recordsByTask = new Map<number, Array<{ id: number; content: string; attachments: Array<{ id: number; fileName: string; url: string; mimeType: string }> }>>();
  linkedRecords.forEach(record => {
    if (!record.taskId) return;
    recordsByTask.set(record.taskId, [...(recordsByTask.get(record.taskId) ?? []), { id: record.id, content: record.content, attachments: linkedAttachments.filter(attachment => attachment.recordId === record.id).map(({ recordId: _recordId, ...attachment }) => attachment) }]);
  });

  return buildMonthlyReview({
    completedTasks,
    completedTaskDetails: completedTasks.map(task => ({ ...task, records: recordsByTask.get(task.id) ?? [] })),
    recordCount: monthRecords.length,
    completedScheduleCount: completedSchedules.length,
    previousCompletedTasks,
    previousRecordCount: previousRecords.length,
    activeProjects,
    allProjects,
    tasks: userTasks,
  });
}

export async function getReviewNote(userId: number, periodStart: Date, periodEnd: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database connection is unavailable");
  const [note] = await db.select().from(reviewNotes).where(and(eq(reviewNotes.userId, userId), eq(reviewNotes.periodStart, periodStart), eq(reviewNotes.periodEnd, periodEnd))).limit(1);
  return note ?? null;
}

export async function saveReviewNote(userId: number, periodStart: Date, periodEnd: Date, content: string) {
  const db = await getDb();
  if (!db) throw new Error("Database connection is unavailable");
  const existing = await getReviewNote(userId, periodStart, periodEnd);
  if (existing) {
    await db.update(reviewNotes).set({ content }).where(and(eq(reviewNotes.id, existing.id), eq(reviewNotes.userId, userId)));
    const [updated] = await db.select().from(reviewNotes).where(and(eq(reviewNotes.id, existing.id), eq(reviewNotes.userId, userId))).limit(1);
    return updated!;
  }
  const [created] = await db.insert(reviewNotes).values({ userId, periodStart, periodEnd, content }).$returningId();
  const [note] = await db.select().from(reviewNotes).where(and(eq(reviewNotes.id, created.id), eq(reviewNotes.userId, userId))).limit(1);
  return note!;
}

export async function deleteReviewNote(userId: number, periodStart: Date, periodEnd: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database connection is unavailable");
  await db.delete(reviewNotes).where(and(eq(reviewNotes.userId, userId), eq(reviewNotes.periodStart, periodStart), eq(reviewNotes.periodEnd, periodEnd)));
  return { success: true };
}

export async function getContinueContext(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection is unavailable");

  const candidateTasks = await db.select().from(tasks).where(eq(tasks.userId, userId)).orderBy(desc(tasks.updatedAt)).limit(20);
  const task = candidateTasks.find(item => item.status === "in_progress") ?? candidateTasks.find(item => item.status !== "done" && item.status !== "cancelled");
  if (!task) return null;

  const [lastRecord, project, stage, history] = await Promise.all([
    db.select().from(records).where(and(eq(records.userId, userId), eq(records.taskId, task.id))).orderBy(desc(records.createdAt)).limit(1),
    task.projectId ? db.select().from(projects).where(and(eq(projects.id, task.projectId), eq(projects.userId, userId))).limit(1) : Promise.resolve([]),
    task.stageId ? db.select().from(stages).where(and(eq(stages.id, task.stageId), eq(stages.userId, userId))).limit(1) : Promise.resolve([]),
    db.select().from(histories).where(and(eq(histories.userId, userId), eq(histories.taskId, task.id))).orderBy(desc(histories.occurredAt)).limit(6),
  ]);

  return { task, lastRecord: lastRecord[0] ?? null, project: project[0] ?? null, stage: stage[0] ?? null, history };
}

export async function getAttachmentsForRecord(userId: number, recordId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection is unavailable");
  return db.select().from(attachments).where(and(eq(attachments.userId, userId), eq(attachments.recordId, recordId)));
}

export async function getAttachmentByStorageKey(userId: number, storageKey: string) {
  const db = await getDb();
  if (!db) throw new Error("Database connection is unavailable");
  const result = await db.select().from(attachments).where(and(eq(attachments.userId, userId), eq(attachments.storageKey, storageKey))).limit(1);
  return result[0];
}
