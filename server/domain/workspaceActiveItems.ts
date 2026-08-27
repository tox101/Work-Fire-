type WorkspaceProject = { id: number; status: string };
type WorkspaceStage = { id: number; projectId: number; status: string };
type WorkspaceTask = { projectId: number | null; stageId: number | null; status: string };

/** 활성 Project의 현재 작업 맥락만 선택지용 Workspace 스냅샷에 남긴다. */
export function filterActiveWorkspaceItems<
  TProject extends WorkspaceProject,
  TStage extends WorkspaceStage,
  TTask extends WorkspaceTask,
>(projectRows: TProject[], stageRows: TStage[], taskRows: TTask[]) {
  const projects = projectRows.filter(project => project.status === "active");
  const activeProjectIds = new Set(projects.map(project => project.id));
  const stages = stageRows.filter(stage => stage.status !== "archived" && activeProjectIds.has(stage.projectId));
  const activeStageIds = new Set(stages.map(stage => stage.id));
  const tasks = taskRows.filter(task => {
    if (task.status === "cancelled") return false;
    if (task.stageId !== null) {
      return activeStageIds.has(task.stageId) && (task.projectId === null || activeProjectIds.has(task.projectId));
    }
    return task.projectId === null || activeProjectIds.has(task.projectId);
  });

  return { projects, stages, tasks };
}
