import { BookmarkPlus, ChevronDown, ChevronUp, FileText, Link2, Paperclip, Pin, PinOff, Search, Tag, Trash2, X, XCircle } from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { getAttachmentPreviewKind, getAttachmentPreviewLabel } from "@/lib/attachmentPreview";

const ALL = "all";
type SourceType = "capture" | "work_log" | "journal" | "link";
type RecordDetailData = { id: number; content: string; sourceType: string; recordKind: string; createdAt: Date; updatedAt: Date; projectTitle: string | null; stageTitle: string | null; taskTitle: string | null; tags: string[]; attachments: Array<{ id: number; fileName: string; url: string; mimeType: string; size: number; capturedAt: Date }> };
const sourceOptions = [{ value: ALL, label: "모든 기록 유형" }, { value: "capture", label: "Capture" }, { value: "work_log", label: "Work log" }, { value: "journal", label: "Journal" }, { value: "link", label: "Link" }] as const;

function formatRecordDate(value: Date) { return new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(value); }
function formatFileSize(size: number) { return size < 1024 * 1024 ? `${Math.max(1, Math.round(size / 1024))} KB` : `${(size / (1024 * 1024)).toFixed(1)} MB`; }

function RecordAttachment({ attachment }: { attachment: RecordDetailData["attachments"][number] }) {
  const previewKind = getAttachmentPreviewKind(attachment.mimeType); const previewLabel = previewKind ? getAttachmentPreviewLabel(attachment.fileName, previewKind) : null;
  return <li className="rounded-lg border border-emerald-100 bg-emerald-50/45 p-2.5"><div className="flex flex-wrap items-center justify-between gap-2"><div className="min-w-0"><p className="truncate text-xs font-bold text-violet-800">{attachment.fileName}</p><p className="mt-0.5 text-[11px] text-violet-500">{attachment.mimeType} · {formatFileSize(attachment.size)}</p></div><a href={attachment.url} target="_blank" rel="noreferrer" aria-label={`${attachment.fileName} 원본 열기`} className="pressable shrink-0 rounded-md border border-emerald-100 bg-white px-2 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100">원본 열기</a></div>{previewKind && previewLabel ? <details className="group mt-2"><summary aria-label={previewLabel} className="pressable cursor-pointer list-none rounded-md px-2 py-1 text-[11px] font-bold text-violet-600 hover:bg-violet-100 marker:hidden"><span className="group-open:hidden">미리보기</span><span className="hidden group-open:inline">미리보기 닫기</span></summary><div aria-label={previewLabel} className="mt-2 overflow-hidden rounded-md border border-violet-100 bg-white p-1.5">{previewKind === "image" ? <img src={attachment.url} alt={previewLabel} loading="lazy" className="max-h-80 w-full rounded object-contain" /> : <iframe title={previewLabel} src={attachment.url} sandbox="" className="h-72 w-full rounded border-0" />}</div></details> : <p className="mt-2 text-[11px] text-violet-500">이 파일은 원본 열기만 지원합니다.</p>}</li>;
}

