"use client";

/**
 * /saas/herramientas sobre `(cms)/content` de W3CRM, con las piezas ya
 * portadas. Mapeo: las cuatro secciones (descargas, conectar herramientas,
 * API & webhooks, recursos) -> `W3crmContentBox`; las tarjetas usan la `card`
 * de Bootstrap de la plantilla; la lista de herramientas y la de recursos ->
 * `W3crmDataTable`. Sin componentes nuevos.
 *
 * Inventario: el modulo no exponia `data-testid`, no tiene spec dedicado y su
 * unica cobertura es `saas-nav-full-coverage`. Ningun texto actua como
 * contrato.
 *
 * Logica de NELVYON intacta: `GET /api/saas/integrations` para resolver el
 * estado real de cada herramienta, `GET/POST /api/saas/api-keys` para mostrar y
 * generar la clave, los snippets `WIDGET_SNIPPET` y `PIXEL_SNIPPET` con su
 * copiado al portapapeles y aviso de 2 s, el catalogo `TOOLS` completo,
 * `toolStatus` con sus cinco casos y todos los enlaces internos.
 */
import { useState, useEffect } from "react";
import Link from "next/link";

import { SaasW3crmShell } from "@/features/saas-w3crm/components/SaasW3crmShell";
import { W3crmPageTitle } from "@/features/saas-w3crm/components/W3crmPageTitle";
import { W3crmContentBox, W3crmDataTable } from "@/features/saas-w3crm/components/W3crmContentBox";

const WIDGET_SNIPPET = `<script src="https://nelvyon.com/widget.js" data-key="TU_API_KEY"></script>`;
const PIXEL_SNIPPET = `<!-- Nelvyon Pixel -->
<script>
  (function(n,e,l,v,y,o,n2){
    n[y]=n[y]||function(){(n[y].q=n[y].q||[]).push(arguments)};
    o=e.createElement(l);o.async=1;o.src=v;
    n2=e.getElementsByTagName(l)[0];n2.parentNode.insertBefore(o,n2);
  })(window,document,'script','https://nelvyon.com/pixel.js','nv');
  nv('init', 'TU_PIXEL_ID');
  nv('track', 'PageView');
</script>`;

