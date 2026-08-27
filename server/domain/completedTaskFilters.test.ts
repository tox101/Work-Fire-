import { describe, expect, it } from "vitest";
import { ALL_COMPLETED_TASKS, filterCompletedTaskItems, getCompletedTaskFilterOptions, INDEPENDENT_TASKS } from "../../client/src/lib/completedTaskFilters";

const items = [
  { id: 1, projectTitle: "개인 OS", stageTitle: "Review" },
  { id: 2, projectTitle: "개인 OS", stageTitle: "Core" },
  { id: 3, projectTitle: "학습", stageTitle: "정리" },
  { id: 4, projectTitle: null, stageTitle: null },
];

describe("completed Task filters", () => {
  it("builds unique Project·Stage options including independent Tasks", () => {
    const options = getCompletedTaskFilterOptions(items);
    expect(options.projectOptions).toEqual([
      { value: ALL_COMPLETED_TASKS, label: "전체 Project" },
      { value: "개인 OS", label: "개인 OS" },
      { value: "학습", label: "학습" },
      { value: INDEPENDENT_TASKS, label: "독립 Task" },
    ]);
    expect(options.stageOptions).toEqual([
      { value: "개인 OS\u0000Core", label: "개인 OS · Core", projectValue: "개인 OS" },
      { value: "개인 OS\u0000Review", label: "개인 OS · Review", projectValue: "개인 OS" },
      { value: "학습\u0000정리", label: "학습 · 정리", projectValue: "학습" },
    ]);
  });

  it("filters by Project first and then by the exact Project·Stage pair", () => {
    expect(filterCompletedTaskItems(items, "개인 OS", ALL_COMPLETED_TASKS).map(item => item.id)).toEqual([1, 2]);
    expect(filterCompletedTaskItems(items, ALL_COMPLETED_TASKS, "개인 OS\u0000Review").map(item => item.id)).toEqual([1]);
    expect(filterCompletedTaskItems(items, INDEPENDENT_TASKS, ALL_COMPLETED_TASKS).map(item => item.id)).toEqual([4]);
  });
});
