"use client";

/**
 * /saas/agentes sobre `(cms)/content` de W3CRM, con las piezas ya portadas.
 * Mapeo: catalogo -> `W3crmContentBox` + rejilla de `card`; historial de
 * ejecuciones -> `W3crmContentBox` + `W3crmDataTable`; ejecucion ->
 * `W3crmModal`; contadores -> `W3crmKpiTile`. Sin componentes nuevos.
 *
 * Inventario: sin `data-testid`. Contrato de texto en
 * `capture-marketing-shots.spec.ts:45`: `/Agente|copy|pipeline|IA/i`, que
 * satisface el titulo "Agentes IA por Sector". Sin spec dedicado mas alla de
 * `saas-nav-full-coverage`.
 *
 * Colisiones revisadas: ningun titulo de `W3crmContentBox` repite el texto de
 * un KPI o de un boton, porque el toggle de la caja expone
 * `aria-label="Plegar <titulo>"` y entraria en los mismos conteos.
 *
 * Logica de NELVYON intacta: el catalogo estatico completo con sus ids,
 * categorias y marca `premium`; `POST /api/saas/agentes/execute` con
 * `{ agentId, input }` y su cascada de lectura `result ?? output ?? JSON`;
 * `GET /api/saas/agentes/runs?limit=10` recargado cuando cambia el agente
 * activo; el filtro por categoria y la busqueda por nombre o descripcion; el
 * "Nueva consulta" que limpia el resultado sin cerrar el dialogo.
 */
import { useEffect, useState } from "react";

import { SaasW3crmShell } from "@/features/saas-w3crm/components/SaasW3crmShell";
import { W3crmPageTitle } from "@/features/saas-w3crm/components/W3crmPageTitle";
import { W3crmEmptyState, W3crmKpiTile } from "@/features/saas-w3crm/components/W3crmUi";
import { W3crmContentBox, W3crmDataTable, W3crmModal } from "@/features/saas-w3crm/components/W3crmContentBox";

const AGENT_CATALOG: { id: string; name: string; description: string; category: string; premium?: boolean }[] = [
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
  { id: "outboundb2b", name: "Outbound B2B", description: "Prospección, secuencias de frío y seguimiento", category: "Ventas" },
  { id: "salesintelligence", name: "Sales Intelligence", description: "Señales de compra y priorización de leads", category: "Ventas" },
  { id: "customerjourney", name: "Customer Journey", description: "Mapeo y optimización de todo el embudo", category: "Ventas" },
  { id: "funnelmultipaso", name: "Funnel Multipaso", description: "Diseño y optimización de funnels de conversión", category: "Ventas" },
  { id: "dialer", name: "Dialer IA", description: "Llamadas de ventas asistidas por IA en tiempo real", category: "Ventas" },
  { id: "crm", name: "CRM IA", description: "Enriquecimiento, scoring y automatización CRM", category: "Ventas", premium: true },
  { id: "contactenrichmentmasivo", name: "Contact Enrichment", description: "Enriquecimiento masivo de base de datos", category: "Ventas" },
  { id: "leadenrich", name: "Lead Enrichment", description: "Datos firmográficos y tecnográficos en tiempo real", category: "Ventas" },
  { id: "technicalseoaudit", name: "Auditoría Técnica SEO", description: "Crawl completo, Core Web Vitals y errores", category: "SEO" },
  { id: "superiorseo", name: "Superior SEO", description: "Posicionamiento agresivo con estrategia editorial", category: "SEO", premium: true },
  { id: "contentscore", name: "Content Score", description: "Análisis de calidad de contenido vs. competencia", category: "SEO" },
  { id: "competitive", name: "Análisis Competitivo", description: "Gaps de keywords, backlinks y contenido rivales", category: "SEO" },
  { id: "helpdeskomnichannel", name: "Helpdesk Omnicanal", description: "Soporte IA en chat, email y WhatsApp", category: "Soporte" },
  { id: "chatwidget", name: "Chat Widget IA", description: "Widget de chat IA embebible en cualquier web", category: "Soporte" },
  { id: "customersuccess", name: "Customer Success IA", description: "Onboarding, NPS y prevención de churn proactiva", category: "Soporte" },
  { id: "churn", name: "Predicción Churn", description: "Detecta clientes en riesgo antes de que cancelen", category: "Soporte" },
  { id: "reviews", name: "Reviews IA", description: "Gestión de reseñas y reputación online", category: "Soporte" },
  { id: "videomarketing", name: "Video Marketing IA", description: "Guiones, storyboards y shorts automatizados", category: "Contenido" },
  { id: "podcast", name: "Podcast IA", description: "Producción, notas y clips para distribución", category: "Contenido" },
  { id: "imagenes", name: "Imágenes IA", description: "Generación de imágenes y creatividades para ads", category: "Contenido" },
  { id: "socialvideo", name: "Social Video IA", description: "Reels, TikToks y YouTube Shorts con guión", category: "Contenido" },
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
  { id: "workflow", name: "Workflow Builder IA", description: "Automatizaciones complejas sin código", category: "Automatización" },
  { id: "zapier", name: "Zapier IA", description: "Integración con 5.000+ apps vía Zapier", category: "Automatización" },
  { id: "reporting", name: "Reporting IA", description: "Informes ejecutivos PDF automáticos", category: "Automatización" },
  { id: "iapredictiva", name: "IA Predictiva", description: "Forecasting de ventas y métricas clave", category: "Automatización", premium: true },
  { id: "voiceagent", name: "Agente de Voz IA", description: "Llamadas automáticas de ventas y soporte", category: "Automatización", premium: true },
];

