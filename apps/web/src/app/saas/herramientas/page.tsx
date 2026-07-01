"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  NelvyonDsButton,
  NelvyonDsCard,
  NelvyonDsSectionHeader,
  NelvyonDsBadge,
} from "@/design-system/components";
import { SaasShellLayout } from "@/features/saas-shell/components/SaasShellLayout";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";

// ─── Sección 1: Descargas ────────────────────────────────────────────────────

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

function CodeToggleCard({
  icon,
  title,
  description,
  badge,
  badgeTone,
  snippet,
}: {
  icon: string;
  title: string;
  description: string;
  badge: string;
  badgeTone: "warning" | "success" | "primary" | "danger";
  snippet: string;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    void navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <NelvyonDsCard className="flex flex-col gap-3 p-5">
      <div className="flex items-start justify-between gap-2">
        <span className="text-3xl">{icon}</span>
        <NelvyonDsBadge tone={badgeTone}>{badge}</NelvyonDsBadge>
      </div>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
      <NelvyonDsButton variant="ghost" className="w-full" onClick={() => setOpen((v) => !v)}>
        {open ? "Ocultar código" : "Ver código"}
      </NelvyonDsButton>
      {open && (
        <div className="relative">
          <pre className="overflow-x-auto rounded-xl bg-muted/30 p-4 font-mono text-xs text-green-400 whitespace-pre-wrap break-all">
            {snippet}
          </pre>
          <button
            onClick={handleCopy}
            className="absolute right-2 top-2 rounded-lg bg-muted/60 px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
          >
            {copied ? "✓ Copiado" : "Copiar"}
          </button>
        </div>
      )}
    </NelvyonDsCard>
  );
}

function DownloadLinkCard({
  icon,
  title,
  description,
  href,
  buttonLabel,
}: {
  icon: string;
  title: string;
  description: string;
  href: string;
  buttonLabel: string;
}) {
  return (
    <NelvyonDsCard className="flex flex-col gap-3 p-5">
      <div className="flex items-start justify-between gap-2">
        <span className="text-3xl">{icon}</span>
        <NelvyonDsBadge tone="success">Disponible</NelvyonDsBadge>
      </div>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
      <Link href={href}>
        <NelvyonDsButton variant="ghost" className="w-full">
          {buttonLabel}
        </NelvyonDsButton>
      </Link>
    </NelvyonDsCard>
  );
}

// ─── Sección 2: Herramientas conectables ─────────────────────────────────────

interface ToolConfig {
  icon: string;
  name: string;
  slug: string;
  description: string;
}

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
          const data = (await res.json()) as { connections?: IntegrationConnection[] };
          setConnections(data.connections ?? []);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function toolStatus(tool: ToolConfig): { label: string; tone: "success" | "primary" | "warning" | "danger"; connected: boolean } {
    const conn = connections.find((c) => c.slug === tool.slug);
    if (conn?.catalogStatus === "coming_soon") {
      return { label: "En catálogo", tone: "warning", connected: false };
    }
    if (!conn) {
      return { label: loading ? "…" : "No conectado", tone: "primary", connected: false };
    }
    if (conn.status === "connected") {
      return { label: "Conectado", tone: "success", connected: true };
    }
    if (conn.status === "error") {
      return { label: "Error", tone: "danger", connected: false };
    }
    return { label: "No conectado", tone: "primary", connected: false };
  }

  return (
    <section className="space-y-4">
      <p className="text-sm font-semibold text-muted-foreground">🔗 Conectar herramientas</p>
      <div className="grid gap-4 sm:grid-cols-2">
        {TOOLS.map((tool) => {
          const { label, tone, connected } = toolStatus(tool);
          return (
            <NelvyonDsCard
              key={tool.name}
              className={`flex items-center gap-4 p-4 ${connected ? "border-green-500/30" : ""}`}
            >
              <span className="text-2xl">{tool.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">{tool.name}</p>
                  <NelvyonDsBadge tone={tone}>{label}</NelvyonDsBadge>
                </div>
                <p className="text-xs text-muted-foreground">{tool.description}</p>
              </div>
              <Link href="/saas/integraciones">
                <NelvyonDsButton variant="ghost" className="shrink-0">
                  Configurar
                </NelvyonDsButton>
              </Link>
            </NelvyonDsCard>
          );
        })}
      </div>
    </section>
  );
}

