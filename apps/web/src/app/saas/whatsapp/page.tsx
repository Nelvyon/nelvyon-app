"use client";

import { useCallback, useEffect, useState } from "react";
import { NelvyonDsBadge, NelvyonDsButton, NelvyonDsCard } from "@/design-system/components";
import { SaasShellLayout } from "@/features/saas-shell/components/SaasShellLayout";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";

// ── Types ──────────────────────────────────────────────────────────────────

interface WaMessage {
  id: string; to: string; body: string;
  status: "sent" | "failed"; createdAt: string;
}

interface WaStatus {
  whatsapp_configured: boolean;
  provider: "meta" | "twilio" | null;
  from_number: string | null;
  phone_number_id: string | null;
  messages: WaMessage[];
}

interface WaTemplateComponent {
  type: string; format?: string; text?: string;
  buttons?: Array<{ type: string; text: string; url?: string }>;
  parameters?: Array<{ type: string; text?: string }>;
}

interface WaTemplate {
  id: string; metaTemplateId: string; name: string; language: string;
  status: "APPROVED" | "PENDING" | "REJECTED" | "PAUSED";
  category: string | null;
  components: WaTemplateComponent[];
  qualityScore: string | null;
  syncedAt: string;
}

interface WaCatalogProduct {
  id: string; metaProductId: string; catalogId: string;
  name: string; description: string | null;
  priceAmount: number | null; priceCurrency: string;
  imageUrl: string | null; availability: string;
  retailerId: string | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, string> = {
  APPROVED: "bg-green-500/20 text-green-400",
  PENDING:  "bg-yellow-500/20 text-yellow-400",
  REJECTED: "bg-red-500/20 text-red-400",
  PAUSED:   "bg-gray-500/20 text-gray-400",
};

const CAT_BADGE: Record<string, string> = {
  MARKETING:      "bg-blue-500/20 text-blue-400",
  UTILITY:        "bg-purple-500/20 text-purple-400",
  AUTHENTICATION: "bg-orange-500/20 text-orange-400",
};

function extractVariables(components: WaTemplateComponent[]): string[] {
  const vars: string[] = [];
  for (const c of components) {
    if (c.text) {
      const matches = [...c.text.matchAll(/\{\{(\d+)\}\}/g)];
      for (const m of matches) if (!vars.includes(m[1]!)) vars.push(m[1]!);
    }
  }
  return vars.sort((a, b) => Number(a) - Number(b));
}

// ── Send text modal ────────────────────────────────────────────────────────

function SendModal({ onClose, onSent }: { onClose: () => void; onSent: () => void }) {
  const [to, setTo] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!to.trim()) { setError("El teléfono es obligatorio"); return; }
    if (!body.trim()) { setError("El mensaje es obligatorio"); return; }
    setSaving(true); setError(null);
    try {
      const res = await fetch("/api/saas/whatsapp", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: to.trim(), body: body.trim() }),
      });
      const j = await res.json().catch(() => ({})) as { error?: string };
      if (!res.ok) throw new Error(j.error ?? "Error al enviar");
      onSent(); onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">Nuevo mensaje WhatsApp</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>
        <form onSubmit={submit} className="space-y-4 p-6">
          {error && <p className="rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">{error}</p>}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Teléfono destino *</label>
            <input type="tel" value={to} onChange={e => setTo(e.target.value)} placeholder="+34612345678"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Mensaje *</label>
            <textarea value={body} onChange={e => setBody(e.target.value)} rows={4}
              placeholder="Hola, te escribimos desde..."
              className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
            <p className="mt-1 text-right text-xs text-muted-foreground">{body.length} caracteres</p>
          </div>
          <div className="flex gap-3">
            <NelvyonDsButton type="button" variant="ghost" onClick={onClose} className="flex-1">Cancelar</NelvyonDsButton>
            <NelvyonDsButton type="submit" disabled={saving} className="flex-1">{saving ? "Enviando…" : "Enviar"}</NelvyonDsButton>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Send template modal ────────────────────────────────────────────────────

