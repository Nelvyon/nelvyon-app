"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { NelvyonDsBadge, NelvyonDsStatusDot } from "@/design-system/components";
import { SaasEmptyState, SAAS_EMPTY_DESCRIPTION, SAAS_EMPTY_TITLE } from "@/features/saas-shell/components/SaasEmptyState";
import { SaasCan } from "@/features/saas-shell/components/SaasCan";
import { SaasPermissionDenied } from "@/features/saas-shell/components/SaasPermissionDenied";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";
import { SaasShellLayout, DarkCard } from "@/features/saas-shell/components/SaasShellLayout";
import { useSaasPermissions } from "@/features/saas-shell/useSaasPermissions";
import { EmailEditor } from "@/features/email-editor/EmailEditor";

type CampaniaStatus = "draft" | "scheduled" | "running" | "paused" | "completed" | "cancelled";
type CampaniaChannel = "email" | "sms" | "notification" | "multi";
type Campania = {
  id: string;
  name: string;
  description: string | null;
  status: CampaniaStatus;
  channel: CampaniaChannel;
  subject: string | null;
  body: string;
  ctaText: string | null;
  ctaUrl: string | null;
  audienceFilter: Record<string, unknown>;
  scheduledAt: string | null;
  totalRecipients: number;
  sentCount: number;
};
type CampaniaStats = { total_recipients: number; sent_count: number; opened_count: number; clicked_count: number; open_rate: number; click_rate: number };
type Recipient = { id: string; contactId: string; status: "pending" | "sent" | "opened" | "clicked" | "bounced" | "unsubscribed"; sentAt: string | null };

const CHANNELS: CampaniaChannel[] = ["email", "sms", "notification", "multi"];

