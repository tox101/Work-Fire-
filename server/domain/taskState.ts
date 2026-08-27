export const taskStatuses = ["inbox", "planned", "in_progress", "done", "on_hold", "cancelled"] as const;
export type TaskStatus = (typeof taskStatuses)[number];
export type TaskHistoryEvent = "updated" | "started" | "completed" | "on_hold";

export function deriveTaskStateChange(args: {
  currentStatus: TaskStatus;
  targetStatus: TaskStatus;
  currentStartedAt: Date | null;
  nextAction?: string | null;
  now: Date;
}) {
  const values: {
    status: TaskStatus;
    nextAction?: string | null;
    startedAt?: Date | null;
    completedAt?: Date | null;
  } = { status: args.targetStatus };

  if (args.nextAction !== undefined) values.nextAction = args.nextAction;
  if (args.targetStatus === "in_progress" && !args.currentStartedAt) values.startedAt = args.now;
  if (args.targetStatus === "done") values.completedAt = args.now;
  if (args.targetStatus !== "done" && args.currentStatus === "done") values.completedAt = null;

  const eventType: TaskHistoryEvent = args.targetStatus === "in_progress"
    ? "started"
    : args.targetStatus === "done"
      ? "completed"
      : args.targetStatus === "on_hold"
        ? "on_hold"
        : "updated";

  return { values, eventType };
}
