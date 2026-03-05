"use client";

import { useEffect, useRef, useState } from "react";

type Room = { id: string; name: string };
type Message = {
  id: number;
  room_id: string;
  user_id: string;
  username: string;
  content: string | null;
  image_url: string | null;
  created_at: string;
};

function cls(...s: Array<string | false | null | undefined>) {
  return s.filter(Boolean).join(" ");
}

export default function ChatPage() {
  const [token, setToken] = useState<string>("");
  const [me, setMe] = useState<{ id: string; username: string } | null>(null);

  const [rooms, setRooms] = useState<Room[]>([]);
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");

  const [online, setOnline] = useState<Array<{ user_id: string; username: string; last_seen: string }>>([]);

  const [newRoomName, setNewRoomName] = useState("");
  const [toast, setToast] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  const listRef = useRef<HTMLDivElement | null>(null);
  const lastIdRef = useRef<number>(0);

  // ✅ sempre retorna um tipo aceito por fetch (HeadersInit)
  const authHeaders = (): HeadersInit => {
    const h: Record<string, string> = {};
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  };

  function scrollToBottom() {
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
    });
  }

  useEffect(() => {
    const t = localStorage.getItem("token") || "";
    setToken(t);
    if (!t) window.location.href = "/";
  }, []);

  useEffect(() => {
    if (!token) return;

    fetch("/api/auth/me", { headers: authHeaders() })
      .then(async (r) => {
        if (!r.ok) throw new Error("Sessão inválida");
        return r.json();
      })
      .then((data) => setMe(data.user))
      .catch(() => (window.location.href = "/"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function loadRooms() {
    const res = await fetch("/api/rooms/list", { headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Erro ao listar salas");
    setRooms(data.rooms);
    if (!activeRoom && data.rooms?.[0]) setActiveRoom(data.rooms[0]);
  }

  async function loadMessages(roomId: string, afterId?: number) {
    const url = new URL("/api/messages/list", window.location.origin);
    url.searchParams.set("roomId", roomId);
    if (afterId) url.searchParams.set("afterId", String(afterId));

    const res = await fetch(url.toString(), { headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Erro ao buscar mensagens");

    const incoming: Message[] = data.messages || [];
    if (!incoming.length) return;

    setMessages((prev) => {
      const merged = afterId ? [...prev, ...incoming] : incoming;
      return merged;
    });

    const maxId = Math.max(...incoming.map((m) => m.id));
    lastIdRef.current = Math.max(lastIdRef.current, maxId);
    scrollToBottom();
  }

  async function pingPresence() {
    await fetch("/api/presence/ping", { method: "POST", headers: authHeaders() });
  }

  async function loadOnline() {
    const res = await fetch("/api/presence/list", { headers: authHeaders() });
    const data = await res.json();
    if (res.ok) setOnline(data.online || []);
  }

  useEffect(() => {
    if (!token) return;

    loadRooms().catch(() => {});
    pingPresence().catch(() => {});
    loadOnline().catch(() => {});

    const t1 = setInterval(() => pingPresence().catch(() => {}), 20_000);
    const t2 = setInterval(() => loadOnline().catch(() => {}), 10_000);
    return () => {
      clearInterval(t1);
      clearInterval(t2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (!activeRoom?.id) return;
    setMessages([]);
    lastIdRef.current = 0;
    loadMessages(activeRoom.id).catch(() => {});

    const poll = setInterval(() => {
      loadMessages(activeRoom.id, lastIdRef.current).catch(() => {});
    }, 1500);

    return () => clearInterval(poll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRoom?.id]);

  async function send() {
    const content = text.trim();
    if (!content || !activeRoom) return;

    setText("");

    const res = await fetch("/api/messages/send", {
      method: "POST",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ roomId: activeRoom.id, content })
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setToast({ type: "err", msg: data?.error || "Erro ao enviar" });
      return;
    }
    setToast(null);
  }

  async function createRoom() {
    const name = newRoomName.trim();
    if (name.length < 3) {
      setToast({ type: "err", msg: "Nome da sala inválido. Use letras/números e pelo menos 3 caracteres." });
      return;
    }

    const res = await fetch("/api/rooms/create", {
      method: "POST",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ name })
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setToast({ type: "err", msg: data?.error || "Erro ao criar sala" });
      return;
    }

    setNewRoomName("");
    setToast({ type: "ok", msg: "Sala criada!" });
    await loadRooms().catch(() => {});
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST", headers: authHeaders() }).catch(() => {});
    localStorage.removeItem("token");
    localStorage.removeItem("loggedUser");
    window.location.href = "/";
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
        {/* Sidebar */}
        <div className="bg-panel border border-border rounded-xl overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between gap-3">
            <div>
              <div className="text-sm text-muted">Logado como</div>
              <div className="font-semibold">{me?.username || "..."}</div>
            </div>
            <button
              className="text-sm bg-[#0f131a] border border-border rounded-lg px-3 py-2 hover:border-[rgba(88,166,255,.4)]"
              onClick={logout}
              type="button"
            >
              Sair
            </button>
          </div>

          <div className="p-4 border-b border-border">
            <div className="text-sm text-muted mb-2">Criar sala</div>
            <div className="flex gap-2">
              <input
                className="flex-1 bg-panel2 border border-border rounded-lg px-3 py-2 outline-none focus:border-primary"
                placeholder="ex: geral"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
              />
              <button
                className="bg-primary text-black font-semibold rounded-lg px-3 py-2"
                onClick={createRoom}
                type="button"
              >
                Criar
              </button>
            </div>
          </div>

          <div className="p-4">
            <div className="text-sm text-muted mb-2">Salas</div>
            <div className="space-y-2">
              {rooms.map((r) => (
                <button
                  key={r.id}
                  className={cls(
                    "w-full text-left px-3 py-2 rounded-lg border",
                    activeRoom?.id === r.id
                      ? "bg-[rgba(88,166,255,.10)] border-[rgba(88,166,255,.30)]"
                      : "bg-panel2 border-border hover:border-[rgba(88,166,255,.25)]"
                  )}
                  onClick={() => setActiveRoom(r)}
                  type="button"
                >
                  #{r.name}
                </button>
              ))}
              {!rooms.length && <div className="text-sm text-muted">Sem salas ainda.</div>}
            </div>
          </div>

          <div className="p-4 border-t border-border">
            <div className="text-sm text-muted mb-2">Online</div>
            <div className="space-y-1">
              {online.map((u) => (
                <div key={u.user_id} className="flex items-center justify-between text-sm">
                  <span className="font-medium">{u.username}</span>
                  <span className="text-xs text-muted">agora</span>
                </div>
              ))}
              {!online.length && <div className="text-sm text-muted">ninguém online</div>}
            </div>
          </div>
        </div>

        {/* Chat */}
        <div className="bg-panel border border-border rounded-xl overflow-hidden flex flex-col min-h-[70vh]">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div>
              <div className="text-sm text-muted">Sala</div>
              <div className="font-semibold">{activeRoom ? `#${activeRoom.name}` : "..."}</div>
            </div>
          </div>

          <div ref={listRef} className="flex-1 p-4 overflow-auto space-y-3">
            {messages.map((m) => (
              <div key={m.id} className="flex flex-col">
                <div className="text-xs text-muted">
                  <span className="font-semibold text-text">{m.username}</span>{" "}
                  <span>• {new Date(m.created_at).toLocaleString("pt-BR")}</span>
                </div>
                {m.content && (
                  <div className="mt-1 inline-block bg-panel2 border border-border rounded-xl px-3 py-2 max-w-[85%]">
                    {m.content}
                  </div>
                )}
                {m.image_url && (
                  <a
                    href={m.image_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-block text-primary hover:underline text-sm"
                  >
                    imagem
                  </a>
                )}
              </div>
            ))}
            {!messages.length && <div className="text-sm text-muted">Sem mensagens ainda. Manda a primeira 🙂</div>}
          </div>

          <div className="p-4 border-t border-border">
            {toast && (
              <div
                className={cls(
                  "mb-3 text-sm rounded-lg border px-3 py-2",
                  toast.type === "ok"
                    ? "border-[rgba(46,160,67,.35)] bg-[rgba(46,160,67,.12)] text-[#a7f3b3]"
                    : "border-[rgba(248,81,73,.35)] bg-[rgba(248,81,73,.12)] text-[#ffb4ae]"
                )}
              >
                {toast.msg}
              </div>
            )}

            <div className="flex gap-2">
              <input
                className="flex-1 bg-panel2 border border-border rounded-lg px-3 py-3 outline-none focus:border-primary"
                placeholder="Escreva uma mensagem..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") send();
                }}
              />
              <button
                className="bg-primary text-black font-semibold rounded-lg px-5 py-3"
                onClick={send}
                type="button"
              >
                Enviar
              </button>
            </div>

            <div className="mt-2 text-xs text-muted">Enter envia • Polling leve (1.5s) no Vercel</div>
          </div>
        </div>
      </div>
    </div>
  );
}
