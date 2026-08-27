import { describe, expect, it } from "vitest";
import { appendReviewMemoTaskQuote, formatReviewMemoTaskQuote } from "../../client/src/lib/reviewMemoQuote";

describe("review memo Task quote", () => {
  const task = { id: 1, title: "월간 회고 정리", projectTitle: "개인 OS", stageTitle: "Review", nextAction: "다음 달 우선순위 정하기" };

  it("keeps completed Task facts in an explicit quote block", () => {
    expect(formatReviewMemoTaskQuote(task)).toBe("> 완료 Task: 월간 회고 정리\n> 맥락: 개인 OS · Review\n> 다음 행동: 다음 달 우선순위 정하기");
  });

  it("appends a quote without mutating the existing memo content", () => {
    expect(appendReviewMemoTaskQuote("원래 회고 문장\n", task)).toBe("원래 회고 문장\n> 완료 Task: 월간 회고 정리\n> 맥락: 개인 OS · Review\n> 다음 행동: 다음 달 우선순위 정하기");
  });
});
