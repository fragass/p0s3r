"use client";

import { useEffect, useMemo, useState } from "react";

type Mode = "login" | "register";

export default function HomePage() {
  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  const canSubmit = useMemo(() => username.trim().length >= 3 && password.length >= 4, [username, password]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    fetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.user?.username) window.location.href = "/chat";
      })
      .catch(() => {});
  }, []);

  async function submit() {
    if (!canSubmit || loading) return;

    setLoading(true);
    setToast(null);

    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setToast({ type: "err", msg: data?.error || "Erro inesperado." });
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("loggedUser", data.user.username);

      setToast({ type: "ok", msg: mode === "login" ? "Logado com sucesso!" : "Conta criada com sucesso!" });
      window.location.href = "/chat";
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-panel border border-border rounded-xl p-6 shadow-lg">
        <div className="flex items-center justify-between gap-3 mb-5">
          <h1 className="text-xl font-bold">
            {mode === "login" ? "Entrar" : "Criar conta"}
          </h1>
          <button
            className="text-sm text-primary hover:underline"
            onClick={() => setMode(mode === "login" ? "register" : "login")}
            type="button"
          >
            {mode === "login" ? "Criar conta" : "Já tenho conta"}
          </button>
        </div>

        <div className="space-y-3">
          <label className="block">
            <span className="text-sm text-muted">Usuário</span>
            <input
              className="mt-1 w-full bg-panel2 border border-border rounded-lg px-3 py-2 outline-none focus:border-primary"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="min. 3 caracteres (letras/números)"
              autoComplete="username"
            />
          </label>

          <label className="block">
            <span className="text-sm text-muted">Senha</span>
            <input
              className="mt-1 w-full bg-panel2 border border-border rounded-lg px-3 py-2 outline-none focus:border-primary"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="min. 4 caracteres"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </label>

          <button
            className="w-full bg-primary text-black font-semibold rounded-lg py-2 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={submit}
            disabled={!canSubmit || loading}
            type="button"
          >
            {loading ? "Processando..." : mode === "login" ? "Entrar" : "Criar conta"}
          </button>
        </div>

        {toast && (
          <div
            className={[
              "mt-4 text-sm rounded-lg border px-3 py-2",
              toast.type === "ok"
                ? "border-[rgba(46,160,67,.35)] bg-[rgba(46,160,67,.12)] text-[#a7f3b3]"
                : "border-[rgba(248,81,73,.35)] bg-[rgba(248,81,73,.12)] text-[#ffb4ae]"
            ].join(" ")}
          >
            {toast.msg}
          </div>
        )}

        <p className="mt-4 text-xs text-muted">
          Dica: usernames aceitam <b>letras/números</b> e precisam ter <b>3+</b> caracteres.
        </p>
      </div>
    </div>
  );
}
