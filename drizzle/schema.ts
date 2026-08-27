import {
  boolean,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const projects = mysqlTable(
  "projects",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 160 }).notNull(),
    description: text("description"),
    color: varchar("color", { length: 24 }).default("#141414").notNull(),
    status: mysqlEnum("status", ["active", "archived"]).default("active").notNull(),
    revision: int("revision").default(1).notNull(),
    sortOrder: int("sortOrder").default(0).notNull(),
    archivedAt: timestamp("archivedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("projects_user_status_idx").on(table.userId, table.status)],
);

export const stages = mysqlTable(
  "stages",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 160 }).notNull(),
    status: mysqlEnum("status", ["active", "done", "archived"]).default("active").notNull(),
    revision: int("revision").default(1).notNull(),
    sortOrder: int("sortOrder").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("stages_user_project_idx").on(table.userId, table.projectId)],
);

export const tasks = mysqlTable(
  "tasks",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    projectId: int("projectId").references(() => projects.id, { onDelete: "set null" }),
    stageId: int("stageId").references(() => stages.id, { onDelete: "set null" }),
    title: varchar("title", { length: 220 }).notNull(),
    detail: text("detail"),
    nextAction: varchar("nextAction", { length: 320 }),
    status: mysqlEnum("status", ["inbox", "planned", "in_progress", "done", "on_hold", "cancelled"])
      .default("inbox")
      .notNull(),
    priority: mysqlEnum("priority", ["low", "normal", "high"]).default("normal").notNull(),
    revision: int("revision").default(1).notNull(),
    sortOrder: int("sortOrder").default(0).notNull(),
    startedAt: timestamp("startedAt"),
    completedAt: timestamp("completedAt"),
    archivedAt: timestamp("archivedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("tasks_user_status_updated_idx").on(table.userId, table.status, table.updatedAt),
    index("tasks_user_project_idx").on(table.userId, table.projectId),
    index("tasks_user_stage_idx").on(table.userId, table.stageId),
  ],
);

export const schedules = mysqlTable(
  "schedules",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    taskId: int("taskId").references(() => tasks.id, { onDelete: "set null" }),
    title: varchar("title", { length: 220 }).notNull(),
    revision: int("revision").default(1).notNull(),
    plannedStartAt: timestamp("plannedStartAt"),
    plannedEndAt: timestamp("plannedEndAt"),
    status: mysqlEnum("status", ["planned", "in_progress", "completed", "cancelled"])
      .default("planned")
      .notNull(),
    actualStartedAt: timestamp("actualStartedAt"),
    actualCompletedAt: timestamp("actualCompletedAt"),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("schedules_user_planned_idx").on(table.userId, table.plannedStartAt),
    index("schedules_user_task_idx").on(table.userId, table.taskId),
  ],
);

export const records = mysqlTable(
  "records",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    projectId: int("projectId").references(() => projects.id, { onDelete: "set null" }),
    stageId: int("stageId").references(() => stages.id, { onDelete: "set null" }),
    taskId: int("taskId").references(() => tasks.id, { onDelete: "set null" }),
    scheduleId: int("scheduleId").references(() => schedules.id, { onDelete: "set null" }),
    clientRequestId: varchar("clientRequestId", { length: 80 }),
    content: text("content").notNull(),
    sourceType: mysqlEnum("sourceType", ["capture", "work_log", "journal", "link"])
      .default("capture")
      .notNull(),
    recordKind: mysqlEnum("recordKind", ["captured", "linked", "classified"]).default("captured").notNull(),
    isPinned: boolean("isPinned").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("records_user_created_idx").on(table.userId, table.createdAt),
    uniqueIndex("records_user_client_request_idx").on(table.userId, table.clientRequestId),
    index("records_user_pinned_created_idx").on(table.userId, table.isPinned, table.createdAt),
    index("records_user_task_created_idx").on(table.userId, table.taskId, table.createdAt),
  ],
);

