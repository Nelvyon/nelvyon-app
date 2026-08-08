"use client";

/**
 * /saas/settings sobre `(cms)/content` de W3CRM, con las piezas ya portadas.
 * Mapeo: las cuatro pestañas -> `nav nav-tabs` de la plantilla; cada bloque ->
 * `W3crmContentBox`; el historial GDPR -> `list-group`. Sin componentes nuevos.
 *
 * CONTRATO:
 *   - `saas-modules.spec.ts:74` busca `getByRole("button", { name: /SSO
 *     Enterprise/i })`: la pestaña sigue siendo un `<button>` con ese texto y
 *     SIN `role` propio, que lo sobrescribiría. Ninguna caja se titula con esa
 *     cadena para no añadir un segundo botón "Plegar …" con el mismo nombre.
 *   - `saas-auth.spec.ts:15` exige el redirect a login sin token; lo hace el
 *     middleware, y aquí se conserva además el `router.replace` ante un 401 de
 *     `/api/saas/settings`, que es el punto de sesión de la pantalla.
 *   - `saas-nav-full-coverage` exige cargar sin "Internal Server Error": por eso
 *     ningún dato de la API llega crudo a `.join`, `.includes` ni `new Date`.
 *
 * `SaasShellLayout` recibía `tenantCompany` y `tenantPlan` para pintarlos en el
 * sidebar antiguo; `SaasW3crmShell` tiene su propia cabecera y no admite esos
 * datos, así que empresa y plan se siguen viendo —sin perder nada— en la
 * pestaña General, que es donde se editan.
 *
 * Lógica de NELVYON intacta: `GET/PATCH /api/saas/settings`,
 * `GET/POST /api/saas/sso` (acciones `configure` y `toggle-enforce`),
 * `GET/POST /api/saas/compliance/gdpr` (`request-export`, `request-deletion` y
 * `delete-user-data` con su `confirm: "DELETE"`), la descarga del JSON por
 * blob, el `credentials: "same-origin"` de cada llamada, el gate de permiso
 * `sso.write`, el rol efectivo de `useSaasPermissions` y el cambio de idioma
 * por `useLocaleContext` con sus seis locales.
 */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { SaasW3crmShell } from "@/features/saas-w3crm/components/SaasW3crmShell";
import { W3crmPageTitle } from "@/features/saas-w3crm/components/W3crmPageTitle";
import { W3crmEmptyState } from "@/features/saas-w3crm/components/W3crmUi";
import { W3crmCargando, W3crmContentBox } from "@/features/saas-w3crm/components/W3crmContentBox";
import { saasRoleLabel } from "@/features/saas-shell/saasPermissions";
import { useSaasPermissions } from "@/features/saas-shell/useSaasPermissions";
import { useLocaleContext } from "@/core/i18n/LocaleProvider";
import type { AppLocale } from "../../../../i18n";

type SettingsSummary = {
  tenant: {
    companyName: string;
    industry: string;
    plan: "starter" | "pro" | "enterprise";
    website: string | null;
    phone: string | null;
    employees: string | null;
  };
  role: string;
  permissions: string[];
};

interface SsoConfig {
  provider: "oidc" | "saml";
  issuer: string;
  clientId: string;
  domains: string[];
  enforced: boolean;
}

type Tab = "general" | "sso" | "permisos" | "privacidad";

const LOCALE_OPTIONS: { value: AppLocale; label: string }[] = [
  { value: "es", label: "Español" },
  { value: "en", label: "English" },
  { value: "fr", label: "Français" },
  { value: "pt", label: "Português" },
  { value: "de", label: "Deutsch" },
  { value: "it", label: "Italiano" },
];

