"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  NelvyonDsBadge,
  NelvyonDsButton,
  NelvyonDsCard,
  NelvyonDsSectionHeader,
  NelvyonDsStatusDot,
} from "@/design-system/components";
import { KpiTile } from "@/features/saas-shell/components/SaasDashboardWidgets";
import { SaasEmptyState, SAAS_EMPTY_DESCRIPTION, SAAS_EMPTY_TITLE } from "@/features/saas-shell/components/SaasEmptyState";
import { SaasCan } from "@/features/saas-shell/components/SaasCan";
import { CampaniaTemplateQuickLaunch } from "@/features/saas-campanias/components/CampaniaTemplateQuickLaunch";
import { SaasPermissionDenied } from "@/features/saas-shell/components/SaasPermissionDenied";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";
import { SaasShellLayout } from "@/features/saas-shell/components/SaasShellLayout";
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
  openedCount: number;
  clickedCount: number;
};
type CampaniaStats = { total_recipients: number; sent_count: number; opened_count: number; clicked_count: number; open_rate: number; click_rate: number };
type Recipient = { id: string; contactId: string; status: "pending" | "sent" | "opened" | "clicked" | "bounced" | "unsubscribed"; sentAt: string | null };

const STATUS_TONE: Record<CampaniaStatus, "neutral" | "primary" | "success" | "warning" | "danger"> = {
  draft: "neutral",
  scheduled: "warning",
  running: "primary",
  paused: "warning",
  completed: "success",
  cancelled: "danger",
};

