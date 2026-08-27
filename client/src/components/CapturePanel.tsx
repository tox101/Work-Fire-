import { trpc } from "@/lib/trpc";
import { FileText, Link as LinkIcon, Paperclip, Tag, X } from "lucide-react";
import React, { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { listPendingCaptures, PendingCapture, removePendingCapture, savePendingCapture, setPendingCaptureError } from "@/lib/captureOutbox";

type WorkspaceData = {
  projects: Array<{ id: number; title: string }>;
  stages: Array<{ id: number; projectId: number; title: string }>;
  tasks: Array<{ id: number; projectId: number | null; stageId: number | null; title: string; status: string }>;
};

const CAPTURE_DRAFT_KEY = "personal-work-os:capture-draft:v1";
type CaptureDraft = { content: string; tags: string[]; projectId: string; taskId: string };

function readCaptureDraft(): CaptureDraft {
  if (typeof window === "undefined") return { content: "", tags: [], projectId: "", taskId: "" };
  try {
    const parsed = JSON.parse(window.localStorage.getItem(CAPTURE_DRAFT_KEY) ?? "null");
    if (!parsed || typeof parsed.content !== "string" || !Array.isArray(parsed.tags)) return { content: "", tags: [], projectId: "", taskId: "" };
    return { content: parsed.content, tags: parsed.tags.filter((tag: unknown) => typeof tag === "string").slice(0, 8), projectId: typeof parsed.projectId === "string" ? parsed.projectId : "", taskId: typeof parsed.taskId === "string" ? parsed.taskId : "" };
  } catch { return { content: "", tags: [], projectId: "", taskId: "" }; }
}

function fileToBase64(file: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.readAsDataURL(file);
  });
}

function createRequestId() {
  return window.crypto.randomUUID();
}

