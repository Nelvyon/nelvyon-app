"use client";

import { useCallback, useEffect, useState } from "react";

import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { DashboardListShell, DashboardPageTransition, SkeletonList, SkeletonTable } from "@/features/dashboard/components/DashboardTabs";

import { Button } from "@/core/ui/button";
import { livechatApi } from "@/features/builders/api";
import type { ChatConversation } from "@/features/builders/types";

function formatTime(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

export default function LiveChatDashboard() {
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [messages, setMessages] = useState<{ id: string; content: string; sender_type: string; created_at: string }[]>([]);
  const [reply, setReply] = useState("");
  const [snippet, setSnippet] = useState("");

  const loadConversations = useCallback(async () => {
    setLoading(true);
    try {
    const res = await livechatApi.conversations();
    setConversations(res.items ?? []);
    } catch {
      /* preserved */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConversations().catch(() => setConversations([]));
    livechatApi
      .widgetConfig()
      .then((cfg) => {
        const id = (cfg.workspace_id as string) ?? "YOUR_WORKSPACE";
        setSnippet(
          `<script src="${typeof window !== "undefined" ? window.location.origin : ""}/widget/chat.js" data-workspace="${id}"></script>`,
        );
      })
      .catch(() => setSnippet('<script src="/widget/chat.js" data-workspace="YOUR_WORKSPACE"></script>'));
  }, [loadConversations]);

  useEffect(() => {
    const t = setInterval(() => {
      loadConversations().catch(() => undefined);
    }, 2000);
    return () => clearInterval(t);
  }, [loadConversations]);

  useEffect(() => {
    if (!selected) return;
    const load = () =>
      livechatApi
        .messages(selected)
        .then((r) => setMessages(r.items ?? []))
        .catch(() => setMessages([]));
    load();
    const t = setInterval(load, 2000);
    return () => clearInterval(t);
  }, [selected]);

  async function sendReply() {
    if (!selected || !reply.trim()) return;
    await livechatApi.send(selected, reply.trim());
    setReply("");
    const r = await livechatApi.messages(selected);
    setMessages(r.items ?? []);
  }

  const active = conversations.find((c) => c.id === selected);

  return (
    <ProtectedLayout module="os">
      <DashboardPageTransition>
        <div>
          <h1 className="text-2xl font-bold">Live Chat</h1>
          <p className="text-sm text-muted-foreground">Conversaciones en tiempo real con visitantes</p>
        </div>

        <div className="rounded-lg border bg-muted/30 p-4">
          <p className="mb-2 text-sm font-medium">Widget de instalación</p>
          <pre className="overflow-x-auto rounded bg-background p-3 text-xs">{snippet}</pre>
          <Button className="mt-2" onClick={() => navigator.clipboard.writeText(snippet)} size="sm" variant="outline">
            Copiar snippet
          </Button>
        </div>

        <div className="grid min-h-[480px] grid-cols-1 gap-4 lg:grid-cols-3">
          <aside className="rounded-lg border">
            <p className="border-b p-3 text-sm font-semibold">Conversaciones</p>
            <ul className="max-h-[420px] overflow-y-auto">
              {conversations.map((c) => (
                <li key={c.id}>
                  <button
                    className={`w-full border-b px-3 py-3 text-left text-sm hover:bg-muted ${selected === c.id ? "bg-muted" : ""}`}
                    onClick={() => setSelected(c.id)}
                    type="button"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{c.visitor_name ?? c.visitor_email ?? "Visitante"}</span>
                      {(c.unread_count ?? 0) > 0 ? (
                        <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">{c.unread_count}</span>
                      ) : null}
                    </div>
                    <span className="text-xs text-muted-foreground">{formatTime(c.last_message_at)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </aside>

          <section className="flex flex-col rounded-lg border lg:col-span-2">
            {selected ? (
              <>
                <p className="border-b p-3 font-medium">{active?.visitor_name ?? "Chat"}</p>
                <div className="flex-1 space-y-2 overflow-y-auto p-4">
                  {messages.map((m) => (
                    <div
                      className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${m.sender_type === "agent" ? "ml-auto bg-primary text-primary-foreground" : "bg-muted"}`}
                      key={m.id}
                    >
                      {m.content}
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 border-t p-3">
                  <input
                    className="flex-1 rounded-lg border px-3 py-2 text-sm"
                    onChange={(e) => setReply(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendReply()}
                    placeholder="Escribe una respuesta…"
                    value={reply}
                  />
                  <Button onClick={sendReply}>Enviar</Button>
                </div>
              </>
            ) : (
              <p className="flex flex-1 items-center justify-center text-sm text-muted-foreground">Selecciona una conversación</p>
            )}
          </section>
        </div>
      </DashboardPageTransition>
    </ProtectedLayout>
  );
}
