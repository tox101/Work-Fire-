import { useAuth } from "@/_core/hooks/useAuth";
import { CapturePanel } from "@/components/CapturePanel";
import { startLogin } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import { trpc } from "@/lib/trpc";
import { Archive, BookOpen, CalendarDays, FolderKanban, LogOut, Plus, Search, SquareStack } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "./ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "./ui/sidebar";

const navigation = [
  { label: "Today", path: "/", icon: CalendarDays },
  { label: "Projects", path: "/projects", icon: FolderKanban },
  { label: "Records", path: "/records", icon: Search },
  { label: "Review", path: "/review", icon: SquareStack },
  { label: "Guide", path: "/guide", icon: BookOpen },
  { label: "Capture", path: "/capture", icon: Plus },
] as const;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { loading, user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const isMobile = useIsMobile();
  const [captureOpen, setCaptureOpen] = useState(false);

  if (loading) {
    return <div className="min-h-screen bg-[#f6f6f6] p-6"><div className="h-24 w-64 animate-pulse bg-neutral-300" /></div>;
  }

  if (!user) {
    return (
      <main className="grid min-h-screen place-items-center p-6">
        <section className="block-shadow w-full max-w-lg border border-violet-200 bg-white/90 p-7 sm:p-10">
          <p className="industrial-label mb-6 text-violet-400">Personal work system / 01</p>
          <h1 className="industrial-title text-4xl text-violet-950 sm:text-5xl">일정<br />열정</h1>
          <p className="mt-6 max-w-sm text-sm leading-6 text-violet-700">오늘의 다음 행동과 작업의 맥락을 한곳에 모읍니다.</p>
          <Button onClick={() => startLogin()} className="pressable mt-8 h-11 w-full rounded-xl bg-violet-500 text-sm font-bold text-white hover:bg-violet-600">시작하기</Button>
        </section>
      </main>
    );
  }

  return (
    <SidebarProvider>
      <Sidebar className="hidden border-r border-emerald-100 bg-[#eef5ef] text-violet-950 md:flex" collapsible="none">
        <SidebarHeader className="h-auto p-4">
          <button onClick={() => setLocation("/")} className="text-left outline-none focus-visible:ring-2 focus-visible:ring-white">
            <span className="industrial-label block text-violet-400">Personal work system</span>
            <span className="industrial-title mt-2 block text-2xl text-violet-950">일정<br />열정</span>
          </button>
        </SidebarHeader>
        <SidebarContent className="px-2 py-5">
          <SidebarMenu className="gap-1">
            {navigation.map(item => {
              const active = locationMatches(item.path, window.location.pathname);
              const Icon = item.icon;
              return (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    isActive={active}
                    onClick={() => item.path === "/capture" ? setCaptureOpen(true) : setLocation(item.path)}
                    className="h-10 rounded-lg px-3 text-sm font-bold text-violet-600 hover:bg-white hover:text-violet-950 data-[active=true]:bg-violet-500 data-[active=true]:text-white"
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="p-3">
          <div className="rounded-lg border border-violet-200 bg-white/70 p-3">
            <p className="truncate text-sm font-bold text-violet-950">{user.name || "내 작업 공간"}</p>
            <button onClick={logout} className="mt-2 flex items-center gap-2 text-xs text-violet-500 underline-offset-4 hover:text-violet-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500">
              <LogOut className="h-3.5 w-3.5" /> 로그아웃
            </button>
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="min-h-screen bg-transparent">
        <header className="sticky top-0 z-30 flex h-12 items-center justify-between border-b border-emerald-100 bg-[#f8fbf7]/95 px-4 backdrop-blur md:hidden">
          <button onClick={() => setLocation("/")} className="industrial-title text-xl text-violet-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500">일정열정</button>
          <span className="industrial-label text-violet-400">Today / 01</span>
        </header>
        <main className="mx-auto w-full max-w-7xl px-4 py-4 pb-20 sm:px-6 sm:py-6 md:pb-6">{children}</main>
        {isMobile && <MobileNavigation location={window.location.pathname} onNavigate={setLocation} onCapture={() => setCaptureOpen(true)} />}
        {captureOpen && <GlobalCaptureSheet onClose={() => setCaptureOpen(false)} />}
      </SidebarInset>
    </SidebarProvider>
  );
}

function locationMatches(path: string, location: string) {
  return path === "/" ? location === "/" : location.startsWith(path);
}

function MobileNavigation({ location, onNavigate, onCapture }: { location: string; onNavigate: (to: string) => void; onCapture: () => void }) {
  return (
    <nav aria-label="모바일 주요 메뉴" className="fixed inset-x-0 bottom-0 z-40 grid h-14 grid-cols-6 border-t border-violet-100 bg-white/95 text-violet-950 backdrop-blur md:hidden">
      {navigation.map(item => {
        const active = locationMatches(item.path, location);
        const Icon = item.icon;
        const primary = item.path === "/capture";
        const labelMap: Record<string, string> = {
          Today: "Today",
          Projects: "프로젝트",
          Records: "기록",
          Review: "회고",
          Guide: "설명서",
          Capture: "작성",
        };
        return (
          <button key={item.path} onClick={() => primary ? onCapture() : onNavigate(item.path)} className={`flex flex-col items-center justify-center gap-1 text-[10px] font-bold ${active && !primary ? "text-violet-600" : "text-violet-400 hover:text-violet-700"} ${primary ? "border-x border-violet-100" : ""}`}>
            {primary ? <span className="grid h-7 w-7 place-items-center rounded-full bg-violet-500 text-white shadow-sm"><Plus className="h-3.5 w-3.5" /></span> : <Icon className="h-3.5 w-3.5" />}
            <span>{labelMap[item.label] ?? item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function GlobalCaptureSheet({ onClose }: { onClose: () => void }) {
  const [day] = useState(() => {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end = new Date(start); end.setDate(end.getDate() + 1);
    return { start, end };
  });
  const workspace = trpc.workspace.overview.useQuery(day);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-violet-950/20 p-3 sm:p-6" role="presentation">
      <button onClick={onClose} className="absolute inset-0 cursor-default" aria-label="기록 시트 닫기" />
      <section role="dialog" aria-modal="true" aria-labelledby="global-capture-heading" className="relative mx-auto mt-[5vh] w-full max-w-xl outline-none">
        <div className="flex items-center justify-between rounded-t-xl bg-violet-500 px-4 py-2.5 text-white"><p id="global-capture-heading" className="industrial-label">Quick Capture</p><button onClick={onClose} className="text-xs font-bold underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">닫기 / Esc</button></div>
        {workspace.isLoading ? <div className="h-64 animate-pulse bg-neutral-200" /> : <CapturePanel workspace={workspace.data} onComplete={onClose} />}
      </section>
    </div>
  );
}