export const recordTags = mysqlTable(
  "recordTags",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    recordId: int("recordId").notNull().references(() => records.id, { onDelete: "cascade" }),
    tag: varchar("tag", { length: 64 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    uniqueIndex("record_tags_user_record_tag_idx").on(table.userId, table.recordId, table.tag),
    index("record_tags_user_tag_record_idx").on(table.userId, table.tag, table.recordId),
  ],
);

export const tagMergeOperations = mysqlTable(
  "tagMergeOperations",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    sourceTag: varchar("sourceTag", { length: 64 }).notNull(),
    targetTag: varchar("targetTag", { length: 64 }).notNull(),
    recordChanges: json("recordChanges").$type<Array<{ recordId: number; mode: "renamed" | "collapsed" }>>().notNull(),
    savedSearchIds: json("savedSearchIds").$type<number[]>().notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    undoneAt: timestamp("undoneAt"),
  },
  table => [index("tag_merge_operations_user_created_idx").on(table.userId, table.createdAt)],
);

export const savedRecordSearches = mysqlTable(
  "savedRecordSearches",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 80 }).notNull(),
    query: varchar("query", { length: 240 }),
    projectId: int("projectId").references(() => projects.id, { onDelete: "set null" }),
    taskId: int("taskId").references(() => tasks.id, { onDelete: "set null" }),
    sourceType: mysqlEnum("sourceType", ["capture", "work_log", "journal", "link"]),
    period: mysqlEnum("period", ["all", "month"]).default("all").notNull(),
    sort: mysqlEnum("sort", ["newest", "oldest", "pinned"]).default("newest").notNull(),
    tag: varchar("tag", { length: 64 }),
    sortOrder: int("sortOrder").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("saved_record_searches_user_name_idx").on(table.userId, table.name),
    index("saved_record_searches_user_updated_idx").on(table.userId, table.updatedAt),
    index("saved_record_searches_user_sort_idx").on(table.userId, table.sortOrder),
  ],
);

export const reviewNotes = mysqlTable(
  "reviewNotes",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    periodStart: timestamp("periodStart").notNull(),
    periodEnd: timestamp("periodEnd").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [uniqueIndex("review_notes_user_period_idx").on(table.userId, table.periodStart)],
);

export const attachments = mysqlTable(
  "attachments",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    recordId: int("recordId").notNull().references(() => records.id, { onDelete: "cascade" }),
    clientUploadId: varchar("clientUploadId", { length: 80 }),
    storageKey: varchar("storageKey", { length: 500 }).notNull(),
    url: varchar("url", { length: 700 }).notNull(),
    fileName: varchar("fileName", { length: 320 }).notNull(),
    mimeType: varchar("mimeType", { length: 180 }).notNull(),
    size: int("size").notNull(),
    capturedAt: timestamp("capturedAt").defaultNow().notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    uniqueIndex("attachments_user_client_upload_idx").on(table.userId, table.clientUploadId),
    index("attachments_user_record_idx").on(table.userId, table.recordId),
  ],
);

export const histories = mysqlTable(
  "histories",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    entityType: mysqlEnum("entityType", ["Project", "Stage", "Task", "Schedule", "Record", "Attachment"])
      .notNull(),
    entityId: int("entityId").notNull(),
    taskId: int("taskId").references(() => tasks.id, { onDelete: "set null" }),
    eventType: mysqlEnum("eventType", ["created", "updated", "started", "completed", "on_hold", "archived", "restored", "linked"]).notNull(),
    beforeData: json("beforeData").$type<{ [key: string]: unknown }>(),
    afterData: json("afterData").$type<{ [key: string]: unknown }>(),
    note: text("note"),
    occurredAt: timestamp("occurredAt").defaultNow().notNull(),
  },
  table => [
    index("histories_user_entity_idx").on(table.userId, table.entityType, table.entityId),
    index("histories_user_task_occurred_idx").on(table.userId, table.taskId, table.occurredAt),
  ],
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Project = typeof projects.$inferSelect;
export type Stage = typeof stages.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type Schedule = typeof schedules.$inferSelect;
export type Record = typeof records.$inferSelect;
export type SavedRecordSearch = typeof savedRecordSearches.$inferSelect;
export type ReviewNote = typeof reviewNotes.$inferSelect;
export type Attachment = typeof attachments.$inferSelect;
export type History = typeof histories.$inferSelect;
