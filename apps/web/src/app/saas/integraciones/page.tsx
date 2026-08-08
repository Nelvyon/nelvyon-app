"use client";

/**
 * /saas/integraciones sobre `(cms)/content` de W3CRM, con las piezas ya
 * portadas. Mapeo: filtro y catalogo por categoria -> `W3crmContentBox`; las
 * tarjetas de conector usan la `card` de Bootstrap de la plantilla; KPIs ->
 * `W3crmKpiTile`. Sin componentes nuevos.
 *
 * Contratos que verifica `saas-integrations.spec.ts` y se conservan:
 *   - `getByPlaceholder(/buscar integraci/i)`: el placeholder del buscador
 *     sigue siendo "Buscar integración…".
 *   - `h1, h2, [data-testid='section-title']` debe ser visible.
 *     `W3crmPageTitle` emite `h5.bc-title`, no un h1/h2, asi que se marca el
 *     titulo de la caja de catalogo con `data-testid="section-title"`, que es
 *     una de las tres opciones que el propio test acepta. Es el unico
 *     `data-testid` anadido y responde a una necesidad real.
 *   - la pagina llama a `/api/saas/integrations` y no redirige a login.
 *
 * Logica de NELVYON intacta: `GET /api/saas/integrations` (y su
 * `?action=authorize&provider=`), `DELETE /api/saas/integrations?provider=`,
 * `POST /api/saas/integrations/hubspot/sync?direction=`; los catalogos de
 * categoria con sus iconos, el filtrado por texto y categoria, la agrupacion
 * por categoria cuando no hay filtro, los avisos de `oauth_success` y
 * `oauth_error` leidos de la query, y todas las variantes de accion del
 * conector (OAuth, env, manual, coming soon y sync de HubSpot).
 */
import { useCallback, useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Alert from "sweetalert2";

import { SaasW3crmShell } from "@/features/saas-w3crm/components/SaasW3crmShell";
import { W3crmPageTitle } from "@/features/saas-w3crm/components/W3crmPageTitle";
import { W3crmEmptyState, W3crmKpiTile } from "@/features/saas-w3crm/components/W3crmUi";
import { W3crmCargando, W3crmContentBox } from "@/features/saas-w3crm/components/W3crmContentBox";

type ConnectionStatus = "connected" | "disconnected" | "error" | "pending";
type CatalogStatus = "live" | "beta" | "coming_soon";
type Category = "ads" | "crm" | "email" | "commerce" | "analytics" | "comms" | "productivity" | "payments";

interface IntegrationConnection {
  slug: string;
  catalogStatus: CatalogStatus;
  displayName: string;
  icon: string;
  category: Category;
  connectionType: string;
  envKeys: string[];
  relatedRoute?: string;
  status: ConnectionStatus;
  envConfigured: boolean;
  connectedAccount: string | null;
  lastSyncAt: string | null;
  errorMessage: string | null;
}

interface ApiResponse {
  connections: IntegrationConnection[];
  summary: { total: number; connected: number; envOnly: number; oauth: number };
}

const CATEGORY_LABELS: Record<Category, string> = {
  ads: "Publicidad",
  crm: "CRM & Ventas",
  email: "Email & Marketing",
  commerce: "Comercio",
  analytics: "Analítica & IA",
  comms: "Comunicaciones",
  productivity: "Productividad",
  payments: "Pagos & Facturación",
};

const CATEGORY_ICONS: Record<Category, string> = {
  ads: "📢", crm: "🎯", email: "📧", commerce: "🛒",
  analytics: "📊", comms: "💬", productivity: "📁", payments: "💳",
};

const CATEGORIES: Category[] = [
  "ads", "crm", "email", "commerce", "analytics", "comms", "productivity", "payments",
];

/** Una categoria fuera de catalogo no puede dejar la pantalla en blanco. */
function etiquetaCategoria(c: Category | string) { return CATEGORY_LABELS[c as Category] ?? String(c || "—"); }
function iconoCategoria(c: Category | string) { return CATEGORY_ICONS[c as Category] ?? "•"; }
function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}
function fecha(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("es-ES");
}

// ── Tarjeta de conector ───────────────────────────────────────────────────────

