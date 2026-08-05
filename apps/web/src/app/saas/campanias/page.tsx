"use client";

/**
 * /saas/campanias sobre dos pantallas oficiales de W3CRM:
 *
 *   - `(cms)/email-template` para el filtro y el listado: dos cajas
 *     `filter cm-content-box box-primary`, cada una con su `content-title`
 *     (`cpa` con icono + `tools` con el `SlideToolHeader` que alterna
 *     `collapse`/`expand`), su `<Collapse>` y su
 *     `cm-content-body form excerpt` > `card-body`. La tabla es la misma
 *     `table table-responsive-lg table-striped table-condensed flip-content`
 *     dentro de `table-responsive` > `#content_wrapper.dataTables_wrapper.no-footer`,
 *     con el pie `d-sm-flex ... dataTables_info` +
 *     `dataTables_paginate paging_simple_numbers` y su paginacion de 5 por
 *     pagina (`prePage` / `changeCPage` / `nextPage`).
 *   - `(cms)/add-email` para el asistente de alta: la misma caja plegable con
 *     `card-body` > `row` > `col-xl-6` de campos, el hueco
 *     `custom-ekeditor ct-ticket mb-3` para el editor y el `text-end` con el
 *     boton de guardar.
 *
 * Logica de NELVYON intacta: `loadTenant` (con su redireccion a login y a
 * onboarding), `loadCampanias` (con `ses_configured` y `twilio_configured`),
 * `refresh`, las pestanas all/active/completed/draft, `buildAudienceFilter`,
 * `createCampania` (POST + PATCH de programacion + launch), `openDetail`
 * (stats y recipients en paralelo), `launchSelected`, `pauseSelected`,
 * `duplicateSelected`, los KPIs y el asistente de 5 pasos con `EmailEditor`.
 * RBAC igual: `SaasCan` para `campanias.write` y `campanias.launch`, y
 * `SaasPermissionDenied` para el rol de solo lectura.
 *
 * Guardas anadidas: estado o canal fuera de catalogo -> badge neutro con la
 * etiqueta cruda en vez de `undefined`; `campanias` no-array -> lista vacia;
 * contadores ausentes normalizados con `num()`; fechas invalidas -> "—".
 */
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Collapse from "react-bootstrap/Collapse";

import { SaasCan } from "@/features/saas-shell/components/SaasCan";
import { SaasPermissionDenied } from "@/features/saas-shell/components/SaasPermissionDenied";
import { useSaasPermissions } from "@/features/saas-shell/useSaasPermissions";
import { CampaniaTemplateQuickLaunch } from "@/features/saas-campanias/components/CampaniaTemplateQuickLaunch";
import { EmailEditor } from "@/features/email-editor/EmailEditor";
import { SaasW3crmShell } from "@/features/saas-w3crm/components/SaasW3crmShell";
import { W3crmPageTitle } from "@/features/saas-w3crm/components/W3crmPageTitle";
import { W3crmEmptyState, W3crmKpiTile } from "@/features/saas-w3crm/components/W3crmUi";

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

