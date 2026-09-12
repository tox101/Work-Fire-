import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import { CalendarDays, FolderKanban, LogOut, Search } from "lucide-react";
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
] as const;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { loading, user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const isMobile = useIsMobile();

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
                    onClick={() => setLocation(item.path)}
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
        <main className="mx-auto w-full max-w-6xl px-2 py-1 sm:px-4 sm:py-3 pb-20 md:pb-4">{children}</main>
        {isMobile && <MobileNavigation location={window.location.pathname} onNavigate={setLocation} />}
      </SidebarInset>
    </SidebarProvider>
  );
}

function locationMatches(path: string, location: string) {
  return path === "/" ? location === "/" : location.startsWith(path);
}

function MobileNavigation({ location, onNavigate }: { location: string; onNavigate: (to: string) => void }) {
  return (
    <nav aria-label="모바일 주요 메뉴" className="fixed inset-x-0 bottom-0 z-40 grid h-16 grid-cols-3 border-t border-emerald-100 bg-white/95 text-slate-900 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] backdrop-blur md:hidden">
      {navigation.map(item => {
        const active = locationMatches(item.path, location);
        const Icon = item.icon;
        const labelMap: Record<string, string> = {
          Today: "Today",
          Projects: "프로젝트",
          Records: "기록",
          Review: "회고",
          Guide: "설명서",
        };
        return (
          <button key={item.path} onClick={() => onNavigate(item.path)} className={`flex flex-col items-center justify-center gap-1 text-[11px] font-bold transition-colors ${active ? "text-emerald-700 font-extrabold" : "text-slate-500 hover:text-slate-900"}`}>
            <Icon className="h-4 w-4" />
            <span>{labelMap[item.label] ?? item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
