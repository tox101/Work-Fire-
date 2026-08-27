import { CompletedTaskDrilldown, MonthlyChangeSummary, MonthlyReviewSummary, NextMonthTaskDraft, ProjectTimeComparison, ProjectTimeDistribution, ReviewMemo, ReviewMonthNavigator } from "@/components/WorkspaceInsights";
import { trpc } from "@/lib/trpc";
import { appendReviewMemoTaskQuote } from "@/lib/reviewMemoQuote";
import { formatReviewMonth, getMonthWindow, isSameMonth, shiftMonth, startOfMonth } from "@/lib/reviewPeriod";
import { ArrowRight, CalendarRange } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function Review() {
  const [selectedMonth, setSelectedMonth] = useState(() => startOfMonth(new Date()));
  const window = useMemo(() => getMonthWindow(selectedMonth), [selectedMonth]);
  const currentMonth = useMemo(() => startOfMonth(new Date()), []);
  const [, setLocation] = useLocation();
  const review = trpc.workspace.monthlyReview.useQuery(window);
  const reviewNote = trpc.workspace.reviewNote.useQuery({ periodStart: window.start, periodEnd: window.end });
  const workspace = trpc.workspace.overview.useQuery({ start: window.start, end: window.end });
  const [memo, setMemo] = useState("");
  const [saved, setSaved] = useState(false);
  const [memoSaveError, setMemoSaveError] = useState<string | null>(null);
  const [draftProjectId, setDraftProjectId] = useState("");
  const [draftStageId, setDraftStageId] = useState("");
  const [draftTitle, setDraftTitle] = useState("");
  const [draftNextAction, setDraftNextAction] = useState("");
  const utils = trpc.useUtils();
  const saveMemo = trpc.workspace.saveReviewNote.useMutation({ onSuccess: () => { setSaved(true); setMemoSaveError(null); utils.workspace.reviewNote.invalidate({ periodStart: window.start, periodEnd: window.end }); toast.success("월간 회고 메모를 저장했습니다."); }, onError: () => { const message = "회고 메모를 저장하지 못했습니다. 다시 시도해 주세요."; setMemoSaveError(message); toast.error(message); } });
  const clearMemo = trpc.workspace.deleteReviewNote.useMutation({ onSuccess: () => { setMemo(""); setSaved(false); setMemoSaveError(null); utils.workspace.reviewNote.invalidate({ periodStart: window.start, periodEnd: window.end }); toast.success("월간 회고 메모를 비웠습니다."); }, onError: () => { const message = "회고 메모를 비우지 못했습니다. 다시 시도해 주세요."; setMemoSaveError(message); toast.error(message); } });
  const applyDraft = trpc.workspace.createTask.useMutation({ onSuccess: async () => { setDraftTitle(""); setDraftNextAction(""); setDraftStageId(""); await Promise.all([utils.workspace.monthlyReview.invalidate(window), utils.workspace.overview.invalidate(), utils.workspace.continue.invalidate()]); toast.success("다음 달 첫 Task를 생성했습니다."); setLocation("/projects"); }, onError: () => toast.error("Task 초안을 적용하지 못했습니다. 다시 시도해 주세요.") });

  useEffect(() => { setMemo(reviewNote.data?.content ?? ""); setSaved(Boolean(reviewNote.data)); }, [reviewNote.data?.content, reviewNote.data?.id]);
  useEffect(() => { if (!draftProjectId && review.data?.activeProjects[0]) setDraftProjectId(String(review.data.activeProjects[0].id)); }, [draftProjectId, review.data?.activeProjects]);

  if (review.isLoading) return <div className="animate-pulse space-y-4"><div className="h-28 rounded-2xl bg-violet-100" /><div className="h-64 rounded-2xl bg-violet-50" /></div>;
  if (review.isError || !review.data) return <section className="block-shadow border border-violet-100 bg-white p-5"><p className="industrial-label text-violet-400">Review status</p><h1 className="industrial-title mt-2 text-3xl text-violet-950">월간 Review를 불러오지 못했습니다.</h1><button onClick={() => review.refetch()} className="pressable mt-4 rounded-lg bg-violet-500 px-4 py-2 text-sm font-bold text-white">다시 시도</button></section>;

  const nextProject = review.data.activeProjects.find(project => project.nextAction) ?? review.data.activeProjects[0] ?? null;
  const draftStages = (workspace.data?.stages ?? []).filter(stage => stage.status === "active" && String(stage.projectId) === draftProjectId).map(stage => ({ id: stage.id, title: stage.title }));
  return <div className="space-y-4">
    <header className="grid gap-3 border-b border-violet-100 pb-4 sm:grid-cols-[1fr_auto] sm:items-end"><div><p className="industrial-label text-violet-400">Review / {formatReviewMonth(selectedMonth)}</p><h1 className="industrial-title mt-1 text-4xl text-violet-950 sm:text-5xl">한 달의<br />실행 기록</h1></div><div className="grid gap-3 sm:justify-items-end"><p className="max-w-xs text-[13px] leading-5 text-violet-600">완료 수치와 남아 있는 맥락을 분리해 다음 달을 준비합니다.</p><ReviewMonthNavigator monthLabel={formatReviewMonth(selectedMonth)} onPrevious={() => setSelectedMonth(month => shiftMonth(month, -1))} onNext={() => setSelectedMonth(month => shiftMonth(month, 1))} nextDisabled={isSameMonth(selectedMonth, currentMonth)} /></div></header>
    <MonthlyReviewSummary completedTaskCount={review.data.completedTaskCount} recordCount={review.data.recordCount} completedScheduleCount={review.data.completedScheduleCount} durationSummary={review.data.durationSummary} activeProjects={review.data.activeProjects} />
    <MonthlyChangeSummary comparison={review.data.comparison} />
    <ProjectTimeDistribution items={review.data.projectTimeDistribution} unassignedDurationSummary={review.data.unassignedDurationSummary} />
    <ProjectTimeComparison items={review.data.projectTimeComparison} />
    <CompletedTaskDrilldown items={review.data.completedTaskDetails} />
    <ReviewMemo value={memo} onChange={value => { setMemo(value); setSaved(false); setMemoSaveError(null); }} completedTasks={review.data.completedTaskDetails.map(task => ({ id: task.id, title: task.title, projectTitle: task.projectTitle, stageTitle: task.stageTitle, nextAction: task.nextAction }))} onQuoteTask={task => { setMemo(current => appendReviewMemoTaskQuote(current, task)); setSaved(false); setMemoSaveError(null); }} onSave={() => saveMemo.mutate({ periodStart: window.start, periodEnd: window.end, content: memo.trim() })} onClear={() => clearMemo.mutate({ periodStart: window.start, periodEnd: window.end })} saving={saveMemo.isPending} clearing={clearMemo.isPending} saved={saved} errorMessage={memoSaveError} />
    <NextMonthTaskDraft projects={review.data.activeProjects.map(project => ({ id: project.id, title: project.title }))} stages={draftStages} projectId={draftProjectId} stageId={draftStageId} title={draftTitle} nextAction={draftNextAction} onProjectChange={value => { setDraftProjectId(value); setDraftStageId(""); }} onStageChange={setDraftStageId} onTitleChange={setDraftTitle} onNextActionChange={setDraftNextAction} onApply={() => applyDraft.mutate({ title: draftTitle.trim(), projectId: Number(draftProjectId), stageId: draftStageId ? Number(draftStageId) : null, nextAction: draftNextAction.trim() || null, status: "planned" })} applying={applyDraft.isPending} />
    <section aria-label="현재 Workspace 후속 맥락" className="rounded-2xl border border-emerald-100 bg-emerald-50/65 p-4 sm:p-5"><div className="flex items-center gap-2"><CalendarRange className="h-4 w-4 text-emerald-600" /><p className="industrial-label text-emerald-600">Current workspace context</p></div>{nextProject ? <><h2 className="industrial-title mt-2 text-2xl text-violet-950">{nextProject.title}</h2><p className="mt-2 text-sm text-emerald-800">{nextProject.nextAction || "다음 행동을 기록해 두면 다음 달에 바로 이어갈 수 있습니다."}</p><button onClick={() => setLocation("/projects")} className="pressable mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-bold text-white hover:bg-emerald-600">Project 이어가기 <ArrowRight className="h-4 w-4" /></button></> : <><h2 className="industrial-title mt-2 text-2xl text-violet-950">새 달의 첫 Project를<br />만드세요.</h2><p className="mt-2 text-sm text-emerald-800">이 영역은 선택 월과 별개로 현재 활성 Workspace를 기준으로 합니다.</p><button onClick={() => setLocation("/projects")} className="pressable mt-4 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-bold text-white hover:bg-emerald-600">Project 만들기</button></>}</section>
  </div>;
}