function CodeToggleCard({ icon, title, description, badge, badgeClase, snippet }: {
  icon: string; title: string; description: string;
  badge: string; badgeClase: string; snippet: string;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    void navigator.clipboard?.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="card mb-0 h-100">
      <div className="card-body d-flex flex-column">
        <div className="d-flex align-items-start justify-content-between mb-2">
          <span className="fs-3">{icon}</span>
          <span className={`badge ${badgeClase}`}>{badge}</span>
        </div>
        <h6 className="mb-1">{title}</h6>
        <p className="fs-12 text-muted">{description}</p>
        <div className="mt-auto">
          <button type="button" className="btn btn-primary light btn-sm w-100 mb-2" onClick={() => setOpen((v) => !v)}>
            {open ? "Ocultar código" : "Ver código"}
          </button>
          {open && (
            <>
              <pre className="border rounded p-2 fs-12 text-break mb-2" style={{ whiteSpace: "pre-wrap" }}>{snippet}</pre>
              <button type="button" className="btn btn-primary btn-sm w-100" onClick={handleCopy}>
                {copied ? "✓ Copiado" : "Copiar"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function DownloadLinkCard({ icon, title, description, href, buttonLabel }: {
  icon: string; title: string; description: string; href: string; buttonLabel: string;
}) {
  return (
    <div className="card mb-0 h-100">
      <div className="card-body d-flex flex-column">
        <div className="d-flex align-items-start justify-content-between mb-2">
          <span className="fs-3">{icon}</span>
          <span className="badge badge-success">Disponible</span>
        </div>
        <h6 className="mb-1">{title}</h6>
        <p className="fs-12 text-muted">{description}</p>
        <div className="mt-auto">
          <Link href={href} className="btn btn-primary light btn-sm w-100">{buttonLabel}</Link>
        </div>
      </div>
    </div>
  );
}

// ── Herramientas conectables ──────────────────────────────────────────────────

interface ToolConfig { icon: string; name: string; slug: string; description: string }

const TOOLS: ToolConfig[] = [
  { icon: "⚡", name: "Zapier", slug: "zapier", description: "Automatiza flujos entre Nelvyon y miles de apps" },
  { icon: "🔄", name: "Make (Integromat)", slug: "make", description: "Workflows visuales — configura webhook en Integraciones" },
  { icon: "🔧", name: "n8n", slug: "n8n", description: "Automatización self-hosted vía webhooks" },
  { icon: "💬", name: "Slack", slug: "slack", description: "Notificaciones de leads y alertas en tiempo real" },
  { icon: "📊", name: "Google Analytics", slug: "google_analytics", description: "Seguimiento de conversiones en tu web" },
  { icon: "🏷️", name: "Google Tag Manager", slug: "google_tag_manager", description: "Gestión centralizada de píxeles — pega container ID en Webhooks" },
  { icon: "📘", name: "Meta Pixel", slug: "meta", description: "Seguimiento de conversiones para Meta Ads" },
  { icon: "💼", name: "LinkedIn Insight", slug: "linkedin", description: "Analytics y retargeting LinkedIn" },
  { icon: "🔥", name: "Hotjar", slug: "hotjar", description: "Mapas de calor y grabaciones de sesión" },
];

interface IntegrationConnection {
  slug: string;
  status: "connected" | "disconnected" | "error" | "pending";
  catalogStatus: "live" | "beta" | "coming_soon";
}

function ToolsSection() {
  const [connections, setConnections] = useState<IntegrationConnection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/saas/integrations");
        if (res.ok) {
          const data = (await res.json().catch(() => ({}))) as { connections?: IntegrationConnection[] };
          setConnections(Array.isArray(data.connections) ? data.connections : []);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function toolStatus(tool: ToolConfig): { label: string; clase: string; connected: boolean } {
    const conn = connections.find((c) => c.slug === tool.slug);
    if (conn?.catalogStatus === "coming_soon") return { label: "En catálogo", clase: "badge-warning", connected: false };
    if (!conn) return { label: loading ? "…" : "No conectado", clase: "badge-secondary", connected: false };
    if (conn.status === "connected") return { label: "Conectado", clase: "badge-success", connected: true };
    if (conn.status === "error") return { label: "Error", clase: "badge-danger", connected: false };
    return { label: "No conectado", clase: "badge-secondary", connected: false };
  }

  return (
    <W3crmContentBox titulo="Conectar herramientas" icono="fa-solid fa-link">
      <W3crmDataTable
        filas={TOOLS}
        etiqueta="herramientas"
        wrapperId="tools_wrapper"
        porPagina={10}
        columnas={[{ titulo: "Herramienta" }, { titulo: "Estado" }, { titulo: "Gestión", alFinal: true }]}
        render={(tool) => {
          const { label, clase } = toolStatus(tool);
          return (
            <tr key={tool.slug}>
              <td>
                <span className="me-2">{tool.icon}</span>
                <span className="fw-bold">{tool.name}</span>
                <div className="text-muted fs-12">{tool.description}</div>
              </td>
              <td><span className={`badge ${clase}`}>{label}</span></td>
              <td className="text-end">
                <Link href="/saas/integraciones" className="btn btn-primary light btn-sm">Configurar</Link>
              </td>
            </tr>
          );
        }}
      />
    </W3crmContentBox>
  );
}

// ── API key ───────────────────────────────────────────────────────────────────

function ApiKeyCard() {
  const [keys, setKeys] = useState<Array<{ id: string; keyPrefix: string; name: string }>>([]);
  const [rawKey, setRawKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/saas/api-keys");
        if (res.ok) {
          const data = (await res.json().catch(() => ({}))) as { keys?: Array<{ id: string; keyPrefix: string; name: string }> };
          setKeys(Array.isArray(data.keys) ? data.keys : []);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const displayKey = rawKey ?? (keys[0]?.keyPrefix ? `${keys[0].keyPrefix}••••••••` : "Sin API key");

  async function handleCreate() {
    setCreating(true);
    try {
      const res = await fetch("/api/saas/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Herramientas" }),
      });
      if (res.ok) {
        const data = (await res.json().catch(() => ({}))) as { rawKey?: string; key?: { id: string; keyPrefix: string; name: string } };
        if (data.key) setKeys((prev) => [data.key!, ...prev]);
        if (data.rawKey) setRawKey(data.rawKey);
      }
    } finally {
      setCreating(false);
    }
  }

  function handleCopy() {
    const text = rawKey ?? keys[0]?.keyPrefix;
    if (!text) return;
    void navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <W3crmContentBox titulo="API & Webhooks" icono="fa-solid fa-key">
      <div className="d-flex align-items-center border rounded p-3 mb-3">
        <code className="flex-grow-1 fs-14 text-break">{loading ? "Cargando…" : displayKey}</code>
        {rawKey && (
          <button type="button" className="btn btn-primary light btn-sm ms-2" onClick={handleCopy}>
            {copied ? "✓" : "Copiar"}
          </button>
        )}
      </div>
      {rawKey && (
        <div className="alert alert-warning py-2 fs-14" role="status">
          Copia esta clave ahora — no se volverá a mostrar completa.
        </div>
      )}
      <div className="mb-3">
        <button type="button" className="btn btn-primary btn-sm me-1 mb-1" onClick={() => void handleCreate()} disabled={creating}>
          {creating ? "Generando…" : keys.length === 0 ? "Generar API key" : "Nueva API key"}
        </button>
        <Link href="/saas/developers" className="btn btn-primary light btn-sm me-1 mb-1">Ver documentación</Link>
        <Link href="/saas/webhooks" className="btn btn-primary light btn-sm mb-1">Configurar webhooks</Link>
      </div>
      <div className="table-responsive">
        <div className="dataTables_wrapper no-footer">
          <table className="table table-responsive-lg table-striped table-condensed flip-content">
            <thead>
              <tr>
                <th className="text-black">Plan</th>
                <th className="text-black text-end">Rate limit</th>
              </tr>
            </thead>
            <tbody>
              {[["Starter", "10 req/s"], ["Pro", "100 req/s"], ["Agency", "1.000 req/s"]].map(([plan, rps]) => (
                <tr key={plan}>
                  <td><span className="fw-bold">{plan}</span></td>
                  <td className="text-end">{rps}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </W3crmContentBox>
  );
}

// ── Página ────────────────────────────────────────────────────────────────────

const RECURSOS = [
  { icon: "📋", title: "Playbooks de datos", href: "/saas/playbooks", label: "Abrir" },
  { icon: "⚙️", title: "Workflows y automatizaciones", href: "/saas/workflows", label: "Abrir" },
  { icon: "🔑", title: "API keys", href: "/saas/api-keys", label: "Gestionar" },
  { icon: "🔗", title: "Webhooks", href: "/saas/webhooks", label: "Configurar" },
];

export default function HerramientasPage() {
  return (
    <SaasW3crmShell>
      <W3crmPageTitle mainTitle="Herramientas & Descargas" parentTitle="Cuenta" pageTitle="Herramientas" />
      <div className="container-fluid">
        <div className="row">
          <div className="col-xl-12">
            <W3crmContentBox titulo="Descargas" icono="fa-solid fa-download">
              <div className="row">
                <div className="col-xl-4 col-md-6 mb-3">
                  <DownloadLinkCard icon="📱" title="App móvil (PWA)"
                    description="Instala Nelvyon en iPhone o Android desde el navegador — CRM, inbox y alertas"
                    href="/saas/pwa" buttonLabel="Instalar PWA" />
                </div>
                <div className="col-xl-4 col-md-6 mb-3">
                  <DownloadLinkCard icon="🎯" title="Prospección B2B"
                    description="Busca leads, enriquece contactos y añádelos al CRM desde la web"
                    href="/saas/prospecting" buttonLabel="Abrir prospección" />
                </div>
                <div className="col-xl-4 col-md-6 mb-3">
                  <DownloadLinkCard icon="🔑" title="API & Webhooks"
                    description="Integra Nelvyon con Zapier, Make, n8n y tus sistemas"
                    href="/saas/integraciones" buttonLabel="Ver integraciones" />
                </div>
                <div className="col-xl-4 col-md-6 mb-3">
                  <CodeToggleCard icon="💬" title="Widget de chat"
                    description="Añade un chat IA a tu web con una línea de código"
                    badge="Disponible" badgeClase="badge-success" snippet={WIDGET_SNIPPET} />
                </div>
                <div className="col-xl-4 col-md-6 mb-3">
                  <CodeToggleCard icon="📊" title="Pixel de seguimiento"
                    description="Rastrea conversiones y comportamiento en tu web"
                    badge="Disponible" badgeClase="badge-success" snippet={PIXEL_SNIPPET} />
                </div>
                <div className="col-xl-4 col-md-6 mb-3">
                  <div className="card mb-0 h-100">
                    <div className="card-body d-flex flex-column">
                      <div className="d-flex align-items-start justify-content-between mb-2">
                        <span className="fs-3">⚡</span>
                        <span className="badge badge-primary">Beta</span>
                      </div>
                      <h6 className="mb-1">Zapier Integration</h6>
                      <p className="fs-12 text-muted">Conecta Nelvyon con +5.000 apps sin código</p>
                      <div className="mt-auto">
                        <Link href="/saas/integraciones" className="btn btn-primary light btn-sm w-100">
                          Configurar en Integraciones
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </W3crmContentBox>

            <ToolsSection />

            <ApiKeyCard />

            <W3crmContentBox titulo="Recursos" icono="fa-solid fa-book">
              <W3crmDataTable
                filas={RECURSOS}
                etiqueta="recursos"
                wrapperId="recursos_wrapper"
                porPagina={10}
                columnas={[{ titulo: "Recurso" }, { titulo: "Acción", alFinal: true }]}
                render={(r) => (
                  <tr key={r.href}>
                    <td>
                      <span className="me-2">{r.icon}</span>
                      <span className="fw-bold">{r.title}</span>
                    </td>
                    <td className="text-end">
                      <Link href={r.href} className="btn btn-primary light btn-sm">{r.label}</Link>
                    </td>
                  </tr>
                )}
              />
            </W3crmContentBox>
          </div>
        </div>
      </div>
    </SaasW3crmShell>
  );
}
