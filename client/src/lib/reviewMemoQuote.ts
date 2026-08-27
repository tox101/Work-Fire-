export type ReviewMemoTaskQuote = {
  id: number;
  title: string;
  projectTitle: string | null;
  stageTitle: string | null;
  nextAction: string | null;
};

export function formatReviewMemoTaskQuote(task: ReviewMemoTaskQuote) {
  const context = [task.projectTitle, task.stageTitle].filter(Boolean).join(" · ");
  const lines = [`> 완료 Task: ${task.title}`];

  if (context) lines.push(`> 맥락: ${context}`);
  if (task.nextAction) lines.push(`> 다음 행동: ${task.nextAction}`);

  return lines.join("\n");
}

export function appendReviewMemoTaskQuote(memo: string, task: ReviewMemoTaskQuote) {
  const quote = formatReviewMemoTaskQuote(task);
  if (!memo) return quote;
  return `${memo}${memo.endsWith("\n") ? "" : "\n\n"}${quote}`;
}