function txt(v: unknown): string { return typeof v === "string" ? v : ""; }
function lista(v: unknown): string[] { return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []; }
function fechaHora(v: unknown): string {
  if (typeof v !== "string" || !v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("es-ES");
}
function planBadge(plan: unknown): string {
  return plan === "enterprise" ? "badge-warning" : plan === "pro" ? "badge-success" : "badge-primary";
}

export default function SaasSettingsPage() {
  const router = useRouter();
  const { role: hookRole } = useSaasPermissions();
  const { locale, setLocale } = useLocaleContext();
  const [localeSaving, setLocaleSaving] = useState(false);
  const [localeSaved, setLocaleSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SettingsSummary | null>(null);
  const [tab, setTab] = useState<Tab>("general");
  const [profileForm, setProfileForm] = useState({ companyName: "", industry: "", website: "", phone: "" });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // SSO state
  const [ssoConfig, setSsoConfig] = useState<SsoConfig | null>(null);
  const [ssoLoading, setSsoLoading] = useState(false);
  const [ssoSaved, setSsoSaved] = useState(false);
  const [ssoForm, setSsoForm] = useState({
    provider: "oidc" as "oidc" | "saml",
    issuer: "",
    clientId: "",
    clientSecret: "",
    metadataUrl: "",
    domains: "",
  });
  const [ssoError, setSsoError] = useState<string | null>(null);
  const [gdprBusy, setGdprBusy] = useState(false);
  const [gdprNotice, setGdprNotice] = useState<string | null>(null);
  const [gdprError, setGdprError] = useState<string | null>(null);
  const [gdprRequests, setGdprRequests] = useState<
    Array<{ id: string; type: string; status: string; createdAt: string }>
  >([]);
  const [gdprCoverageNote, setGdprCoverageNote] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/saas/settings", { credentials: "same-origin" });
        if (res.status === 401) {
          router.replace("/auth/login?next=/saas/settings");
          return;
        }
        if (!res.ok) throw new Error("No se pudo cargar la configuración");
        const summary = (await res.json()) as SettingsSummary;
        setData(summary);
        // `tenant` podía no venir y el acceso directo tumbaba la pantalla.
        setProfileForm({
          companyName: txt(summary?.tenant?.companyName),
          industry: txt(summary?.tenant?.industry),
          website: txt(summary?.tenant?.website),
          phone: txt(summary?.tenant?.phone),
        });
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Error");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  useEffect(() => {
    if (tab !== "sso") return;
    setSsoLoading(true);
    void (async () => {
      try {
        const res = await fetch("/api/saas/sso", { credentials: "same-origin" });
        if (res.ok) {
          const body = (await res.json()) as { config?: SsoConfig | null };
          const c = body.config ?? null;
          setSsoConfig(c);
          if (c) {
            setSsoForm({
              provider: c.provider === "saml" ? "saml" : "oidc",
              issuer: txt(c.issuer),
              clientId: txt(c.clientId),
              clientSecret: "",
              metadataUrl: "",
              domains: lista(c.domains).join(", "),
            });
          }
        }
      } finally {
        setSsoLoading(false);
      }
    })();
  }, [tab]);

  useEffect(() => {
    if (tab !== "privacidad") return;
    setGdprError(null);
    void (async () => {
      try {
        const res = await fetch("/api/saas/compliance/gdpr", { credentials: "same-origin" });
        if (!res.ok) throw new Error(`No se pudo cargar GDPR (${res.status})`);
        const body = (await res.json()) as {
          data?: { coverage?: { note?: string } };
          requests?: Array<{ id: string; type: string; status: string; createdAt: string }>;
        };
        setGdprRequests(Array.isArray(body.requests) ? body.requests : []);
        setGdprCoverageNote(body.data?.coverage?.note ?? null);
      } catch (e) {
        setGdprError(e instanceof Error ? e.message : "Error GDPR");
      }
    })();
  }, [tab]);

  const permisos = lista(data?.permissions);
  const canManageSso = permisos.includes("sso.write");

  async function saveSsoConfig() {
    setSsoLoading(true);
    setSsoSaved(false);
    try {
      const res = await fetch("/api/saas/sso", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "configure",
          provider: ssoForm.provider,
          issuer: ssoForm.issuer,
          clientId: ssoForm.clientId,
          clientSecret: ssoForm.clientSecret,
          metadataUrl: ssoForm.metadataUrl || undefined,
          domains: ssoForm.domains.split(",").map(d => d.trim()).filter(Boolean),
        }),
      });
      // El cuerpo solo puede leerse una vez: se lee y luego se decide.
      const json = (await res.json().catch(() => null)) as { config?: SsoConfig; error?: string } | null;
      if (!res.ok) throw new Error(json?.error ?? `Error ${res.status}`);
      if (json?.config) setSsoConfig(json.config);
      setSsoSaved(true);
      setSsoError(null);
    } catch (e) {
      setSsoError(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSsoLoading(false);
    }
  }

  async function toggleEnforce(enforced: boolean) {
    setSsoError(null);
    try {
      const res = await fetch("/api/saas/sso", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle-enforce", enforced }),
      });
      const json = (await res.json().catch(() => null)) as { config?: SsoConfig; error?: string } | null;
      if (!res.ok) throw new Error(json?.error ?? `Error ${res.status}`);
      if (json?.config) setSsoConfig(json.config);
    } catch (e) {
      setSsoError(e instanceof Error ? e.message : "Error al cambiar enforce SSO");
    }
  }

  async function guardarPerfil(e: React.FormEvent) {
    e.preventDefault();
    setProfileSaving(true);
    setProfileError(null);
    setProfileSaved(false);
    try {
      const res = await fetch("/api/saas/settings", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: profileForm.companyName.trim(),
          industry: profileForm.industry.trim(),
          website: profileForm.website.trim() || null,
          phone: profileForm.phone.trim() || null,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string; message?: string } | null;
        throw new Error(body?.message ?? body?.error ?? `Error ${res.status}`);
      }
      const summary = (await res.json()) as SettingsSummary;
      setData(summary);
      setProfileForm({
        companyName: txt(summary?.tenant?.companyName),
        industry: txt(summary?.tenant?.industry),
        website: txt(summary?.tenant?.website),
        phone: txt(summary?.tenant?.phone),
      });
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2000);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setProfileSaving(false);
    }
  }

  async function recargarGdpr() {
    const reload = await fetch("/api/saas/compliance/gdpr", { credentials: "same-origin" });
    if (reload.ok) {
      const body = (await reload.json()) as {
        requests?: Array<{ id: string; type: string; status: string; createdAt: string }>;
      };
      setGdprRequests(Array.isArray(body.requests) ? body.requests : []);
    }
  }

  async function solicitarExportacion() {
    setGdprBusy(true); setGdprError(null); setGdprNotice(null);
    try {
      const res = await fetch("/api/saas/compliance/gdpr", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "request-export" }),
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      setGdprNotice("Solicitud de exportación creada (pending).");
      setTab("privacidad");
      await recargarGdpr();
    } catch (e) {
      setGdprError(e instanceof Error ? e.message : "Error");
    } finally { setGdprBusy(false); }
  }

  async function descargarDatos() {
    setGdprBusy(true); setGdprError(null); setGdprNotice(null);
    try {
      const res = await fetch("/api/saas/compliance/gdpr", { credentials: "same-origin" });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const body = await res.json();
      const blob = new Blob([JSON.stringify(body, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `nelvyon-gdpr-export-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setGdprNotice("Exportación descargada (cobertura parcial documentada en coverage).");
    } catch (e) {
      setGdprError(e instanceof Error ? e.message : "Error");
    } finally { setGdprBusy(false); }
  }

  async function borradoAcotado() {
    setGdprBusy(true); setGdprError(null); setGdprNotice(null);
    try {
      const reqRes = await fetch("/api/saas/compliance/gdpr", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "request-deletion" }),
      });
      if (!reqRes.ok) throw new Error(`request-deletion ${reqRes.status}`);
      const delRes = await fetch("/api/saas/compliance/gdpr", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete-user-data", confirm: "DELETE" }),
      });
      if (!delRes.ok) {
        const body = (await delRes.json().catch(() => null)) as { message?: string } | null;
        throw new Error(body?.message ?? `delete ${delRes.status}`);
      }
      setGdprNotice("Borrado acotado de perfil/usuario ejecutado (CRM fuera de alcance).");
      await recargarGdpr();
    } catch (e) {
      setGdprError(e instanceof Error ? e.message : "Error");
    } finally { setGdprBusy(false); }
  }

  const displayRole = data?.role ?? hookRole;
  const plan = data?.tenant?.plan;

  return (
    <SaasW3crmShell>
      <W3crmPageTitle mainTitle="Configuración" parentTitle="Cuenta" pageTitle="Ajustes" />
      <div className="container-fluid">
        <div className="row">
          <div className="col-xl-12">
            <p className="fs-14 text-muted">Perfil del tenant, SSO, permisos y privacidad (GDPR).</p>

            {/* Pestañas: `<button>` sin `role` propio. "🔐 SSO Enterprise" es
                texto-contrato y debe seguir siendo un botón con ese nombre. */}
            {/* Sin `role="tablist"`: obligaría a `role="tab"` en los hijos, y eso
                sobrescribiría el rol implícito de botón que exige el contrato. */}
            <ul className="nav nav-tabs mb-3" aria-label="Secciones de configuración">
              {(["general", "sso", "permisos", "privacidad"] as Tab[]).map(t => (
                <li className="nav-item" key={t}>
                  <button type="button" className={`nav-link ${tab === t ? "active" : ""}`}
                    aria-pressed={tab === t} onClick={() => setTab(t)}>
                    {t === "general"
                      ? "General"
                      : t === "sso"
                        ? "🔐 SSO Enterprise"
                        : t === "permisos"
                          ? "Permisos"
                          : "Privacidad"}
                  </button>
                </li>
              ))}
            </ul>

            {loading ? <W3crmCargando texto="Cargando…" /> : null}
            {error ? <div className="alert alert-danger py-2 fs-14" role="alert">{error}</div> : null}

            {/* ── Tab General ── */}
            {tab === "general" && data ? (
              <>
                <W3crmContentBox titulo="Tenant" icono="fa-solid fa-building">
                  <form onSubmit={(e) => void guardarPerfil(e)}>
                    {profileError && <div className="alert alert-danger py-2 fs-14" role="alert">{profileError}</div>}
                    <div className="row">
                      <div className="col-sm-6">
                        <div className="form-group mb-3">
                          <label htmlFor="st-empresa" className="text-black font-w600">
                            Empresa <span className="required">*</span>
                          </label>
                          <input id="st-empresa" className="form-control" required
                            value={profileForm.companyName}
                            onChange={(e) => setProfileForm((f) => ({ ...f, companyName: e.target.value }))} />
                        </div>
                      </div>
                      <div className="col-sm-6">
                        <div className="form-group mb-3">
                          <label htmlFor="st-industria" className="text-black font-w600">
                            Industria <span className="required">*</span>
                          </label>
                          <input id="st-industria" className="form-control" required
                            value={profileForm.industry}
                            onChange={(e) => setProfileForm((f) => ({ ...f, industry: e.target.value }))} />
                        </div>
                      </div>
                      <div className="col-sm-6">
                        <div className="form-group mb-3">
                          <label htmlFor="st-web" className="text-black font-w600">Web</label>
                          <input id="st-web" className="form-control" placeholder="https://"
                            value={profileForm.website}
                            onChange={(e) => setProfileForm((f) => ({ ...f, website: e.target.value }))} />
                        </div>
                      </div>
                      <div className="col-sm-6">
                        <div className="form-group mb-3">
                          <label htmlFor="st-telefono" className="text-black font-w600">Teléfono</label>
                          <input id="st-telefono" className="form-control"
                            value={profileForm.phone}
                            onChange={(e) => setProfileForm((f) => ({ ...f, phone: e.target.value }))} />
                        </div>
                      </div>
                      <div className="col-sm-6">
                        <div className="form-group mb-3">
                          <span className="text-black font-w600 d-block">Plan</span>
                          <span className={`badge ${planBadge(plan)} text-uppercase`}>{txt(plan) || "—"}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-end">
                      {profileSaved && <span className="text-success fs-12 me-2">✓ Guardado</span>}
                      <button type="submit" className="btn btn-primary"
                        disabled={profileSaving || !profileForm.companyName.trim() || !profileForm.industry.trim()}>
                        {profileSaving ? "Guardando…" : "Guardar cambios"}
                      </button>
                    </div>
                  </form>
                </W3crmContentBox>

                <W3crmContentBox titulo="Idioma de la interfaz" icono="fa-solid fa-language">
                  <div className="d-flex flex-wrap align-items-center gap-2">
                    <select
                      className="form-control"
                      style={{ maxWidth: 240 }}
                      value={locale}
                      aria-label="Seleccionar idioma"
                      onChange={async (e) => {
                        setLocaleSaving(true);
                        setLocaleSaved(false);
                        await setLocale(e.target.value as AppLocale);
                        setLocaleSaving(false);
                        setLocaleSaved(true);
                        setTimeout(() => setLocaleSaved(false), 2000);
                      }}
                    >
                      {LOCALE_OPTIONS.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                    {localeSaving && <span className="text-muted fs-12">Guardando…</span>}
                    {localeSaved && <span className="text-success fs-12">✓ Idioma actualizado</span>}
                  </div>
                </W3crmContentBox>
              </>
            ) : null}

            {/* ── Tab SSO ── NUNCA titular esta caja con "SSO Enterprise". */}
            {tab === "sso" && (
              <W3crmContentBox
                titulo="Single Sign-On (OIDC / SAML)"
                icono="fa-solid fa-key"
                acciones={ssoConfig ? (
                  <span className={`badge ${ssoConfig.enforced ? "badge-success" : "badge-secondary"} me-2`}>
                    {ssoConfig.enforced ? "Enforced" : "Optional"}
                  </span>
                ) : null}
              >
                {!canManageSso && (
                  <div className="alert alert-warning py-2 fs-14" role="status">
                    Solo owner/admin pueden configurar SSO.
                  </div>
                )}

                {ssoLoading && <W3crmCargando texto="Cargando…" />}
                {ssoError && <div className="alert alert-danger py-2 fs-14" role="alert">{ssoError}</div>}

                {!ssoLoading && canManageSso && (
                  <>
                    <div className="row">
                      <div className="col-sm-6">
                        <div className="form-group mb-3">
                          <label htmlFor="sso-provider" className="text-black font-w600">Provider</label>
                          <select id="sso-provider" className="form-control" value={ssoForm.provider}
                            onChange={e => setSsoForm(f => ({ ...f, provider: e.target.value as "oidc" | "saml" }))}>
                            <option value="oidc">OIDC (Google Workspace, Azure AD, Okta)</option>
                            <option value="saml">SAML 2.0</option>
                          </select>
                        </div>
                      </div>
                      <div className="col-sm-6">
                        <div className="form-group mb-3">
                          <label htmlFor="sso-issuer" className="text-black font-w600">Issuer URL</label>
                          <input id="sso-issuer" type="url" className="form-control" placeholder="https://accounts.google.com"
                            value={ssoForm.issuer} onChange={e => setSsoForm(f => ({ ...f, issuer: e.target.value }))} />
                        </div>
                      </div>
                      <div className="col-sm-6">
                        <div className="form-group mb-3">
                          <label htmlFor="sso-client" className="text-black font-w600">Client ID</label>
                          <input id="sso-client" type="text" className="form-control" placeholder="client_id"
                            value={ssoForm.clientId} onChange={e => setSsoForm(f => ({ ...f, clientId: e.target.value }))} />
                        </div>
                      </div>
                      <div className="col-sm-6">
                        <div className="form-group mb-3">
                          <label htmlFor="sso-secret" className="text-black font-w600">Client Secret</label>
                          <input id="sso-secret" type="password" className="form-control" placeholder="••••••••"
                            value={ssoForm.clientSecret} onChange={e => setSsoForm(f => ({ ...f, clientSecret: e.target.value }))} />
                        </div>
                      </div>
                      <div className="col-sm-6">
                        <div className="form-group mb-3">
                          <label htmlFor="sso-metadata" className="text-black font-w600">Metadata URL (opcional)</label>
                          <input id="sso-metadata" type="url" className="form-control"
                            placeholder="https://.../.well-known/openid-configuration"
                            value={ssoForm.metadataUrl} onChange={e => setSsoForm(f => ({ ...f, metadataUrl: e.target.value }))} />
                        </div>
                      </div>
                      <div className="col-sm-6">
                        <div className="form-group mb-3">
                          <label htmlFor="sso-dominios" className="text-black font-w600">Dominios (separados por coma)</label>
                          <input id="sso-dominios" type="text" className="form-control" placeholder="empresa.com, subsidiaria.es"
                            value={ssoForm.domains} onChange={e => setSsoForm(f => ({ ...f, domains: e.target.value }))} />
                        </div>
                      </div>
                    </div>

                    {ssoSaved && <p className="text-success fs-12">✓ Configuración guardada correctamente.</p>}

                    <div className="d-flex flex-wrap gap-2">
                      <button type="button" className="btn btn-primary" disabled={ssoLoading}
                        onClick={() => void saveSsoConfig()}>
                        Guardar configuración
                      </button>
                      {ssoConfig && (
                        <button type="button"
                          className={`btn ${ssoConfig.enforced ? "btn-danger light" : "btn-success light"}`}
                          onClick={() => void toggleEnforce(!ssoConfig.enforced)}>
                          {ssoConfig.enforced ? "Desactivar SSO enforced" : "Activar SSO enforced"}
                        </button>
                      )}
                    </div>

                    {ssoConfig && (
                      <div className="alert alert-primary py-2 mt-3" role="note">
                        <span className="fs-12 d-block">Callback URL para tu IdP</span>
                        <code className="text-break">
                          {typeof window !== "undefined" ? window.location.origin : "https://app.nelvyon.com"}/api/auth/sso/callback
                        </code>
                      </div>
                    )}
                  </>
                )}
              </W3crmContentBox>
            )}

            {/* ── Tab Permisos ── */}
            {tab === "permisos" && data ? (
              <W3crmContentBox titulo="Tu rol en este tenant" icono="fa-solid fa-user-shield">
                {displayRole ? (
                  <>
                    <span className="badge badge-primary mb-2">{saasRoleLabel(displayRole)}</span>
                    <p className="fs-14 text-muted">
                      {displayRole === "viewer"
                        ? "Solo lectura: puedes consultar datos, pero no crear, editar ni eliminar recursos."
                        : displayRole === "member"
                          ? "Miembro: puedes crear y editar contactos y deals. No puedes eliminar recursos críticos ni ver facturación."
                          : "Administración completa del tenant, incluida facturación y eliminación de recursos."}
                    </p>
                  </>
                ) : null}
                <div className="card border mb-0">
                  <div className="card-body py-3">
                    <p className="fs-12 text-uppercase text-muted mb-1">Permisos efectivos</p>
                    <p className="fs-12 text-muted mb-0">{permisos.length ? permisos.join(", ") : "—"}</p>
                  </div>
                </div>
              </W3crmContentBox>
            ) : null}

            {/* ── Tab Privacidad / GDPR ── */}
            {tab === "privacidad" ? (
              <W3crmContentBox titulo="GDPR / DSAR" icono="fa-solid fa-user-lock">
                <p className="fs-14 text-muted">
                  Exportación y borrado acotados al perfil de usuario del tenant activo. No es un wipe completo de CRM.
                </p>
                {gdprCoverageNote ? <p className="fs-12 text-muted">{gdprCoverageNote}</p> : null}
                {gdprError ? <div className="alert alert-danger py-2 fs-14" role="alert">{gdprError}</div> : null}
                {gdprNotice ? <div className="alert alert-primary py-2 fs-14" role="status">{gdprNotice}</div> : null}
                <div className="d-flex flex-wrap gap-2">
                  <button type="button" className="btn btn-primary" disabled={gdprBusy}
                    onClick={() => void solicitarExportacion()}>
                    Solicitar exportación
                  </button>
                  <button type="button" className="btn btn-primary light" disabled={gdprBusy}
                    onClick={() => void descargarDatos()}>
                    Descargar datos ahora
                  </button>
                  <button type="button" className="btn btn-danger light" disabled={gdprBusy}
                    onClick={() => void borradoAcotado()}>
                    Solicitar y ejecutar borrado acotado
                  </button>
                </div>
                {gdprRequests.length > 0 ? (
                  <>
                    <p className="fs-12 text-uppercase text-muted mt-4 mb-1">Historial de solicitudes (tenant)</p>
                    <ul className="list-group list-group-flush">
                      {gdprRequests.map((r) => (
                        <li key={r.id} className="list-group-item px-0 fs-12 text-muted">
                          {txt(r.type) || "—"} · {txt(r.status) || "—"} · {fechaHora(r.createdAt)}
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <W3crmEmptyState title="Sin solicitudes GDPR en este tenant." />
                )}
              </W3crmContentBox>
            ) : null}
          </div>
        </div>
      </div>
    </SaasW3crmShell>
  );
}
