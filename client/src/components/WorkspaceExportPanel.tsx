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
  return (
    <div className="flex items-center gap-1.5">
      <button type="button" onClick={() => void save("markdown")} disabled={exportData.isFetching} className="pressable inline-flex h-8 items-center gap-1 rounded-lg bg-sky-700 px-2.5 text-xs font-bold text-white hover:bg-sky-800 disabled:opacity-50 shadow-2xs">
        <Download className="h-3 w-3" /> MD 백업
      </button>
      <button type="button" onClick={() => void save("csv")} disabled={exportData.isFetching} className="pressable inline-flex h-8 items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-50">
        <Download className="h-3 w-3" /> CSV 백업
      </button>
    </div>
  );
}
