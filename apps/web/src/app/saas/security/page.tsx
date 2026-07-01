"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { SaasShellLayout } from "@/features/saas-shell/components/SaasShellLayout";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";

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

  const flash = (msg: string) => { setNotice(msg); setTimeout(() => setNotice(null), 4000); };

  const load = useCallback(async () => {
    const [secRes, teamRes, ssoRes] = await Promise.all([
      fetch("/api/saas/security"),
      fetch("/api/saas/team"),
      fetch("/api/saas/sso"),
    ]);
    if (secRes.ok) {
      const d = (await secRes.json()) as SecurityData & { sandboxes: SecurityData["sandboxes"] };
      setData(d);
      setCidrs((d.allowlist?.cidrs ?? []).join("\n"));
      setIpEnabled(Boolean(d.allowlist?.enabled));
    }
    if (teamRes.ok) {
      const d = (await teamRes.json()) as { members: TeamMember[] };
      setMembers(d.members ?? []);
    }
    if (ssoRes.ok) {
      const d = (await ssoRes.json()) as { config: SsoConfig };
      const c = d.config;
      setSsoConfig(c);
      if (c) {
        setSsoProvider(c.provider);
        setSsoIssuer(c.issuer);
        setSsoClientId(c.clientId);
        setSsoDomains(c.domains.join(", "));
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
    if (res.ok) { flash("Guardado"); void load(); }
    else flash("Error al guardar");
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

  return (
    <SaasShellLayout sidebar={<SaasSidebar activeId="security" />}>
      <div className="mx-auto max-w-5xl space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">Seguridad Enterprise</h1>
          <p className="mt-1 text-sm text-white/50">SSO, MFA, IP allowlist, RBAC custom, territorios CRM y sandboxes.</p>
        </div>

        {notice && <div className="rounded-lg border border-[#0084ff]/30 bg-[#0084ff]/10 px-4 py-2 text-sm text-white">{notice}</div>}

        <div className="flex flex-wrap gap-2">
          {([
            ["mfa", "2FA / TOTP"],
            ["sso", "SSO / IdP"],
            ["ip", "IP Allowlist"],
            ["roles", "Roles custom"],
            ["territories", "Territorios"],
            ["sandboxes", "Sandboxes"],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`rounded-lg px-3 py-1.5 text-sm ${tab === id ? "bg-[#0084ff] text-white" : "border border-white/10 text-white/60"}`}
            >
              {label}
            </button>
          ))}
        </div>

        {!data ? (
          <p className="text-white/50">Cargando…</p>
        ) : tab === "mfa" ? (
          <section className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-4">
            <p className="text-sm text-white/70">
              Estado: {data.mfa.enabled ? "✅ MFA activo" : "⚠️ Sin MFA"} ·
              {data.mfa.enforced ? " obligatorio para el tenant" : " opcional"}
            </p>
            {!data.mfa.enabled && (
              <button type="button" className="rounded-lg bg-[#0084ff] px-4 py-2 text-sm text-white" onClick={() => void post("mfa-begin", {})}>
                Iniciar enrolamiento TOTP
              </button>
            )}
            <div className="flex gap-2">
              <input
                className="flex-1 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
                placeholder="Código 6 dígitos"
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value)}
              />
              <button type="button" className="rounded-lg border border-white/20 px-4 py-2 text-sm text-white" onClick={() => void post("mfa-verify", { code: mfaCode })}>
                Verificar
              </button>
            </div>
            <button type="button" className="text-sm text-[#0084ff]" onClick={() => void post("mfa-enforce", { enforced: !data.mfa.enforced })}>
              {data.mfa.enforced ? "Desactivar" : "Activar"} MFA obligatorio
            </button>
          </section>
        ) : tab === "sso" ? (
          <section className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-4">
            <p className="text-sm text-white/70">
              {ssoConfig?.enforced ? t("status_enforced") : t("status_optional")} · {t("title")}
            </p>
            <p className="text-xs text-white/40">{t("callback_url")}: <code className="text-white/60">{callbackUrl}</code></p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm text-white/60">
                {t("provider")}
                <select
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
                  value={ssoProvider}
                  onChange={(e) => setSsoProvider(e.target.value as "oidc" | "saml")}
                >
                  <option value="oidc">OIDC</option>
                  <option value="saml">SAML 2.0</option>
                </select>
              </label>
              <label className="text-sm text-white/60 sm:col-span-2">
                {t("issuer")}
                <input className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white" value={ssoIssuer} onChange={(e) => setSsoIssuer(e.target.value)} placeholder="https://idp.example.com" />
              </label>
              <label className="text-sm text-white/60">
                {t("client_id")}
                <input className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white" value={ssoClientId} onChange={(e) => setSsoClientId(e.target.value)} />
              </label>
              <label className="text-sm text-white/60">
                {t("client_secret")}
                <input type="password" className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white" value={ssoClientSecret} onChange={(e) => setSsoClientSecret(e.target.value)} placeholder={ssoConfig ? "••••••••" : ""} />
              </label>
              <label className="text-sm text-white/60 sm:col-span-2">
                {t("domains")}
                <input className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white" value={ssoDomains} onChange={(e) => setSsoDomains(e.target.value)} placeholder="empresa.com, otra.com" />
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="rounded-lg bg-[#0084ff] px-4 py-2 text-sm text-white" onClick={() => void saveSso()}>
                {t("save")}
              </button>
              <button
                type="button"
                className="rounded-lg border border-white/20 px-4 py-2 text-sm text-white"
                onClick={() => void toggleSsoEnforce(!ssoConfig?.enforced)}
              >
                {ssoConfig?.enforced ? t("disable_enforce") : t("enable_enforce")}
              </button>
            </div>
          </section>
        ) : tab === "ip" ? (
          <section className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
            <label className="flex items-center gap-2 text-sm text-white">
              <input type="checkbox" checked={ipEnabled} onChange={(e) => setIpEnabled(e.target.checked)} />
              Restringir acceso por IP
            </label>
            <textarea
              className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white font-mono h-32"
              placeholder="203.0.113.0/24&#10;198.51.100.42"
              value={cidrs}
              onChange={(e) => setCidrs(e.target.value)}
            />
            <button type="button" className="rounded-lg bg-[#0084ff] px-4 py-2 text-sm text-white" onClick={() => void post("ip-allowlist", { enabled: ipEnabled, cidrs: cidrs.split(/\n+/).map((s) => s.trim()).filter(Boolean) })}>
              Guardar allowlist
            </button>
          </section>
        ) : tab === "roles" ? (
          <section className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-4">
            <div className="flex gap-2">
              <input className="flex-1 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white" placeholder="Nombre del rol" value={roleName} onChange={(e) => setRoleName(e.target.value)} />
              <button type="button" className="rounded-lg bg-[#0084ff] px-4 py-2 text-sm text-white" onClick={() => void post("custom-role", { name: roleName, permissions: ["contacts.read", "deals.read"] })}>
                Crear rol
              </button>
            </div>
            <ul className="space-y-2">
              {data.roles.map((r) => (
                <li key={r.id} className="rounded-lg border border-white/10 px-3 py-2 text-sm text-white/80">
                  <span className="font-medium text-white">{r.name}</span>
                  <span className="ml-2 text-xs text-white/40">{r.permissions.join(", ")}</span>
                </li>
              ))}
            </ul>
            <div className="border-t border-white/10 pt-4 space-y-2">
              <p className="text-sm font-medium text-white">Asignar rol a usuario</p>
              <div className="flex flex-wrap gap-2">
                <select
                  className="flex-1 min-w-[160px] rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
                  value={assignUserId}
                  onChange={(e) => setAssignUserId(e.target.value)}
                >
                  <option value="">Usuario…</option>
                  {members.filter((m) => m.userId).map((m) => (
                    <option key={m.id} value={m.userId!}>{m.name ?? m.email}</option>
                  ))}
                </select>
                <select
                  className="flex-1 min-w-[160px] rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
                  value={assignRoleId}
                  onChange={(e) => setAssignRoleId(e.target.value)}
                >
                  <option value="">Rol…</option>
                  {data.roles.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={!assignUserId || !assignRoleId}
                  className="rounded-lg bg-[#0084ff] px-4 py-2 text-sm text-white disabled:opacity-40"
                  onClick={() => void post("assign-role", { userId: assignUserId, roleId: assignRoleId })}
                >
                  Asignar
                </button>
              </div>
            </div>
          </section>
        ) : tab === "territories" ? (
          <section className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
            <div className="flex gap-2">
              <input className="flex-1 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white" placeholder="Territorio (ej. Madrid)" value={territoryName} onChange={(e) => setTerritoryName(e.target.value)} />
              <button type="button" className="rounded-lg bg-[#0084ff] px-4 py-2 text-sm text-white" onClick={() => void post("territory", { name: territoryName, regions: [territoryName] })}>
                Crear territorio
              </button>
            </div>
            <ul className="space-y-2">
              {data.territories.map((t) => (
                <li key={t.id} className="rounded-lg border border-white/10 px-3 py-2 text-sm text-white">{t.name} — {t.regions.join(", ")}</li>
              ))}
            </ul>
          </section>
        ) : (
          <section className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
            <button type="button" className="rounded-lg bg-[#0084ff] px-4 py-2 text-sm text-white" onClick={() => void post("sandbox", { name: `Sandbox ${new Date().toLocaleDateString("es-ES")}` })}>
              + Crear sandbox
            </button>
            <ul className="space-y-2">
              {(data.sandboxes ?? []).map((s) => (
                <li key={s.id} className="rounded-lg border border-white/10 px-3 py-2 text-sm text-white">{s.name}</li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </SaasShellLayout>
  );
}
