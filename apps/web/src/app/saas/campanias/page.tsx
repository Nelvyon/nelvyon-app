"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { NelvyonDsBadge, NelvyonDsButton, NelvyonDsCard, NelvyonDsSectionHeader, NelvyonDsStatusDot } from "@/design-system/components";
import { SaasEmptyState, SAAS_EMPTY_DESCRIPTION, SAAS_EMPTY_TITLE } from "@/features/saas-shell/components/SaasEmptyState";
import { SaasCan } from "@/features/saas-shell/components/SaasCan";
import { SaasPermissionDenied } from "@/features/saas-shell/components/SaasPermissionDenied";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";
import { useSaasPermissions } from "@/features/saas-shell/useSaasPermissions";

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
  const [audienceMode, setAudienceMode] = useState<"all" | "status" | "stage" | "tags">("all");
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
    const bodyRes = (await res.json()) as { campanias: Campania[] };
    setCampanias(bodyRes.campanias ?? []);
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
    <div className="min-h-screen bg-background">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <SaasSidebar activeId="campanias" tenantCompany={tenantCompany || undefined} tenantPlan={tenantPlan} />
        <main className="space-y-6">
          <NelvyonDsSectionHeader title="Campanias" subtitle="Motor multicanal email, sms y notificacion" />
          {isViewer ? (
            <SaasPermissionDenied message="Tu rol es solo lectura. Puedes ver campañas, pero no crear ni lanzar." />
          ) : null}
          <div className="flex flex-wrap gap-2">
            {(["all", "active", "completed", "draft"] as const).map((t) => (
              <NelvyonDsButton key={t} onClick={() => setTab(t)}>
                {t === "all" ? "Todas" : t === "active" ? "Activas" : t === "completed" ? "Completadas" : "Borradores"}
              </NelvyonDsButton>
            ))}
            <SaasCan action="campanias.write">
              <NelvyonDsButton onClick={() => setShowWizard(true)}>Nueva campania</NelvyonDsButton>
            </SaasCan>
          </div>
          {error ? <NelvyonDsCard className="text-sm text-destructive">{error}</NelvyonDsCard> : null}
          {loading ? (
            <NelvyonDsCard>Cargando campanias...</NelvyonDsCard>
          ) : filtered.length === 0 ? (
            <SaasEmptyState
              title={SAAS_EMPTY_TITLE}
              description={SAAS_EMPTY_DESCRIPTION}
              action={
                canManage ? (
                  <NelvyonDsButton onClick={() => setShowWizard(true)}>Crear primera campania</NelvyonDsButton>
                ) : undefined
              }
            />
          ) : (
            <div className="space-y-3">
              {filtered.map((c) => {
                const openRate = c.sentCount > 0 ? ((0 / c.sentCount) * 100).toFixed(0) : "0";
                return (
                  <NelvyonDsCard key={c.id} className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <button className="text-left text-base font-semibold text-foreground hover:text-primary" onClick={() => void openDetail(c)}>
                        {c.name}
                      </button>
                      <div className="flex gap-2">
                        <NelvyonDsBadge>{c.channel}</NelvyonDsBadge>
                        <NelvyonDsBadge>{c.status}</NelvyonDsBadge>
                      </div>
                    </div>
                    <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                      <div>Recipients: {c.totalRecipients}</div>
                      <div>Enviados: {c.sentCount}</div>
                      <div>Open rate: {openRate}%</div>
                      <div>Programada: {c.scheduledAt ? new Date(c.scheduledAt).toLocaleString() : "No"}</div>
                    </div>
                  </NelvyonDsCard>
                );
              })}
            </div>
          )}

          {showWizard && canManage ? (
            <NelvyonDsCard className="space-y-4">
              <div className="text-base font-semibold text-foreground">Nueva campania (Paso {step}/5)</div>
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
                  <textarea className="rounded-md border bg-background px-3 py-2 text-sm" placeholder="Body" value={body} onChange={(e) => setBody(e.target.value)} />
                  <input className="rounded-md border bg-background px-3 py-2 text-sm" placeholder="CTA text" value={ctaText} onChange={(e) => setCtaText(e.target.value)} />
                  <input className="rounded-md border bg-background px-3 py-2 text-sm" placeholder="CTA url" value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} />
                </div>
              ) : null}
              {step === 3 ? (
                <div className="grid gap-2">
                  <select className="rounded-md border bg-background px-3 py-2 text-sm" value={audienceMode} onChange={(e) => setAudienceMode(e.target.value as "all" | "status" | "stage" | "tags")}>
                    <option value="all">Todos</option>
                    <option value="status">Por status</option>
                    <option value="stage">Por stage</option>
                    <option value="tags">Por tags</option>
                  </select>
                  {audienceMode !== "all" ? (
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
                <NelvyonDsButton onClick={() => setStep((s) => Math.max(1, s - 1))}>Atras</NelvyonDsButton>
                {step < 5 ? <NelvyonDsButton onClick={() => setStep((s) => Math.min(5, s + 1))}>Siguiente</NelvyonDsButton> : null}
                {step === 5 ? (
                  <>
                    <NelvyonDsButton onClick={() => void createCampania(false)}>Guardar</NelvyonDsButton>
                    <NelvyonDsButton onClick={() => void createCampania(scheduleMode === "now")}>Guardar y lanzar</NelvyonDsButton>
                  </>
                ) : null}
                <NelvyonDsButton onClick={() => setShowWizard(false)}>Cerrar</NelvyonDsButton>
              </div>
            </NelvyonDsCard>
          ) : null}

          {selected ? (
            <NelvyonDsCard className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-base font-semibold text-foreground">{selected.name}</div>
                <NelvyonDsBadge>{selected.status}</NelvyonDsBadge>
              </div>
              <div className="text-sm text-muted-foreground">{selected.description || "Sin descripcion"}</div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <NelvyonDsCard>Enviados: {stats?.sent_count ?? 0}</NelvyonDsCard>
                <NelvyonDsCard>Abiertos: {stats?.opened_count ?? 0}</NelvyonDsCard>
                <NelvyonDsCard>Clicks: {stats?.clicked_count ?? 0}</NelvyonDsCard>
                <NelvyonDsCard>Open Rate: {stats?.open_rate ?? 0}%</NelvyonDsCard>
                <NelvyonDsCard>Click Rate: {stats?.click_rate ?? 0}%</NelvyonDsCard>
              </div>
              <div className="flex flex-wrap gap-2">
                <SaasCan action="campanias.launch">
                  <NelvyonDsButton onClick={() => void launchSelected()}>Lanzar</NelvyonDsButton>
                </SaasCan>
                <SaasCan action="campanias.write">
                  <NelvyonDsButton onClick={() => void pauseSelected()}>Pausar</NelvyonDsButton>
                  <NelvyonDsButton onClick={() => void duplicateSelected()}>Duplicar</NelvyonDsButton>
                </SaasCan>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium text-foreground">Recipients</div>
                {recipients.length === 0 ? (
                  <SaasEmptyState title={SAAS_EMPTY_TITLE} description="Lanza la campania para ver destinatarios aquí." className="p-4" />
                ) : (
                  recipients.map((r) => (
                    <div key={r.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
                      <div>{r.contactId}</div>
                      <div className="flex items-center gap-2">
                        <NelvyonDsStatusDot status={r.status === "sent" || r.status === "opened" || r.status === "clicked" ? "ok" : "pending"} />
                        <span>{r.status}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </NelvyonDsCard>
          ) : null}
        </main>
      </div>
    </div>
  );
}
