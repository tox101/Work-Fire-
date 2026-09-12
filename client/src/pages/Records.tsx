import { BookmarkPlus, ChevronDown, ChevronUp, FileText, Link2, Paperclip, Pin, PinOff, Tag, Trash2, XCircle } from "lucide-react";
import React, { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { getAttachmentPreviewKind, getAttachmentPreviewLabel } from "@/lib/attachmentPreview";

const ALL = "all";
type SourceType = "capture" | "work_log" | "journal" | "link";
type RecordDetailData = { id: number; content: string; sourceType: string; recordKind: string; createdAt: Date; updatedAt: Date; projectTitle: string | null; stageTitle: string | null; taskTitle: string | null; tags: string[]; attachments: Array<{ id: number; fileName: string; url: string; mimeType: string; size: number; capturedAt: Date }> };

function formatRecordDate(value: Date) { return new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(value); }
function formatFileSize(size: number) { return size < 1024 * 1024 ? `${Math.max(1, Math.round(size / 1024))} KB` : `${(size / (1024 * 1024)).toFixed(1)} MB`; }

function RecordAttachment({ attachment }: { attachment: RecordDetailData["attachments"][number] }) {
  const previewKind = getAttachmentPreviewKind(attachment.mimeType); const previewLabel = previewKind ? getAttachmentPreviewLabel(attachment.fileName, previewKind) : null;
  return <li className="rounded-lg border border-emerald-100 bg-emerald-50/45 p-2.5"><div className="flex flex-wrap items-center justify-between gap-2"><div className="min-w-0"><p className="truncate text-xs font-bold text-violet-800">{attachment.fileName}</p><p className="mt-0.5 text-[11px] text-violet-500">{attachment.mimeType} · {formatFileSize(attachment.size)}</p></div><a href={attachment.url} target="_blank" rel="noreferrer" aria-label={`${attachment.fileName} 원본 열기`} className="pressable shrink-0 rounded-md border border-emerald-100 bg-white px-2 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100">원본 열기</a></div>{previewKind && previewLabel ? <details className="group mt-2"><summary aria-label={previewLabel} className="pressable cursor-pointer list-none rounded-md px-2 py-1 text-[11px] font-bold text-violet-600 hover:bg-violet-100 marker:hidden"><span className="group-open:hidden">미리보기</span><span className="hidden group-open:inline">미리보기 닫기</span></summary><div aria-label={previewLabel} className="mt-2 overflow-hidden rounded-md border border-violet-100 bg-white p-1.5">{previewKind === "image" ? <img src={attachment.url} alt={previewLabel} loading="lazy" className="max-h-80 w-full rounded object-contain" /> : <iframe title={previewLabel} src={attachment.url} sandbox="" className="h-72 w-full rounded border-0" />}</div></details> : <p className="mt-2 text-[11px] text-violet-500">이 파일은 원본 열기만 지원합니다.</p>}</li>;
}

export function RecordDetailPanel({ record, loading, error, onClose, onAddTag, onRemoveTag, tagsPending, recentTags = [] }: { record: RecordDetailData | null | undefined; loading: boolean; error: boolean; onClose: () => void; onAddTag: (tag: string) => void; onRemoveTag: (tag: string) => void; tagsPending: boolean; recentTags?: string[] }) {
  const [tagDraft, setTagDraft] = useState(""); const quickTags = record ? recentTags.filter(tag => !record.tags.includes(tag)) : [];
  return <section aria-label="Record 상세" className="rounded-2xl border border-emerald-200 bg-emerald-50/55 p-3 sm:p-4"><div className="flex items-start justify-between gap-3"><div><p className="industrial-label text-emerald-600">Record detail / original</p><h2 className="industrial-title mt-1 text-2xl text-violet-950">기록 상세</h2></div><button type="button" onClick={onClose} aria-label="Record 상세 닫기" className="pressable rounded-lg p-2 text-violet-500 hover:bg-white"><XCircle className="h-4 w-4" /></button></div>{loading ? <div className="mt-3 h-32 animate-pulse rounded-lg bg-white/80" /> : error ? <p role="alert" className="mt-3 rounded-lg border border-rose-100 bg-rose-50 p-3 text-sm text-rose-700">상세 기록을 불러오지 못했습니다.</p> : !record ? <p className="mt-3 rounded-lg border border-dashed border-emerald-200 p-3 text-sm text-emerald-700">이 Record를 찾을 수 없습니다.</p> : <div className="mt-3 space-y-3"><div className="flex flex-wrap gap-1.5 text-[11px]"><span className="rounded bg-white px-2 py-1 font-bold text-emerald-700">{formatRecordDate(record.createdAt)}</span><span className="rounded bg-white px-2 py-1 text-violet-600">{record.sourceType} · {record.recordKind}</span></div><article aria-label="보존된 Record 원문" className="rounded-xl border border-white bg-white/80 p-3"><p className="max-h-64 overflow-y-auto whitespace-pre-wrap text-sm leading-6 text-violet-800">{record.content}</p></article><div aria-label="Record 태그" className="rounded-xl border border-emerald-100 bg-white/75 p-3"><div className="flex items-center gap-1.5"><Tag className="h-4 w-4 text-emerald-700" /><h3 className="text-sm font-bold text-violet-900">태그</h3></div><div className="mt-2 flex flex-wrap gap-1.5">{record.tags.length ? record.tags.map(tag => <button type="button" key={tag} onClick={() => onRemoveTag(tag)} disabled={tagsPending} aria-label={`${tag} 태그 제거`} className="pressable rounded-full border border-emerald-100 bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50">#{tag} ×</button>) : <p className="text-xs text-violet-500">태그가 없습니다.</p>}</div>{quickTags.length ? <div aria-label="최근 사용한 Record 태그" className="mt-3 border-t border-emerald-100 pt-3"><p className="industrial-label text-emerald-600">Quick add</p><div className="mt-2 flex flex-wrap gap-1.5">{quickTags.map(tag => <button type="button" key={tag} onClick={() => onAddTag(tag)} disabled={tagsPending} aria-label={`${tag} 빠른 태그 추가`} className="pressable rounded-full border border-emerald-100 bg-white px-2 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50">#{tag} 추가</button>)}</div></div> : null}<form onSubmit={event => { event.preventDefault(); const tag = tagDraft.trim(); if (!tag) return; onAddTag(tag); setTagDraft(""); }} className="mt-3 flex gap-2"><input value={tagDraft} onChange={event => setTagDraft(event.target.value)} maxLength={64} aria-label="Record 태그 입력" placeholder="태그 추가" className="h-8 min-w-0 flex-1 rounded-md border border-emerald-100 bg-white px-2 text-xs text-violet-800 outline-none focus-visible:ring-2 focus-visible:ring-emerald-500" /><button type="submit" disabled={tagsPending || !tagDraft.trim()} className="pressable shrink-0 rounded-md border border-emerald-100 bg-white px-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50">태그 추가</button></form></div>{(record.projectTitle || record.stageTitle || record.taskTitle) && <dl className="grid gap-2 sm:grid-cols-3">{record.projectTitle && <div className="rounded-lg border border-emerald-100 bg-white/75 p-2"><dt className="industrial-label text-emerald-600">Project</dt><dd className="mt-1 truncate text-xs font-bold text-violet-800">{record.projectTitle}</dd></div>}{record.stageTitle && <div className="rounded-lg border border-emerald-100 bg-white/75 p-2"><dt className="industrial-label text-emerald-600">Stage</dt><dd className="mt-1 truncate text-xs font-bold text-violet-800">{record.stageTitle}</dd></div>}{record.taskTitle && <div className="rounded-lg border border-emerald-100 bg-white/75 p-2"><dt className="industrial-label text-emerald-600">Task</dt><dd className="mt-1 truncate text-xs font-bold text-violet-800">{record.taskTitle}</dd></div>}</dl>}<div><div className="flex items-center gap-1.5"><Paperclip className="h-4 w-4 text-emerald-700" /><h3 className="text-sm font-bold text-violet-900">Attachment {record.attachments.length}개</h3></div>{record.attachments.length ? <ul className="mt-2 space-y-2">{record.attachments.map(attachment => <RecordAttachment key={attachment.id} attachment={attachment} />)}</ul> : <p className="mt-2 text-xs text-violet-500">연결된 Attachment가 없습니다.</p>}</div></div>}</section>;
}

export default function Records() {
  const [query, setQuery] = useState(""); const [projectFilter, setProjectFilter] = useState(ALL); const [taskFilter, setTaskFilter] = useState(ALL); const [sourceFilter, setSourceFilter] = useState<SourceType | typeof ALL>("capture"); const [period, setPeriod] = useState<"all" | "lastMonth" | "month">("all"); const [sort] = useState<"newest">("newest"); const [tagFilter, setTagFilter] = useState(ALL); const [selectedRecordId, setSelectedRecordId] = useState<number | null>(null); const [recordView, setRecordView] = useState<"idea" | "today" | "project" | "tag">("idea");
  const [day] = useState(() => new Date()); const monthRange = useMemo(() => ({ start: new Date(day.getFullYear(), day.getMonth(), 1), end: new Date(day.getFullYear(), day.getMonth() + 1, 1) }), [day]);
  const workspace = trpc.workspace.overview.useQuery({ start: monthRange.start, end: monthRange.end }); const detail = trpc.workspace.recordDetail.useQuery({ recordId: selectedRecordId ?? 1 }, { enabled: selectedRecordId !== null }); const recentTags = trpc.workspace.recentRecordTags.useQuery(); const tagStats = trpc.workspace.recordTagStats.useQuery(); const utils = trpc.useUtils();
  const lastMonthRange = useMemo(() => ({ start: new Date(day.getFullYear(), day.getMonth() - 1, 1), end: new Date(day.getFullYear(), day.getMonth(), 1) }), [day]);
  const searchRange = period === "month" ? monthRange : period === "lastMonth" ? lastMonthRange : { start: null, end: null };
  const search = trpc.workspace.recordSearch.useQuery({ query: query.trim() || undefined, projectId: projectFilter === ALL ? null : Number(projectFilter), taskId: taskFilter === ALL ? null : Number(taskFilter), sourceType: null, start: searchRange.start, end: searchRange.end, sort, tag: recordView === "tag" && tagFilter !== ALL ? tagFilter : null });
  const setPinned = trpc.workspace.setRecordPinned.useMutation({ onSuccess: () => { utils.workspace.recordSearch.invalidate(); utils.workspace.recordDetail.invalidate(); utils.workspace.pinnedRecordSummaries.invalidate(); } }); const refreshTags = () => { utils.workspace.recordSearch.invalidate(); utils.workspace.recordDetail.invalidate(); utils.workspace.recordTagOptions.invalidate(); utils.workspace.recordTagStats.invalidate(); utils.workspace.recentRecordTags.invalidate(); }; const addTag = trpc.workspace.addRecordTag.useMutation({ onSuccess: refreshTags }); const removeTag = trpc.workspace.removeRecordTag.useMutation({ onSuccess: refreshTags }); const deleteRecord = trpc.workspace.deleteRecord.useMutation({ onSuccess: (_data, variables) => { if (selectedRecordId === variables.recordId) setSelectedRecordId(null); utils.workspace.recordSearch.invalidate(); utils.workspace.recordDetail.invalidate(); utils.workspace.pinnedRecordSummaries.invalidate(); }, onError: error => window.alert(error.message || "기록 삭제에 실패했습니다.") });
  const resetFilters = () => { setQuery(""); setProjectFilter(ALL); setTaskFilter(ALL); setSourceFilter("capture"); setPeriod("all"); setTagFilter(ALL); setRecordView("idea"); }; 
  const isTodayRecord = (record: { sourceType: string; content: string }) => record.sourceType === "journal" || record.content.includes("[오늘 마감]");
  const visibleRecords = (search.data ?? []).filter(record => recordView === "today" ? isTodayRecord(record) : recordView === "idea" ? !isTodayRecord(record) && !record.projectId && !record.taskId && !record.projectTitle && !record.stageTitle && !record.taskTitle : recordView === "project" ? Boolean(record.projectId || record.taskId || record.projectTitle || record.stageTitle || record.taskTitle) : record.tags.length > 0);
  const currentProjects = workspace.data?.projects ?? [];
  return (
    <div className="space-y-3 max-w-6xl mx-auto pb-16">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-black text-slate-950">기록 찾기</h1>
          <span className="text-xs font-semibold text-slate-600">· 저장된 기록 보기</span>
        </div>
        <p className="rounded-md bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-bold text-emerald-800">최근 100개</p>
      </header>

      {/* 1. 통합 검색 */}
      <section aria-label="Record 통합 검색" className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-2xs">
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5">
          <span className="text-xs font-black text-slate-900">기록 검색</span>
          <div className="flex rounded-lg bg-slate-100 p-0.5" role="tablist" aria-label="검색 날짜 기간">
            {([['all', '전체'], ['lastMonth', '지난달'], ['month', '이번 달']] as const).map(([value, label]) => <button key={value} type="button" role="tab" aria-selected={period === value} onClick={() => setPeriod(value)} className={`rounded-md px-2.5 py-1 text-[11px] font-bold ${period === value ? "bg-white text-emerald-800 shadow-sm" : "text-slate-500"}`}>{label}</button>)}
          </div>
        </div>
        <label className="relative mt-2 block"><FileText className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" /><input value={query} onChange={event => setQuery(event.target.value)} inputMode="search" placeholder="텍스트 또는 숫자를 입력해 검색" aria-label="기록 통합 검색" className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs font-bold text-slate-900 outline-none focus:border-emerald-600 focus:bg-white" /></label>
      </section>

      {/* 3. 검색 결과와 탭 */}
      <section aria-label="검색된 Record 목록" className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
          <div className="grid min-w-0 flex-1 grid-cols-4 rounded-lg bg-slate-100 p-1" role="tablist" aria-label="기록 보기 탭">
            {([['idea', '아이디어'], ['today', '오늘기록'], ['project', '프로젝트'], ['tag', '태그보기']] as const).map(([value, label]) => <button key={value} type="button" role="tab" aria-selected={recordView === value} onClick={() => { setRecordView(value); setProjectFilter(ALL); setTaskFilter(ALL); setTagFilter(ALL); setSourceFilter(value === "today" ? "journal" : value === "idea" ? "capture" : ALL); }} className={`min-h-9 rounded-md px-1 text-xs font-black ${recordView === value ? "bg-white text-emerald-800 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}>{label}</button>)}
          </div>
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-black text-emerald-800">{visibleRecords.length}개</span>
        </div>
        {recordView === "tag" && <div aria-label="태그 모음" className="mt-2 flex flex-wrap gap-1.5 border-b border-slate-100 pb-2">{tagStats.isLoading ? <span className="text-xs text-slate-400">태그를 불러오는 중...</span> : tagStats.data?.length ? tagStats.data.map(stat => <button key={stat.tag} type="button" onClick={() => setTagFilter(current => current === stat.tag ? ALL : stat.tag)} className={`rounded-md border px-2.5 py-1 text-xs font-bold ${tagFilter === stat.tag ? "border-emerald-500 bg-emerald-100 text-emerald-900" : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-emerald-50"}`}>#{stat.tag} <span className="text-[10px] text-emerald-700">({stat.usageCount})</span></button>) : <span className="text-xs text-slate-400">등록된 태그가 없습니다.</span>}</div>}
        {recordView === "project" && <div aria-label="현재 등록된 프로젝트" className="mt-2 grid gap-2 sm:grid-cols-2">{currentProjects.length ? currentProjects.map(project => <button key={project.id} type="button" onClick={() => setProjectFilter(current => current === String(project.id) ? ALL : String(project.id))} className={`rounded-lg border px-3 py-2 text-left ${projectFilter === String(project.id) ? "border-emerald-500 bg-emerald-50" : "border-slate-200 bg-slate-50 hover:border-emerald-300 hover:bg-emerald-50"}`}><span className="block truncate text-sm font-black text-slate-900">{project.title}</span><span className="mt-1 block text-[11px] font-semibold text-slate-500">{projectFilter === String(project.id) ? "선택됨 · 다시 누르면 해제" : "클릭하여 관련 기록 보기"}</span></button>) : <p className="text-xs text-slate-400">등록된 프로젝트가 없습니다.</p>}</div>}
        {(recordView === "idea" || recordView === "today" || (recordView === "project" && projectFilter !== ALL) || (recordView === "tag" && tagFilter !== ALL)) && (search.isLoading ? <div className="mt-2 h-20 animate-pulse bg-slate-100 rounded" /> : visibleRecords.length ? (
          <ul className="mt-2 space-y-2">
            {visibleRecords.map(record => {
              const hasLinkedData = Boolean(record.projectId || record.taskId || record.projectTitle || record.stageTitle || record.taskTitle);
              return (
              <li key={record.id} className="rounded-lg border border-slate-100 bg-slate-50/70 p-2.5 hover:border-slate-300 transition-colors">
                <div className="flex items-center justify-between gap-2 text-xs font-bold text-slate-600">
                  <span className="font-mono text-slate-700">{formatRecordDate(record.createdAt)}</span>
                  <span className="flex items-center gap-1.5">
                    {record.isPinned && <span className="text-amber-700 font-extrabold flex items-center gap-0.5">📌 고정</span>}
                    <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] text-slate-800">{record.sourceType}</span>
                  </span>
                </div>
                <p className="mt-1.5 line-clamp-3 whitespace-pre-wrap text-[15px] font-semibold leading-5 text-slate-900 sm:text-sm">{record.content}</p>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200/60">
                  <div className="flex flex-wrap gap-1 text-[11px] font-bold text-slate-600">
                    {hasLinkedData && <>
                      {record.projectTitle && <span className="bg-white border border-slate-200 px-1.5 py-0.5 rounded">{record.projectTitle}</span>}
                      {record.taskTitle && <span className="bg-white border border-slate-200 px-1.5 py-0.5 rounded text-emerald-800">› {record.taskTitle}</span>}
                    </>}
                    {record.tags.map(tag => <span key={tag} className="bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded text-emerald-900">#{tag}</span>)}
                  </div>
                  <div className="flex gap-1">
                    <button type="button" onClick={() => setPinned.mutate({ recordId: record.id, isPinned: !record.isPinned })} className="px-2 py-0.5 text-xs font-bold rounded bg-white border border-slate-200 hover:bg-slate-100 text-slate-800">
                      {record.isPinned ? "고정 해제" : "📌 고정"}
                    </button>
                    <button type="button" onClick={() => setSelectedRecordId(record.id)} className="px-2 py-0.5 text-xs font-bold rounded bg-emerald-700 text-white hover:bg-emerald-800">
                      상세 보기
                    </button>
                    <button type="button" onClick={() => { if (window.confirm("이 기록을 삭제할까요? 삭제하면 첨부파일과 태그도 함께 삭제됩니다.")) deleteRecord.mutate({ recordId: record.id }); }} disabled={deleteRecord.isPending} title="기록 삭제" aria-label="기록 삭제" className="pressable inline-flex items-center gap-1 rounded border border-rose-300 bg-white px-2 py-0.5 text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-40"><Trash2 className="h-3 w-3" />삭제</button>
                  </div>
                </div>
              </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-3 p-4 text-center text-xs font-bold text-slate-500 border border-dashed border-slate-200 rounded-lg">기록이 없습니다.</p>
        ))}
      </section>

      {selectedRecordId !== null && (
        <RecordDetailPanel record={detail.data} loading={detail.isLoading} error={Boolean(detail.error)} onClose={() => setSelectedRecordId(null)} onAddTag={tag => addTag.mutate({ recordId: selectedRecordId, tag })} onRemoveTag={tag => removeTag.mutate({ recordId: selectedRecordId, tag })} tagsPending={addTag.isPending || removeTag.isPending} recentTags={recentTags.data ?? []} />
      )}
    </div>
  );
}
