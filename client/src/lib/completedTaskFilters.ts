export type CompletedTaskFilterItem = {
  id: number;
  projectTitle: string | null;
  stageTitle: string | null;
};

export const ALL_COMPLETED_TASKS = "__all_completed_tasks";
export const INDEPENDENT_TASKS = "__independent_tasks";

export type StageFilterOption = { value: string; label: string; projectValue: string };

export function getCompletedTaskFilterOptions(items: CompletedTaskFilterItem[]) {
  const projectTitles = Array.from(new Set(items.map(item => item.projectTitle).filter((title): title is string => Boolean(title)))).sort((left, right) => left.localeCompare(right, "ko"));
  const projectOptions = [
    { value: ALL_COMPLETED_TASKS, label: "전체 Project" },
    ...projectTitles.map(title => ({ value: title, label: title })),
    ...(items.some(item => !item.projectTitle) ? [{ value: INDEPENDENT_TASKS, label: "독립 Task" }] : []),
  ];
  const stageOptions = Array.from(new Map(items.filter(item => item.stageTitle).map(item => {
    const projectValue = item.projectTitle ?? INDEPENDENT_TASKS;
    return [`${projectValue}\u0000${item.stageTitle}`, { value: `${projectValue}\u0000${item.stageTitle}`, label: item.projectTitle ? `${item.projectTitle} · ${item.stageTitle}` : item.stageTitle!, projectValue }];
  })).values()).sort((left, right) => left.label.localeCompare(right.label, "ko"));
  return { projectOptions, stageOptions };
}

export function filterCompletedTaskItems<T extends CompletedTaskFilterItem>(items: T[], projectFilter: string, stageFilter: string) {
  return items.filter(item => {
    const projectMatches = projectFilter === ALL_COMPLETED_TASKS || (projectFilter === INDEPENDENT_TASKS ? !item.projectTitle : item.projectTitle === projectFilter);
    if (!projectMatches) return false;
    if (stageFilter === ALL_COMPLETED_TASKS) return true;
    const [stageProject, stageTitle] = stageFilter.split("\u0000");
    const itemProject = item.projectTitle ?? INDEPENDENT_TASKS;
    return itemProject === stageProject && item.stageTitle === stageTitle;
  });
}
