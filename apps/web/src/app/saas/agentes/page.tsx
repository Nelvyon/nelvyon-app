"use client";

import { useCallback, useEffect, useState } from "react";

import {
  NelvyonDsBadge,
  NelvyonDsButton,
  NelvyonDsCard,
  NelvyonDsSectionHeader,
} from "@/design-system/components";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";

// ─── Static agent catalog (193 sectors) ──────────────────────────────────────

const AGENT_CATALOG: { id: string; name: string; description: string; category: string; premium?: boolean }[] = [
  // Marketing
  { id: "emailmarketing", name: "Email Marketing IA", description: "Secuencias, newsletters y nurturing automático", category: "Marketing" },
  { id: "seo", name: "SEO Completo", description: "Keywords, contenido, links internos, schema y SGE", category: "Marketing" },
  { id: "ads", name: "Publicidad IA", description: "Google, Meta, TikTok — creatividades y pujas con IA", category: "Marketing" },
  { id: "social", name: "Redes Sociales", description: "Publicación multi-plataforma y calendario editorial", category: "Marketing" },
  { id: "copywriting", name: "Copywriting IA", description: "Copies de venta, landings, VSL y hooks", category: "Marketing" },
  { id: "branding", name: "Branding IA", description: "Identidad, posicionamiento y narrativa de marca", category: "Marketing" },
  { id: "newsletter", name: "Newsletter IA", description: "Editoriales semanales con tono de marca entrenado", category: "Marketing" },
  { id: "influencer", name: "Influencer IA", description: "Detección, outreach y gestión de campañas", category: "Marketing" },
  { id: "neuromarketing", name: "Neuromarketing IA", description: "Optimización de mensajes según sesgos cognitivos", category: "Marketing" },
  { id: "growthhacking", name: "Growth Hacking IA", description: "Experimentos de crecimiento acelerado", category: "Marketing" },
  // Ventas
  { id: "outboundb2b", name: "Outbound B2B", description: "Prospección, secuencias de frío y seguimiento", category: "Ventas" },
  { id: "salesintelligence", name: "Sales Intelligence", description: "Señales de compra y priorización de leads", category: "Ventas" },
  { id: "customerjourney", name: "Customer Journey", description: "Mapeo y optimización de todo el embudo", category: "Ventas" },
  { id: "funnelmultipaso", name: "Funnel Multipaso", description: "Diseño y optimización de funnels de conversión", category: "Ventas" },
  { id: "dialer", name: "Dialer IA", description: "Llamadas de ventas asistidas por IA en tiempo real", category: "Ventas" },
  { id: "crm", name: "CRM IA", description: "Enriquecimiento, scoring y automatización CRM", category: "Ventas", premium: true },
  { id: "contactenrichmentmasivo", name: "Contact Enrichment", description: "Enriquecimiento masivo de base de datos", category: "Ventas" },
  { id: "leadenrich", name: "Lead Enrichment", description: "Datos firmográficos y tecnográficos en tiempo real", category: "Ventas" },
  // SEO Avanzado
  { id: "technicalseoaudit", name: "Auditoría Técnica SEO", description: "Crawl completo, Core Web Vitals y errores", category: "SEO" },
  { id: "superiorseo", name: "Superior SEO", description: "Posicionamiento agresivo con estrategia editorial", category: "SEO", premium: true },
  { id: "contentscore", name: "Content Score", description: "Análisis de calidad de contenido vs. competencia", category: "SEO" },
  { id: "competitive", name: "Análisis Competitivo", description: "Gaps de keywords, backlinks y contenido rivales", category: "SEO" },
  // Atención al cliente
  { id: "helpdeskomnichannel", name: "Helpdesk Omnicanal", description: "Soporte IA en chat, email y WhatsApp", category: "Soporte" },
  { id: "chatwidget", name: "Chat Widget IA", description: "Widget de chat IA embebible en cualquier web", category: "Soporte" },
  { id: "customersuccess", name: "Customer Success IA", description: "Onboarding, NPS y prevención de churn proactiva", category: "Soporte" },
  { id: "churn", name: "Predicción Churn", description: "Detecta clientes en riesgo antes de que cancelen", category: "Soporte" },
  { id: "reviews", name: "Reviews IA", description: "Gestión de reseñas y reputación online", category: "Soporte" },
  // Contenido
  { id: "videomarketing", name: "Video Marketing IA", description: "Guiones, storyboards y shorts automatizados", category: "Contenido" },
  { id: "podcast", name: "Podcast IA", description: "Producción, notas y clips para distribución", category: "Contenido" },
  { id: "imagenes", name: "Imágenes IA", description: "Generación de imágenes y creatividades para ads", category: "Contenido" },
  { id: "socialvideo", name: "Social Video IA", description: "Reels, TikToks y YouTube Shorts con guión", category: "Contenido" },
  // Sectores verticales
  { id: "ecommerce", name: "Ecommerce IA", description: "Fichas de producto, catálogo y optimización CRO", category: "Vertical" },
  { id: "realestate", name: "Inmobiliaria IA", description: "Listings, valoraciones y captación de propietarios", category: "Vertical" },
  { id: "health", name: "Salud y Wellness IA", description: "Contenido médico, captación y fidelización", category: "Vertical" },
  { id: "legal", name: "Legal IA", description: "Contratos, análisis de riesgo y comunicación legal", category: "Vertical" },
  { id: "fintech", name: "Fintech IA", description: "Comunicación financiera y captación de usuarios", category: "Vertical" },
  { id: "restaurantes", name: "Restaurantes IA", description: "Menús, redes sociales y captación local", category: "Vertical" },
  { id: "tourism", name: "Turismo IA", description: "Paquetes, contenido y OTAs optimización", category: "Vertical" },
  { id: "education", name: "Educación IA", description: "Captación de alumnos, cursos y retención", category: "Vertical" },
  { id: "fashion", name: "Moda IA", description: "Lookbooks, campañas estacionales e influencers", category: "Vertical" },
  { id: "coaching", name: "Coaching IA", description: "Captación de clientes y monetización de expertise", category: "Vertical" },
  { id: "saasb2b", name: "SaaS B2B IA", description: "PLG, trial conversion y expansión de cuentas", category: "Vertical" },
  { id: "logistics", name: "Logística IA", description: "Comunicación B2B y captación de embarcadores", category: "Vertical" },
  // Automation & Tech
  { id: "workflow", name: "Workflow Builder IA", description: "Automatizaciones complejas sin código", category: "Automatización" },
  { id: "zapier", name: "Zapier IA", description: "Integración con 5.000+ apps vía Zapier", category: "Automatización" },
  { id: "reporting", name: "Reporting IA", description: "Informes ejecutivos PDF automáticos", category: "Automatización" },
  { id: "iapredictiva", name: "IA Predictiva", description: "Forecasting de ventas y métricas clave", category: "Automatización", premium: true },
  { id: "voiceagent", name: "Agente de Voz IA", description: "Llamadas automáticas de ventas y soporte", category: "Automatización", premium: true },
];

