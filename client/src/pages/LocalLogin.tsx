import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { InstallAppPrompt } from "@/components/InstallAppPrompt";

export default function LocalLogin() {
  const [, navigate] = useLocation();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const login = trpc.auth.localLogin.useMutation({
    onSuccess: () => navigate("/"),
    onError: error => setError(error.message || "로그인에 실패했습니다."),
  });

  return <>
    <main className="login-page">
      <form className="login-card" onSubmit={event => { event.preventDefault(); setError(""); login.mutate({ password }); }}>
        <div className="login-brand">PERSONAL WORK SYSTEM</div>
        <h1 className="login-title">일정열정 로그인</h1>
        <p className="login-description">계속하려면 비밀번호를 입력하세요.</p>
        <label className="login-label" htmlFor="local-password">비밀번호</label>
        <input id="local-password" className="login-input" type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} required />
        {error && <p role="alert" className="login-error">{error}</p>}
        <button className="login-button pressable" type="submit" disabled={login.isPending}>{login.isPending ? "확인 중" : "로그인"}</button>
      </form>
    </main>
    <InstallAppPrompt />
  </>;
}
