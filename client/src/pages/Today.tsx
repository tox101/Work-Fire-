import { CapturePanel } from "@/components/CapturePanel";
import { PinnedRecordSummary, RecentCaptureSummary, SuggestedTaskSummary, WeeklySummary } from "@/components/WorkspaceInsights";
import { ConflictResolutionNotice } from "@/components/ConflictResolutionNotice";
import { trpc } from "@/lib/trpc";
import { getSuggestedTask } from "@/lib/workspaceSummary";
import { Check, Circle, Clock3, Pause, Pencil, Play, Plus, SquarePen } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

function getDayWindow() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

function getWeekWindow() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return { start, end };
}

function dateHeading() {
  return new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", weekday: "long" }).format(new Date());
}

export default function Today() {
  const [dayWindow] = useState(getDayWindow);
  const [weekWindow] = useState(getWeekWindow);
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const overview = trpc.workspace.overview.useQuery(dayWindow);
  const continueData = trpc.workspace.continue.useQuery();
  const pinnedRecords = trpc.workspace.pinnedRecordSummaries.useQuery();
  const savedSearches = trpc.workspace.savedRecordSearches.useQuery();
  const weeklySummary = trpc.workspace.weeklySummary.useQuery(weekWindow);
  const handleMutationError = (error: { message: string }) => { toast.error(error.message); void utils.workspace.overview.invalidate(); void utils.workspace.continue.invalidate(); };
  const setTaskStatus = trpc.workspace.setTaskStatus.useMutation({ onSuccess: () => { utils.workspace.overview.invalidate(); utils.workspace.continue.invalidate(); }, onError: handleMutationError });
  const setScheduleStatus = trpc.workspace.setScheduleStatus.useMutation({ onSuccess: () => utils.workspace.overview.invalidate(), onError: handleMutationError });
  const [showCapture, setShowCapture] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleConflict, setScheduleConflict] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<{ id: number; revision: number; title: string; taskId: number | null; plannedStartAt: Date | null } | null>(null);
  const closeSchedule = () => { setShowSchedule(false); setScheduleConflict(false); setEditingSchedule(null); };
  const createSchedule = trpc.workspace.createSchedule.useMutation({ onSuccess: () => { closeSchedule(); utils.workspace.overview.invalidate(); } });
  const updateSchedule = trpc.workspace.updateSchedule.useMutation({ onSuccess: () => { closeSchedule(); utils.workspace.overview.invalidate(); }, onError: error => { if (error.data?.code === "CONFLICT") setScheduleConflict(true); else toast.error(error.message); void utils.workspace.overview.invalidate(); } });

  const data = overview.data;
  const projectById = useMemo(() => new Map(data?.projects.map(project => [project.id, project]) ?? []), [data?.projects]);
  const stageById = useMemo(() => new Map(data?.stages.map(stage => [stage.id, stage]) ?? []), [data?.stages]);
  const taskById = useMemo(() => new Map(data?.tasks.map(task => [task.id, task]) ?? []), [data?.tasks]);
  const now = data?.schedules.find(item => item.status === "in_progress") ?? null;
  const continueItem = continueData.data;
  const suggestedTask = useMemo(() => getSuggestedTask(data?.tasks ?? []), [data?.tasks]);
  const latestRecord = data?.recentRecords[0] ?? null;

  if (overview.isLoading || continueData.isLoading) return <TodaySkeleton />;
  if (overview.isError) return <section className="block-shadow border border-neutral-950 bg-white p-8"><p className="industrial-label text-neutral-500">System status</p><h1 className="industrial-title mt-3 text-4xl">데이터를 불러오지 못했습니다.</h1><button onClick={() => overview.refetch()} className="mt-6 bg-neutral-950 px-4 py-3 text-sm font-bold text-white">다시 시도</button></section>;

  const linkedTask = now?.taskId ? taskById.get(now.taskId) : continueItem?.task;
  const linkedProject = linkedTask?.projectId ? projectById.get(linkedTask.projectId) : continueItem?.project;
  const linkedStage = linkedTask?.stageId ? stageById.get(linkedTask.stageId) : continueItem?.stage;
  const suggestedProject = suggestedTask?.projectId ? projectById.get(suggestedTask.projectId) : null;

  return (
    <div className="space-y-4">
      <header className="grid gap-3 border-b border-violet-100 pb-4 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <p className="industrial-label text-violet-400">Today / {dateHeading()}</p>
          <h1 className="industrial-title mt-1 text-4xl text-violet-950 sm:text-5xl">오늘의<br />다음 행동</h1>
        </div>
        <p className="max-w-60 text-[13px] leading-5 text-violet-600">작은 일이라도 끝냅니다. 복잡한 맥락은 시스템이 기억합니다.</p>
      </header>

      <section className="grid gap-4 lg:grid-cols-[1.08fr_.92fr]">
        <div className="block-shadow border border-violet-200 bg-violet-500 p-4 text-white sm:p-5">
          <div className="flex items-center justify-between"><p className="industrial-label text-violet-200">{now ? "Now / 진행 중" : "Continue / 이어서"}</p><Clock3 className="h-5 w-5 text-violet-200" /></div>
          {linkedTask ? (
            <>
              <h2 className="industrial-title mt-4 text-3xl">{linkedTask.title}</h2>
              <p className="mt-2 text-sm text-violet-100">{linkedProject?.title ?? "독립 작업"}{linkedStage ? ` / ${linkedStage.title}` : ""}</p>
              {continueItem?.lastRecord && <blockquote className="mt-4 border-l-2 border-violet-100 pl-3 text-sm leading-5 text-violet-100">“{continueItem.lastRecord.content}”</blockquote>}
              <div className="mt-4 border-t border-violet-300 pt-3"><p className="industrial-label text-violet-200">Next action</p><p className="mt-1 text-sm font-semibold">{linkedTask.nextAction || "다음 행동을 남겨 주세요."}</p></div>
              <div className="mt-4 flex flex-wrap gap-2">
                {linkedTask.status !== "in_progress" && <button onClick={() => setTaskStatus.mutate({ id: linkedTask.id, expectedRevision: linkedTask.revision, status: "in_progress" })} className="pressable flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-violet-700"><Play className="h-3.5 w-3.5 fill-current" /> 시작</button>}
                <button onClick={() => setTaskStatus.mutate({ id: linkedTask.id, expectedRevision: linkedTask.revision, status: "done" })} className="pressable flex h-10 items-center gap-2 rounded-xl border border-violet-200 px-4 text-sm font-bold hover:bg-violet-600"><Check className="h-4 w-4" /> 완료</button>
                <button onClick={() => setTaskStatus.mutate({ id: linkedTask.id, expectedRevision: linkedTask.revision, status: "on_hold" })} className="pressable flex h-10 items-center gap-2 px-3 text-sm text-violet-100 hover:text-white"><Pause className="h-4 w-4" /> 보류</button>
              </div>
            </>
          ) : (
            <div className="py-2">
              {suggestedTask ? <SuggestedTaskSummary task={suggestedTask} projectTitle={suggestedProject?.title ?? "연결된 Project 없음"} onStart={() => setTaskStatus.mutate({ id: suggestedTask.id, expectedRevision: suggestedTask.revision, status: "in_progress" })} /> : <>
                <h2 className="industrial-title text-3xl">시작할 작업이<br />없습니다.</h2><p className="mt-2 text-sm leading-5 text-violet-100">프로젝트를 만들거나 오늘의 일정을 추가하세요.</p><button onClick={() => setLocation("/projects")} className="pressable mt-4 rounded-lg bg-white px-4 py-2.5 text-sm font-bold text-violet-700">Project 만들기</button>
              </>}
              {latestRecord && <RecentCaptureSummary content={latestRecord.content} />}
            </div>
          )}
        </div>

        <aside className="relative overflow-hidden rounded-2xl border border-emerald-100 bg-[#fbfffc] p-4 sm:p-5">
          <div className="absolute right-0 top-0 h-16 w-16 rounded-bl-2xl bg-emerald-100/70" />
          <p className="industrial-label relative text-emerald-500">Today / 일정</p>
          <div className="relative mt-4 space-y-1">
            {data?.schedules.length ? data.schedules.map(item => {
              const task = item.taskId ? taskById.get(item.taskId) : undefined;
              const project = task?.projectId ? projectById.get(task.projectId) : undefined;
              const done = item.status === "completed";
              const isActive = item.status === "in_progress";
              const time = item.plannedStartAt ? new Intl.DateTimeFormat("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false }).format(item.plannedStartAt) : "시간 미정";
              return <article key={item.id} className={`group grid grid-cols-[62px_1fr_auto] items-start gap-2 rounded-lg px-2 py-2 ${isActive ? "bg-emerald-500 text-white" : "hover:bg-emerald-50"}`}>
                <span className={`text-xs font-bold ${isActive ? "text-white" : "text-neutral-500"}`}>{time}</span>
                <div><p className={`font-bold ${done ? "line-through opacity-45" : ""}`}>{item.title}</p>{task ? <p className={`mt-1 text-xs ${isActive ? "text-neutral-400" : "text-neutral-500"}`}>{project?.title ?? "Project"}{task ? ` / ${task.title}` : ""}</p> : <p className={`mt-1 text-xs ${isActive ? "text-neutral-500" : "text-neutral-400"}`}>개인 일정</p>}</div>
                <div className="flex gap-1">{done ? <Check className="h-4 w-4" /> : <button aria-label={`${item.title} ${isActive ? "완료" : "시작"}`} onClick={() => setScheduleStatus.mutate({ id: item.id, expectedRevision: item.revision, status: isActive ? "completed" : "in_progress" })} className="mt-0.5 rounded-full p-1 hover:bg-white hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current">{isActive ? <Check className="h-4 w-4" /> : <Circle className="h-4 w-4" />}</button>}<button aria-label={`${item.title} 일정 수정`} onClick={() => { setEditingSchedule({ id: item.id, revision: item.revision, title: item.title, taskId: item.taskId, plannedStartAt: item.plannedStartAt }); setShowSchedule(true); }} className={`rounded p-1 opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current ${isActive ? "hover:bg-white hover:text-neutral-950" : "hover:bg-neutral-200"}`}><Pencil className="h-3.5 w-3.5" /></button></div>
              </article>;
            }) : <EmptySchedule onAdd={() => setShowSchedule(true)} />}
          </div>
          {data?.schedules.length ? <button onClick={() => { setEditingSchedule(null); setScheduleConflict(false); setShowSchedule(true); }} className="mt-3 flex items-center gap-1.5 text-sm font-bold text-emerald-600 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"><Plus className="h-4 w-4" /> 일정 추가</button> : null}
        </aside>
      </section>

      <PinnedRecordSummary items={pinnedRecords.data ?? []} loading={pinnedRecords.isLoading} onViewRecords={() => setLocation("/records")} />

      {savedSearches.data?.length ? <section aria-label="Today 저장 Record 검색" className="rounded-2xl border border-emerald-100 bg-white/80 p-3 sm:p-4"><div className="flex items-center justify-between gap-3"><div><p className="industrial-label text-emerald-600">Saved searches</p><h2 className="industrial-title mt-1 text-xl text-violet-950">바로 찾기</h2></div><button type="button" onClick={() => setLocation("/records")} className="pressable text-xs font-bold text-emerald-700 hover:underline">전체 보기</button></div><div className="mt-3 flex flex-wrap gap-1.5">{savedSearches.data.slice(0, 4).map(search => <button type="button" key={search.id} onClick={() => setLocation(`/records?savedSearch=${search.id}`)} aria-label={`${search.name} 저장 검색 실행`} className="pressable rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100">{search.name}</button>)}</div></section> : null}

      <WeeklySummary completedTaskCount={weeklySummary.data?.completedTaskCount ?? 0} recordCount={weeklySummary.data?.recordCount ?? 0} completedScheduleCount={weeklySummary.data?.completedScheduleCount ?? 0} change={weeklySummary.data?.change} loading={weeklySummary.isLoading} />

      <section className="border-t border-violet-100 pt-4">
        {!showCapture ? <button onClick={() => setShowCapture(true)} className="pressable block-shadow flex h-11 w-full items-center justify-between border border-violet-100 bg-white/90 px-4 text-left hover:bg-violet-50 sm:px-5"><span className="industrial-title text-xl text-violet-950">기록하기</span><SquarePen className="h-4 w-4 text-violet-400" /></button> : <CapturePanel workspace={data} onComplete={() => setShowCapture(false)} />}
      </section>

      {showSchedule && <ScheduleComposer tasks={data?.tasks ?? []} schedule={editingSchedule} latestSchedule={editingSchedule ? data?.schedules.find(item => item.id === editingSchedule.id) ?? null : null} conflict={scheduleConflict} onCancel={closeSchedule} onSubmit={({ title, taskId, plannedStartAt, expectedRevision }) => {
        if (editingSchedule) updateSchedule.mutate({ id: editingSchedule.id, expectedRevision: expectedRevision ?? editingSchedule.revision, title, taskId, plannedStartAt });
        else createSchedule.mutate({ title, taskId, plannedStartAt });
      }} busy={createSchedule.isPending || updateSchedule.isPending} />}
    </div>
  );
}

