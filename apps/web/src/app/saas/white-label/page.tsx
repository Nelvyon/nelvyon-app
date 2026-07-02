"use client";

import { useCallback, useEffect, useState } from "react";
import { NelvyonDsButton, NelvyonDsCard, NelvyonDsSectionHeader } from "@/design-system/components";
import { SaasShellLayout } from "@/features/saas-shell/components/SaasShellLayout";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";

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

interface _ConnectStatus {
  connected: boolean;
  accountId: string | null;
  status: StripeConnectStatus;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  onboardedAt: string | null;
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

// ── Stripe Connect Panel ───────────────────────────────────────────────────────
function StripeConnectPanel({ config, onRefresh }: { config: WhiteLabelConfig; onRefresh: () => void }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const status = config.stripeConnectStatus;
  const isActive = status === "active";

  async function createAccount() {
    if (!email.includes("@")) { setMsg({ text: "Email inválido", ok: false }); return; }
    setLoading(true); setMsg(null);
    try {
      const res = await fetch("/api/saas/white-label", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "create-stripe-connect", email, businessName: config.agencyName || "Mi Agencia" }) });
      const d = await res.json() as { accountId?: string; error?: string };
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
      const d = await res.json() as { url?: string; error?: string };
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

  const statusColor: Record<StripeConnectStatus, string> = {
    not_connected: "text-muted-foreground",
    pending:       "text-yellow-400",
    active:        "text-green-400",
    restricted:    "text-red-400",
  };
  const statusLabel: Record<StripeConnectStatus, string> = {
    not_connected: "Sin conectar",
    pending:       "Pendiente onboarding",
    active:        "Activo ✓",
    restricted:    "Restringido",
  };