// ─── Sección 3: API key reveal ────────────────────────────────────────────────

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
          const data = (await res.json()) as { keys?: Array<{ id: string; keyPrefix: string; name: string }> };
          setKeys(data.keys ?? []);
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
        const data = (await res.json()) as { rawKey?: string; key?: { id: string; keyPrefix: string; name: string } };
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
    void navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <NelvyonDsCard className="flex flex-col gap-4 p-5">
      <p className="text-sm font-semibold text-foreground">API Key</p>
      <div className="flex items-center gap-3 rounded-xl bg-muted/30 px-4 py-3">
        <span className="flex-1 font-mono text-sm text-green-400">
          {loading ? "Cargando…" : displayKey}
        </span>
        {rawKey && (
          <button onClick={handleCopy} className="text-xs text-muted-foreground hover:text-foreground">
            {copied ? "✓" : "Copiar"}
          </button>
        )}
      </div>
      {rawKey && (
        <p className="text-xs text-amber-400">Copia esta clave ahora — no se volverá a mostrar completa.</p>
      )}
      <div className="flex flex-wrap gap-3">
        <NelvyonDsButton variant="ghost" onClick={() => void handleCreate()} disabled={creating}>
          {creating ? "Generando…" : keys.length === 0 ? "Generar API key" : "Nueva API key"}
        </NelvyonDsButton>
        <Link href="/docs">
          <NelvyonDsButton variant="ghost">Ver documentación</NelvyonDsButton>
        </Link>
        <Link href="/saas/settings">
          <NelvyonDsButton variant="ghost">Configurar webhooks</NelvyonDsButton>
        </Link>
      </div>
      <div className="rounded-xl bg-muted/20 p-4">
        <p className="mb-2 text-xs font-semibold text-muted-foreground">Rate limits</p>
        <div className="space-y-1 text-xs text-muted-foreground">
          <p><span className="text-foreground font-medium">Starter</span> — 1.000 req/día</p>
          <p><span className="text-foreground font-medium">Pro</span> — 10.000 req/día</p>
          <p><span className="text-foreground font-medium">Agency</span> — Ilimitado</p>
        </div>
      </div>
    </NelvyonDsCard>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function HerramientasPage() {
  return (
    <SaasShellLayout sidebar={<SaasSidebar activeId="herramientas" />}>
            {/* ── Encabezado ── */}
            <NelvyonDsSectionHeader
              title="Herramientas & Descargas"
              subtitle="Todo lo que necesitas para conectar, automatizar y extender Nelvyon"
            />

            {/* ── Sección 1: Descargas ── */}
            <section className="space-y-4">
              <p className="text-sm font-semibold text-muted-foreground">📦 Descargas</p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <DownloadLinkCard
                  icon="📱"
                  title="App móvil (PWA)"
                  description="Instala Nelvyon en iPhone o Android desde el navegador — CRM, inbox y alertas"
                  href="/saas/pwa"
                  buttonLabel="Instalar PWA"
                />
                <DownloadLinkCard
                  icon="🎯"
                  title="Prospección B2B"
                  description="Busca leads, enriquece contactos y añádelos al CRM desde la web"
                  href="/saas/prospecting"
                  buttonLabel="Abrir prospección"
                />
                <DownloadLinkCard
                  icon="🔑"
                  title="API & Webhooks"
                  description="Integra Nelvyon con Zapier, Make, n8n y tus sistemas"
                  href="/saas/integraciones"
                  buttonLabel="Ver integraciones"
                />
                <CodeToggleCard
                  icon="💬"
                  title="Widget de chat"
                  description="Añade un chat IA a tu web con una línea de código"
                  badge="Disponible"
                  badgeTone="success"
                  snippet={WIDGET_SNIPPET}
                />
                <CodeToggleCard
                  icon="📊"
                  title="Pixel de seguimiento"
                  description="Rastrea conversiones y comportamiento en tu web"
                  badge="Disponible"
                  badgeTone="success"
                  snippet={PIXEL_SNIPPET}
                />
                <NelvyonDsCard className="flex flex-col gap-3 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-3xl">⚡</span>
                    <NelvyonDsBadge tone="primary">Beta</NelvyonDsBadge>
                  </div>
                  <p className="text-sm font-semibold text-foreground">Zapier Integration</p>
                  <p className="text-xs text-muted-foreground">
                    Conecta Nelvyon con +5.000 apps sin código
                  </p>
                  <Link href="/saas/integraciones">
                    <NelvyonDsButton variant="ghost" className="w-full">
                      Configurar en Integraciones
                    </NelvyonDsButton>
                  </Link>
                </NelvyonDsCard>
              </div>
            </section>

            {/* ── Sección 2: Conectar herramientas ── */}
            <ToolsSection />

            {/* ── Sección 3: API & Webhooks ── */}
            <section className="space-y-4">
              <p className="text-sm font-semibold text-muted-foreground">🔑 API & Webhooks</p>
              <ApiKeyCard />
            </section>

            {/* ── Sección 4: Recursos ── */}
            <section className="space-y-4">
              <p className="text-sm font-semibold text-muted-foreground">📚 Recursos</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { icon: "📋", title: "Playbooks de datos", href: "/saas/playbooks", label: "Abrir" },
                  { icon: "⚙️", title: "Workflows y automatizaciones", href: "/saas/workflows", label: "Abrir" },
                  { icon: "🔑", title: "API keys", href: "/saas/api-keys", label: "Gestionar" },
                  { icon: "🔗", title: "Webhooks", href: "/saas/webhooks", label: "Configurar" },
                ].map(({ icon, title, href, label }) => (
                  <NelvyonDsCard key={title} className="flex items-center gap-4 p-4">
                    <span className="text-2xl">{icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">{title}</p>
                    </div>
                    <Link href={href}>
                      <NelvyonDsButton variant="ghost" className="shrink-0 text-xs">
                        {label}
                      </NelvyonDsButton>
                    </Link>
                  </NelvyonDsCard>
                ))}
              </div>
            </section>
    </SaasShellLayout>
  );
}
