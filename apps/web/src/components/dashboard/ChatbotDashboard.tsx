"use client";

import { useCallback, useEffect, useState } from "react";

import ChatbotWidget from "../chatbot/ChatbotWidget";
import type {
  ChatbotConfig,
  ChatbotConfigInput,
  ChatbotStats,
  ConversationSummary,
} from "@nelvyon/saas";

type Tab = "config" | "conversations" | "stats" | "embed";

export default function ChatbotDashboard() {
  const [tab, setTab] = useState<Tab>("config");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const [chatbot, setChatbot] = useState<ChatbotConfig | null>(null);
  const [form, setForm] = useState<ChatbotConfigInput>({
    name: "Asistente",
    greeting: "Hola, ¿en qué podemos ayudarte?",
    systemPrompt: "Eres un asistente amable de la empresa.",
    captureLeads: true,
    escalateKeywords: ["humano", "agente", "persona real"],
    primaryColor: "#6366f1",
    allowBooking: false,
    theme: "dark",
  });
  const [keywordDraft, setKeywordDraft] = useState("");

  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [stats, setStats] = useState<ChatbotStats | null>(null);
  const [snippet, setSnippet] = useState("");

  const loadConfig = useCallback(async () => {
    const res = await fetch("/api/saas/chatbot/config");
    if (!res.ok) return;
    const data = (await res.json()) as { chatbot: ChatbotConfig | null };
    setChatbot(data.chatbot);
    if (data.chatbot) {
      const c = data.chatbot;
      setForm({
        name: c.name,
        greeting: c.greeting,
        systemPrompt: c.systemPrompt,
        captureLeads: c.captureLeads,
        escalateKeywords: [...c.escalateKeywords],
        primaryColor: c.primaryColor,
        allowBooking: c.allowBooking,
        theme: c.theme ?? "dark",
      });
    }
  }, []);

  const loadConversations = useCallback(async () => {
    const res = await fetch("/api/saas/chatbot/conversations");
    if (!res.ok) throw new Error("fail");
    const data = (await res.json()) as { conversations: ConversationSummary[] };
    setConversations(data.conversations ?? []);
  }, []);

  const loadStats = useCallback(async () => {
    const res = await fetch("/api/saas/chatbot/stats");
    if (!res.ok) throw new Error("fail");
    const data = (await res.json()) as { stats: ChatbotStats };
    setStats(data.stats);
  }, []);

  const loadEmbed = useCallback(async (id: string) => {
    const res = await fetch(`/api/saas/chatbot/embed?chatbotId=${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error("fail");
    const data = (await res.json()) as { snippet: string };
    setSnippet(data.snippet ?? "");
  }, []);

  useEffect(() => {
    loadConfig().catch(() => setStatus("No se pudo cargar configuración"));
  }, [loadConfig]);

  useEffect(() => {
    if (tab === "conversations")
      loadConversations().catch(() => setStatus("No se pudieron cargar conversaciones"));
    if (tab === "stats") loadStats().catch(() => setStatus("No se pudieron cargar stats"));
    if (tab === "embed" && chatbot?.id) void loadEmbed(chatbot.id);
  }, [tab, chatbot?.id, loadConversations, loadStats, loadEmbed]);

  async function saveConfig(): Promise<void> {
    setLoading(true);
    setStatus("");
    try {
      const res = await fetch("/api/saas/chatbot/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("fail");
      const data = (await res.json()) as { chatbot: ChatbotConfig };
      setChatbot(data.chatbot);
      setStatus("Guardado");
      if (tab === "embed") await loadEmbed(data.chatbot.id);
    } catch {
      setStatus("Error al guardar");
    } finally {
      setLoading(false);
    }
  }

  function addKeyword(): void {
    const k = keywordDraft.trim().toLowerCase();
    if (!k || form.escalateKeywords.includes(k)) return;
    setForm((f: ChatbotConfigInput) => ({ ...f, escalateKeywords: [...f.escalateKeywords, k] }));
    setKeywordDraft("");
  }

  function removeKeyword(k: string): void {
    setForm((f: ChatbotConfigInput) => ({
      ...f,
      escalateKeywords: f.escalateKeywords.filter((x: string) => x !== k),
    }));
  }

  async function copySnippet(): Promise<void> {
    if (!snippet) return;
    await navigator.clipboard.writeText(snippet);
    setStatus("Código copiado");
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold text-white">Chatbot web embebido</h1>
          <p className="mt-2 text-sm text-slate-400">Widget IA 24/7, leads y escalación — sin Intercom.</p>
        </header>

        <div className="mb-6 flex flex-wrap gap-2 border-b border-slate-800 pb-3">
          {(
            [
              ["config", "Configuración"],
              ["conversations", "Conversaciones"],
              ["stats", "Stats"],
              ["embed", "Embed"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`rounded-lg px-4 py-2 text-sm font-medium ${
                tab === id ? "bg-indigo-600 text-white" : "bg-slate-900 text-slate-400 hover:bg-slate-800"
              }`}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>

        {status && <p className="mb-4 text-center text-sm text-slate-400">{status}</p>}

        {tab === "config" && (
          <div className="grid gap-10 lg:grid-cols-[1fr_340px]">
            <section className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/50 p-6">
              <label className="block text-sm">
                <span className="text-slate-400">Nombre del bot</span>
                <input
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </label>
              <label className="block text-sm">
                <span className="text-slate-400">Saludo</span>
                <input
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
                  value={form.greeting}
                  onChange={(e) => setForm((f: ChatbotConfigInput) => ({ ...f, greeting: e.target.value }))}
                />
              </label>
              <label className="block text-sm">
                <span className="text-slate-400">System prompt</span>
                <textarea
                  className="mt-1 min-h-[120px] w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
                  value={form.systemPrompt}
                  onChange={(e) => setForm((f: ChatbotConfigInput) => ({ ...f, systemPrompt: e.target.value }))}
                />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.captureLeads}
                  onChange={(e) => setForm((f: ChatbotConfigInput) => ({ ...f, captureLeads: e.target.checked }))}
                  className="rounded border-slate-600"
                />
                Capturar leads (email en mensaje)
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.allowBooking}
                  onChange={(e) => setForm((f: ChatbotConfigInput) => ({ ...f, allowBooking: e.target.checked }))}
                  className="rounded border-slate-600"
                />
                Permitir agendar citas (en prompt)
              </label>
              <div>
                <span className="text-sm text-slate-400">Keywords escalada</span>
                <div className="mt-2 flex gap-2">
                  <input
                    className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                    value={keywordDraft}
                    onChange={(e) => setKeywordDraft(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addKeyword())}
                    placeholder="humano, agente…"
                  />
                  <button
                    type="button"
                    className="rounded-lg bg-slate-800 px-3 py-2 text-sm"
                    onClick={addKeyword}
                  >
                    Añadir
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {form.escalateKeywords.map((k: string) => (
                    <button
                      key={k}
                      type="button"
                      className="rounded-full border border-slate-600 bg-slate-800 px-3 py-1 text-xs"
                      onClick={() => removeKeyword(k)}
                    >
                      {k} ×
                    </button>
                  ))}
                </div>
              </div>
              <label className="block text-sm">
                <span className="text-slate-400">Color primario</span>
                <div className="mt-1 flex items-center gap-3">
                  <input
                    type="color"
                    className="h-10 w-14 cursor-pointer rounded border border-slate-600 bg-transparent"
                    value={form.primaryColor}
                    onChange={(e) => setForm((f: ChatbotConfigInput) => ({ ...f, primaryColor: e.target.value }))}
                  />
                  <input
                    className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-sm"
                    value={form.primaryColor}
                    onChange={(e) => setForm((f: ChatbotConfigInput) => ({ ...f, primaryColor: e.target.value }))}
                  />
                </div>
              </label>
              <label className="block text-sm">
                <span className="text-slate-400">Tema widget preview</span>
                <select
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
                  value={form.theme}
                  onChange={(e) =>
                    setForm((f: ChatbotConfigInput) => ({
                      ...f,
                      theme: e.target.value === "light" ? "light" : "dark",
                    }))
                  }
                >
                  <option value="dark">Oscuro</option>
                  <option value="light">Claro</option>
                </select>
              </label>
              <button
                type="button"
                disabled={loading}
                className="w-full rounded-lg bg-indigo-600 py-3 text-sm font-semibold text-white disabled:opacity-50"
                onClick={() => void saveConfig()}
              >
                Guardar configuración
              </button>
            </section>
            <div>
              <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-slate-500">Preview en vivo</h2>
              <div
                className={`relative min-h-[420px] overflow-hidden rounded-xl border border-slate-800 ${
                  form.theme === "light" ? "bg-slate-100" : "bg-slate-950"
                }`}
              >
                {chatbot?.id ? (
                  <ChatbotWidget
                    chatbotId={chatbot.id}
                    primaryColor={form.primaryColor}
                    theme={form.theme}
                    greeting={form.greeting}
                    botName={form.name}
                  />
                ) : (
                  <p className="p-6 text-sm text-slate-500">Guarda la configuración para obtener el widget con ID.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {tab === "conversations" && (
          <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
            <ul className="space-y-3">
              {conversations.length === 0 ? (
                <li className="text-sm text-slate-500">Aún no hay conversaciones.</li>
              ) : (
                conversations.map((c) => (
                  <li
                    key={c.id}
                    className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-sm"
                  >
                    <div>
                      <p className="text-xs text-slate-500">{new Date(c.createdAt).toLocaleString()}</p>
                      <p className="mt-1 text-slate-300">{c.preview || "(sin mensajes)"}</p>
                      <p className="text-xs text-slate-600">Sesión: {c.sessionId.slice(0, 12)}…</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {c.hasLead && (
                        <span className="rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-300">
                          Lead
                        </span>
                      )}
                      {c.escalated && (
                        <span className="rounded-full border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-xs text-amber-200">
                          Escalado
                        </span>
                      )}
                    </div>
                  </li>
                ))
              )}
            </ul>
          </section>
        )}

        {tab === "stats" && stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {(
              [
                ["Conversaciones", String(stats.totalConversations)],
                ["Leads", String(stats.leadsCaptured)],
                ["Escalaciones", String(stats.escalations)],
                ["Msgs / conv", stats.avgMessagesPerConversation.toFixed(1)],
              ] as const
            ).map(([label, val]) => (
              <div key={label} className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
                <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
                <p className="mt-2 text-2xl font-semibold text-white">{val}</p>
              </div>
            ))}
          </div>
        )}

        {tab === "stats" && !stats && <p className="text-sm text-slate-500">Cargando…</p>}

        {tab === "embed" && (
          <section className="space-y-4">
            {!chatbot?.id ? (
              <p className="text-sm text-slate-500">Guarda la configuración primero.</p>
            ) : (
              <>
                <button
                  type="button"
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white"
                  onClick={() => void copySnippet()}
                >
                  Copiar código embed
                </button>
                <pre className="max-h-[400px] overflow-auto rounded-xl border border-slate-800 bg-slate-950 p-4 text-xs text-slate-300">
                  {snippet || "Cargando snippet…"}
                </pre>
              </>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
