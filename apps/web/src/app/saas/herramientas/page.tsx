"use client";

import { useState } from "react";
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

function DisabledDownloadCard({
  icon,
  title,
  description,
  badge,
  buttonLabel,
}: {
  icon: string;
  title: string;
  description: string;
  badge: string;
  buttonLabel: string;
}) {
  return (
    <NelvyonDsCard className="flex flex-col gap-3 p-5">
      <div className="flex items-start justify-between gap-2">
        <span className="text-3xl">{icon}</span>
        <NelvyonDsBadge tone="warning">{badge}</NelvyonDsBadge>
      </div>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
      <NelvyonDsButton variant="ghost" className="w-full" disabled>
        {buttonLabel}
      </NelvyonDsButton>
    </NelvyonDsCard>
  );
}

// ─── Sección 2: Herramientas conectables ─────────────────────────────────────

const TOOLS = [
  { icon: "⚡", name: "Zapier", description: "Automatiza flujos entre Nelvyon y miles de apps", connected: false },
  { icon: "🔄", name: "Make (Integromat)", description: "Workflows visuales avanzados", connected: false },
  { icon: "🔧", name: "n8n", description: "Automatización self-hosted", connected: false },
  { icon: "💬", name: "Slack", description: "Notificaciones de leads y alertas en tiempo real", connected: true },
  { icon: "📊", name: "Google Analytics", description: "Seguimiento de conversiones en tu web", connected: false },
  { icon: "🏷️", name: "Google Tag Manager", description: "Gestión centralizada de píxeles y scripts", connected: false },
  { icon: "📘", name: "Meta Pixel", description: "Seguimiento de conversiones para Meta Ads", connected: false },
  { icon: "💼", name: "LinkedIn Insight", description: "Analytics y retargeting LinkedIn", connected: false },
  { icon: "🔥", name: "Hotjar", description: "Mapas de calor y grabaciones de sesión", connected: false },
];

// ─── Sección 3: API key reveal ────────────────────────────────────────────────

function ApiKeyCard() {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const EXAMPLE_KEY = "nv_sk_1a2b3c4d5e6f7g8h9i0j";
  const displayKey = revealed ? EXAMPLE_KEY : "nv_••••••••••••••••";

  function handleCopy() {
    void navigator.clipboard.writeText(EXAMPLE_KEY);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <NelvyonDsCard className="flex flex-col gap-4 p-5">
      <p className="text-sm font-semibold text-foreground">API Key</p>
      <div className="flex items-center gap-3 rounded-xl bg-muted/30 px-4 py-3">
        <span className="flex-1 font-mono text-sm text-green-400">{displayKey}</span>
        <button
          onClick={() => setRevealed((v) => !v)}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          {revealed ? "Ocultar" : "Revelar"}
        </button>
        <button onClick={handleCopy} className="text-xs text-muted-foreground hover:text-foreground">
          {copied ? "✓" : "Copiar"}
        </button>
      </div>
      <div className="flex flex-wrap gap-3">
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
                <DisabledDownloadCard
                  icon="🔌"
                  title="Extensión Chrome"
                  description="Prospecta en LinkedIn, captura leads y añádelos al CRM con 1 clic"
                  badge="Próximamente"
                  buttonLabel="Descargar extensión"
                />
                <DisabledDownloadCard
                  icon="📱"
                  title="App iOS"
                  description="Gestiona tu CRM, recibe alertas y llama a clientes desde el móvil"
                  badge="Próximamente"
                  buttonLabel="App Store"
                />
                <DisabledDownloadCard
                  icon="🤖"
                  title="App Android"
                  description="Mismas funciones que iOS, optimizada para Android"
                  badge="Próximamente"
                  buttonLabel="Google Play"
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
                  <a href="https://zapier.com" target="_blank" rel="noopener noreferrer">
                    <NelvyonDsButton variant="ghost" className="w-full">
                      Ir a Zapier ↗
                    </NelvyonDsButton>
                  </a>
                </NelvyonDsCard>
              </div>
            </section>

            {/* ── Sección 2: Conectar herramientas ── */}
            <section className="space-y-4">
              <p className="text-sm font-semibold text-muted-foreground">🔗 Conectar herramientas</p>
              <div className="grid gap-4 sm:grid-cols-2">
                {TOOLS.map((tool) => (
                  <NelvyonDsCard
                    key={tool.name}
                    className={`flex items-center gap-4 p-4 ${tool.connected ? "border-green-500/30" : ""}`}
                  >
                    <span className="text-2xl">{tool.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">{tool.name}</p>
                        <NelvyonDsBadge tone={tool.connected ? "success" : "primary"}>
                          {tool.connected ? "Conectado" : "No conectado"}
                        </NelvyonDsBadge>
                      </div>
                      <p className="text-xs text-muted-foreground">{tool.description}</p>
                    </div>
                    <Link href="/saas/integraciones">
                      <NelvyonDsButton variant="ghost" className="shrink-0">
                        Configurar
                      </NelvyonDsButton>
                    </Link>
                  </NelvyonDsCard>
                ))}
              </div>
            </section>

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
                  { icon: "📄", title: "Guía de inicio rápido", type: "PDF", label: "Descargar" },
                  { icon: "📁", title: "Plantillas de workflows", type: "ZIP", label: "Descargar" },
                  { icon: "🗂️", title: "Postman collection", type: "JSON", label: "Descargar" },
                  { icon: "📦", title: "SDK JavaScript", type: "npm", label: "npm install @nelvyon/sdk" },
                ].map(({ icon, title, type, label }) => (
                  <NelvyonDsCard key={title} className="flex items-center gap-4 p-4">
                    <span className="text-2xl">{icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">{title}</p>
                      <p className="text-xs text-muted-foreground">{type}</p>
                    </div>
                    <a href="#">
                      <NelvyonDsButton variant="ghost" className="shrink-0 text-xs">
                        {label}
                      </NelvyonDsButton>
                    </a>
                  </NelvyonDsCard>
                ))}
              </div>
            </section>
    </SaasShellLayout>
  );
}