  return (
    <NelvyonDsCard className="p-5 space-y-4">
      <h3 className="text-sm font-semibold text-foreground border-b border-border pb-3">Stripe Connect — Cobros de agencia</h3>
      <p className="text-xs text-muted-foreground">Conecta tu cuenta de Stripe para recibir pagos de tus subcuentas directamente, con comisión de plataforma automática.</p>

      {msg && <p className={`rounded-lg px-4 py-2 text-sm ${msg.ok ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>{msg.text}</p>}

      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/10 border border-border">
        <div className={`h-2.5 w-2.5 rounded-full ${isActive ? "bg-green-400" : status === "pending" ? "bg-yellow-400" : "bg-muted-foreground"}`} />
        <div className="flex-1">
          <p className={`text-sm font-medium ${statusColor[status]}`}>{statusLabel[status]}</p>
          {config.stripeConnectAccountId && <p className="text-xs text-muted-foreground font-mono mt-0.5">{config.stripeConnectAccountId}</p>}
          {config.stripeConnectOnboardedAt && <p className="text-xs text-muted-foreground mt-0.5">Activo desde {new Date(config.stripeConnectOnboardedAt).toLocaleDateString("es-ES")}</p>}
        </div>
        {config.stripeConnectAccountId && (
          <NelvyonDsButton variant="ghost" className="text-xs" disabled={loading} onClick={syncStatus}>Sincronizar</NelvyonDsButton>
        )}
      </div>

      {isActive && (
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Cobros habilitados", ok: config.stripeChargesEnabled },
            { label: "Payouts habilitados", ok: config.stripePayoutsEnabled },
          ].map(({ label, ok }) => (
            <div key={label} className={`rounded-lg p-3 text-xs ${ok ? "bg-green-500/10 border border-green-500/20 text-green-400" : "bg-muted/20 text-muted-foreground"}`}>
              {ok ? "✓" : "✗"} {label}
            </div>
          ))}
        </div>
      )}

      {status === "not_connected" && (
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Email de tu cuenta Stripe</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@empresa.com"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
          </div>
          <NelvyonDsButton onClick={createAccount} disabled={loading} className="w-full">
            {loading ? "Conectando…" : "Crear cuenta Stripe Connect"}
          </NelvyonDsButton>
        </div>
      )}

      {status === "pending" && (
        <NelvyonDsButton onClick={startOnboarding} disabled={loading} className="w-full">
          {loading ? "Redirigiendo…" : "Completar onboarding en Stripe →"}
        </NelvyonDsButton>
      )}

      {status === "restricted" && (
        <div className="space-y-2">
          <p className="text-xs text-red-400">Tu cuenta tiene restricciones. Completa el proceso de verificación en Stripe.</p>
          <NelvyonDsButton onClick={startOnboarding} disabled={loading} className="w-full">
            {loading ? "Redirigiendo…" : "Completar verificación →"}
          </NelvyonDsButton>
        </div>
      )}
    </NelvyonDsCard>
  );
}

// ── Field helpers ──────────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <NelvyonDsCard className="p-5 space-y-4">
      <h3 className="text-sm font-semibold text-foreground border-b border-border pb-3">{title}</h3>
      {children}
    </NelvyonDsCard>
  );
}
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
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
        const d = await res.json() as { config?: WhiteLabelConfig };
        if (d.config) setConfig(d.config);
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
      const d = await res.json() as { config?: WhiteLabelConfig; error?: string };
      if (!res.ok) { setSaveError(d.error ?? "Error al guardar"); return; }
      if (d.config) setConfig(d.config);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally { setSaving(false); }
  }

  const inp = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none";

  return (
    <SaasShellLayout sidebar={<SaasSidebar activeId="white-label" />}>
      <div className="flex flex-col gap-6 pb-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <NelvyonDsSectionHeader title="White Label" subtitle="Personaliza la plataforma con tu marca, dominio y colores corporativos" />
          <div className="flex items-center gap-2">
            {saved && <span className="text-sm text-green-400">✓ Guardado</span>}
            {saveError && <span className="text-sm text-red-400">{saveError}</span>}
            <NelvyonDsButton onClick={save} disabled={saving || loading}>
              {saving ? "Guardando…" : "Guardar cambios"}
            </NelvyonDsButton>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border">
          {(["branding", "domain", "email", "connect"] as const).map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${activeTab === t ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              {t === "branding" ? "🎨 Marca" : t === "domain" ? "🌐 Dominio" : t === "email" ? "📧 Email" : "⚡ Stripe Connect"}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-32 animate-pulse rounded-xl bg-muted/30" />)}</div>
        ) : (
          <>
            {activeTab === "branding" && (
              <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
                <div className="space-y-5">
                  <Section title="Identidad de marca">
                    <Field label="Nombre de la agencia" hint="Aparece en header, emails y notificaciones">
                      <input value={config.agencyName ?? ""} onChange={e => update("agencyName", e.target.value)} className={inp} />
                    </Field>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="URL del logo" hint="PNG/SVG, fondo transparente, mín. 200px">
                        <input value={config.logoUrl ?? ""} onChange={e => update("logoUrl", e.target.value || null)} placeholder="https://…" className={inp} />
                      </Field>
                      <Field label="URL del favicon">
                        <input value={config.faviconUrl ?? ""} onChange={e => update("faviconUrl", e.target.value || null)} placeholder="https://…favicon.ico" className={inp} />
                      </Field>
                    </div>
                  </Section>
                  <Section title="Colores corporativos">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Color primario">
                        <div className="flex gap-2">
                          <input type="color" value={config.primaryColor} onChange={e => update("primaryColor", e.target.value)} className="h-10 w-10 cursor-pointer rounded-lg border border-border" />
                          <input value={config.primaryColor} onChange={e => update("primaryColor", e.target.value)} className={`${inp} flex-1 font-mono uppercase`} maxLength={7} />
                        </div>
                        <div className="mt-2 flex gap-1.5 flex-wrap">
                          {PRESET_COLORS.map(c => (
                            <button key={c} type="button" onClick={() => update("primaryColor", c)}
                              className={`h-6 w-6 rounded-full border-2 transition-transform hover:scale-110 ${config.primaryColor === c ? "border-white scale-110" : "border-transparent"}`}
                              style={{ backgroundColor: c }} />
                          ))}
                        </div>
                      </Field>
                      <Field label="Color secundario">
                        <div className="flex gap-2">
                          <input type="color" value={config.secondaryColor} onChange={e => update("secondaryColor", e.target.value)} className="h-10 w-10 cursor-pointer rounded-lg border border-border" />
                          <input value={config.secondaryColor} onChange={e => update("secondaryColor", e.target.value)} className={`${inp} flex-1 font-mono uppercase`} maxLength={7} />
                        </div>
                      </Field>
                    </div>
                  </Section>
                  <Section title="Branding en plataforma">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <button type="button" onClick={() => update("hideNelvyonBranding", !config.hideNelvyonBranding)}
                        className={`relative inline-flex h-6 w-11 rounded-full transition-colors ${config.hideNelvyonBranding ? "bg-primary" : "bg-muted"}`}>
                        <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${config.hideNelvyonBranding ? "translate-x-5" : "translate-x-1"}`} />
                      </button>
                      <div>
                        <p className="text-sm text-foreground">Ocultar branding de Nelvyon</p>
                        <p className="text-xs text-muted-foreground">Solo disponible en plan Agency</p>
                      </div>
                    </label>
                    <Field label="Texto de pie de página">
                      <input value={config.footerText ?? ""} onChange={e => update("footerText", e.target.value || null)} placeholder="© 2026 Mi Agencia. Todos los derechos reservados." className={inp} />
                    </Field>
                  </Section>
                </div>

                {/* Live preview */}
                <div className="sticky top-6">
                  <p className="mb-3 text-xs font-medium text-muted-foreground">Vista previa</p>
                  <div className="rounded-2xl border border-border overflow-hidden shadow-lg">
                    <div className="flex items-center gap-3 px-4 py-3" style={{ backgroundColor: config.primaryColor }}>
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20 text-xs font-bold text-white">
                        {(config.agencyName || "A")[0]}
                      </div>
                      <span className="text-sm font-bold text-white">{config.agencyName || "Mi Agencia"}</span>
                    </div>
                    <div className="bg-background p-4 space-y-3">
                      <div className="h-8 rounded-lg" style={{ backgroundColor: `${config.primaryColor}25` }} />
                      <div className="h-3 w-3/4 rounded-md bg-muted/30" />
                      <div className="h-3 w-1/2 rounded-md bg-muted/20" />
                      <button className="mt-2 rounded-lg px-4 py-2 text-xs font-medium text-white" style={{ backgroundColor: config.primaryColor }}>
                        Acción principal
                      </button>
                    </div>
                    {config.footerText && (
                      <div className="border-t border-border px-4 py-2 text-center text-[10px] text-muted-foreground">
                        {config.footerText}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "domain" && (
              <div className="space-y-5">
                <Section title="Dominio personalizado">
                  <Field label="Dominio propio" hint="Ej: app.miempresa.com — apunta un CNAME a saas.nelvyon.com">
                    <input value={config.customDomain ?? ""} onChange={e => update("customDomain", e.target.value || null)} placeholder="app.miempresa.com" className={inp} />
                  </Field>
                  <NelvyonDsCard className="border-primary/20 bg-primary/5 p-4">
                    <p className="text-sm font-medium text-foreground mb-2">📋 Configuración DNS requerida</p>
                    <div className="font-mono text-xs space-y-1 text-muted-foreground">
                      <p>Tipo: <span className="text-foreground">CNAME</span></p>
                      <p>Host: <span className="text-foreground">{config.customDomain || "app.tudominio.com"}</span></p>
                      <p>Valor: <span className="text-primary">saas.nelvyon.com</span></p>
                      <p>TTL: <span className="text-foreground">3600</span></p>
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground">El certificado SSL se genera automáticamente en 24-48h tras el deploy.</p>
                  </NelvyonDsCard>
                </Section>
              </div>
            )}

            {activeTab === "email" && (
              <div className="space-y-5">
                <Section title="Remitente y soporte">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Email de soporte" hint="Aparece en los emails enviados a clientes">
                      <input type="email" value={config.supportEmail ?? ""} onChange={e => update("supportEmail", e.target.value || null)} placeholder="soporte@tuempresa.com" className={inp} />
                    </Field>
                    <Field label="Pie de página del email">
                      <input value={config.footerText ?? ""} onChange={e => update("footerText", e.target.value || null)} placeholder="El equipo de Mi Agencia" className={inp} />
                    </Field>
                  </div>
                  <NelvyonDsCard className="border-border bg-muted/5 p-4">
                    <p className="text-sm text-muted-foreground">Los emails se envían desde <span className="text-primary">SES de Nelvyon</span> con tu nombre de agencia. Para SMTP personalizado, contacta con soporte.</p>
                  </NelvyonDsCard>
                </Section>
              </div>
            )}

            {activeTab === "connect" && (
              <StripeConnectPanel config={config} onRefresh={load} />
            )}
          </>
        )}
      </div>
    </SaasShellLayout>
  );
}
