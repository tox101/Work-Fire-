import { trpc } from "@/lib/trpc";
import { shouldAnnounceWorkspaceSync, workspaceDataSignature } from "@/lib/workspaceSync";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export function WorkspaceSyncManager() {
  const utils = trpc.useUtils();
  const queryClient = useQueryClient();
  const [online, setOnline] = useState(() => typeof navigator === "undefined" || navigator.onLine);
  const latestWorkspace = useRef<string | null>(null);

  useEffect(() => {
    const getWorkspaceSignature = () => workspaceDataSignature(queryClient.getQueryCache().getAll().filter(query => JSON.stringify(query.queryKey).includes('"workspace","overview"')).map(query => query.state.data));
    const refreshWorkspace = async (announce = false) => {
      const before = latestWorkspace.current ?? getWorkspaceSignature();
      await Promise.all([
        utils.workspace.overview.invalidate(),
        utils.workspace.continue.invalidate(),
        utils.workspace.recordSearch.invalidate(),
        utils.workspace.pinnedRecordSummaries.invalidate(),
        utils.workspace.savedRecordSearches.invalidate(),
      ]);
      const after = getWorkspaceSignature();
      if (announce && shouldAnnounceWorkspaceSync(before, after)) toast.message("다른 기기의 변경을 반영했습니다.");
      latestWorkspace.current = after;
    };
    latestWorkspace.current = getWorkspaceSignature();
    const handleOnline = () => { setOnline(true); void refreshWorkspace(true); };
    const handleOffline = () => setOnline(false);
    const handleVisibility = () => { if (document.visibilityState === "visible" && navigator.onLine) void refreshWorkspace(true); };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [queryClient, utils.workspace.continue, utils.workspace.overview, utils.workspace.pinnedRecordSummaries, utils.workspace.recordSearch, utils.workspace.savedRecordSearches]);

  return online ? null : <p role="status" aria-live="polite" className="fixed inset-x-3 bottom-20 z-50 mx-auto max-w-md rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-center text-xs font-bold text-amber-900 shadow-sm md:bottom-4">오프라인입니다. 저장되지 않은 Capture는 이 기기에 보관됩니다.</p>;
}
