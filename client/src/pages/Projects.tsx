import { Archive, Check, ChevronDown, ChevronRight, Circle, FolderPlus, Pencil, Play, Plus, SquareStack, Trash2, X } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";
import { ConflictResolutionNotice } from "@/components/ConflictResolutionNotice";
import { ArchivedWorkspacePanel } from "@/components/ArchivedWorkspacePanel";
import { WorkspaceExportPanel } from "@/components/WorkspaceExportPanel";
import { getProjectNextStage, getProjectProgress, getStageGuide } from "@/lib/workspaceSummary";
import { trpc } from "@/lib/trpc";

type TaskStatus = "inbox" | "planned" | "in_progress" | "done" | "on_hold" | "cancelled";
type ProjectItem = { id: number; title: string; description: string | null; status: string; revision: number };
type StageItem = { id: number; projectId: number; title: string; status: string; revision: number };
type TaskItem = { id: number; projectId: number | null; stageId: number | null; title: string; status: TaskStatus; nextAction: string | null; revision: number };

function dayWindow() { const start = new Date(); start.setHours(0, 0, 0, 0); const end = new Date(start); end.setDate(end.getDate() + 1); return { start, end }; }
function groupBy<T>(items: T[], selector: (item: T) => number) { const map = new Map<number, T[]>(); items.forEach(item => { const key = selector(item); map.set(key, [...(map.get(key) ?? []), item]); }); return map; }
function isConflict(error: { data?: { code?: string } | null }) { return error.data?.code === "CONFLICT"; }

