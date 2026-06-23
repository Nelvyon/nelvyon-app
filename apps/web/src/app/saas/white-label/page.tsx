"use client";

import { useState } from "react";
import { NelvyonDsButton, NelvyonDsCard, NelvyonDsSectionHeader } from "@/design-system/components";
import { SaasShellLayout } from "@/features/saas-shell/components/SaasShellLayout";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";

interface WhiteLabelConfig {
  brandName: string;
  logoUrl: string;
  faviconUrl: string;
  primaryColor: string;
  secondaryColor: string;
  customDomain: string;
  customLoginUrl: string;
  emailFromName: string;
  emailFromAddress: string;
  emailSignature: string;
  supportEmail: string;
  supportPhone: string;
  hideNelvyonBranding: boolean;
  customCss: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
}

const DEFAULT: WhiteLabelConfig = {
  brandName: "Mi Empresa",
  logoUrl: "",
  faviconUrl: "",
  primaryColor: "#6366f1",
  secondaryColor: "#10b981",
  customDomain: "",
  customLoginUrl: "",
  emailFromName: "Mi Empresa",
  emailFromAddress: "hola@miempresa.com",
  emailSignature: "El equipo de Mi Empresa",
  supportEmail: "soporte@miempresa.com",
  supportPhone: "+34 900 000 000",
  hideNelvyonBranding: false,
  customCss: "",
  smtpHost: "",
  smtpPort: 587,
  smtpUser: "",
};

