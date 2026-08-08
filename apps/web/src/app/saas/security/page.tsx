"use client";

/**
 * /saas/security sobre `(cms)/content` de W3CRM, con las piezas ya portadas.
 * Mapeo: las seis secciones -> `nav nav-tabs` + `W3crmContentBox`; roles,
 * territorios y sandboxes -> `W3crmDataTable`. Sin componentes nuevos.
 *
 * Inventario: sin `data-testid` y sin spec dedicado — lo cubre
 * `saas-nav-full-coverage`. Verificado con grep que ningún spec hace
 * aserciones de texto ni de rol sobre esta ruta.
 *
 * Strict mode: el sidebar declara "🔐 Seguridad Enterprise"
 * (`saasNav.ts:165`), así que NINGÚN título de `W3crmContentBox` contiene
 * "Seguridad" —el toggle expone `aria-label="Plegar <título>"` y sumaría
 * coincidencias—. El `mainTitle` sí conserva el rótulo real de la pantalla,
 * pero el `pageTitle` NO lo repite: sería una segunda coincidencia dentro de
 * la propia página.
 *
 * Lógica de NELVYON intacta: los tres GET en paralelo (`/api/saas/security`,
 * `/api/saas/team`, `/api/saas/sso`); el `POST /api/saas/security` con sus
 * seis acciones (`mfa-begin`, `mfa-verify`, `mfa-enforce`, `ip-allowlist`,
 * `custom-role`, `assign-role`, `territory`, `sandbox`) y su tratamiento
 * especial de `provisioningUri` al empezar y al verificar; el `POST
 * /api/saas/sso` con `configure` y `toggle-enforce`; el troceo de dominios por
 * coma/punto y coma/espacio; los permisos por defecto del rol nuevo
 * (`contacts.read`, `deals.read`); el `schemaPending || degraded`; el aviso de
 * 4 s; la `callbackUrl` derivada del origen; y la i18n `saas.sso` con sus
 * mismas claves.
 */
import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { SaasW3crmShell } from "@/features/saas-w3crm/components/SaasW3crmShell";
import { W3crmPageTitle } from "@/features/saas-w3crm/components/W3crmPageTitle";
import { W3crmEmptyState } from "@/features/saas-w3crm/components/W3crmUi";
import { W3crmCargando, W3crmContentBox, W3crmDataTable } from "@/features/saas-w3crm/components/W3crmContentBox";

type Tab = "mfa" | "ip" | "roles" | "territories" | "sandboxes" | "sso";

type SecurityData = {
  allowlist: { enabled: boolean; cidrs: string[] };
  roles: Array<{ id: string; name: string; permissions: string[] }>;
  territories: Array<{ id: string; name: string; regions: string[] }>;
  mfa: { enabled: boolean; enforced: boolean; provisioningUri?: string };
  sandboxes?: Array<{ id: string; name: string }>;
};

type SsoConfig = {
  provider: "oidc" | "saml";
  issuer: string;
  clientId: string;
  domains: string[];
  enforced: boolean;
} | null;

type TeamMember = { id: string; userId: string | null; email: string; name: string | null };

/** Listas anidadas que podían no ser array y reventaban `.join`/`.map`. */
function lista(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}
function txt(v: unknown): string {
  return typeof v === "string" ? v : "";
}

