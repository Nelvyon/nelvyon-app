"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { NelvyonDsBadge } from "@/design-system/components";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";
import { SaasShellLayout, DarkCard } from "@/features/saas-shell/components/SaasShellLayout";
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

const inputCls =
  "w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-[#0084ff]/60";
const tabBtn = (active: boolean) =>
  `px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
    active ? "bg-[#0084ff]/15 text-[#0084ff]" : "text-white/40 hover:text-white/70"
  }`;

type Tab = "general" | "sso" | "permisos";

const LOCALE_OPTIONS: { value: AppLocale; label: string }[] = [
  { value: "es", label: "Español" },
  { value: "en", label: "English" },
  { value: "fr", label: "Français" },
  { value: "pt", label: "Português" },
  { value: "de", label: "Deutsch" },
  { value: "it", label: "Italiano" },
];

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

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/saas/settings", { credentials: "same-origin" });
        if (res.status === 401) {
          router.replace("/auth/login?next=/saas/settings");
          return;
        }
        if (!res.ok) throw new Error("No se pudo cargar la configuración");
        setData((await res.json()) as SettingsSummary);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Error");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  useEffect(() => {
    if (tab !== "sso") return;
    void (async () => {
      setSsoLoading(true);
      try {
        const res = await fetch("/api/saas/sso", { credentials: "same-origin" });
        if (res.ok) {
          const json = (await res.json()) as { config: SsoConfig | null };
          setSsoConfig(json.config);
          if (json.config) {
            setSsoForm(f => ({
              ...f,
              provider: json.config!.provider,
              issuer: json.config!.issuer,
              clientId: json.config!.clientId,
              domains: json.config!.domains.join(", "),
            }));
          }
        }
      } finally {
        setSsoLoading(false);
      }
    })();
  }, [tab]);

  const canManageSso = data?.permissions.includes("sso.write") ?? false;

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
      if (!res.ok) throw new Error((await res.json() as { error: string }).error);
      const json = (await res.json()) as { config: SsoConfig };
      setSsoConfig(json.config);
      setSsoSaved(true);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSsoLoading(false);
    }
  }

  async function toggleEnforce(enforced: boolean) {
    const res = await fetch("/api/saas/sso", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle-enforce", enforced }),
    });
    if (res.ok) {
      const json = (await res.json()) as { config: SsoConfig };
      setSsoConfig(json.config);
    }
  }

  const displayRole = data?.role ?? hookRole;

  return (
    <SaasShellLayout
      sidebar={<SaasSidebar activeId="settings" tenantCompany={data?.tenant.companyName} tenantPlan={data?.tenant.plan} />}
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-[#0084ff]/70">Cuenta</p>
        <h1 className="mt-1 text-2xl font-bold text-white">Configuración</h1>
        <p className="mt-0.5 text-sm text-white/40">Perfil del tenant, SSO y permisos efectivos.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border border-white/[0.06] bg-white/[0.02] p-1 w-fit">
        {(["general", "sso", "permisos"] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} className={tabBtn(tab === t)}>
            {t === "general" ? "General" : t === "sso" ? "🔐 SSO Enterprise" : "Permisos"}
          </button>
        ))}
      </div>

      {loading ? <DarkCard><p className="text-sm text-white/40">Cargando…</p></DarkCard> : null}
      {error ? <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">{error}</div> : null}

      {/* ── Tab General ── */}
      {tab === "general" && data ? (
        <>
          <DarkCard glow>
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-white/30">Tenant</p>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              {[
                { label: "Empresa", value: data.tenant.companyName },
                { label: "Industria", value: data.tenant.industry },
                { label: "Web", value: data.tenant.website ?? "—" },
                { label: "Teléfono", value: data.tenant.phone ?? "—" },
              ].map((row) => (
                <div key={row.label}>
                  <dt className="text-[10px] uppercase tracking-wider text-white/30">{row.label}</dt>
                  <dd className="mt-0.5 font-medium text-white/80">{row.value}</dd>
                </div>
              ))}
              <div>
                <dt className="text-[10px] uppercase tracking-wider text-white/30">Plan</dt>
                <dd className="mt-0.5">
                  <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-bold uppercase tracking-wider ${
                    data.tenant.plan === "enterprise" ? "bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/25" :
                    data.tenant.plan === "pro" ? "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/25" :
                    "bg-[#0084ff]/15 text-[#0084ff] ring-1 ring-[#0084ff]/25"
                  }`}>{data.tenant.plan}</span>
                </dd>
              </div>
            </dl>
          </DarkCard>
          <DarkCard>
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/30">Idioma de la interfaz</p>
            <div className="flex items-center gap-3">
              <select
                value={locale}
                onChange={async (e) => {
                  setLocaleSaving(true);
                  setLocaleSaved(false);
                  await setLocale(e.target.value as AppLocale);
                  setLocaleSaving(false);
                  setLocaleSaved(true);
                  setTimeout(() => setLocaleSaved(false), 2000);
                }}
                aria-label="Seleccionar idioma"
                className={inputCls + " max-w-48"}
              >
                {LOCALE_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              {localeSaving && <span className="text-xs text-white/40">Guardando…</span>}
              {localeSaved && <span className="text-xs text-emerald-400">✓ Idioma actualizado</span>}
            </div>
          </DarkCard>
        </>
      ) : null}

      {/* ── Tab SSO ── */}
      {tab === "sso" && (
        <DarkCard glow>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-widest text-white/30">Single Sign-On (OIDC / SAML)</p>
            {ssoConfig && (
              <NelvyonDsBadge tone={ssoConfig.enforced ? "success" : "neutral"}>
                {ssoConfig.enforced ? "Enforced" : "Optional"}
              </NelvyonDsBadge>
            )}
          </div>

          {!canManageSso && (
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-400 mb-4">
              Solo owner/admin pueden configurar SSO.
            </div>
          )}

          {ssoLoading && <p className="text-sm text-white/40">Cargando…</p>}

          {!ssoLoading && canManageSso && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs text-white/40 mb-1">Provider</label>
                  <select
                    value={ssoForm.provider}
                    onChange={e => setSsoForm(f => ({ ...f, provider: e.target.value as "oidc" | "saml" }))}
                    className={inputCls}
                  >
                    <option value="oidc">OIDC (Google Workspace, Azure AD, Okta)</option>
                    <option value="saml">SAML 2.0</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-white/40 mb-1">Issuer URL</label>
                  <input
                    type="url" value={ssoForm.issuer} placeholder="https://accounts.google.com"
                    onChange={e => setSsoForm(f => ({ ...f, issuer: e.target.value }))}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs text-white/40 mb-1">Client ID</label>
                  <input
                    type="text" value={ssoForm.clientId} placeholder="client_id"
                    onChange={e => setSsoForm(f => ({ ...f, clientId: e.target.value }))}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs text-white/40 mb-1">Client Secret</label>
                  <input
                    type="password" value={ssoForm.clientSecret} placeholder="••••••••"
                    onChange={e => setSsoForm(f => ({ ...f, clientSecret: e.target.value }))}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs text-white/40 mb-1">Metadata URL (opcional)</label>
                  <input
                    type="url" value={ssoForm.metadataUrl} placeholder="https://.../.well-known/openid-configuration"
                    onChange={e => setSsoForm(f => ({ ...f, metadataUrl: e.target.value }))}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs text-white/40 mb-1">Dominios (separados por coma)</label>
                  <input
                    type="text" value={ssoForm.domains} placeholder="empresa.com, subsidiaria.es"
                    onChange={e => setSsoForm(f => ({ ...f, domains: e.target.value }))}
                    className={inputCls}
                  />
                </div>
              </div>

              {ssoSaved && (
                <p className="text-xs text-emerald-400">✓ Configuración guardada correctamente.</p>
              )}

              <div className="flex items-center gap-3">
                <button
                  onClick={() => void saveSsoConfig()}
                  disabled={ssoLoading}
                  className="rounded-lg bg-[#0084ff] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0070d8] disabled:opacity-50"
                >
                  Guardar configuración
                </button>

                {ssoConfig && (
                  <button
                    onClick={() => void toggleEnforce(!ssoConfig.enforced)}
                    className={`rounded-lg border px-4 py-2 text-sm font-semibold transition-colors ${
                      ssoConfig.enforced
                        ? "border-red-500/30 text-red-400 hover:bg-red-500/10"
                        : "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                    }`}
                  >
                    {ssoConfig.enforced ? "Desactivar SSO enforced" : "Activar SSO enforced"}
                  </button>
                )}
              </div>

              {ssoConfig && (
                <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 mt-2">
                  <p className="text-[10px] uppercase tracking-wider text-white/25 mb-1">Callback URL para tu IdP</p>
                  <code className="text-xs text-[#0084ff] break-all">
                    {typeof window !== "undefined" ? window.location.origin : "https://app.nelvyon.com"}/api/auth/sso/callback
                  </code>
                </div>
              )}
            </div>
          )}
        </DarkCard>
      )}

      {/* ── Tab Permisos ── */}
      {tab === "permisos" && data ? (
        <DarkCard>
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-white/30">Tu rol en este tenant</p>
          {displayRole ? (
            <div className="space-y-3">
              <span className="inline-flex rounded-md bg-[#0084ff]/10 px-2.5 py-1 text-sm font-semibold text-[#0084ff] ring-1 ring-[#0084ff]/20">
                {saasRoleLabel(displayRole)}
              </span>
              <p className="text-sm text-white/40">
                {displayRole === "viewer"
                  ? "Solo lectura: puedes consultar datos, pero no crear, editar ni eliminar recursos."
                  : displayRole === "member"
                    ? "Miembro: puedes crear y editar contactos y deals. No puedes eliminar recursos críticos ni ver facturación."
                    : "Administración completa del tenant, incluida facturación y eliminación de recursos."}
              </p>
            </div>
          ) : null}
          <div className="mt-4 rounded-lg border border-white/[0.05] bg-white/[0.02] p-3">
            <p className="text-[10px] uppercase tracking-wider text-white/25 mb-1">Permisos efectivos</p>
            <p className="text-xs text-white/40 leading-relaxed">{data.permissions.join(", ")}</p>
          </div>
        </DarkCard>
      ) : null}
    </SaasShellLayout>
  );
}
