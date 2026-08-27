import { CompletedTaskDrilldown, MonthlyChangeSummary, MonthlyReviewSummary, NextMonthTaskDraft, ProjectTimeComparison, ProjectTimeDistribution, ReviewMemo, ReviewMonthNavigator } from "@/components/WorkspaceInsights";
import { trpc } from "@/lib/trpc";
import { appendReviewMemoTaskQuote } from "@/lib/reviewMemoQuote";
import { formatReviewMonth, getMonthWindow, isSameMonth, shiftMonth, startOfMonth } from "@/lib/reviewPeriod";
import { ArrowRight, CalendarRange, Clock3, FileEdit, Sparkles, TrendingUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

function formatMinutes(minutes: number) {
  if (minutes < 60) return `${minutes}분`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours}시간 ${remainder}분` : `${hours}시간`;
}

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

  const saveMemo = trpc.workspace.saveReviewNote.useMutation({
    onSuccess: () => {
      setSaved(true);
      setMemoSaveError(null);
      utils.workspace.reviewNote.invalidate({ periodStart: window.start, periodEnd: window.end });
      toast.success("월간 회고 메모를 저장했습니다.");
    },
    onError: () => {
      const message = "회고 메모를 저장하지 못했습니다. 다시 시도해 주세요.";
      setMemoSaveError(message);
      toast.error(message);
    },
  });

  const clearMemo = trpc.workspace.deleteReviewNote.useMutation({
    onSuccess: () => {
      setMemo("");
      setSaved(false);
      setMemoSaveError(null);
      utils.workspace.reviewNote.invalidate({ periodStart: window.start, periodEnd: window.end });
      toast.success("월간 회고 메모를 비웠습니다.");
    },
    onError: () => {
      const message = "회고 메모를 비우지 못했습니다. 다시 시도해 주세요.";
      setMemoSaveError(message);
      toast.error(message);
    },
  });

  const applyDraft = trpc.workspace.createTask.useMutation({
    onSuccess: async () => {
      setDraftTitle("");
      setDraftNextAction("");
      setDraftStageId("");
      await Promise.all([
        utils.workspace.monthlyReview.invalidate(window),
        utils.workspace.overview.invalidate(),
        utils.workspace.continue.invalidate(),
      ]);
      toast.success("다음 달 첫 Task를 생성했습니다.");
      setLocation("/projects");
    },
    onError: () => toast.error("Task 초안을 적용하지 못했습니다. 다시 시도해 주세요."),
  });

  useEffect(() => {
    setMemo(reviewNote.data?.content ?? "");
    setSaved(Boolean(reviewNote.data));
  }, [reviewNote.data?.content, reviewNote.data?.id]);

  useEffect(() => {
    if (!draftProjectId && review.data?.activeProjects[0]) setDraftProjectId(String(review.data.activeProjects[0].id));
  }, [draftProjectId, review.data?.activeProjects]);

  if (review.isLoading)
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-14 rounded-xl bg-slate-200" />
        <div className="h-40 rounded-xl bg-slate-100" />
      </div>
    );

  if (review.isError || !review.data)
    return (
      <section className="border-2 border-slate-200 bg-white p-5 rounded-2xl text-center">
        <h2 className="text-xl font-bold text-slate-900">월간 Review를 불러오지 못했습니다.</h2>
        <button
          onClick={() => review.refetch()}
          className="mt-3 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white"
        >
          다시 시도
        </button>
      </section>
    );

  const data = review.data;
  const nextProject = data.activeProjects.find(project => project.nextAction) ?? data.activeProjects[0] ?? null;
  const draftStages = (workspace.data?.stages ?? [])
    .filter(stage => stage.status === "active" && String(stage.projectId) === draftProjectId)
    .map(stage => ({ id: stage.id, title: stage.title }));

  return (
    <div className="space-y-3 max-w-6xl mx-auto pb-16">
      {/* 1. 슬림 헤더 & 월 선택 네비게이터 (한 줄 통합) */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-2.5">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-black text-slate-950">월간 회고</h1>
          <span className="text-xs font-bold text-slate-600 hidden sm:inline">실행 데이터 분석 및 다음 달 준비</span>
        </div>
        <ReviewMonthNavigator
          monthLabel={formatReviewMonth(selectedMonth)}
          onPrevious={() => setSelectedMonth(month => shiftMonth(month, -1))}
          onNext={() => setSelectedMonth(month => shiftMonth(month, 1))}
          nextDisabled={isSameMonth(selectedMonth, currentMonth)}
        />
      </header>

      {/* 2. 핵심 지표 4종 대시보드 카드 (극도로 간결한 한 줄 지표) */}
      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
          <span className="text-xs font-bold text-slate-600 block">완료 Task</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-950">{data.completedTaskCount}</span>
            <span className="text-xs font-bold text-emerald-700">
              {data.comparison.change.completedTaskCount >= 0 ? `+${data.comparison.change.completedTaskCount}` : data.comparison.change.completedTaskCount}
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
          <span className="text-xs font-bold text-slate-600 block">기록 (Capture)</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-950">{data.recordCount}</span>
            <span className="text-xs font-bold text-emerald-700">
              {data.comparison.change.recordCount >= 0 ? `+${data.comparison.change.recordCount}` : data.comparison.change.recordCount}
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
          <span className="text-xs font-bold text-slate-600 block">완료 일정</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-950">{data.completedScheduleCount}</span>
            <span className="text-xs font-bold text-slate-500">개</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
          <span className="text-xs font-bold text-slate-600 block">총 수행 시간</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-lg font-black text-emerald-800 truncate">
              {formatMinutes(data.durationSummary.totalMinutes)}
            </span>
          </div>
        </div>
      </section>

      {/* 3. 프로젝트별 시간 분포 & 전월 대비 변화 (가로 2열 콤팩트 배치) */}
      <div className="grid gap-3 sm:grid-cols-2">
        <ProjectTimeDistribution
          items={data.projectTimeDistribution}
          unassignedDurationSummary={data.unassignedDurationSummary}
        />
        <ProjectTimeComparison items={data.projectTimeComparison} />
      </div>

      {/* 4. 완료 Task 드릴다운 리스트 */}
      <CompletedTaskDrilldown items={data.completedTaskDetails} />

      {/* 5. 회고 메모 & 다음 달 초안 (가로 2열 슬림 배치) */}
      <div className="grid gap-3 lg:grid-cols-2">
        <ReviewMemo
          value={memo}
          onChange={value => {
            setMemo(value);
            setSaved(false);
            setMemoSaveError(null);
          }}
          completedTasks={data.completedTaskDetails.map(task => ({
            id: task.id,
            title: task.title,
            projectTitle: task.projectTitle,
            stageTitle: task.stageTitle,
            nextAction: task.nextAction,
          }))}
          onQuoteTask={task => {
            setMemo(current => appendReviewMemoTaskQuote(current, task));
            setSaved(false);
            setMemoSaveError(null);
          }}
          onSave={() =>
            saveMemo.mutate({ periodStart: window.start, periodEnd: window.end, content: memo.trim() })
          }
          onClear={() => clearMemo.mutate({ periodStart: window.start, periodEnd: window.end })}
          saving={saveMemo.isPending}
          clearing={clearMemo.isPending}
          saved={saved}
          errorMessage={memoSaveError}
        />

        <NextMonthTaskDraft
          projects={data.activeProjects.map(project => ({ id: project.id, title: project.title }))}
          stages={draftStages}
          projectId={draftProjectId}
          stageId={draftStageId}
          title={draftTitle}
          nextAction={draftNextAction}
          onProjectChange={value => {
            setDraftProjectId(value);
            setDraftStageId("");
          }}
          onStageChange={setDraftStageId}
          onTitleChange={setDraftTitle}
          onNextActionChange={setDraftNextAction}
          onApply={() =>
            applyDraft.mutate({
              title: draftTitle.trim(),
              projectId: Number(draftProjectId),
              stageId: draftStageId ? Number(draftStageId) : null,
              nextAction: draftNextAction.trim() || null,
              status: "planned",
            })
          }
          applying={applyDraft.isPending}
        />
      </div>
    </div>
  );
}
