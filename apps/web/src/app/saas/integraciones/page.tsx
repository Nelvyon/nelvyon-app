"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { NelvyonDsBadge, NelvyonDsButton, NelvyonDsCard, NelvyonDsSectionHeader } from "@/design-system/components";
import { SaasShellLayout } from "@/features/saas-shell/components/SaasShellLayout";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";

// ── Types (mirror backend) ────────────────────────────────────────────────────

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

// ── Constants ─────────────────────────────────────────────────────────────────

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

// ── Card component ────────────────────────────────────────────────────────────

function ConnectorCard({
  conn,
  onConnect,
  onDisconnect,
  onSync,
}: {
  conn: IntegrationConnection;
  onConnect: (slug: string) => void;
  onDisconnect: (slug: string) => void;
  onSync?: (slug: string) => void;
}) {
  const isConnected = conn.status === "connected";
  const isComingSoon = conn.catalogStatus === "coming_soon";
  const isBeta = conn.catalogStatus === "beta";

  return (
    <NelvyonDsCard className={`flex flex-col gap-3 p-4 transition-colors ${isConnected ? "border-green-500/30" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-3">
          <span className="shrink-0 text-2xl">{conn.icon}</span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{conn.displayName}</p>
            {isConnected && conn.connectedAccount && (
              <p className="truncate text-xs text-muted-foreground">{conn.connectedAccount}</p>
            )}
            {isBeta && (
              <span className="mt-0.5 inline-block rounded bg-blue-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-blue-400">
                BETA
              </span>
            )}
          </div>
        </div>
        <NelvyonDsBadge
          tone={
            isConnected ? "success"
            : conn.status === "error" ? "danger"
            : "primary"
          }
        >
          {isConnected ? "Conectado"
            : conn.status === "error" ? "Error"
            : isComingSoon ? "Próximamente"
            : conn.envConfigured ? "Env OK"
            : "Sin conectar"}
        </NelvyonDsBadge>
      </div>

      {!isConnected && !isComingSoon && !conn.envConfigured && conn.envKeys.length > 0 && (
        <div className="rounded-lg bg-muted/20 px-3 py-2">
          <p className="text-xs text-muted-foreground">Variables necesarias en Railway:</p>
          <p className="mt-1 break-all font-mono text-xs text-primary">{conn.envKeys.join(", ")}</p>
        </div>
      )}

      {conn.status === "error" && conn.errorMessage && (
        <p className="text-xs text-red-400">{conn.errorMessage}</p>
      )}

      {isConnected && conn.lastSyncAt && (
        <p className="text-xs text-muted-foreground">
          Último sync: {new Date(conn.lastSyncAt).toLocaleString("es-ES")}
        </p>
      )}

      {conn.relatedRoute && isConnected && (
        <a href={conn.relatedRoute} className="text-xs text-primary underline underline-offset-2">
          Gestionar →
        </a>
      )}

      <div className="mt-auto flex flex-col gap-2">
        {isConnected && conn.slug === "hubspot" && onSync && (
          <NelvyonDsButton variant="primary" onClick={() => onSync(conn.slug)} className="w-full">
            Sincronizar HubSpot
          </NelvyonDsButton>
        )}
        {isConnected ? (
          <NelvyonDsButton variant="ghost" onClick={() => onDisconnect(conn.slug)} className="w-full">
            Desconectar
          </NelvyonDsButton>
        ) : isComingSoon ? (
          <NelvyonDsButton variant="ghost" disabled className="w-full cursor-not-allowed opacity-50">
            Próximamente
          </NelvyonDsButton>
        ) : conn.connectionType === "env" ? (
          <NelvyonDsButton variant="ghost" disabled className="w-full cursor-not-allowed opacity-60">
            Configurar en Railway
          </NelvyonDsButton>
        ) : conn.connectionType === "manual" ? (
          conn.relatedRoute ? (
            <a href={conn.relatedRoute} className="w-full">
              <NelvyonDsButton variant="primary" className="w-full">
                Configurar
              </NelvyonDsButton>
            </a>
          ) : (
            <NelvyonDsButton variant="ghost" disabled className="w-full cursor-not-allowed opacity-60">
              Configuración manual
            </NelvyonDsButton>
          )
        ) : (
          <NelvyonDsButton
            variant="primary"
            onClick={() => onConnect(conn.slug)}
            disabled={!conn.envConfigured}
            className="w-full"
            title={!conn.envConfigured ? "Añade las variables de entorno en Railway primero" : undefined}
          >
            Conectar
          </NelvyonDsButton>
        )}
      </div>
    </NelvyonDsCard>
  );
}

// ── Main content ──────────────────────────────────────────────────────────────

function IntegracionesContent() {
  const [connections, setConnections] = useState<IntegrationConnection[]>([]);
  const [summary, setSummary] = useState<ApiResponse["summary"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<Category | "all">("all");
  const searchParams = useSearchParams();
  const oauthSuccess = searchParams?.get("oauth_success") ?? null;
  const oauthError = searchParams?.get("oauth_error") ?? null;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/saas/integrations");
      if (res.ok) {
        const data = (await res.json()) as ApiResponse;
        setConnections(data.connections ?? []);
        setSummary(data.summary ?? null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function handleConnect(slug: string) {
    try {
      const res = await fetch(`/api/saas/integrations?action=authorize&provider=${encodeURIComponent(slug)}`);
      const data = (await res.json().catch(() => ({}))) as { authorizeUrl?: string; error?: string };
      if (data.authorizeUrl) {
        window.location.href = data.authorizeUrl;
      } else {
        alert(data.error ?? "Añade las variables de entorno en Railway antes de conectar.");
      }
    } catch {
      alert("Añade las variables de entorno en Railway antes de conectar esta integración.");
    }
  }

  async function handleDisconnect(slug: string) {
    const conn = connections.find((c) => c.slug === slug);
    if (!conn) return;
    if (!confirm(`¿Desconectar ${conn.displayName}?`)) return;
    await fetch(`/api/saas/integrations?provider=${encodeURIComponent(slug)}`, { method: "DELETE" }).catch(() => {});
    void load();
  }

  async function handleSync(slug: string) {
    if (slug !== "hubspot") return;
    const res = await fetch("/api/saas/integrations/hubspot/sync", { method: "POST" });
    if (res.ok) void load();
    else alert("Error al sincronizar HubSpot — verifica la conexión OAuth");
  }

  const filtered = connections.filter((c) => {
    const matchesSearch =
      !search ||
      c.displayName.toLowerCase().includes(search.toLowerCase()) ||
      c.slug.toLowerCase().includes(search.toLowerCase());
    const matchesCat = activeCategory === "all" || c.category === activeCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <SaasShellLayout sidebar={<SaasSidebar activeId="integraciones" />}>
      <div className="flex flex-col gap-6 pb-8">
        <NelvyonDsSectionHeader
          title="Integraciones"
          subtitle="Conecta Nelvyon con las herramientas que ya usas · 30+ conectores disponibles"
        />

        {oauthSuccess && (
          <div className="rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400">
            ✅ {oauthSuccess} conectado correctamente.
          </div>
        )}
        {oauthError && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            ❌ Error al conectar: {oauthError}. Asegúrate de haber añadido las variables de entorno en Railway.
          </div>
        )}

        {/* KPI strip */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Catálogo", value: summary?.total ?? connections.length },
            { label: "Conectadas", value: summary?.connected ?? 0 },
            { label: "Solo env", value: summary?.envOnly ?? 0 },
            { label: "OAuth", value: summary?.oauth ?? 0 },
          ].map(({ label, value }) => (
            <NelvyonDsCard key={label} className="p-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{loading ? "—" : value}</p>
            </NelvyonDsCard>
          ))}
        </div>

        {/* Search + category filter */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="search"
            placeholder="Buscar integración…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 flex-1 rounded-lg border border-border bg-muted/30 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setActiveCategory("all")}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${activeCategory === "all" ? "bg-primary text-white" : "bg-muted/40 text-muted-foreground hover:text-foreground"}`}
            >
              Todo
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${activeCategory === cat ? "bg-primary text-white" : "bg-muted/40 text-muted-foreground hover:text-foreground"}`}
              >
                {CATEGORY_ICONS[cat]} {CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="h-36 animate-pulse rounded-xl bg-muted/30" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <NelvyonDsCard className="py-12 text-center text-sm text-muted-foreground">
            No hay integraciones que coincidan con tu búsqueda.
          </NelvyonDsCard>
        ) : activeCategory !== "all" ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((c) => (
              <ConnectorCard key={c.slug} conn={c} onConnect={handleConnect} onDisconnect={handleDisconnect} onSync={handleSync} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {CATEGORIES.map((cat) => {
              const catConns = filtered.filter((c) => c.category === cat);
              if (catConns.length === 0) return null;
              return (
                <div key={cat}>
                  <p className="mb-3 text-sm font-semibold text-muted-foreground">
                    {CATEGORY_ICONS[cat]} {CATEGORY_LABELS[cat]}
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {catConns.map((c) => (
                      <ConnectorCard key={c.slug} conn={c} onConnect={handleConnect} onDisconnect={handleDisconnect} onSync={handleSync} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </SaasShellLayout>
  );
}

export default function SaasIntegracionesPage() {
  return (
    <Suspense fallback={null}>
      <IntegracionesContent />
    </Suspense>
  );
}