function SendTemplateModal({ template, onClose, onSent }: {
  template: WaTemplate; onClose: () => void; onSent: () => void;
}) {
  const vars = extractVariables(template.components);
  const [to, setTo] = useState("");
  const [varValues, setVarValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!to.trim()) { setError("El teléfono es obligatorio"); return; }
    setSaving(true); setError(null);
    try {
      // Build body components with parameters
      const components = template.components
        .filter(c => c.type === "BODY" && vars.length > 0)
        .map(c => ({
          type: "body",
          parameters: vars.map(v => ({ type: "text", text: varValues[v] ?? "" })),
        }));

      const res = await fetch("/api/saas/whatsapp", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: to.trim(),
          templateName: template.name,
          templateLanguage: template.language,
          templateComponents: components.length ? components : undefined,
        }),
      });
      const j = await res.json().catch(() => ({})) as { error?: string };
      if (!res.ok) throw new Error(j.error ?? "Error al enviar plantilla");
      onSent(); onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Enviar plantilla</h2>
            <p className="text-xs text-muted-foreground">{template.name} · {template.language} · {template.category ?? "–"}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>
        <form onSubmit={submit} className="space-y-4 p-6">
          {error && <p className="rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">{error}</p>}

          {/* Template preview */}
          <div className="rounded-xl border border-border bg-muted/10 p-4">
            {template.components.map((c, i) => {
              if (c.type === "HEADER" && c.text) return (
                <p key={i} className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{c.text}</p>
              );
              if (c.type === "BODY" && c.text) return (
                <p key={i} className="mt-1 text-sm text-foreground">{c.text}</p>
              );
              if (c.type === "FOOTER" && c.text) return (
                <p key={i} className="mt-1 text-xs text-muted-foreground">{c.text}</p>
              );
              return null;
            })}
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Teléfono destino *</label>
            <input type="tel" value={to} onChange={e => setTo(e.target.value)} placeholder="+34612345678"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
          </div>

          {vars.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground">Variables dinámicas</p>
              {vars.map(v => (
                <div key={v}>
                  <label className="mb-1 block text-xs text-muted-foreground">{`{{${v}}}`}</label>
                  <input value={varValues[v] ?? ""} onChange={e => setVarValues(prev => ({ ...prev, [v]: e.target.value }))}
                    placeholder={`Valor para {{${v}}}`}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-3">
            <NelvyonDsButton type="button" variant="ghost" onClick={onClose} className="flex-1">Cancelar</NelvyonDsButton>
            <NelvyonDsButton type="submit" disabled={saving} className="flex-1">{saving ? "Enviando…" : "Enviar plantilla"}</NelvyonDsButton>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function SaasWhatsAppPage() {
  const [tab, setTab] = useState<"messages" | "templates" | "catalog">("messages");
  const [data, setData] = useState<WaStatus | null>(null);
  const [templates, setTemplates] = useState<WaTemplate[]>([]);
  const [products, setProducts] = useState<WaCatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [syncingTemplates, setSyncingTemplates] = useState(false);
  const [syncingCatalog, setSyncingCatalog] = useState(false);
  const [showSend, setShowSend] = useState(false);
  const [sendTemplate, setSendTemplate] = useState<WaTemplate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  const loadMessages = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/saas/whatsapp?limit=50");
      if (res.ok) setData(await res.json() as WaStatus);
    } catch { setError("Error al cargar mensajes"); }
    finally { setLoading(false); }
  }, []);

  const loadTemplates = useCallback(async () => {
    setLoadingTemplates(true);
    try {
      const res = await fetch("/api/saas/whatsapp/templates");
      if (res.ok) {
        const d = await res.json() as { templates?: WaTemplate[] };
        setTemplates(d.templates ?? []);
      }
    } finally { setLoadingTemplates(false); }
  }, []);

  const loadProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const res = await fetch("/api/saas/whatsapp/catalog");
      if (res.ok) {
        const d = await res.json() as { products?: WaCatalogProduct[] };
        setProducts(d.products ?? []);
      }
    } finally { setLoadingProducts(false); }
  }, []);

  useEffect(() => { void loadMessages(); }, [loadMessages]);
  useEffect(() => { if (tab === "templates") void loadTemplates(); }, [tab, loadTemplates]);
  useEffect(() => { if (tab === "catalog") void loadProducts(); }, [tab, loadProducts]);

  async function syncTemplates() {
    setSyncingTemplates(true); setSyncMsg(null);
    try {
      const res = await fetch("/api/saas/whatsapp/templates", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync" }),
      });
      const d = await res.json() as { synced?: number; error?: string };
      if (!res.ok) throw new Error(d.error ?? "Error al sincronizar");
      setSyncMsg(`✓ ${d.synced ?? 0} plantillas sincronizadas desde Meta`);
      void loadTemplates();
    } catch (err) {
      setSyncMsg(`⚠ ${err instanceof Error ? err.message : "Error"}`);
    } finally { setSyncingTemplates(false); }
  }

  async function syncCatalog() {
    setSyncingCatalog(true); setSyncMsg(null);
    try {
      const res = await fetch("/api/saas/whatsapp/catalog", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync" }),
      });
      const d = await res.json() as { synced?: number; error?: string };
      if (!res.ok) throw new Error(d.error ?? "Error al sincronizar catálogo");
      setSyncMsg(`✓ ${d.synced ?? 0} productos sincronizados desde Meta`);
      void loadProducts();
    } catch (err) {
      setSyncMsg(`⚠ ${err instanceof Error ? err.message : "Error"}`);
    } finally { setSyncingCatalog(false); }
  }

  const metaConfigured = data?.provider === "meta" || data?.whatsapp_configured;

  return (
    <SaasShellLayout sidebar={<SaasSidebar activeId="whatsapp" />}>
      <div className="flex flex-col gap-5 pb-8">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground">WhatsApp Business</h1>
            <p className="text-xs text-muted-foreground">Meta Cloud API · plantillas aprobadas · catálogo de productos</p>
          </div>
          {tab === "messages" && (
            <NelvyonDsButton onClick={() => setShowSend(true)} disabled={!data?.whatsapp_configured}>
              + Nuevo mensaje
            </NelvyonDsButton>
          )}
        </div>

        {/* Config banners */}
        {!loading && data && !data.whatsapp_configured && (
          <NelvyonDsCard className="border-yellow-500/30 bg-yellow-500/5 p-4">
            <p className="font-medium text-yellow-400">⚠️ WhatsApp no configurado</p>
            <p className="mt-1 text-sm text-muted-foreground">
              <code className="rounded bg-muted/50 px-1 text-xs">META_WA_PHONE_NUMBER_ID</code>{" + "}
              <code className="rounded bg-muted/50 px-1 text-xs">META_WA_ACCESS_TOKEN</code>
            </p>
          </NelvyonDsCard>
        )}
        {!loading && data?.whatsapp_configured && (
          <NelvyonDsCard className="border-green-500/30 bg-green-500/5 p-3">
            <p className="text-sm text-green-400">
              ✅ WhatsApp activo vía <span className="font-semibold uppercase">{data.provider ?? "?"}</span>
              {data.phone_number_id && <> · ID: <code className="rounded bg-muted/50 px-1 text-xs">{data.phone_number_id}</code></>}
              {data.from_number && <> · desde <code className="rounded bg-muted/50 px-1 text-xs">{data.from_number}</code></>}
            </p>
          </NelvyonDsCard>
        )}
        {syncMsg && (
          <div className={`rounded-xl px-4 py-2 text-sm ${syncMsg.startsWith("✓") ? "bg-green-500/10 text-green-400" : "bg-yellow-500/10 text-yellow-400"}`}>
            {syncMsg}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2">
          {(["messages", "templates", "catalog"] as const).map(t => (
            <button key={t} onClick={() => { setTab(t); setSyncMsg(null); }}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${tab === t ? "bg-primary text-primary-foreground" : "bg-muted/30 text-muted-foreground hover:text-foreground"}`}>
              {t === "messages" ? "💬 Mensajes" : t === "templates" ? "📋 Plantillas" : "🛍 Catálogo"}
            </button>
          ))}
        </div>

        {/* ── MESSAGES TAB ── */}
        {tab === "messages" && (
          <>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Enviados", value: data?.messages.filter(m => m.status === "sent").length ?? 0 },
                { label: "Fallidos", value: data?.messages.filter(m => m.status === "failed").length ?? 0 },
                { label: "Total", value: data?.messages.length ?? 0 },
              ].map(({ label, value }) => (
                <NelvyonDsCard key={label} className="p-4">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
                </NelvyonDsCard>
              ))}
            </div>

            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-muted/30" />)}
              </div>
            ) : !data?.messages.length ? (
              <NelvyonDsCard className="p-16 text-center">
                <p className="text-5xl">💬</p>
                <p className="mt-4 text-lg font-semibold text-foreground">Sin mensajes</p>
                <p className="mt-2 text-sm text-muted-foreground">Envía tu primer mensaje o usa una plantilla aprobada</p>
                {data?.whatsapp_configured && (
                  <div className="mt-5 flex justify-center gap-3">
                    <NelvyonDsButton onClick={() => setShowSend(true)}>+ Mensaje libre</NelvyonDsButton>
                    <NelvyonDsButton variant="ghost" onClick={() => setTab("templates")}>📋 Usar plantilla</NelvyonDsButton>
                  </div>
                )}
              </NelvyonDsCard>
            ) : (
              <div className="space-y-2">
                {data.messages.map(m => (
                  <NelvyonDsCard key={m.id} className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm text-foreground">{m.to}</span>
                          <NelvyonDsBadge tone={m.status === "sent" ? "success" : "danger"}>
                            {m.status === "sent" ? "Enviado" : "Fallido"}
                          </NelvyonDsBadge>
                        </div>
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{m.body}</p>
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {new Date(m.createdAt).toLocaleString("es-ES")}
                      </span>
                    </div>
                  </NelvyonDsCard>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── TEMPLATES TAB ── */}
        {tab === "templates" && (
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{templates.length} plantillas sincronizadas</p>
              <NelvyonDsButton onClick={() => void syncTemplates()} disabled={syncingTemplates || !metaConfigured} className="text-xs">
                {syncingTemplates ? "Sincronizando…" : "🔄 Sincronizar Meta"}
              </NelvyonDsButton>
            </div>

            {!metaConfigured && (
              <NelvyonDsCard className="border-yellow-500/30 bg-yellow-500/5 p-4">
                <p className="text-sm text-yellow-400">⚠ Meta Cloud API no configurada. Configura <code className="text-xs">META_WA_PHONE_NUMBER_ID</code> y <code className="text-xs">META_WA_ACCESS_TOKEN</code> para sincronizar plantillas.</p>
              </NelvyonDsCard>
            )}

            {loadingTemplates ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-muted/30" />)}
              </div>
            ) : templates.length === 0 ? (
              <NelvyonDsCard className="p-16 text-center">
                <p className="text-4xl">📋</p>
                <p className="mt-4 font-semibold text-foreground">Sin plantillas</p>
                <p className="mt-2 text-sm text-muted-foreground">Sincroniza las plantillas aprobadas desde Meta Business Manager</p>
                {metaConfigured && (
                  <NelvyonDsButton className="mt-5" onClick={() => void syncTemplates()} disabled={syncingTemplates}>
                    🔄 Sincronizar desde Meta
                  </NelvyonDsButton>
                )}
              </NelvyonDsCard>
            ) : (
              <div className="space-y-2">
                {templates.map(t => (
                  <NelvyonDsCard key={t.id} className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-foreground">{t.name}</p>
                          <span className="rounded-md bg-muted/20 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">{t.language}</span>
                          <span className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${STATUS_BADGE[t.status] ?? "bg-muted/20 text-muted-foreground"}`}>
                            {t.status}
                          </span>
                          {t.category && (
                            <span className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${CAT_BADGE[t.category] ?? "bg-muted/20 text-muted-foreground"}`}>
                              {t.category}
                            </span>
                          )}
                          {t.qualityScore && (
                            <span className="rounded-md bg-muted/20 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                              Q: {t.qualityScore}
                            </span>
                          )}
                        </div>
                        {/* Body preview */}
                        {t.components.find(c => c.type === "BODY")?.text && (
                          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                            {t.components.find(c => c.type === "BODY")?.text}
                          </p>
                        )}
                        {extractVariables(t.components).length > 0 && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Variables: {extractVariables(t.components).map(v => `{{${v}}}`).join(", ")}
                          </p>
                        )}
                      </div>
                      <NelvyonDsButton
                        variant="ghost" className="shrink-0 text-xs"
                        disabled={t.status !== "APPROVED"}
                        onClick={() => setSendTemplate(t)}
                      >
                        ↗ Enviar
                      </NelvyonDsButton>
                    </div>
                  </NelvyonDsCard>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── CATALOG TAB ── */}
        {tab === "catalog" && (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground">{products.length} productos</p>
                <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-400">Meta Commerce</span>
              </div>
              <NelvyonDsButton onClick={() => void syncCatalog()} disabled={syncingCatalog || !metaConfigured} className="text-xs">
                {syncingCatalog ? "Sincronizando…" : "🔄 Sincronizar catálogo"}
              </NelvyonDsButton>
            </div>

            {!metaConfigured && (
              <NelvyonDsCard className="border-yellow-500/30 bg-yellow-500/5 p-4">
                <p className="text-sm text-yellow-400">
                  ⚠ Configura <code className="text-xs">META_WA_CATALOG_ID</code> para sincronizar el catálogo de productos.
                </p>
              </NelvyonDsCard>
            )}

            {loadingProducts ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-48 animate-pulse rounded-xl bg-muted/30" />)}
              </div>
            ) : products.length === 0 ? (
              <NelvyonDsCard className="p-16 text-center">
                <p className="text-4xl">🛍</p>
                <p className="mt-4 font-semibold text-foreground">Sin productos</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Configura <code className="rounded bg-muted/50 px-1 text-xs">META_WA_CATALOG_ID</code> o vincula un catálogo en Meta Business Manager
                </p>
                {metaConfigured && (
                  <NelvyonDsButton className="mt-5" onClick={() => void syncCatalog()} disabled={syncingCatalog}>
                    🔄 Sincronizar desde Meta
                  </NelvyonDsButton>
                )}
              </NelvyonDsCard>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {products.map(p => (
                  <NelvyonDsCard key={p.id} className="overflow-hidden p-0">
                    {p.imageUrl ? (
                      <div className="aspect-square w-full overflow-hidden bg-muted/20">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" />
                      </div>
                    ) : (
                      <div className="flex aspect-square items-center justify-center bg-muted/20 text-4xl">🛍</div>
                    )}
                    <div className="p-3">
                      <p className="truncate text-sm font-semibold text-foreground">{p.name}</p>
                      {p.description && <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{p.description}</p>}
                      <div className="mt-2 flex items-center justify-between">
                        {p.priceAmount != null ? (
                          <span className="text-sm font-bold text-primary">
                            {p.priceAmount.toFixed(2)} {p.priceCurrency}
                          </span>
                        ) : <span className="text-xs text-muted-foreground">Sin precio</span>}
                        <span className={`rounded-md px-1.5 py-0.5 text-[10px] ${p.availability === "in stock" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                          {p.availability}
                        </span>
                      </div>
                      {p.retailerId && <p className="mt-1 truncate text-[10px] text-muted-foreground">SKU: {p.retailerId}</p>}
                    </div>
                  </NelvyonDsCard>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {showSend && <SendModal onClose={() => setShowSend(false)} onSent={loadMessages} />}
      {sendTemplate && (
        <SendTemplateModal
          template={sendTemplate}
          onClose={() => setSendTemplate(null)}
          onSent={loadMessages}
        />
      )}
    </SaasShellLayout>
  );
}