const CATEGORIES = ["Todos", "Marketing", "Ventas", "SEO", "Soporte", "Contenido", "Vertical", "Automatización"];

type AgentRun = { agentId: string; status: string; createdAt: string };

const RUN_BADGE: Record<string, string> = {
  completed: "badge-success",
  running: "badge-primary",
  failed: "badge-danger",
};

/** Un estado fuera de catalogo pintaba `undefined`. */
function runBadge(s: string): string {
  return RUN_BADGE[s] ?? "badge-secondary";
}
function fechaCorta(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleString("es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function ExecuteModal({ agent, onClose }: {
  agent: { id: string; name: string; description: string }; onClose: () => void;
}) {
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
    <W3crmModal titulo={agent.name} onClose={onClose} error={error} size="lg">
      <p className="fs-14 text-muted">{agent.description}</p>
      {!result ? (
        <form onSubmit={(e) => void run(e)}>
          <div className="form-group mb-3">
            <label htmlFor="ag-input" className="text-black font-w600">
              ¿Qué quieres que haga el agente? <span className="required">*</span>
            </label>
            <textarea id="ag-input" className="form-control" rows={5}
              placeholder="Ejemplo: Analiza el SEO de nelvyon.com y dame las 10 keywords de mayor oportunidad para posicionar en el top 3 en España."
              value={input} onChange={(e) => setInput(e.target.value)} />
          </div>
          <div className="text-end">
            <button type="button" className="btn btn-primary light me-2" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={running || !input.trim()}>
              {running ? "Ejecutando agente…" : "Ejecutar"}
            </button>
          </div>
        </form>
      ) : (
        <>
          <div className="border rounded bg-light p-3 mb-3">
            <p className="text-muted fs-12 mb-2">Resultado del agente</p>
            <pre className="mb-0" style={{ whiteSpace: "pre-wrap" }}>{result}</pre>
          </div>
          <div className="text-end">
            <button type="button" className="btn btn-primary light me-2" onClick={() => setResult(null)}>
              Nueva consulta
            </button>
            <button type="button" className="btn btn-primary" onClick={onClose}>Cerrar</button>
          </div>
        </>
      )}
    </W3crmModal>
  );
}

