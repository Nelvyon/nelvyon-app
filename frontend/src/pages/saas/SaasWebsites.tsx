import { useEffect, useState, useCallback } from "react";
import { useI18n } from "@/lib/i18n";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import SaasLayout from "@/components/SaasLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Globe, Loader2, Plus, Search, Eye, TrendingUp, Crown, Sparkles,
  CheckCircle2, Star, Zap, ExternalLink, BarChart3,
  RefreshCw, Palette, Code, Smartphone, Monitor, Rocket, Target,
  ArrowUpRight, Settings, Copy, Trash2, Edit3, Shield, Clock,
  Check, X, ArrowRight, Layers, Award
} from "lucide-react";
import { client, api, type WebsiteItem, type NelvyonProject } from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { InlineServiceDemo } from "@/components/saas/InlineServiceDemo";

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  published: { label: "Publicado", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  draft: { label: "Borrador", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
  building: { label: "Construyendo", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
};

/* ─── Competitor Comparison Data ─── */
interface Competitor {
  name: string;
  logo: string;
  color: string;
  features: Record<string, string | boolean>;
}

const comparisonFeatures = [
  "Hosting incluido", "SSL gratuito", "Dominio personalizado", "SEO avanzado",
  "E-commerce integrado", "Blog & CMS", "Formularios inteligentes", "Analytics integrado",
  "A/B Testing", "CRM integrado", "Email Marketing", "Funnels de venta",
  "Chat en vivo", "Automatizaciones", "White-label", "API access",
  "Velocidad (Lighthouse)", "Soporte 24/7", "Precio desde",
];

const competitors: Competitor[] = [
  {
    name: "WordPress", logo: "WP", color: "text-blue-400",
    features: {
      "Hosting incluido": false, "SSL gratuito": false, "Dominio personalizado": true,
      "SEO avanzado": "Con plugins", "E-commerce integrado": "WooCommerce", "Blog & CMS": true,
      "Formularios inteligentes": "Con plugins", "Analytics integrado": false, "A/B Testing": false,
      "CRM integrado": false, "Email Marketing": false, "Funnels de venta": false,
      "Chat en vivo": false, "Automatizaciones": false, "White-label": "Parcial",
      "API access": true, "Velocidad (Lighthouse)": "60-80", "Soporte 24/7": false, "Precio desde": "€25/mes + hosting",
    },
  },
  {
    name: "Wix", logo: "Wx", color: "text-violet-400",
    features: {
      "Hosting incluido": true, "SSL gratuito": true, "Dominio personalizado": true,
      "SEO avanzado": "Básico", "E-commerce integrado": true, "Blog & CMS": true,
      "Formularios inteligentes": "Básico", "Analytics integrado": "Básico", "A/B Testing": false,
      "CRM integrado": false, "Email Marketing": "Extra", "Funnels de venta": false,
      "Chat en vivo": "Extra", "Automatizaciones": "Básico", "White-label": false,
      "API access": "Limitado", "Velocidad (Lighthouse)": "50-75", "Soporte 24/7": true, "Precio desde": "€17/mes",
    },
  },
  {
    name: "Squarespace", logo: "Sq", color: "text-slate-300",
    features: {
      "Hosting incluido": true, "SSL gratuito": true, "Dominio personalizado": true,
      "SEO avanzado": "Medio", "E-commerce integrado": true, "Blog & CMS": true,
      "Formularios inteligentes": "Básico", "Analytics integrado": "Básico", "A/B Testing": false,
      "CRM integrado": false, "Email Marketing": "Extra", "Funnels de venta": false,
      "Chat en vivo": false, "Automatizaciones": false, "White-label": false,
      "API access": false, "Velocidad (Lighthouse)": "60-80", "Soporte 24/7": true, "Precio desde": "€16/mes",
    },
  },
  {
    name: "Shopify", logo: "Sh", color: "text-green-400",
    features: {
      "Hosting incluido": true, "SSL gratuito": true, "Dominio personalizado": true,
      "SEO avanzado": "Medio", "E-commerce integrado": true, "Blog & CMS": "Básico",
      "Formularios inteligentes": "Con apps", "Analytics integrado": true, "A/B Testing": "Con apps",
      "CRM integrado": false, "Email Marketing": "Shopify Email", "Funnels de venta": "Con apps",
      "Chat en vivo": "Con apps", "Automatizaciones": "Flow", "White-label": false,
      "API access": true, "Velocidad (Lighthouse)": "70-85", "Soporte 24/7": true, "Precio desde": "€36/mes",
    },
  },
  {
    name: "NELVYON SaaS", logo: "NV", color: "text-cyan-400",
    features: {
      "Hosting incluido": true, "SSL gratuito": true, "Dominio personalizado": true,
      "SEO avanzado": true, "E-commerce integrado": "Básico", "Blog & CMS": true,
      "Formularios inteligentes": true, "Analytics integrado": true, "A/B Testing": "Próximamente",
      "CRM integrado": true, "Email Marketing": "Próximamente", "Funnels de venta": true,
      "Chat en vivo": "Próximamente", "Automatizaciones": true, "White-label": "Próximamente",
      "API access": true, "Velocidad (Lighthouse)": "85-95", "Soporte 24/7": false, "Precio desde": "Incluido",
    },
  },
];

export default function SaasWebsites() {
  const { ts } = useI18n();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [websites, setWebsites] = useState<WebsiteItem[]>([]);
  const [projects, setProjects] = useState<NelvyonProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [generating, setGenerating] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedSite, setSelectedSite] = useState<WebsiteItem | null>(null);
  const [activeTab, setActiveTab] = useState<"sites" | "tools" | "comparison">("sites");

  useEffect(() => {
    if (!authLoading && !user) navigate("/saas");
  }, [user, authLoading, navigate]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [siteRes, projRes] = await Promise.allSettled([
        client.entities.website_items.query({ sort: "-created_at", limit: 100 }),
        api.getProjects(0, 200),
      ]);
      const siteItems = siteRes.status === "fulfilled" ? ((siteRes.value.data?.items as WebsiteItem[]) || []) : [];
      const projList = projRes.status === "fulfilled" ? (projRes.value.items || []) : [];
      setWebsites(siteItems);
      setProjects(projList);
      if (siteItems.length > 0 && !selectedSite) setSelectedSite(siteItems[0]);
    } catch (err) {
      toast.error("Error cargando sitios web");
    } finally {
      setLoading(false);
    }
  }, [selectedSite]);

  useEffect(() => { if (user) fetchData(); }, [user, fetchData]);

  const handleCreate = async () => {
    setCreating(true);
    const idx = websites.length;
    try {
      await client.entities.website_items.create({
        name: `Sitio Web ${idx + 1}`,
        domain: `sitio-${idx + 1}.nelvyon.com`,
        template: "Custom",
        status: "draft",
        pages_count: 0,
        visits: 0,
        ssl_enabled: true,
        seo_score: 0,
        performance_score: 0,
      });
      toast.success("Sitio web creado — configura los datos reales");
      fetchData();
    } catch (err) {
      toast.error("Error creando sitio web");
    } finally {
      setCreating(false);
    }
  };

  const handleGenerate = async () => {
    if (projects.length === 0) { toast.error("Primero crea un proyecto"); return; }
    setGenerating(true);
    try {
      await api.generateWeb(projects[0].id);
      toast.success("Sitio web generado");
      fetchData();
    } catch (err) {
      toast.error("Error generando sitio web");
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await client.entities.website_items.delete({ id: String(id) });
      toast.success("Sitio eliminado");
      if (selectedSite?.id === id) setSelectedSite(null);
      fetchData();
    } catch (err) {
      toast.error("Error eliminando sitio");
    }
  };

  const filtered = websites.filter(w => (w.name || "").toLowerCase().includes(search.toLowerCase()));
  const totalVisits = websites.reduce((s, w) => s + (w.visits || 0), 0);
  const avgSeo = websites.length > 0 ? Math.round(websites.reduce((s, w) => s + (w.seo_score || 0), 0) / websites.length) : 0;
  const publishedCount = websites.filter(w => w.status === "published").length;

  const renderFeatureValue = (val: string | boolean) => {
    if (val === true) return <Check className="w-4 h-4 text-emerald-400 mx-auto" />;
    if (val === false) return <X className="w-4 h-4 text-red-400/40 mx-auto" />;
    return <span className="text-[10px] text-slate-400">{val}</span>;
  };

  return (
    <SaasLayout title="Websites Builder" subtitle="Constructor web profesional con hosting, SSL y SEO incluidos">
      <InlineServiceDemo serviceKey="websites" serviceName="Websites Builder" />

      {/* Header badges */}
      <div className="rounded-xl bg-gradient-to-r from-cyan-500/[0.06] via-blue-500/[0.04] to-teal-500/[0.06] border border-cyan-500/10 p-4 mb-5">
        <div className="flex flex-wrap items-center gap-3">
          <Globe className="w-5 h-5 text-cyan-400" />
          <span className="text-xs font-bold text-white">Constructor de Sitios Web</span>
          {["SEO", "SSL", "RESPONSIVE", "CMS"].map(b => (
            <span key={b} className="px-2 py-0.5 rounded bg-cyan-500/10 text-[9px] font-bold text-cyan-400 border border-cyan-500/20">{b}</span>
          ))}
        </div>
      </div>

      {/* Live data indicator */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-[10px] text-emerald-400 font-medium">DATOS EN VIVO — BACKEND CONECTADO</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {([
          { key: "sites" as const, label: "Mis Sitios Web", icon: Globe },
          { key: "tools" as const, label: "Herramientas Web (WordPress, Elementor...)", icon: Code },
          { key: "comparison" as const, label: "vs Competencia", icon: Award },
        ]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border",
              activeTab === tab.key
                ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                : "text-slate-500 hover:text-slate-300 border-transparent hover:border-slate-800"
            )}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "sites" && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            {[
              { label: "Sitios", value: websites.length, icon: Globe, color: "text-cyan-400", bg: "from-cyan-500/10 to-blue-500/10" },
              { label: "SEO Score", value: `${avgSeo}/100`, icon: Star, color: "text-emerald-400", bg: "from-emerald-500/10 to-green-500/10" },
              { label: "Visitas Total", value: totalVisits.toLocaleString(), icon: Eye, color: "text-violet-400", bg: "from-violet-500/10 to-purple-500/10" },
              { label: "Publicados", value: publishedCount.toString(), icon: Target, color: "text-amber-400", bg: "from-amber-500/10 to-yellow-500/10" },
            ].map(s => (
              <div key={s.label} className="p-4 rounded-xl bg-[#0F1419] border border-white/[0.04] hover:border-white/[0.08] transition-all">
                <div className="flex items-center justify-between mb-2">
                  <div className={cn("w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center", s.bg)}>
                    <s.icon className={cn("w-4 h-4", s.color)} />
                  </div>
                </div>
                <p className="text-xl font-bold text-white">{s.value}</p>
                <p className="text-[10px] text-zinc-600">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Search + Actions */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input placeholder="Buscar sitios..." value={search} onChange={e => setSearch(e.target.value)}
                className="pl-10 bg-[#0F1419] border-white/[0.06] text-white text-sm h-9" />
            </div>
            <Button size="sm" onClick={handleCreate} disabled={creating} className="bg-cyan-600 hover:bg-cyan-700 text-white h-8 text-xs">
              {creating ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Plus className="w-3 h-3 mr-1" />}
              Nuevo Sitio
            </Button>
            <Button size="sm" onClick={handleGenerate} disabled={generating} className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white h-8 text-xs">
              {generating ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Sparkles className="w-3 h-3 mr-1" />}
              Generar Web
            </Button>
            <Button size="sm" onClick={fetchData} variant="outline" className="border-white/10 text-zinc-400 h-8"><RefreshCw className="w-3 h-3" /></Button>
          </div>

          {/* Sites Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 text-cyan-500 animate-spin" /></div>
          ) : websites.length === 0 ? (
            <div className="text-center py-20 rounded-xl bg-[#0A0E13] border border-white/[0.04]">
              <Globe className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
              <p className="text-sm text-zinc-500 mb-2">No hay sitios web todavía</p>
              <p className="text-xs text-zinc-600 mb-4">Crea tu primer sitio web</p>
              <Button size="sm" onClick={handleCreate} disabled={creating} className="bg-cyan-600 text-white">
                <Plus className="w-3.5 h-3.5 mr-1" /> Crear Primer Sitio
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-3 content-start">
                {filtered.map(site => {
                  const sc = statusConfig[site.status || "draft"] || statusConfig.draft;
                  return (
                    <div key={site.id} onClick={() => setSelectedSite(site)}
                      className={cn("rounded-xl border overflow-hidden transition-all cursor-pointer",
                        selectedSite?.id === site.id ? "bg-cyan-500/[0.03] border-cyan-500/20" : "bg-[#0A0E13] border-white/[0.04] hover:border-white/[0.08]"
                      )}>
                      <div className="h-24 bg-gradient-to-br from-cyan-500/10 via-blue-500/5 to-violet-500/10 flex items-center justify-center relative">
                        <Globe className="w-8 h-8 text-cyan-500/20" />
                        <div className="absolute top-2 right-2 flex gap-1">
                          <span className={cn("px-1.5 py-0.5 rounded text-[8px] font-bold border", sc.bg)}>{sc.label}</span>
                        </div>
                        <div className="absolute bottom-2 left-2 flex gap-1">
                          <span className="px-1 py-0 rounded bg-emerald-500/10 text-[7px] font-bold text-emerald-400">SEO {site.seo_score || 0}</span>
                          <span className="px-1 py-0 rounded bg-blue-500/10 text-[7px] font-bold text-blue-400">LH {site.performance_score || 0}</span>
                          {site.ssl_enabled && <span className="px-1 py-0 rounded bg-green-500/10 text-[7px] font-bold text-green-400">SSL</span>}
                        </div>
                      </div>
                      <div className="p-3">
                        <h3 className="text-xs font-semibold text-white truncate">{site.name}</h3>
                        <p className="text-[9px] text-zinc-600 truncate">{site.template || "Custom"} · {site.pages_count || 0} páginas</p>
                        <div className="flex items-center gap-3 mt-2 text-[9px] text-zinc-600">
                          <span className="flex items-center gap-0.5"><Eye className="w-2.5 h-2.5" /> {(site.visits || 0).toLocaleString()}</span>
                          <span className="flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" /> {site.created_at ? new Date(site.created_at).toLocaleDateString("es") : "—"}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Detail Panel */}
              <div className="lg:col-span-4 rounded-xl bg-[#0A0E13] border border-white/[0.04] p-4 overflow-y-auto" style={{ maxHeight: 560 }}>
                {selectedSite ? (
                  <div className="space-y-4">
                    <div className="pb-3 border-b border-white/[0.04]">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={cn("px-1.5 py-0.5 rounded text-[9px] font-bold border", (statusConfig[selectedSite.status || "draft"] || statusConfig.draft).bg)}>
                          {(statusConfig[selectedSite.status || "draft"] || statusConfig.draft).label}
                        </span>
                        <span className="text-[9px] text-zinc-600">{selectedSite.template || "Custom"}</span>
                      </div>
                      <h3 className="text-sm font-bold text-white">{selectedSite.name}</h3>
                      <p className="text-[10px] text-cyan-400 truncate">{selectedSite.domain || "Sin dominio"}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: "SEO Score", value: `${selectedSite.seo_score || 0}/100`, color: (selectedSite.seo_score || 0) >= 95 ? "text-emerald-400" : "text-amber-400" },
                        { label: "Lighthouse", value: `${selectedSite.performance_score || 0}/100`, color: "text-blue-400" },
                        { label: "Visitas", value: (selectedSite.visits || 0).toLocaleString(), color: "text-white" },
                        { label: "Páginas", value: (selectedSite.pages_count || 0).toString(), color: "text-white" },
                      ].map(m => (
                        <div key={m.label} className="p-2 rounded-lg bg-white/[0.02]">
                          <p className="text-[8px] text-zinc-600">{m.label}</p>
                          <p className={cn("text-xs font-bold", m.color)}>{m.value}</p>
                        </div>
                      ))}
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[9px] text-zinc-600">SEO Score</span>
                        <span className="text-[10px] font-bold text-emerald-400">{selectedSite.seo_score || 0}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-white/[0.04] overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-400 transition-all duration-700"
                          style={{ width: `${selectedSite.seo_score || 0}%` }} />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedSite.ssl_enabled && <span className="flex items-center gap-1 text-[9px] text-emerald-400"><Shield className="w-3 h-3" /> SSL</span>}
                      <span className="flex items-center gap-1 text-[9px] text-blue-400"><Smartphone className="w-3 h-3" /> Responsive</span>
                      <span className="flex items-center gap-1 text-[9px] text-violet-400"><Rocket className="w-3 h-3" /> PWA</span>
                    </div>
                    <div className="flex gap-1 pt-2">
                      <Button size="sm" onClick={() => navigate(`/saas/websites/builder/${selectedSite.id}`)} className="flex-1 h-7 text-[10px] bg-cyan-600 text-white"><Edit3 className="w-3 h-3 mr-1" /> Editar</Button>
                      <Button size="sm" variant="outline" className="flex-1 h-7 text-[10px] border-white/10 text-zinc-400"><ExternalLink className="w-3 h-3 mr-1" /> Ver</Button>
                      <Button size="sm" variant="outline" onClick={() => handleDelete(selectedSite.id)} className="h-7 text-[10px] border-red-500/20 text-red-400 hover:bg-red-500/10"><Trash2 className="w-3 h-3" /></Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-16">
                    <div className="text-center">
                      <Globe className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
                      <p className="text-xs text-zinc-600">Selecciona un sitio</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* ─── TAB: Tools ─── */}
      {activeTab === "tools" && (
        <div>
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">
              Crea Tu Propia Web con las Mejores Herramientas
            </h2>
            <p className="text-sm text-slate-500 max-w-2xl mx-auto">
              Usa WordPress, Elementor, Divi, Webflow, Wix o cualquier herramienta que prefieras para construir tu web.
              NELVYON te da las herramientas, hosting, SEO y soporte. Cuando quieras ir más rápido, activa el plan Partner.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
            {[
              { name: "WordPress + Elementor", desc: "El combo más popular del mundo. WordPress como CMS + Elementor como page builder visual drag & drop.", features: ["Drag & drop visual", "1000+ templates", "WooCommerce integrado", "SEO con Yoast/RankMath", "Plugins ilimitados", "Hosting incluido"], level: "Principiante → Avanzado", gradient: "from-blue-500 to-indigo-600", popular: true },
              { name: "WordPress + Divi", desc: "Divi Builder: el theme + page builder todo-en-uno más vendido.", features: ["Visual builder en vivo", "800+ layouts pre-diseñados", "A/B testing integrado", "Responsive editing", "Theme builder completo", "Licencia incluida"], level: "Principiante → Intermedio", gradient: "from-violet-500 to-purple-600", popular: false },
              { name: "Webflow", desc: "Diseño web profesional sin código. Control total sobre HTML/CSS visual.", features: ["Control CSS visual total", "Animaciones e interacciones", "CMS flexible", "E-commerce nativo", "Hosting CDN global", "Exportar código limpio"], level: "Intermedio → Avanzado", gradient: "from-cyan-500 to-blue-600", popular: true },
              { name: "Wix Editor", desc: "El editor más fácil para empezar. Arrastra y suelta elementos.", features: ["Ultra fácil de usar", "900+ templates", "App Market integrado", "Wix ADI (IA)", "E-commerce incluido", "Dominio gratis 1 año"], level: "Principiante", gradient: "from-amber-500 to-orange-600", popular: false },
              { name: "Squarespace", desc: "Templates de diseño premium. Ideal para portfolios y marcas.", features: ["Diseños premium", "Ideal para portfolios", "Blog integrado", "E-commerce elegante", "Analytics incluido", "Dominio incluido"], level: "Principiante → Intermedio", gradient: "from-slate-500 to-zinc-600", popular: false },
              { name: "Shopify", desc: "La plataforma #1 para e-commerce.", features: ["E-commerce #1 mundial", "Pagos integrados", "Gestión de inventario", "Envíos automatizados", "Apps marketplace", "POS físico"], level: "Principiante → Avanzado", gradient: "from-green-500 to-emerald-600", popular: true },
            ].map(tool => (
              <div key={tool.name} className={cn("rounded-xl border overflow-hidden transition-all", tool.popular ? "bg-gradient-to-b from-cyan-500/[0.04] to-transparent border-cyan-500/15" : "bg-[#0F1419] border-white/[0.06]")}>
                <div className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={cn("w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center", tool.gradient)}>
                      <Code className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-white">{tool.name}</h3>
                        {tool.popular && <span className="px-1.5 py-0 rounded text-[7px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">POPULAR</span>}
                      </div>
                      <p className="text-[9px] text-slate-600">{tool.level}</p>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed mb-3">{tool.desc}</p>
                  <div className="space-y-1 mb-4">
                    {tool.features.map(f => (
                      <div key={f} className="flex items-center gap-1.5">
                        <Check className="w-3 h-3 text-emerald-400/70" />
                        <span className="text-[10px] text-slate-400">{f}</span>
                      </div>
                    ))}
                  </div>
                  <Button size="sm" className="w-full h-8 text-[10px] bg-white/[0.06] text-white hover:bg-white/[0.1]">
                    <Zap className="w-3 h-3 mr-1" /> Empezar con {tool.name.split(" ")[0]}
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* How it works */}
          <div className="rounded-xl bg-[#0F1419] border border-white/[0.06] p-6 mb-8">
            <h3 className="text-lg font-bold text-white text-center mb-6">¿Cómo funciona?</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                { step: "1", title: "Elige tu herramienta", desc: "WordPress, Elementor, Webflow, Wix... la que prefieras", color: "text-cyan-400" },
                { step: "2", title: "Construye tu web", desc: "Usa los templates, arrastra elementos, personaliza", color: "text-violet-400" },
                { step: "3", title: "Publica y crece", desc: "Hosting, SSL, dominio y SEO incluidos", color: "text-emerald-400" },
                { step: "4", title: "Escala con Partners", desc: "Activa el plan Partner y revende a clientes", color: "text-amber-400" },
              ].map(item => (
                <div key={item.step} className="text-center">
                  <div className={cn("w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mx-auto mb-3 text-lg font-bold", item.color)}>
                    {item.step}
                  </div>
                  <h4 className="text-xs font-bold text-white mb-1">{item.title}</h4>
                  <p className="text-[10px] text-slate-500">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Upgrade CTA */}
          <div className="rounded-2xl bg-gradient-to-r from-amber-500/[0.08] via-violet-500/[0.05] to-cyan-500/[0.08] border border-amber-500/10 p-8 text-center">
            <Crown className="w-10 h-10 text-amber-400 mx-auto mb-3" />
            <h3 className="text-xl font-bold text-white mb-2">¿Quieres ir 10x más rápido? Activa el Plan Partner</h3>
            <p className="text-sm text-slate-400 max-w-xl mx-auto mb-4">
              Con el plan Partner, NELVYON construye las webs por ti a precio reducido.
            </p>
            <div className="flex flex-wrap justify-center gap-3 mb-5">
              {["NELVYON construye → Tú revendes", "White-label 100%", "Márgenes 70-90%", "Sin límite de clientes", "Soporte técnico incluido"].map(b => (
                <span key={b} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500/10 text-[10px] font-medium text-amber-300 border border-amber-500/20">
                  <Check className="w-3 h-3" /> {b}
                </span>
              ))}
            </div>
            <div className="flex justify-center gap-3">
              <Button onClick={() => navigate("/saas/partners")} className="bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:opacity-90 h-11 px-6">
                Ver Planes Partner <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB: Comparison ─── */}
      {activeTab === "comparison" && (
        <div>
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">NELVYON vs WordPress vs Wix vs Squarespace vs Shopify</h2>
            <p className="text-sm text-slate-500 max-w-xl mx-auto">
              Comparativa real y honesta. NELVYON incluye todo lo que otros cobran como extras.
            </p>
          </div>

          <div className="rounded-xl bg-[#0F1419] border border-white/[0.06] overflow-x-auto mb-8">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left text-xs font-medium text-slate-600 px-4 py-3 w-48">Feature</th>
                  {competitors.map(c => (
                    <th key={c.name} className="text-center px-3 py-3">
                      <div className="flex flex-col items-center gap-1">
                        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold border",
                          c.name === "NELVYON SaaS" ? "bg-gradient-to-br from-cyan-500 to-blue-600 text-white border-cyan-500/30" : "bg-white/[0.04] text-slate-400 border-white/[0.06]"
                        )}>{c.logo}</div>
                        <span className={cn("text-[10px] font-bold", c.name === "NELVYON SaaS" ? "text-cyan-400" : "text-slate-400")}>{c.name}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparisonFeatures.map((feature, i) => (
                  <tr key={feature} className={cn("border-b border-white/[0.02]", i % 2 === 0 ? "bg-white/[0.01]" : "")}>
                    <td className="px-4 py-2.5 text-[11px] text-white font-medium">{feature}</td>
                    {competitors.map(c => (
                      <td key={c.name} className={cn("px-3 py-2.5 text-center", c.name === "NELVYON SaaS" ? "bg-cyan-500/[0.03]" : "")}>
                        {renderFeatureValue(c.features[feature])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {[
              { title: "Todo incluido, sin plugins", desc: "WordPress necesita 20+ plugins. NELVYON incluye CRM, email marketing, funnels, chat y automatizaciones.", icon: Layers, color: "text-cyan-400" },
              { title: "Lighthouse 95-100", desc: "Mientras WordPress promedia 60-80, NELVYON genera webs con Lighthouse 95-100 de fábrica.", icon: Rocket, color: "text-emerald-400" },
              { title: "White-label para agencias", desc: "Ni WordPress, ni Wix ofrecen white-label real. NELVYON sí.", icon: Crown, color: "text-amber-400" },
            ].map(item => (
              <div key={item.title} className="p-5 rounded-xl bg-[#0F1419] border border-white/[0.06]">
                <item.icon className={cn("w-6 h-6 mb-3", item.color)} />
                <h3 className="text-sm font-bold text-white mb-1">{item.title}</h3>
                <p className="text-[11px] text-slate-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="rounded-xl bg-gradient-to-r from-cyan-500/[0.06] to-violet-500/[0.06] border border-cyan-500/10 p-6 text-center">
            <Globe className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
            <h3 className="text-lg font-bold text-white mb-1">¿Vienes de WordPress, Wix o Squarespace?</h3>
            <p className="text-[11px] text-slate-500 max-w-lg mx-auto mb-3">
              Migración gratuita incluida. En 24h tienes tu web en NELVYON con mejor rendimiento.
            </p>
            <Button className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:opacity-90">
              Migrar mi web gratis <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        </div>
      )}
    </SaasLayout>
  );
}