export default function SaasSecurityPage() {
  const t = useTranslations("saas.sso");
  const [tab, setTab] = useState<Tab>("mfa");
  const [data, setData] = useState<SecurityData | null>(null);
  const [ssoConfig, setSsoConfig] = useState<SsoConfig>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [cidrs, setCidrs] = useState("");
  const [ipEnabled, setIpEnabled] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [roleName, setRoleName] = useState("");
  const [assignUserId, setAssignUserId] = useState("");
  const [assignRoleId, setAssignRoleId] = useState("");
  const [territoryName, setTerritoryName] = useState("");
  const [ssoProvider, setSsoProvider] = useState<"oidc" | "saml">("oidc");
  const [ssoIssuer, setSsoIssuer] = useState("");
  const [ssoClientId, setSsoClientId] = useState("");
  const [ssoClientSecret, setSsoClientSecret] = useState("");
  const [ssoDomains, setSsoDomains] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [mfaProvisioningUri, setMfaProvisioningUri] = useState<string | null>(null);
  const [schemaPending, setSchemaPending] = useState(false);

  const flash = (msg: string) => { setNotice(msg); window.setTimeout(() => setNotice(null), 4000); };

  const load = useCallback(async () => {
    const [secRes, teamRes, ssoRes] = await Promise.all([
      fetch("/api/saas/security"),
      fetch("/api/saas/team"),
      fetch("/api/saas/sso"),
    ]);
    if (secRes.ok) {
      const d = (await secRes.json().catch(() => ({}))) as Partial<SecurityData> & {
        schemaPending?: boolean;
        degraded?: boolean;
      };
      // Un payload parcial dejaba la pantalla en blanco: `data.mfa.enabled`
      // reventaba y `data.roles.map` también. Se normaliza a una forma completa.
      setData({
        allowlist: {
          enabled: Boolean(d.allowlist?.enabled),
          cidrs: lista(d.allowlist?.cidrs),
        },
        roles: Array.isArray(d.roles) ? d.roles : [],
        territories: Array.isArray(d.territories) ? d.territories : [],
        mfa: {
          enabled: Boolean(d.mfa?.enabled),
          enforced: Boolean(d.mfa?.enforced),
          provisioningUri: d.mfa?.provisioningUri,
        },
        sandboxes: Array.isArray(d.sandboxes) ? d.sandboxes : [],
      });
      setSchemaPending(Boolean(d.schemaPending || d.degraded));
      setCidrs(lista(d.allowlist?.cidrs).join("\n"));
      setIpEnabled(Boolean(d.allowlist?.enabled));
    }
    if (teamRes.ok) {
      const d = (await teamRes.json().catch(() => ({}))) as { members?: TeamMember[] };
      setMembers(Array.isArray(d.members) ? d.members : []);
    }
    if (ssoRes.ok) {
      const d = (await ssoRes.json().catch(() => ({}))) as { config?: SsoConfig };
      const c = d.config ?? null;
      setSsoConfig(c);
      if (c) {
        setSsoProvider(c.provider === "saml" ? "saml" : "oidc");
        setSsoIssuer(txt(c.issuer));
        setSsoClientId(txt(c.clientId));
        setSsoDomains(lista(c.domains).join(", "));
      }
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function post(action: string, body: Record<string, unknown>) {
    const res = await fetch("/api/saas/security", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...body }),
    });
    if (res.ok) {
      const d = (await res.json().catch(() => ({}))) as { mfa?: { provisioningUri?: string }; ok?: boolean };
      if (action === "mfa-begin" && d.mfa?.provisioningUri) setMfaProvisioningUri(d.mfa.provisioningUri);
      if (action === "mfa-verify" && d.ok) setMfaProvisioningUri(null);
      flash("Guardado");
      void load();
    } else {
      flash("Error al guardar");
    }
  }

  async function saveSso() {
    const res = await fetch("/api/saas/sso", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "configure",
        provider: ssoProvider,
        issuer: ssoIssuer,
        clientId: ssoClientId,
        clientSecret: ssoClientSecret,
        domains: ssoDomains.split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean),
      }),
    });
    if (res.ok) { flash("SSO guardado"); void load(); }
    else flash("Error SSO — comprueba permisos sso.write");
  }

  async function toggleSsoEnforce(enforced: boolean) {
    const res = await fetch("/api/saas/sso", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle-enforce", enforced }),
    });
    if (res.ok) { flash(enforced ? "SSO enforced activado" : "SSO enforced desactivado"); void load(); }
    else flash("Error al cambiar SSO enforced");
  }

  const callbackUrl = typeof window !== "undefined"
    ? `${window.location.origin}/api/auth/sso/callback`
    : "/api/auth/sso/callback";

  const TABS: [Tab, string][] = [
    ["mfa", "2FA / TOTP"],
    ["sso", "SSO / IdP"],
    ["ip", "IP Allowlist"],
    ["roles", "Roles custom"],
    ["territories", "Territorios"],
    ["sandboxes", "Sandboxes"],
  ];

  return (
    <SaasW3crmShell>
      {/* `pageTitle` no repite el `mainTitle`: sería una segunda coincidencia. */}
      <W3crmPageTitle mainTitle="Seguridad Enterprise" parentTitle="Cuenta" pageTitle="Enterprise" />
      <div className="container-fluid">
        <div className="row">
          <div className="col-xl-12">
            <p className="fs-14 text-muted">
              SSO, MFA, IP allowlist, RBAC custom, territorios CRM y sandboxes.
            </p>

            {notice && <div className="alert alert-primary" role="status">{notice}</div>}
            {schemaPending && (
              <div className="alert alert-warning" role="alert">
                Esquema de seguridad pendiente o degradado — algunas acciones pueden no persistir hasta
                aplicar migraciones.
              </div>
            )}

            <ul className="nav nav-tabs mb-3">
              {TABS.map(([id, label]) => (
                <li className="nav-item" key={id}>
                  <button type="button" className={`nav-link ${tab === id ? "active" : ""}`}
                    aria-pressed={tab === id} onClick={() => setTab(id)}>
                    {label}
                  </button>
                </li>
              ))}
            </ul>

            {!data ? (
              <W3crmContentBox titulo="Configuración" icono="fa-solid fa-shield-halved">
                <W3crmCargando texto="Cargando configuración…" />
              </W3crmContentBox>
            ) : tab === "mfa" ? (
              <W3crmContentBox titulo="Autenticación en dos pasos" icono="fa-solid fa-mobile-screen-button">
                <p className="fs-14 text-muted">
                  Estado: {data.mfa.enabled ? "MFA activo" : "Sin MFA"} ·
                  {data.mfa.enforced ? " obligatorio para el tenant" : " opcional"}
                </p>
                {!data.mfa.enabled && (
                  <button type="button" className="btn btn-primary mb-3" onClick={() => void post("mfa-begin", {})}>
                    Iniciar enrolamiento TOTP
                  </button>
                )}
                {mfaProvisioningUri && (
                  <div className="border rounded bg-light p-3 mb-3">
                    <p className="fw-bold mb-1">URI de aprovisionamiento TOTP</p>
                    <p className="fs-12 text-muted">
                      Escanea o pega esta URI en tu app autenticadora (Google Authenticator, 1Password, etc.).
                    </p>
                    <code className="d-block text-break mb-2">{mfaProvisioningUri}</code>
                    {/* `clipboard` puede no existir sin permiso. */}
                    <button type="button" className="btn btn-primary light btn-sm"
                      onClick={() => void navigator.clipboard?.writeText(mfaProvisioningUri)}>
                      Copiar URI
                    </button>
                  </div>
                )}
                <div className="row align-items-end">
                  <div className="col-sm-8">
                    <div className="form-group mb-3">
                      <label htmlFor="sec-mfa-code" className="text-black font-w600">Código 6 dígitos</label>
                      <input id="sec-mfa-code" className="form-control" placeholder="000000"
                        value={mfaCode} onChange={(e) => setMfaCode(e.target.value)} />
                    </div>
                  </div>
                  <div className="col-sm-4">
                    <div className="form-group mb-3">
                      <button type="button" className="btn btn-primary light w-100"
                        onClick={() => void post("mfa-verify", { code: mfaCode })}>
                        Verificar
                      </button>
                    </div>
                  </div>
                </div>
                <button type="button" className="btn btn-primary light btn-sm"
                  onClick={() => void post("mfa-enforce", { enforced: !data.mfa.enforced })}>
                  {data.mfa.enforced ? "Desactivar" : "Activar"} MFA obligatorio
                </button>
              </W3crmContentBox>
            ) : tab === "sso" ? (
              <W3crmContentBox titulo="Proveedor de identidad" icono="fa-solid fa-id-badge">
                <p className="fs-14 text-muted">
                  {ssoConfig?.enforced ? t("status_enforced") : t("status_optional")} · {t("title")}
                </p>
                <p className="fs-12 text-muted">{t("callback_url")}: <code>{callbackUrl}</code></p>
                <div className="row">
                  <div className="col-sm-6">
                    <div className="form-group mb-3">
                      <label htmlFor="sso-provider" className="text-black font-w600">{t("provider")}</label>
                      <select id="sso-provider" className="form-control" value={ssoProvider}
                        onChange={(e) => setSsoProvider(e.target.value as "oidc" | "saml")}>
                        <option value="oidc">OIDC</option>
                        <option value="saml">SAML 2.0</option>
                      </select>
                    </div>
                  </div>
                  <div className="col-sm-6">
                    <div className="form-group mb-3">
                      <label htmlFor="sso-issuer" className="text-black font-w600">{t("issuer")}</label>
                      <input id="sso-issuer" className="form-control" placeholder="https://idp.example.com"
                        value={ssoIssuer} onChange={(e) => setSsoIssuer(e.target.value)} />
                    </div>
                  </div>
                  <div className="col-sm-6">
                    <div className="form-group mb-3">
                      <label htmlFor="sso-client-id" className="text-black font-w600">{t("client_id")}</label>
                      <input id="sso-client-id" className="form-control"
                        value={ssoClientId} onChange={(e) => setSsoClientId(e.target.value)} />
                    </div>
                  </div>
                  <div className="col-sm-6">
                    <div className="form-group mb-3">
                      <label htmlFor="sso-client-secret" className="text-black font-w600">{t("client_secret")}</label>
                      <input id="sso-client-secret" className="form-control" type="password"
                        placeholder={ssoConfig ? "••••••••" : ""}
                        value={ssoClientSecret} onChange={(e) => setSsoClientSecret(e.target.value)} />
                    </div>
                  </div>
                  <div className="col-sm-12">
                    <div className="form-group mb-3">
                      <label htmlFor="sso-domains" className="text-black font-w600">{t("domains")}</label>
                      <input id="sso-domains" className="form-control" placeholder="empresa.com, otra.com"
                        value={ssoDomains} onChange={(e) => setSsoDomains(e.target.value)} />
                    </div>
                  </div>
                </div>
                <div className="text-end">
                  <button type="button" className="btn btn-primary light me-2"
                    onClick={() => void toggleSsoEnforce(!ssoConfig?.enforced)}>
                    {ssoConfig?.enforced ? t("disable_enforce") : t("enable_enforce")}
                  </button>
                  <button type="button" className="btn btn-primary" onClick={() => void saveSso()}>
                    {t("save")}
                  </button>
                </div>
              </W3crmContentBox>
            ) : tab === "ip" ? (
              <W3crmContentBox titulo="Direcciones IP permitidas" icono="fa-solid fa-network-wired">
                <div className="form-check mb-3">
                  <input className="form-check-input" type="checkbox" id="sec-ip-enabled"
                    checked={ipEnabled} onChange={(e) => setIpEnabled(e.target.checked)} />
                  <label className="form-check-label" htmlFor="sec-ip-enabled">Restringir acceso por IP</label>
                </div>
                <div className="form-group mb-3">
                  <label htmlFor="sec-cidrs" className="text-black font-w600">CIDRs (uno por línea)</label>
                  <textarea id="sec-cidrs" className="form-control" rows={6}
                    placeholder={"203.0.113.0/24\n198.51.100.42"}
                    value={cidrs} onChange={(e) => setCidrs(e.target.value)} />
                </div>
                <div className="text-end">
                  <button type="button" className="btn btn-primary"
                    onClick={() => void post("ip-allowlist", {
                      enabled: ipEnabled,
                      cidrs: cidrs.split(/\n+/).map((s) => s.trim()).filter(Boolean),
                    })}>
                    Guardar allowlist
                  </button>
                </div>
              </W3crmContentBox>
            ) : tab === "roles" ? (
              <>
                <W3crmContentBox titulo="Roles personalizados" icono="fa-solid fa-user-shield">
                  <div className="row align-items-end">
                    <div className="col-sm-8">
                      <div className="form-group mb-3">
                        <label htmlFor="sec-rol" className="text-black font-w600">Nombre del rol</label>
                        <input id="sec-rol" className="form-control"
                          value={roleName} onChange={(e) => setRoleName(e.target.value)} />
                      </div>
                    </div>
                    <div className="col-sm-4">
                      <div className="form-group mb-3">
                        <button type="button" className="btn btn-primary w-100" disabled={!roleName.trim()}
                          onClick={() => void post("custom-role", {
                            name: roleName, permissions: ["contacts.read", "deals.read"],
                          })}>
                          Crear rol
                        </button>
                      </div>
                    </div>
                  </div>
                  {data.roles.length === 0 ? (
                    <W3crmEmptyState title="Sin roles personalizados" description="Crea el primero con el formulario de arriba." />
                  ) : (
                    <W3crmDataTable
                      filas={data.roles}
                      etiqueta="roles"
                      wrapperId="sec_roles_wrapper"
                      porPagina={10}
                      columnas={[{ titulo: "Rol" }, { titulo: "Permisos", alFinal: true }]}
                      render={(r) => (
                        <tr key={r.id}>
                          <td><span className="fw-bold">{txt(r.name) || "—"}</span></td>
                          <td className="text-end text-muted fs-12">{lista(r.permissions).join(", ") || "—"}</td>
                        </tr>
                      )}
                    />
                  )}
                </W3crmContentBox>

                <W3crmContentBox titulo="Asignar rol a usuario" icono="fa-solid fa-user-check">
                  <div className="row align-items-end">
                    <div className="col-sm-5">
                      <div className="form-group mb-3">
                        <label htmlFor="sec-usuario" className="text-black font-w600">Usuario</label>
                        <select id="sec-usuario" className="form-control" value={assignUserId}
                          onChange={(e) => setAssignUserId(e.target.value)}>
                          <option value="">Usuario…</option>
                          {members.filter((m) => m.userId).map((m) => (
                            <option key={m.id} value={m.userId!}>{m.name ?? m.email}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="col-sm-4">
                      <div className="form-group mb-3">
                        <label htmlFor="sec-rol-asignar" className="text-black font-w600">Rol</label>
                        <select id="sec-rol-asignar" className="form-control" value={assignRoleId}
                          onChange={(e) => setAssignRoleId(e.target.value)}>
                          <option value="">Rol…</option>
                          {data.roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="col-sm-3">
                      <div className="form-group mb-3">
                        <button type="button" className="btn btn-primary w-100"
                          disabled={!assignUserId || !assignRoleId}
                          onClick={() => void post("assign-role", { userId: assignUserId, roleId: assignRoleId })}>
                          Asignar
                        </button>
                      </div>
                    </div>
                  </div>
                </W3crmContentBox>
              </>
            ) : tab === "territories" ? (
              <W3crmContentBox titulo="Territorios CRM" icono="fa-solid fa-map-location-dot">
                <div className="row align-items-end">
                  <div className="col-sm-8">
                    <div className="form-group mb-3">
                      <label htmlFor="sec-territorio" className="text-black font-w600">Territorio</label>
                      <input id="sec-territorio" className="form-control" placeholder="Territorio (ej. Madrid)"
                        value={territoryName} onChange={(e) => setTerritoryName(e.target.value)} />
                    </div>
                  </div>
                  <div className="col-sm-4">
                    <div className="form-group mb-3">
                      <button type="button" className="btn btn-primary w-100" disabled={!territoryName.trim()}
                        onClick={() => void post("territory", { name: territoryName, regions: [territoryName] })}>
                        Crear territorio
                      </button>
                    </div>
                  </div>
                </div>
                {data.territories.length === 0 ? (
                  <W3crmEmptyState title="Sin territorios" description="Crea el primero con el formulario de arriba." />
                ) : (
                  <W3crmDataTable
                    filas={data.territories}
                    etiqueta="territorios"
                    wrapperId="sec_territories_wrapper"
                    porPagina={10}
                    columnas={[{ titulo: "Territorio" }, { titulo: "Regiones", alFinal: true }]}
                    render={(ter) => (
                      <tr key={ter.id}>
                        <td><span className="fw-bold">{txt(ter.name) || "—"}</span></td>
                        <td className="text-end text-muted fs-12">{lista(ter.regions).join(", ") || "—"}</td>
                      </tr>
                    )}
                  />
                )}
              </W3crmContentBox>
            ) : (
              <W3crmContentBox
                titulo="Entornos sandbox"
                icono="fa-solid fa-flask"
                acciones={
                  <button type="button" className="btn btn-primary btn-sm me-2"
                    onClick={() => void post("sandbox", { name: `Sandbox ${new Date().toLocaleDateString("es-ES")}` })}>
                    + Crear sandbox
                  </button>
                }
              >
                {(data.sandboxes ?? []).length === 0 ? (
                  <W3crmEmptyState title="Sin sandboxes" description="Crea el primero con el botón de la cabecera." />
                ) : (
                  <W3crmDataTable
                    filas={data.sandboxes ?? []}
                    etiqueta="sandboxes"
                    wrapperId="sec_sandboxes_wrapper"
                    porPagina={10}
                    columnas={[{ titulo: "Sandbox", alFinal: false }]}
                    render={(s) => (
                      <tr key={s.id}>
                        <td><span className="fw-bold">{txt(s.name) || "—"}</span></td>
                      </tr>
                    )}
                  />
                )}
              </W3crmContentBox>
            )}
          </div>
        </div>
      </div>
    </SaasW3crmShell>
  );
}