const PRESET_COLORS = ["#6366f1", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#8b5cf6", "#000000"];

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

export default function SaasWhiteLabelPage() {
  const [config, setConfig] = useState<WhiteLabelConfig>(DEFAULT);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<"branding" | "domain" | "email" | "advanced">("branding");

  function update(key: keyof WhiteLabelConfig, value: string | boolean | number) {
    setConfig(c => ({ ...c, [key]: value }));
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    try {
      await fetch("/api/saas/white-label", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(config) });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally { setSaving(false); }
  }

  const inp = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none";

  return (
    <SaasShellLayout sidebar={<SaasSidebar activeId="white-label" />}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <NelvyonDsSectionHeader title="White Label" subtitle="Personaliza la plataforma con tu marca, dominio y colores corporativos" />
              <div className="flex items-center gap-2">
                {saved && <span className="text-sm text-green-400">✓ Guardado</span>}
                <NelvyonDsButton variant="ghost">Vista previa →</NelvyonDsButton>
                <NelvyonDsButton onClick={save} disabled={saving}>{saving ? "Guardando…" : "Guardar cambios"}</NelvyonDsButton>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-border">
              {(["branding", "domain", "email", "advanced"] as const).map(t => (
                <button key={t} onClick={() => setActiveTab(t)}
                  className={`pb-2 px-1 text-sm font-medium capitalize transition-colors border-b-2 ${activeTab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
                  {t === "branding" ? "🎨 Marca" : t === "domain" ? "🌐 Dominio" : t === "email" ? "📧 Email" : "⚙️ Avanzado"}
                </button>
              ))}
            </div>

            {activeTab === "branding" && (
              <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
                <div className="space-y-5">
                  <Section title="Identidad de marca">
                    <Field label="Nombre de la marca" hint="Aparece en el header, emails y notificaciones">
                      <input value={config.brandName} onChange={e => update("brandName", e.target.value)} className={inp} />
                    </Field>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="URL del logo" hint="PNG/SVG, fondo transparente, mín. 200px ancho">
                        <input value={config.logoUrl} onChange={e => update("logoUrl", e.target.value)} placeholder="https://..." className={inp} />
                      </Field>
                      <Field label="URL del favicon">
                        <input value={config.faviconUrl} onChange={e => update("faviconUrl", e.target.value)} placeholder="https://...favicon.ico" className={inp} />
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
                      <button onClick={() => update("hideNelvyonBranding", !config.hideNelvyonBranding)}
                        className={`relative inline-flex h-6 w-11 rounded-full transition-colors ${config.hideNelvyonBranding ? "bg-primary" : "bg-muted"}`}>
                        <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${config.hideNelvyonBranding ? "translate-x-5" : "translate-x-1"}`} />
                      </button>
                      <div>
                        <p className="text-sm text-foreground">Ocultar branding de Nelvyon</p>
                        <p className="text-xs text-muted-foreground">Solo disponible en plan Agency</p>
                      </div>
                    </label>
                  </Section>
                </div>

                {/* Live preview */}
                <div className="sticky top-6">
                  <p className="mb-3 text-xs font-medium text-muted-foreground">Vista previa</p>
                  <div className="rounded-2xl border border-border overflow-hidden shadow-lg">
                    <div className="flex items-center gap-3 px-4 py-3" style={{ backgroundColor: config.primaryColor }}>
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20 text-xs font-bold text-white">
                        {config.brandName[0]}
                      </div>
                      <span className="text-sm font-bold text-white">{config.brandName}</span>
                    </div>
                    <div className="bg-background p-4 space-y-3">
                      <div className="h-8 rounded-lg" style={{ backgroundColor: `${config.primaryColor}20` }} />
                      <div className="h-4 w-3/4 rounded-md bg-muted/30" />
                      <div className="h-4 w-1/2 rounded-md bg-muted/20" />
                      <button className="mt-2 rounded-lg px-4 py-2 text-xs font-medium text-white" style={{ backgroundColor: config.primaryColor }}>
                        Acción principal
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "domain" && (
              <div className="space-y-5">
                <Section title="Dominio personalizado">
                  <Field label="Dominio propio" hint="Ej: app.miempresa.com — Apunta un CNAME a saas.nelvyon.com">
                    <input value={config.customDomain} onChange={e => update("customDomain", e.target.value)} placeholder="app.miempresa.com" className={inp} />
                  </Field>
                  <Field label="URL de login personalizada">
                    <input value={config.customLoginUrl} onChange={e => update("customLoginUrl", e.target.value)} placeholder="https://app.miempresa.com/login" className={inp} />
                  </Field>
                  <NelvyonDsCard className="border-primary/20 bg-primary/5 p-4">
                    <p className="text-sm font-medium text-foreground mb-2">📋 Configuración DNS requerida</p>
                    <div className="font-mono text-xs space-y-1 text-muted-foreground">
                      <p>Tipo: CNAME</p>
                      <p>Host: <span className="text-foreground">{config.customDomain || "app.tudominio.com"}</span></p>
                      <p>Valor: <span className="text-primary">saas.nelvyon.com</span></p>
                      <p>TTL: 3600</p>
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground">El certificado SSL se genera automáticamente en 24-48h.</p>
                  </NelvyonDsCard>
                </Section>
              </div>
            )}

            {activeTab === "email" && (
              <div className="space-y-5">
                <Section title="Remitente de emails">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Nombre del remitente">
                      <input value={config.emailFromName} onChange={e => update("emailFromName", e.target.value)} className={inp} />
                    </Field>
                    <Field label="Email remitente" hint="Debe estar verificado en SES">
                      <input type="email" value={config.emailFromAddress} onChange={e => update("emailFromAddress", e.target.value)} className={inp} />
                    </Field>
                  </div>
                  <Field label="Firma de email">
                    <input value={config.emailSignature} onChange={e => update("emailSignature", e.target.value)} className={inp} />
                  </Field>
                </Section>
                <Section title="Soporte">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Email de soporte">
                      <input type="email" value={config.supportEmail} onChange={e => update("supportEmail", e.target.value)} className={inp} />
                    </Field>
                    <Field label="Teléfono de soporte">
                      <input value={config.supportPhone} onChange={e => update("supportPhone", e.target.value)} className={inp} />
                    </Field>
                  </div>
                </Section>
                <Section title="SMTP personalizado (opcional)">
                  <p className="text-xs text-muted-foreground">Si no lo configuras, los emails se envían desde el SES de Nelvyon.</p>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <Field label="Host SMTP">
                      <input value={config.smtpHost} onChange={e => update("smtpHost", e.target.value)} placeholder="smtp.gmail.com" className={inp} />
                    </Field>
                    <Field label="Puerto">
                      <input type="number" value={config.smtpPort} onChange={e => update("smtpPort", Number(e.target.value))} className={inp} />
                    </Field>
                    <Field label="Usuario SMTP">
                      <input value={config.smtpUser} onChange={e => update("smtpUser", e.target.value)} placeholder="tu@email.com" className={inp} />
                    </Field>
                  </div>
                </Section>
              </div>
            )}

            {activeTab === "advanced" && (
              <div className="space-y-5">
                <Section title="CSS personalizado">
                  <Field label="CSS adicional" hint="Se inyecta en todas las páginas del SaaS. Úsalo para ajustes finos de estilo.">
                    <textarea value={config.customCss} onChange={e => update("customCss", e.target.value)} rows={12}
                      placeholder=".sidebar { background: #0a0a0a; }&#10;.primary-btn { border-radius: 4px; }"
                      className={`${inp} font-mono resize-none`} />
                  </Field>
                </Section>
              </div>
            )}
    </SaasShellLayout>
  );
}