const STATUS_LABELS: Record<CampaniaStatus, string> = {
  draft: "Borrador",
  scheduled: "Programada",
  running: "En curso",
  paused: "Pausada",
  completed: "Completada",
  cancelled: "Cancelada",
};

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
  const [twilioConfigured, setTwilioConfigured] = useState<boolean | null>(null);
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
    const bodyRes = (await res.json()) as { campanias: Campania[]; ses_configured?: boolean; twilio_configured?: boolean };
    setCampanias(bodyRes.campanias ?? []);
    setSesConfigured(bodyRes.ses_configured ?? false);
    setTwilioConfigured(bodyRes.twilio_configured ?? false);
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

  const kpis = useMemo(() => {
    const active = campanias.filter((c) => c.status === "running" || c.status === "scheduled").length;
    const totalSent = campanias.reduce((sum, c) => sum + c.sentCount, 0);
    const totalOpened = campanias.reduce((sum, c) => sum + c.openedCount, 0);
    const avgOpenRate = totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0;
    return { total: campanias.length, active, totalSent, avgOpenRate };
  }, [campanias]);

  return (
    <SaasShellLayout sidebar={<SaasSidebar activeId="campanias" tenantCompany={tenantCompany || undefined} tenantPlan={tenantPlan} />}>
      <div className="flex flex-col gap-6 pb-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <NelvyonDsSectionHeader
            eyebrow="Marketing"
            title="Campañas"
            subtitle="Motor multicanal email, SMS y notificación"
          />
          <SaasCan action="campanias.write">
            <NelvyonDsButton onClick={() => setShowWizard(true)}>+ Nueva campaña</NelvyonDsButton>
          </SaasCan>
        </div>

        {isViewer && (
          <SaasPermissionDenied message="Tu rol es solo lectura. Puedes ver campañas, pero no crear ni lanzar." />
        )}
        {sesConfigured === false && (
          <NelvyonDsCard className="border-warning/30 bg-warning/5 p-4">
            <p className="text-sm text-warning">
              <strong>Email no configurado:</strong> las variables <code className="text-xs">SES_FROM_EMAIL</code> y <code className="text-xs">SES_ACCESS_KEY_ID</code> no están definidas en el servidor. Los envíos de email fallarán hasta que las configures en Railway.
            </p>
          </NelvyonDsCard>
        )}
        {twilioConfigured === false && (
          <NelvyonDsCard className="border-warning/30 bg-warning/5 p-4">
            <p className="text-sm text-warning">
              <strong>SMS no configurado:</strong> define <code className="text-xs">TWILIO_ACCOUNT_SID</code>, <code className="text-xs">TWILIO_AUTH_TOKEN</code> y <code className="text-xs">TWILIO_FROM_NUMBER</code> en el servidor. Los envíos SMS fallarán hasta configurar Twilio.
            </p>
          </NelvyonDsCard>
        )}
        {error && (
          <NelvyonDsCard className="border-destructive/30 bg-destructive/5 p-4">
            <p className="text-sm text-destructive">⚠ {error}</p>
          </NelvyonDsCard>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiTile icon="✉️" label="Campañas" value={kpis.total} />
          <KpiTile icon="🚀" label="Activas" value={kpis.active} accent />
          <KpiTile icon="📤" label="Enviados" value={kpis.totalSent.toLocaleString("es-ES")} />
          <KpiTile icon="👁️" label="Open rate medio" value={`${kpis.avgOpenRate}%`} />
        </div>

        <CampaniaTemplateQuickLaunch onCreated={() => void loadCampanias()} />

        {/* Tabs */}
        <div className="flex flex-wrap gap-2">
          {(["all", "active", "completed", "draft"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                tab === t ? "bg-primary text-primary-foreground" : "bg-muted/30 text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "all" ? "Todas" : t === "active" ? "Activas" : t === "completed" ? "Completadas" : "Borradores"}
            </button>
          ))}
        </div>

        {/* Campaign list */}
        {loading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-muted/30" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <SaasEmptyState
            title={SAAS_EMPTY_TITLE}
            description={SAAS_EMPTY_DESCRIPTION}
            action={canManage ? <NelvyonDsButton onClick={() => setShowWizard(true)}>Crear primera campaña</NelvyonDsButton> : undefined}
          />
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((c) => {
              const openRate = c.sentCount > 0 ? Math.round((c.openedCount / c.sentCount) * 100) : 0;
              return (
                <NelvyonDsCard key={c.id} className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <button type="button" className="text-left text-base font-semibold text-foreground hover:text-primary transition-colors" onClick={() => void openDetail(c)}>
                      {c.name}
                    </button>
                    <div className="flex gap-2">
                      <NelvyonDsBadge tone="neutral">{c.channel}</NelvyonDsBadge>
                      <NelvyonDsBadge tone={STATUS_TONE[c.status]}>{STATUS_LABELS[c.status]}</NelvyonDsBadge>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-4">
                    <div><span className="text-muted-foreground/70">Destinatarios</span> <span className="text-foreground">{c.totalRecipients}</span></div>
                    <div><span className="text-muted-foreground/70">Enviados</span> <span className="text-foreground">{c.sentCount}</span></div>
                    <div><span className="text-muted-foreground/70">Open rate</span> <span className="text-foreground">{c.sentCount > 0 ? `${openRate}%` : "—"}</span></div>
                    <div><span className="text-muted-foreground/70">Prog.</span> <span className="text-foreground">{c.scheduledAt ? new Date(c.scheduledAt).toLocaleString("es-ES") : "—"}</span></div>
                  </div>
                </NelvyonDsCard>
              );
            })}
          </div>
        )}

        {/* New campaign wizard */}
        {showWizard && canManage && (
          <NelvyonDsCard className="space-y-4 p-5" title={`Nueva campaña (Paso ${step}/5)`}>
            {step === 1 && (
              <div className="grid gap-2">
                <input className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground" placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)} />
                <textarea className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground" placeholder="Descripción" value={description} onChange={(e) => setDescription(e.target.value)} />
                <select className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground" value={channel} onChange={(e) => setChannel(e.target.value as CampaniaChannel)}>
                  {CHANNELS.map((ch) => (
                    <option key={ch} value={ch}>{ch}</option>
                  ))}
                </select>
              </div>
            )}
            {step === 2 && (
              <div className="grid gap-2">
                {channel === "email" && (
                  <input className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground" placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
                )}
                <EmailEditor value={body} onChange={setBody} />
                <input className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground" placeholder="CTA text" value={ctaText} onChange={(e) => setCtaText(e.target.value)} />
                <input className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground" placeholder="CTA url" value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} />
              </div>
            )}
            {step === 3 && (
              <div className="grid gap-2">
                <select className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground" value={audienceMode} onChange={(e) => setAudienceMode(e.target.value as "all" | "status" | "stage" | "deal_stage" | "deal_open" | "tags")}>
                  <option value="all">Todos</option>
                  <option value="status">Por status contacto</option>
                  <option value="stage">Por stage contacto (legacy)</option>
                  <option value="deal_stage">Etapa de oportunidad</option>
                  <option value="deal_open">Pipeline abierto (deals)</option>
                  <option value="tags">Por tags</option>
                </select>
                {audienceMode !== "all" && audienceMode !== "deal_open" && (
                  <input className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground" placeholder="Valor del filtro" value={audienceValue} onChange={(e) => setAudienceValue(e.target.value)} />
                )}
              </div>
            )}
            {step === 4 && (
              <div className="grid gap-2">
                <select className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground" value={scheduleMode} onChange={(e) => setScheduleMode(e.target.value as "now" | "scheduled")}>
                  <option value="now">Enviar ahora</option>
                  <option value="scheduled">Programar</option>
                </select>
                {scheduleMode === "scheduled" && (
                  <input className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground" type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
                )}
              </div>
            )}
            {step === 5 && (
              <div className="space-y-1 text-sm text-muted-foreground">
                <div>Nombre: {name || "(sin nombre)"}</div>
                <div>Canal: {channel}</div>
                <div>Audiencia: {audienceMode}</div>
                <div>Envío: {scheduleMode === "now" ? "ahora" : `programado ${scheduledAt}`}</div>
              </div>
            )}
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
                <NelvyonDsButton key={btn.label} variant="ghost" onClick={btn.action}>{btn.label}</NelvyonDsButton>
              ))}
            </div>
          </NelvyonDsCard>
        )}

        {/* Detail panel */}
        {selected && (
          <NelvyonDsCard className="space-y-4 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-base font-semibold text-foreground">{selected.name}</div>
              <NelvyonDsBadge tone={STATUS_TONE[selected.status]}>{STATUS_LABELS[selected.status]}</NelvyonDsBadge>
            </div>
            <div className="text-sm text-muted-foreground">{selected.description ?? "Sin descripción"}</div>
            <div className="grid gap-3 sm:grid-cols-5">
              {[
                { label: "Enviados", value: stats?.sent_count ?? 0 },
                { label: "Abiertos", value: stats?.opened_count ?? 0 },
                { label: "Clicks", value: stats?.clicked_count ?? 0 },
                { label: "Open Rate", value: `${stats?.open_rate ?? 0}%` },
                { label: "Click Rate", value: `${stats?.click_rate ?? 0}%` },
              ].map((s) => (
                <div key={s.label} className="rounded-lg border border-border bg-muted/10 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</p>
                  <p className="mt-1 text-xl font-bold text-foreground">{s.value}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <SaasCan action="campanias.launch">
                <NelvyonDsButton onClick={() => void launchSelected()}>Lanzar</NelvyonDsButton>
              </SaasCan>
              <SaasCan action="campanias.write">
                <NelvyonDsButton variant="ghost" onClick={() => void pauseSelected()}>Pausar</NelvyonDsButton>
                <NelvyonDsButton variant="ghost" onClick={() => void duplicateSelected()}>Duplicar</NelvyonDsButton>
              </SaasCan>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Destinatarios</p>
              {recipients.length === 0 ? (
                <SaasEmptyState title={SAAS_EMPTY_TITLE} description="Lanza la campaña para ver destinatarios aquí." className="p-4" />
              ) : (
                recipients.map((r) => (
                  <div key={r.id} className="flex items-center justify-between rounded-lg border border-border bg-muted/10 px-3 py-2 text-sm">
                    <div className="text-muted-foreground">{r.contactId}</div>
                    <div className="flex items-center gap-2">
                      <NelvyonDsStatusDot status={r.status === "sent" || r.status === "opened" || r.status === "clicked" ? "ok" : "pending"} />
                      <span className="text-muted-foreground">{r.status}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </NelvyonDsCard>
        )}
      </div>
    </SaasShellLayout>
  );
}
