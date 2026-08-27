export type RecordTagUsageStat = {
  tag: string;
  usageCount: number;
  lastUsedAt: Date | string | null;
};

export function orderRecordTagUsageStats(stats: RecordTagUsageStat[]) {
  return [...stats].sort((left, right) => {
    const recentDifference = new Date(right.lastUsedAt ?? 0).getTime() - new Date(left.lastUsedAt ?? 0).getTime();
    if (recentDifference) return recentDifference;
    const usageDifference = right.usageCount - left.usageCount;
    return usageDifference || left.tag.localeCompare(right.tag, "ko");
  });
}