export default function Projects() {
  const [window] = useState(dayWindow);
  const overview = trpc.workspace.overview.useQuery(window);
  const utils = trpc.useUtils();
  const [projectName, setProjectName] = useState("");
  const handleMutationError = (error: { message: string }) => { toast.error(error.message); void utils.workspace.overview.invalidate(); void utils.workspace.continue.invalidate(); };
  const createProject = trpc.workspace.createProject.useMutation({ onSuccess: () => { setProjectName(""); void utils.workspace.overview.invalidate(); }, onError: handleMutationError });
  const archivedWorkspace = trpc.workspace.archivedWorkspace.useQuery();
  const restoreArchivedItem = trpc.workspace.restoreArchivedWorkspaceItem.useMutation({ onSuccess: () => { void utils.workspace.overview.invalidate(); void utils.workspace.continue.invalidate(); void archivedWorkspace.refetch(); }, onError: handleMutationError });
  const archiveProject = trpc.workspace.archiveProject.useMutation({ onSuccess: () => void utils.workspace.overview.invalidate(), onError: handleMutationError });
  const archiveTask = trpc.workspace.archiveTask.useMutation({ onSuccess: () => void utils.workspace.overview.invalidate(), onError: handleMutationError });
  const bulkArchive = trpc.workspace.bulkArchiveWorkspaceItems.useMutation({ onSuccess: () => void utils.workspace.overview.invalidate(), onError: handleMutationError });
  const setTaskStatus = trpc.workspace.setTaskStatus.useMutation({ onSuccess: () => { void utils.workspace.overview.invalidate(); void utils.workspace.continue.invalidate(); }, onError: handleMutationError });
  const projects = (overview.data?.projects ?? []) as ProjectItem[];
  const stages = (overview.data?.stages ?? []) as StageItem[];
  const tasks = (overview.data?.tasks ?? []) as TaskItem[];
  const stagesByProject = useMemo(() => groupBy(stages, item => item.projectId), [stages]);
  const tasksByStage = useMemo(() => groupBy(tasks, item => item.stageId ?? 0), [tasks]);
  const todayTaskIds = useMemo(() => new Set(overview.data?.schedules.flatMap(schedule => schedule.taskId ? [schedule.taskId] : []) ?? []), [overview.data?.schedules]);
  const submitProject = (event: FormEvent) => { event.preventDefault(); if (projectName.trim()) createProject.mutate({ title: projectName.trim() }); };

  if (overview.isLoading) return <div className="space-y-4 animate-pulse"><div className="h-16 bg-neutral-200 rounded-xl" /><div className="h-48 bg-neutral-100 rounded-xl" /></div>;

  return (
    <div className="space-y-4 max-w-6xl mx-auto pb-16">
      {/* 컴팩트 헤더 & 신규 프로젝트 인라인 생성 */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <h1 className="text-2xl font-black text-slate-950">프로젝트 관리</h1>
          <p className="text-xs font-semibold text-slate-600">목표를 Stage와 Task로 빠르고 가볍게 구조화합니다.</p>
        </div>
        <form onSubmit={submitProject} className="flex gap-1.5 w-full sm:w-auto">
          <input
            value={projectName}
            onChange={event => setProjectName(event.target.value)}
            className="mono-input h-10 px-3 text-sm font-semibold sm:w-64"
            placeholder="+ 새 Project 이름 입력"
          />
          <button
            disabled={!projectName.trim() || createProject.isPending}
            className="pressable flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-emerald-700 px-4 text-sm font-bold text-white hover:bg-emerald-800 disabled:bg-slate-300 shadow-sm"
          >
            <FolderPlus className="h-4 w-4" /> 생성
          </button>
        </form>
      </header>

      {/* 공간 절약형 컴팩트 툴바 (선택 보관 & 백업 & 보관함) */}
      <div className="space-y-2">
        <CompactTools
          projects={projects}
          stages={stages}
          tasks={tasks}
          onArchive={values => bulkArchive.mutate(values)}
          busy={bulkArchive.isPending}
          error={bulkArchive.error?.message}
          archivedData={archivedWorkspace.data}
          onRestore={(entityType, item) => restoreArchivedItem.mutate({ entityType, id: item.id, expectedRevision: item.revision })}
          restoreBusy={restoreArchivedItem.isPending}
        />
      </div>

      {/* 활성 프로젝트 목록 (초슬림 & 초간편 입력 구조) */}
      {projects.filter(project => project.status === "active").length ? (
        <div className="grid gap-4">
          {projects
            .filter(project => project.status === "active")
            .map(project => (
              <CompactProjectBlock
                key={project.id}
                project={project}
                stages={stagesByProject.get(project.id) ?? []}
                tasksByStage={tasksByStage}
                tasks={tasks}
                todayTaskIds={todayTaskIds}
                onArchive={() => archiveProject.mutate({ id: project.id, expectedRevision: project.revision })}
                onTaskStatus={(task, status) => setTaskStatus.mutate({ id: task.id, expectedRevision: task.revision, status })}
                onTaskArchive={task => archiveTask.mutate({ id: task.id, expectedRevision: task.revision })}
              />
            ))}
        </div>
      ) : (
        <EmptyProjects />
      )}
    </div>
  );
}

{/* 접이식 공간 절약형 툴바 (선택 항목 보관 + 내보내기) */}
function CompactTools({
  projects,
  stages,
  tasks,
  onArchive,
  busy,
  error,
  archivedData,
  onRestore,
  restoreBusy,
}: {
  projects: ProjectItem[];
  stages: StageItem[];
  tasks: TaskItem[];
  onArchive: (values: { projectIds: number[]; stageIds: number[]; taskIds: number[] }) => void;
  busy: boolean;
  error?: string;
  archivedData: any;
  onRestore: (entityType: any, item: any) => void;
  restoreBusy: boolean;
}) {
  const [openCleanup, setOpenCleanup] = useState(false);
  const [projectIds, setProjectIds] = useState<string[]>([]);
  const [stageIds, setStageIds] = useState<string[]>([]);
  const [taskIds, setTaskIds] = useState<string[]>([]);

  const choose = (event: React.ChangeEvent<HTMLSelectElement>, setValues: (values: string[]) => void) =>
    setValues(Array.from(event.target.selectedOptions, option => option.value));

  const activeProjects = projects.filter(item => item.status === "active");
  const activeStages = stages.filter(item => item.status !== "archived");
  const activeTasks = tasks.filter(item => item.status !== "cancelled");
  const selectedCount = projectIds.length + stageIds.length + taskIds.length;

  return (
    <div className="rounded-xl border border-slate-200 bg-white/80 p-2 sm:p-3 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setOpenCleanup(!openCleanup)}
            className="flex items-center gap-1 font-bold text-slate-800 hover:text-emerald-800 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg transition-colors"
          >
            <Archive className="h-3.5 w-3.5 text-amber-600" />
            <span>선택 항목 일괄 보관</span>
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${openCleanup ? "rotate-180" : ""}`} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <WorkspaceExportPanel />
        </div>
      </div>

      {openCleanup && (
        <div className="mt-3 border-t border-slate-100 pt-3">
          <div className="grid gap-2 sm:grid-cols-3">
            <label className="font-bold text-slate-800">
              Project ({activeProjects.length})
              <select
                multiple
                value={projectIds}
                onChange={event => choose(event, setProjectIds)}
                className="mono-input mt-1 h-20 w-full p-1.5 text-xs font-medium"
              >
                {activeProjects.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="font-bold text-slate-800">
              Stage ({activeStages.length})
              <select
                multiple
                value={stageIds}
                onChange={event => choose(event, setStageIds)}
                className="mono-input mt-1 h-20 w-full p-1.5 text-xs font-medium"
              >
                {activeStages.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="font-bold text-slate-800">
              Task ({activeTasks.length})
              <select
                multiple
                value={taskIds}
                onChange={event => choose(event, setTaskIds)}
                className="mono-input mt-1 h-20 w-full p-1.5 text-xs font-medium"
              >
                {activeTasks.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="mt-2.5 flex items-center justify-between">
            <span className="font-semibold text-slate-600">
              {selectedCount ? `${selectedCount}개 선택됨` : "보관할 항목을 다중 선택하세요."}
            </span>
            <button
              type="button"
              onClick={() =>
                onArchive({
                  projectIds: projectIds.map(Number),
                  stageIds: stageIds.map(Number),
                  taskIds: taskIds.map(Number),
                })
              }
              disabled={!selectedCount || busy}
              className="pressable rounded-lg bg-amber-600 px-3 py-1.5 font-bold text-white hover:bg-amber-700 disabled:opacity-40"
            >
              {busy ? "보관 중..." : "선택 항목 보관 실행"}
            </button>
          </div>
          {error && <p className="mt-1 font-bold text-rose-600">{error}</p>}
        </div>
      )}

      <div className="mt-1">
        <ArchivedWorkspacePanel data={archivedData} onRestore={onRestore} busy={restoreBusy} />
      </div>
    </div>
  );
}

{/* 초슬림 & 공간 극대화 프로젝트 블록 */}
function CompactProjectBlock({
  project,
  stages,
  tasksByStage,
  tasks,
  todayTaskIds,
  onArchive,
  onTaskStatus,
  onTaskArchive,
}: {
  project: ProjectItem;
  stages: StageItem[];
  tasksByStage: Map<number, TaskItem[]>;
  tasks: TaskItem[];
  todayTaskIds: Set<number>;
  onArchive: () => void;
  onTaskStatus: (task: TaskItem, status: TaskStatus) => void;
  onTaskArchive: (task: TaskItem) => void;
}) {
  const utils = trpc.useUtils();
  const [stageTitle, setStageTitle] = useState("");
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(project.title);
  const [description, setDescription] = useState(project.description ?? "");
  const [conflict, setConflict] = useState(false);

  const createStage = trpc.workspace.createStage.useMutation({
    onSuccess: () => {
      setStageTitle("");
      void utils.workspace.overview.invalidate();
    },
  });
  const updateProject = trpc.workspace.updateProject.useMutation({
    onSuccess: () => {
      setConflict(false);
      setEditing(false);
      void utils.workspace.overview.invalidate();
    },
    onError: error => {
      if (isConflict(error)) setConflict(true);
      else toast.error(error.message);
      void utils.workspace.overview.invalidate();
    },
  });

  const progress = getProjectProgress(project.id, tasks, todayTaskIds);
  const nextStage = getProjectNextStage(stages, tasksByStage);

  const saveProject = () =>
    updateProject.mutate({
      id: project.id,
      expectedRevision: project.revision,
      title: title.trim(),
      description: description.trim() || null,
    });

  return (
    <section className="rounded-2xl border-2 border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* 1. 슬림 프로젝트 헤더 (제목 + 인라인 진행률 + 액션) */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/80 px-4 py-3 sm:px-5">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <h2 className="text-xl font-black text-slate-950 truncate">{project.title}</h2>
          {project.description && (
            <span className="text-xs font-semibold text-slate-500 truncate hidden sm:inline">
              · {project.description}
            </span>
          )}
          {/* 인라인 슬림 프로그레스 */}
          <div className="flex items-center gap-2 bg-white border border-slate-200 px-2.5 py-1 rounded-full text-xs font-bold text-slate-800 shrink-0">
            <span>{progress.completed}/{progress.total}</span>
            <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-600" style={{ width: `${progress.percent}%` }} />
            </div>
            <span className="text-emerald-800 font-extrabold">{progress.percent}%</span>
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setEditing(!editing)}
            className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-200/60"
            aria-label={`${project.title} 수정`}
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={onArchive}
            className="p-1.5 text-slate-500 hover:text-rose-700 rounded-lg hover:bg-rose-50"
            aria-label={`${project.title} 보관`}
          >
            <Archive className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 수정 폼 */}
      {editing && (
        <form
          onSubmit={event => {
            event.preventDefault();
            if (title.trim()) saveProject();
          }}
          className="border-b border-slate-200 bg-amber-50/50 p-4 grid gap-2"
        >
          <input
            value={title}
            onChange={event => setTitle(event.target.value)}
            className="mono-input h-10 text-sm font-bold"
            placeholder="Project 이름"
          />
          <textarea
            value={description}
            onChange={event => setDescription(event.target.value)}
            className="mono-input min-h-16 text-sm"
            placeholder="Project 설명 (선택)"
          />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setEditing(false)} className="px-3 py-1.5 text-xs font-bold text-slate-600">
              취소
            </button>
            <button className="rounded-lg bg-emerald-700 px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-800">
              저장
            </button>
          </div>
        </form>
      )}

      {/* 2. Stage 및 Task 목록 (초간편 인라인 구조) */}
      <div className="p-3 sm:p-4 space-y-3">
        {stages.filter(stage => stage.status !== "archived").length ? (
          <div className="space-y-3">
            {stages
              .filter(stage => stage.status !== "archived")
              .map(stage => (
                <CompactStageBlock
                  key={stage.id}
                  projectId={project.id}
                  stage={stage}
                  tasks={tasksByStage.get(stage.id) ?? []}
                  onTaskStatus={onTaskStatus}
                  onTaskArchive={onTaskArchive}
                />
              ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-slate-200 p-3 text-center text-xs font-bold text-slate-500">
            아직 Stage가 없습니다. 아래에서 Stage를 먼저 추가하세요.
          </p>
        )}

        {/* 컴팩트 Stage 추가 인풋 */}
        <form
          onSubmit={event => {
            event.preventDefault();
            if (stageTitle.trim()) createStage.mutate({ projectId: project.id, title: stageTitle.trim() });
          }}
          className="flex gap-2 pt-1"
        >
          <input
            value={stageTitle}
            onChange={event => setStageTitle(event.target.value)}
            className="mono-input h-9 text-xs font-semibold flex-1 bg-slate-50"
            placeholder="+ 새 Stage 이름 추가 (예: 기획, 개발, 테스트...)"
          />
          <button
            disabled={!stageTitle.trim() || createStage.isPending}
            className="pressable h-9 shrink-0 rounded-xl bg-slate-200 px-3 text-xs font-bold text-slate-800 hover:bg-slate-300 disabled:opacity-40"
          >
            + Stage 추가
          </button>
        </form>
      </div>
    </section>
  );
}

{/* 초간편 & 초압축 Stage 블록 (Task 입력 초간소화) */}
function CompactStageBlock({
  projectId,
  stage,
  tasks,
  onTaskStatus,
  onTaskArchive,
}: {
  projectId: number;
  stage: StageItem;
  tasks: TaskItem[];
  onTaskStatus: (task: TaskItem, status: TaskStatus) => void;
  onTaskArchive: (task: TaskItem) => void;
}) {
  const utils = trpc.useUtils();
  const [taskTitle, setTaskTitle] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [showNextAction, setShowNextAction] = useState(false);
  const [open, setOpen] = useState(true);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(stage.title);

  const createTask = trpc.workspace.createTask.useMutation({
    onSuccess: () => {
      setTaskTitle("");
      setNextAction("");
      setShowNextAction(false);
      void utils.workspace.overview.invalidate();
    },
  });
  const updateStage = trpc.workspace.updateStage.useMutation({
    onSuccess: () => {
      setEditing(false);
      void utils.workspace.overview.invalidate();
    },
  });

  const remainingCount = tasks.filter(t => t.status !== "done" && t.status !== "cancelled").length;

  const saveStage = () =>
    updateStage.mutate({
      id: stage.id,
      expectedRevision: stage.revision,
      title: title.trim(),
    });

  const handleTaskSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!taskTitle.trim()) return;
    createTask.mutate({
      projectId,
      stageId: stage.id,
      title: taskTitle.trim(),
      nextAction: nextAction.trim() || null,
      status: "planned",
    });
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3">
      {/* Stage 타이틀 바 (한 줄 슬림) */}
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 font-black text-slate-900 text-sm hover:text-emerald-800 text-left min-w-0"
        >
          <ChevronRight className={`h-4 w-4 text-slate-500 transition-transform ${open ? "rotate-90" : ""}`} />
          <span className="truncate">{stage.title}</span>
          <span className="rounded-md bg-slate-200 px-1.5 py-0.5 text-[11px] font-bold text-slate-700 shrink-0">
            {remainingCount ? `남은 Task ${remainingCount}` : "완료됨"}
          </span>
        </button>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setEditing(!editing)}
            className="p-1 text-slate-400 hover:text-slate-800"
            aria-label={`${stage.title} 수정`}
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => updateStage.mutate({ id: stage.id, expectedRevision: stage.revision, status: "archived" })}
            className="p-1 text-slate-400 hover:text-rose-600"
            aria-label={`${stage.title} 보관`}
          >
            <Archive className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Stage 이름 수정 폼 */}
      {editing && (
        <form
          onSubmit={event => {
            event.preventDefault();
            if (title.trim()) saveStage();
          }}
          className="flex gap-2 mt-2"
        >
          <input
            value={title}
            onChange={event => setTitle(event.target.value)}
            className="mono-input h-8 text-xs font-bold flex-1"
          />
          <button className="rounded-lg bg-emerald-700 px-3 text-xs font-bold text-white">저장</button>
          <button type="button" onClick={() => setEditing(false)} className="text-xs text-slate-500">
            취소
          </button>
        </form>
      )}

      {/* Task 리스트 & 초간편 1줄 입력창 */}
      {open && (
        <div className="mt-2 space-y-1.5 pl-2 sm:pl-3 border-l-2 border-slate-200">
          {/* 태스크 목록 */}
          {tasks
            .filter(task => task.status !== "cancelled")
            .map(task => (
              <CompactTaskLine key={task.id} task={task} onStatus={onTaskStatus} onArchive={onTaskArchive} />
            ))}

          {/* 초간편 태스크 추가 폼 (엔터 치면 즉시 생성) */}
          <form onSubmit={handleTaskSubmit} className="pt-1.5">
            <div className="flex gap-1.5 items-center">
              <input
                value={taskTitle}
                onChange={event => setTaskTitle(event.target.value)}
                className="mono-input h-8 text-xs font-bold flex-1 bg-white border-emerald-300 focus:border-emerald-600"
                placeholder="➕ 새 Task 입력 후 Enter (예: 머티리얼 선택, UI 배치...)"
              />
              {!showNextAction ? (
                <button
                  type="button"
                  onClick={() => setShowNextAction(true)}
                  className="h-8 px-2 text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg shrink-0"
                >
                  + 다음 행동
                </button>
              ) : (
                <input
                  value={nextAction}
                  onChange={event => setNextAction(event.target.value)}
                  className="mono-input h-8 text-xs font-semibold w-32 sm:w-44 bg-white"
                  placeholder="다음 행동 입력"
                />
              )}
              <button
                type="submit"
                disabled={!taskTitle.trim() || createTask.isPending}
                className="pressable h-8 px-3 rounded-lg bg-emerald-700 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-40 shrink-0"
              >
                추가
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

{/* 초슬림 태스크 라인 */}
function CompactTaskLine({
  task,
  onStatus,
  onArchive,
}: {
  task: TaskItem;
  onStatus: (task: TaskItem, status: TaskStatus) => void;
  onArchive: (task: TaskItem) => void;
}) {
  const utils = trpc.useUtils();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [nextAction, setNextAction] = useState(task.nextAction ?? "");

  const updateTask = trpc.workspace.updateTask.useMutation({
    onSuccess: () => {
      setEditing(false);
      void utils.workspace.overview.invalidate();
    },
  });

  const saveTask = () =>
    updateTask.mutate({
      id: task.id,
      expectedRevision: task.revision,
      title: title.trim(),
      nextAction: nextAction.trim() || null,
    });

  const isDone = task.status === "done";

  return (
    <div className="group flex items-center justify-between gap-2 rounded-lg bg-white px-2.5 py-1.5 border border-slate-100 shadow-2xs hover:border-slate-300 transition-colors">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <button
          onClick={() => onStatus(task, isDone ? "planned" : "done")}
          className="text-slate-400 hover:text-emerald-700 shrink-0"
          aria-label={`${task.title} 상태 변경`}
        >
          {isDone ? (
            <span className="grid h-4 w-4 place-items-center rounded-full bg-emerald-700 text-[10px] font-black text-white">
              ✓
            </span>
          ) : (
            <Circle className="h-4 w-4 text-slate-300 hover:text-emerald-600" />
          )}
        </button>

        <span
          className={`text-xs font-bold truncate ${
            isDone ? "text-slate-400 line-through" : "text-slate-900"
          }`}
        >
          {task.title}
        </span>

        {task.nextAction && (
          <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded truncate max-w-44 hidden sm:inline">
            👉 {task.nextAction}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        {task.status !== "in_progress" && !isDone && (
          <button
            onClick={() => onStatus(task, "in_progress")}
            className="p-1 text-slate-400 hover:text-emerald-700"
            title="진행 중으로 변경"
          >
            <Play className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          onClick={() => setEditing(!editing)}
          className="p-1 text-slate-400 hover:text-slate-800"
          title="수정"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => onArchive(task)}
          className="p-1 text-slate-400 hover:text-rose-600"
          title="보관"
        >
          <Archive className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* 수정 모달/인라인 */}
      {editing && (
        <form
          onSubmit={event => {
            event.preventDefault();
            if (title.trim()) saveTask();
          }}
          className="absolute inset-x-2 z-10 flex gap-1.5 bg-white p-2 rounded-lg border-2 border-emerald-500 shadow-md"
        >
          <input
            value={title}
            onChange={event => setTitle(event.target.value)}
            className="mono-input h-7 text-xs font-bold flex-1"
          />
          <input
            value={nextAction}
            onChange={event => setNextAction(event.target.value)}
            className="mono-input h-7 text-xs w-32"
            placeholder="다음 행동"
          />
          <button className="rounded bg-emerald-700 px-2.5 text-xs font-bold text-white">저장</button>
          <button type="button" onClick={() => setEditing(false)} className="text-xs text-slate-500 px-1">
            <X className="h-3.5 w-3.5" />
          </button>
        </form>
      )}
    </div>
  );
}

function EmptyProjects() {
  return (
    <section className="border-2 border-dashed border-slate-200 bg-white p-6 rounded-2xl text-center">
      <SquareStack className="h-8 w-8 text-slate-400 mx-auto" />
      <h2 className="mt-2 text-xl font-black text-slate-900">첫 Project를 만드세요.</h2>
      <p className="mt-1 text-xs font-semibold text-slate-600">
        상단 입력창에서 프로젝트 이름을 넣고 [생성]을 누르면 즉시 시작됩니다.
      </p>
    </section>
  );
}
