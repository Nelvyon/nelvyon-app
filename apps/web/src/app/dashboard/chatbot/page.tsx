"use client";

import { Bot, MessageSquare, Plus, Settings, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { Button } from "@/core/ui/button";
import { cn } from "@/core/ui/utils";
import { DashboardTabs, MetricGrid, DashboardListShell, DashboardPageTransition, SkeletonList, SkeletonTable, EliteModal } from "@/features/dashboard/components/DashboardTabs";
import { dashboardChatbotApi } from "@/features/dashboard/api";

type BotRow = Record<string, unknown>;

const DEFAULT_FORM = {
  nombre: "",
  avatar_url: "",
  color_primario: "#6366f1",
  mensaje_bienvenida: "¡Hola! ¿En qué puedo ayudarte?",
  idioma: "es",
  comportamiento: "soporte",
  base_conocimiento: "",
  escalada_a_humano: true,
};

function str(v: unknown, fb = "—"): string {
  if (v == null || v === "") return fb;
  return String(v);
}

function WidgetPreview({ config }: { config: typeof DEFAULT_FORM }) {
  return (
    <div className="mx-auto w-full max-w-xs rounded-xl border bg-muted/30 p-3 shadow-inner">
      <div className="overflow-hidden rounded-lg border bg-background shadow-lg">
        <div className="flex items-center gap-2 px-3 py-2 text-sm text-white" style={{ background: config.color_primario }}>
          {config.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <Image alt="" className="h-8 w-8 rounded-full object-cover" height={160} src={config.avatar_url} unoptimized width={160} />
          ) : (
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-xs font-bold">
              {config.nombre.charAt(0) || "C"}
            </span>
          )}
          <span className="font-medium">{config.nombre || "Chatbot"}</span>
        </div>
        <div className="space-y-2 bg-slate-50 p-3 text-sm">
          <div className="max-w-[85%] rounded-lg border bg-white px-3 py-2 text-foreground">{config.mensaje_bienvenida}</div>
          <div className="ml-auto max-w-[85%] rounded-lg px-3 py-2 text-white" style={{ background: config.color_primario }}>
            Hola, necesito información
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ChatbotListPage() {
  const [loading, setLoading] = useState(true);
  const [bots, setBots] = useState<BotRow[]>([]);
  const [globalStats, setGlobalStats] = useState<Record<string, unknown>>({});
  const [modal, setModal] = useState(false);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [convModal, setConvModal] = useState<{ botId: string; sessions: BotRow[] } | null>(null);
  const [thread, setThread] = useState<Record<string, unknown> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
    const res = await dashboardChatbotApi.list();
    setBots(res.items ?? []);
    setGlobalStats(res.global_stats ?? {});
    } catch {
      /* preserved */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load().catch(() => {
      setBots([]);
      setGlobalStats({});
    });
  }, [load]);

  async function createBot() {
    await dashboardChatbotApi.create(form);
    setModal(false);
    setStep(1);
    setForm(DEFAULT_FORM);
    load();
  }

  async function openConversations(botId: string) {
    const res = await dashboardChatbotApi.conversations(botId);
    setConvModal({ botId, sessions: res.items ?? [] });
    setThread(null);
  }

  async function openThread(botId: string, sessionId: string) {
    const detail = await dashboardChatbotApi.conversation(botId, sessionId);
    setThread(detail);
  }

  async function removeBot(id: string) {
    if (!confirm("¿Eliminar este chatbot?")) return;
    await dashboardChatbotApi.delete(id);
    load();
  }

  const metrics = [
    { label: "Conversaciones totales", value: str(globalStats.total_conversations, "0") },
    { label: "Leads capturados", value: str(globalStats.leads_captured, "0") },
    { label: "Escaladas a humano", value: str(globalStats.escalated, "0") },
  ];

  return (
    <ProtectedLayout module="os">
      <DashboardPageTransition>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              <Bot className="h-7 w-7 text-primary" aria-hidden />
              Chatbots embebibles
            </h1>
            <p className="text-sm text-muted-foreground">Crea asistentes IA para incrustar en cualquier web</p>
          </div>
          <Button onClick={() => setModal(true)}>
            <Plus className="mr-2 h-4 w-4" /> Nuevo chatbot
          </Button>
        </div>

        <MetricGrid items={metrics} loading={loading} />

        <DashboardListShell
          empty={!loading && bots.length === 0}
          emptyActionLabel="Nuevo chatbot"
          emptyDescription="Crea uno para obtener el snippet de instalación en tu web."
          emptyTitle="Sin chatbots"
          loading={loading}
          onEmptyAction={() => setModal(true)}
          skeleton={<SkeletonList />}
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {bots.map((b) => {
              const cfg = (b.config as Record<string, unknown>) ?? {};
              return (
                <article key={str(b.id)} className="rounded-xl border bg-card p-4 shadow-sm">
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      {cfg.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <Image alt="" className="h-10 w-10 rounded-full object-cover" height={160} src={str(cfg.avatar_url)} unoptimized width={160} />
                      ) : (
                        <span
                          className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white"
                          style={{ background: str(cfg.color_primario, "#6366f1") }}
                        >
                          {str(b.name, "C").charAt(0)}
                        </span>
                      )}
                      <div>
                        <h2 className="font-semibold">{str(b.name)}</h2>
                        <p className="text-xs text-muted-foreground">
                          {b.is_active ? "Activo" : "Inactivo"} · {str(cfg.comportamiento, "soporte")}
                        </p>
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => removeBot(str(b.id))} aria-label="Eliminar">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  <div className="mb-4 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <span>Hoy: {str(b.conversations_today, "0")} conv.</span>
                    <span>Leads: {str(b.leads_captured, "0")}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/dashboard/chatbot/${str(b.id)}`}>
                        <Settings className="mr-1 h-3 w-3" /> Editar
                      </Link>
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openConversations(str(b.id))}>
                      <MessageSquare className="mr-1 h-3 w-3" /> Conversaciones
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        </DashboardListShell>
      </DashboardPageTransition>

      <EliteModal open={modal} onClose={() => setModal(false)} title={`Nuevo chatbot — paso ${step}/3`} wide>
        {step === 1 ? (
          <div className="space-y-4">
            <label className="block space-y-1 text-sm">
              <span className="font-medium">Nombre</span>
              <input className="w-full rounded-lg border px-3 py-2" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="font-medium">Avatar (URL)</span>
              <input className="w-full rounded-lg border px-3 py-2" value={form.avatar_url} onChange={(e) => setForm({ ...form, avatar_url: e.target.value })} placeholder="https://…" />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="font-medium">Color primario</span>
              <input type="color" className="h-10 w-full rounded border" value={form.color_primario} onChange={(e) => setForm({ ...form, color_primario: e.target.value })} />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="font-medium">Mensaje de bienvenida</span>
              <textarea className="w-full rounded-lg border px-3 py-2" rows={3} value={form.mensaje_bienvenida} onChange={(e) => setForm({ ...form, mensaje_bienvenida: e.target.value })} />
            </label>
            <div className="flex justify-end">
              <Button disabled={!form.nombre.trim()} onClick={() => setStep(2)}>Siguiente</Button>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-4">
            <label className="block space-y-1 text-sm">
              <span className="font-medium">Comportamiento</span>
              <select className="w-full rounded-lg border px-3 py-2" value={form.comportamiento} onChange={(e) => setForm({ ...form, comportamiento: e.target.value })}>
                <option value="soporte">Soporte</option>
                <option value="ventas">Ventas</option>
                <option value="leads">Captación de leads</option>
                <option value="faq">FAQ</option>
              </select>
            </label>
            <label className="block space-y-1 text-sm">
              <span className="font-medium">Idioma</span>
              <select className="w-full rounded-lg border px-3 py-2" value={form.idioma} onChange={(e) => setForm({ ...form, idioma: e.target.value })}>
                <option value="es">Español</option>
                <option value="en">English</option>
                <option value="pt">Português</option>
              </select>
            </label>
            <label className="block space-y-1 text-sm">
              <span className="font-medium">Base de conocimiento</span>
              <textarea className="w-full rounded-lg border px-3 py-2 font-mono text-xs" rows={8} value={form.base_conocimiento} onChange={(e) => setForm({ ...form, base_conocimiento: e.target.value })} placeholder="Productos, precios, horarios, políticas…" />
            </label>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>Atrás</Button>
              <Button onClick={() => setStep(3)}>Siguiente</Button>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-4">
            <label className="flex items-center gap-2 text-sm">
              <input checked={form.escalada_a_humano} type="checkbox" onChange={(e) => setForm({ ...form, escalada_a_humano: e.target.checked })} />
              Escalada a humano (crea ticket en helpdesk)
            </label>
            <WidgetPreview config={form} />
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>Atrás</Button>
              <Button onClick={createBot}>Crear chatbot</Button>
            </div>
          </div>
        ) : null}
      </EliteModal>

      <EliteModal open={!!convModal} onClose={() => setConvModal(null)} title="Conversaciones" wide>
        {convModal ? (
          <DashboardListShell
          empty={!loading && bots.length === 0}
          emptyDescription="Crea un asistente IA para tu web."
          emptyTitle="Sin chatbots"
          emptyActionLabel="Crear chatbot"
          onEmptyAction={() => setModal(true)}
          loading={loading}
          skeleton={<SkeletonList />}
        >
        <div className="grid gap-4 md:grid-cols-2">
            <ul className="max-h-80 space-y-2 overflow-y-auto text-sm">
              {convModal.sessions.length === 0 ? (
                <li className="text-muted-foreground">Sin conversaciones</li>
              ) : (
                convModal.sessions.map((s) => (
                  <li key={str(s.session_id)}>
                    <button
                      className={cn("w-full rounded-lg border px-3 py-2 text-left hover:bg-muted", thread?.session_id === s.session_id && "border-primary bg-muted")}
                      onClick={() => openThread(convModal.botId, str(s.session_id))}
                      type="button"
                    >
                      <p className="font-medium">{str((s.visitor_info as Record<string, unknown>)?.email, str(s.session_id).slice(0, 8))}</p>
                      <p className="text-xs text-muted-foreground">{str(s.last_message_at).slice(0, 16)} · {str(s.message_count, "0")} msgs</p>
                    </button>
                  </li>
                ))
              )}
            </ul>
            <div className="max-h-80 overflow-y-auto rounded-lg border bg-muted/20 p-3 text-sm">
              {!thread ? (
                <p className="text-muted-foreground">Selecciona una sesión</p>
              ) : (
                ((thread.messages as { role: string; content: string }[]) ?? []).map((m, i) => (
                  <p key={i} className={cn("mb-2", m.role === "user" ? "text-right font-medium" : "")}>
                    <span className="inline-block rounded-lg bg-background px-2 py-1">{m.content}</span>
                  </p>
                ))
              )}
            </div>
          </div>
        </DashboardListShell>
        ) : null}
      </EliteModal>
    </ProtectedLayout>
  );
}
