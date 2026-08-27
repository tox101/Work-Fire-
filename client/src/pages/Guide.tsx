import { BookOpen, CalendarDays, CheckCircle2, ChevronRight, Compass, FolderKanban, Lightbulb, Plus, Search, ShieldCheck, Smartphone, Sparkles, SquareStack } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

export default function Guide() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"workflow" | "pages" | "tips">("workflow");

  return (
    <div className="space-y-6">
      {/* 헤더 섹션 */}
      <header className="rounded-2xl border border-emerald-100 bg-white/80 p-6 shadow-sm backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-700">
              <BookOpen className="h-4 w-4" />
              <span>사용 설명서 및 시스템 가이드</span>
            </div>
            <h1 className="mt-1 text-2xl font-black text-slate-800 sm:text-3xl">
              일정열정 100% 활용 가이드
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              장기적인 목표를 잊지 않으면서, 오늘의 작은 실행을 자연스럽게 이어가는 방법입니다.
            </p>
          </div>
          <button
            onClick={() => setLocation("/")}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition-all hover:bg-emerald-700 hover:shadow"
          >
            <span>Today로 돌아가기</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* 탭 네비게이션 */}
        <div className="mt-6 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
          <button
            onClick={() => setActiveTab("workflow")}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-colors ${
              activeTab === "workflow"
                ? "bg-emerald-100 text-emerald-800"
                : "bg-slate-50 text-slate-600 hover:bg-slate-100"
            }`}
          >
            1. 핵심 작업 흐름
          </button>
          <button
            onClick={() => setActiveTab("pages")}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-colors ${
              activeTab === "pages"
                ? "bg-emerald-100 text-emerald-800"
                : "bg-slate-50 text-slate-600 hover:bg-slate-100"
            }`}
          >
            2. 주요 화면별 기능 안내
          </button>
          <button
            onClick={() => setActiveTab("tips")}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-colors ${
              activeTab === "tips"
                ? "bg-emerald-100 text-emerald-800"
                : "bg-slate-50 text-slate-600 hover:bg-slate-100"
            }`}
          >
            3. 모바일 접속 및 꿀팁
          </button>
        </div>
      </header>

      {/* 탭 1: 핵심 작업 흐름 */}
      {activeTab === "workflow" && (
        <div className="space-y-6">
          {/* 핵심 철학 배너 */}
          <div className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50/70 to-teal-50/50 p-5">
            <div className="flex items-start gap-3">
              <Sparkles className="mt-0.5 h-5 w-5 text-emerald-600" />
              <div>
                <h2 className="text-sm font-bold text-emerald-900">가장 중요한 제품 철학</h2>
                <p className="mt-1 text-sm leading-relaxed text-emerald-800">
                  <strong className="underline decoration-emerald-400 decoration-2">
                    "복잡한 맥락은 시스템이 기억하고, 사용자는 지금 필요한 것만 본다."
                  </strong>
                  <br />
                  앱을 켰을 때 <em>"지금 무엇을 해야 하지?", "어제 어디까지 했지?"</em>를 바로 알고 즉시 몰입할 수 있도록 설계되었습니다.
                </p>
              </div>
            </div>
          </div>

          {/* 단계별 플로우 */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-xs font-black text-emerald-700">
                01
              </div>
              <h3 className="mt-3 text-base font-bold text-slate-800">프로젝트 정의</h3>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                <strong>Project → Stage → Task</strong>의 3단계로 목표를 구체적인 행동 단위로 나눕니다.
              </p>
              <div className="mt-3 rounded-lg bg-slate-50 p-2.5 text-[11px] text-slate-600">
                예: 게임 제작 → 전투 시스템 → 피격 효과 구현
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-xs font-black text-emerald-700">
                02
              </div>
              <h3 className="mt-3 text-base font-bold text-slate-800">Today 실행</h3>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Today 화면에서 오늘 할 일과 <strong>NOW/Continue</strong> 카드로 직전 작업 맥락을 확인하고 시작합니다.
              </p>
              <div className="mt-3 rounded-lg bg-slate-50 p-2.5 text-[11px] text-slate-600">
                여러 프로젝트의 일정이 오늘 하루 타임라인에 모입니다.
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-xs font-black text-emerald-700">
                03
              </div>
              <h3 className="mt-3 text-base font-bold text-slate-800">작업 & 빠른 기록</h3>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                일하면서 떠오른 생각, 문제 해결, 사진, 링크를 <strong>+ Capture</strong> 버튼으로 부담 없이 남깁니다.
              </p>
              <div className="mt-3 rounded-lg bg-slate-50 p-2.5 text-[11px] text-slate-600">
                프로젝트를 즉시 연결하지 않아도 일단 안전하게 저장됩니다.
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-xs font-black text-emerald-700">
                04
              </div>
              <h3 className="mt-3 text-base font-bold text-slate-800">완료 & 회고</h3>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                작업을 완료하면 변경 이력이 남고, <strong>Review</strong> 탭에서 주간/월간 성과와 시간 분포를 확인합니다.
              </p>
              <div className="mt-3 rounded-lg bg-slate-50 p-2.5 text-[11px] text-slate-600">
                하루의 작은 실행이 프로젝트의 진척으로 연결됩니다.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 탭 2: 주요 화면별 기능 안내 */}
      {activeTab === "pages" && (
        <div className="grid gap-4 md:grid-cols-2">
          {/* Today */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-50 text-emerald-600">
                <CalendarDays className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">Today (오늘의 실행)</h3>
                <p className="text-xs text-slate-400">매일 가장 먼저 만나는 메인 화면</p>
              </div>
            </div>
            <ul className="mt-4 space-y-2 text-xs text-slate-600">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span><strong>NOW / Continue</strong>: 어제 중단했던 작업과 마지막 기록, 다음 행동을 바로 복원하여 보여줍니다.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span><strong>오늘의 타임라인</strong>: 여러 프로젝트에 속한 일정들을 시간순으로 한눈에 보고 완료/진행 처리할 수 있습니다.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span><strong>고정된 기록 요약</strong>: 중요하게 표시(Pin)해둔 메모와 주간 완료 현황을 요약해서 보여줍니다.</span>
              </li>
            </ul>
          </div>

          {/* Projects */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-50 text-indigo-600">
                <FolderKanban className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">Projects (프로젝트 관리)</h3>
                <p className="text-xs text-slate-400">장기 목표와 구조를 설계하는 공간</p>
              </div>
            </div>
            <ul className="mt-4 space-y-2 text-xs text-slate-600">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-indigo-600 shrink-0" />
                <span><strong>단계적 구조화</strong>: Project 생성 후 내부 단계(Stage)와 실행 할 일(Task)을 계층형으로 관리합니다.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-indigo-600 shrink-0" />
                <span><strong>다음 Stage 가이드</strong>: 현재 Stage가 완료되면 다음으로 넘어가야 할 권장 행동을 카드로 제시합니다.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-indigo-600 shrink-0" />
                <span><strong>보관 및 복원</strong>: 완료되거나 보류된 프로젝트는 아카이브 보관함으로 깔끔하게 정리할 수 있습니다.</span>
              </li>
            </ul>
          </div>

          {/* Capture */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-50 text-emerald-600">
                <Plus className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">Capture (빠른 기록 패널)</h3>
                <p className="text-xs text-slate-400">어디서나 열리는 전역 퀵 캡처</p>
              </div>
            </div>
            <ul className="mt-4 space-y-2 text-xs text-slate-600">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span><strong>다양한 형식 지원</strong>: 짧은 메모, 긴 일기, 웹 링크, 사진/파일 첨부를 즉시 드래그 앤 드롭으로 업로드합니다.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span><strong>부담 없는 저장</strong>: 프로젝트/태스크를 굳이 고르지 않아도 즉시 저장되며, 나중에 분류할 수 있습니다.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span><strong>임시 저장 보호</strong>: 작성 중 창을 닫아도 로컬 캐시에 보존되어 내용이 유실되지 않습니다.</span>
              </li>
            </ul>
          </div>

          {/* Records & Review */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-amber-50 text-amber-600">
                <SquareStack className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">Records & Review (검색 및 회고)</h3>
                <p className="text-xs text-slate-400">나의 생각과 기록을 자산으로 축적</p>
              </div>
            </div>
            <ul className="mt-4 space-y-2 text-xs text-slate-600">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-amber-600 shrink-0" />
                <span><strong>Records 검색/태그</strong>: 태그별 모아보기, 사용자 지정 검색 조건 저장, 오래된순/최신순 정렬을 지원합니다.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-amber-600 shrink-0" />
                <span><strong>월간 Review</strong>: 한 달간 수행한 작업 시간 분포, 완료 Task 드릴다운, 월간 회고록 작성을 지원합니다.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-amber-600 shrink-0" />
                <span><strong>내보내기 (Export)</strong>: Markdown 문서 및 CSV 형태로 내 데이터를 언제든 컴퓨터로 내보낼 수 있습니다.</span>
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* 탭 3: 모바일 접속 및 꿀팁 */}
      {activeTab === "tips" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 font-bold text-slate-800">
              <Smartphone className="h-4 w-4 text-emerald-600" />
              <span>스마트폰 / 태블릿에서 접속하는 방법 (PWA 지원)</span>
            </div>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              PC와 동일한 Wi-Fi(공유기)에 스마트폰을 연결한 후, 스마트폰 브라우저에서 아래 주소로 접속하시면 앱처럼 사용하실 수 있습니다:
            </p>
            <div className="mt-3 rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs font-mono text-slate-800">
              http://[내_PC의_IP_주소]:3000
            </div>
            <div className="mt-3 flex items-start gap-2 text-xs text-slate-500">
              <Lightbulb className="mt-0.5 h-3.5 w-3.5 text-amber-500 shrink-0" />
              <span>
                모바일 브라우저(Safari 또는 Chrome) 메뉴에서 <strong>[홈 화면에 추가]</strong>를 누르면 일반 앱처럼 홈 화면 아이콘으로 편리하게 쓰실 수 있습니다.
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 font-bold text-slate-800">
              <ShieldCheck className="h-4 w-4 text-indigo-600" />
              <span>데이터 안전 및 백업 안내</span>
            </div>
            <ul className="mt-3 space-y-2 text-xs text-slate-600">
              <li>• 모든 데이터는 사용자 PC의 Docker 내부 MySQL 데이터베이스와 업로드 폴더에 안전하게 100% 로컬 저장됩니다.</li>
              <li>• 외부 유료 클라우드에 데이터를 전송하지 않으므로 개인정보와 업무 기밀이 완벽하게 보호됩니다.</li>
              <li>• Records 화면 우측의 [내보내기] 기능을 통해 주기적으로 Markdown / CSV 백업본을 저장해 두실 수 있습니다.</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