export function CapturePanel({ workspace, onComplete, compact = false }: { workspace?: WorkspaceData; onComplete?: () => void; compact?: boolean }) {
  const [draft] = useState(readCaptureDraft);
  const [content, setContent] = useState(draft.content);
  const [taskId, setTaskId] = useState<string>(draft.taskId);
  const [projectId, setProjectId] = useState<string>(draft.projectId);
  const [files, setFiles] = useState<File[]>([]);
  const [tagDraft, setTagDraft] = useState("");
  const [tags, setTags] = useState<string[]>(draft.tags);
  const [mergeSourceTag, setMergeSourceTag] = useState("");
  const [mergeTargetTag, setMergeTargetTag] = useState("");
  const [pendingCaptures, setPendingCaptures] = useState<PendingCapture[]>([]);
  const [syncingCaptureId, setSyncingCaptureId] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(() => typeof navigator === "undefined" || navigator.onLine);
  const fileInput = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();
  const capture = trpc.workspace.captureRecord.useMutation();
  const upload = trpc.workspace.uploadAttachment.useMutation();
  const recentTags = trpc.workspace.recentRecordTags.useQuery();
  const tagOptions = trpc.workspace.recordTagOptions.useQuery();
  const recentTagMerges = trpc.workspace.recentTagMergeOperations.useQuery();
  const mergeTag = trpc.workspace.mergeRecordTag.useMutation({
    onSuccess: (_result, variables) => {
      setTags(current => Array.from(new Set(current.map(tag => tag === variables.sourceTag ? variables.targetTag : tag))));
      setMergeSourceTag("");
      setMergeTargetTag("");
      void Promise.all([utils.workspace.recordSearch.invalidate(), utils.workspace.recordTagOptions.invalidate(), utils.workspace.recentRecordTags.invalidate(), utils.workspace.recordTagStats.invalidate(), utils.workspace.savedRecordSearches.invalidate(), utils.workspace.recentTagMergeOperations.invalidate()]);
      toast.success("태그를 정리했습니다.");
    },
    onError: error => toast.error(error.message),
  });
  const undoTagMerge = trpc.workspace.undoRecordTagMerge.useMutation({
    onSuccess: () => {
      void Promise.all([utils.workspace.recordSearch.invalidate(), utils.workspace.recordTagOptions.invalidate(), utils.workspace.recentRecordTags.invalidate(), utils.workspace.recordTagStats.invalidate(), utils.workspace.savedRecordSearches.invalidate(), utils.workspace.recentTagMergeOperations.invalidate()]);
      toast.success("태그 병합을 되돌렸습니다.");
    },
    onError: error => toast.error(error.message),
  });
  const selectedTask = useMemo(() => workspace?.tasks.find(task => String(task.id) === taskId), [workspace?.tasks, taskId]);
  const hasDraft = Boolean(content || tags.length || projectId || taskId);
  const refreshPendingCaptures = useCallback(async () => {
    try { setPendingCaptures(await listPendingCaptures()); }
    catch (error) { toast.error(error instanceof Error ? error.message : "전송 대기함을 불러오지 못했습니다."); }
  }, []);
  const syncPendingCapture = useCallback(async (pending: PendingCapture, closeOnSuccess = false) => {
    if (typeof navigator !== "undefined" && !navigator.onLine) { setIsOnline(false); return false; }
    setSyncingCaptureId(pending.id);
    try {
      const record = await capture.mutateAsync({ content: pending.content, sourceType: pending.sourceType, projectId: pending.projectId, stageId: pending.stageId, taskId: pending.taskId, clientRequestId: pending.id, tags: pending.tags });
      for (const file of pending.files) await upload.mutateAsync({ recordId: record.id, fileName: file.fileName, mimeType: file.mimeType, clientUploadId: file.clientUploadId, base64Data: await fileToBase64(file.blob) });
      await removePendingCapture(pending.id);
      await refreshPendingCaptures();
      await Promise.all([utils.workspace.overview.invalidate(), utils.workspace.continue.invalidate(), utils.workspace.recordSearch.invalidate(), utils.workspace.recordTagOptions.invalidate(), utils.workspace.recentRecordTags.invalidate()]);
      toast.success("기록을 저장했습니다.");
      if (closeOnSuccess) onComplete?.();
      return true;
    } catch (error) {
      await setPendingCaptureError(pending, error instanceof Error ? error.message : "기록을 저장하지 못했습니다.");
      await refreshPendingCaptures();
      toast.error("전송 대기함에 보관했습니다. 네트워크가 복구되면 다시 시도하세요.");
      return false;
    } finally { setSyncingCaptureId(null); }
  }, [capture, onComplete, refreshPendingCaptures, upload, utils.workspace.continue, utils.workspace.overview, utils.workspace.recordSearch, utils.workspace.recordTagOptions, utils.workspace.recentRecordTags]);
  useEffect(() => {
    void refreshPendingCaptures();
    const handleOnline = () => { setIsOnline(true); void listPendingCaptures().then(items => Promise.all(items.map(item => syncPendingCapture(item)))); };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline); window.addEventListener("offline", handleOffline);
    return () => { window.removeEventListener("online", handleOnline); window.removeEventListener("offline", handleOffline); };
  }, [refreshPendingCaptures, syncPendingCapture]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (hasDraft) window.localStorage.setItem(CAPTURE_DRAFT_KEY, JSON.stringify({ content, tags, projectId, taskId }));
    else window.localStorage.removeItem(CAPTURE_DRAFT_KEY);
  }, [content, hasDraft, projectId, tags, taskId]);
  const clearDraft = () => { setContent(""); setTaskId(""); setProjectId(""); setTags([]); setTagDraft(""); setFiles([]); if (typeof window !== "undefined") window.localStorage.removeItem(CAPTURE_DRAFT_KEY); };
  const addTag = (value: string) => {
    const tag = value.trim().replace(/\s+/g, " ");
    if (!tag || tags.includes(tag) || tags.length >= 8) return;
    setTags(current => [...current, tag]);
    setTagDraft("");
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!content.trim()) return;
    try {
      const oversizedFile = files.find(file => file.size > 8 * 1024 * 1024);
      if (oversizedFile) throw new Error(`${oversizedFile.name}: 8MB 이하의 파일만 첨부할 수 있습니다.`);
      const pending: PendingCapture = {
        id: createRequestId(),
        content: content.trim(),
        sourceType: /^https?:\/\//.test(content.trim()) ? "link" : "capture",
        taskId: selectedTask?.id ?? null,
        projectId: selectedTask?.projectId ?? (projectId ? Number(projectId) : null),
        stageId: selectedTask?.stageId ?? null,
        tags,
        files: files.map(file => ({ clientUploadId: createRequestId(), fileName: file.name, mimeType: file.type || "application/octet-stream", blob: file })),
        createdAt: Date.now(),
        lastError: null,
      };
      await savePendingCapture(pending);
      clearDraft();
      await refreshPendingCaptures();
      if (typeof navigator === "undefined" || navigator.onLine) await syncPendingCapture(pending, true);
      else { setIsOnline(false); toast.message("오프라인이라 이 기기의 전송 대기함에 보관했습니다."); }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "기록을 저장하지 못했습니다.");
    }
  };

  return (
    <form onSubmit={submit} className={`bg-white/90 ${compact ? "rounded-xl border border-violet-100 p-3" : "block-shadow border border-violet-100 p-4"}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="industrial-label text-violet-400">Capture / 원문 보존</p>
          <h2 className="industrial-title mt-1 text-xl text-violet-950">기록하기</h2>
        </div>
        <FileText className="h-5 w-5 text-violet-300" />
      </div>
      <textarea autoFocus value={content} onChange={event => setContent(event.target.value)} className="mono-input mt-3 min-h-28 resize-y" placeholder="생각, 링크, 작업 로그를 먼저 남기세요." aria-label="기록 내용" />
      {!isOnline ? <p role="status" className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">오프라인입니다. 기록은 이 기기에 보관하고 연결되면 전송합니다.</p> : null}
      {pendingCaptures.length ? <section aria-label="Capture 전송 대기함" className="mt-2 rounded-lg border border-sky-100 bg-sky-50/70 px-3 py-2"><div className="flex items-center justify-between gap-2"><p className="text-xs font-bold text-sky-800">전송 대기 기록 {pendingCaptures.length}개</p><button type="button" onClick={() => void Promise.all(pendingCaptures.map(item => syncPendingCapture(item)))} disabled={!isOnline || syncingCaptureId !== null} className="pressable text-xs font-bold text-sky-800 underline underline-offset-2 disabled:opacity-50">다시 전송</button></div><ul className="mt-2 space-y-1">{pendingCaptures.map(item => <li key={item.id} className="flex items-center justify-between gap-2 text-[11px] text-sky-700"><span className="min-w-0 truncate">첨부 {item.files.length}개 · {item.lastError ? "재시도 필요" : "전송 대기"}</span><button type="button" onClick={() => void syncPendingCapture(item)} disabled={!isOnline || syncingCaptureId !== null} aria-label="대기 중인 Capture 다시 전송" className="pressable shrink-0 font-bold underline underline-offset-2 disabled:opacity-50">{syncingCaptureId === item.id ? "전송 중" : "전송"}</button></li>)}</ul></section> : null}
      {hasDraft ? <div aria-label="Capture 임시저장" className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-emerald-100 bg-emerald-50/60 px-3 py-2"><p className="text-xs font-bold text-emerald-700">이 기기에서 임시저장 중</p><button type="button" onClick={clearDraft} aria-label="Capture 임시저장 비우기" className="pressable text-xs font-bold text-emerald-700 underline underline-offset-2 hover:text-emerald-900">임시저장 비우기</button></div> : null}
      <section aria-label="Capture 태그" className="mt-3 rounded-xl border border-violet-100 bg-violet-50/45 p-3"><div className="flex items-center justify-between gap-2"><div className="flex items-center gap-1.5"><Tag className="h-4 w-4 text-violet-600" /><h3 className="text-sm font-bold text-violet-900">태그</h3></div><p className="text-[11px] text-violet-500">최대 8개</p></div>{tags.length ? <div className="mt-2 flex flex-wrap gap-1.5">{tags.map(tag => <button type="button" key={tag} onClick={() => setTags(current => current.filter(item => item !== tag))} aria-label={`${tag} Capture 태그 제거`} className="pressable rounded-full border border-violet-100 bg-white px-2 py-1 text-[11px] font-bold text-violet-700 hover:bg-violet-100">#{tag} ×</button>)}</div> : null}<div className="mt-2 flex gap-2"><input value={tagDraft} onChange={event => setTagDraft(event.target.value)} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); addTag(tagDraft); } }} maxLength={64} aria-label="Capture 태그 입력" placeholder="태그 추가" className="mono-input h-8 min-w-0 flex-1 px-2 text-xs" /><button type="button" onClick={() => addTag(tagDraft)} disabled={!tagDraft.trim() || tags.length >= 8} className="pressable shrink-0 rounded-md border border-violet-200 bg-white px-2 text-xs font-bold text-violet-700 hover:bg-violet-100 disabled:opacity-50">추가</button></div>{(recentTags.data ?? []).filter(tag => !tags.includes(tag)).length ? <div aria-label="최근 사용한 Capture 태그" className="mt-3 border-t border-violet-100 pt-3"><p className="industrial-label text-violet-500">Quick add</p><div className="mt-2 flex flex-wrap gap-1.5">{(recentTags.data ?? []).filter(tag => !tags.includes(tag)).map(tag => <button type="button" key={tag} onClick={() => addTag(tag)} disabled={tags.length >= 8} aria-label={`${tag} Capture 빠른 태그 추가`} className="pressable rounded-full border border-violet-100 bg-white px-2 py-1 text-[11px] font-bold text-violet-700 hover:bg-violet-100 disabled:opacity-50">#{tag} 추가</button>)}</div></div> : null}</section>
      {(tagOptions.data ?? []).length ? <section aria-label="Record 태그 정리" className="mt-3 rounded-xl border border-violet-100 bg-white/80 p-3"><div className="flex items-center justify-between gap-2"><div><p className="industrial-label text-violet-500">Tag management</p><h3 className="mt-1 text-sm font-bold text-violet-900">태그 이름 수정·병합</h3></div><p className="text-[11px] text-violet-500">기존 연결 유지</p></div><div className="mt-2 grid gap-2 sm:grid-cols-[1fr_1fr_auto]"><select value={mergeSourceTag} onChange={event => setMergeSourceTag(event.target.value)} aria-label="병합할 원본 태그" className="mono-input h-8 text-xs"><option value="">원본 태그 선택</option>{(tagOptions.data ?? []).map(tag => <option key={tag} value={tag}>#{tag}</option>)}</select><input value={mergeTargetTag} onChange={event => setMergeTargetTag(event.target.value)} maxLength={64} aria-label="병합할 대상 태그" placeholder="새 태그 이름" className="mono-input h-8 px-2 text-xs" /><button type="button" onClick={() => mergeTag.mutate({ sourceTag: mergeSourceTag, targetTag: mergeTargetTag })} disabled={!mergeSourceTag || !mergeTargetTag.trim() || mergeTag.isPending} className="pressable h-8 rounded-md border border-violet-200 bg-violet-50 px-3 text-xs font-bold text-violet-700 hover:bg-violet-100 disabled:opacity-50">{mergeTag.isPending ? "정리 중" : "병합"}</button></div></section> : null}
      {(recentTagMerges.data ?? []).length ? <section aria-label="최근 태그 병합" className="mt-3 rounded-xl border border-amber-100 bg-amber-50/65 p-3"><p className="industrial-label text-amber-600">Undo merge</p><h3 className="mt-1 text-sm font-bold text-violet-900">최근 태그 병합</h3><ul className="mt-2 space-y-2">{recentTagMerges.data?.map(operation => <li key={operation.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-100 bg-white/85 px-2.5 py-2"><p className="text-xs font-bold text-violet-800"><span>#{operation.sourceTag}</span><span className="mx-1 text-violet-400">→</span><span>#{operation.targetTag}</span><span className="ml-1.5 font-normal text-violet-500">{Array.isArray(operation.recordChanges) ? `${operation.recordChanges.length}개 Record` : ""}</span></p><button type="button" onClick={() => undoTagMerge.mutate({ operationId: operation.id })} disabled={undoTagMerge.isPending} aria-label={`${operation.sourceTag}에서 ${operation.targetTag} 태그 병합 되돌리기`} className="pressable rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-bold text-amber-800 hover:bg-amber-100 disabled:opacity-50">{undoTagMerge.isPending ? "되돌리는 중" : "되돌리기"}</button></li>)}</ul><p className="mt-2 text-[11px] leading-4 text-amber-800">병합 후 태그나 저장 검색이 바뀐 경우에는 원본 보호를 위해 되돌리지 않습니다.</p></section> : null}
      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <select value={projectId} onChange={event => { setProjectId(event.target.value); setTaskId(""); }} className="mono-input h-10" aria-label="연결할 Project 선택">
          <option value="">Project 연결 안 함</option>
          {workspace?.projects.map(project => <option key={project.id} value={project.id}>{project.title}</option>)}
        </select>
        <select value={taskId} onChange={event => setTaskId(event.target.value)} className="mono-input h-10" aria-label="연결할 Task 선택">
          <option value="">Task 연결 안 함</option>
          {workspace?.tasks.filter(task => task.status !== "cancelled" && (!projectId || String(task.projectId) === projectId)).map(task => <option key={task.id} value={task.id}>{task.title}</option>)}
        </select>
        <input ref={fileInput} type="file" multiple className="sr-only" onChange={event => setFiles(Array.from(event.target.files ?? []))} />
        <button type="button" onClick={() => fileInput.current?.click()} className="pressable flex h-10 items-center justify-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-3 text-sm font-bold text-violet-700 hover:bg-violet-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400">
          <Paperclip className="h-4 w-4" /> 첨부
        </button>
      </div>
      {files.length > 0 && <ul className="mt-3 space-y-2" aria-label="선택한 첨부 파일">{files.map(file => <li key={`${file.name}-${file.lastModified}`} className="flex items-center justify-between rounded-xl bg-violet-50 px-3 py-2 text-xs"><span className="truncate">{file.name} · {Math.ceil(file.size / 1024)}KB</span><button type="button" onClick={() => setFiles(current => current.filter(item => item !== file))} aria-label={`${file.name} 제거`}><X className="h-4 w-4" /></button></li>)}</ul>}
      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-xs text-violet-500"><LinkIcon className="h-3.5 w-3.5" />Task 연결은 선택 사항입니다.</p>
        <button disabled={capture.isPending || upload.isPending || !content.trim()} className="pressable h-9 rounded-lg bg-violet-500 px-4 text-sm font-bold text-white hover:bg-violet-600 disabled:cursor-not-allowed disabled:bg-violet-200">{capture.isPending || upload.isPending ? "저장 중" : "기록하기"}</button>
      </div>
    </form>
  );
}
