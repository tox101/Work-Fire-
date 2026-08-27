export type WorkspaceTaskSummary = {
  id: number;
  revision: number;
  projectId: number | null;
  status: string;
  title: string;
  nextAction: string | null;
};

export function getSuggestedTask(tasks: WorkspaceTaskSummary[]) {
  return tasks.find(task => task.status === "in_progress")
    ?? tasks.find(task => task.status === "planned" || task.status === "inbox")
    ?? null;
}

export function getProjectProgress(projectId: number, tasks: WorkspaceTaskSummary[], todayTaskIds: Set<number>) {
  const projectTasks = tasks.filter(task => task.projectId === projectId && task.status !== "cancelled");
  const completed = projectTasks.filter(task => task.status === "done").length;
  const total = projectTasks.length;

  return {
    total,
    completed,
    percent: total ? Math.round((completed / total) * 100) : 0,
    todayTaskCount: projectTasks.filter(task => todayTaskIds.has(task.id)).length,
  };
}

export function getStageGuide(stageStatus: string, tasks: Array<{ status: string }>) {
  if (stageStatus === "done") return { message: "완료된 Stage입니다.", canComplete: false };
  const activeTasks = tasks.filter(task => task.status !== "cancelled");
  if (activeTasks.length === 0) return { message: "다음 Task를 추가하세요.", canComplete: false };
  const remaining = activeTasks.filter(task => task.status !== "done").length;
  if (remaining === 0) return { message: "모든 Task 완료 · Stage 완료 처리", canComplete: true };
  return { message: `다음 진행: 남은 Task ${remaining}개`, canComplete: false };
}

export function getProjectNextStage(stages: Array<{ id: number; title: string; status: string }>, tasksByStage: Map<number, Array<{ status: string }>>) {
  const nextStage = stages.find(stage => stage.status === "active");
  if (!nextStage) return null;
  return { stage: nextStage, ...getStageGuide(nextStage.status, tasksByStage.get(nextStage.id) ?? []) };
}
