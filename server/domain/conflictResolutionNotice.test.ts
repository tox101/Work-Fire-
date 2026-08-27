import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ConflictResolutionNotice } from "../../client/src/components/ConflictResolutionNotice";

describe("ConflictResolutionNotice", () => {
  it("shows the server value, local proposal, and explicit conflict choices", () => {
    const markup = renderToStaticMarkup(createElement(ConflictResolutionNotice, {
      entityLabel: "Project",
      latest: "다른 기기 최신 제목",
      proposed: "내 기기 제목",
      onRetry: vi.fn(),
      onDismiss: vi.fn(),
    }));

    expect(markup).toContain('aria-label="Project 동기화 충돌"');
    expect(markup).toContain('role="alert"');
    expect(markup).toContain("다른 기기 최신 제목");
    expect(markup).toContain("내 기기 제목");
    expect(markup).toContain("내 변경 다시 적용");
    expect(markup).toContain("최신값 유지");
  });
});
