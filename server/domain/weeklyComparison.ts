export type WeeklyCounts = {
  completedTaskCount: number;
  recordCount: number;
  completedScheduleCount: number;
};

export function getWeeklyChange(current: WeeklyCounts, previous: WeeklyCounts): WeeklyCounts {
  return {
    completedTaskCount: current.completedTaskCount - previous.completedTaskCount,
    recordCount: current.recordCount - previous.recordCount,
    completedScheduleCount: current.completedScheduleCount - previous.completedScheduleCount,
  };
}