export function RecordDetailPanel({ record, loading, error, onClose, onAddTag, onRemoveTag, tagsPending, recentTags = [] }: { record: RecordDetailData | null | undefined; loading: boolean; error: boolean; onClose: () => void; onAddTag: (tag: string) => void; onRemoveTag: (tag: string) => void; tagsPending: boolean; recentTags?: string[] }) {
  const [tagDraft, setTagDraft] = useState(""); const quickTags = record ? recentTags.filter(tag => !record.tags.includes(tag)) : [];
  return <section aria-label="Record 상세" className="rounded-2xl border border-emerald-200 bg-emerald-50/55 p-3 sm:p-4"><div className="flex items-start justify-between gap-3"><div><p className="industrial-label text-emerald-600">Record detail / original</p><h2 className="industrial-title mt-1 text-2xl text-violet-950">기록 상세</h2></div><button type="button" onClick={onClose} aria-label="Record 상세 닫기" className="pressable rounded-lg p-2 text-violet-500 hover:bg-white"><XCircle className="h-4 w-4" /></button></div>{loading ? <div className="mt-3 h-32 animate-pulse rounded-lg bg-white/80" /> : error ? <p role="alert" className="mt-3 rounded-lg border border-rose-100 bg-rose-50 p-3 text-sm text-rose-700">상세 기록을 불러오지 못했습니다.</p> : !record ? <p className="mt-3 rounded-lg border border-dashed border-emerald-200 p-3 text-sm text-emerald-700">이 Record를 찾을 수 없습니다.</p> : <div className="mt-3 space-y-3"><div className="flex flex-wrap gap-1.5 text-[11px]"><span className="rounded bg-white px-2 py-1 font-bold text-emerald-700">{formatRecordDate(record.createdAt)}</span><span className="rounded bg-white px-2 py-1 text-violet-600">{record.sourceType} · {record.recordKind}</span></div><article aria-label="보존된 Record 원문" className="rounded-xl border border-white bg-white/80 p-3"><p className="whitespace-pre-wrap text-sm leading-6 text-violet-800">{record.content}</p></article><div aria-label="Record 태그" className="rounded-xl border border-emerald-100 bg-white/75 p-3"><div className="flex items-center gap-1.5"><Tag className="h-4 w-4 text-emerald-700" /><h3 className="text-sm font-bold text-violet-900">태그</h3></div><div className="mt-2 flex flex-wrap gap-1.5">{record.tags.length ? record.tags.map(tag => <button type="button" key={tag} onClick={() => onRemoveTag(tag)} disabled={tagsPending} aria-label={`${tag} 태그 제거`} className="pressable rounded-full border border-emerald-100 bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50">#{tag} ×</button>) : <p className="text-xs text-violet-500">태그가 없습니다.</p>}</div>{quickTags.length ? <div aria-label="최근 사용한 Record 태그" className="mt-3 border-t border-emerald-100 pt-3"><p className="industrial-label text-emerald-600">Quick add</p><div className="mt-2 flex flex-wrap gap-1.5">{quickTags.map(tag => <button type="button" key={tag} onClick={() => onAddTag(tag)} disabled={tagsPending} aria-label={`${tag} 빠른 태그 추가`} className="pressable rounded-full border border-emerald-100 bg-white px-2 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50">#{tag} 추가</button>)}</div></div> : null}<form onSubmit={event => { event.preventDefault(); const tag = tagDraft.trim(); if (!tag) return; onAddTag(tag); setTagDraft(""); }} className="mt-3 flex gap-2"><input value={tagDraft} onChange={event => setTagDraft(event.target.value)} maxLength={64} aria-label="Record 태그 입력" placeholder="태그 추가" className="h-8 min-w-0 flex-1 rounded-md border border-emerald-100 bg-white px-2 text-xs text-violet-800 outline-none focus-visible:ring-2 focus-visible:ring-emerald-500" /><button type="submit" disabled={tagsPending || !tagDraft.trim()} className="pressable shrink-0 rounded-md border border-emerald-100 bg-white px-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50">태그 추가</button></form></div><dl className="grid gap-2 sm:grid-cols-3"><div className="rounded-lg border border-emerald-100 bg-white/75 p-2"><dt className="industrial-label text-emerald-600">Project</dt><dd className="mt-1 truncate text-xs font-bold text-violet-800">{record.projectTitle ?? "독립 기록"}</dd></div><div className="rounded-lg border border-emerald-100 bg-white/75 p-2"><dt className="industrial-label text-emerald-600">Stage</dt><dd className="mt-1 truncate text-xs font-bold text-violet-800">{record.stageTitle ?? "연결 없음"}</dd></div><div className="rounded-lg border border-emerald-100 bg-white/75 p-2"><dt className="industrial-label text-emerald-600">Task</dt><dd className="mt-1 truncate text-xs font-bold text-violet-800">{record.taskTitle ?? "연결 없음"}</dd></div></dl><div><div className="flex items-center gap-1.5"><Paperclip className="h-4 w-4 text-emerald-700" /><h3 className="text-sm font-bold text-violet-900">Attachment {record.attachments.length}개</h3></div>{record.attachments.length ? <ul className="mt-2 space-y-2">{record.attachments.map(attachment => <RecordAttachment key={attachment.id} attachment={attachment} />)}</ul> : <p className="mt-2 text-xs text-violet-500">연결된 Attachment가 없습니다.</p>}</div></div>}</section>;
}

export default function Records() {
  const [query, setQuery] = useState(""); const [projectFilter, setProjectFilter] = useState(ALL); const [taskFilter, setTaskFilter] = useState(ALL); const [sourceFilter, setSourceFilter] = useState(ALL); const [period, setPeriod] = useState<"all" | "month">("all"); const [sort, setSort] = useState<"newest" | "oldest" | "pinned">("newest"); const [tagFilter, setTagFilter] = useState(ALL); const [selectedRecordId, setSelectedRecordId] = useState<number | null>(null); const [savedSearchName, setSavedSearchName] = useState("");
  const [day] = useState(() => new Date()); const monthRange = useMemo(() => ({ start: new Date(day.getFullYear(), day.getMonth(), 1), end: new Date(day.getFullYear(), day.getMonth() + 1, 1) }), [day]);
  const workspace = trpc.workspace.overview.useQuery({ start: monthRange.start, end: monthRange.end }); const detail = trpc.workspace.recordDetail.useQuery({ recordId: selectedRecordId ?? 1 }, { enabled: selectedRecordId !== null }); const tagOptions = trpc.workspace.recordTagOptions.useQuery(); const tagStats = trpc.workspace.recordTagStats.useQuery(); const recentTags = trpc.workspace.recentRecordTags.useQuery(); const savedSearches = trpc.workspace.savedRecordSearches.useQuery(); const utils = trpc.useUtils();
  const applySavedSearch = (savedSearch: NonNullable<typeof savedSearches.data>[number]) => { setQuery(savedSearch.query ?? ""); setProjectFilter(savedSearch.projectId ? String(savedSearch.projectId) : ALL); setTaskFilter(savedSearch.taskId ? String(savedSearch.taskId) : ALL); setSourceFilter(savedSearch.sourceType ?? ALL); setPeriod(savedSearch.period); setSort(savedSearch.sort); setTagFilter(savedSearch.tag ?? ALL); };
  const appliedRouteSearchId = useRef<number | null>(null); const routeSearchId = typeof window === "undefined" ? 0 : Number(new URLSearchParams(window.location.search).get("savedSearch"));
  useEffect(() => { if (!routeSearchId || appliedRouteSearchId.current === routeSearchId || !savedSearches.data) return; const savedSearch = savedSearches.data.find(item => item.id === routeSearchId); if (savedSearch) { applySavedSearch(savedSearch); appliedRouteSearchId.current = routeSearchId; } }, [routeSearchId, savedSearches.data]);
  const search = trpc.workspace.recordSearch.useQuery({ query: query || undefined, projectId: projectFilter === ALL ? null : Number(projectFilter), taskId: taskFilter === ALL ? null : Number(taskFilter), sourceType: sourceFilter === ALL ? null : sourceFilter as SourceType, start: period === "month" ? monthRange.start : null, end: period === "month" ? monthRange.end : null, sort, tag: tagFilter === ALL ? null : tagFilter });
  const setPinned = trpc.workspace.setRecordPinned.useMutation({ onSuccess: () => { utils.workspace.recordSearch.invalidate(); utils.workspace.recordDetail.invalidate(); utils.workspace.pinnedRecordSummaries.invalidate(); } }); const refreshTags = () => { utils.workspace.recordSearch.invalidate(); utils.workspace.recordDetail.invalidate(); utils.workspace.recordTagOptions.invalidate(); utils.workspace.recordTagStats.invalidate(); utils.workspace.recentRecordTags.invalidate(); }; const addTag = trpc.workspace.addRecordTag.useMutation({ onSuccess: refreshTags }); const removeTag = trpc.workspace.removeRecordTag.useMutation({ onSuccess: refreshTags }); const refreshSavedSearches = () => utils.workspace.savedRecordSearches.invalidate(); const saveSearch = trpc.workspace.createSavedRecordSearch.useMutation({ onSuccess: () => { setSavedSearchName(""); refreshSavedSearches(); } }); const deleteSearch = trpc.workspace.deleteSavedRecordSearch.useMutation({ onSuccess: refreshSavedSearches }); const moveSearch = trpc.workspace.moveSavedRecordSearch.useMutation({ onSuccess: refreshSavedSearches });
  const projects = workspace.data?.projects ?? []; const tasks = (workspace.data?.tasks ?? []).filter(task => projectFilter === ALL || String(task.projectId) === projectFilter); const hasFilter = Boolean(query || projectFilter !== ALL || taskFilter !== ALL || sourceFilter !== ALL || period !== "all" || sort !== "newest" || tagFilter !== ALL); const resetFilters = () => { setQuery(""); setProjectFilter(ALL); setTaskFilter(ALL); setSourceFilter(ALL); setPeriod("all"); setSort("newest"); setTagFilter(ALL); }; 
  return (
    <div className="space-y-3 max-w-6xl mx-auto pb-16">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-black text-slate-950">기록 찾기</h1>
          <span className="text-xs font-semibold text-slate-600">· 원문 검색 및 태그 관리</span>
        </div>
        <p className="rounded-md bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-bold text-emerald-800">최근 100개</p>
      </header>

      {/* 1. 컴팩트 검색창 & 필터 */}
      <section aria-label="Record 검색 및 필터" className="rounded-xl border border-slate-200 bg-white p-2.5 sm:p-3 shadow-2xs">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            maxLength={240}
            placeholder="🔍 메모·기록 원문에서 실시간 검색..."
            aria-label="Record 원문 검색"
            className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs font-bold text-slate-900 outline-none focus:border-emerald-600 focus:bg-white"
          />
        </label>
        <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-6">
          <select aria-label="Record Project 필터" value={projectFilter} onChange={event => { setProjectFilter(event.target.value); setTaskFilter(ALL); }} className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold text-slate-800"><option value={ALL}>전체 Project</option>{projects.map(project => <option key={project.id} value={project.id}>{project.title}</option>)}</select>
          <select aria-label="Record Task 필터" value={taskFilter} onChange={event => setTaskFilter(event.target.value)} className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold text-slate-800"><option value={ALL}>전체 Task</option>{tasks.map(task => <option key={task.id} value={task.id}>{task.title}</option>)}</select>
          <select aria-label="Record 유형 필터" value={sourceFilter} onChange={event => setSourceFilter(event.target.value)} className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold text-slate-800">{sourceOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
          <select aria-label="Record 기간 필터" value={period} onChange={event => setPeriod(event.target.value as "all" | "month")} className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold text-slate-800"><option value="all">전체 기간</option><option value="month">이번 달</option></select>
          <select aria-label="Record 태그 필터" value={tagFilter} onChange={event => setTagFilter(event.target.value)} className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold text-slate-800"><option value={ALL}>전체 태그</option>{(tagOptions.data ?? []).map(tag => <option key={tag} value={tag}>#{tag}</option>)}</select>
          <select aria-label="Record 정렬" value={sort} onChange={event => setSort(event.target.value as "newest" | "oldest" | "pinned")} className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold text-slate-800"><option value="newest">최신순</option><option value="oldest">오래된순</option><option value="pinned">고정 우선</option></select>
        </div>
        {hasFilter && (
          <button type="button" onClick={resetFilters} className="pressable mt-2 inline-flex items-center gap-1 text-xs font-extrabold text-rose-700 hover:underline">
            <X className="h-3.5 w-3.5" /> 필터 초기화
          </button>
        )}
      </section>

      {/* 2. 태그 현황 및 저장 검색 (가로 2열 콤팩트 배치) */}
      <div className="grid gap-2 sm:grid-cols-2">
        <section aria-label="Record 태그 사용 현황" className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-2xs">
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5">
            <span className="text-xs font-black text-slate-900">태그 모아보기</span>
            <span className="text-[11px] font-semibold text-slate-500">최근 사용순</span>
          </div>
          {tagStats.isLoading ? <div className="mt-2 h-7 animate-pulse bg-slate-100 rounded" /> : tagStats.data?.length ? (
            <div className="mt-2 flex flex-wrap gap-1">
              {tagStats.data.slice(0, 10).map(stat => (
                <button type="button" key={stat.tag} onClick={() => setTagFilter(stat.tag)} className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-bold text-slate-800 hover:bg-emerald-50 hover:text-emerald-900">
                  #{stat.tag} <span className="text-[10px] text-emerald-700">({stat.usageCount})</span>
                </button>
              ))}
            </div>
          ) : <p className="mt-2 text-xs text-slate-400">태그 없음</p>}
        </section>

        <section aria-label="저장된 Record 검색" className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-2xs">
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5">
            <span className="text-xs font-black text-slate-900">저장된 검색</span>
            <span className="text-[11px] font-semibold text-slate-500">조건 필터 저장</span>
          </div>
          <form onSubmit={event => { event.preventDefault(); const name = savedSearchName.trim(); if (!name || !hasFilter) return; saveSearch.mutate({ name, query: query.trim() || null, projectId: projectFilter === ALL ? null : Number(projectFilter), taskId: taskFilter === ALL ? null : Number(taskFilter), sourceType: sourceFilter === ALL ? null : sourceFilter as SourceType, period, sort, tag: tagFilter === ALL ? null : tagFilter }); }} className="mt-2 flex gap-1">
            <input value={savedSearchName} onChange={event => setSavedSearchName(event.target.value)} maxLength={80} placeholder="현재 조건 저장 이름" className="h-7 min-w-0 flex-1 rounded border border-slate-200 bg-slate-50 px-2 text-xs font-bold" />
            <button type="submit" disabled={!hasFilter || !savedSearchName.trim() || saveSearch.isPending} className="rounded bg-emerald-700 px-2.5 text-xs font-bold text-white disabled:opacity-40">저장</button>
          </form>
        </section>
      </div>

      {/* 3. 검색 결과 목록 (타이트한 카드) */}
      <section aria-label="검색된 Record 목록" className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h2 className="text-sm font-black text-slate-900">검색 결과 목록</h2>
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-black text-emerald-800">{search.data?.length ?? 0}개</span>
        </div>
        {search.isLoading ? <div className="mt-2 h-20 animate-pulse bg-slate-100 rounded" /> : search.data?.length ? (
          <ul className="mt-2 space-y-2">
            {search.data.map(record => (
              <li key={record.id} className="rounded-lg border border-slate-100 bg-slate-50/70 p-2.5 hover:border-slate-300 transition-colors">
                <div className="flex items-center justify-between gap-2 text-xs font-bold text-slate-600">
                  <span className="font-mono text-slate-700">{formatRecordDate(record.createdAt)}</span>
                  <span className="flex items-center gap-1.5">
                    {record.isPinned && <span className="text-amber-700 font-extrabold flex items-center gap-0.5">📌 고정</span>}
                    <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] text-slate-800">{record.sourceType}</span>
                  </span>
                </div>
                <p className="mt-1.5 whitespace-pre-wrap text-sm font-semibold leading-relaxed text-slate-900">{record.content}</p>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200/60">
                  <div className="flex flex-wrap gap-1 text-[11px] font-bold text-slate-600">
                    <span className="bg-white border border-slate-200 px-1.5 py-0.5 rounded">{record.projectTitle ?? "독립 기록"}</span>
                    {record.taskTitle && <span className="bg-white border border-slate-200 px-1.5 py-0.5 rounded text-emerald-800">› {record.taskTitle}</span>}
                    {record.tags.map(tag => <span key={tag} className="bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded text-emerald-900">#{tag}</span>)}
                  </div>
                  <div className="flex gap-1">
                    <button type="button" onClick={() => setPinned.mutate({ recordId: record.id, isPinned: !record.isPinned })} className="px-2 py-0.5 text-xs font-bold rounded bg-white border border-slate-200 hover:bg-slate-100 text-slate-800">
                      {record.isPinned ? "고정 해제" : "📌 고정"}
                    </button>
                    <button type="button" onClick={() => setSelectedRecordId(record.id)} className="px-2 py-0.5 text-xs font-bold rounded bg-emerald-700 text-white hover:bg-emerald-800">
                      상세 보기
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 p-4 text-center text-xs font-bold text-slate-500 border border-dashed border-slate-200 rounded-lg">기록이 없습니다.</p>
        )}
      </section>

      {selectedRecordId !== null && (
        <RecordDetailPanel record={detail.data} loading={detail.isLoading} error={Boolean(detail.error)} onClose={() => setSelectedRecordId(null)} onAddTag={tag => addTag.mutate({ recordId: selectedRecordId, tag })} onRemoveTag={tag => removeTag.mutate({ recordId: selectedRecordId, tag })} tagsPending={addTag.isPending || removeTag.isPending} recentTags={recentTags.data ?? []} />
      )}
    </div>
  );
}
