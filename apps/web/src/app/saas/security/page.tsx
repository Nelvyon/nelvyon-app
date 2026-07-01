"use client";

import { useCallback, useEffect, useState } from "react";
import { SaasShellLayout } from "@/features/saas-shell/components/SaasShellLayout";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";

type Tab = "mfa" | "ip" | "roles" | "territories" | "sandboxes";

type SecurityData = {
  allowlist: { enabled: boolean; cidrs: string[] };
  roles: Array<{ id: string; name: string; permissions: string[] }>;
  territories: Array<{ id: string; name: string; regions: string[] }>;
  mfa: { enabled: boolean; enforced: boolean; provisioningUri?: string };
  sandboxes?: Array<{ id: string; name: string }>;
};

export default function SaasSecurityPage() {
  const [tab, setTab] = useState<Tab>("mfa");
  const [data, setData] = useState<SecurityData | null>(null);
  const [cidrs, setCidrs] = useState("");
  const [ipEnabled, setIpEnabled] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [roleName, setRoleName] = useState("");
  const [territoryName, setTerritoryName] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  const flash = (msg: string) => { setNotice(msg); setTimeout(() => setNotice(null), 4000); };

  const load = useCallback(async () => {
    const res = await fetch("/api/saas/security");
    if (!res.ok) return;
    const d = (await res.json()) as SecurityData & { sandboxes: SecurityData["sandboxes"] };
    setData(d);
    setCidrs((d.allowlist?.cidrs ?? []).join("\n"));
    setIpEnabled(Boolean(d.allowlist?.enabled));
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
          <section className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
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
