import React from "react";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ALL_COMPLETED_TASKS, filterCompletedTaskItems, getCompletedTaskFilterOptions } from "@/lib/completedTaskFilters";
import type { ReviewMemoTaskQuote } from "@/lib/reviewMemoQuote";
import { getAttachmentPreviewKind, getAttachmentPreviewLabel } from "@/lib/attachmentPreview";

type SuggestedTask = {
  id: number;
  title: string;
  nextAction: string | null;
};

export function SuggestedTaskSummary({ task, projectTitle, onStart }: { task: SuggestedTask; projectTitle: string; onStart: () => void }) {
  return <div className="py-2">
    <p className="industrial-label text-violet-200">Suggested next action</p>
    <h2 className="industrial-title mt-2 text-3xl">{task.title}</h2>
    <p className="mt-2 text-sm text-violet-100">{projectTitle}</p>
    <div className="mt-3 border-t border-violet-300 pt-3"><p className="industrial-label text-violet-200">Next action</p><p className="mt-1 text-sm font-semibold">{task.nextAction || "다음 행동을 기록해 주세요."}</p></div>
    <button onClick={onStart} aria-label={`${task.title} 작업 시작`} className="pressable mt-4 rounded-lg bg-white px-4 py-2.5 text-sm font-bold text-violet-700">이 작업 시작</button>
  </div>;
}

export function RecentCaptureSummary({ content }: { content: string }) {
  return <div className="mt-4 rounded-lg border border-white/25 bg-white/10 p-3" aria-label="최근 기록">
    <p className="industrial-label text-violet-200">Recent capture</p>
    <p className="mt-1 line-clamp-2 text-sm leading-5 text-white">{content}</p>
  </div>;
}

type PinnedRecord = {
  id: number;
  content: string;
  sourceType: string;
  createdAt: Date;
  projectTitle: string | null;
  stageTitle: string | null;
  taskTitle: string | null;
};

function pinnedRecordContext(record: PinnedRecord) {
  return [record.projectTitle, record.stageTitle, record.taskTitle].filter(Boolean).join(" · ") || "독립 기록";
}

