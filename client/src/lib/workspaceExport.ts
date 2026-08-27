type Project = { id: number; title: string; description: string | null; status: string; createdAt: Date };
type Stage = { id: number; projectId: number; title: string; status: string; createdAt: Date };
type Task = { id: number; projectId: number | null; stageId: number | null; title: string; detail: string | null; nextAction: string | null; status: string; priority: string; createdAt: Date };
type RecordItem = { id: number; projectId: number | null; stageId: number | null; taskId: number | null; content: string; sourceType: string; recordKind: string; isPinned: boolean; createdAt: Date; tags: string[] };
export type WorkspaceExportData = { exportedAt: Date; projects: Project[]; stages: Stage[]; tasks: Task[]; records: RecordItem[] };

const dateText = (value: Date) => new Date(value).toISOString();
const csvCell = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
function fence(content: string) { const runs = content.match(/`+/g) ?? []; return "`".repeat(Math.max(3, ...runs.map(run => run.length + 1))); }

export function formatWorkspaceMarkdown(data: WorkspaceExportData) {
  const projectById = new Map(data.projects.map(item => [item.id, item.title])); const stageById = new Map(data.stages.map(item => [item.id, item.title])); const taskById = new Map(data.tasks.map(item => [item.id, item.title]));
  const projects = data.projects.map(item => `### ${item.title}\n\n- 상태: ${item.status}\n- 생성: ${dateText(item.createdAt)}${item.description ? `\n\n${item.description}` : ""}`).join("\n\n") || "기록 없음";
  const stages = data.stages.map(item => `- ${item.title} · ${projectById.get(item.projectId) ?? "연결 Project 없음"} · ${item.status}`).join("\n") || "기록 없음";
  const tasks = data.tasks.map(item => `### ${item.title}\n\n- 상태: ${item.status}\n- Project: ${item.projectId ? projectById.get(item.projectId) ?? "연결 Project 없음" : "독립 Task"}\n- Stage: ${item.stageId ? stageById.get(item.stageId) ?? "연결 Stage 없음" : "없음"}\n- 다음 행동: ${item.nextAction ?? "없음"}${item.detail ? `\n\n${item.detail}` : ""}`).join("\n\n") || "기록 없음";
  const records = data.records.map(item => { const marker = fence(item.content); return `### Record ${item.id}\n\n- 생성: ${dateText(item.createdAt)}\n- 유형: ${item.sourceType}\n- Project: ${item.projectId ? projectById.get(item.projectId) ?? "연결 Project 없음" : "없음"}\n- Stage: ${item.stageId ? stageById.get(item.stageId) ?? "연결 Stage 없음" : "없음"}\n- Task: ${item.taskId ? taskById.get(item.taskId) ?? "연결 Task 없음" : "없음"}\n- 태그: ${item.tags.length ? item.tags.map(tag => `#${tag}`).join(" ") : "없음"}\n\n${marker}\n${item.content}\n${marker}`; }).join("\n\n") || "기록 없음";
  return `# 일정열정 데이터 내보내기\n\n- 생성 시각: ${dateText(data.exportedAt)}\n- 원문 Record는 아래 코드 블록에 변경 없이 보존했습니다.\n\n## Projects\n\n${projects}\n\n## Stages\n\n${stages}\n\n## Tasks\n\n${tasks}\n\n## Records\n\n${records}\n`;
}

export function formatRecordsCsv(data: WorkspaceExportData) {
  const projectById = new Map(data.projects.map(item => [item.id, item.title])); const stageById = new Map(data.stages.map(item => [item.id, item.title])); const taskById = new Map(data.tasks.map(item => [item.id, item.title]));
  const header = ["record_id", "created_at", "source_type", "project", "stage", "task", "tags", "is_pinned", "content"];
  const rows = data.records.map(item => [item.id, dateText(item.createdAt), item.sourceType, item.projectId ? projectById.get(item.projectId) : "", item.stageId ? stageById.get(item.stageId) : "", item.taskId ? taskById.get(item.taskId) : "", item.tags.join(" | "), item.isPinned, item.content].map(csvCell).join(","));
  return `\uFEFF${header.join(",")}\n${rows.join("\n")}\n`;
}

export function downloadWorkspaceExport(content: string, fileName: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type })); const anchor = document.createElement("a"); anchor.href = url; anchor.download = fileName; document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
}
