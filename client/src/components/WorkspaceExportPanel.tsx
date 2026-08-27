import { Download } from "lucide-react";
import { toast } from "sonner";
import { downloadWorkspaceExport, formatRecordsCsv, formatWorkspaceMarkdown, WorkspaceExportData } from "@/lib/workspaceExport";
import { trpc } from "@/lib/trpc";

export function WorkspaceExportPanel() {
  const exportData = trpc.workspace.exportWorkspaceData.useQuery(undefined, { enabled: false });
  const save = async (format: "markdown" | "csv") => {
    const result = await exportData.refetch();
    if (!result.data) { toast.error("내보낼 데이터를 불러오지 못했습니다."); return; }
    const date = new Date().toISOString().slice(0, 10);
    if (format === "markdown") downloadWorkspaceExport(formatWorkspaceMarkdown(result.data as WorkspaceExportData), `일정열정-${date}.md`, "text/markdown;charset=utf-8");
    else downloadWorkspaceExport(formatRecordsCsv(result.data as WorkspaceExportData), `일정열정-records-${date}.csv`, "text/csv;charset=utf-8");
    toast.success(format === "markdown" ? "Markdown 내보내기를 준비했습니다." : "CSV 내보내기를 준비했습니다.");
  };
  return <section aria-label="데이터 내보내기" className="rounded-2xl border border-sky-100 bg-sky-50/55 p-3 sm:p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="industrial-label text-sky-600">Personal backup</p><h2 className="industrial-title mt-1 text-xl text-violet-950">데이터 내보내기</h2></div><p className="max-w-sm text-xs leading-5 text-violet-600">Project·Stage·Task·Record 원문을 현재 기기로 내려받습니다.</p></div><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => void save("markdown")} disabled={exportData.isFetching} className="pressable inline-flex h-9 items-center gap-1.5 rounded-lg bg-sky-600 px-3 text-xs font-bold text-white hover:bg-sky-700 disabled:opacity-50"><Download className="h-3.5 w-3.5" /> Markdown</button><button type="button" onClick={() => void save("csv")} disabled={exportData.isFetching} className="pressable inline-flex h-9 items-center gap-1.5 rounded-lg border border-sky-200 bg-white px-3 text-xs font-bold text-sky-800 hover:bg-sky-100 disabled:opacity-50"><Download className="h-3.5 w-3.5" /> Records CSV</button></div></section>;
}