function ConnectorCard({ conn, onConnect, onDisconnect, onSync }: {
  conn: IntegrationConnection;
  onConnect: (slug: string) => void;
  onDisconnect: (slug: string) => void;
  onSync?: (slug: string, direction?: "pull" | "push") => void;
}) {
  const isConnected = conn.status === "connected";
  const isComingSoon = conn.catalogStatus === "coming_soon";
  const isBeta = conn.catalogStatus === "beta";
  const envKeys = Array.isArray(conn.envKeys) ? conn.envKeys : [];

  const badge = isConnected
    ? { clase: "badge-success", txt: "Conectado" }
    : conn.status === "error"
      ? { clase: "badge-danger", txt: "Error" }
      : isComingSoon
        ? { clase: "badge-secondary", txt: "Próximamente" }
        : conn.envConfigured
          ? { clase: "badge-primary", txt: "Env OK" }
          : { clase: "badge-secondary", txt: "Sin conectar" };

  return (
    <div className="card mb-0 h-100">
      <div className="card-body d-flex flex-column">
        <div className="d-flex align-items-start justify-content-between mb-2">
          <div className="d-flex align-items-center">
            <span className="fs-4 me-2">{conn.icon}</span>
            <div>
              <h6 className="mb-0">{conn.displayName || conn.slug}</h6>
              {isConnected && conn.connectedAccount && (
                <div className="text-muted fs-12">{conn.connectedAccount}</div>
              )}
              {isBeta && <span className="badge badge-primary light fs-12 mt-1">BETA</span>}
            </div>
          </div>
          <span className={`badge ${badge.clase}`}>{badge.txt}</span>
        </div>

        {!isConnected && !isComingSoon && !conn.envConfigured && envKeys.length > 0 && (
          <div className="border rounded p-2 mb-2">
            <p className="fs-12 text-muted mb-1">Variables necesarias en Railway:</p>
            <code className="fs-12 text-break">{envKeys.join(", ")}</code>
          </div>
        )}

        {conn.status === "error" && conn.errorMessage && (
          <p className="fs-12 text-danger mb-2">{conn.errorMessage}</p>
        )}

        {isConnected && conn.lastSyncAt && (
          <p className="fs-12 text-muted mb-2">Último sync: {fecha(conn.lastSyncAt)}</p>
        )}

        {conn.relatedRoute && isConnected && (
          <a href={conn.relatedRoute} className="fs-12 mb-2">Gestionar →</a>
        )}

        <div className="mt-auto">
          {isConnected && conn.slug === "hubspot" && onSync && (
            <>
              <button type="button" className="btn btn-primary btn-sm w-100 mb-2" onClick={() => onSync(conn.slug, "pull")}>
                Importar desde HubSpot
              </button>
              <button type="button" className="btn btn-primary light btn-sm w-100 mb-2" onClick={() => onSync(conn.slug, "push")}>
                Exportar a HubSpot
              </button>
            </>
          )}
          {isConnected ? (
            <button type="button" className="btn btn-danger light btn-sm w-100" onClick={() => onDisconnect(conn.slug)}>
              Desconectar
            </button>
          ) : isComingSoon ? (
            <button type="button" className="btn btn-primary light btn-sm w-100" disabled>Próximamente</button>
          ) : conn.connectionType === "env" ? (
            <button type="button" className="btn btn-primary light btn-sm w-100" disabled>Configurar en Railway</button>
          ) : conn.connectionType === "manual" ? (
            conn.relatedRoute ? (
              <a href={conn.relatedRoute} className="btn btn-primary btn-sm w-100">Configurar</a>
            ) : (
              <button type="button" className="btn btn-primary light btn-sm w-100" disabled>Configuración manual</button>
            )
          ) : (
            <button
              type="button"
              className="btn btn-primary btn-sm w-100"
              onClick={() => onConnect(conn.slug)}
              disabled={!conn.envConfigured}
              title={!conn.envConfigured ? "Añade las variables de entorno en Railway primero" : undefined}
            >
              Conectar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Contenido ─────────────────────────────────────────────────────────────────

function IntegracionesContent() {
  const [connections, setConnections] = useState<IntegrationConnection[]>([]);
  const [summary, setSummary] = useState<ApiResponse["summary"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<Category | "all">("all");
  const [actionError, setActionError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const oauthSuccess = searchParams?.get("oauth_success") ?? null;
  const oauthError = searchParams?.get("oauth_error") ?? null;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/saas/integrations");
      if (res.ok) {
        const data = (await res.json().catch(() => ({}))) as Partial<ApiResponse>;
        setConnections(Array.isArray(data.connections) ? data.connections : []);
        setSummary(data.summary ?? null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function handleConnect(slug: string) {
    setActionError(null);
    try {
      const res = await fetch(`/api/saas/integrations?action=authorize&provider=${encodeURIComponent(slug)}`);
      const data = (await res.json().catch(() => ({}))) as { authorizeUrl?: string; error?: string };
      if (data.authorizeUrl) {
        window.location.href = data.authorizeUrl;
      } else {
        setActionError(data.error ?? "Añade las variables de entorno en Railway antes de conectar.");
      }
    } catch {
      setActionError("Añade las variables de entorno en Railway antes de conectar esta integración.");
    }
  }

  async function handleDisconnect(slug: string) {
    const conn = connections.find((c) => c.slug === slug);
    if (!conn) return;
    const r = await Alert.fire({
      title: `¿Desconectar ${conn.displayName || slug}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Desconectar",
      cancelButtonText: "Cancelar",
    });
    if (!r.value) return;
    setActionError(null);
    try {
      const res = await fetch(`/api/saas/integrations?provider=${encodeURIComponent(slug)}`, { method: "DELETE" });
      if (!res.ok) {
        const d = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(d?.error ?? `Error ${res.status}`);
      }
      void load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "No se pudo desconectar. Reintenta.");
    }
  }

  async function handleSync(slug: string, direction: "pull" | "push" = "pull") {
    if (slug !== "hubspot") return;
    setActionError(null);
    try {
      const res = await fetch(`/api/saas/integrations/hubspot/sync?direction=${direction}`, { method: "POST" });
      if (res.ok) void load();
      else setActionError(`Error al sincronizar (${direction}) — verifica la conexión OAuth`);
    } catch {
      setActionError(`Error de red al sincronizar (${direction})`);
    }
  }

  const filtered = connections.filter((c) => {
    const matchesSearch =
      !search ||
      (c.displayName ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (c.slug ?? "").toLowerCase().includes(search.toLowerCase());
    const matchesCat = activeCategory === "all" || c.category === activeCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <SaasW3crmShell>
      <W3crmPageTitle mainTitle="Integraciones" parentTitle="Cuenta" pageTitle="Integraciones" />
      <div className="container-fluid">
        <div className="row">
          {oauthSuccess && (
            <div className="col-xl-12">
              <div className="alert alert-success" role="status">
                {oauthSuccess} conectado correctamente.
              </div>
            </div>
          )}
          {oauthError && (
            <div className="col-xl-12">
              <div className="alert alert-danger" role="alert">
                Error al conectar: {oauthError}. Asegúrate de haber añadido las variables de entorno en Railway.
              </div>
            </div>
          )}
          {actionError && (
            <div className="col-xl-12">
              <div className="alert alert-danger alert-dismissible fade show" role="alert">
                {actionError}
                <button type="button" className="btn-close" aria-label="Cerrar" onClick={() => setActionError(null)} />
              </div>
            </div>
          )}

          <div className="col-xl-3 col-sm-6"><W3crmKpiTile label="Catálogo" value={loading ? "—" : num(summary?.total ?? connections.length)} accent /></div>
          <div className="col-xl-3 col-sm-6"><W3crmKpiTile label="Conectadas" value={loading ? "—" : num(summary?.connected)} /></div>
          <div className="col-xl-3 col-sm-6"><W3crmKpiTile label="Solo env" value={loading ? "—" : num(summary?.envOnly)} /></div>
          <div className="col-xl-3 col-sm-6"><W3crmKpiTile label="OAuth" value={loading ? "—" : num(summary?.oauth)} /></div>

          <div className="col-xl-12">
            <W3crmContentBox titulo="Filtro" icono="fas fa-filter" bodyClassName="card-body pb-3">
              <div className="row">
                <div className="col-xl-4 col-sm-6">
                  <label className="visually-hidden" htmlFor="int-buscar">Buscar integración</label>
                  <input
                    id="int-buscar"
                    type="search"
                    className="form-control mb-3 mb-xl-0"
                    placeholder="Buscar integración…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <div className="col-xl-8">
                  <button type="button" aria-pressed={activeCategory === "all"}
                    className={`btn btn-sm me-1 mb-1 ${activeCategory === "all" ? "btn-primary" : "btn-primary light"}`}
                    onClick={() => setActiveCategory("all")}>
                    Todo
                  </button>
                  {CATEGORIES.map((cat) => (
                    <button key={cat} type="button" aria-pressed={activeCategory === cat}
                      className={`btn btn-sm me-1 mb-1 ${activeCategory === cat ? "btn-primary" : "btn-primary light"}`}
                      onClick={() => setActiveCategory(cat)}>
                      {CATEGORY_ICONS[cat]} {CATEGORY_LABELS[cat]}
                    </button>
                  ))}
                </div>
              </div>
            </W3crmContentBox>

            <W3crmContentBox
              titulo={<span data-testid="section-title">Catálogo de integraciones</span>}
              icono="fa-solid fa-plug"
            >
              {loading ? (
                <W3crmCargando texto="Cargando integraciones…" />
              ) : filtered.length === 0 ? (
                <W3crmEmptyState
                  title="Sin resultados"
                  description="No hay integraciones que coincidan con tu búsqueda."
                />
              ) : activeCategory !== "all" ? (
                <div className="row">
                  {filtered.map((c) => (
                    <div className="col-xl-4 col-md-6 mb-3" key={c.slug}>
                      <ConnectorCard conn={c} onConnect={handleConnect} onDisconnect={handleDisconnect} onSync={handleSync} />
                    </div>
                  ))}
                </div>
              ) : (
                CATEGORIES.map((cat) => {
                  const catConns = filtered.filter((c) => c.category === cat);
                  if (catConns.length === 0) return null;
                  return (
                    <div key={cat} className="mb-4">
                      <p className="fw-bold fs-14 mb-2">{iconoCategoria(cat)} {etiquetaCategoria(cat)}</p>
                      <div className="row">
                        {catConns.map((c) => (
                          <div className="col-xl-4 col-md-6 mb-3" key={c.slug}>
                            <ConnectorCard conn={c} onConnect={handleConnect} onDisconnect={handleDisconnect} onSync={handleSync} />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </W3crmContentBox>
          </div>
        </div>
      </div>
    </SaasW3crmShell>
  );
}

export default function SaasIntegracionesPage() {
  return (
    <Suspense fallback={null}>
      <IntegracionesContent />
    </Suspense>
  );
}
