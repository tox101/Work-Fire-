import { CalendarDays, Check, ChevronLeft, ChevronRight, Circle, Pencil, Plus, SquarePen, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { CapturePanel } from "@/components/CapturePanel";
import { formatMinutesToHuman, parseTimeToMinutes } from "@/lib/timeParser";
import { trpc } from "@/lib/trpc";
import { createScheduleOutboxId, listPendingScheduleOperations, removePendingScheduleOperation, savePendingScheduleOperation, setPendingScheduleOperationError } from "@/lib/scheduleOutbox";

type ScheduleCategory = "project" | "daily" | "urgent";

type ScheduleLike = {
  id: number;
  title: string;
  taskId: number | null;
  status: "planned" | "in_progress" | "completed" | "cancelled";
  revision: number;
  scheduleType?: "task" | "meeting" | "personal" | "review";
  scheduleFlags?: string[];
  tags?: string[];
  plannedStartAt: Date | string | null;
  plannedEndAt: Date | string | null;
  notes: string | null;
};

function dateHeading(day: Date) {
  return new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", weekday: "short" }).format(day);
}

function parseScheduleNotes(notes: string | null | undefined): { category: ScheduleCategory; duration: number; breakTime: number } {
  if (!notes) return { category: "project", duration: 60, breakTime: 0 };
  try {
    const value = JSON.parse(notes);
    return {
      category: value.category === "daily" || value.category === "urgent" ? value.category : "project",
      duration: Number(value.duration) || 60,
      breakTime: Number(value.breakTime) || 0,
    };
  } catch {
    return { category: "project", duration: 60, breakTime: 0 };
  }
}

function formatTime(value: Date | string | null) {
  if (!value) return "시간 미정";
  return new Intl.DateTimeFormat("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value));
}

function formatRange(item: ScheduleLike) {
  const start = formatTime(item.plannedStartAt);
  return item.plannedEndAt ? `${start}–${formatTime(item.plannedEndAt)}` : start;
}

function categoryMeta(item: ScheduleLike) {
  if (item.scheduleType === "meeting") return { label: "회의", color: "bg-violet-500", text: "text-violet-700" };
  if (item.scheduleType === "personal") return { label: "일상", color: "bg-stone-400", text: "text-stone-700" };
  if (item.scheduleType === "review") return { label: "복기", color: "bg-indigo-500", text: "text-indigo-700" };
  const category = parseScheduleNotes(item.notes).category;
  if (category === "daily") return { label: "일상", color: "bg-stone-400", text: "text-stone-700" };
  if (category === "urgent") return { label: "긴급", color: "bg-orange-500", text: "text-orange-700" };
  return { label: item.taskId ? "작업" : "일정", color: "bg-sky-500", text: "text-sky-700" };
}

function suggestedCategory(title: string): ScheduleCategory | null {
  const value = title.toLowerCase();
  if (/회의|미팅|통화|면담/.test(value)) return "project";
  if (/식사|병원|이동|장보기|운동/.test(value)) return "daily";
  if (/급한|긴급|장애|오류/.test(value)) return "urgent";
  return null;
}

function suggestedTags(title: string) {
  const tags: string[] = [];
  if (/개발|코딩|구현|버그|오류/.test(title)) tags.push("개발");
  if (/기획|설계|조사|분석/.test(title)) tags.push("기획");
  if (/회의|미팅|통화|고객|클라이언트/.test(title)) tags.push("외부대응");
  return tags.slice(0, 3);
}

export default function Today() {
  const [day, setDay] = useState(() => {
    const value = new Date();
    value.setHours(0, 0, 0, 0);
    return value;
  });
  const [showCapture, setShowCapture] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ScheduleLike | null>(null);
  const [initialCategory, setInitialCategory] = useState<ScheduleCategory>("project");
  const [filter, setFilter] = useState<"all" | "task" | "meeting" | "personal" | "urgent">("all");
  const [, setLocation] = useLocation();

  const scheduleWindow = useMemo(() => {
    const start = new Date(day);
    const end = new Date(day);
    end.setDate(end.getDate() + 1);
    return { start, end };
  }, [day]);
  const overview = trpc.workspace.overview.useQuery(scheduleWindow);
  const utils = trpc.useUtils();
  const data = overview.data;
  const allSchedules = (data?.schedules ?? []) as ScheduleLike[];
  const schedules = allSchedules.filter(item => {
    if (filter === "all") return true;
    if (filter === "urgent") return parseScheduleNotes(item.notes).category === "urgent" || item.scheduleFlags?.includes("urgent");
    return (item.scheduleType ?? (parseScheduleNotes(item.notes).category === "daily" ? "personal" : "task")) === filter;
  });
  const completedCount = schedules.filter(item => item.status === "completed").length;
  const pendingCount = schedules.filter(item => item.status === "planned" || item.status === "in_progress").length;
  const activeSchedule = schedules.find(item => item.status === "in_progress") ?? schedules.find(item => item.status === "planned");
  const isToday = day.toDateString() === new Date().toDateString();

  const invalidate = () => {
    void utils.workspace.overview.invalidate();
    void utils.workspace.continue.invalidate();
  };
  const setScheduleStatus = trpc.workspace.setScheduleStatus.useMutation({
    onSuccess: () => invalidate(),
    onError: async (error, variables) => {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        await savePendingScheduleOperation({ id: createScheduleOutboxId(), kind: "status", payload: variables as Record<string, unknown>, createdAt: Date.now(), lastError: error.message });
        toast.message("오프라인입니다. 상태 변경을 연결되면 전송합니다.");
      } else toast.error(error.message);
    },
  });
  const createSchedule = trpc.workspace.createSchedule.useMutation({
    onSuccess: () => {
      setShowSchedule(false);
      invalidate();
      toast.success("일정을 추가했습니다.");
    },
    onError: async (error, variables) => {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        await savePendingScheduleOperation({ id: createScheduleOutboxId(), kind: "create", payload: variables as Record<string, unknown>, createdAt: Date.now(), lastError: error.message });
        toast.message("오프라인입니다. 일정 생성을 연결되면 전송합니다.");
      } else toast.error(error.message);
    },
  });
  const updateSchedule = trpc.workspace.updateSchedule.useMutation({
    onSuccess: () => {
      setShowSchedule(false);
      setEditingSchedule(null);
      invalidate();
      toast.success("일정을 수정했습니다.");
    },
    onError: async (error, variables) => {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        await savePendingScheduleOperation({ id: createScheduleOutboxId(), kind: "update", payload: variables as Record<string, unknown>, createdAt: Date.now(), lastError: error.message });
        toast.message("오프라인입니다. 일정 수정을 연결되면 전송합니다.");
      } else toast.error(error.message);
    },
  });

  const flushScheduleOutbox = async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    const pending = await listPendingScheduleOperations().catch(() => []);
    for (const operation of pending) {
      try {
        if (operation.kind === "create") await createSchedule.mutateAsync(operation.payload as never);
        else if (operation.kind === "update") await updateSchedule.mutateAsync(operation.payload as never);
        else await setScheduleStatus.mutateAsync(operation.payload as never);
        await removePendingScheduleOperation(operation.id);
      } catch (error) {
        await setPendingScheduleOperationError(operation, error instanceof Error ? error.message : "재시도 실패");
      }
    }
    invalidate();
  };

  useEffect(() => {
    void flushScheduleOutbox();
    const onOnline = () => { void flushScheduleOutbox(); };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, []);

  const moveDay = (amount: number) => {
    setDay(current => {
      const next = new Date(current);
      next.setDate(next.getDate() + amount);
      return next;
    });
  };
  const openNewSchedule = (category: ScheduleCategory = "project") => {
    setInitialCategory(category);
    setEditingSchedule(null);
    setShowSchedule(true);
  };
  const openEditSchedule = (item: ScheduleLike) => {
    setEditingSchedule(item);
    setShowSchedule(true);
  };

  const grouped = schedules.reduce<Record<string, ScheduleLike[]>>((groups, item) => {
    const hour = item.plannedStartAt ? new Date(item.plannedStartAt).getHours() : 23;
    const group = hour < 12 ? "오전" : hour < 18 ? "오후" : "저녁";
    (groups[group] ??= []).push(item);
    return groups;
  }, {});

  return (
    <div className="mx-auto max-w-3xl pb-24">
      <header className="mb-3 flex items-center justify-between gap-2">
        <button type="button" onClick={() => moveDay(-1)} aria-label="전날 일정 보기" className="flex h-11 w-11 items-center justify-center rounded-xl text-2xl text-slate-500 hover:bg-slate-100"><ChevronLeft className="h-5 w-5" /></button>
        <div className="min-w-0 text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">오늘의 일정</p>
          <h1 className="truncate text-xl font-black text-slate-950">{dateHeading(day)}</h1>
          {!isToday && <button type="button" onClick={() => { const today = new Date(); today.setHours(0, 0, 0, 0); setDay(today); }} className="text-xs font-bold text-emerald-700 underline underline-offset-2">오늘로 이동</button>}
        </div>
        <button type="button" onClick={() => moveDay(1)} aria-label="다음 날 일정 보기" className="flex h-11 w-11 items-center justify-center rounded-xl text-2xl text-slate-500 hover:bg-slate-100"><ChevronRight className="h-5 w-5" /></button>
      </header>

      <div className="mb-3 flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 shadow-sm ring-1 ring-slate-200/70">
        <p className="text-sm font-extrabold text-slate-800">오늘 {schedules.length}개 · 완료 {completedCount}개 · 남음 {pendingCount}개</p>
        <button type="button" onClick={() => openNewSchedule()} className="pressable inline-flex h-10 shrink-0 items-center gap-1 rounded-lg bg-emerald-700 px-3 text-sm font-black text-white hover:bg-emerald-800"><Plus className="h-4 w-4" /> 일정 추가</button>
      </div>

      {activeSchedule && (
        <section aria-label="현재 또는 다음 일정" className="mb-3 rounded-xl bg-slate-900 px-3.5 py-3 text-white shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-300">{activeSchedule.status === "in_progress" ? "지금" : "다음 일정"}</p>
              <h2 className="mt-0.5 truncate text-lg font-black">{activeSchedule.title}</h2>
              <p className="mt-0.5 text-sm font-semibold text-slate-300">{formatRange(activeSchedule)} · {formatMinutesToHuman(parseScheduleNotes(activeSchedule.notes).duration)}</p>
            </div>
            <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${categoryMeta(activeSchedule).color}`} aria-label={`${categoryMeta(activeSchedule).label} 종류`} />
          </div>
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={() => setScheduleStatus.mutate({ id: activeSchedule.id, expectedRevision: activeSchedule.revision, status: activeSchedule.status === "in_progress" ? "completed" : "in_progress" })} className="pressable h-10 rounded-lg bg-white px-3.5 text-sm font-black text-slate-900">{activeSchedule.status === "in_progress" ? "완료" : "시작"}</button>
            <button type="button" onClick={() => openEditSchedule(activeSchedule)} className="h-10 rounded-lg px-3 text-sm font-bold text-slate-300 hover:bg-white/10">수정</button>
          </div>
        </section>
      )}

      <section aria-label="오늘 일정" className="rounded-xl bg-white px-3 py-2 shadow-sm ring-1 ring-slate-200/70">
        <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1" aria-label="일정 종류 필터">
          {([["all", "전체"], ["task", "작업"], ["meeting", "회의"], ["personal", "일상"], ["urgent", "긴급"]] as const).map(([value, label]) => <button key={value} type="button" onClick={() => setFilter(value)} className={`h-9 shrink-0 rounded-full px-3 text-xs font-bold ${filter === value ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{label}</button>)}
        </div>
        {schedules.length ? Object.entries(grouped).map(([group, items]) => (
          <div key={group} className="py-1.5">
            <h2 className="mb-1 border-b border-slate-100 pb-1 text-xs font-black text-slate-500">{group}</h2>
            {items.map(item => {
              const done = item.status === "completed";
              const active = item.status === "in_progress";
              const meta = categoryMeta(item);
              const duration = parseScheduleNotes(item.notes).duration;
              return (
                <article key={item.id} className={`group flex min-h-[48px] items-center gap-2 border-b border-slate-100 py-1.5 last:border-0 ${active ? "bg-emerald-50/70" : ""}`}>
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${meta.color}`} aria-hidden="true" />
                  <span className={`w-[74px] shrink-0 font-mono text-[13px] font-bold ${done ? "text-slate-400" : "text-slate-600"}`}>{formatTime(item.plannedStartAt)}</span>
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-[15px] font-extrabold ${done ? "text-slate-400 line-through" : "text-slate-900"}`}>{item.title}</p>
                    {active && <p className="text-xs font-bold text-emerald-700">진행 중 · {formatMinutesToHuman(duration)}</p>}
                    {!active && item.tags?.length ? <p className="truncate text-[11px] font-semibold text-slate-400">#{item.tags.slice(0, 2).join(" #")}</p> : null}
                  </div>
                  <span className={`hidden shrink-0 text-[11px] font-bold sm:inline ${meta.text}`}>{meta.label}</span>
                  <span className="shrink-0 text-sm font-black text-slate-500" aria-label={done ? "완료" : active ? "진행 중" : "예정"}>{done ? "✓" : active ? "▶" : "○"}</span>
                  <button type="button" onClick={() => openEditSchedule(item)} aria-label={`${item.title} 수정`} className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-800"><Pencil className="h-4 w-4" /></button>
                </article>
              );
            })}
          </div>
        )) : <EmptySchedule onAdd={() => openNewSchedule()} />}
      </section>

      <div className="mt-3 flex gap-2">
        <button type="button" onClick={() => setShowCapture(true)} className="h-11 flex-1 rounded-lg bg-white text-sm font-extrabold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"><SquarePen className="mr-1 inline h-4 w-4" />기록</button>
        <button type="button" onClick={() => setLocation("/review")} className="h-11 flex-1 rounded-lg bg-white text-sm font-extrabold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"><CalendarDays className="mr-1 inline h-4 w-4" />하루 복기</button>
      </div>

      {showCapture && <section className="mt-3"><CapturePanel workspace={data} onComplete={() => setShowCapture(false)} /></section>}

      {showSchedule && <SmartScheduleComposer tasks={(data?.tasks ?? []) as Array<{ id: number; title: string }>} initialCategory={initialCategory} baseDate={day} schedule={editingSchedule} onCancel={() => { setShowSchedule(false); setEditingSchedule(null); }} onCarryOver={editingSchedule ? () => { const start = editingSchedule.plannedStartAt ? new Date(editingSchedule.plannedStartAt) : new Date(day); const end = editingSchedule.plannedEndAt ? new Date(editingSchedule.plannedEndAt) : null; start.setDate(start.getDate() + 1); if (end) end.setDate(end.getDate() + 1); updateSchedule.mutate({ id: editingSchedule.id, expectedRevision: editingSchedule.revision, plannedStartAt: start, plannedEndAt: end, notes: editingSchedule.notes }); } : undefined} onSubmit={values => { if (editingSchedule) updateSchedule.mutate({ id: editingSchedule.id, expectedRevision: editingSchedule.revision, title: values.title, taskId: values.taskId, scheduleType: values.scheduleType, scheduleFlags: values.scheduleFlags, tags: values.tags, plannedStartAt: values.plannedStartAt, plannedEndAt: values.plannedEndAt, notes: values.notes }); else createSchedule.mutate(values); }} busy={createSchedule.isPending || updateSchedule.isPending} />}
    </div>
  );
}

function EmptySchedule({ onAdd }: { onAdd: () => void }) {
  return <div className="py-8 text-center"><p className="text-sm font-extrabold text-slate-800">등록된 일정이 없습니다.</p><button type="button" onClick={onAdd} className="mt-2 text-sm font-bold text-emerald-700 underline underline-offset-2">+ 첫 일정 추가</button></div>;
}

function SmartScheduleComposer({ tasks, initialCategory, baseDate, schedule, onCancel, onCarryOver, onSubmit, busy }: { tasks: Array<{ id: number; title: string }>; initialCategory: ScheduleCategory; baseDate: Date; schedule: ScheduleLike | null; onCancel: () => void; onCarryOver?: () => void; onSubmit: (values: { title: string; taskId: number | null; scheduleType: "task" | "meeting" | "personal" | "review"; scheduleFlags: Array<"urgent" | "focus" | "external" | "recurring" | "from_idea">; tags: string[]; plannedStartAt: Date; plannedEndAt: Date; notes: string }) => void; busy: boolean }) {
  const parsed = parseScheduleNotes(schedule?.notes);
  const [category, setCategory] = useState<ScheduleCategory>(schedule ? parsed.category : initialCategory);
  const [title, setTitle] = useState(schedule?.title ?? "");
  const [startTime, setStartTime] = useState(schedule?.plannedStartAt ? formatTime(schedule.plannedStartAt) : "09:00");
  const [durationInput, setDurationInput] = useState(schedule ? formatMinutesToHuman(parsed.duration) : "1h");
  const [taskId, setTaskId] = useState(schedule?.taskId ? String(schedule.taskId) : "");
  const [tags, setTags] = useState<string[]>([]);
  const duration = parseTimeToMinutes(durationInput) || 60;
  const recommendation = suggestedCategory(title);
  const endTime = useMemo(() => { const [hours, minutes] = startTime.split(":").map(Number); const total = hours * 60 + minutes + duration; return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`; }, [duration, startTime]);

  const submit = () => {
    if (!title.trim()) return;
    const [hours, minutes] = startTime.split(":").map(Number);
    const start = schedule?.plannedStartAt ? new Date(schedule.plannedStartAt) : new Date(baseDate);
    start.setHours(hours, minutes, 0, 0);
    const end = new Date(start.getTime() + duration * 60 * 1000);
    const scheduleType = category === "daily" ? "personal" : category === "project" && /회의|미팅|통화/.test(title) ? "meeting" : "task";
    onSubmit({ title: title.trim(), taskId: category === "project" && taskId ? Number(taskId) : null, scheduleType, scheduleFlags: category === "urgent" ? ["urgent"] : [], tags, plannedStartAt: start, plannedEndAt: end, notes: JSON.stringify({ category, duration, breakTime: 0 }) });
  };

  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"><section role="dialog" aria-modal="true" className="w-full max-w-md rounded-t-2xl bg-white p-4 shadow-2xl sm:rounded-2xl"><div className="flex items-center justify-between"><h2 className="text-lg font-black text-slate-950">{schedule ? "일정 수정" : "새 일정"}</h2><button type="button" onClick={onCancel} aria-label="일정 창 닫기" className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button></div><div className="mt-3 grid grid-cols-3 gap-1.5"><button type="button" onClick={() => setCategory("project")} className={`h-10 rounded-lg text-sm font-bold ${category === "project" ? "bg-sky-600 text-white" : "bg-slate-100 text-slate-700"}`}>작업</button><button type="button" onClick={() => setCategory("daily")} className={`h-10 rounded-lg text-sm font-bold ${category === "daily" ? "bg-stone-600 text-white" : "bg-slate-100 text-slate-700"}`}>일상</button><button type="button" onClick={() => setCategory("urgent")} className={`h-10 rounded-lg text-sm font-bold ${category === "urgent" ? "bg-orange-600 text-white" : "bg-slate-100 text-slate-700"}`}>긴급</button></div><input autoFocus value={title} onChange={event => setTitle(event.target.value)} className="mono-input mt-3 h-11 text-sm font-bold" placeholder="무엇을 할까요?" />{recommendation && recommendation !== category && <p className="mt-1 text-xs font-bold text-sky-700">추천 분류: {recommendation === "daily" ? "일상" : recommendation === "urgent" ? "긴급" : "작업"}</p>}{category === "project" && <select value={taskId} onChange={event => { setTaskId(event.target.value); const task = tasks.find(item => String(item.id) === event.target.value); if (task && !title) setTitle(task.title); }} className="mono-input mt-2 h-11 text-sm"><option value="">연결할 작업 선택 (선택)</option>{tasks.map(task => <option key={task.id} value={task.id}>{task.title}</option>)}</select>}<div className="mt-3 grid grid-cols-2 gap-2"><label className="text-xs font-bold text-slate-600">시작<input type="time" value={startTime} onChange={event => setStartTime(event.target.value)} className="mono-input mt-1 h-11 text-sm" /></label><label className="text-xs font-bold text-slate-600">예상 소요<input value={durationInput} onChange={event => setDurationInput(event.target.value)} className="mono-input mt-1 h-11 text-sm" placeholder="1h" /></label></div><div className="mt-3"><label className="text-xs font-bold text-slate-600">태그 <span className="font-normal text-slate-400">(선택, 쉼표로 구분)</span><input value={tags.join(", ")} onChange={event => setTags(event.target.value.split(",").map(tag => tag.trim()).filter(Boolean).slice(0, 3))} className="mono-input mt-1 h-11 text-sm" placeholder="기획, 개발" /></label>{suggestedTags(title).length > 0 && tags.length === 0 && <button type="button" onClick={() => setTags(suggestedTags(title))} className="mt-1 text-xs font-bold text-sky-700 underline underline-offset-2">추천 태그: {suggestedTags(title).join(", ")}</button>}</div><p className="mt-2 text-sm font-bold text-slate-600">{startTime}–{endTime} · {formatMinutesToHuman(duration)}</p><div className="mt-4 flex gap-2">{onCarryOver && <button type="button" onClick={onCarryOver} disabled={busy} className="h-12 flex-1 rounded-lg bg-amber-50 text-sm font-black text-amber-800 ring-1 ring-amber-200">내일로 미루기</button>}<button type="button" onClick={submit} disabled={busy || !title.trim()} className="h-12 flex-1 rounded-lg bg-emerald-700 text-sm font-black text-white hover:bg-emerald-800 disabled:opacity-40">{busy ? "저장 중…" : schedule ? "수정 저장" : "일정 저장"}</button></div></section></div>;
}
