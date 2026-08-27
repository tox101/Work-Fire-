export function startOfMonth(value: Date) {
  const month = new Date(value);
  month.setDate(1);
  month.setHours(0, 0, 0, 0);
  return month;
}

export function getMonthWindow(value: Date) {
  const start = startOfMonth(value);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);
  return { start, end };
}

export function shiftMonth(value: Date, amount: number) {
  const month = startOfMonth(value);
  month.setMonth(month.getMonth() + amount);
  return month;
}

export function isSameMonth(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth();
}

export function formatReviewMonth(value: Date) {
  return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long" }).format(value);
}
