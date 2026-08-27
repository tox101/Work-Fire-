import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const queries = vi.hoisted(() => ({ overview: vi.fn(), recordSearch: vi.fn(), recordDetail: vi.fn(), recordTagOptions: vi.fn(), recordTagStats: vi.fn(), recentRecordTags: vi.fn(), savedRecordSearches: vi.fn() }));

vi.mock("../../client/src/lib/trpc", () => ({
  trpc: { useUtils: () => ({ workspace: { recordSearch: { invalidate: vi.fn() }, recordDetail: { invalidate: vi.fn() }, recordTagOptions: { invalidate: vi.fn() }, recordTagStats: { invalidate: vi.fn() }, recentRecordTags: { invalidate: vi.fn() }, savedRecordSearches: { invalidate: vi.fn() } } }), workspace: { overview: { useQuery: queries.overview }, recordSearch: { useQuery: queries.recordSearch }, recordDetail: { useQuery: queries.recordDetail }, recordTagOptions: { useQuery: queries.recordTagOptions }, recordTagStats: { useQuery: queries.recordTagStats }, recentRecordTags: { useQuery: queries.recentRecordTags }, savedRecordSearches: { useQuery: queries.savedRecordSearches }, createSavedRecordSearch: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) }, deleteSavedRecordSearch: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) }, moveSavedRecordSearch: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) }, setRecordPinned: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) }, addRecordTag: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) }, removeRecordTag: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) } } },
}));

import Records, { RecordDetailPanel } from "../../client/src/pages/Records";

describe("Records page accessibility", () => {
  beforeEach(() => {
    queries.overview.mockReturnValue({ data: { projects: [{ id: 1, title: "개인 OS" }], tasks: [{ id: 2, title: "Review 기록", projectId: 1 }] } });
    queries.recordSearch.mockReturnValue({ isLoading: false, error: null, data: [{ id: 3, content: "원문을 보존합니다.", sourceType: "capture", isPinned: false, createdAt: new Date("2026-08-26T01:00:00.000Z"), projectTitle: "개인 OS", stageTitle: "Review", taskTitle: "Review 기록", attachmentCount: 1, tags: ["회고"] }] });
    queries.recordDetail.mockReturnValue({ isLoading: false, error: null, data: null });
    queries.recordTagOptions.mockReturnValue({ data: ["회고"] });
    queries.recordTagStats.mockReturnValue({ isLoading: false, data: [{ tag: "회고", usageCount: 2, lastUsedAt: new Date("2026-08-26T01:00:00.000Z") }] });
    queries.recentRecordTags.mockReturnValue({ data: ["회의", "회고"] });
    queries.savedRecordSearches.mockReturnValue({ isLoading: false, data: [{ id: 8, name: "이번 달 회고", query: null, projectId: null, taskId: null, sourceType: null, period: "month", sort: "newest", tag: "회고" }] });
  });

  it("renders search, connection, type, period controls and an announced result count", () => {
    const markup = renderToStaticMarkup(createElement(Records));
    expect(markup).toContain('aria-label="Record 원문 검색"');
    expect(markup).toContain('aria-label="Record Project 필터"');
    expect(markup).toContain('aria-label="Record Task 필터"');
    expect(markup).toContain('aria-label="Record 유형 필터"');
    expect(markup).toContain('aria-label="Record 기간 필터"');
    expect(markup).toContain('aria-label="Record 정렬"');
    expect(markup).toContain('aria-label="Record 태그 필터"');
    expect(markup).toContain('aria-label="Record 태그 사용 현황"');
    expect(markup).toContain('aria-label="최근 사용순, 사용 횟수"');
    expect(markup).toContain('aria-label="회고 태그 2회로 검색"');
    expect(markup).toContain('aria-label="저장된 Record 검색"');
    expect(markup).toContain('aria-label="저장 검색 이름"');
    expect(markup).toContain('aria-label="이번 달 회고 검색 조건 적용"');
    expect(markup).toContain('aria-label="이번 달 회고 저장 검색 삭제"');
    expect(markup).toContain('aria-label="이번 달 회고 저장 검색 위로 이동"');
    expect(markup).toContain('aria-label="이번 달 회고 저장 검색 아래로 이동"');
    expect(markup).toContain('aria-live="polite"');
    expect(markup).toContain("원문을 보존합니다.");
    expect(markup).toContain("첨부 1개");
    expect(markup).toContain("고정");
    expect(markup).toContain("#회고");
  });

  it("describes an empty result without changing the original Record", () => {
    queries.recordSearch.mockReturnValue({ isLoading: false, error: null, data: [] });
    const markup = renderToStaticMarkup(createElement(Records));
    expect(markup).toContain("조건에 맞는 Record가 없습니다.");
  });

  it("renders preserved source text, connected context, and safe Attachment controls in Record detail", () => {
    const markup = renderToStaticMarkup(createElement(RecordDetailPanel, { loading: false, error: false, onClose: vi.fn(), onAddTag: vi.fn(), onRemoveTag: vi.fn(), tagsPending: false, recentTags: ["회의", "회고"], record: { id: 3, content: "줄바꿈을 포함한\n원문", sourceType: "capture", recordKind: "captured", createdAt: new Date("2026-08-26T01:00:00.000Z"), updatedAt: new Date("2026-08-26T01:00:00.000Z"), projectTitle: "개인 OS", stageTitle: "Review", taskTitle: "Review 기록", tags: ["회고"], attachments: [{ id: 9, fileName: "review.png", url: "https://storage.example/review.png", mimeType: "image/png", size: 2048, capturedAt: new Date("2026-08-26T01:00:00.000Z") }] } }));
    expect(markup).toContain('aria-label="Record 상세"');
    expect(markup).toContain('aria-label="보존된 Record 원문"');
    expect(markup).toContain("줄바꿈을 포함한\n원문");
    expect(markup).toContain("개인 OS");
    expect(markup).toContain('aria-label="review.png 원본 열기"');
    expect(markup).toContain('aria-label="review.png 이미지 미리보기"');
    expect(markup).toContain('aria-label="Record 태그 입력"');
    expect(markup).toContain('aria-label="회고 태그 제거"');
    expect(markup).toContain('aria-label="최근 사용한 Record 태그"');
    expect(markup).toContain('aria-label="회의 빠른 태그 추가"');
    expect(markup).not.toContain('aria-label="회고 빠른 태그 추가"');
  });
});
