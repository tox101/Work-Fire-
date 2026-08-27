import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { CompletedTaskDrilldown, MonthlyChangeSummary, MonthlyReviewSummary, NextMonthTaskDraft, PinnedRecordSummary, ProjectNextStageSummary, ProjectProgressSummary, ProjectTimeComparison, ProjectTimeDistribution, RecentCaptureSummary, ReviewMemo, ReviewMonthNavigator, StageProgressHint, SuggestedTaskSummary, WeeklySummary } from "../../client/src/components/WorkspaceInsights";

describe("workspace insight UI", () => {
  it("renders a keyboard-accessible recommended-task action and recent capture context", () => {
    const markup = renderToStaticMarkup(createElement("div", null,
      createElement(SuggestedTaskSummary, { task: { id: 1, title: "계획 작업", nextAction: "초안 작성" }, projectTitle: "개인 OS", onStart: vi.fn() }),
      createElement(RecentCaptureSummary, { content: "방금 남긴 원문 기록" }),
    ));
    expect(markup).toContain('aria-label="계획 작업 작업 시작"');
    expect(markup).toContain("이 작업 시작");
    expect(markup).toContain('aria-label="최근 기록"');
    expect(markup).toContain("방금 남긴 원문 기록");
  });

  it("renders only user-pinned Record originals with an accessible Records action", () => {
    const markup = renderToStaticMarkup(createElement(PinnedRecordSummary, { items: [{ id: 9, content: "줄바꿈을 포함한\n고정 원문", sourceType: "capture", createdAt: new Date("2026-08-26T10:00:00.000Z"), projectTitle: "개인 OS", stageTitle: "Today", taskTitle: "고정 맥락" }], onViewRecords: vi.fn() }));
    expect(markup).toContain('aria-label="고정 Record 맥락"');
    expect(markup).toContain("줄바꿈을 포함한\n고정 원문");
    expect(markup).toContain("개인 OS · Today · 고정 맥락");
    expect(markup).toContain("Records에서 전체 보기");
  });

  it("does not reserve a Today card when no Record has been explicitly pinned", () => {
    const markup = renderToStaticMarkup(createElement(PinnedRecordSummary, { items: [], onViewRecords: vi.fn() }));
    expect(markup).toBe("");
  });

  it("renders Project progress with an accessible percentage", () => {
    const markup = renderToStaticMarkup(createElement(ProjectProgressSummary, { projectTitle: "개인 OS", completed: 2, total: 4, percent: 50, todayTaskCount: 1 }));
    expect(markup).toContain('role="progressbar"');
    expect(markup).toContain('aria-label="개인 OS Task 진행률"');
    expect(markup).toContain('aria-valuenow="50"');
    expect(markup).toContain("오늘 연결된 Task 1개");
  });

  it("renders weekly counts and a labeled Stage completion action", () => {
    const markup = renderToStaticMarkup(createElement("div", null,
      createElement(WeeklySummary, { completedTaskCount: 3, recordCount: 5, completedScheduleCount: 2, change: { completedTaskCount: 1, recordCount: -2, completedScheduleCount: 0 } }),
      createElement(StageProgressHint, { stageTitle: "구현", message: "모든 Task 완료 · Stage 완료 처리", canComplete: true, onComplete: vi.fn() }),
    ));
    expect(markup).toContain('aria-label="이번 주 요약"');
    expect(markup).toContain("완료 Task");
    expect(markup).toContain("전주 대비 +1");
    expect(markup).toContain("전주 대비 -2");
    expect(markup).toContain("전주와 같음");
    expect(markup).toContain('role="status"');
    expect(markup).toContain('aria-label="구현 Stage 완료 처리"');
  });

  it("renders a Project-level next Stage landmark and completion action", () => {
    const markup = renderToStaticMarkup(createElement(ProjectNextStageSummary, { projectTitle: "개인 OS", stageTitle: "구현", message: "모든 Task 완료 · Stage 완료 처리", canComplete: true, onComplete: vi.fn() }));
    expect(markup).toContain('aria-label="개인 OS 다음 Stage"');
    expect(markup).toContain('aria-label="구현 Stage 완료 처리"');
  });

  it("renders monthly summary metrics and active Project context", () => {
    const markup = renderToStaticMarkup(createElement(MonthlyReviewSummary, { completedTaskCount: 8, recordCount: 11, completedScheduleCount: 4, durationSummary: { trackedTaskCount: 2, totalMinutes: 135, averageMinutes: 68 }, activeProjects: [{ id: 1, title: "개인 OS", completedTaskCount: 2, totalTaskCount: 3, nextAction: "요약 화면 마무리" }] }));
    expect(markup).toContain('aria-label="월간 Review 요약"');
    expect(markup).toContain("개인 OS");
    expect(markup).toContain("다음: 요약 화면 마무리");
    expect(markup).toContain('aria-label="개인 OS 진행 맥락"');
    expect(markup).toContain('aria-label="완료 Task 수행 시간"');
    expect(markup).toContain("선택 월의 집계와 별개로 현재 활성 Workspace를 표시합니다.");
    expect(markup).toContain("실제 수행 시간 2시간 15분");
    expect(markup).toContain("평균 1시간 8분");
  });

  it("renders a labeled monthly review memo with an explicit save action and completed Task quote control", () => {
    const markup = renderToStaticMarkup(createElement(ReviewMemo, { value: "다음 달에도 이어갈 방향", onChange: vi.fn(), completedTasks: [{ id: 7, title: "월간 회고 정리", projectTitle: "개인 OS", stageTitle: "Review", nextAction: "다음 우선순위 정하기" }], onQuoteTask: vi.fn(), onSave: vi.fn(), onClear: vi.fn(), saving: false, clearing: false, saved: true, errorMessage: "저장하지 못했습니다." }));
    expect(markup).toContain('aria-label="월간 회고 메모"');
    expect(markup).toContain('aria-label="월간 회고 메모 내용"');
    expect(markup).toContain("메모 저장");
    expect(markup).toContain('role="alert"');
    expect(markup).toContain("저장하지 못했습니다.");
    expect(markup).toContain("메모 비우기");
    expect(markup).toContain('aria-label="완료 Task 인용"');
    expect(markup).toContain('aria-label="회고 메모에 인용할 완료 Task"');
    expect(markup).toContain("월간 회고 정리");
    expect(markup).toContain("기존 메모는 변경하지 않습니다.");
  });

  it("renders a Project-linked next month Task draft with explicit apply action", () => {
    const markup = renderToStaticMarkup(createElement(NextMonthTaskDraft, { projects: [{ id: 1, title: "개인 OS" }], stages: [{ id: 2, title: "구현" }], projectId: "1", stageId: "2", title: "첫 Task", nextAction: "환경 열기", onProjectChange: vi.fn(), onStageChange: vi.fn(), onTitleChange: vi.fn(), onNextActionChange: vi.fn(), onApply: vi.fn(), applying: false }));
    expect(markup).toContain('aria-label="다음 달 첫 Task 초안"');
    expect(markup).toContain('aria-label="Task 초안 Project"');
    expect(markup).toContain('aria-label="Task 초안 Stage"');
    expect(markup).toContain("Task로 적용");
    expect(markup).toContain("선택 월 Review와 별개로 현재 활성 Project에 직접 적용합니다.");
  });

  it("renders accessible monthly Review navigation with a disabled future action", () => {
    const markup = renderToStaticMarkup(createElement(ReviewMonthNavigator, { monthLabel: "2026년 8월", onPrevious: vi.fn(), onNext: vi.fn(), nextDisabled: true }));
    expect(markup).toContain('aria-label="Review 기간 이동"');
    expect(markup).toContain('aria-label="이전 달 Review 보기"');
    expect(markup).toContain('aria-label="다음 달 Review 보기"');
    expect(markup).toContain('aria-live="polite"');
    expect(markup).toContain('disabled=""');
  });

  it("renders month-over-month completion, record, and time change labels", () => {
    const markup = renderToStaticMarkup(createElement(MonthlyChangeSummary, { comparison: { previous: { completedTaskCount: 2, recordCount: 6, totalMinutes: 30 }, change: { completedTaskCount: 4, recordCount: -1, totalMinutes: 155 } } }));
    expect(markup).toContain('aria-label="전월 대비 월간 변화"');
    expect(markup).toContain("전월 대비 +4개");
    expect(markup).toContain("전월 대비 -1개");
    expect(markup).toContain("전월 대비 +155분");
    expect(markup).toContain("변화는 관찰값이며 평가가 아닙니다.");
  });

  it("renders Project time changes with current and previous month values", () => {
    const markup = renderToStaticMarkup(createElement(ProjectTimeComparison, { items: [{ projectId: 1, title: "개인 OS", totalMinutes: 90, trackedTaskCount: 1, previousTotalMinutes: 30, previousTrackedTaskCount: 1, changeMinutes: 60 }, { projectId: 2, title: "학습", totalMinutes: 45, trackedTaskCount: 1, previousTotalMinutes: 60, previousTrackedTaskCount: 1, changeMinutes: -15 }] }));
    expect(markup).toContain('aria-label="Project별 전월 수행 시간 변화"');
    expect(markup).toContain('aria-label="개인 OS 전월 대비 +1시간"');
    expect(markup).toContain('aria-label="학습 전월 대비 -15분"');
    expect(markup).toContain("선택 월 1시간 30분 · 전월 30분");
  });

  it("renders completed Task drilldown with Project, Stage, duration, and next action", () => {
    const markup = renderToStaticMarkup(createElement(CompletedTaskDrilldown, { items: [{ id: 8, title: "Review 카드 구현", projectTitle: "개인 OS", stageTitle: "Review", nextAction: "변화 확인", completedAt: new Date("2026-08-03T10:30:00.000Z"), durationMinutes: 90, records: [{ id: 41, content: "완료 근거 기록", attachments: [{ id: 51, fileName: "review.png", url: "https://example.com/review.png", mimeType: "image/png" }, { id: 52, fileName: "review.pdf", url: "https://example.com/review.pdf", mimeType: "application/pdf" }, { id: 53, fileName: "notes.txt", url: "https://example.com/notes.txt", mimeType: "text/plain" }] }] }, { id: 9, title: "독립 정리", projectTitle: null, stageTitle: null, nextAction: null, completedAt: new Date("2026-08-04T11:00:00.000Z"), durationMinutes: null }] }));
    expect(markup).toContain('aria-label="선택 월 완료 Task 목록"');
    expect(markup).toContain('aria-label="완료 Task Project 필터"');
    expect(markup).toContain('aria-label="완료 Task Stage 필터"');
    expect(markup).toContain("전체 2개 중 2개 표시");
    expect(markup).toContain('aria-label="Review 카드 구현 개인 OS · Review 1시간 30분"');
    expect(markup).toContain("다음: 변화 확인");
    expect(markup).toContain("연결 기록 1개 · 첨부 3개");
    expect(markup).toContain("완료 근거 기록");
    expect(markup).toContain('aria-label="review.png 첨부 열기"');
    expect(markup).toContain('aria-label="review.png 이미지 미리보기"');
    expect(markup).toContain('aria-label="review.pdf PDF 미리보기"');
    expect(markup).toContain("원본 열기만 지원");
    expect(markup).toContain("독립 Task");
    expect(markup).toContain("수행 시간 미기록");
  });

  it("renders accessible Project time distribution bars", () => {
    const markup = renderToStaticMarkup(createElement(ProjectTimeDistribution, { items: [{ projectId: 1, title: "개인 OS", totalMinutes: 90, trackedTaskCount: 1, sharePercent: 67 }], unassignedDurationSummary: { totalMinutes: 20, trackedTaskCount: 1 } }));
    expect(markup).toContain('aria-label="Project별 월간 수행 시간 분포"');
    expect(markup).toContain('aria-label="개인 OS 시간 비중"');
    expect(markup).toContain('aria-valuenow="67"');
    expect(markup).toContain("1시간 30분");
    expect(markup).toContain("독립 Task 20분 · 1개는 Project 시간 분포에서 제외합니다.");
  });
});
