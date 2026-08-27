import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

export default function LocalLogin() {
  const [, navigate] = useLocation();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const login = trpc.auth.localLogin.useMutation({
    onSuccess: () => navigate("/"),
    onError: () => setError("비밀번호를 확인하세요."),
  });

  return <main className="min-h-screen bg-[#f7faf5] p-5 text-[#173b2a] sm:grid sm:place-items-center">
    <form className="mx-auto mt-20 w-full max-w-sm rounded-2xl border border-[#d5e6d9] bg-white p-5 shadow-sm sm:mt-0" onSubmit={event => { event.preventDefault(); setError(""); login.mutate({ password }); }}>
      <p className="text-xs font-bold tracking-[0.18em] text-[#659177]">PERSONAL WORK SYSTEM</p>
      <h1 className="mt-2 text-2xl font-black">일정열정 로그인</h1>
      <label className="mt-6 block text-sm font-bold" htmlFor="local-password">비밀번호</label>
      <input id="local-password" className="mt-2 w-full rounded-lg border border-[#bfd7c5] px-3 py-2" type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} required />
      {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
      <button className="pressable mt-4 w-full rounded-lg bg-[#3c8b5a] px-3 py-2 font-bold text-white disabled:opacity-60" type="submit" disabled={login.isPending}>{login.isPending ? "확인 중" : "로그인"}</button>
    </form>
  </main>;
}
