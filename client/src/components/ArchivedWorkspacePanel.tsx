type ArchivedItem = {
  id: number;
  title: string;
  revision: number;
  projectId?: number | null;
  stageId?: number | null;
  archiveHistory: { occurredAt: Date; note: string | null } | null;
};

type EntityType = "Project" | "Stage" | "Task";

export function ArchivedWorkspacePanel({ data, onRestore, busy }: {
  data: { projects: ArchivedItem[]; stages: ArchivedItem[]; tasks: ArchivedItem[] } | undefined;
  onRestore: (entityType: EntityType, item: ArchivedItem) => void;
  busy: boolean;
}) {
  const projects = data?.projects ?? [];
  const stages = data?.stages ?? [];
  const tasks = data?.tasks ?? [];
  if (!projects.length && !stages.length && !tasks.length) return null;

  const archivedProjectIds = new Set(projects.map(item => item.id));
  const archivedStageIds = new Set(stages.map(item => item.id));
  const formatHistory = (item: ArchivedItem, blocked: boolean) => {
    const date = item.archiveHistory ? new Intl.DateTimeFormat("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(item.archiveHistory.occurredAt) : "보관 이력";
    return `${date}${item.archiveHistory?.note ? ` · ${item.archiveHistory.note}` : ""}${blocked ? " · 상위 항목 먼저 복원" : ""}`;
  };
  const renderItem = (entityType: EntityType, item: ArchivedItem, blocked = false) => (
    <li key={`${entityType}-${item.id}`} className="flex flex-wrap items-center justify-between gap-2 border-t border-stone-100 py-2 first:border-t-0">
      <div className="min-w-0">
        <p className="truncate text-xs font-bold text-stone-800">{item.title}</p>
        <p className="mt-0.5 text-[11px] text-stone-500">{formatHistory(item, blocked)}</p>
      </div>
      <button type="button" onClick={() => onRestore(entityType, item)} disabled={busy || blocked} className="pressable shrink-0 rounded-lg border border-emerald-200 bg-white px-2.5 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-50 disabled:opacity-50">복원</button>
    </li>
  );

  return (
    <details className="rounded-2xl border border-stone-200 bg-stone-50/70 p-3 sm:p-4">
      <summary className="cursor-pointer list-none text-sm font-bold text-stone-800">보관함 <span className="text-stone-500">{projects.length + stages.length + tasks.length}</span></summary>
      <p className="mt-2 text-xs leading-5 text-stone-500">보관된 원본은 삭제되지 않았습니다. 상위 Project·Stage부터 순서대로 복원할 수 있습니다.</p>
      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        <section aria-label="보관된 Project"><h3 className="text-xs font-bold text-stone-700">Project</h3><ul className="mt-1">{projects.map(item => renderItem("Project", item))}</ul></section>
        <section aria-label="보관된 Stage"><h3 className="text-xs font-bold text-stone-700">Stage</h3><ul className="mt-1">{stages.map(item => renderItem("Stage", item, Boolean(item.projectId && archivedProjectIds.has(item.projectId))))}</ul></section>
        <section aria-label="보관된 Task"><h3 className="text-xs font-bold text-stone-700">Task</h3><ul className="mt-1">{tasks.map(item => renderItem("Task", item, Boolean((item.projectId && archivedProjectIds.has(item.projectId)) || (item.stageId && archivedStageIds.has(item.stageId)))))}</ul></section>
      </div>
    </details>
  );
}
