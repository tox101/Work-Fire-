import {
  Check,
  Circle,
  Clock3,
  Coffee,
  Pause,
  Pencil,
  Play,
  Plus,
  SquarePen,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { CapturePanel } from "@/components/CapturePanel";
import { PinnedRecordSummary, RecentCaptureSummary, SuggestedTaskSummary, WeeklySummary } from "@/components/WorkspaceInsights";
import { getSuggestedTask } from "@/lib/workspaceSummary";
import { trpc } from "@/lib/trpc";

type ScheduleCategory = "project" | "daily" | "urgent";

function dateHeading() {
  return new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", weekday: "short" }).format(new Date());
}

function formatMinutes(minutes: number) {
  if (minutes < 60) return `${minutes}분`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours}시간 ${remainder}분` : `${hours}시간`;
}

function parseScheduleNotes(notes: string | null | undefined): { category: ScheduleCategory; duration: number; breakTime: number } {
  if (!notes) return { category: "project", duration: 60, breakTime: 0 };
  try {
    const data = JSON.parse(notes);
    return {
      category: data.category ?? "project",
      duration: data.duration ?? 60,
      breakTime: data.breakTime ?? 0,
    };
  } catch {
    return { category: "project", duration: 60, breakTime: 0 };
  }
}

export default function Today() {
  const [day] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const window = useMemo(() => {
    const start = new Date(day);
    const end = new Date(day);
    end.setDate(end.getDate() + 1);
    return { start, end };
  }, [day]);

  const overview = trpc.workspace.overview.useQuery(window);
  const continueContext = trpc.workspace.continue.useQuery();
  const pinnedRecords = trpc.workspace.pinnedRecordSummaries.useQuery();
  const savedSearches = trpc.workspace.savedRecordSearches.useQuery();
  const weeklySummary = trpc.workspace.weeklySummary.useQuery();
  const utils = trpc.useUtils();
  const [, setLocation] = useLocation();

  const [showCapture, setShowCapture] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<any | null>(null);
  const [scheduleConflict, setScheduleConflict] = useState(false);

  const invalidate = () => {
    void utils.workspace.overview.invalidate();
    void utils.workspace.continue.invalidate();
    void utils.workspace.weeklySummary.invalidate();
  };

  const setTaskStatus = trpc.workspace.setTaskStatus.useMutation({ onSuccess: invalidate });
  const createSchedule = trpc.workspace.createSchedule.useMutation({
    onSuccess: () => {
      setShowSchedule(false);
      invalidate();
    },
  });
  const updateSchedule = trpc.workspace.updateSchedule.useMutation({
    onSuccess: () => {
      setShowSchedule(false);
      setEditingSchedule(null);
      invalidate();
    },
  });
  const setScheduleStatus = trpc.workspace.setScheduleStatus.useMutation({ onSuccess: invalidate });

  const data = overview.data;
  const projectById = useMemo(() => new Map(data?.projects.map(p => [p.id, p]) ?? []), [data?.projects]);
  const stageById = useMemo(() => new Map(data?.stages.map(s => [s.id, s]) ?? []), [data?.stages]);
  const taskById = useMemo(() => new Map(data?.tasks.map(t => [t.id, t]) ?? []), [data?.tasks]);
  // 최신 기록 (records가 있으면 첫번째 아이템)
  const latestRecord = data?.records?.[0] ?? null;

  // 현재 진행 중 task (in_progress)
  const nowTask = useMemo(() => data?.tasks?.find(t => t.status === "in_progress") ?? null, [data?.tasks]);
  const continueItem = continueContext.data;
  const suggestedTask = data?.tasks ? getSuggestedTask(data.tasks) : null;
  // nowTask 우선, 없으면 continueContext의 task
  const linkedTask = nowTask ?? (continueItem?.task ? taskById.get(continueItem.task.id) ?? continueItem.task : null);
  const linkedProject = linkedTask?.projectId ? projectById.get(linkedTask.projectId) : (continueItem?.project ?? null);
  const linkedStage = linkedTask?.stageId ? stageById.get(linkedTask.stageId) : (continueItem?.stage ?? null);
  const suggestedProject = suggestedTask?.projectId ? projectById.get(suggestedTask.projectId) : null;

  return (
    <div className="space-y-3 max-w-6xl mx-auto pb-16">
      {/* 1. 컴팩트 헤더 */}
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-black text-slate-950">오늘의 실행</h1>
          <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
            {dateHeading()}
          </span>
        </div>
        <p className="text-xs font-semibold text-slate-600 hidden sm:block">작은 일이라도 끝냅니다. 복잡한 맥락은 시스템이 기억합니다.</p>
      </header>

      {/* 2. NOW / Continue & 일정 대시보드 */}
      <section className="grid gap-3 lg:grid-cols-[1.1fr_.9fr]">
        <div className="rounded-xl border-2 border-emerald-600 bg-emerald-700 p-4 text-white shadow-sm">
          <div className="flex items-center justify-between border-b border-emerald-500/60 pb-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-100">
              {nowTask ? "● NOW / 지금 진행 중" : "▶ CONTINUE / 이어서 하기"}
            </span>
            <Clock3 className="h-4 w-4 text-emerald-100" />
          </div>

          {linkedTask ? (
            <div className="mt-2.5">
              <h2 className="text-2xl font-black text-white leading-tight">{linkedTask.title}</h2>
              <p className="mt-1 text-xs font-bold text-emerald-100">
                {linkedProject?.title ?? "독립 작업"}{linkedStage ? ` › ${linkedStage.title}` : ""}
              </p>
              {continueItem?.lastRecord && (
                <blockquote className="mt-2 border-l-2 border-emerald-200 pl-2.5 text-xs font-medium leading-normal text-emerald-50">
                  “{continueItem.lastRecord.content}”
                </blockquote>
              )}
              <div className="mt-2.5 rounded-lg bg-emerald-800/80 p-2 border border-emerald-600">
                <span className="text-[11px] font-extrabold uppercase text-emerald-200 block">세부 작업 (Action)</span>
                <p className="mt-0.5 text-xs font-bold text-white">{linkedTask.nextAction || "세부 작업 내용이 없습니다."}</p>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {linkedTask.status !== "in_progress" && (
                  <button
                    onClick={() =>
                      setTaskStatus.mutate({
                        id: linkedTask.id,
                        expectedRevision: linkedTask.revision,
                        status: "in_progress",
                      })
                    }
                    className="pressable flex h-9 items-center gap-1.5 rounded-lg bg-white px-3.5 text-xs font-black text-emerald-800 shadow-xs"
                  >
                    <Play className="h-3.5 w-3.5 fill-current" /> 시작
                  </button>
                )}
                <button
                  onClick={() =>
                    setTaskStatus.mutate({ id: linkedTask.id, expectedRevision: linkedTask.revision, status: "done" })
                  }
                  className="pressable flex h-9 items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-800 px-3.5 text-xs font-black text-white hover:bg-emerald-900"
                >
                  <Check className="h-4 w-4" /> 완료
                </button>
                <button
                  onClick={() =>
                    setTaskStatus.mutate({
                      id: linkedTask.id,
                      expectedRevision: linkedTask.revision,
                      status: "on_hold",
                    })
                  }
                  className="pressable flex h-9 items-center gap-1 px-2.5 text-xs font-bold text-emerald-100 hover:text-white"
                >
                  <Pause className="h-4 w-4" /> 보류
                </button>
              </div>
            </div>
          ) : (
            <div className="py-2">
              {suggestedTask ? (
                <SuggestedTaskSummary
                  task={suggestedTask}
                  projectTitle={suggestedProject?.title ?? "연결된 Project 없음"}
                  onStart={() =>
                    setTaskStatus.mutate({
                      id: suggestedTask.id,
                      expectedRevision: suggestedTask.revision,
                      status: "in_progress",
                    })
                  }
                />
              ) : (
                <>
                  <h2 className="text-xl font-black text-white">시작할 작업이 없습니다.</h2>
                  <p className="mt-1 text-xs font-semibold text-emerald-100">프로젝트를 만들거나 오늘의 일정을 추가하세요.</p>
                  <button
                    onClick={() => setLocation("/projects")}
                    className="pressable mt-3 rounded-lg bg-white px-3.5 py-2 text-xs font-black text-emerald-800 shadow"
                  >
                    Project 만들기
                  </button>
                </>
              )}
              {latestRecord && <RecentCaptureSummary content={latestRecord.content} />}
            </div>
          )}
        </div>

        {/* 오늘 일정 컴팩트 목록 (프로젝트 / 일상 / 긴급 분리) */}
        <aside className="rounded-xl border-2 border-slate-200 bg-white p-3 sm:p-4 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-slate-800">Today 일정 타임라인</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.2 text-[10px] font-bold text-slate-600">
                  {data?.schedules.length ?? 0}건
                </span>
              </div>
              <button
                onClick={() => {
                  setEditingSchedule(null);
                  setScheduleConflict(false);
                  setShowSchedule(true);
                }}
                className="flex items-center gap-1 text-xs font-extrabold text-emerald-700 hover:underline"
              >
                <Plus className="h-3.5 w-3.5" /> 일정 추가
              </button>
            </div>

            <div className="mt-2 space-y-1">
              {data?.schedules.length ? (
                data.schedules.map(item => {
                  const task = item.taskId ? taskById.get(item.taskId) : undefined;
                  const project = task?.projectId ? projectById.get(task.projectId) : undefined;
                  const done = item.status === "completed";
                  const isActive = item.status === "in_progress";
                  const parsed = parseScheduleNotes(item.notes);
                  const time = item.plannedStartAt
                    ? new Intl.DateTimeFormat("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false }).format(
                        new Date(item.plannedStartAt)
                      )
                    : "미정";

                  // 카테고리 뱃지 설정
                  const isDaily = parsed.category === "daily" || (!item.taskId && !parsed.category);
                  const isUrgent = parsed.category === "urgent";

                  return (
                    <article
                      key={item.id}
                      className={`group flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 transition-colors ${
                        isActive
                          ? "bg-emerald-600 text-white shadow-2xs"
                          : "hover:bg-slate-50 bg-slate-50/70 border border-slate-100"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <span className={`text-xs font-bold font-mono shrink-0 ${isActive ? "text-white" : "text-slate-600"}`}>
                          {time}
                        </span>

                        {/* 카테고리 태그 */}
                        {isUrgent ? (
                          <span className="rounded bg-rose-100 text-rose-800 border border-rose-200 px-1 py-0.2 text-[10px] font-black shrink-0">
                            🚨 긴급
                          </span>
                        ) : isDaily ? (
                          <span className="rounded bg-sky-100 text-sky-800 border border-sky-200 px-1 py-0.2 text-[10px] font-black shrink-0">
                            ☕ 일상
                          </span>
                        ) : (
                          <span className="rounded bg-emerald-100 text-emerald-800 border border-emerald-200 px-1 py-0.2 text-[10px] font-black shrink-0">
                            🛠️ Pjt
                          </span>
                        )}

                        <span
                          className={`text-xs font-bold truncate ${
                            done ? "line-through opacity-45" : isActive ? "text-white" : "text-slate-900"
                          }`}
                        >
                          {item.title}
                        </span>

                        {/* 소요시간 및 휴식 표시 */}
                        <span className={`text-[10px] font-mono shrink-0 hidden sm:inline ${isActive ? "text-emerald-100" : "text-slate-500"}`}>
                          ({parsed.duration}분{parsed.breakTime > 0 ? `·휴${parsed.breakTime}분` : ""})
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {done ? (
                          <Check className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <button
                            aria-label={`${item.title} ${isActive ? "완료" : "시작"}`}
                            onClick={() =>
                              setScheduleStatus.mutate({
                                id: item.id,
                                expectedRevision: item.revision,
                                status: isActive ? "completed" : "in_progress",
                              })
                            }
                            className="p-0.5 hover:bg-white hover:text-slate-900 rounded"
                          >
                            {isActive ? (
                              <Check className="h-4 w-4 text-white" />
                            ) : (
                              <Circle className="h-4 w-4 text-slate-400 hover:text-emerald-600" />
                            )}
                          </button>
                        )}
                        <button
                          aria-label={`${item.title} 수정`}
                          onClick={() => {
                            setEditingSchedule(item);
                            setShowSchedule(true);
                          }}
                          className={`p-0.5 opacity-0 group-hover:opacity-100 transition-opacity ${
                            isActive ? "text-white" : "text-slate-400 hover:text-slate-800"
                          }`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </article>
                  );
                })
              ) : (
                <EmptySchedule onAdd={() => setShowSchedule(true)} />
              )}
            </div>
          </div>
        </aside>
      </section>

      {/* 3. 하단 카드 섹션들 */}
      <div className="grid gap-3 sm:grid-cols-2">
        <PinnedRecordSummary
          items={pinnedRecords.data ?? []}
          loading={pinnedRecords.isLoading}
          onViewRecords={() => setLocation("/records")}
        />
        <WeeklySummary
          completedTaskCount={weeklySummary.data?.completedTaskCount ?? 0}
          recordCount={weeklySummary.data?.recordCount ?? 0}
          completedScheduleCount={weeklySummary.data?.completedScheduleCount ?? 0}
          change={weeklySummary.data?.change}
          loading={weeklySummary.isLoading}
        />
      </div>

      {savedSearches.data?.length ? (
        <section aria-label="Today 저장 Record 검색" className="rounded-xl border border-slate-200 bg-white p-2.5 sm:p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-black text-slate-800">저장된 검색 바로가기</span>
            <button type="button" onClick={() => setLocation("/records")} className="text-xs font-bold text-emerald-800 hover:underline">
              전체 보기 →
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {savedSearches.data.slice(0, 6).map(search => (
              <button
                type="button"
                key={search.id}
                onClick={() => setLocation(`/records?savedSearch=${search.id}`)}
                className="pressable rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-bold text-slate-800 hover:bg-emerald-50 hover:text-emerald-900"
              >
                {search.name}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {/* 4. 슬림 빠른 기록 버튼 */}
      <section className="pt-1">
        {!showCapture ? (
          <button
            onClick={() => setShowCapture(true)}
            className="pressable flex h-10 w-full items-center justify-between rounded-xl border-2 border-slate-200 bg-white px-4 hover:border-emerald-500 hover:bg-emerald-50/50 shadow-2xs"
          >
            <span className="text-sm font-black text-slate-900">+ 새로운 생각이나 작업 기록하기...</span>
            <SquarePen className="h-4 w-4 text-emerald-700" />
          </button>
        ) : (
          <CapturePanel workspace={data} onComplete={() => setShowCapture(false)} />
        )}
      </section>

      {/* 5. 똑똑한 스마트 일정 생성기 (시작 + 예상 - 휴식시간 계산 + 카테고리 분리) */}
      {showSchedule && (
        <SmartScheduleComposer
          tasks={data?.tasks ?? []}
          schedule={editingSchedule}
          latestSchedule={editingSchedule ? data?.schedules.find(item => item.id === editingSchedule.id) ?? null : null}
          conflict={scheduleConflict}
          onCancel={() => {
            setShowSchedule(false);
            setEditingSchedule(null);
          }}
          onSubmit={({ title, taskId, plannedStartAt, plannedEndAt, notes, expectedRevision }) => {
            if (editingSchedule)
              updateSchedule.mutate({
                id: editingSchedule.id,
                expectedRevision: expectedRevision ?? editingSchedule.revision,
                title,
                taskId,
                plannedStartAt,
                plannedEndAt,
                notes,
              });
            else createSchedule.mutate({ title, taskId, plannedStartAt, plannedEndAt, notes });
          }}
          busy={createSchedule.isPending || updateSchedule.isPending}
        />
      )}
    </div>
  );
}

function EmptySchedule({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="rounded-xl border border-dashed border-emerald-200 bg-white/60 p-3">
      <p className="font-bold text-slate-900 text-xs">오늘 등록된 일정이 없습니다.</p>
      <p className="mt-0.5 text-xs text-slate-500">프로젝트 작업이나 일상/긴급 일정을 추가하세요.</p>
      <button onClick={onAdd} className="mt-2 text-xs font-bold text-emerald-700 underline">
        + 일정 등록
      </button>
    </div>
  );
}

{/* 스마트 시간 계산 & 카테고리 분리 일정 모달 */}
function SmartScheduleComposer({
  tasks,
  schedule,
  latestSchedule,
  conflict,
  onCancel,
  onSubmit,
  busy,
}: {
  tasks: Array<{ id: number; title: string }>;
  schedule: any | null;
  latestSchedule: any | null;
  conflict: boolean;
  onCancel: () => void;
  onSubmit: (values: {
    title: string;
    taskId: number | null;
    plannedStartAt: Date;
    plannedEndAt?: Date;
    notes: string;
    expectedRevision?: number;
  }) => void;
  busy: boolean;
}) {
  const parsed = parseScheduleNotes(schedule?.notes);
  const [category, setCategory] = useState<ScheduleCategory>(parsed.category);
  const [title, setTitle] = useState(schedule?.title ?? "");
  const [startTime, setStartTime] = useState(
    schedule?.plannedStartAt
      ? new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false }).format(
          new Date(schedule.plannedStartAt)
        )
      : "09:00"
  );
  const [duration, setDuration] = useState<number>(parsed.duration);
  const [breakTime, setBreakTime] = useState<number>(parsed.breakTime);
  const [taskId, setTaskId] = useState(schedule?.taskId ? String(schedule.taskId) : "");

  // 순수 집중 시간 및 종료 시간 자동 계산
  const netFocusMinutes = Math.max(0, duration - breakTime);

  const endTimeString = useMemo(() => {
    const [h, m] = startTime.split(":").map(Number);
    const endMinutes = h * 60 + m + duration;
    const endH = Math.floor(endMinutes / 60) % 24;
    const endM = endMinutes % 60;
    return `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
  }, [startTime, duration]);

  const submit = (expectedRevision?: number) => {
    if (!title.trim()) return;
    const [h, m] = startTime.split(":").map(Number);
    const plannedStartAt = schedule?.plannedStartAt ? new Date(schedule.plannedStartAt) : new Date();
    plannedStartAt.setHours(h, m, 0, 0);

    const plannedEndAt = new Date(plannedStartAt.getTime() + duration * 60 * 1000);
    const notesJson = JSON.stringify({ category, duration, breakTime });

    onSubmit({
      title: title.trim(),
      taskId: category === "project" && taskId ? Number(taskId) : null,
      plannedStartAt,
      plannedEndAt,
      notes: notesJson,
      expectedRevision,
    });
  };

  return (
    <section
      role="dialog"
      aria-modal="true"
      className="fixed inset-x-3 bottom-20 z-50 mx-auto max-w-md rounded-2xl border-2 border-emerald-600 bg-white p-4 shadow-2xl md:bottom-8 text-xs"
    >
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <h3 className="text-sm font-black text-slate-900">{schedule ? "일정 수정" : "새 일정 등록"}</h3>
        <button onClick={onCancel} className="text-slate-400 hover:text-slate-700">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* 1. 카테고리 3종 탭 (프로젝트 vs 일상 vs 긴급) */}
      <div className="mt-2.5 grid grid-cols-3 gap-1.5">
        <button
          type="button"
          onClick={() => setCategory("project")}
          className={`flex items-center justify-center gap-1 rounded-lg py-1.5 font-bold transition-all border ${
            category === "project"
              ? "bg-emerald-700 text-white border-emerald-800 shadow-xs"
              : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
          }`}
        >
          <Wrench className="h-3 w-3" /> 프로젝트
        </button>
        <button
          type="button"
          onClick={() => setCategory("daily")}
          className={`flex items-center justify-center gap-1 rounded-lg py-1.5 font-bold transition-all border ${
            category === "daily"
              ? "bg-sky-700 text-white border-sky-800 shadow-xs"
              : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
          }`}
        >
          <Coffee className="h-3 w-3" /> 일상/생활
        </button>
        <button
          type="button"
          onClick={() => setCategory("urgent")}
          className={`flex items-center justify-center gap-1 rounded-lg py-1.5 font-bold transition-all border ${
            category === "urgent"
              ? "bg-rose-700 text-white border-rose-800 shadow-xs"
              : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
          }`}
        >
          <Zap className="h-3 w-3" /> 긴급/돌발
        </button>
      </div>

      {/* 2. 일정 제목 & 프로젝트 선택 */}
      <div className="mt-2.5 space-y-2">
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="mono-input h-9 text-xs font-bold"
          placeholder={
            category === "project"
              ? "일정 제목 (예: 머티리얼 작업)"
              : category === "daily"
              ? "일상 일정 (예: 점심 식사, 운동, 병원)"
              : "긴급 일정 (예: 긴급 버그 수정, 클라이언트 통화)"
          }
          autoFocus
        />

        {category === "project" && (
          <select
            value={taskId}
            onChange={e => {
              setTaskId(e.target.value);
              const found = tasks.find(t => String(t.id) === e.target.value);
              if (found && !title) setTitle(found.title);
            }}
            className="mono-input h-9 text-xs font-bold"
          >
            <option value="">연결할 Project Task 선택 (선택 사항)</option>
            {tasks.map(task => (
              <option key={task.id} value={task.id}>
                {task.title}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* 3. 🌟 스마트 시간 계산 공식 (시작시간 + 예상시간 - 휴식시간) */}
      <div className="mt-2.5 rounded-xl bg-slate-50 p-2.5 border border-slate-200 space-y-2">
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="font-extrabold text-slate-700 text-[11px] block">시작 시간</label>
            <input
              type="time"
              value={startTime}
              onChange={e => setStartTime(e.target.value)}
              className="mono-input h-8 text-xs font-bold mt-0.5"
            />
          </div>
          <div>
            <label className="font-extrabold text-slate-700 text-[11px] block">예상 소요(분)</label>
            <input
              type="number"
              min="5"
              step="5"
              value={duration}
              onChange={e => setDuration(Number(e.target.value))}
              className="mono-input h-8 text-xs font-bold mt-0.5"
            />
          </div>
          <div>
            <label className="font-extrabold text-slate-700 text-[11px] block">휴식 시간(분)</label>
            <input
              type="number"
              min="0"
              step="5"
              value={breakTime}
              onChange={e => setBreakTime(Number(e.target.value))}
              className="mono-input h-8 text-xs font-bold mt-0.5"
            />
          </div>
        </div>

        {/* 자동 계산 결과 요약 바 */}
        <div className="flex items-center justify-between pt-1.5 border-t border-slate-200 text-[11px]">
          <span className="font-bold text-slate-600">
            ⏰ {startTime} ~ {endTimeString} ({duration}분)
          </span>
          <span className="font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
            순수 집중: {formatMinutes(netFocusMinutes)}
          </span>
        </div>
      </div>

      {/* 저장 버튼 */}
      <button
        onClick={() => submit()}
        disabled={busy || !title.trim()}
        className="pressable mt-3 h-10 w-full rounded-xl bg-emerald-700 text-xs font-black text-white hover:bg-emerald-800 disabled:opacity-40 shadow-sm"
      >
        {busy ? "저장 중..." : schedule ? "일정 수정 완료" : "오늘 일정 등록"}
      </button>
    </section>
  );
}
