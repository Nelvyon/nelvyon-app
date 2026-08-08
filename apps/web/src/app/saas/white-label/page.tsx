"use client";

/**
 * /saas/white-label sobre `(cms)/content` de W3CRM, con las piezas ya portadas.
 * Mapeo: las cuatro pestañas -> `nav nav-tabs`; cada sección -> `W3crmContentBox`;
 * la vista previa y los avisos DNS -> `card` de la plantilla. Sin componentes
 * nuevos y sin restos del design-system antiguo.
 *
 * La vista previa conserva a propósito sus colores en línea: son el dato que el
 * usuario está editando, no estilo de la plantilla.
 *
 * SANEADO: un `stripeConnectStatus` fuera de catálogo ya no deja la fila sin
 * etiqueta ni color; la fecha de alta pasa por un guarda para no imprimir
 * "Invalid Date"; y ningún campo de texto llega crudo a `[0]` ni a un `value`.
 *
 * Lógica de NELVYON intacta: `GET /api/saas/white-label` y `POST` con el guardado
 * de branding y las tres acciones de Stripe Connect —`create-stripe-connect`,
 * `stripe-connect-onboarding-url` (con su `returnUrl`/`refreshUrl` y la
 * redirección del navegador) y `sync-stripe-connect`—, además de los avisos de
 * 3 s y el gate por estado de la cuenta.
 */
import { useCallback, useEffect, useState } from "react";

import { SaasW3crmShell } from "@/features/saas-w3crm/components/SaasW3crmShell";
import { W3crmPageTitle } from "@/features/saas-w3crm/components/W3crmPageTitle";
import { W3crmCargando, W3crmContentBox } from "@/features/saas-w3crm/components/W3crmContentBox";

// ── Types (mirror SaasWhiteLabelService) ──────────────────────────────────────
type StripeConnectStatus = "not_connected" | "pending" | "active" | "restricted";

interface WhiteLabelConfig {
  id?: string;
  tenantId?: string;
  agencyName: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  customDomain: string | null;
  faviconUrl: string | null;
  supportEmail: string | null;
  footerText: string | null;
  hideNelvyonBranding: boolean;
  active?: boolean;
  stripeConnectAccountId: string | null;
  stripeConnectStatus: StripeConnectStatus;
  stripeChargesEnabled: boolean;
  stripePayoutsEnabled: boolean;
  stripeConnectOnboardedAt: string | null;
}

const DEFAULTS: WhiteLabelConfig = {
  agencyName: "",
  logoUrl: null,
  primaryColor: "#6366f1",
  secondaryColor: "#8b5cf6",
  customDomain: null,
  faviconUrl: null,
  supportEmail: null,
  footerText: null,
  hideNelvyonBranding: false,
  stripeConnectAccountId: null,
  stripeConnectStatus: "not_connected",
  stripeChargesEnabled: false,
  stripePayoutsEnabled: false,
  stripeConnectOnboardedAt: null,
};

