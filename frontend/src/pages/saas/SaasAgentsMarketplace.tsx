import { useEffect, useState, useCallback } from "react";
import { useI18n } from "@/lib/i18n";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import SaasLayout from "@/components/SaasLayout";
import { client } from "@/lib/api";
import {
  Bot, Crown, Sparkles, Search, ChevronDown, ChevronUp,
  Check, Settings, Zap, Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { saasAgents, saasAgentCategories } from "@/lib/saas-agents-data";

export default function SaasAgentsMarketplace() {
  const { ts } = useI18n();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);
  const [configuring, setConfiguring] = useState<string | null>(null);
  const [activatedAgents, setActivatedAgents] = useState<Set<string>>(new Set(["lead-catcher", "sales-bot", "chat-support", "email-engine"]));

  const loadMarketplaceData = useCallback(async () => {
    try {
      const res = await client.entities.marketplace_agents.query({ sort: "-created_at", limit: 50 });
      const items = (res.data?.items as Array<Record<string, unknown>>) || [];
      if (items.length > 0) {
        const ids = items.filter((i) => i.activated).map((i) => String(i.agent_id));
        if (ids.length > 0) setActivatedAgents(new Set(ids));
      }
    } catch (err) { if (import.meta.env.DEV) console.warn("[SaasAgentsMarketplace] Error:", err); /* fallback to defaults */ }
  }, []);

  useEffect(() => {
    if (!loading && !user) navigate("/saas");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) loadMarketplaceData();
  }, [user, loadMarketplaceData]);

  const filtered = saasAgents.filter(a => {
    const matchSearch = a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.role.toLowerCase().includes(search.toLowerCase()) ||
      a.description.toLowerCase().includes(search.toLowerCase());
    const matchCategory = !activeCategory || a.category === activeCategory;
    return matchSearch && matchCategory;
  });

  const toggleAgent = (id: string) => {
    setActivatedAgents(prev => {
      const next = new Set(prev);
      const activated = !next.has(id);
      if (activated) next.add(id);
      else next.delete(id);
      // Persist to backend
      client.entities.marketplace_agents.create({
        data: { agent_id: id, activated, toggled_at: new Date().toISOString() },
      }).catch(() => {});
      return next;
    });
  };

  return (
    <SaasLayout title="Agentes SaaS" subtitle="Configura agentes inteligentes para tu negocio — Cada uno adaptable a tu sector">
      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-br from-violet-500/[0.08] via-blue-500/[0.04] to-emerald-500/[0.08] border border-violet-500/10 p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-xl shadow-violet-500/20 shrink-0">
            <Bot className="w-7 h-7 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white mb-2">
              Agentes Inteligentes para Tu Negocio
            </h1>
            <p className="text-sm text-slate-400 leading-relaxed max-w-2xl mb-3">
              Cada agente se configura para tu tipo de negocio específico. Actívalos, personaliza su comportamiento
              y deja que trabajen por ti 24/7.
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 rounded-lg bg-violet-500/10 text-[11px] text-violet-300 border border-violet-500/20 font-medium">
                <Bot className="w-3 h-3 inline mr-1" /> {saasAgents.length} Agentes disponibles
              </span>
              <span className="px-3 py-1 rounded-lg bg-emerald-500/10 text-[11px] text-emerald-300 border border-emerald-500/20 font-medium">
                <Check className="w-3 h-3 inline mr-1" /> {activatedAgents.size} Activos
              </span>
              <span className="px-3 py-1 rounded-lg bg-blue-500/10 text-[11px] text-blue-300 border border-blue-500/20 font-medium">
                <Shield className="w-3 h-3 inline mr-1" /> White-label
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Search + Categories */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input
                placeholder="Buscar agentes..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-10 bg-[#0F1419] border-white/[0.06] text-white text-sm h-9"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setActiveCategory(null)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all border",
                  !activeCategory
                    ? "bg-violet-500/10 text-violet-300 border-violet-500/20"
                    : "text-slate-500 border-transparent hover:text-slate-300"
                )}
              >
                Todos
              </button>
              {saasAgentCategories.map(cat => (
                <button
                  key={cat.key}
                  onClick={() => setActiveCategory(activeCategory === cat.key ? null : cat.key)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all border",
                    activeCategory === cat.key
                      ? "bg-violet-500/10 text-violet-300 border-violet-500/20"
                      : "text-slate-500 border-transparent hover:text-slate-300"
                  )}
                >
                  <cat.icon className={cn("w-3 h-3", activeCategory === cat.key ? cat.color : "text-slate-600")} />
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Agents Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
            {filtered.map(agent => {
              const isActive = activatedAgents.has(agent.id);
              const isExpanded = expandedAgent === agent.id;
              const isConfiguring = configuring === agent.id;
              const AgentIcon = agent.icon;

              return (
                <div
                  key={agent.id}
                  className={cn(
                    "rounded-xl border overflow-hidden transition-all duration-300",
                    isActive
                      ? "bg-gradient-to-b from-violet-500/[0.06] to-transparent border-violet-500/20"
                      : "bg-[#0F1419] border-white/[0.06] hover:border-white/[0.1]"
                  )}
                >
                  <div className="p-5">
                    {/* Header */}
                    <div className="flex items-start gap-3 mb-3">
                      <div className={cn("w-11 h-11 rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0", agent.gradient)}>
                        <AgentIcon className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-white truncate">{agent.name}</h3>
                          {isActive && (
                            <div className="flex items-center gap-1">
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              <span className="text-[8px] text-emerald-400 font-bold">ACTIVO</span>
                            </div>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500">{agent.role}</p>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-400 leading-relaxed mb-3 line-clamp-2">{agent.description}</p>

                    {/* Metrics */}
                    <div className="grid grid-cols-4 gap-1.5 mb-3">
                      {agent.metrics.map(m => (
                        <div key={m.label} className="p-1.5 rounded-lg bg-white/[0.03] border border-white/[0.04] text-center">
                          <p className={cn("text-[10px] font-bold", m.color)}>{m.value}</p>
                          <p className="text-[7px] text-zinc-600">{m.label}</p>
                        </div>
                      ))}
                    </div>

                    {/* Use Cases */}
                    {isExpanded && (
                      <div className="mb-3 space-y-3">
                        <div>
                          <p className="text-[9px] text-slate-600 uppercase tracking-wider mb-1.5">Capacidades</p>
                          <div className="space-y-1">
                            {agent.capabilities.map(c => (
                              <div key={c} className="flex items-start gap-1.5">
                                <Check className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
                                <span className="text-[10px] text-slate-400">{c}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-[9px] text-slate-600 uppercase tracking-wider mb-1.5">Ejemplos por sector</p>
                          <div className="space-y-1">
                            {agent.useCases.map(uc => (
                              <div key={uc} className="flex items-start gap-1.5">
                                <Sparkles className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
                                <span className="text-[10px] text-slate-400">{uc}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Configurable options */}
                        {isConfiguring && (
                          <div>
                            <p className="text-[9px] text-slate-600 uppercase tracking-wider mb-1.5">Configuración para tu negocio</p>
                            <div className="space-y-1.5">
                              {agent.configurable.map(cfg => (
                                <div key={cfg} className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.03] border border-white/[0.04]">
                                  <Settings className="w-3 h-3 text-violet-400 shrink-0" />
                                  <span className="text-[10px] text-slate-300">{cfg}</span>
                                  <div className="ml-auto w-8 h-4 rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-end px-0.5">
                                    <div className="w-3 h-3 rounded-full bg-violet-400" />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => toggleAgent(agent.id)}
                        className={cn(
                          "flex-1 h-8 text-[10px] font-semibold rounded-lg transition-all",
                          isActive
                            ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/20"
                            : "bg-violet-600 hover:bg-violet-500 text-white"
                        )}
                      >
                        {isActive ? (
                          <><Check className="w-3 h-3 mr-1" /> Activado</>
                        ) : (
                          <><Zap className="w-3 h-3 mr-1" /> Activar</>
                        )}
                      </Button>
                      {isActive && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setConfiguring(configuring === agent.id ? null : agent.id)}
                          className="h-8 text-[10px] border-white/10 text-slate-400"
                        >
                          <Settings className="w-3 h-3" />
                        </Button>
                      )}
                      <button
                        onClick={() => setExpandedAgent(isExpanded ? null : agent.id)}
                        className="h-8 w-8 flex items-center justify-center rounded-lg border border-white/[0.06] text-slate-500 hover:text-slate-300 transition-colors"
                      >
                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom CTA */}
          <div className="rounded-xl bg-gradient-to-r from-violet-500/[0.06] to-amber-500/[0.06] border border-violet-500/10 p-6 text-center">
            <Crown className="w-8 h-8 text-amber-400 mx-auto mb-2" />
            <h3 className="text-lg font-bold text-white mb-1">Todos los agentes son 100% configurables</h3>
            <p className="text-[11px] text-slate-500 max-w-lg mx-auto mb-3">
              Cada agente se adapta a tu tipo de negocio: restaurante, clínica, inmobiliaria, e-commerce, SaaS, agencia...
              Configura el comportamiento, tono, idioma y reglas para que trabaje exactamente como necesitas.
            </p>
            <div className="flex flex-wrap justify-center gap-1.5">
              {["Restaurantes", "Clínicas", "Inmobiliarias", "E-commerce", "SaaS", "Agencias", "Consultoras", "Fitness", "Educación", "Retail"].map(s => (
                <span key={s} className="px-2 py-0.5 rounded bg-white/[0.04] text-[9px] text-slate-500">{s}</span>
              ))}
            </div>
          </div>
    </SaasLayout>
  );
}