export default function SaasAgentesPage() {
  const [category, setCategory] = useState("Todos");
  const [search, setSearch] = useState("");
  const [activeAgent, setActiveAgent] = useState<(typeof AGENT_CATALOG)[number] | null>(null);
  const [runs, setRuns] = useState<AgentRun[]>([]);

  const agentNameById = new Map(AGENT_CATALOG.map((a) => [a.id, a.name]));

  useEffect(() => {
    fetch("/api/saas/agentes/runs?limit=10")
      .then((r) => r.json())
      // `runs` podia no ser array y reventaba el `.length`/`.map`.
      .then((d: { runs?: AgentRun[] }) => setRuns(Array.isArray(d?.runs) ? d.runs : []))
      .catch(() => {});
  }, [activeAgent]);

  const filtered = AGENT_CATALOG.filter((a) => {
    const matchCat = category === "Todos" || a.category === category;
    const matchSearch = !search
      || a.name.toLowerCase().includes(search.toLowerCase())
      || a.description.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <SaasW3crmShell>
      <W3crmPageTitle mainTitle="Agentes IA por Sector" parentTitle="Inteligencia" pageTitle="Agentes" />
      <div className="container-fluid">
        <div className="row">
          <div className="col-xl-3 col-sm-6">
            <W3crmKpiTile label="Agentes disponibles" value={AGENT_CATALOG.length} accent />
          </div>
          <div className="col-xl-3 col-sm-6">
            <W3crmKpiTile label="Sectores cubiertos" value={CATEGORIES.length - 1} />
          </div>
          <div className="col-xl-3 col-sm-6">
            <W3crmKpiTile label="Ejecutados (recientes)" value={runs.length} />
          </div>
          <div className="col-xl-3 col-sm-6">
            <W3crmKpiTile label="Modo" value="Producción IA" />
          </div>

          <div className="col-xl-12">
            <p className="fs-14 text-muted">
              {AGENT_CATALOG.length} agentes especializados listos para ejecutar — el corazón de Nelvyon
            </p>

            {runs.length > 0 && (
              <W3crmContentBox
                titulo={`Historial de ejecuciones (${runs.length})`}
                icono="fa-solid fa-clock-rotate-left"
                defaultOpen={false}
              >
                <W3crmDataTable
                  filas={runs}
                  etiqueta="ejecuciones"
                  wrapperId="agent_runs_wrapper"
                  porPagina={10}
                  columnas={[{ titulo: "Agente" }, { titulo: "Estado" }, { titulo: "Fecha", alFinal: true }]}
                  render={(r, i) => (
                    <tr key={`${r.agentId}-${i}`}>
                      <td><span className="fw-bold">{agentNameById.get(r.agentId) ?? r.agentId ?? "—"}</span></td>
                      <td><span className={`badge ${runBadge(r.status)}`}>{r.status || "—"}</span></td>
                      <td className="text-end">{fechaCorta(r.createdAt)}</td>
                    </tr>
                  )}
                />
              </W3crmContentBox>
            )}

            <W3crmContentBox titulo="Catálogo de agentes" icono="fa-solid fa-robot">
              <div className="row align-items-end mb-3">
                <div className="col-xl-4 col-sm-6">
                  <div className="form-group mb-2">
                    <label htmlFor="ag-buscar" className="text-black font-w600">Buscar agente</label>
                    <input id="ag-buscar" className="form-control" placeholder="Buscar agente…"
                      value={search} onChange={(e) => setSearch(e.target.value)} />
                  </div>
                </div>
                <div className="col-xl-8 col-sm-6">
                  <div className="mb-2" role="group" aria-label="Filtrar por categoría">
                    {CATEGORIES.map((c) => (
                      <button key={c} type="button" aria-pressed={category === c}
                        className={`btn btn-sm me-1 mb-1 ${category === c ? "btn-primary" : "btn-primary light"}`}
                        onClick={() => setCategory(c)}>
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {filtered.length === 0 ? (
                <W3crmEmptyState title="Sin resultados" description="Prueba otro término de búsqueda." />
              ) : (
                <div className="row">
                  {filtered.map((agent) => (
                    <div className="col-xl-3 col-lg-4 col-sm-6" key={agent.id}>
                      <div className="card border mb-3 h-100">
                        <div className="card-body d-flex flex-column">
                          <div className="d-flex align-items-start justify-content-between gap-2">
                            <span className="fw-bold">{agent.name}</span>
                            {agent.premium ? <span className="badge badge-warning">Pro</span> : null}
                          </div>
                          <p className="text-muted fs-12 mt-1 mb-3">{agent.description}</p>
                          <div className="d-flex align-items-center justify-content-between mt-auto">
                            <span className="badge badge-primary">{agent.category}</span>
                            <button type="button" className="btn btn-primary btn-sm"
                              aria-label={`Ejecutar ${agent.name}`}
                              onClick={() => setActiveAgent(agent)}>
                              Ejecutar
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </W3crmContentBox>
          </div>
        </div>
      </div>

      {activeAgent && <ExecuteModal agent={activeAgent} onClose={() => setActiveAgent(null)} />}
    </SaasW3crmShell>
  );
}