function EmptySchedule({ onAdd }: { onAdd: () => void }) { return <div className="rounded-xl border border-dashed border-emerald-200 bg-white/60 p-3"><p className="font-bold text-violet-900">오늘 등록된 일정이 없습니다.</p><p className="mt-1 text-sm leading-5 text-violet-500">작업과 연결하거나 독립 개인 일정으로 등록할 수 있습니다.</p><button onClick={onAdd} className="mt-3 border-b border-emerald-500 text-sm font-bold text-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">일정 추가</button></div>; }
function TodaySkeleton() { return <div className="animate-pulse space-y-6"><div className="h-32 w-2/3 rounded-3xl bg-violet-100" /><div className="grid gap-5 lg:grid-cols-2"><div className="h-72 rounded-3xl bg-violet-200" /><div className="h-72 rounded-3xl bg-emerald-100" /></div></div>; }

function ScheduleComposer({ tasks, schedule, latestSchedule, conflict, onCancel, onSubmit, busy }: { tasks: Array<{ id: number; title: string }>; schedule: { id: number; revision: number; title: string; taskId: number | null; plannedStartAt: Date | null } | null; latestSchedule: { revision: number; title: string; plannedStartAt: Date | null } | null; conflict: boolean; onCancel: () => void; onSubmit: (values: { title: string; taskId: number | null; plannedStartAt: Date; expectedRevision?: number }) => void; busy: boolean }) {
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("09:00");
  const [taskId, setTaskId] = useState("");
  useEffect(() => {
    setTitle(schedule?.title ?? "");
    setTaskId(schedule?.taskId ? String(schedule.taskId) : "");
    setTime(schedule?.plannedStartAt ? new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false }).format(schedule.plannedStartAt) : "09:00");
  }, [schedule]);
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onCancel(); };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onCancel]);
  const submit = (expectedRevision?: number) => {
    if (!title.trim()) return;
    const [hour, minute] = time.split(":").map(Number);
    const plannedStartAt = schedule?.plannedStartAt ? new Date(schedule.plannedStartAt) : new Date();
    plannedStartAt.setHours(hour, minute, 0, 0);
    onSubmit({ title: title.trim(), taskId: taskId ? Number(taskId) : null, plannedStartAt, expectedRevision });
  };
  return <section role="dialog" aria-modal="true" aria-labelledby="schedule-composer-heading" className="block-shadow fixed inset-x-4 bottom-20 z-50 mx-auto max-w-lg border border-violet-100 bg-white p-5 md:bottom-8"><div className="flex items-center justify-between"><p id="schedule-composer-heading" className="industrial-label text-violet-400">{schedule ? "Edit schedule" : "New schedule"}</p><button onClick={onCancel} className="text-sm font-bold text-violet-600 underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400">닫기</button></div><input value={title} onChange={event => setTitle(event.target.value)} className="mono-input mt-4" placeholder="일정 제목" autoFocus aria-label="일정 제목" /><div className="mt-3 grid grid-cols-2 gap-3"><input type="time" value={time} onChange={event => setTime(event.target.value)} className="mono-input" aria-label="일정 시간" /><select value={taskId} onChange={event => setTaskId(event.target.value)} className="mono-input" aria-label="연결 Task"><option value="">독립 개인 일정</option>{tasks.map(task => <option key={task.id} value={task.id}>{task.title}</option>)}</select></div>{conflict && schedule && latestSchedule ? <ConflictResolutionNotice entityLabel="Schedule" latest={`${latestSchedule.title}${latestSchedule.plannedStartAt ? ` · ${new Intl.DateTimeFormat("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false }).format(latestSchedule.plannedStartAt)}` : ""}`} proposed={`${title} · ${time}`} onRetry={() => submit(latestSchedule.revision)} onDismiss={onCancel} /> : null}<button onClick={() => submit()} disabled={busy || !title.trim()} className="pressable mt-4 h-11 w-full rounded-xl bg-violet-500 text-sm font-bold text-white hover:bg-violet-600 disabled:bg-violet-200">{busy ? "저장 중" : schedule ? "일정 저장" : "일정 등록"}</button></section>;
}
