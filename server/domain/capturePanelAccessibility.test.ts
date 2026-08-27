import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const queries = vi.hoisted(() => ({ recentRecordTags: vi.fn(), recordTagOptions: vi.fn(), recentTagMergeOperations: vi.fn() }));

vi.mock("../../client/src/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ workspace: { overview: { invalidate: vi.fn() }, continue: { invalidate: vi.fn() }, recordSearch: { invalidate: vi.fn() }, recordTagOptions: { invalidate: vi.fn() }, recentRecordTags: { invalidate: vi.fn() }, recordTagStats: { invalidate: vi.fn() }, savedRecordSearches: { invalidate: vi.fn() }, recentTagMergeOperations: { invalidate: vi.fn() } } }),
    workspace: { recentRecordTags: { useQuery: queries.recentRecordTags }, recordTagOptions: { useQuery: queries.recordTagOptions }, recentTagMergeOperations: { useQuery: queries.recentTagMergeOperations }, captureRecord: { useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }) }, uploadAttachment: { useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }) }, mergeRecordTag: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) }, undoRecordTagMerge: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) } },
  },
}));

import { CapturePanel } from "../../client/src/components/CapturePanel";

describe("Capture Panel tag accessibility", () => {
  it("renders explicit tag input and recent-tag quick actions without changing the original input", () => {
    queries.recentRecordTags.mockReturnValue({ data: ["회의", "중요"] });
    queries.recordTagOptions.mockReturnValue({ data: ["회의", "중요"] });
    queries.recentTagMergeOperations.mockReturnValue({ data: [{ id: 1, sourceTag: "업무", targetTag: "일", recordChanges: [{ recordId: 3, mode: "renamed" }] }] });
    const markup = renderToStaticMarkup(createElement(CapturePanel, { workspace: { projects: [], stages: [], tasks: [] } }));

    expect(markup).toContain('aria-label="기록 내용"');
    expect(markup).toContain('aria-label="Capture 태그"');
    expect(markup).toContain('aria-label="Capture 태그 입력"');
    expect(markup).toContain('aria-label="최근 사용한 Capture 태그"');
    expect(markup).toContain('aria-label="회의 Capture 빠른 태그 추가"');
    expect(markup).toContain('aria-label="Record 태그 정리"');
    expect(markup).toContain('aria-label="병합할 원본 태그"');
    expect(markup).toContain('aria-label="병합할 대상 태그"');
    expect(markup).toContain('aria-label="최근 태그 병합"');
    expect(markup).toContain('aria-label="업무에서 일 태그 병합 되돌리기"');
  });
});