export function PinnedRecordSummary({ items, loading = false, onViewRecords }: { items: PinnedRecord[]; loading?: boolean; onViewRecords: () => void }) {
  if (loading) return <section aria-label="고정 Record 맥락" className="animate-pulse rounded-2xl border border-emerald-100 bg-emerald-50/55 p-4 sm:p-5"><div className="h-4 w-24 rounded bg-emerald-100" /><div className="mt-3 h-12 rounded bg-white/80" /></section>;
  if (!items.length) return null;
  return <section aria-label="고정 Record 맥락" className="rounded-2xl border border-emerald-100 bg-emerald-50/55 p-4 sm:p-5"><div className="flex items-start justify-between gap-3"><div><p className="industrial-label text-emerald-800 font-bold">Pinned records</p><h2 className="industrial-title mt-1 text-2xl text-slate-900">고정한 기록</h2></div><p className="max-w-40 text-right text-xs leading-5 text-emerald-800 font-medium">사용자가 고정한 원문을 최근 순으로 표시합니다.</p></div><ul className="mt-4 space-y-2.5">{items.map(item => <li key={item.id} className="rounded-xl border border-emerald-100 bg-white p-3.5 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1"><p className="text-xs font-bold text-emerald-800">{pinnedRecordContext(item)}</p><time dateTime={item.createdAt.toISOString()} className="text-xs font-semibold text-slate-500">{new Intl.DateTimeFormat("ko-KR", { month: "numeric", day: "numeric" }).format(item.createdAt)} · {item.sourceType}</time></div><p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm font-medium leading-relaxed text-slate-800">{item.content}</p></li>)}</ul><button type="button" onClick={onViewRecords} className="pressable mt-3.5 text-sm font-bold text-emerald-800 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">Records에서 전체 보기 →</button></section>;
}

export function ProjectProgressSummary({ projectTitle, completed, total, percent, todayTaskCount }: { projectTitle: string; completed: number; total: number; percent: number; todayTaskCount: number }) {
  return <div className="mt-4 rounded-xl bg-slate-50 border border-slate-100 p-3.5">
    <div className="flex items-center justify-between text-xs font-bold text-slate-800"><span>Task 진행률</span><span className="font-mono text-emerald-700 font-extrabold">{completed}/{total} · {percent}%</span></div>
    <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-label={`${projectTitle} Task 진행률`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}><div className="h-full rounded-full bg-emerald-600 transition-all duration-300" style={{ width: `${percent}%` }} /></div>
    <p className="mt-2 text-xs font-semibold text-slate-600">오늘 연결된 Task {todayTaskCount}개</p>
  </div>;
}

function changeLabel(value: number) {
  return value === 0 ? "전주와 같음" : `전주 대비 ${value > 0 ? "+" : ""}${value}`;
}

export function WeeklySummary({ completedTaskCount, recordCount, completedScheduleCount, change = { completedTaskCount: 0, recordCount: 0, completedScheduleCount: 0 }, loading = false }: { completedTaskCount: number; recordCount: number; completedScheduleCount: number; change?: { completedTaskCount: number; recordCount: number; completedScheduleCount: number }; loading?: boolean }) {
  return <section aria-label="이번 주 요약" className="block-shadow border border-violet-100 bg-white/85 p-4 sm:p-5">
    <div className="flex items-center justify-between"><div><p className="industrial-label text-violet-400">Weekly / review</p><h2 className="industrial-title mt-1 text-xl text-violet-950">이번 주의 흐름</h2></div><p className="text-xs text-violet-500">{loading ? "집계 중" : "완료 기준"}</p></div>
    <dl className="mt-4 grid grid-cols-3 divide-x divide-violet-100 rounded-lg bg-violet-50/75 p-3 text-center">
      <div><dt className="industrial-label text-violet-400">완료 Task</dt><dd className="mt-1 text-xl font-bold text-violet-950">{completedTaskCount}</dd><p className="mt-1 text-[10px] text-violet-500">{changeLabel(change.completedTaskCount)}</p></div>
      <div><dt className="industrial-label text-violet-400">기록</dt><dd className="mt-1 text-xl font-bold text-violet-950">{recordCount}</dd><p className="mt-1 text-[10px] text-violet-500">{changeLabel(change.recordCount)}</p></div>
      <div><dt className="industrial-label text-violet-400">완료 일정</dt><dd className="mt-1 text-xl font-bold text-violet-950">{completedScheduleCount}</dd><p className="mt-1 text-[10px] text-violet-500">{changeLabel(change.completedScheduleCount)}</p></div>
    </dl>
  </section>;
}

function formatMinutes(minutes: number) {
  if (minutes < 60) return `${minutes}분`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours}시간 ${remainder}분` : `${hours}시간`;
}

function monthlyChangeLabel(value: number, unit = "") {
  if (value === 0) return "전월과 같음";
  return `전월 대비 ${value > 0 ? "+" : ""}${value}${unit}`;
}

export function MonthlyChangeSummary({ comparison }: { comparison: { previous: { completedTaskCount: number; recordCount: number; totalMinutes: number }; change: { completedTaskCount: number; recordCount: number; totalMinutes: number } } }) {
  const metrics = [
    { label: "완료 Task", previous: `${comparison.previous.completedTaskCount}개`, change: comparison.change.completedTaskCount, changeText: monthlyChangeLabel(comparison.change.completedTaskCount, "개") },
    { label: "기록", previous: `${comparison.previous.recordCount}개`, change: comparison.change.recordCount, changeText: monthlyChangeLabel(comparison.change.recordCount, "개") },
    { label: "수행 시간", previous: formatMinutes(comparison.previous.totalMinutes), change: comparison.change.totalMinutes, changeText: monthlyChangeLabel(comparison.change.totalMinutes, "분") },
  ];
  return <section aria-label="전월 대비 월간 변화" className="rounded-2xl border border-emerald-100 bg-emerald-50/55 p-4 sm:p-5"><div className="flex items-start justify-between gap-3"><div><p className="industrial-label text-emerald-600">Month over month</p><h2 className="industrial-title mt-1 text-2xl text-violet-950">전월 대비<br />실행 변화</h2></div><p className="max-w-36 text-right text-xs leading-5 text-emerald-700">변화는 관찰값이며 평가가 아닙니다.</p></div><dl className="mt-4 grid grid-cols-3 divide-x divide-emerald-100 rounded-lg bg-white/75 p-3 text-center">{metrics.map(metric => <div key={metric.label} aria-label={`${metric.label} ${metric.changeText}`}><dt className="industrial-label text-emerald-600">{metric.label}</dt><dd className={`mt-1 text-sm font-bold ${metric.change > 0 ? "text-emerald-700" : metric.change < 0 ? "text-amber-700" : "text-violet-950"}`}>{metric.changeText}</dd><p className="mt-1 text-[10px] text-violet-500">전월 {metric.previous}</p></div>)}</dl></section>;
}

export function MonthlyReviewSummary({ completedTaskCount, recordCount, completedScheduleCount, durationSummary = { trackedTaskCount: 0, totalMinutes: 0, averageMinutes: 0 }, activeProjects }: { completedTaskCount: number; recordCount: number; completedScheduleCount: number; durationSummary?: { trackedTaskCount: number; totalMinutes: number; averageMinutes: number }; activeProjects: Array<{ id: number; title: string; completedTaskCount: number; totalTaskCount: number; nextAction: string | null }> }) {
  return <section aria-label="월간 Review 요약" className="block-shadow border border-violet-100 bg-white/85 p-4 sm:p-5">
    <div><p className="industrial-label text-violet-400">Monthly / review</p><h2 className="industrial-title mt-1 text-2xl text-violet-950">이달의 실행 흐름</h2></div>
    <dl className="mt-4 grid grid-cols-3 divide-x divide-violet-100 rounded-lg bg-violet-50/75 p-3 text-center"><div><dt className="industrial-label text-violet-400">완료 Task</dt><dd className="mt-1 text-xl font-bold text-violet-950">{completedTaskCount}</dd></div><div><dt className="industrial-label text-violet-400">기록</dt><dd className="mt-1 text-xl font-bold text-violet-950">{recordCount}</dd></div><div><dt className="industrial-label text-violet-400">완료 일정</dt><dd className="mt-1 text-xl font-bold text-violet-950">{completedScheduleCount}</dd></div></dl>
    <div aria-label="완료 Task 수행 시간" className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-emerald-100 bg-emerald-50/60 p-3"><div><p className="industrial-label text-emerald-600">Time tracked</p><p className="mt-1 text-sm font-bold text-violet-950">실제 수행 시간 {formatMinutes(durationSummary.totalMinutes)}</p></div><p className="text-right text-xs leading-5 text-emerald-700">추적 완료 Task {durationSummary.trackedTaskCount}개<br />평균 {formatMinutes(durationSummary.averageMinutes)}</p></div>
    <div className="mt-4 border-t border-violet-100 pt-4"><p className="industrial-label text-violet-400">Current active projects</p><p className="mt-1 text-xs text-violet-500">선택 월의 집계와 별개로 현재 활성 Workspace를 표시합니다.</p>{activeProjects.length ? <ul className="mt-2 grid gap-2 sm:grid-cols-2">{activeProjects.map(project => <li key={project.id} aria-label={`${project.title} 진행 맥락`} className="rounded-lg border border-emerald-100 bg-emerald-50/60 p-3"><div className="flex items-center justify-between gap-2"><p className="truncate text-sm font-bold text-violet-950">{project.title}</p><span className="text-xs text-emerald-700">{project.completedTaskCount}/{project.totalTaskCount}</span></div><p className="mt-1 truncate text-xs text-emerald-700">{project.nextAction ? `다음: ${project.nextAction}` : "다음 행동을 남겨 주세요."}</p></li>)}</ul> : <p className="mt-2 rounded-lg border border-dashed border-violet-200 p-3 text-sm text-violet-500">활성 Project가 없습니다.</p>}</div>
  </section>;
}

export function ReviewMemo({ value, onChange, completedTasks = [], onQuoteTask, onSave, onClear, saving, clearing, saved, errorMessage }: { value: string; onChange: (value: string) => void; completedTasks?: ReviewMemoTaskQuote[]; onQuoteTask?: (task: ReviewMemoTaskQuote) => void; onSave: () => void; onClear?: () => void; saving: boolean; clearing?: boolean; saved: boolean; errorMessage?: string | null }) {
  const [quoteTaskId, setQuoteTaskId] = useState("");
  const quoteTask = completedTasks.find(task => String(task.id) === quoteTaskId);
  const addQuote = () => { if (!quoteTask || !onQuoteTask) return; onQuoteTask(quoteTask); setQuoteTaskId(""); };
  return (
    <section aria-label="월간 회고 메모" className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
        <h2 className="text-sm font-black text-slate-900">이번 달 회고 메모</h2>
        <span className="text-[11px] font-semibold text-slate-500">생각·배운 점 보존</span>
      </div>
      <textarea
        value={value}
        onChange={event => onChange(event.target.value)}
        aria-label="월간 회고 메모 내용"
        placeholder="이번 달에 배운 점이나 다음 달에 이어갈 생각을 적어 주세요."
        className="mono-input mt-2 min-h-24 resize-y text-xs leading-relaxed font-semibold"
      />
      {completedTasks.length && onQuoteTask ? (
        <div className="mt-2 flex gap-1.5 items-center">
          <select value={quoteTaskId} onChange={event => setQuoteTaskId(event.target.value)} aria-label="회고 메모에 인용할 완료 Task" className="mono-input h-9 text-xs font-bold flex-1">
            <option value="">완료 Task 인용 선택</option>
            {completedTasks.map(task => <option key={task.id} value={String(task.id)}>{task.title}</option>)}
          </select>
          <button type="button" onClick={addQuote} disabled={!quoteTask} className="pressable shrink-0 rounded-lg bg-slate-100 border border-slate-200 px-3 h-9 text-xs font-bold text-slate-800 hover:bg-slate-200 disabled:opacity-40">
            인용 추가
          </button>
        </div>
      ) : null}
      {errorMessage && <p role="alert" className="mt-1 text-xs font-bold text-rose-600">{errorMessage}</p>}
      <div className="mt-2.5 flex items-center justify-between pt-1.5 border-t border-slate-100">
        <span className="text-xs font-bold text-emerald-800">{saved ? "✓ 저장됨" : "작성 중..."}</span>
        <div className="flex items-center gap-1.5">
          {saved && onClear && <button type="button" onClick={onClear} disabled={clearing} className="px-2.5 py-1 text-xs font-bold text-slate-500 hover:text-rose-700">비우기</button>}
          <button type="button" onClick={onSave} disabled={!value.trim() || saving} className="pressable rounded-lg bg-emerald-700 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-40">
            {saving ? "저장 중..." : "메모 저장"}
          </button>
        </div>
      </div>
    </section>
  );
}

export function ReviewMonthNavigator({ monthLabel, onPrevious, onNext, nextDisabled }: { monthLabel: string; onPrevious: () => void; onNext: () => void; nextDisabled: boolean }) {
  return (
    <nav aria-label="Review 기간 이동" className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-2xs">
      <button type="button" onClick={onPrevious} aria-label="이전 달 Review 보기" className="pressable grid h-8 w-8 place-items-center rounded text-slate-700 hover:bg-slate-100">
        <ChevronLeft className="h-4 w-4" />
      </button>
      <span aria-live="polite" className="min-w-24 text-center text-xs font-black text-slate-900">{monthLabel}</span>
      <button type="button" onClick={onNext} aria-label="다음 달 Review 보기" disabled={nextDisabled} className="pressable grid h-8 w-8 place-items-center rounded text-slate-700 hover:bg-slate-100 disabled:opacity-30">
        <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  );
}

export function NextMonthTaskDraft({ projects, stages, projectId, stageId, title, nextAction, onProjectChange, onStageChange, onTitleChange, onNextActionChange, onApply, applying }: { projects: Array<{ id: number; title: string }>; stages: Array<{ id: number; title: string }>; projectId: string; stageId: string; title: string; nextAction: string; onProjectChange: (value: string) => void; onStageChange: (value: string) => void; onTitleChange: (value: string) => void; onNextActionChange: (value: string) => void; onApply: () => void; applying: boolean }) {
  return (
    <section aria-label="다음 달 첫 Task 초안" className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
        <h2 className="text-sm font-black text-slate-900">다음 달 첫 Task 초안</h2>
        <span className="text-[11px] font-semibold text-slate-500">프로젝트 바로 연결</span>
      </div>
      {projects.length ? (
        <div className="mt-2 grid gap-2">
          <div className="grid grid-cols-2 gap-2">
            <select value={projectId} onChange={event => onProjectChange(event.target.value)} aria-label="Task 초안 Project" className="mono-input h-9 text-xs font-bold">
              <option value="">Project 선택</option>
              {projects.map(project => <option key={project.id} value={String(project.id)}>{project.title}</option>)}
            </select>
            <select value={stageId} onChange={event => onStageChange(event.target.value)} aria-label="Task 초안 Stage" className="mono-input h-9 text-xs font-bold">
              <option value="">Stage (선택)</option>
              {stages.map(stage => <option key={stage.id} value={String(stage.id)}>{stage.title}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <input value={title} onChange={event => onTitleChange(event.target.value)} placeholder="다음 달 첫 Task 제목 입력" className="mono-input h-9 text-xs font-bold flex-1" />
            <button type="button" onClick={onApply} disabled={!projectId || !title.trim() || applying} className="pressable shrink-0 rounded-lg bg-emerald-700 px-3.5 h-9 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-40">
              {applying ? "생성 중..." : "Task 생성"}
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-2 text-xs text-slate-400">먼저 Project를 생성해 주세요.</p>
      )}
    </section>
  );
}

export function ProjectTimeDistribution({ items, unassignedDurationSummary }: { items: Array<{ projectId: number; title: string; totalMinutes: number; trackedTaskCount: number; sharePercent: number }>; unassignedDurationSummary: { trackedTaskCount: number; totalMinutes: number } }) {
  return (
    <section aria-label="Project별 월간 수행 시간 분포" className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
      <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
        <h2 className="text-sm font-black text-slate-900">Project별 시간 분포</h2>
        <span className="text-[11px] font-semibold text-slate-500">수행 시간 비중</span>
      </div>
      {items.length ? (
        <ul className="mt-2 space-y-2">
          {items.map(item => (
            <li key={item.projectId}>
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="truncate text-slate-900">{item.title}</span>
                <span className="font-mono text-emerald-800">{formatMinutes(item.totalMinutes)} ({item.sharePercent}%)</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-emerald-600" style={{ width: `${item.sharePercent}%` }} />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-xs text-slate-400">수행 시간 기록이 없습니다.</p>
      )}
    </section>
  );
}

export function ProjectTimeComparison({ items }: { items: Array<{ projectId: number; title: string; totalMinutes: number; trackedTaskCount: number; previousTotalMinutes: number; previousTrackedTaskCount: number; changeMinutes: number }> }) {
  return (
    <section aria-label="Project별 전월 수행 시간 변화" className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
      <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
        <h2 className="text-sm font-black text-slate-900">Project별 시간 변화</h2>
        <span className="text-[11px] font-semibold text-slate-500">전월 대비</span>
      </div>
      {items.length ? (
        <ul className="mt-2 space-y-1.5">
          {items.map(item => (
            <li key={item.projectId} className="flex items-center justify-between rounded-lg bg-slate-50 p-2 text-xs font-bold">
              <span className="truncate text-slate-900">{item.title}</span>
              <span className={`shrink-0 font-mono ${item.changeMinutes > 0 ? "text-emerald-700" : item.changeMinutes < 0 ? "text-amber-700" : "text-slate-600"}`}>
                {item.changeMinutes > 0 ? `+${formatMinutes(item.changeMinutes)}` : item.changeMinutes < 0 ? `-${formatMinutes(Math.abs(item.changeMinutes))}` : "전월 동일"}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-xs text-slate-400">전월 대비 시간 변화가 없습니다.</p>
      )}
    </section>
  );
}

export function CompletedTaskDrilldown({ items }: { items: Array<{ id: number; title: string; projectTitle: string | null; stageTitle: string | null; nextAction: string | null; completedAt: Date | null; durationMinutes: number | null; records?: Array<{ id: number; content: string; attachments: Array<{ id: number; fileName: string; url: string; mimeType: string }> }> }> }) {
  const [projectFilter, setProjectFilter] = useState(ALL_COMPLETED_TASKS);
  const [stageFilter, setStageFilter] = useState(ALL_COMPLETED_TASKS);
  const options = useMemo(() => getCompletedTaskFilterOptions(items), [items]);
  const stageOptions = options.stageOptions.filter(option => projectFilter === ALL_COMPLETED_TASKS || option.projectValue === projectFilter);
  const visibleItems = filterCompletedTaskItems(items, projectFilter, stageFilter);
  return (
    <section aria-label="선택 월 완료 Task 목록" className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
        <h2 className="text-sm font-black text-slate-900">완료 Task 상세 ({visibleItems.length}/{items.length})</h2>
        {items.length ? (
          <div className="flex gap-2">
            <select value={projectFilter} onChange={event => { setProjectFilter(event.target.value); setStageFilter(ALL_COMPLETED_TASKS); }} className="mono-input h-9 text-xs font-bold">
              {options.projectOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <select value={stageFilter} onChange={event => setStageFilter(event.target.value)} className="mono-input h-9 text-xs font-bold">
              <option value={ALL_COMPLETED_TASKS}>전체 Stage</option>
              {stageOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>
        ) : null}
      </div>
      {visibleItems.length ? (
        <ul className="mt-2 space-y-1.5">
          {visibleItems.map(item => (
            <li key={item.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-2.5 py-2 text-xs font-bold border border-slate-100">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="text-emerald-700 font-black">✓</span>
                <span className="truncate text-slate-900">{item.title}</span>
                <span className="text-[11px] text-slate-500 hidden sm:inline">({item.projectTitle ?? "독립"}{item.stageTitle ? ` › ${item.stageTitle}` : ""})</span>
              </div>
              <span className="font-mono text-slate-600 shrink-0">{item.durationMinutes ? formatMinutes(item.durationMinutes) : "완료"}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-xs text-slate-400">완료된 Task가 없습니다.</p>
      )}
    </section>
  );
}

export function StageProgressHint({ stageTitle, message, canComplete, onComplete }: { stageTitle: string; message: string; canComplete: boolean; onComplete: () => void }) {
  return <div role="status" className="mt-3 flex items-center justify-between gap-2 rounded-lg border border-emerald-100 bg-white/70 px-3 py-2 text-xs text-emerald-700"><span>{message}</span>{canComplete && <button onClick={onComplete} aria-label={`${stageTitle} Stage 완료 처리`} className="pressable shrink-0 rounded-md bg-emerald-500 px-2 py-1 text-xs font-bold text-white hover:bg-emerald-600">완료 처리</button>}</div>;
}

export function ProjectNextStageSummary({ projectTitle, stageTitle, message, canComplete, onComplete }: { projectTitle: string; stageTitle: string; message: string; canComplete: boolean; onComplete: () => void }) {
  return <div aria-label={`${projectTitle} 다음 Stage`} className="mt-3 rounded-lg border border-emerald-100 bg-emerald-50/70 p-3"><p className="industrial-label text-emerald-500">Next Stage</p><div className="mt-1 flex items-center justify-between gap-3"><div><p className="text-sm font-bold text-violet-950">{stageTitle}</p><p className="mt-0.5 text-xs text-emerald-700">{message}</p></div>{canComplete && <button onClick={onComplete} aria-label={`${stageTitle} Stage 완료 처리`} className="pressable shrink-0 rounded-md bg-emerald-500 px-2 py-1 text-xs font-bold text-white hover:bg-emerald-600">완료 처리</button>}</div></div>;
}
