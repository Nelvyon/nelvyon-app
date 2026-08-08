"use client";

/**
 * /saas/whatsapp sobre `(cms)/content` de W3CRM, con las piezas ya portadas.
 * Mapeo: mensajes y plantillas -> `W3crmContentBox` + `W3crmDataTable`;
 * catalogo -> `W3crmContentBox` + rejilla de `card` de Bootstrap; los dos
 * dialogos -> `W3crmModal`; contadores -> `W3crmKpiTile`. Sin componentes
 * nuevos.
 *
 * CONTRATO — `saas-whatsapp-depth.spec.ts` exige, y aqui se conserva:
 *   - heading `WhatsApp Business` (l.58) -> `W3crmPageTitle` emite `h5.bc-title`.
 *   - textos `/WhatsApp activo/i` (l.59) y `Enviados` (l.60).
 *   - `getByRole("button", { name: /Plantillas/i })` (l.61) UNICO en la pagina.
 *   - `promo_verano`, `APPROVED` y `/Sincronizar Meta/i` (l.69-71).
 *   - el glifo exacto `↗ Enviar` en el boton de fila (l.81).
 *   - heading `Enviar plantilla` (l.82) -> `W3crmModal` emite `h5.modal-title`.
 *   - un unico `input[type=tel]` (l.84) y, como `input:not([type=tel])`
 *     (l.85-89), SOLO los campos de variables.
 *
 * Tres trampas del marcado W3CRM que obligan a decisiones concretas:
 *   1. `W3crmContentBox` genera un toggle `<Link role="button"
 *      aria-label={`Plegar ${titulo}`}>`. Titular una caja "Plantillas" crearia
 *      un SEGUNDO boton cuyo nombre accesible casa con `/Plantillas/i` y el
 *      `getByRole` de la l.61 fallaria por strict mode. Por eso la caja de
 *      plantillas se titula "Sincronizadas desde Meta".
 *   2. Ese regex es case-insensitive: tampoco vale "plantillas" en minuscula,
 *      asi que ningun titulo de caja de esta pagina lleva la palabra.
 *   3. El modal de react-bootstrap se monta en portal y deja el contenido de
 *      la pestana en el DOM. La pestana de plantillas no puede tener NINGUN
 *      `<input>` o entraria en el conteo de la l.85 y el `fill` reventaria:
 *      se usa `W3crmDataTable`, que no emite ninguno.
 *
 * Logica de NELVYON intacta: `GET /api/saas/whatsapp?limit=50`, `POST
 * /api/saas/whatsapp` (mensaje libre y envio de plantilla con
 * `templateName`/`templateLanguage`/`templateComponents`),
 * `GET`/`POST /api/saas/whatsapp/templates` y `.../catalog` con su
 * `action: "sync"`; `extractVariables` y su orden numerico; el filtro de
 * componentes `BODY` al construir los parametros; `metaConfigured` derivado de
 * `provider === "meta" || whatsapp_configured`; el `disabled` del envio para
 * plantillas no aprobadas y la recarga de mensajes tras enviar.
 */
import { useCallback, useEffect, useState } from "react";

import { SaasW3crmShell } from "@/features/saas-w3crm/components/SaasW3crmShell";
import { W3crmPageTitle } from "@/features/saas-w3crm/components/W3crmPageTitle";
import { W3crmEmptyState, W3crmKpiTile } from "@/features/saas-w3crm/components/W3crmUi";
import {
  W3crmCargando,
  W3crmContentBox,
  W3crmDataTable,
  W3crmModal,
} from "@/features/saas-w3crm/components/W3crmContentBox";

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

const STATUS_BADGE: Record<string, string> = {
  APPROVED: "badge-success",
  PENDING: "badge-warning",
  REJECTED: "badge-danger",
  PAUSED: "badge-secondary",
};

const CAT_BADGE: Record<string, string> = {
  MARKETING: "badge-primary",
  UTILITY: "badge-info",
  AUTHENTICATION: "badge-warning",
};

/** Un estado o categoria fuera de catalogo pintaba `undefined`. */
function estadoBadge(s: unknown): string {
  return STATUS_BADGE[String(s ?? "")] ?? "badge-secondary";
}
function categoriaBadge(c: unknown): string {
  return CAT_BADGE[String(c ?? "")] ?? "badge-secondary";
}
function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}
function fechaHora(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("es-ES");
}
/**
 * `components` es lo mas fragil del payload de Meta: puede faltar, llegar como
 * objeto, o traer entradas nulas. Todo lo que lo recorre pasa por aqui.
 */