/** Estado -> badge de W3CRM. */
const STATUS_BADGE: Record<CampaniaStatus, string> = {
  draft: "badge-secondary",
  scheduled: "badge-warning",
  running: "badge-primary",
  paused: "badge-warning",
  completed: "badge-success",
  cancelled: "badge-danger",
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

const CHANNEL_LABELS: Record<CampaniaChannel, string> = {
  email: "Email",
  sms: "SMS",
  notification: "Notificación",
  multi: "Multicanal",
};

/** Un estado o canal fuera de catalogo no puede dejar la pantalla en blanco. */
function badgeEstado(s: CampaniaStatus | string) {
  return STATUS_BADGE[s as CampaniaStatus] ?? "badge-secondary";
}
function etiquetaEstado(s: CampaniaStatus | string) {
  return STATUS_LABELS[s as CampaniaStatus] ?? String(s || "Sin estado");
}
function etiquetaCanal(c: CampaniaChannel | string) {
  return CHANNEL_LABELS[c as CampaniaChannel] ?? String(c || "—");
}

/** Contadores que pueden llegar nulos o como texto. */
function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function fecha(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("es-ES");
}

const TABS = [
  { id: "all", label: "Todas" },
  { id: "active", label: "Activas" },
  { id: "completed", label: "Completadas" },
  { id: "draft", label: "Borradores" },
] as const;

export default function SaasCampaniasPage() {
  const router = useRouter();
  const { can, isViewer } = useSaasPermissions();
  const canManage = can("campanias.write");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // El nombre y el plan del tenant los pinta ya el propio shell de W3CRM
  // (`SaasW3crmShell` -> `useSaasPermissions`), asi que aqui no se duplican en
  // estado local; `loadTenant` se conserva por sus redirecciones.
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

  // Cajas plegables de la plantilla.
  const [openFiltro, setOpenFiltro] = useState(true);
  const [openLista, setOpenLista] = useState(true);
  const [openDetalle, setOpenDetalle] = useState(true);
  const [openAsistente, setOpenAsistente] = useState(true);

  async function loadTenant() {
    const res = await fetch("/api/saas/dashboard", { credentials: "same-origin" });
    if (res.status === 401) {
      router.replace(`/auth/login?next=${encodeURIComponent("/saas/campanias")}`);
      return;
    }
    if (!res.ok) return;
    const bodyRes = (await res.json()) as { tenant?: { companyName: string; plan: "starter" | "pro" | "enterprise"; onboardingCompleted: boolean } };
    if (!bodyRes.tenant) return;
    if (!bodyRes.tenant.onboardingCompleted) {
      router.replace("/saas/onboarding");
    }
  }

  async function loadCampanias() {
    const res = await fetch("/api/saas/campanias", { credentials: "same-origin" });
    if (res.status === 401) {
      router.replace(`/auth/login?next=${encodeURIComponent("/saas/campanias")}`);
      return;
    }
    if (!res.ok) throw new Error("No se pudieron cargar campanias");
    const bodyRes = (await res.json()) as { campanias?: Campania[]; ses_configured?: boolean; twilio_configured?: boolean };
    setCampanias(Array.isArray(bodyRes.campanias) ? bodyRes.campanias : []);
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

  // Paginacion de la plantilla: 5 registros por pagina.
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPage = 5;
  const lastIndex = currentPage * recordsPage;
  const firstIndex = lastIndex - recordsPage;
  const records = filtered.slice(firstIndex, lastIndex);
  const npage = Math.max(1, Math.ceil(filtered.length / recordsPage));
  const number = [...Array(npage + 1).keys()].slice(1);
  function prePage() { if (currentPage !== 1) setCurrentPage(currentPage - 1); }
  function changeCPage(id: number) { setCurrentPage(id); }
  function nextPage() { if (currentPage !== npage) setCurrentPage(currentPage + 1); }
  // Al cambiar de pestana la pagina actual puede quedar fuera de rango.
  useEffect(() => { setCurrentPage(1); }, [tab]);

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
    setOpenDetalle(true);
    const [statsRes, recRes] = await Promise.all([
      fetch(`/api/saas/campanias/${c.id}/stats`, { credentials: "same-origin" }),
      fetch(`/api/saas/campanias/${c.id}/recipients`, { credentials: "same-origin" }),
    ]);
    if (statsRes.ok) {
      const b = (await statsRes.json()) as { stats?: CampaniaStats };
      setStats(b.stats ?? null);
    } else {
      setStats(null);
    }
    if (recRes.ok) {
      const b = (await recRes.json()) as { recipients?: Recipient[] };
      setRecipients(Array.isArray(b.recipients) ? b.recipients : []);
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
    const totalSent = campanias.reduce((sum, c) => sum + num(c.sentCount), 0);
    const totalOpened = campanias.reduce((sum, c) => sum + num(c.openedCount), 0);
    const avgOpenRate = totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0;
    return { total: campanias.length, active, totalSent, avgOpenRate };
  }, [campanias]);

  /** Cabecera plegable de la plantilla, identica en las cuatro cajas. */
  const cabecera = (icono: string, titulo: string, abierto: boolean, alternar: () => void) => (
    <div className="content-title">
      <div className="cpa">
        <i className={`${icono} me-2`} />{titulo}
      </div>
      <div className="tools">
        <Link
          href="#"
          scroll={false}
          className={`SlideToolHeader ${abierto ? "collapse" : "expand"}`}
          role="button"
          aria-expanded={abierto}
          aria-label={`Plegar ${titulo}`}
          onClick={(e) => { e.preventDefault(); alternar(); }}
        >
          <i className="fas fa-angle-up" />
        </Link>
      </div>
    </div>
  );

  return (
    <SaasW3crmShell>
      <W3crmPageTitle mainTitle="Campañas" parentTitle="Comunicación" pageTitle="Campañas" />
      <div className="container-fluid">
        <div className="row">
          <div className="col-xl-12">
            {isViewer && (
              <SaasPermissionDenied message="Tu rol es solo lectura. Puedes ver campañas, pero no crear ni lanzar." />
            )}
            {sesConfigured === false && (
              <div className="alert alert-warning" role="alert">
                <strong>Email no configurado:</strong> las variables <code>SES_FROM_EMAIL</code> y{" "}
                <code>SES_ACCESS_KEY_ID</code> no están definidas en el servidor. Los envíos de email
                fallarán hasta que las configures en Railway.
              </div>
            )}
            {twilioConfigured === false && (
              <div className="alert alert-warning" role="alert">
                <strong>SMS no configurado:</strong> define <code>TWILIO_ACCOUNT_SID</code>,{" "}
                <code>TWILIO_AUTH_TOKEN</code> y <code>TWILIO_FROM_NUMBER</code> en el servidor. Los
                envíos SMS fallarán hasta configurar Twilio.
              </div>
            )}
            {error && (
              <div className="alert alert-danger alert-dismissible fade show" role="alert">
                {error}
                <button type="button" className="btn-close" aria-label="Cerrar" onClick={() => setError(null)} />
              </div>
            )}
          </div>

          {/* KPIs */}
          <div className="col-xl-3 col-sm-6">
            <W3crmKpiTile label="Campañas" value={kpis.total} />
          </div>
          <div className="col-xl-3 col-sm-6">
            <W3crmKpiTile label="Activas" value={kpis.active} accent />
          </div>
          <div className="col-xl-3 col-sm-6">
            <W3crmKpiTile label="Enviados" value={kpis.totalSent.toLocaleString("es-ES")} />
          </div>
          <div className="col-xl-3 col-sm-6">
            <W3crmKpiTile label="Open rate medio" value={`${kpis.avgOpenRate}%`} />
          </div>

          <div className="col-xl-12">
            {/* Caja de filtro */}
            <div className="filter cm-content-box box-primary">
              {cabecera("fas fa-filter", "Filtro", openFiltro, () => setOpenFiltro(!openFiltro))}
              <Collapse in={openFiltro}>
                <div className="cm-content-body form excerpt">
                  <div className="card-body pb-3">
                    <div className="row">
                      <div className="col-xl-12">
                        {TABS.map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            className={`btn btn-sm me-2 mb-2 ${tab === t.id ? "btn-primary" : "btn-primary light"}`}
                            onClick={() => setTab(t.id)}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </Collapse>
            </div>

            <SaasCan action="campanias.write">
              <div className="mb-3">
                <ul className="d-flex align-items-center">
                  <li>
                    <button type="button" className="btn btn-primary" onClick={() => { setShowWizard(true); setOpenAsistente(true); }}>
                      + Nueva campaña
                    </button>
                  </li>
                </ul>
              </div>
            </SaasCan>

            <CampaniaTemplateQuickLaunch onCreated={() => void loadCampanias()} />

            {/* Asistente de alta, sobre `(cms)/add-email` */}
            {showWizard && canManage && (
              <div className="filter cm-content-box box-primary">
                {cabecera("far fa-envelope", `Nueva campaña (Paso ${step}/5)`, openAsistente, () => setOpenAsistente(!openAsistente))}
                <Collapse in={openAsistente}>
                  <div className="cm-content-body form excerpt">
                    <div className="card-body">
                      <div className="row" data-testid="asistente-campania">
                        {step === 1 && (
                          <>
                            <div className="col-xl-6">
                              <div className="mb-3">
                                <label className="form-label" htmlFor="camp-nombre">Nombre</label>
                                <input id="camp-nombre" type="text" className="form-control" value={name} onChange={(e) => setName(e.target.value)} />
                                <div className="form-text">Nombre interno con el que verás la campaña en el listado.</div>
                              </div>
                              <div className="mb-3">
                                <label className="form-label" htmlFor="camp-descripcion">Descripción</label>
                                <textarea id="camp-descripcion" className="form-control" rows={5} value={description} onChange={(e) => setDescription(e.target.value)} />
                                <div className="form-text">Describe el objetivo de esta campaña.</div>
                              </div>
                            </div>
                            <div className="col-xl-6">
                              <div className="mb-3">
                                <label className="form-label" htmlFor="camp-canal">Canal</label>
                                <select id="camp-canal" className="form-control" value={channel} onChange={(e) => setChannel(e.target.value as CampaniaChannel)}>
                                  {CHANNELS.map((ch) => (
                                    <option key={ch} value={ch}>{CHANNEL_LABELS[ch]}</option>
                                  ))}
                                </select>
                                <div className="form-text">El canal determina qué integración se usa al lanzar.</div>
                              </div>
                            </div>
                          </>
                        )}

                        {step === 2 && (
                          <>
                            {channel === "email" && (
                              <div className="col-xl-6">
                                <div className="mb-3">
                                  <label className="form-label" htmlFor="camp-asunto">Asunto</label>
                                  <input id="camp-asunto" type="text" className="form-control" value={subject} onChange={(e) => setSubject(e.target.value)} />
                                </div>
                              </div>
                            )}
                            <div className="col-xl-6">
                              <div className="mb-3">
                                <label className="form-label" htmlFor="camp-cta-texto">Texto del CTA</label>
                                <input id="camp-cta-texto" type="text" className="form-control" value={ctaText} onChange={(e) => setCtaText(e.target.value)} />
                              </div>
                              <div className="mb-3">
                                <label className="form-label" htmlFor="camp-cta-url">URL del CTA</label>
                                <input id="camp-cta-url" type="url" className="form-control" value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} />
                              </div>
                            </div>
                            <div className="col-xl-12">
                              <div className="mb-3">
                                <label className="form-label">Contenido</label>
                                <div className="custom-ekeditor ct-ticket mb-3">
                                  <EmailEditor value={body} onChange={setBody} />
                                </div>
                                <div className="form-text mb-3">
                                  Las variables se sustituyen por los datos del contacto al enviar.
                                </div>
                              </div>
                            </div>
                          </>
                        )}

                        {step === 3 && (
                          <>
                            <div className="col-xl-6">
                              <div className="mb-3">
                                <label className="form-label" htmlFor="camp-audiencia">Audiencia</label>
                                <select id="camp-audiencia" className="form-control" value={audienceMode} onChange={(e) => setAudienceMode(e.target.value as typeof audienceMode)}>
                                  <option value="all">Todos</option>
                                  <option value="status">Por status contacto</option>
                                  <option value="stage">Por stage contacto (legacy)</option>
                                  <option value="deal_stage">Etapa de oportunidad</option>
                                  <option value="deal_open">Pipeline abierto (deals)</option>
                                  <option value="tags">Por tags</option>
                                </select>
                              </div>
                            </div>
                            {audienceMode !== "all" && audienceMode !== "deal_open" && (
                              <div className="col-xl-6">
                                <div className="mb-3">
                                  <label className="form-label" htmlFor="camp-audiencia-valor">Valor del filtro</label>
                                  <input id="camp-audiencia-valor" type="text" className="form-control" value={audienceValue} onChange={(e) => setAudienceValue(e.target.value)} />
                                </div>
                              </div>
                            )}
                          </>
                        )}

                        {step === 4 && (
                          <>
                            <div className="col-xl-6">
                              <div className="mb-3">
                                <label className="form-label" htmlFor="camp-envio">Envío</label>
                                <select id="camp-envio" className="form-control" value={scheduleMode} onChange={(e) => setScheduleMode(e.target.value as "now" | "scheduled")}>
                                  <option value="now">Enviar ahora</option>
                                  <option value="scheduled">Programar</option>
                                </select>
                              </div>
                            </div>
                            {scheduleMode === "scheduled" && (
                              <div className="col-xl-6">
                                <div className="mb-3">
                                  <label className="form-label" htmlFor="camp-fecha">Fecha de envío</label>
                                  <input id="camp-fecha" type="datetime-local" className="form-control" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
                                </div>
                              </div>
                            )}
                          </>
                        )}

                        {step === 5 && (
                          <div className="col-xl-12">
                            <div className="table-responsive">
                              <table className="table table-responsive-lg table-striped table-condensed flip-content">
                                <tbody>
                                  <tr><td>Nombre</td><td><strong>{name || "(sin nombre)"}</strong></td></tr>
                                  <tr><td>Canal</td><td><strong>{etiquetaCanal(channel)}</strong></td></tr>
                                  <tr><td>Audiencia</td><td><strong>{audienceMode}</strong></td></tr>
                                  <tr><td>Envío</td><td><strong>{scheduleMode === "now" ? "Ahora" : `Programado ${scheduledAt || "—"}`}</strong></td></tr>
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        <div className="col-xl-12">
                          <div className="text-end">
                            <button type="button" className="btn btn-primary light me-2" onClick={() => setStep((s) => Math.max(1, s - 1))}>
                              Atrás
                            </button>
                            {step < 5 && (
                              <button type="button" className="btn btn-primary me-2" onClick={() => setStep((s) => Math.min(5, s + 1))}>
                                Siguiente
                              </button>
                            )}
                            {step === 5 && (
                              <>
                                <button type="button" className="btn btn-primary me-2" onClick={() => void createCampania(false)}>
                                  Guardar
                                </button>
                                <button type="button" className="btn btn-primary me-2" onClick={() => void createCampania(scheduleMode === "now")}>
                                  Guardar y lanzar
                                </button>
                              </>
                            )}
                            <button type="button" className="btn btn-danger light" onClick={() => setShowWizard(false)}>
                              Cerrar
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Collapse>
              </div>
            )}

            {/* Listado */}
            <div className="filter cm-content-box box-primary">
              {cabecera("far fa-envelope", "Listado de campañas", openLista, () => setOpenLista(!openLista))}
              <Collapse in={openLista}>
                <div className="cm-content-body form excerpt">
                  <div className="card-body py-3">
                    <div className="table-responsive">
                      <div id="content_wrapper" className="dataTables_wrapper no-footer">
                        {loading ? (
                          <div className="d-flex align-items-center justify-content-center py-5" role="status">
                            <div className="spinner-border text-primary me-3" aria-hidden="true" />
                            <span className="text-muted">Cargando campañas…</span>
                          </div>
                        ) : filtered.length === 0 ? (
                          <W3crmEmptyState
                            title="Sin campañas"
                            description="Crea tu primera campaña o importa una plantilla."
                          />
                        ) : (
                          <>
                            <table className="table table-responsive-lg table-striped table-condensed flip-content">
                              <thead>
                                <tr>
                                  <th className="text-black">Nombre</th>
                                  <th className="text-black">Canal</th>
                                  <th className="text-black">Estado</th>
                                  <th className="text-black">Destinatarios</th>
                                  <th className="text-black">Enviados</th>
                                  <th className="text-black">Open rate</th>
                                  <th className="text-black">Programada</th>
                                  <th className="text-end text-black">Acciones</th>
                                </tr>
                              </thead>
                              <tbody>
                                {records.map((c) => {
                                  const enviados = num(c.sentCount);
                                  const openRate = enviados > 0 ? Math.round((num(c.openedCount) / enviados) * 100) : 0;
                                  return (
                                    <tr key={c.id}>
                                      <td>{c.name || "—"}</td>
                                      <td>{etiquetaCanal(c.channel)}</td>
                                      <td><span className={`badge ${badgeEstado(c.status)}`}>{etiquetaEstado(c.status)}</span></td>
                                      <td>{num(c.totalRecipients)}</td>
                                      <td>{enviados}</td>
                                      <td>{enviados > 0 ? `${openRate}%` : "—"}</td>
                                      <td>{fecha(c.scheduledAt)}</td>
                                      <td className="text-end">
                                        <button
                                          type="button"
                                          className="btn btn-primary btn-sm content-icon"
                                          aria-label={`Ver detalle de ${c.name || "la campaña"}`}
                                          onClick={() => void openDetail(c)}
                                        >
                                          <i className="fa fa-eye" />
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                            <div className="d-sm-flex text-center justify-content-between align-items-center">
                              <div className="dataTables_info">
                                Mostrando {firstIndex + 1} a {Math.min(lastIndex, filtered.length)} de {filtered.length} campañas
                              </div>
                              <div className="dataTables_paginate paging_simple_numbers justify-content-center" id="campanias_paginate">
                                <button
                                  type="button"
                                  className={`paginate_button previous ${currentPage === 1 ? "disabled" : ""}`}
                                  aria-label="Página anterior"
                                  onClick={prePage}
                                >
                                  <i className="fa-solid fa-angle-left" />
                                </button>
                                <span>
                                  {number.map((n) => (
                                    <button
                                      type="button"
                                      className={`paginate_button ${currentPage === n ? "current" : ""}`}
                                      key={n}
                                      aria-label={`Página ${n}`}
                                      aria-current={currentPage === n ? "page" : undefined}
                                      onClick={() => changeCPage(n)}
                                    >
                                      {n}
                                    </button>
                                  ))}
                                </span>
                                <button
                                  type="button"
                                  className={`paginate_button next ${currentPage === npage ? "disabled" : ""}`}
                                  aria-label="Página siguiente"
                                  onClick={nextPage}
                                >
                                  <i className="fa-solid fa-angle-right" />
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Collapse>
            </div>

            {/* Detalle */}
            {selected && (
              <div className="filter cm-content-box box-primary" data-testid="detalle-campania">
                {cabecera("far fa-envelope", selected.name || "Campaña", openDetalle, () => setOpenDetalle(!openDetalle))}
                <Collapse in={openDetalle}>
                  <div className="cm-content-body form excerpt">
                    <div className="card-body">
                      <div className="d-flex align-items-center mb-3">
                        <span className={`badge ${badgeEstado(selected.status)} me-2`}>{etiquetaEstado(selected.status)}</span>
                        <span className="text-muted fs-14">{selected.description ?? "Sin descripción"}</span>
                      </div>
                      <div className="row">
                        {[
                          { label: "Enviados", value: num(stats?.sent_count) },
                          { label: "Abiertos", value: num(stats?.opened_count) },
                          { label: "Clicks", value: num(stats?.clicked_count) },
                          { label: "Open Rate", value: `${num(stats?.open_rate)}%` },
                          { label: "Click Rate", value: `${num(stats?.click_rate)}%` },
                        ].map((s) => (
                          <div className="col-xl col-md-4 col-6 mb-3" key={s.label}>
                            <div className="card mb-0">
                              <div className="card-body">
                                <p className="mb-1 fs-14 text-muted">{s.label}</p>
                                <h4 className="mb-0">{s.value}</h4>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mb-3">
                        <SaasCan action="campanias.launch">
                          <button type="button" className="btn btn-primary btn-sm me-2" onClick={() => void launchSelected()}>Lanzar</button>
                        </SaasCan>
                        <SaasCan action="campanias.write">
                          <button type="button" className="btn btn-primary light btn-sm me-2" onClick={() => void pauseSelected()}>Pausar</button>
                          <button type="button" className="btn btn-primary light btn-sm me-2" onClick={() => void duplicateSelected()}>Duplicar</button>
                        </SaasCan>
                        <button type="button" className="btn btn-danger light btn-sm" onClick={() => setSelected(null)}>Cerrar</button>
                      </div>
                      <div className="table-responsive">
                        {recipients.length === 0 ? (
                          <W3crmEmptyState title="Sin destinatarios" description="Lanza la campaña para ver destinatarios aquí." />
                        ) : (
                          <table className="table table-responsive-lg table-striped table-condensed flip-content">
                            <thead>
                              <tr>
                                <th className="text-black">Contacto</th>
                                <th className="text-black">Estado</th>
                                <th className="text-black">Enviado</th>
                              </tr>
                            </thead>
                            <tbody>
                              {recipients.map((r) => (
                                <tr key={r.id}>
                                  <td>{r.contactId}</td>
                                  <td>
                                    <span className={`badge ${
                                      r.status === "sent" || r.status === "opened" || r.status === "clicked"
                                        ? "badge-success"
                                        : r.status === "bounced" || r.status === "unsubscribed"
                                          ? "badge-danger"
                                          : "badge-primary"
                                    }`}>
                                      {r.status}
                                    </span>
                                  </td>
                                  <td>{fecha(r.sentAt)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>
                  </div>
                </Collapse>
              </div>
            )}
          </div>
        </div>
      </div>
    </SaasW3crmShell>
  );
}
