export type MonthlyProject = { id: number; title: string };
export type MonthlyTask = { projectId: number | null; status: string; nextAction: string | null };
export type CompletedTask = { projectId: number | null; startedAt: Date | null; completedAt: Date | null };
export type CompletedTaskAttachment = { id: number; fileName: string; url: string; mimeType: string };
export type CompletedTaskRecord = { id: number; content: string; attachments: CompletedTaskAttachment[] };
export type CompletedTaskDetail = CompletedTask & { id: number; title: string; projectTitle: string | null; stageTitle: string | null; nextAction: string | null; records?: CompletedTaskRecord[] };
export type MonthlyComparisonCounts = { completedTaskCount: number; recordCount: number; totalMinutes: number };

export function getDurationSummary(completedTasks: CompletedTask[]) {
  const durations = completedTasks
    .filter(task => task.startedAt && task.completedAt && task.completedAt.getTime() > task.startedAt.getTime())
    .map(task => Math.round((task.completedAt!.getTime() - task.startedAt!.getTime()) / 60000));
  const totalMinutes = durations.reduce((total, duration) => total + duration, 0);
  return { trackedTaskCount: durations.length, totalMinutes, averageMinutes: durations.length ? Math.round(totalMinutes / durations.length) : 0 };
}

export function getProjectTimeDistribution(completedTasks: CompletedTask[], activeProjects: MonthlyProject[]) {
  const projectLookup = new Map(activeProjects.map(project => [project.id, project]));
  const totals = new Map<number, { totalMinutes: number; trackedTaskCount: number }>();
  completedTasks.forEach(task => {
    if (!task.projectId || !projectLookup.has(task.projectId) || !task.startedAt || !task.completedAt || task.completedAt.getTime() <= task.startedAt.getTime()) return;
    const minutes = Math.round((task.completedAt.getTime() - task.startedAt.getTime()) / 60000);
    const current = totals.get(task.projectId) ?? { totalMinutes: 0, trackedTaskCount: 0 };
    totals.set(task.projectId, { totalMinutes: current.totalMinutes + minutes, trackedTaskCount: current.trackedTaskCount + 1 });
  });
  const grandTotal = Array.from(totals.values()).reduce((sum, item) => sum + item.totalMinutes, 0);
  return Array.from(totals.entries()).map(([projectId, summary]) => ({ projectId, title: projectLookup.get(projectId)!.title, ...summary, sharePercent: grandTotal ? Math.round((summary.totalMinutes / grandTotal) * 100) : 0 })).sort((a, b) => b.totalMinutes - a.totalMinutes);
}

export function getMonthlyComparison(current: MonthlyComparisonCounts, previous: MonthlyComparisonCounts) {
  return {
    previous,
    change: {
      completedTaskCount: current.completedTaskCount - previous.completedTaskCount,
      recordCount: current.recordCount - previous.recordCount,
      totalMinutes: current.totalMinutes - previous.totalMinutes,
    },
  };
}

export function getProjectTimeComparison(completedTasks: CompletedTask[], previousCompletedTasks: CompletedTask[], projects: MonthlyProject[]) {
  const projectLookup = new Map(projects.map(project => [project.id, project]));
  const totals = new Map<number, { totalMinutes: number; trackedTaskCount: number; previousTotalMinutes: number; previousTrackedTaskCount: number }>();
  const addTasks = (items: CompletedTask[], period: "current" | "previous") => {
    items.forEach(task => {
      if (!task.projectId || !projectLookup.has(task.projectId) || !task.startedAt || !task.completedAt || task.completedAt.getTime() <= task.startedAt.getTime()) return;
      const minutes = Math.round((task.completedAt.getTime() - task.startedAt.getTime()) / 60000);
      const current = totals.get(task.projectId) ?? { totalMinutes: 0, trackedTaskCount: 0, previousTotalMinutes: 0, previousTrackedTaskCount: 0 };
      if (period === "current") {
        current.totalMinutes += minutes;
        current.trackedTaskCount += 1;
      } else {
        current.previousTotalMinutes += minutes;
        current.previousTrackedTaskCount += 1;
      }
      totals.set(task.projectId, current);
    });
  };
  addTasks(completedTasks, "current");
  addTasks(previousCompletedTasks, "previous");
  return Array.from(totals.entries()).map(([projectId, summary]) => ({ projectId, title: projectLookup.get(projectId)!.title, ...summary, changeMinutes: summary.totalMinutes - summary.previousTotalMinutes })).sort((left, right) => Math.abs(right.changeMinutes) - Math.abs(left.changeMinutes) || right.totalMinutes - left.totalMinutes);
}

export function getCompletedTaskDetails(items: CompletedTaskDetail[]) {
  return items.map(item => ({
    id: item.id,
    title: item.title,
    projectTitle: item.projectTitle,
    stageTitle: item.stageTitle,
    nextAction: item.nextAction,
    completedAt: item.completedAt,
    durationMinutes: item.startedAt && item.completedAt && item.completedAt.getTime() > item.startedAt.getTime() ? Math.round((item.completedAt.getTime() - item.startedAt.getTime()) / 60000) : null,
    records: item.records ?? [],
  })).sort((left, right) => (right.completedAt?.getTime() ?? 0) - (left.completedAt?.getTime() ?? 0));
}

export function buildMonthlyReview(input: {
  completedTasks: CompletedTask[];
  completedTaskDetails?: CompletedTaskDetail[];
  recordCount: number;
  completedScheduleCount: number;
  previousCompletedTasks: CompletedTask[];
  previousRecordCount: number;
  activeProjects: MonthlyProject[];
  allProjects: MonthlyProject[];
  tasks: MonthlyTask[];
}) {
  const durationSummary = getDurationSummary(input.completedTasks);
  const previousDurationSummary = getDurationSummary(input.previousCompletedTasks);
  return {
    completedTaskCount: input.completedTasks.length,
    recordCount: input.recordCount,
    completedScheduleCount: input.completedScheduleCount,
    durationSummary,
    comparison: getMonthlyComparison({ completedTaskCount: input.completedTasks.length, recordCount: input.recordCount, totalMinutes: durationSummary.totalMinutes }, { completedTaskCount: input.previousCompletedTasks.length, recordCount: input.previousRecordCount, totalMinutes: previousDurationSummary.totalMinutes }),
    projectTimeDistribution: getProjectTimeDistribution(input.completedTasks, input.allProjects),
    projectTimeComparison: getProjectTimeComparison(input.completedTasks, input.previousCompletedTasks, input.allProjects),
    completedTaskDetails: getCompletedTaskDetails(input.completedTaskDetails ?? []),
    unassignedDurationSummary: getDurationSummary(input.completedTasks.filter(task => !task.projectId)),
    activeProjects: input.activeProjects.map(project => {
      const projectTasks = input.tasks.filter(task => task.projectId === project.id && task.status !== "cancelled");
      const completedTaskCount = projectTasks.filter(task => task.status === "done").length;
      const nextTask = projectTasks.find(task => task.status === "in_progress") ?? projectTasks.find(task => task.status !== "done");
      return {
        id: project.id,
        title: project.title,
        completedTaskCount,
        totalTaskCount: projectTasks.length,
        nextAction: nextTask?.nextAction ?? null,
      };
    }),
  };
}