function componentes(t: WaTemplate | null | undefined): WaTemplateComponent[] {
  const cs = t?.components;
  return Array.isArray(cs) ? cs.filter((c): c is WaTemplateComponent => Boolean(c) && typeof c === "object") : [];
}
/** `qualityScore` puede venir como objeto de Meta; solo se pinta si es texto. */
function calidad(v: unknown): string | null {
  if (typeof v === "string" && v.trim()) return v;
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return null;
}
function textoComponente(c: WaTemplateComponent): string {
  return typeof c.text === "string" ? c.text : "";
}

function extractVariables(components: WaTemplateComponent[]): string[] {
  const vars: string[] = [];
  for (const c of components) {
    const texto = textoComponente(c);
    if (texto) {
      const matches = [...texto.matchAll(/\{\{(\d+)\}\}/g)];
      for (const m of matches) if (!vars.includes(m[1]!)) vars.push(m[1]!);
    }
  }
  return vars.sort((a, b) => Number(a) - Number(b));
}

// ── Mensaje libre ────────────────────────────────────────────────────────────
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
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(j.error ?? "Error al enviar");
      onSent(); onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally { setSaving(false); }
  }

  return (
    <W3crmModal titulo="Nuevo mensaje WhatsApp" onClose={onClose} error={error} size="lg">
      <form onSubmit={(e) => void submit(e)}>
        <div className="form-group mb-3">
          <label htmlFor="wa-to" className="text-black font-w600">
            Teléfono destino <span className="required">*</span>
          </label>
          <input id="wa-to" className="form-control" type="tel" placeholder="+34612345678"
            value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="form-group mb-3">
          <label htmlFor="wa-body" className="text-black font-w600">
            Mensaje <span className="required">*</span>
          </label>
          <textarea id="wa-body" className="form-control" rows={4} placeholder="Hola, te escribimos desde…"
            value={body} onChange={(e) => setBody(e.target.value)} />
          <p className="fs-12 text-muted text-end mt-1 mb-0">{body.length} caracteres</p>
        </div>
        <div className="text-end">
          <button type="button" className="btn btn-primary light me-2" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Enviando…" : "Enviar"}
          </button>
        </div>
      </form>
    </W3crmModal>
  );
}