const PRESET_COLORS = ["#6366f1", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#8b5cf6", "#000000"];

function txt(v: unknown): string { return typeof v === "string" ? v : ""; }
function fecha(v: unknown): string | null {
  if (typeof v !== "string" || !v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString("es-ES");
}
/** Un estado fuera de catálogo dejaba la tarjeta sin etiqueta. */
const ESTADO_LABEL: Record<string, string> = {
  not_connected: "Sin conectar",
  pending: "Pendiente onboarding",
  active: "Activo ✓",
  restricted: "Restringido",
};
const ESTADO_TEXTO: Record<string, string> = {
  not_connected: "text-muted",
  pending: "text-warning",
  active: "text-success",
  restricted: "text-danger",
};
const ESTADO_PUNTO: Record<string, string> = {
  not_connected: "bg-secondary",
  pending: "bg-warning",
  active: "bg-success",
  restricted: "bg-danger",
};

// ── Stripe Connect Panel ───────────────────────────────────────────────────────
function StripeConnectPanel({ config, onRefresh }: { config: WhiteLabelConfig; onRefresh: () => void }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const status = txt(config.stripeConnectStatus) as StripeConnectStatus;
  const isActive = status === "active";

  async function createAccount() {
    if (!email.includes("@")) { setMsg({ text: "Email inválido", ok: false }); return; }
    setLoading(true); setMsg(null);
    try {
      const res = await fetch("/api/saas/white-label", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "create-stripe-connect", email, businessName: config.agencyName || "Mi Agencia" }) });
      const d = (await res.json().catch(() => ({}))) as { accountId?: string; error?: string };
      if (!res.ok) { setMsg({ text: d.error ?? "Error Stripe", ok: false }); return; }
      setMsg({ text: `Cuenta creada: ${d.accountId ?? ""}. Ahora inicia onboarding.`, ok: true });
      onRefresh();
    } finally { setLoading(false); }
  }

  async function startOnboarding() {
    setLoading(true); setMsg(null);
    try {
      const returnUrl = `${window.location.origin}/saas/white-label?connect=return`;
      const res = await fetch("/api/saas/white-label", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "stripe-connect-onboarding-url", returnUrl, refreshUrl: returnUrl }) });
      const d = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !d.url) { setMsg({ text: d.error ?? "No se pudo obtener URL de onboarding", ok: false }); return; }
      window.location.href = d.url;
    } finally { setLoading(false); }
  }

  async function syncStatus() {
    setLoading(true); setMsg(null);
    try {
      const res = await fetch("/api/saas/white-label", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "sync-stripe-connect" }) });
      if (!res.ok) { setMsg({ text: "Error al sincronizar", ok: false }); return; }
      setMsg({ text: "Estado sincronizado con Stripe", ok: true });
      onRefresh();
    } finally { setLoading(false); }
  }

  const alta = fecha(config.stripeConnectOnboardedAt);

  return (
    <W3crmContentBox titulo="Stripe Connect — Cobros de agencia" icono="fa-brands fa-stripe-s">
      <p className="fs-14 text-muted">
        Conecta tu cuenta de Stripe para recibir pagos de tus subcuentas directamente, con comisión de
        plataforma automática.
      </p>

      {msg && (
        <div className={`alert py-2 fs-14 ${msg.ok ? "alert-success" : "alert-danger"}`} role="status">{msg.text}</div>
      )}

      <div className="card border mb-3">
        <div className="card-body d-flex align-items-center gap-3 py-3">
          <span className={`d-inline-block rounded-circle ${ESTADO_PUNTO[status] ?? "bg-secondary"}`}
            style={{ width: 10, height: 10 }} aria-hidden="true" />
          <div className="flex-grow-1">
            <p className={`fw-bold mb-0 ${ESTADO_TEXTO[status] ?? "text-muted"}`}>
              {ESTADO_LABEL[status] ?? "Sin dato"}
            </p>
            {config.stripeConnectAccountId && (
              <span className="d-block text-muted fs-12 font-mono">{txt(config.stripeConnectAccountId)}</span>
            )}
            {alta && <span className="d-block text-muted fs-12">Activo desde {alta}</span>}
          </div>
          {config.stripeConnectAccountId && (
            <button type="button" className="btn btn-primary light btn-sm" disabled={loading}
              onClick={() => void syncStatus()}>Sincronizar</button>
          )}
        </div>
      </div>

      {isActive && (
        <div className="row">
          {[
            { label: "Cobros habilitados", ok: config.stripeChargesEnabled },
            { label: "Payouts habilitados", ok: config.stripePayoutsEnabled },
          ].map(({ label, ok }) => (
            <div className="col-sm-6 mb-3" key={label}>
              <div className={`alert py-2 fs-14 mb-0 ${ok ? "alert-success" : "alert-secondary"}`} role="status">
                {ok ? "✓" : "✗"} {label}
              </div>
            </div>
          ))}
        </div>
      )}

      {status === "not_connected" && (
        <>
          <div className="form-group mb-3">
            <label htmlFor="wl-stripe-email" className="text-black font-w600">Email de tu cuenta Stripe</label>
            <input id="wl-stripe-email" type="email" className="form-control" placeholder="tu@empresa.com"
              value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <button type="button" className="btn btn-primary w-100" disabled={loading}
            onClick={() => void createAccount()}>
            {loading ? "Conectando…" : "Crear cuenta Stripe Connect"}
          </button>
        </>
      )}

      {status === "pending" && (
        <button type="button" className="btn btn-primary w-100" disabled={loading}
          onClick={() => void startOnboarding()}>
          {loading ? "Redirigiendo…" : "Completar onboarding en Stripe →"}
        </button>
      )}

      {status === "restricted" && (
        <>
          <p className="text-danger fs-12">
            Tu cuenta tiene restricciones. Completa el proceso de verificación en Stripe.
          </p>
          <button type="button" className="btn btn-primary w-100" disabled={loading}
            onClick={() => void startOnboarding()}>
            {loading ? "Redirigiendo…" : "Completar verificación →"}
          </button>
        </>
      )}
    </W3crmContentBox>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function SaasWhiteLabelPage() {
  const [config, setConfig] = useState<WhiteLabelConfig>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"branding" | "domain" | "email" | "connect">("branding");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/saas/white-label");
      if (res.ok) {
        const d = (await res.json().catch(() => ({}))) as { config?: WhiteLabelConfig };
        if (d.config) setConfig({ ...DEFAULTS, ...d.config });
      }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  function update<K extends keyof WhiteLabelConfig>(key: K, value: WhiteLabelConfig[K]) {
    setConfig(c => ({ ...c, [key]: value }));
    setSaved(false); setSaveError(null);
  }

  async function save() {
    setSaving(true); setSaveError(null);
    try {
      const body = {
        agencyName:           config.agencyName,
        logoUrl:              config.logoUrl,
        primaryColor:         config.primaryColor,
        secondaryColor:       config.secondaryColor,
        customDomain:         config.customDomain,
        faviconUrl:           config.faviconUrl,
        supportEmail:         config.supportEmail,
        footerText:           config.footerText,
        hideNelvyonBranding:  config.hideNelvyonBranding,
      };
      const res = await fetch("/api/saas/white-label", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = (await res.json().catch(() => ({}))) as { config?: WhiteLabelConfig; error?: string };
      if (!res.ok) { setSaveError(d.error ?? "Error al guardar"); return; }
      if (d.config) setConfig({ ...DEFAULTS, ...d.config });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally { setSaving(false); }
  }

  const primario = txt(config.primaryColor) || DEFAULTS.primaryColor;
  const agencia = txt(config.agencyName);
  const inicial = (agencia || "A").charAt(0);

  return (
    <SaasW3crmShell>
      <W3crmPageTitle mainTitle="White Label" parentTitle="Cuenta" pageTitle="Marca" />
      <div className="container-fluid">
        <div className="row">
          <div className="col-xl-12">
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
              <p className="fs-14 text-muted mb-0">
                Personaliza la plataforma con tu marca, dominio y colores corporativos
              </p>
              <span className="d-flex align-items-center gap-2">
                {saved && <span className="text-success fs-12">✓ Guardado</span>}
                {saveError && <span className="text-danger fs-12">{saveError}</span>}
                <button type="button" className="btn btn-primary" disabled={saving || loading}
                  onClick={() => void save()}>
                  {saving ? "Guardando…" : "Guardar cambios"}
                </button>
              </span>
            </div>

            <ul className="nav nav-tabs mb-3" aria-label="Secciones de white label">
              {(["branding", "domain", "email", "connect"] as const).map(t => (
                <li className="nav-item" key={t}>
                  <button type="button" className={`nav-link ${activeTab === t ? "active" : ""}`}
                    aria-pressed={activeTab === t} onClick={() => setActiveTab(t)}>
                    {t === "branding" ? "🎨 Marca" : t === "domain" ? "🌐 Dominio" : t === "email" ? "📧 Email" : "⚡ Stripe Connect"}
                  </button>
                </li>
              ))}
            </ul>

            {loading ? (
              <W3crmCargando texto="Cargando configuración…" />
            ) : (
              <>
                {activeTab === "branding" && (
                  <div className="row">
                    <div className="col-xl-8">
                      <W3crmContentBox titulo="Identidad de marca" icono="fa-solid fa-signature">
                        <div className="form-group mb-3">
                          <label htmlFor="wl-agencia" className="text-black font-w600">Nombre de la agencia</label>
                          <input id="wl-agencia" className="form-control" value={agencia}
                            onChange={e => update("agencyName", e.target.value)} />
                          <p className="fs-12 text-muted mt-1 mb-0">Aparece en header, emails y notificaciones</p>
                        </div>
                        <div className="row">
                          <div className="col-sm-6">
                            <div className="form-group mb-3">
                              <label htmlFor="wl-logo" className="text-black font-w600">URL del logo</label>
                              <input id="wl-logo" className="form-control" placeholder="https://…"
                                value={txt(config.logoUrl)} onChange={e => update("logoUrl", e.target.value || null)} />
                              <p className="fs-12 text-muted mt-1 mb-0">PNG/SVG, fondo transparente, mín. 200px</p>
                            </div>
                          </div>
                          <div className="col-sm-6">
                            <div className="form-group mb-3">
                              <label htmlFor="wl-favicon" className="text-black font-w600">URL del favicon</label>
                              <input id="wl-favicon" className="form-control" placeholder="https://…favicon.ico"
                                value={txt(config.faviconUrl)} onChange={e => update("faviconUrl", e.target.value || null)} />
                            </div>
                          </div>
                        </div>
                      </W3crmContentBox>

                      <W3crmContentBox titulo="Colores corporativos" icono="fa-solid fa-palette">
                        <div className="row">
                          <div className="col-sm-6">
                            <div className="form-group mb-3">
                              <label htmlFor="wl-primario" className="text-black font-w600">Color primario</label>
                              <div className="d-flex gap-2">
                                <input type="color" aria-label="Selector de color primario"
                                  className="form-control form-control-color" style={{ maxWidth: 48 }}
                                  value={primario} onChange={e => update("primaryColor", e.target.value)} />
                                <input id="wl-primario" className="form-control font-mono text-uppercase" maxLength={7}
                                  value={primario} onChange={e => update("primaryColor", e.target.value)} />
                              </div>
                              <div className="d-flex flex-wrap gap-2 mt-2">
                                {PRESET_COLORS.map(c => (
                                  <button key={c} type="button" aria-label={`Usar color ${c}`}
                                    aria-pressed={primario === c}
                                    className="rounded-circle border-0 p-0"
                                    style={{
                                      width: 24, height: 24, backgroundColor: c,
                                      outline: primario === c ? "2px solid #0D99FF" : "none",
                                      outlineOffset: 2,
                                    }}
                                    onClick={() => update("primaryColor", c)} />
                                ))}
                              </div>
                            </div>
                          </div>
                          <div className="col-sm-6">
                            <div className="form-group mb-3">
                              <label htmlFor="wl-secundario" className="text-black font-w600">Color secundario</label>
                              <div className="d-flex gap-2">
                                <input type="color" aria-label="Selector de color secundario"
                                  className="form-control form-control-color" style={{ maxWidth: 48 }}
                                  value={txt(config.secondaryColor) || DEFAULTS.secondaryColor}
                                  onChange={e => update("secondaryColor", e.target.value)} />
                                <input id="wl-secundario" className="form-control font-mono text-uppercase" maxLength={7}
                                  value={txt(config.secondaryColor)}
                                  onChange={e => update("secondaryColor", e.target.value)} />
                              </div>
                            </div>
                          </div>
                        </div>
                      </W3crmContentBox>

                      <W3crmContentBox titulo="Branding en plataforma" icono="fa-solid fa-eye-slash">
                        <div className="form-check form-switch mb-3">
                          <input className="form-check-input" type="checkbox" id="wl-ocultar"
                            checked={!!config.hideNelvyonBranding}
                            onChange={() => update("hideNelvyonBranding", !config.hideNelvyonBranding)} />
                          <label className="form-check-label" htmlFor="wl-ocultar">
                            <span className="d-block">Ocultar branding de Nelvyon</span>
                            <span className="d-block text-muted fs-12">Solo disponible en plan Agency</span>
                          </label>
                        </div>
                        <div className="form-group mb-0">
                          <label htmlFor="wl-pie" className="text-black font-w600">Texto de pie de página</label>
                          <input id="wl-pie" className="form-control"
                            placeholder="© 2026 Mi Agencia. Todos los derechos reservados."
                            value={txt(config.footerText)} onChange={e => update("footerText", e.target.value || null)} />
                        </div>
                      </W3crmContentBox>
                    </div>

                    {/* Vista previa: los colores en línea SON el dato editado. */}
                    <div className="col-xl-4">
                      <W3crmContentBox titulo="Vista previa" icono="fa-solid fa-desktop" bodyClassName="card-body p-0">
                        <div className="d-flex align-items-center gap-2 px-3 py-3" style={{ backgroundColor: primario }}>
                          <span className="d-inline-flex align-items-center justify-content-center rounded text-white fw-bold"
                            style={{ width: 28, height: 28, background: "rgba(255,255,255,.2)" }}>
                            {inicial}
                          </span>
                          <span className="text-white fw-bold">{agencia || "Mi Agencia"}</span>
                        </div>
                        <div className="p-3">
                          <div className="rounded mb-2" style={{ height: 32, backgroundColor: `${primario}25` }} />
                          <div className="rounded bg-light mb-2" style={{ height: 12, width: "75%" }} />
                          <div className="rounded bg-light mb-3" style={{ height: 12, width: "50%" }} />
                          <button type="button" className="btn btn-sm text-white" style={{ backgroundColor: primario }}>
                            Acción principal
                          </button>
                        </div>
                        {config.footerText && (
                          <div className="border-top px-3 py-2 text-center text-muted fs-12">{txt(config.footerText)}</div>
                        )}
                      </W3crmContentBox>
                    </div>
                  </div>
                )}

                {activeTab === "domain" && (
                  <W3crmContentBox titulo="Dominio personalizado" icono="fa-solid fa-globe">
                    <div className="form-group mb-3">
                      <label htmlFor="wl-dominio" className="text-black font-w600">Dominio propio</label>
                      <input id="wl-dominio" className="form-control" placeholder="app.miempresa.com"
                        value={txt(config.customDomain)} onChange={e => update("customDomain", e.target.value || null)} />
                      <p className="fs-12 text-muted mt-1 mb-0">
                        Ej: app.miempresa.com — apunta un CNAME a saas.nelvyon.com
                      </p>
                    </div>
                    <div className="alert alert-primary" role="note">
                      <p className="fw-bold mb-2">📋 Configuración DNS requerida</p>
                      <div className="font-mono fs-12">
                        <p className="mb-1">Tipo: <span className="fw-bold">CNAME</span></p>
                        <p className="mb-1">Host: <span className="fw-bold">{txt(config.customDomain) || "app.tudominio.com"}</span></p>
                        <p className="mb-1">Valor: <span className="fw-bold">saas.nelvyon.com</span></p>
                        <p className="mb-0">TTL: <span className="fw-bold">3600</span></p>
                      </div>
                      <p className="fs-12 mt-2 mb-0">
                        El certificado SSL se genera automáticamente en 24-48h tras el deploy.
                      </p>
                    </div>
                  </W3crmContentBox>
                )}

                {activeTab === "email" && (
                  <W3crmContentBox titulo="Remitente y soporte" icono="fa-solid fa-envelope">
                    <div className="row">
                      <div className="col-sm-6">
                        <div className="form-group mb-3">
                          <label htmlFor="wl-soporte" className="text-black font-w600">Email de soporte</label>
                          <input id="wl-soporte" type="email" className="form-control" placeholder="soporte@tuempresa.com"
                            value={txt(config.supportEmail)} onChange={e => update("supportEmail", e.target.value || null)} />
                          <p className="fs-12 text-muted mt-1 mb-0">Aparece en los emails enviados a clientes</p>
                        </div>
                      </div>
                      <div className="col-sm-6">
                        <div className="form-group mb-3">
                          <label htmlFor="wl-pie-email" className="text-black font-w600">Pie de página del email</label>
                          <input id="wl-pie-email" className="form-control" placeholder="El equipo de Mi Agencia"
                            value={txt(config.footerText)} onChange={e => update("footerText", e.target.value || null)} />
                        </div>
                      </div>
                    </div>
                    <div className="alert alert-secondary mb-0" role="note">
                      Los emails se envían desde <span className="fw-bold">SES de Nelvyon</span> con tu nombre de
                      agencia. Para SMTP personalizado, contacta con soporte.
                    </div>
                  </W3crmContentBox>
                )}

                {activeTab === "connect" && (
                  <StripeConnectPanel config={config} onRefresh={load} />
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </SaasW3crmShell>
  );
}