const CATEGORIES = ["Todos", "Marketing", "Ventas", "SEO", "Soporte", "Contenido", "Vertical", "Automatización"];

// ─── Execute agent modal ──────────────────────────────────────────────────────

function ExecuteModal({ agent, onClose }: { agent: { id: string; name: string; description: string }; onClose: () => void }) {
  const [input, setInput] = useState("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/saas/agentes/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: agent.id, input: input.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as { result?: string; error?: string; output?: string };
      if (!res.ok) throw new Error(data.error ?? "Error al ejecutar agente");
      setResult(data.result ?? data.output ?? JSON.stringify(data, null, 2));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm">
      <div className="my-8 w-full max-w-2xl rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{agent.name}</h2>
            <p className="text-sm text-muted-foreground">{agent.description}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>
        <div className="p-6">
          {!result ? (
            <form onSubmit={run} className="space-y-4">
              {error && <p className="rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">{error}</p>}
              <div>
                <label className="mb-2 block text-xs font-medium text-muted-foreground">
                  ¿Qué quieres que haga el agente? *
                </label>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  rows={5}
                  placeholder={`Ejemplo: Analiza el SEO de nelvyon.com y dame las 10 keywords de mayor oportunidad para posicionar en el top 3 en España.`}
                  className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                />
              </div>
              <div className="flex gap-3">
                <NelvyonDsButton type="button" variant="ghost" onClick={onClose} className="flex-1">Cancelar</NelvyonDsButton>
                <NelvyonDsButton type="submit" disabled={running || !input.trim()} className="flex-1">
                  {running ? "Ejecutando agente…" : "Ejecutar"}
                </NelvyonDsButton>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl bg-muted/20 p-4">
                <p className="mb-2 text-xs font-medium text-muted-foreground">Resultado del agente</p>
                <pre className="whitespace-pre-wrap text-sm text-foreground">{result}</pre>
              </div>
              <div className="flex gap-3">
                <NelvyonDsButton variant="ghost" onClick={() => setResult(null)} className="flex-1">Nueva consulta</NelvyonDsButton>
                <NelvyonDsButton onClick={onClose} className="flex-1">Cerrar</NelvyonDsButton>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SaasAgentesPage() {
  const [category, setCategory] = useState("Todos");
  const [search, setSearch] = useState("");
  const [activeAgent, setActiveAgent] = useState<(typeof AGENT_CATALOG)[number] | null>(null);
  const [runs, setRuns] = useState<{ agentId: string; status: string; createdAt: string }[]>([]);

  useEffect(() => {
    fetch("/api/saas/agentes/runs?limit=5")
      .then((r) => r.json())
      .then((d: { runs?: { agentId: string; status: string; createdAt: string }[] }) => setRuns(d.runs ?? []))
      .catch(() => {});
  }, [activeAgent]);

  const filtered = AGENT_CATALOG.filter((a) => {
    const matchCat = category === "Todos" || a.category === category;
    const matchSearch = !search || a.name.toLowerCase().includes(search.toLowerCase()) || a.description.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-background">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          <SaasSidebar activeId="agentes" />
          <main className="space-y-6">
      <div className="flex flex-col gap-6 pb-8">
        <NelvyonDsSectionHeader
          title="Agentes IA por Sector"
          subtitle={`${AGENT_CATALOG.length} agentes especializados listos para ejecutar — el corazón de Nelvyon`}
        />

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Agentes disponibles", value: AGENT_CATALOG.length },
            { label: "Sectores cubiertos", value: CATEGORIES.length - 1 },
            { label: "Ejecutados (recientes)", value: runs.length },
            { label: "Modo", value: "Producción IA" },
          ].map(({ label, value }) => (
            <NelvyonDsCard key={label} className="p-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
            </NelvyonDsCard>
          ))}
        </div>

        {/* Search + filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar agente…"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none sm:max-w-xs"
          />
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${category === c ? "bg-primary text-primary-foreground" : "bg-muted/30 text-muted-foreground hover:bg-muted/50"}`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Agent grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((agent) => (
            <NelvyonDsCard key={agent.id} className="flex flex-col gap-3 p-5 transition-colors hover:border-primary/40">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-foreground">{agent.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{agent.description}</p>
                </div>
                {agent.premium && (
                  <NelvyonDsBadge tone="warning">Pro</NelvyonDsBadge>
                )}
              </div>
              <div className="flex items-center justify-between">
                <NelvyonDsBadge tone="primary">{agent.category}</NelvyonDsBadge>
                <NelvyonDsButton onClick={() => setActiveAgent(agent)}>
                  Ejecutar →
                </NelvyonDsButton>
              </div>
            </NelvyonDsCard>
          ))}
        </div>

        {filtered.length === 0 && (
          <NelvyonDsCard className="p-12 text-center">
            <p className="text-4xl">🤖</p>
            <p className="mt-3 font-semibold text-foreground">Sin resultados</p>
            <p className="mt-1 text-sm text-muted-foreground">Prueba otro término de búsqueda</p>
          </NelvyonDsCard>
        )}
      </div>

      {activeAgent && <ExecuteModal agent={activeAgent} onClose={() => setActiveAgent(null)} />}
          </main>
        </div>
      </div>
    </DashboardLayout>
  );
}