// ── Envío de plantilla ───────────────────────────────────────────────────────
function SendTemplateModal({ template, onClose, onSent }: {
  template: WaTemplate; onClose: () => void; onSent: () => void;
}) {
  const comps = componentes(template);
  const vars = extractVariables(comps);
  const [to, setTo] = useState("");
  const [varValues, setVarValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!to.trim()) { setError("El teléfono es obligatorio"); return; }
    setSaving(true); setError(null);
    try {
      const components = comps
        .filter((c) => c.type === "BODY" && vars.length > 0)
        .map(() => ({
          type: "body",
          parameters: vars.map((v) => ({ type: "text", text: varValues[v] ?? "" })),
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
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(j.error ?? "Error al enviar plantilla");
      onSent(); onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally { setSaving(false); }
  }

  const previa = comps.filter((c) => textoComponente(c) && ["HEADER", "BODY", "FOOTER"].includes(c.type));

  return (
    <W3crmModal titulo="Enviar plantilla" onClose={onClose} error={error} size="lg">
      <p className="fs-12 text-muted">
        {template.name} · {template.language} · {template.category ?? "–"}
      </p>
      <form onSubmit={(e) => void submit(e)}>
        {previa.length > 0 && (
          <div className="border rounded p-3 mb-3 bg-light">
            {previa.map((c, i) => (
              <p key={i} className={c.type === "BODY" ? "mb-1" : "fs-12 text-muted mb-1"}>
                {textoComponente(c)}
              </p>
            ))}
          </div>
        )}

        <div className="form-group mb-3">
          <label htmlFor="wa-tpl-to" className="text-black font-w600">
            Teléfono destino <span className="required">*</span>
          </label>
          <input id="wa-tpl-to" className="form-control" type="tel" placeholder="+34612345678"
            value={to} onChange={(e) => setTo(e.target.value)} />
        </div>

        {vars.length > 0 && (
          <>
            <p className="text-black font-w600 fs-14">Variables dinámicas</p>
            {vars.map((v) => (
              <div className="form-group mb-3" key={v}>
                <label htmlFor={`wa-var-${v}`} className="text-black font-w600">{`{{${v}}}`}</label>
                <input id={`wa-var-${v}`} className="form-control" placeholder={`Valor para {{${v}}}`}
                  value={varValues[v] ?? ""}
                  onChange={(e) => setVarValues((prev) => ({ ...prev, [v]: e.target.value }))} />
              </div>
            ))}
          </>
        )}

        <div className="text-end">
          <button type="button" className="btn btn-primary light me-2" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Enviando…" : "Enviar plantilla"}
          </button>
        </div>
      </form>
    </W3crmModal>
  );
}

// ── Página ───────────────────────────────────────────────────────────────────
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
  // Imagenes de Meta que ya no resuelven: se sustituyen por el marcador, no se
  // deja el icono roto del navegador.
  const [imagenesRotas, setImagenesRotas] = useState<Record<string, boolean>>({});

  const loadMessages = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/saas/whatsapp?limit=50");
      if (res.ok) {
        const d = (await res.json().catch(() => ({}))) as Partial<WaStatus>;
        setData({
          whatsapp_configured: Boolean(d.whatsapp_configured),
          provider: d.provider ?? null,
          from_number: d.from_number ?? null,
          phone_number_id: d.phone_number_id ?? null,
          messages: Array.isArray(d.messages) ? d.messages : [],
        });
      }
    } catch { setError("Error al cargar mensajes"); }
    finally { setLoading(false); }
  }, []);

  const loadTemplates = useCallback(async () => {
    setLoadingTemplates(true);
    try {
      const res = await fetch("/api/saas/whatsapp/templates");
      if (res.ok) {
        const d = (await res.json().catch(() => ({}))) as { templates?: WaTemplate[] };
        setTemplates(Array.isArray(d.templates) ? d.templates : []);
      }
    } finally { setLoadingTemplates(false); }
  }, []);

  const loadProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const res = await fetch("/api/saas/whatsapp/catalog");
      if (res.ok) {
        const d = (await res.json().catch(() => ({}))) as { products?: WaCatalogProduct[] };
        setProducts(Array.isArray(d.products) ? d.products : []);
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
      const d = (await res.json().catch(() => ({}))) as { synced?: number; error?: string };
      if (!res.ok) throw new Error(d.error ?? "Error al sincronizar");
      setSyncMsg(`✓ ${num(d.synced)} plantillas sincronizadas desde Meta`);
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
      const d = (await res.json().catch(() => ({}))) as { synced?: number; error?: string };
      if (!res.ok) throw new Error(d.error ?? "Error al sincronizar catálogo");
      setSyncMsg(`✓ ${num(d.synced)} productos sincronizados desde Meta`);
      void loadProducts();
    } catch (err) {
      setSyncMsg(`⚠ ${err instanceof Error ? err.message : "Error"}`);
    } finally { setSyncingCatalog(false); }
  }

  const metaConfigured = data?.provider === "meta" || data?.whatsapp_configured;
  const mensajes = Array.isArray(data?.messages) ? data.messages : [];

  return (
    <SaasW3crmShell>
      <W3crmPageTitle mainTitle="WhatsApp Business" parentTitle="Comunicación" pageTitle="WhatsApp" />
      <div className="container-fluid">
        <div className="row">
          <div className="col-xl-12">
            <p className="fs-14 text-muted">
              Meta Cloud API · plantillas aprobadas · catálogo de productos
            </p>

            {error && (
              <div className="alert alert-danger alert-dismissible fade show" role="alert">
                {error}
                <button type="button" className="btn-close" aria-label="Cerrar" onClick={() => setError(null)} />
              </div>
            )}
            {!loading && data && !data.whatsapp_configured && (
              <div className="alert alert-warning" role="alert">
                <strong>WhatsApp no configurado.</strong> <code>META_WA_PHONE_NUMBER_ID</code> +{" "}
                <code>META_WA_ACCESS_TOKEN</code>
              </div>
            )}
            {!loading && data?.whatsapp_configured && (
              <div className="alert alert-success" role="status">
                WhatsApp activo vía <span className="text-uppercase fw-bold">{data.provider ?? "?"}</span>
                {data.phone_number_id ? <> · ID: <code>{data.phone_number_id}</code></> : null}
                {data.from_number ? <> · desde <code>{data.from_number}</code></> : null}
              </div>
            )}
            {syncMsg && (
              <div className={`alert ${syncMsg.startsWith("✓") ? "alert-success" : "alert-warning"}`} role="status">
                {syncMsg}
              </div>
            )}

            {/* Pestañas: `<button>` sin `role`, para que sigan siendo
                localizables con `getByRole("button")`. */}
            <ul className="nav nav-tabs mb-3">
              {(["messages", "templates", "catalog"] as const).map((t) => (
                <li className="nav-item" key={t}>
                  <button type="button" className={`nav-link ${tab === t ? "active" : ""}`}
                    aria-pressed={tab === t}
                    onClick={() => { setTab(t); setSyncMsg(null); }}>
                    {t === "messages" ? "💬 Mensajes" : t === "templates" ? "📋 Plantillas" : "🛍 Catálogo"}
                  </button>
                </li>
              ))}
            </ul>

            {tab === "messages" && (
              <>
                <div className="row">
                  <div className="col-xl-4 col-sm-6">
                    <W3crmKpiTile label="Enviados" value={mensajes.filter((m) => m.status === "sent").length} accent />
                  </div>
                  <div className="col-xl-4 col-sm-6">
                    <W3crmKpiTile label="Fallidos" value={mensajes.filter((m) => m.status === "failed").length} />
                  </div>
                  <div className="col-xl-4 col-sm-6">
                    <W3crmKpiTile label="Total" value={mensajes.length} />
                  </div>
                </div>

                {/* El titulo NO puede contener "plantillas" NI "enviados": el
                    `getByText("Enviados")` de la l.60 tambien es substring e
                    insensible a mayusculas, y "Mensajes enviados" colisionaba
                    con la etiqueta del KPI. */}
                <W3crmContentBox
                  titulo="Historial de mensajes"
                  icono="fa-brands fa-whatsapp"
                  acciones={
                    <button type="button" className="btn btn-primary btn-sm me-2"
                      disabled={!data?.whatsapp_configured} onClick={() => setShowSend(true)}>
                      + Nuevo mensaje
                    </button>
                  }
                >
                  {loading ? (
                    <W3crmCargando texto="Cargando mensajes…" />
                  ) : mensajes.length === 0 ? (
                    <W3crmEmptyState
                      title="Sin mensajes"
                      description="Envía tu primer mensaje o usa una plantilla aprobada."
                    />
                  ) : (
                    <W3crmDataTable
                      filas={mensajes}
                      etiqueta="mensajes"
                      wrapperId="wa_messages_wrapper"
                      porPagina={10}
                      columnas={[
                        { titulo: "Destino" },
                        { titulo: "Mensaje" },
                        { titulo: "Fecha" },
                        { titulo: "Estado", alFinal: true },
                      ]}
                      render={(m) => (
                        <tr key={m.id}>
                          <td><span className="fw-bold">{m.to || "—"}</span></td>
                          <td className="text-muted">{m.body || "—"}</td>
                          <td>{fechaHora(m.createdAt)}</td>
                          <td className="text-end">
                            <span className={`badge ${m.status === "sent" ? "badge-success" : "badge-danger"}`}>
                              {m.status === "sent" ? "Enviado" : "Fallido"}
                            </span>
                          </td>
                        </tr>
                      )}
                    />
                  )}
                </W3crmContentBox>
              </>
            )}

            {tab === "templates" && (
              <>
                {!metaConfigured && (
                  <div className="alert alert-warning" role="alert">
                    Meta Cloud API no configurada. Configura <code>META_WA_PHONE_NUMBER_ID</code> y{" "}
                    <code>META_WA_ACCESS_TOKEN</code> para sincronizar.
                  </div>
                )}
                {/* Titulo sin la palabra "plantillas": ver trampas 1 y 2. */}
                <W3crmContentBox
                  titulo="Sincronizadas desde Meta"
                  icono="fa-solid fa-file-lines"
                  acciones={
                    <button type="button" className="btn btn-primary btn-sm me-2"
                      disabled={syncingTemplates || !metaConfigured} onClick={() => void syncTemplates()}>
                      {syncingTemplates ? "Sincronizando…" : "🔄 Sincronizar Meta"}
                    </button>
                  }
                >
                  {loadingTemplates ? (
                    <W3crmCargando texto="Cargando…" />
                  ) : templates.length === 0 ? (
                    <W3crmEmptyState
                      title="Sin resultados"
                      description="Sincroniza desde Meta Business Manager con el botón de la cabecera."
                    />
                  ) : (
                    <W3crmDataTable
                      filas={templates}
                      etiqueta="registros"
                      wrapperId="wa_templates_wrapper"
                      porPagina={10}
                      columnas={[
                        { titulo: "Nombre" },
                        { titulo: "Contenido" },
                        { titulo: "Estado" },
                        { titulo: "Envío", alFinal: true },
                      ]}
                      render={(t) => {
                        const comps = componentes(t);
                        const cuerpo = comps.find((c) => c.type === "BODY");
                        const variables = extractVariables(comps);
                        const q = calidad(t.qualityScore);
                        return (
                          <tr key={t.id}>
                            <td>
                              <span className="fw-bold">{t.name || "—"}</span>
                              <div className="text-muted fs-12">{t.language || "—"}</div>
                            </td>
                            <td>
                              <span className="text-muted">{textoComponente(cuerpo ?? {} as WaTemplateComponent) || "—"}</span>
                              {variables.length > 0 && (
                                <div className="text-muted fs-12">
                                  Variables: {variables.map((v) => `{{${v}}}`).join(", ")}
                                </div>
                              )}
                            </td>
                            <td>
                              <span className={`badge ${estadoBadge(t.status)}`}>{t.status || "—"}</span>
                              {t.category ? (
                                <span className={`badge ${categoriaBadge(t.category)} ms-1`}>{t.category}</span>
                              ) : null}
                              {q ? <div className="text-muted fs-12">Q: {q}</div> : null}
                            </td>
                            <td className="text-end">
                              <button type="button" className="btn btn-primary light btn-sm"
                                disabled={t.status !== "APPROVED"} onClick={() => setSendTemplate(t)}>
                                ↗ Enviar
                              </button>
                            </td>
                          </tr>
                        );
                      }}
                    />
                  )}
                </W3crmContentBox>
              </>
            )}

            {tab === "catalog" && (
              <>
                {!metaConfigured && (
                  <div className="alert alert-warning" role="alert">
                    Configura <code>META_WA_CATALOG_ID</code> para sincronizar el catálogo de productos.
                  </div>
                )}
                <W3crmContentBox
                  titulo={`Catálogo Meta Commerce (${products.length} productos)`}
                  icono="fa-solid fa-bag-shopping"
                  acciones={
                    <button type="button" className="btn btn-primary btn-sm me-2"
                      disabled={syncingCatalog || !metaConfigured} onClick={() => void syncCatalog()}>
                      {syncingCatalog ? "Sincronizando…" : "🔄 Sincronizar catálogo"}
                    </button>
                  }
                >
                  {loadingProducts ? (
                    <W3crmCargando texto="Cargando productos…" />
                  ) : products.length === 0 ? (
                    <W3crmEmptyState
                      title="Sin productos"
                      description="Configura META_WA_CATALOG_ID o vincula un catálogo en Meta Business Manager."
                    />
                  ) : (
                    <div className="row">
                      {products.map((p) => {
                        const rota = Boolean(imagenesRotas[p.id]);
                        return (
                          <div className="col-xl-3 col-sm-6" key={p.id}>
                            <div className="card border mb-3">
                              {p.imageUrl && !rota ? (
                                <img src={p.imageUrl} alt={p.name || "Producto"}
                                  className="card-img-top" style={{ aspectRatio: "1", objectFit: "cover" }}
                                  onError={() => setImagenesRotas((prev) => ({ ...prev, [p.id]: true }))} />
                              ) : (
                                <div className="d-flex align-items-center justify-content-center bg-light"
                                  style={{ aspectRatio: "1" }} aria-hidden="true">
                                  <i className="fa-solid fa-bag-shopping fa-2x text-muted" />
                                </div>
                              )}
                              <div className="card-body p-3">
                                <p className="fw-bold text-truncate mb-1">{p.name || "—"}</p>
                                {p.description ? (
                                  <p className="text-muted fs-12 mb-2">{p.description}</p>
                                ) : null}
                                <div className="d-flex align-items-center justify-content-between">
                                  {p.priceAmount != null ? (
                                    <span className="fw-bold text-primary">
                                      {num(p.priceAmount).toFixed(2)} {p.priceCurrency || "EUR"}
                                    </span>
                                  ) : (
                                    <span className="text-muted fs-12">Sin precio</span>
                                  )}
                                  <span className={`badge ${p.availability === "in stock" ? "badge-success" : "badge-danger"}`}>
                                    {p.availability || "—"}
                                  </span>
                                </div>
                                {p.retailerId ? (
                                  <p className="text-muted fs-12 text-truncate mt-1 mb-0">SKU: {p.retailerId}</p>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </W3crmContentBox>
              </>
            )}
          </div>
        </div>
      </div>

      {showSend && <SendModal onClose={() => setShowSend(false)} onSent={loadMessages} />}
      {sendTemplate && (
        <SendTemplateModal
          template={sendTemplate}
          onClose={() => setSendTemplate(null)}
          onSent={loadMessages}
        />
      )}
    </SaasW3crmShell>
  );
}
