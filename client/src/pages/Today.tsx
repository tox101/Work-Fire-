import { CalendarDays, Check, ChevronLeft, ChevronRight, Circle, Clock3, Pencil, Plus, SquarePen, Trash2, X } from "lucide-react";
import { type PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { CapturePanel } from "@/components/CapturePanel";
import { formatMinutesToHuman } from "@/lib/timeParser";
import { trpc } from "@/lib/trpc";
import { createScheduleOutboxId, listPendingScheduleOperations, removePendingScheduleOperation, savePendingScheduleOperation, setPendingScheduleOperationError } from "@/lib/scheduleOutbox";

type ScheduleCategory = "project" | "meeting" | "daily" | "urgent";

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

const DATE_HEADING_FORMATTER = new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", weekday: "short" });
const SHORT_DATE_FORMATTER = new Intl.DateTimeFormat("ko-KR", { month: "numeric", day: "numeric", weekday: "short" });
const WEEKDAY_FORMATTER = new Intl.DateTimeFormat("ko-KR", { weekday: "short" });

function dateHeading(day: Date) {
  return DATE_HEADING_FORMATTER.format(day);
}

function parseScheduleNotes(notes: string | null | undefined): { category: ScheduleCategory; duration: number; breakTime: number } {
  if (!notes) return { category: "project", duration: 60, breakTime: 0 };
  try {
    const value = JSON.parse(notes);
    return {
      category: value.category === "meeting" || value.category === "daily" || value.category === "urgent" ? value.category : "project",
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

function formatShortDate(value: Date | string | null) {
  if (!value) return "날짜 미정";
  return SHORT_DATE_FORMATTER.format(new Date(value));
}

const KOREA_HOLIDAYS_2026 = new Set(["2026-01-01", "2026-02-16", "2026-02-17", "2026-02-18", "2026-03-01", "2026-03-02", "2026-05-05", "2026-05-24", "2026-05-25", "2026-06-03", "2026-06-06", "2026-07-17", "2026-08-15", "2026-08-17", "2026-09-24", "2026-09-25", "2026-09-26", "2026-10-03", "2026-10-05", "2026-10-09", "2026-12-25"]);

function isRestDay(value: Date | string | null) {
  if (!value) return false;
  const date = new Date(value);
  const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  return date.getDay() === 0 || date.getDay() === 6 || KOREA_HOLIDAYS_2026.has(key);
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
  const [viewMode, setViewMode] = useState<"day" | "week">("day");
  const [optimisticStatuses, setOptimisticStatuses] = useState<Record<number, ScheduleLike["status"]>>({});
  const [, setLocation] = useLocation();

  const scheduleWindow = useMemo(() => {
    const start = new Date(day);
    const end = new Date(day);
    end.setDate(end.getDate() + (viewMode === "week" ? 7 : 1));
    return { start, end };
  }, [day, viewMode]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const value = new Date(day);
    value.setDate(value.getDate() + index);
    return value;
  }), [day]);
  const overview = trpc.workspace.overview.useQuery(scheduleWindow);
  const utils = trpc.useUtils();
  const data = overview.data;
  const allSchedules = (data?.schedules ?? []) as ScheduleLike[];
  const schedules = allSchedules;
  const orderedSchedules = useMemo(() => [...schedules].sort((left, right) => {
    const leftStatus = optimisticStatuses[left.id] ?? left.status;
    const rightStatus = optimisticStatuses[right.id] ?? right.status;
    const completedOrder = Number(leftStatus === "completed") - Number(rightStatus === "completed");
    if (completedOrder !== 0) return completedOrder;
    const leftTime = left.plannedStartAt ? new Date(left.plannedStartAt).getTime() : Number.MAX_SAFE_INTEGER;
    const rightTime = right.plannedStartAt ? new Date(right.plannedStartAt).getTime() : Number.MAX_SAFE_INTEGER;
    return leftTime - rightTime;
  }), [schedules, optimisticStatuses]);
  const completedCount = useMemo(() => schedules.filter(item => (optimisticStatuses[item.id] ?? item.status) === "completed").length, [schedules, optimisticStatuses]);
  const pendingCount = useMemo(() => schedules.filter(item => { const status = optimisticStatuses[item.id] ?? item.status; return status === "planned" || status === "in_progress"; }).length, [schedules, optimisticStatuses]);
  const invalidate = () => {
    void utils.workspace.overview.invalidate();
    void utils.workspace.continue.invalidate();
  };
  const setScheduleStatus = trpc.workspace.setScheduleStatus.useMutation({
    onSuccess: (_result, variables) => {
      setOptimisticStatuses(current => { const next = { ...current }; delete next[variables.id]; return next; });
      invalidate();
    },
    onError: async (error, variables) => {
      setOptimisticStatuses(current => { const next = { ...current }; delete next[variables.id]; return next; });
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
  const deleteSchedule = trpc.workspace.deleteSchedule.useMutation({
    onSuccess: () => {
      setShowSchedule(false);
      setEditingSchedule(null);
      invalidate();
      toast.success("일정을 삭제했습니다.");
    },
    onError: error => toast.error(error.message || "일정 삭제에 실패했습니다."),
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

  const openNewSchedule = (category: ScheduleCategory = "project") => {
    setInitialCategory(category);
    setEditingSchedule(null);
    setShowSchedule(true);
  };
  const openEditSchedule = (item: ScheduleLike) => {
    setEditingSchedule(item);
    setShowSchedule(true);
  };

  const moveWeek = (amount: number) => {
    setDay(current => {
      const next = new Date(current);
      next.setDate(next.getDate() + amount * 7);
      return next;
    });
  };
  const moveDay = (amount: number) => {
    setDay(current => {
      const next = new Date(current);
      next.setDate(next.getDate() + amount);
      return next;
    });
  };
  const goToday = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    setDay(today);
    setViewMode("day");
  };

  return (
    <div className="mx-auto max-w-5xl pb-16">
      <header className="relative mb-3 flex min-h-11 items-center justify-center">
        <button type="button" onClick={() => viewMode === "week" ? moveWeek(-1) : moveDay(-1)} aria-label={viewMode === "week" ? "이전 7일 일정 보기" : "전날 일정 보기"} className="absolute left-0 flex h-11 w-11 items-center justify-center rounded-xl text-2xl text-slate-500 hover:bg-slate-100"><ChevronLeft className="h-5 w-5" /></button>
        <div className="w-full overflow-x-auto px-8 text-center">
          {viewMode === "day" ? <h1 className="truncate text-xl font-black text-slate-950">{dateHeading(day)}</h1> : <div className="mx-auto flex w-max min-w-full items-center justify-center gap-3 whitespace-nowrap text-xs font-black text-slate-700 sm:gap-6">{weekDays.map(value => <span key={value.toISOString()} className={`shrink-0 px-0.5 ${isRestDay(value) ? "text-red-500" : undefined}`}>{value.getMonth() + 1}/{value.getDate()} {WEEKDAY_FORMATTER.format(value)}</span>)}</div>}
        </div>
        <button type="button" onClick={() => viewMode === "week" ? moveWeek(1) : moveDay(1)} aria-label={viewMode === "week" ? "다음 7일 일정 보기" : "다음 날 일정 보기"} className="absolute right-0 flex h-11 w-11 items-center justify-center rounded-xl text-2xl text-slate-500 hover:bg-slate-100"><ChevronRight className="h-5 w-5" /></button>
      </header>

      <div className="mb-2 grid grid-cols-2 rounded-lg bg-slate-100 p-1" role="tablist" aria-label="일정 보기 방식">
        <button type="button" role="tab" aria-selected={viewMode === "day"} onClick={goToday} className={`h-9 touch-manipulation rounded-md text-xs font-black ${viewMode === "day" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>오늘</button>
        <button type="button" role="tab" aria-selected={viewMode === "week"} onClick={() => setViewMode("week")} className={`h-9 touch-manipulation rounded-md text-xs font-black ${viewMode === "week" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>7일 보기</button>
      </div>

      <div className="mb-2 flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-1 shadow-sm ring-1 ring-slate-200/70">
        <p className="text-sm font-extrabold text-slate-800">{viewMode === "week" ? "7일 일정" : "오늘"} {schedules.length}개 · 완료 {completedCount}개 · 남음 {pendingCount}개</p>
        <button type="button" onClick={() => openNewSchedule()} className="pressable inline-flex h-9 shrink-0 touch-manipulation items-center gap-1 rounded-md bg-emerald-700 px-2.5 text-xs font-black text-white hover:bg-emerald-800"><Plus className="h-3.5 w-3.5" /> 일정 추가</button>
      </div>

      <section aria-label={viewMode === "week" ? "7일 일정" : "오늘 일정"} className="rounded-xl bg-white px-3 py-2 shadow-sm ring-1 ring-slate-200/70">
        {orderedSchedules.length ? orderedSchedules.map((item, index) => {
              const displayStatus = optimisticStatuses[item.id] ?? item.status;
              const done = displayStatus === "completed";
              const active = displayStatus === "in_progress";
              const dateKey = item.plannedStartAt ? new Date(item.plannedStartAt).toDateString() : "unknown";
              const previousDateKey = index > 0 && orderedSchedules[index - 1].plannedStartAt ? new Date(orderedSchedules[index - 1].plannedStartAt as Date | string).toDateString() : "unknown";
              const showDateHeading = viewMode === "week" && dateKey !== previousDateKey;
              const duration = parseScheduleNotes(item.notes).duration;
              return (
                <div key={item.id}>{showDateHeading && <div className={`border-b border-slate-200 bg-slate-50 px-2 py-2 text-sm font-black ${isRestDay(item.plannedStartAt) ? "text-red-600" : "text-slate-700"}`}>{formatShortDate(item.plannedStartAt)} {item.plannedStartAt ? WEEKDAY_FORMATTER.format(new Date(item.plannedStartAt)) : ""}</div>}<article className={`group flex min-h-[30px] items-center gap-1 border-b border-slate-100 py-0 last:border-0 sm:gap-2 ${active ? "bg-emerald-50/70" : ""}`}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={done}
                    aria-label={`${item.title} ${done ? "다시 진행" : "완료"}`}
                    title={done ? "다시 진행" : "완료 처리"}
                    onClick={() => { const nextStatus = done ? "planned" : "completed"; setOptimisticStatuses(current => ({ ...current, [item.id]: nextStatus })); setScheduleStatus.mutate({ id: item.id, expectedRevision: item.revision, status: nextStatus }); }}
                    className="flex h-8 w-8 shrink-0 touch-manipulation items-center justify-center rounded p-0"
                  >
                    <span className={`flex h-6 w-6 items-center justify-center rounded border-2 transition-colors ${done ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300 bg-white text-transparent hover:border-emerald-500"}`}>
                      <Check className="h-3 w-3" aria-hidden="true" />
                    </span>
                  </button>
                  <span className={`w-[56px] shrink-0 font-mono text-sm font-extrabold sm:w-[72px] sm:text-base ${done ? "text-slate-400" : "text-slate-700"}`}>{formatTime(item.plannedStartAt)}</span>
                  <div className="min-w-0 flex-1">
                    <p className={`flex min-w-0 items-baseline gap-2 text-base font-black leading-tight ${done ? "text-slate-400" : "text-slate-950"}`}><span className="min-w-0 truncate">{item.title} <span className="whitespace-nowrap font-mono text-sm font-bold text-slate-400">({formatTime(item.plannedEndAt)})</span></span></p>
                    {active && <p className="text-[10px] font-bold text-emerald-700">진행 중 · {formatMinutesToHuman(duration)}</p>}
                    {!active && item.tags?.length ? <p className="hidden truncate text-[11px] font-semibold text-slate-400 sm:block">#{item.tags.slice(0, 2).join(" #")}</p> : null}
                  </div>
                  <button type="button" onClick={() => openEditSchedule(item)} aria-label={`${item.title} 수정`} className="flex h-9 w-9 shrink-0 touch-manipulation items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-800"><Pencil className="h-3.5 w-3.5" /></button>
                </article></div>
              );
            }) : <EmptySchedule onAdd={() => openNewSchedule()} />}
      </section>

      <div className="mt-3">
        <button type="button" onClick={() => setShowCapture(true)} className="h-11 w-full rounded-lg bg-white text-sm font-extrabold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"><SquarePen className="mr-1 inline h-4 w-4" />기록하기</button>
      </div>

      {showCapture && <section className="mt-3"><CapturePanel workspace={data} onComplete={() => setShowCapture(false)} /></section>}

      {showSchedule && <SmartScheduleComposer tasks={(data?.tasks ?? []) as Array<{ id: number; title: string }>} initialCategory={initialCategory} baseDate={day} schedule={editingSchedule} onCancel={() => { setShowSchedule(false); setEditingSchedule(null); }} onDelete={editingSchedule ? () => { if (window.confirm(`“${editingSchedule.title}” 일정을 삭제할까요?`)) deleteSchedule.mutate({ id: editingSchedule.id }); } : undefined} onCarryOver={editingSchedule ? () => { const start = editingSchedule.plannedStartAt ? new Date(editingSchedule.plannedStartAt) : new Date(day); const end = editingSchedule.plannedEndAt ? new Date(editingSchedule.plannedEndAt) : null; start.setDate(start.getDate() + 1); if (end) end.setDate(end.getDate() + 1); updateSchedule.mutate({ id: editingSchedule.id, expectedRevision: editingSchedule.revision, plannedStartAt: start, plannedEndAt: end, notes: editingSchedule.notes }); } : undefined} onSubmit={values => { if (editingSchedule) updateSchedule.mutate({ id: editingSchedule.id, expectedRevision: editingSchedule.revision, title: values.title, taskId: values.taskId, scheduleType: values.scheduleType, scheduleFlags: values.scheduleFlags, tags: values.tags, plannedStartAt: values.plannedStartAt, plannedEndAt: values.plannedEndAt, notes: values.notes }); else createSchedule.mutate(values); }} busy={createSchedule.isPending || updateSchedule.isPending || deleteSchedule.isPending} />}
    </div>
  );
}

function EmptySchedule({ onAdd }: { onAdd: () => void }) {
  return <div className="py-8 text-center"><p className="text-sm font-extrabold text-slate-800">등록된 일정이 없습니다.</p><button type="button" onClick={onAdd} className="mt-2 text-sm font-bold text-emerald-700 underline underline-offset-2">+ 첫 일정 추가</button></div>;
}

const SCHEDULE_DURATION_OPTIONS = Array.from({ length: 10 }, (_, index) => (index + 1) * 30);
const SCHEDULE_TAGS_KEY = "personal-work-os:schedule-tags:v1";

function readScheduleTags() {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(SCHEDULE_TAGS_KEY) ?? "[]");
    return Array.isArray(value) ? value.filter((tag): tag is string => typeof tag === "string").slice(0, 12) : [];
  } catch { return []; }
}

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return (hours * 60 + minutes) % (24 * 60);
}

function minutesToTime(value: number) {
  const minutes = ((value % (24 * 60)) + (24 * 60)) % (24 * 60);
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

function ClockTimePicker({ value, onChange, onClose }: { value: string; onChange: (value: string) => void; onClose: () => void }) {
  const dialRef = useRef<HTMLDivElement>(null);
  const initial = timeToMinutes(value);
  const [period, setPeriod] = useState<"오전" | "오후">(initial >= 12 * 60 ? "오후" : "오전");
  const [hour, setHour] = useState(Math.floor(initial / 60) % 12 || 12);
  const [minute, setMinute] = useState(Math.round((initial % 60) / 5) * 5 % 60);
  const [phase, setPhase] = useState<"hour" | "minute">("hour");
  const selectedTime = () => minutesToTime((period === "오후" ? 12 * 60 : 0) + (hour % 12) * 60 + minute);
  const setSelectedPeriod = (nextPeriod: "오전" | "오후") => {
    setPeriod(nextPeriod);
    onChange(minutesToTime((nextPeriod === "오후" ? 12 * 60 : 0) + (hour % 12) * 60 + minute));
  };
  const updateFromPointer = (event: PointerEvent<HTMLDivElement>) => {
    const dial = dialRef.current;
    if (!dial) return;
    const rect = dial.getBoundingClientRect();
    const x = event.clientX - rect.left - rect.width / 2;
    const y = event.clientY - rect.top - rect.height / 2;
    const angle = ((Math.atan2(y, x) * 180) / Math.PI + 90 + 360) % 360;
    const slot = Math.round(angle / 30) % 12;
    if (phase === "hour") {
      const nextHour = slot === 0 ? 12 : slot;
      setHour(nextHour);
      setMinute(0);
      onChange(minutesToTime((period === "오후" ? 12 * 60 : 0) + (nextHour % 12) * 60));
    } else {
      const nextMinute = slot * 5;
      setMinute(nextMinute);
      onChange(minutesToTime((period === "오후" ? 12 * 60 : 0) + (hour % 12) * 60 + nextMinute));
    }
  };
  const numbers = phase === "hour" ? Array.from({ length: 12 }, (_, index) => index === 0 ? "12" : String(index)) : Array.from({ length: 12 }, (_, index) => String(index * 5).padStart(2, "0"));
  const handAngle = phase === "hour" ? (hour % 12) * 30 : minute * 6;
  return <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"><section role="dialog" aria-modal="true" aria-label="시계로 시작 시간 선택" className="w-full max-w-sm rounded-t-2xl bg-white p-4 shadow-2xl sm:rounded-2xl"><div className="flex items-center justify-between"><div><p className="text-xs font-bold text-sky-600">{phase === "hour" ? "시침으로 시간 선택" : "분침으로 분 선택"}</p><h3 className="text-2xl font-black text-slate-950">{selectedTime()}</h3></div><button type="button" onClick={onClose} aria-label="시계 닫기" className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button></div><div className="mt-3 flex rounded-lg bg-slate-100 p-1"><button type="button" onClick={() => setSelectedPeriod("오전")} className={`h-10 flex-1 rounded-md text-sm font-black ${period === "오전" ? "bg-white text-sky-700 shadow-sm" : "text-slate-500"}`}>오전</button><button type="button" onClick={() => setSelectedPeriod("오후")} className={`h-10 flex-1 rounded-md text-sm font-black ${period === "오후" ? "bg-white text-sky-700 shadow-sm" : "text-slate-500"}`}>오후</button></div><div ref={dialRef} onPointerDown={event => { dialRef.current?.setPointerCapture(event.pointerId); updateFromPointer(event); }} onPointerMove={event => { if (event.currentTarget.hasPointerCapture(event.pointerId)) updateFromPointer(event); }} className="relative mx-auto mt-4 aspect-square w-full max-w-[280px] touch-none select-none rounded-full bg-sky-50 ring-8 ring-sky-100"><span className="absolute inset-0" style={{ transform: `rotate(${handAngle}deg)` }}><span className="absolute bottom-1/2 left-1/2 h-[42%] w-1 -translate-x-1/2 rounded-full bg-sky-600" /></span><span className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-700 ring-4 ring-white" />{numbers.map((number, index) => { const angle = index * 30; return <span key={number} className="absolute left-1/2 top-1/2 text-sm font-black text-slate-700" style={{ transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-112px) rotate(-${angle}deg)` }}>{number}</span>; })}</div><p className="mt-3 text-center text-xs font-bold text-slate-500">{phase === "hour" ? "시계에서 시간을 먼저 선택하세요" : "원하는 분 위치를 누르세요"}</p>{phase === "hour" ? <button type="button" onClick={() => setPhase("minute")} className="mt-3 h-12 w-full rounded-lg bg-sky-700 text-sm font-black text-white">분 선택하기</button> : <div className="mt-3 flex gap-2"><button type="button" onClick={() => setPhase("hour")} className="h-12 flex-1 rounded-lg bg-slate-100 text-sm font-black text-slate-700">시간 다시 선택</button><button type="button" onClick={onClose} className="h-12 flex-1 rounded-lg bg-sky-700 text-sm font-black text-white">선택 완료</button></div>}</section></div>;
}

function SmartScheduleComposer({ tasks, initialCategory, baseDate, schedule, onCancel, onDelete, onCarryOver, onSubmit, busy }: { tasks: Array<{ id: number; title: string }>; initialCategory: ScheduleCategory; baseDate: Date; schedule: ScheduleLike | null; onCancel: () => void; onDelete?: () => void; onCarryOver?: () => void; onSubmit: (values: { title: string; taskId: number | null; scheduleType: "task" | "meeting" | "personal" | "review"; scheduleFlags: Array<"urgent" | "focus" | "external" | "recurring" | "from_idea">; tags: string[]; plannedStartAt: Date; plannedEndAt: Date; notes: string }) => void; busy: boolean }) {
  const parsed = parseScheduleNotes(schedule?.notes);
  const [category, setCategory] = useState<ScheduleCategory>(schedule ? parsed.category : initialCategory);
  const [title, setTitle] = useState(schedule?.title ?? "");
  const [startTime, setStartTime] = useState(schedule?.plannedStartAt ? formatTime(schedule.plannedStartAt) : "09:00");
  const [showClock, setShowClock] = useState(false);
  const [duration, setDuration] = useState(schedule ? Math.min(300, Math.max(30, parsed.duration)) : 60);
  const [taskId, setTaskId] = useState(schedule?.taskId ? String(schedule.taskId) : "");
  const [tags, setTags] = useState<string[]>(schedule?.tags ?? []);
  const [tagDraft, setTagDraft] = useState("");
  const [recentTags, setRecentTags] = useState(readScheduleTags);
  const recommendation = suggestedCategory(title);
  const endTime = useMemo(() => { const [hours, minutes] = startTime.split(":").map(Number); const total = hours * 60 + minutes + duration; return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`; }, [duration, startTime]);
  const addTag = (value: string) => {
    const tag = value.trim().replace(/\s+/g, " ");
    if (!tag || tags.includes(tag) || tags.length >= 5) return;
    const next = [tag, ...recentTags.filter(item => item !== tag)].slice(0, 12);
    setTags(current => [...current, tag]);
    setRecentTags(next);
    window.localStorage.setItem(SCHEDULE_TAGS_KEY, JSON.stringify(next));
    setTagDraft("");
  };
  const submit = () => {
    if (!title.trim()) return;
    const [hours, minutes] = startTime.split(":").map(Number);
    const start = schedule?.plannedStartAt ? new Date(schedule.plannedStartAt) : new Date(baseDate);
    start.setHours(hours, minutes, 0, 0);
    const end = new Date(start.getTime() + duration * 60 * 1000);
    const scheduleType = category === "daily" ? "personal" : category === "meeting" ? "meeting" : "task";
    onSubmit({ title: title.trim(), taskId: category === "project" && taskId ? Number(taskId) : null, scheduleType, scheduleFlags: category === "urgent" ? ["urgent"] : [], tags, plannedStartAt: start, plannedEndAt: end, notes: JSON.stringify({ category, duration, breakTime: 0 }) });
  };

  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"><section role="dialog" aria-modal="true" className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-4 shadow-2xl sm:rounded-2xl"><div className="flex items-center justify-between"><h2 className="text-lg font-black text-slate-950">{schedule ? "일정 수정" : "새 일정"}</h2><button type="button" onClick={onCancel} aria-label="일정 창 닫기" className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button></div><div className="mt-3 grid grid-cols-4 gap-1.5"><button type="button" onClick={() => setCategory("project")} className={`h-11 rounded-lg text-sm font-bold ${category === "project" ? "bg-sky-600 text-white" : "bg-slate-100 text-slate-700"}`}>작업</button><button type="button" onClick={() => setCategory("meeting")} className={`h-11 rounded-lg text-sm font-bold ${category === "meeting" ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-700"}`}>회의</button><button type="button" onClick={() => setCategory("daily")} className={`h-11 rounded-lg text-sm font-bold ${category === "daily" ? "bg-stone-600 text-white" : "bg-slate-100 text-slate-700"}`}>일상</button><button type="button" onClick={() => setCategory("urgent")} className={`h-11 rounded-lg text-sm font-bold ${category === "urgent" ? "bg-orange-600 text-white" : "bg-slate-100 text-slate-700"}`}>긴급</button></div><input autoFocus value={title} onChange={event => setTitle(event.target.value)} className="mono-input mt-3 h-12 text-sm font-bold" placeholder="무엇을 할까요?" />{recommendation && recommendation !== category && <p className="mt-1 text-xs font-bold text-sky-700">추천 분류: {recommendation === "daily" ? "일상" : recommendation === "urgent" ? "긴급" : "작업"}</p>}{category === "project" && <select value={taskId} onChange={event => { setTaskId(event.target.value); const task = tasks.find(item => String(item.id) === event.target.value); if (task && !title) setTitle(task.title); }} className="mono-input mt-2 h-12 text-sm"><option value="">연결할 작업 선택 (선택)</option>{tasks.map(task => <option key={task.id} value={task.id}>{task.title}</option>)}</select>}<div className="mt-3 rounded-xl border border-sky-100 bg-sky-50/50 p-3"><div className="grid grid-cols-2 gap-2"><label className="text-xs font-bold text-slate-600">시작 시간<button type="button" onClick={() => setShowClock(true)} aria-label="시계 바늘로 시작 시간 선택" className="mono-input mt-1 flex h-12 w-full items-center justify-center gap-2 text-base font-black"><Clock3 className="h-5 w-5 text-sky-700" />{startTime}</button></label><label className="text-xs font-bold text-slate-600">예상 소요<select value={duration} onChange={event => setDuration(Number(event.target.value))} className="mono-input mt-1 h-12 text-base font-black">{SCHEDULE_DURATION_OPTIONS.map(minutes => <option key={minutes} value={minutes}>{formatMinutesToHuman(minutes)}</option>)}</select></label></div><p className="mt-2 text-center text-sm font-black text-sky-900">{startTime} → {endTime} · {formatMinutesToHuman(duration)}</p></div><section className="mt-3 rounded-xl border border-violet-100 bg-violet-50/50 p-3"><div className="flex items-center justify-between"><label className="text-xs font-bold text-slate-600">태그 <span className="font-normal text-slate-400">(최대 5개)</span></label>{tags.length ? <button type="button" onClick={() => setTags([])} className="text-xs font-bold text-slate-500 underline">전체 지우기</button> : null}</div>{tags.length ? <div className="mt-2 flex flex-wrap gap-1.5">{tags.map(tag => <button type="button" key={tag} onClick={() => setTags(current => current.filter(item => item !== tag))} className="min-h-9 rounded-full bg-violet-700 px-3 text-xs font-bold text-white">#{tag} ×</button>)}</div> : null}<div className="mt-2 flex gap-2"><input value={tagDraft} onChange={event => setTagDraft(event.target.value)} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); addTag(tagDraft); } }} className="mono-input h-11 min-w-0 flex-1 text-sm" placeholder="태그 입력" /><button type="button" onClick={() => addTag(tagDraft)} disabled={!tagDraft.trim()} className="h-11 rounded-lg bg-white px-3 text-xs font-black text-violet-700 ring-1 ring-violet-200 disabled:opacity-40">추가</button></div>{recentTags.filter(tag => !tags.includes(tag)).length ? <div className="mt-3"><p className="text-[11px] font-bold text-violet-500">자주 쓰는 태그 · 눌러서 추가</p><div className="mt-1.5 flex flex-wrap gap-1.5">{recentTags.filter(tag => !tags.includes(tag)).map(tag => <button type="button" key={tag} onClick={() => addTag(tag)} className="min-h-9 rounded-full bg-white px-3 text-xs font-bold text-violet-700 ring-1 ring-violet-200">#{tag}</button>)}</div></div> : null}</section><div className="mt-4 flex gap-2">{onDelete && <button type="button" onClick={onDelete} disabled={busy} className="h-12 rounded-lg bg-rose-50 px-4 text-sm font-black text-rose-700 ring-1 ring-rose-200"><Trash2 className="mr-1 inline h-4 w-4" />삭제</button>}{onCarryOver && <button type="button" onClick={onCarryOver} disabled={busy} className="h-12 flex-1 rounded-lg bg-amber-50 text-sm font-black text-amber-800 ring-1 ring-amber-200">내일로 미루기</button>}<button type="button" onClick={submit} disabled={busy || !title.trim()} className="h-12 flex-1 rounded-lg bg-emerald-700 text-sm font-black text-white hover:bg-emerald-800 disabled:opacity-40">{busy ? "저장 중…" : schedule ? "수정 저장" : "일정 저장"}</button></div></section>{showClock && <ClockTimePicker value={startTime} onChange={setStartTime} onClose={() => setShowClock(false)} />}</div>;
}