export default function SaasCampaniasPage() {
  const router = useRouter();
  const { can, isViewer } = useSaasPermissions();
  const canManage = can("campanias.write");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tenantPlan, setTenantPlan] = useState<"starter" | "pro" | "enterprise">("starter");
  const [tenantCompany, setTenantCompany] = useState("");
  const [campanias, setCampanias] = useState<Campania[]>([]);
  const [sesConfigured, setSesConfigured] = useState<boolean | null>(null);
  const [tab, setTab] = useState<"all" | "active" | "completed" | "draft">("all");
  const [showWizard, setShowWizard] = useState(false);
  const [step, setStep] = useState(1);
  const [selected, setSelected] = useState<Campania | null>(null);
  const [stats, setStats] = useState<CampaniaStats | null>(null);
  const [recipients, setRecipients] = useState<Recipient[]>([]);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [channel, setChannel] = useState<CampaniaChannel>("email");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [ctaText, setCtaText] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [audienceMode, setAudienceMode] = useState<"all" | "status" | "stage" | "deal_stage" | "deal_open" | "tags">("all");
  const [audienceValue, setAudienceValue] = useState("");
  const [scheduleMode, setScheduleMode] = useState<"now" | "scheduled">("now");
  const [scheduledAt, setScheduledAt] = useState("");

  async function loadTenant() {
    const res = await fetch("/api/saas/dashboard", { credentials: "same-origin" });
    if (res.status === 401) {
      router.replace(`/auth/login?next=${encodeURIComponent("/saas/campanias")}`);
      return;
    }
    if (!res.ok) return;
    const bodyRes = (await res.json()) as { tenant: { companyName: string; plan: "starter" | "pro" | "enterprise"; onboardingCompleted: boolean } };
    if (!bodyRes.tenant.onboardingCompleted) {
      router.replace("/saas/onboarding");
      return;
    }
    setTenantCompany(bodyRes.tenant.companyName);
    setTenantPlan(bodyRes.tenant.plan);
  }

  async function loadCampanias() {
    const res = await fetch("/api/saas/campanias", { credentials: "same-origin" });
    if (res.status === 401) {
      router.replace(`/auth/login?next=${encodeURIComponent("/saas/campanias")}`);
      return;
    }
    if (!res.ok) throw new Error("No se pudieron cargar campanias");
    const bodyRes = (await res.json()) as { campanias: Campania[]; ses_configured?: boolean };
    setCampanias(bodyRes.campanias ?? []);
    setSesConfigured(bodyRes.ses_configured ?? false);
  }

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([loadTenant(), loadCampanias()]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al cargar campanias");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    if (tab === "all") return campanias;
    if (tab === "active") return campanias.filter((c) => c.status === "running" || c.status === "scheduled");
    if (tab === "completed") return campanias.filter((c) => c.status === "completed");
    return campanias.filter((c) => c.status === "draft");
  }, [campanias, tab]);

  function buildAudienceFilter(): Record<string, unknown> {
    if (audienceMode === "status" && audienceValue) return { status: audienceValue };
    if (audienceMode === "stage" && audienceValue) return { pipeline_stage: audienceValue };
    if (audienceMode === "deal_stage" && audienceValue) return { deal_stage: audienceValue };
    if (audienceMode === "deal_open") return { deal_open_only: true };
    if (audienceMode === "tags" && audienceValue) return { tags: audienceValue.split(",").map((x) => x.trim()).filter(Boolean) };
    return {};
  }

  async function createCampania(launchNow: boolean) {
    const res = await fetch("/api/saas/campanias", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description,
        channel,
        subject: channel === "email" ? subject : null,
        body,
        ctaText: ctaText || null,
        ctaUrl: ctaUrl || null,
        audienceFilter: buildAudienceFilter(),
      }),
    });
    if (!res.ok) throw new Error("No se pudo crear campania");
    const data = (await res.json()) as { campania: Campania };
    if (scheduleMode === "scheduled" && scheduledAt) {
      await fetch(`/api/saas/campanias/${data.campania.id}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "scheduled", scheduled_at: scheduledAt }),
      });
    }
    if (launchNow) {
      await fetch(`/api/saas/campanias/${data.campania.id}/launch`, { method: "POST", credentials: "same-origin" });
    }
    setShowWizard(false);
    setStep(1);
    setName("");
    setDescription("");
    setSubject("");
    setBody("");
    setCtaText("");
    setCtaUrl("");
    setAudienceMode("all");
    setAudienceValue("");
    setScheduleMode("now");
    setScheduledAt("");
    await loadCampanias();
  }

  async function openDetail(c: Campania) {
    setSelected(c);
    const [statsRes, recRes] = await Promise.all([
      fetch(`/api/saas/campanias/${c.id}/stats`, { credentials: "same-origin" }),
      fetch(`/api/saas/campanias/${c.id}/recipients`, { credentials: "same-origin" }),
    ]);
    if (statsRes.ok) {
      const b = (await statsRes.json()) as { stats: CampaniaStats };
      setStats(b.stats);
    } else {
      setStats(null);
    }
    if (recRes.ok) {
      const b = (await recRes.json()) as { recipients: Recipient[] };
      setRecipients(b.recipients ?? []);
    } else {
      setRecipients([]);
    }
  }

  async function launchSelected() {
    if (!selected) return;
    const res = await fetch(`/api/saas/campanias/${selected.id}/launch`, { method: "POST", credentials: "same-origin" });
    if (res.ok) {
      await loadCampanias();
      await openDetail({ ...selected, status: "completed" });
    }
  }

  async function pauseSelected() {
    if (!selected) return;
    const res = await fetch(`/api/saas/campanias/${selected.id}/pause`, { method: "POST", credentials: "same-origin" });
    if (res.ok) {
      await loadCampanias();
      await openDetail({ ...selected, status: "paused" });
    }
  }

  async function duplicateSelected() {
    if (!selected) return;
    await fetch("/api/saas/campanias", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `${selected.name} (copia)`,
        description: selected.description,
        channel: selected.channel,
        subject: selected.subject,
        body: selected.body,
        ctaText: selected.ctaText,
        ctaUrl: selected.ctaUrl,
        audienceFilter: selected.audienceFilter,
      }),
    });
    await loadCampanias();
  }

  return (
    <SaasShellLayout sidebar={<SaasSidebar activeId="campanias" tenantCompany={tenantCompany || undefined} tenantPlan={tenantPlan} />}>
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-[#0084ff]/70">Marketing</p>
        <h1 className="mt-1 text-2xl font-bold text-white">Campañas</h1>
        <p className="mt-0.5 text-sm text-white/40">Motor multicanal email, SMS y notificación</p>
      </div>
          {isViewer ? (
            <SaasPermissionDenied message="Tu rol es solo lectura. Puedes ver campañas, pero no crear ni lanzar." />
          ) : null}
          {sesConfigured === false ? (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
              <strong>Email no configurado:</strong> las variables <code className="text-amber-200">SES_FROM_EMAIL</code> y <code className="text-amber-200">SES_ACCESS_KEY_ID</code> no están definidas en el servidor. Los envíos de email fallarán hasta que las configures en Railway.
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {(["all", "active", "completed", "draft"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${tab === t ? "bg-[#0084ff]/15 text-[#0084ff] ring-1 ring-[#0084ff]/30" : "text-white/50 hover:bg-white/[0.05] hover:text-white/80"}`}
              >
                {t === "all" ? "Todas" : t === "active" ? "Activas" : t === "completed" ? "Completadas" : "Borradores"}
              </button>
            ))}
            <SaasCan action="campanias.write">
              <button onClick={() => setShowWizard(true)} className="rounded-lg bg-gradient-to-r from-[#0084ff] to-[#0047ab] px-3 py-1.5 text-sm font-medium text-white shadow-[0_0_12px_rgba(0,132,255,0.3)] hover:shadow-[0_0_20px_rgba(0,132,255,0.4)] transition-all">
                Nueva campania
              </button>
            </SaasCan>
          </div>
          {error ? <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">{error}</div> : null}
          {loading ? (
            <DarkCard><p className="text-sm text-white/40">Cargando campañas...</p></DarkCard>
          ) : filtered.length === 0 ? (
            <SaasEmptyState
              title={SAAS_EMPTY_TITLE}
              description={SAAS_EMPTY_DESCRIPTION}
              action={
                canManage ? (
                  <button onClick={() => setShowWizard(true)} className="rounded-lg bg-gradient-to-r from-[#0084ff] to-[#0047ab] px-4 py-2 text-sm font-medium text-white shadow-[0_0_12px_rgba(0,132,255,0.3)]">Crear primera campania</button>
                ) : undefined
              }
            />
          ) : (
            <div className="space-y-3">
              {filtered.map((c) => {
                const openRate = c.sentCount > 0 ? ((0 / c.sentCount) * 100).toFixed(0) : "0";
                return (
                  <DarkCard key={c.id} className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <button className="text-left text-base font-semibold text-white/90 hover:text-[#0084ff] transition-colors" onClick={() => void openDetail(c)}>
                        {c.name}
                      </button>
                      <div className="flex gap-2">
                        <span className="rounded-md bg-white/5 px-2 py-0.5 text-xs text-white/50">{c.channel}</span>
                        <span className="rounded-md bg-[#0084ff]/10 px-2 py-0.5 text-xs text-[#0084ff]">{c.status}</span>
                      </div>
                    </div>
                    <div className="grid gap-2 text-sm text-white/40 sm:grid-cols-4">
                      <div><span className="text-white/25">Recipients</span> <span className="text-white/70">{c.totalRecipients}</span></div>
                      <div><span className="text-white/25">Enviados</span> <span className="text-white/70">{c.sentCount}</span></div>
                      <div><span className="text-white/25">Open rate</span> <span className="text-white/70">{openRate}%</span></div>
                      <div><span className="text-white/25">Prog.</span> <span className="text-white/70">{c.scheduledAt ? new Date(c.scheduledAt).toLocaleString() : "—"}</span></div>
                    </div>
                  </DarkCard>
                );
              })}
            </div>
          )}

          {showWizard && canManage ? (
            <DarkCard className="space-y-4">
              <div className="text-base font-semibold text-white">Nueva campania (Paso {step}/5)</div>
              {step === 1 ? (
                <div className="grid gap-2">
                  <input className="rounded-md border bg-background px-3 py-2 text-sm" placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)} />
                  <textarea className="rounded-md border bg-background px-3 py-2 text-sm" placeholder="Descripcion" value={description} onChange={(e) => setDescription(e.target.value)} />
                  <select className="rounded-md border bg-background px-3 py-2 text-sm" value={channel} onChange={(e) => setChannel(e.target.value as CampaniaChannel)}>
                    {CHANNELS.map((ch) => (
                      <option key={ch} value={ch}>
                        {ch}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
              {step === 2 ? (
                <div className="grid gap-2">
                  {channel === "email" ? <input className="rounded-md border bg-background px-3 py-2 text-sm" placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} /> : null}
                  <EmailEditor value={body} onChange={setBody} />
                  <input className="rounded-md border bg-background px-3 py-2 text-sm" placeholder="CTA text" value={ctaText} onChange={(e) => setCtaText(e.target.value)} />
                  <input className="rounded-md border bg-background px-3 py-2 text-sm" placeholder="CTA url" value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} />
                </div>
              ) : null}
              {step === 3 ? (
                <div className="grid gap-2">
                  <select className="rounded-md border bg-background px-3 py-2 text-sm" value={audienceMode} onChange={(e) => setAudienceMode(e.target.value as "all" | "status" | "stage" | "deal_stage" | "deal_open" | "tags")}>
                    <option value="all">Todos</option>
                    <option value="status">Por status contacto</option>
                    <option value="stage">Por stage contacto (legacy)</option>
                    <option value="deal_stage">Etapa de oportunidad</option>
                    <option value="deal_open">Pipeline abierto (deals)</option>
                    <option value="tags">Por tags</option>
                  </select>
                  {audienceMode !== "all" && audienceMode !== "deal_open" ? (
                    <input className="rounded-md border bg-background px-3 py-2 text-sm" placeholder="Valor del filtro" value={audienceValue} onChange={(e) => setAudienceValue(e.target.value)} />
                  ) : null}
                </div>
              ) : null}
              {step === 4 ? (
                <div className="grid gap-2">
                  <select className="rounded-md border bg-background px-3 py-2 text-sm" value={scheduleMode} onChange={(e) => setScheduleMode(e.target.value as "now" | "scheduled")}>
                    <option value="now">Enviar ahora</option>
                    <option value="scheduled">Programar</option>
                  </select>
                  {scheduleMode === "scheduled" ? (
                    <input className="rounded-md border bg-background px-3 py-2 text-sm" type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
                  ) : null}
                </div>
              ) : null}
              {step === 5 ? (
                <div className="space-y-1 text-sm text-muted-foreground">
                  <div>Nombre: {name || "(sin nombre)"}</div>
                  <div>Canal: {channel}</div>
                  <div>Audiencia: {audienceMode}</div>
                  <div>Envio: {scheduleMode === "now" ? "ahora" : `programado ${scheduledAt}`}</div>
                </div>
              ) : null}
              <div className="flex flex-wrap gap-2">
                {[
                  { label: "Atrás", action: () => setStep((s) => Math.max(1, s - 1)) },
                  ...(step < 5 ? [{ label: "Siguiente", action: () => setStep((s) => Math.min(5, s + 1)) }] : []),
                  ...(step === 5 ? [
                    { label: "Guardar", action: () => void createCampania(false) },
                    { label: "Guardar y lanzar", action: () => void createCampania(scheduleMode === "now") },
                  ] : []),
                  { label: "Cerrar", action: () => setShowWizard(false) },
                ].map((btn) => (
                  <button key={btn.label} onClick={btn.action} className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white/70 hover:bg-white/10 hover:text-white transition-all">
                    {btn.label}
                  </button>
                ))}
              </div>
            </DarkCard>
          ) : null}

          {selected ? (
            <DarkCard glow className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-base font-semibold text-white">{selected.name}</div>
                <span className="rounded-md bg-[#0084ff]/10 px-2 py-0.5 text-xs text-[#0084ff]">{selected.status}</span>
              </div>
              <div className="text-sm text-white/40">{selected.description ?? "Sin descripción"}</div>
              <div className="grid gap-3 sm:grid-cols-5">
                {[
                  { label: "Enviados", value: stats?.sent_count ?? 0 },
                  { label: "Abiertos", value: stats?.opened_count ?? 0 },
                  { label: "Clicks", value: stats?.clicked_count ?? 0 },
                  { label: "Open Rate", value: `${stats?.open_rate ?? 0}%` },
                  { label: "Click Rate", value: `${stats?.click_rate ?? 0}%` },
                ].map((s) => (
                  <div key={s.label} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                    <p className="text-[10px] uppercase tracking-wider text-white/30">{s.label}</p>
                    <p className="mt-1 text-xl font-bold text-white">{s.value}</p>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <SaasCan action="campanias.launch">
                  <button onClick={() => void launchSelected()} className="rounded-lg bg-gradient-to-r from-[#0084ff] to-[#0047ab] px-3 py-1.5 text-sm font-medium text-white shadow-[0_0_12px_rgba(0,132,255,0.3)] hover:shadow-[0_0_20px_rgba(0,132,255,0.4)] transition-all">Lanzar</button>
                </SaasCan>
                <SaasCan action="campanias.write">
                  <button onClick={() => void pauseSelected()} className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white/60 hover:text-white transition-all">Pausar</button>
                  <button onClick={() => void duplicateSelected()} className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white/60 hover:text-white transition-all">Duplicar</button>
                </SaasCan>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-white/30">Recipients</p>
                {recipients.length === 0 ? (
                  <SaasEmptyState title={SAAS_EMPTY_TITLE} description="Lanza la campaña para ver destinatarios aquí." className="p-4" />
                ) : (
                  recipients.map((r) => (
                    <div key={r.id} className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-sm">
                      <div className="text-white/60">{r.contactId}</div>
                      <div className="flex items-center gap-2">
                        <NelvyonDsStatusDot status={r.status === "sent" || r.status === "opened" || r.status === "clicked" ? "ok" : "pending"} />
                        <span className="text-white/50">{r.status}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </DarkCard>
          ) : null}
    </SaasShellLayout>
  );
}
