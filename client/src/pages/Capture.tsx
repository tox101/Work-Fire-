import { CapturePanel } from "@/components/CapturePanel";
import { trpc } from "@/lib/trpc";
import { useState } from "react";

function dayWindow() { const start = new Date(); start.setHours(0, 0, 0, 0); const end = new Date(start); end.setDate(end.getDate() + 1); return { start, end }; }

export default function Capture() {
  const [window] = useState(dayWindow);
  const overview = trpc.workspace.overview.useQuery(window);
  return <div className="grid gap-5 lg:grid-cols-[.78fr_1.22fr]"><header><p className="industrial-label text-violet-400">Capture / no forced sorting</p><h1 className="industrial-title mt-1 text-4xl text-violet-950 sm:text-5xl">일단<br />기록하세요.</h1><p className="mt-4 max-w-sm text-sm leading-5 text-violet-600">Project, Stage, Task 연결은 나중에도 가능합니다. 원문은 그대로 보존합니다.</p></header><CapturePanel workspace={overview.data} /></div>;
}
