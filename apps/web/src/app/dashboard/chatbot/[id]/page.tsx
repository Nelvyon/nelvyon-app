"use client";

import { ArrowLeft, Bot, Copy } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { Button } from "@/core/ui/button";
import { cn } from "@/core/ui/utils";
import { toastSuccess } from "@/core/ui/toastFeedback";
import { DashboardTabs, MetricGrid, DashboardListShell, DashboardPageTransition, SkeletonList, SkeletonTable } from "@/features/dashboard/components/DashboardTabs";
import { chatbotEmbedSnippet, dashboardChatbotApi } from "@/features/dashboard/api";

type Tab = "config" | "conversations" | "stats" | "install";

const TABS: { id: Tab; label: string }[] = [
  { id: "config", label: "Configuración" },
  { id: "conversations", label: "Conversaciones" },
  { id: "stats", label: "Estadísticas" },
  { id: "install", label: "Instalar" },
];

function str(v: unknown, fb = ""): string {
  if (v == null || v === "") return fb;
  return String(v);
}

export default function ChatbotDetailPage() {
  const [loading, setLoading] = useState(true);
  const params = useParams();
  const id = str(params?.id);
  const [tab, setTab] = useState<Tab>("config");
  const [bot, setBot] = useState<Record<string, unknown>>({});
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [stats, setStats] = useState<Record<string, unknown>>({});
  const [conversations, setConversations] = useState<Record<string, unknown>[]>([]);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [thread, setThread] = useState<Record<string, unknown> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
    if (!id) return;
    const [b, s, c] = await Promise.all([
      dashboardChatbotApi.get(id),
      dashboardChatbotApi.stats(id),
      dashboardChatbotApi.conversations(id),
    ]);
    setBot(b);
    const cfg = (b.config as Record<string, unknown>) ?? {};
    setForm({
      nombre: cfg.nombre ?? b.name,
      avatar_url: cfg.avatar_url ?? "",
      color_primario: cfg.color_primario ?? "#6366f1",
      mensaje_bienvenida: cfg.mensaje_bienvenida ?? "",
      idioma: cfg.idioma ?? "es",
      comportamiento: cfg.comportamiento ?? "soporte",
      base_conocimiento: cfg.base_conocimiento ?? "",
      escalada_a_humano: cfg.escalada_a_humano ?? true,
      is_active: b.is_active ?? true,
    });
    setStats(s);
    setConversations(c.items ?? []);
    } catch {
      /* preserved */
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  async function save() {
    await dashboardChatbotApi.update(id, form);
    toastSuccess("Chatbot actualizado");
    load();
  }

  async function openThread(sessionId: string) {
    setSelectedSession(sessionId);
    const detail = await dashboardChatbotApi.conversation(id, sessionId);
    setThread(detail);
  }

  const embedToken = str(bot.embed_token);
  const snippet = embedToken ? chatbotEmbedSnippet(embedToken) : "";
  const chart = (stats.conversations_by_day as { day: string; total: number }[]) ?? [];
  const maxChart = Math.max(...chart.map((d) => d.total), 1);

  return (
    <ProtectedLayout module="os">
      <DashboardPageTransition>
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild size="sm" variant="outline">
            <Link href="/dashboard/chatbot">
              <ArrowLeft className="mr-1 h-4 w-4" /> Volver
            </Link>
          </Button>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Bot className="h-6 w-6 text-primary" aria-hidden />
            {str(bot.name, "Chatbot")}
          </h1>
        </div>

        <div className="flex flex-wrap gap-2 border-b pb-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium",
                tab === t.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
              )}
              onClick={() => setTab(t.id)}
              type="button"
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "config" && (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              <label className="block space-y-1 text-sm">
                <span className="font-medium">Nombre</span>
                <input className="w-full rounded-lg border px-3 py-2" value={str(form.nombre)} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
              </label>
              <label className="block space-y-1 text-sm">
                <span className="font-medium">Avatar URL</span>
                <input className="w-full rounded-lg border px-3 py-2" value={str(form.avatar_url)} onChange={(e) => setForm({ ...form, avatar_url: e.target.value })} />
              </label>
              <label className="block space-y-1 text-sm">
                <span className="font-medium">Color primario</span>
                <input type="color" className="h-10 w-full rounded border" value={str(form.color_primario, "#6366f1")} onChange={(e) => setForm({ ...form, color_primario: e.target.value })} />
              </label>
              <label className="block space-y-1 text-sm">
                <span className="font-medium">Mensaje bienvenida</span>
                <textarea className="w-full rounded-lg border px-3 py-2" rows={3} value={str(form.mensaje_bienvenida)} onChange={(e) => setForm({ ...form, mensaje_bienvenida: e.target.value })} />
              </label>
              <label className="block space-y-1 text-sm">
                <span className="font-medium">Comportamiento</span>
                <select className="w-full rounded-lg border px-3 py-2" value={str(form.comportamiento, "soporte")} onChange={(e) => setForm({ ...form, comportamiento: e.target.value })}>
                  <option value="soporte">Soporte</option>
                  <option value="ventas">Ventas</option>
                  <option value="leads">Leads</option>
                  <option value="faq">FAQ</option>
                </select>
              </label>
              <label className="block space-y-1 text-sm">
                <span className="font-medium">Base de conocimiento</span>
                <textarea className="w-full rounded-lg border px-3 py-2 font-mono text-xs" rows={8} value={str(form.base_conocimiento)} onChange={(e) => setForm({ ...form, base_conocimiento: e.target.value })} />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input checked={Boolean(form.is_active)} type="checkbox" onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
                Activo
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input checked={Boolean(form.escalada_a_humano)} type="checkbox" onChange={(e) => setForm({ ...form, escalada_a_humano: e.target.checked })} />
                Escalada a humano
              </label>
              <Button onClick={save}>Guardar cambios</Button>
            </div>
            <div className="rounded-xl border bg-muted/20 p-4">
              <p className="mb-3 text-sm font-medium">Vista previa</p>
              <div className="mx-auto max-w-xs overflow-hidden rounded-lg border bg-background shadow-lg">
                <div className="flex items-center gap-2 px-3 py-2 text-sm text-white" style={{ background: str(form.color_primario, "#6366f1") }}>
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-xs font-bold">{str(form.nombre, "C").charAt(0)}</span>
                  <span>{str(form.nombre, "Chatbot")}</span>
                </div>
                <div className="bg-slate-50 p-3 text-sm">
                  <div className="max-w-[85%] rounded-lg border bg-white px-3 py-2">{str(form.mensaje_bienvenida)}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "conversations" && (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left">
                  <tr>
                    <th className="p-2">Sesión</th>
                    <th className="p-2">Último msg</th>
                    <th className="p-2">Lead</th>
                  </tr>
                </thead>
                <tbody>
                  {conversations.map((c) => (
                    <tr
                      key={str(c.session_id)}
                      className={cn("cursor-pointer border-t hover:bg-muted/30", selectedSession === c.session_id && "bg-muted/40")}
                      onClick={() => openThread(str(c.session_id))}
                    >
                      <td className="p-2 font-mono text-xs">{str(c.session_id).slice(0, 10)}…</td>
                      <td className="p-2">{str(c.last_message_at).slice(0, 16)}</td>
                      <td className="p-2">{c.lead_captured ? "Sí" : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="max-h-96 overflow-y-auto rounded-lg border bg-muted/20 p-4 text-sm">
              {!thread ? (
                <p className="text-muted-foreground">Selecciona una conversación</p>
              ) : (
                ((thread.messages as { role: string; content: string }[]) ?? []).map((m, i) => (
                  <p key={i} className={cn("mb-2", m.role === "user" && "text-right")}>
                    <span className="inline-block rounded-lg bg-background px-2 py-1 shadow-sm">{m.content}</span>
                  </p>
                ))
              )}
            </div>
          </div>
        )}

        {tab === "stats" && (
          <div className="space-y-6">
            <MetricGrid
              items={[
                { label: "Conversaciones", value: str(stats.total_conversations, "0") },
                { label: "Leads", value: str(stats.leads_captured, "0") },
                { label: "Escaladas", value: str(stats.escalated, "0") },
                { label: "Satisfacción media", value: str(stats.avg_satisfaction, "0") },
              ]}
            />
            <section className="rounded-xl border p-4">
              <h2 className="mb-4 text-sm font-semibold">Conversaciones por día (7 días)</h2>
              <div className="flex items-end gap-2">
                {chart.map((d) => (
                  <div key={d.day} className="flex flex-col items-center gap-1">
                    <div className="w-8 rounded-t bg-primary/80" style={{ height: `${Math.max(8, (d.total / maxChart) * 96)}px` }} title={`${d.total} conversaciones`} />
                    <span className="text-[10px] text-muted-foreground">{d.day.slice(5)}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {tab === "install" && (
          <div className="space-y-4 rounded-xl border bg-card p-6">
            <p className="text-sm text-muted-foreground">
              Copia este snippet antes de <code className="rounded bg-muted px-1">&lt;/body&gt;</code> en cualquier web.
            </p>
            <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-xs">{snippet}</pre>
            <Button
              onClick={() => {
                void navigator.clipboard.writeText(snippet);
                toastSuccess("Snippet copiado");
              }}
            >
              <Copy className="mr-2 h-4 w-4" /> Copiar código
            </Button>
            <p className="text-xs text-muted-foreground">
              Token: <code className="rounded bg-muted px-1">{embedToken}</code>
            </p>
          </div>
        )}
      </DashboardPageTransition>
    </ProtectedLayout>
  );
}
