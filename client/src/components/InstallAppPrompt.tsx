import { Download } from "lucide-react";
import { useEffect, useState } from "react";

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

export function InstallAppPrompt() {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  useEffect(() => {
    const handlePrompt = (event: Event) => { event.preventDefault(); setPromptEvent(event as InstallPromptEvent); };
    setIsIos(/iphone|ipad|ipod/i.test(navigator.userAgent) && !window.matchMedia("(display-mode: standalone)").matches);
    window.addEventListener("beforeinstallprompt", handlePrompt);
    return () => window.removeEventListener("beforeinstallprompt", handlePrompt);
  }, []);
  if (!promptEvent && !isIos) return null;
  return <div role="status" className="fixed inset-x-3 bottom-3 z-40 mx-auto flex max-w-md items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-white/95 px-3 py-2 shadow-lg md:hidden"><p className="text-xs font-bold text-emerald-900">{isIos ? "공유 메뉴에서 ‘홈 화면에 추가’를 선택하세요." : "일정열정을 홈 화면에 설치할 수 있습니다."}</p>{promptEvent ? <button type="button" onClick={async () => { await promptEvent.prompt(); const choice = await promptEvent.userChoice; if (choice.outcome === "accepted") setPromptEvent(null); }} className="pressable inline-flex shrink-0 items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-bold text-white"><Download className="h-3.5 w-3.5" /> 설치</button> : null}</div>;
}
