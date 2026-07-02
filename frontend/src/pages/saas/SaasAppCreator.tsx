import { useState, useCallback } from "react";
import {
  Smartphone, Globe, Layout, Rocket, Plus, ChevronRight, ChevronLeft,
  Check, X, FileText, Palette, Code2, Send, Eye, Edit3, Zap, Clock,
  Users, Star, Download, Settings, Layers, Monitor, Briefcase, Store,
  BarChart3, MessageSquare, Shield, Image, Type, Wand2, ArrowRight,
  CheckCircle2, Circle, Loader2, ExternalLink, Copy, RefreshCw
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

/* ─────────────────────────── TYPES ─────────────────────────── */
type AppType = "landing" | "business" | "internal" | "mini-app";
type AppStatus = "briefing" | "generating" | "editing" | "review" | "delivered";

interface AppProject {
  id: string;
  name: string;
  type: AppType;
  status: AppStatus;
  created: string;
  updated: string;
  description: string;
  features: string[];
  colorScheme: string;
  progress: number;
  previewUrl?: string;
  client?: string;
}

interface AppTemplate {
  id: string;
  name: string;
  type: AppType;
  description: string;
  features: string[];
  popularity: number;
  image: string;
}

/* ─────────────────────────── TEMPLATE CATALOG ─────────────────────────── */
const APP_TEMPLATES: AppTemplate[] = [
  { id: "t1", name: "Landing SaaS Pro", type: "landing", description: "Landing page moderna para productos SaaS con hero, features, pricing y CTA", features: ["Hero animado", "Pricing table", "Testimonios", "CTA flotante"], popularity: 94, image: "🚀" },
  { id: "t2", name: "E-Commerce Starter", type: "business", description: "Tienda online completa con catálogo, carrito y checkout", features: ["Catálogo productos", "Carrito", "Checkout", "Filtros"], popularity: 89, image: "🛒" },
  { id: "t3", name: "Panel Admin", type: "internal", description: "Dashboard interno con métricas, tablas y gestión de datos", features: ["Dashboard KPIs", "CRUD tablas", "Gráficos", "Roles"], popularity: 87, image: "📊" },
  { id: "t4", name: "Reservas & Citas", type: "mini-app", description: "Mini-app para reservas, citas y calendario integrado", features: ["Calendario", "Reservas", "Notificaciones", "Pagos"], popularity: 82, image: "📅" },
  { id: "t5", name: "Portfolio Creativo", type: "landing", description: "Portfolio profesional con galería, about y contacto", features: ["Galería masonry", "About me", "Contacto", "Animaciones"], popularity: 78, image: "🎨" },
  { id: "t6", name: "CRM Ligero", type: "business", description: "CRM simplificado para gestión de contactos y deals", features: ["Contactos", "Pipeline", "Actividades", "Reportes"], popularity: 85, image: "👥" },
  { id: "t7", name: "Encuestas & Forms", type: "mini-app", description: "Creador de encuestas con lógica condicional y analytics", features: ["Builder drag&drop", "Lógica", "Analytics", "Exportar"], popularity: 76, image: "📝" },
  { id: "t8", name: "Intranet Empresa", type: "internal", description: "Portal interno con noticias, directorio y documentos", features: ["Noticias", "Directorio", "Docs", "Chat"], popularity: 73, image: "🏢" },
];

const TYPE_CONFIG: Record<AppType, { label: string; icon: typeof Smartphone; color: string; bgColor: string }> = {
  landing: { label: "Landing Page", icon: Globe, color: "text-purple-400", bgColor: "bg-purple-600/20" },
  business: { label: "App de Negocio", icon: Briefcase, color: "text-blue-400", bgColor: "bg-blue-600/20" },
  internal: { label: "Panel Interno", icon: Monitor, color: "text-emerald-400", bgColor: "bg-emerald-600/20" },
  "mini-app": { label: "Mini-App", icon: Smartphone, color: "text-amber-400", bgColor: "bg-amber-600/20" },
};

const STATUS_CONFIG: Record<AppStatus, { label: string; color: string; icon: typeof Circle }> = {
  briefing: { label: "Briefing", color: "text-zinc-400 border-zinc-600", icon: FileText },
  generating: { label: "Generando", color: "text-blue-400 border-blue-600", icon: Loader2 },
  editing: { label: "Editando", color: "text-amber-400 border-amber-600", icon: Edit3 },
  review: { label: "Revisión", color: "text-purple-400 border-purple-600", icon: Eye },
  delivered: { label: "Entregado", color: "text-emerald-400 border-emerald-600", icon: CheckCircle2 },
};

/* ─────────────────────────── WIZARD STEPS ─────────────────────────── */
const WIZARD_STEPS = ["Tipo", "Briefing", "Diseño", "Features", "Generar"];

/* ─────────────────────────── MAIN COMPONENT ─────────────────────────── */
export default function SaasAppCreator() {
  const [activeTab, setActiveTab] = useState("projects");
  const [projects, setProjects] = useState<AppProject[]>([]);
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [selectedProject, setSelectedProject] = useState<AppProject | null>(null);

  // Wizard state
  const [wType, setWType] = useState<AppType>("landing");
  const [wName, setWName] = useState("");
  const [wDesc, setWDesc] = useState("");
  const [wClient, setWClient] = useState("");
  const [wColor, setWColor] = useState("#6c3ce0");
  const [wFont, setWFont] = useState("modern");
  const [wStyle, setWStyle] = useState("minimal");
  const [wFeatures, setWFeatures] = useState<string[]>([]);
  const [wCustomFeature, setWCustomFeature] = useState("");
  const [generating, setGenerating] = useState(false);

  const featureOptions: Record<AppType, string[]> = {
    landing: ["Hero animado", "Pricing table", "Testimonios", "FAQ", "Blog", "CTA flotante", "Video embed", "Formulario contacto"],
    business: ["Catálogo", "Carrito", "Checkout/Pagos", "Dashboard", "Filtros avanzados", "Notificaciones", "Multi-idioma", "SEO"],
    internal: ["Dashboard KPIs", "Tablas CRUD", "Gráficos", "Roles/Permisos", "Logs", "Exportar datos", "Búsqueda global", "Notificaciones"],
    "mini-app": ["Calendario", "Reservas", "Pagos", "Notificaciones push", "Geolocalización", "Chat", "Valoraciones", "QR integrado"],
  };

  const toggleFeature = (f: string) => {
    setWFeatures(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]);
  };

  const addCustomFeature = () => {
    if (wCustomFeature.trim() && !wFeatures.includes(wCustomFeature.trim())) {
      setWFeatures(prev => [...prev, wCustomFeature.trim()]);
      setWCustomFeature("");
    }
  };

  const handleGenerate = useCallback(() => {
    if (!wName.trim()) { toast.error("Nombre es obligatorio"); return; }
    setGenerating(true);
    setTimeout(() => {
      const project: AppProject = {
        id: `p-${Date.now()}`,
        name: wName,
        type: wType,
        status: "generating",
        created: new Date().toISOString().split("T")[0],
        updated: new Date().toISOString().split("T")[0],
        description: wDesc,
        features: wFeatures,
        colorScheme: wColor,
        progress: 15,
        client: wClient || undefined,
      };
      setProjects(prev => [project, ...prev]);
      setGenerating(false);
      setShowWizard(false);
      setWizardStep(0);
      setWName(""); setWDesc(""); setWClient(""); setWFeatures([]);
      toast.success(`Proyecto "${project.name}" creado — generación en progreso`);

      // Simulate progress
      let prog = 15;
      const interval = setInterval(() => {
        prog += Math.floor(Math.random() * 15) + 5;
        if (prog >= 100) {
          prog = 100;
          clearInterval(interval);
          setProjects(prev => prev.map(p => p.id === project.id ? { ...p, progress: 100, status: "editing", updated: new Date().toISOString().split("T")[0] } : p));
          toast.success(`"${project.name}" generado — listo para editar`);
        } else {
          setProjects(prev => prev.map(p => p.id === project.id ? { ...p, progress: prog } : p));
        }
      }, 2000);
    }, 1500);
  }, [wName, wType, wDesc, wClient, wColor, wFeatures]);

  const handleStatusChange = useCallback((id: string, newStatus: AppStatus) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, status: newStatus, updated: new Date().toISOString().split("T")[0] } : p));
    toast.success(`Estado actualizado a: ${STATUS_CONFIG[newStatus].label}`);
  }, []);

  const stats = {
    total: projects.length,
    active: projects.filter(p => p.status !== "delivered").length,
    delivered: projects.filter(p => p.status === "delivered").length,
    generating: projects.filter(p => p.status === "generating").length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0f] via-[#0d0d18] to-[#0a0a12] text-white p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl">
              <Smartphone className="w-6 h-6" />
            </div>
            App Creator Studio
          </h1>
          <p className="text-zinc-400 text-sm mt-1">Crea aplicaciones web profesionales con flujo guiado: briefing → generación → edición → entrega</p>
        </div>
        <Button className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500" onClick={() => { setShowWizard(true); setWizardStep(0); }}>
          <Plus className="w-4 h-4 mr-1.5" /> Nueva App
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Proyectos", value: stats.total, icon: Layers, color: "from-blue-600 to-blue-800" },
          { label: "En Progreso", value: stats.active, icon: Loader2, color: "from-amber-600 to-amber-800" },
          { label: "Entregados", value: stats.delivered, icon: CheckCircle2, color: "from-emerald-600 to-emerald-800" },
          { label: "Generando", value: stats.generating, icon: Zap, color: "from-purple-600 to-purple-800" },
        ].map(s => (
          <Card key={s.label} className="bg-zinc-900/60 border-zinc-800/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-gradient-to-br ${s.color}`}>
                <s.icon className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-xl font-bold">{s.value}</p>
                <p className="text-[11px] text-zinc-500">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-zinc-900/80 border border-zinc-800/50">
          <TabsTrigger value="projects">Mis Proyectos</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
        </TabsList>

        {/* ── PROJECTS TAB ── */}
        <TabsContent value="projects" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.map(p => {
              const typeConf = TYPE_CONFIG[p.type];
              const statusConf = STATUS_CONFIG[p.status];
              const StatusIcon = statusConf.icon;
              return (
                <Card key={p.id} className="bg-zinc-900/60 border-zinc-800/50 hover:border-blue-600/30 transition-all group">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${typeConf.bgColor}`}>
                          <typeConf.icon className={`w-5 h-5 ${typeConf.color}`} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm">{p.name}</h3>
                          <p className="text-[11px] text-zinc-500">{typeConf.label} {p.client && `· ${p.client}`}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className={`text-[10px] ${statusConf.color}`}>
                        <StatusIcon className={`w-3 h-3 mr-1 ${p.status === "generating" ? "animate-spin" : ""}`} />
                        {statusConf.label}
                      </Badge>
                    </div>

                    <p className="text-xs text-zinc-400 mb-3 line-clamp-2">{p.description}</p>

                    {/* Progress */}
                    <div className="mb-3">
                      <div className="flex justify-between text-[10px] text-zinc-500 mb-1">
                        <span>Progreso</span>
                        <span>{p.progress}%</span>
                      </div>
                      <div className="w-full bg-zinc-800 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full transition-all duration-500 ${p.progress === 100 ? "bg-emerald-500" : "bg-gradient-to-r from-blue-600 to-cyan-500"}`}
                          style={{ width: `${p.progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Features */}
                    <div className="flex flex-wrap gap-1 mb-3">
                      {p.features.slice(0, 4).map(f => (
                        <Badge key={f} variant="outline" className="text-[9px] border-zinc-700 text-zinc-400">{f}</Badge>
                      ))}
                      {p.features.length > 4 && <Badge variant="outline" className="text-[9px] border-zinc-700 text-zinc-500">+{p.features.length - 4}</Badge>}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-1.5">
                      {p.status === "generating" && (
                        <Button size="sm" variant="outline" className="flex-1 h-7 text-[11px] border-zinc-700" disabled>
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" /> Generando...
                        </Button>
                      )}
                      {p.status === "editing" && (
                        <>
                          <Button size="sm" variant="outline" className="flex-1 h-7 text-[11px] border-zinc-700" onClick={() => setSelectedProject(p)}>
                            <Edit3 className="w-3 h-3 mr-1" /> Editar
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 text-[11px] border-zinc-700" onClick={() => handleStatusChange(p.id, "review")}>
                            <Eye className="w-3 h-3 mr-1" /> Enviar a Revisión
                          </Button>
                        </>
                      )}
                      {p.status === "review" && (
                        <>
                          <Button size="sm" variant="outline" className="flex-1 h-7 text-[11px] border-zinc-700" onClick={() => setSelectedProject(p)}>
                            <Eye className="w-3 h-3 mr-1" /> Preview
                          </Button>
                          <Button size="sm" className="h-7 text-[11px] bg-emerald-600 hover:bg-emerald-500" onClick={() => handleStatusChange(p.id, "delivered")}>
                            <Send className="w-3 h-3 mr-1" /> Entregar
                          </Button>
                        </>
                      )}
                      {p.status === "delivered" && (
                        <>
                          <Button size="sm" variant="outline" className="flex-1 h-7 text-[11px] border-zinc-700" onClick={() => toast.success("Enlace copiado")}>
                            <ExternalLink className="w-3 h-3 mr-1" /> Ver Live
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 text-[11px] border-zinc-700" onClick={() => toast.success("Código descargado")}>
                            <Download className="w-3 h-3 mr-1" /> Export
                          </Button>
                        </>
                      )}
                      {p.status === "briefing" && (
                        <Button size="sm" className="flex-1 h-7 text-[11px] bg-blue-600 hover:bg-blue-500" onClick={() => handleStatusChange(p.id, "generating")}>
                          <Wand2 className="w-3 h-3 mr-1" /> Generar
                        </Button>
                      )}
                    </div>

                    <div className="flex justify-between mt-2 text-[10px] text-zinc-600">
                      <span>Creado: {p.created}</span>
                      <span>Actualizado: {p.updated}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* ── TEMPLATES TAB ── */}
        <TabsContent value="templates" className="mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {APP_TEMPLATES.map(t => {
              const typeConf = TYPE_CONFIG[t.type];
              return (
                <Card key={t.id} className="bg-zinc-900/60 border-zinc-800/50 hover:border-blue-600/30 transition-all cursor-pointer group" onClick={() => { setWType(t.type); setWName(t.name); setWDesc(t.description); setWFeatures(t.features); setShowWizard(true); setWizardStep(1); }}>
                  <CardContent className="p-4">
                    <div className="text-4xl mb-3">{t.image}</div>
                    <h3 className="font-semibold text-sm mb-1">{t.name}</h3>
                    <Badge variant="outline" className={`text-[9px] mb-2 ${typeConf.color}`}>{typeConf.label}</Badge>
                    <p className="text-[11px] text-zinc-400 mb-3 line-clamp-2">{t.description}</p>
                    <div className="flex flex-wrap gap-1 mb-3">
                      {t.features.map(f => (
                        <Badge key={f} variant="outline" className="text-[9px] border-zinc-700 text-zinc-500">{f}</Badge>
                      ))}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-[10px] text-zinc-500">
                        <Star className="w-3 h-3 text-amber-400" /> {t.popularity}% popular
                      </div>
                      <Button size="sm" variant="ghost" className="h-6 text-[10px] text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        Usar <ArrowRight className="w-3 h-3 ml-1" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* ── PIPELINE TAB ── */}
        <TabsContent value="pipeline" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {(["briefing", "generating", "editing", "review", "delivered"] as AppStatus[]).map(status => {
              const conf = STATUS_CONFIG[status];
              const StatusIcon = conf.icon;
              const items = projects.filter(p => p.status === status);
              return (
                <div key={status} className="space-y-2">
                  <div className="flex items-center gap-2 px-2 py-1.5 bg-zinc-900/60 rounded-lg border border-zinc-800/50">
                    <StatusIcon className={`w-4 h-4 ${conf.color.split(" ")[0]}`} />
                    <span className="text-xs font-medium">{conf.label}</span>
                    <Badge variant="outline" className="text-[9px] ml-auto">{items.length}</Badge>
                  </div>
                  <div className="space-y-2 min-h-[100px]">
                    {items.map(p => {
                      const typeConf = TYPE_CONFIG[p.type];
                      return (
                        <div key={p.id} className="bg-zinc-900/60 border border-zinc-800/50 rounded-lg p-3 hover:border-blue-600/20 transition-all cursor-pointer" onClick={() => setSelectedProject(p)}>
                          <div className="flex items-center gap-2 mb-1">
                            <typeConf.icon className={`w-3.5 h-3.5 ${typeConf.color}`} />
                            <span className="text-xs font-medium truncate">{p.name}</span>
                          </div>
                          <p className="text-[10px] text-zinc-500 line-clamp-1">{p.description}</p>
                          <div className="w-full bg-zinc-800 rounded-full h-1 mt-2">
                            <div className="bg-blue-500 h-1 rounded-full" style={{ width: `${p.progress}%` }} />
                          </div>
                        </div>
                      );
                    })}
                    {items.length === 0 && (
                      <div className="text-center py-6 text-zinc-700 text-[11px]">Sin proyectos</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* ── WIZARD MODAL ── */}
      {showWizard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowWizard(false)}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            {/* Steps indicator */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Wand2 className="w-5 h-5 text-blue-400" /> Crear Nueva App
              </h2>
              <button onClick={() => setShowWizard(false)} className="p-1 hover:bg-zinc-800 rounded"><X className="w-5 h-5" /></button>
            </div>

            <div className="flex items-center gap-2 mb-6">
              {WIZARD_STEPS.map((step, i) => (
                <div key={step} className="flex items-center gap-2 flex-1">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${i <= wizardStep ? "bg-blue-600 text-white" : "bg-zinc-800 text-zinc-500"}`}>
                    {i < wizardStep ? <Check className="w-4 h-4" /> : i + 1}
                  </div>
                  <span className={`text-[11px] hidden sm:block ${i <= wizardStep ? "text-zinc-200" : "text-zinc-600"}`}>{step}</span>
                  {i < WIZARD_STEPS.length - 1 && <div className={`flex-1 h-px ${i < wizardStep ? "bg-blue-600" : "bg-zinc-800"}`} />}
                </div>
              ))}
            </div>

            {/* Step 0: Type */}
            {wizardStep === 0 && (
              <div className="space-y-4">
                <p className="text-sm text-zinc-400">¿Qué tipo de aplicación quieres crear?</p>
                <div className="grid grid-cols-2 gap-3">
                  {(Object.entries(TYPE_CONFIG) as [AppType, typeof TYPE_CONFIG[AppType]][]).map(([type, conf]) => (
                    <div
                      key={type}
                      onClick={() => setWType(type)}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${wType === type ? "border-blue-600 bg-blue-600/10" : "border-zinc-800 hover:border-zinc-700"}`}
                    >
                      <conf.icon className={`w-8 h-8 ${conf.color} mb-2`} />
                      <p className="font-semibold text-sm">{conf.label}</p>
                      <p className="text-[10px] text-zinc-500 mt-1">
                        {type === "landing" && "Web de presentación, portfolio, producto"}
                        {type === "business" && "E-commerce, CRM, gestión de negocio"}
                        {type === "internal" && "Dashboard, admin panel, herramientas internas"}
                        {type === "mini-app" && "Reservas, encuestas, utilidades rápidas"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 1: Briefing */}
            {wizardStep === 1 && (
              <div className="space-y-4">
                <p className="text-sm text-zinc-400">Cuéntanos sobre tu proyecto</p>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Nombre del proyecto *</label>
                  <Input value={wName} onChange={e => setWName(e.target.value)} placeholder="Mi App Increíble" className="bg-zinc-800/50 border-zinc-700" />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Descripción</label>
                  <textarea
                    value={wDesc}
                    onChange={e => setWDesc(e.target.value)}
                    placeholder="Describe qué necesitas, para quién es, y qué problema resuelve..."
                    rows={4}
                    className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg p-3 text-sm text-zinc-200 placeholder:text-zinc-600 resize-none focus:outline-none focus:ring-2 focus:ring-blue-600/50"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Cliente (opcional)</label>
                  <Input value={wClient} onChange={e => setWClient(e.target.value)} placeholder="Nombre del cliente" className="bg-zinc-800/50 border-zinc-700" />
                </div>
              </div>
            )}

            {/* Step 2: Design */}
            {wizardStep === 2 && (
              <div className="space-y-4">
                <p className="text-sm text-zinc-400">Define el estilo visual</p>
                <div>
                  <label className="text-xs text-zinc-400 mb-2 block">Color principal</label>
                  <div className="flex gap-2 items-center">
                    <input type="color" value={wColor} onChange={e => setWColor(e.target.value)} className="w-10 h-10 rounded cursor-pointer" />
                    <div className="flex gap-1.5">
                      {["#6c3ce0", "#3b82f6", "#059669", "#e63946", "#d97706", "#ec4899", "#0ea5e9", "#000000"].map(c => (
                        <button key={c} onClick={() => setWColor(c)} className={`w-8 h-8 rounded-lg border-2 transition-all ${wColor === c ? "border-white scale-110" : "border-transparent"}`} style={{ backgroundColor: c }} />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-zinc-400 mb-1 block">Tipografía</label>
                    <select value={wFont} onChange={e => setWFont(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm">
                      <option value="modern">Moderna (Inter)</option>
                      <option value="elegant">Elegante (Playfair)</option>
                      <option value="bold">Bold (Montserrat)</option>
                      <option value="minimal">Minimal (DM Sans)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 mb-1 block">Estilo</label>
                    <select value={wStyle} onChange={e => setWStyle(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm">
                      <option value="minimal">Minimalista</option>
                      <option value="glassmorphism">Glassmorphism</option>
                      <option value="corporate">Corporativo</option>
                      <option value="playful">Creativo/Playful</option>
                      <option value="dark">Dark Premium</option>
                    </select>
                  </div>
                </div>
                {/* Preview swatch */}
                <div className="p-4 rounded-xl border border-zinc-800" style={{ background: `linear-gradient(135deg, ${wColor}15, ${wColor}05)` }}>
                  <div className="w-full h-3 rounded-full mb-2" style={{ backgroundColor: wColor }} />
                  <div className="flex gap-2">
                    <div className="w-1/3 h-16 rounded-lg bg-zinc-800/50" />
                    <div className="w-1/3 h-16 rounded-lg bg-zinc-800/50" />
                    <div className="w-1/3 h-16 rounded-lg bg-zinc-800/50" />
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-2 text-center">Vista previa del esquema de color</p>
                </div>
              </div>
            )}

            {/* Step 3: Features */}
            {wizardStep === 3 && (
              <div className="space-y-4">
                <p className="text-sm text-zinc-400">Selecciona las funcionalidades</p>
                <div className="flex flex-wrap gap-2">
                  {featureOptions[wType].map(f => (
                    <button
                      key={f}
                      onClick={() => toggleFeature(f)}
                      className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${wFeatures.includes(f) ? "bg-blue-600/20 border-blue-600 text-blue-300" : "border-zinc-700 text-zinc-400 hover:border-zinc-600"}`}
                    >
                      {wFeatures.includes(f) && <Check className="w-3 h-3 inline mr-1" />}
                      {f}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input value={wCustomFeature} onChange={e => setWCustomFeature(e.target.value)} placeholder="Feature personalizada..." className="bg-zinc-800/50 border-zinc-700" onKeyDown={e => e.key === "Enter" && addCustomFeature()} />
                  <Button variant="outline" className="border-zinc-700" onClick={addCustomFeature}><Plus className="w-4 h-4" /></Button>
                </div>
                {wFeatures.length > 0 && (
                  <div>
                    <p className="text-[10px] text-zinc-500 mb-1">Seleccionadas ({wFeatures.length}):</p>
                    <div className="flex flex-wrap gap-1">
                      {wFeatures.map(f => (
                        <Badge key={f} className="bg-blue-600/20 text-blue-300 text-[10px] cursor-pointer" onClick={() => toggleFeature(f)}>
                          {f} <X className="w-2.5 h-2.5 ml-1" />
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Generate */}
            {wizardStep === 4 && (
              <div className="space-y-4">
                <p className="text-sm text-zinc-400">Resumen del proyecto — confirma y genera</p>
                <div className="bg-zinc-800/40 rounded-xl p-4 space-y-3">
                  <div className="flex justify-between text-xs"><span className="text-zinc-500">Nombre</span><span className="font-medium">{wName || "—"}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-zinc-500">Tipo</span><Badge variant="outline" className={`text-[10px] ${TYPE_CONFIG[wType].color}`}>{TYPE_CONFIG[wType].label}</Badge></div>
                  <div className="flex justify-between text-xs"><span className="text-zinc-500">Cliente</span><span>{wClient || "—"}</span></div>
                  <div className="flex justify-between text-xs items-center"><span className="text-zinc-500">Color</span><div className="w-5 h-5 rounded" style={{ backgroundColor: wColor }} /></div>
                  <div className="flex justify-between text-xs"><span className="text-zinc-500">Estilo</span><span className="capitalize">{wStyle}</span></div>
                  <div className="text-xs"><span className="text-zinc-500">Features:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {wFeatures.map(f => <Badge key={f} variant="outline" className="text-[9px] border-zinc-700">{f}</Badge>)}
                      {wFeatures.length === 0 && <span className="text-zinc-600">Ninguna seleccionada</span>}
                    </div>
                  </div>
                  {wDesc && <div className="text-xs"><span className="text-zinc-500">Descripción:</span><p className="text-zinc-300 mt-1">{wDesc}</p></div>}
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between mt-6 pt-4 border-t border-zinc-800">
              <Button variant="outline" className="border-zinc-700" onClick={() => wizardStep === 0 ? setShowWizard(false) : setWizardStep(s => s - 1)}>
                <ChevronLeft className="w-4 h-4 mr-1" /> {wizardStep === 0 ? "Cancelar" : "Anterior"}
              </Button>
              {wizardStep < 4 ? (
                <Button className="bg-blue-600 hover:bg-blue-500" onClick={() => setWizardStep(s => s + 1)}>
                  Siguiente <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button className="bg-gradient-to-r from-blue-600 to-cyan-600" onClick={handleGenerate} disabled={generating}>
                  {generating ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Generando...</> : <><Wand2 className="w-4 h-4 mr-1" /> Generar App</>}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── PROJECT DETAIL MODAL ── */}
      {selectedProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setSelectedProject(null)}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${TYPE_CONFIG[selectedProject.type].bgColor}`}>
                  {(() => { const Icon = TYPE_CONFIG[selectedProject.type].icon; return <Icon className={`w-5 h-5 ${TYPE_CONFIG[selectedProject.type].color}`} />; })()}
                </div>
                <div>
                  <h2 className="text-lg font-bold">{selectedProject.name}</h2>
                  <p className="text-[11px] text-zinc-500">{TYPE_CONFIG[selectedProject.type].label} {selectedProject.client && `· ${selectedProject.client}`}</p>
                </div>
              </div>
              <button onClick={() => setSelectedProject(null)} className="p-1 hover:bg-zinc-800 rounded"><X className="w-5 h-5" /></button>
            </div>

            <p className="text-sm text-zinc-400">{selectedProject.description}</p>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-zinc-500">Estado</span><Badge variant="outline" className={`text-[10px] ${STATUS_CONFIG[selectedProject.status].color}`}>{STATUS_CONFIG[selectedProject.status].label}</Badge></div>
              <div className="flex justify-between"><span className="text-zinc-500">Progreso</span><span>{selectedProject.progress}%</span></div>
              <div className="flex justify-between"><span className="text-zinc-500">Creado</span><span>{selectedProject.created}</span></div>
              <div className="flex justify-between"><span className="text-zinc-500">Actualizado</span><span>{selectedProject.updated}</span></div>
            </div>

            <div>
              <p className="text-xs text-zinc-500 mb-1">Features:</p>
              <div className="flex flex-wrap gap-1">
                {selectedProject.features.map(f => <Badge key={f} variant="outline" className="text-[10px] border-zinc-700">{f}</Badge>)}
              </div>
            </div>

            {/* Simulated preview */}
            <div className="bg-zinc-800/40 rounded-xl p-4 border border-zinc-700/50">
              <div className="flex items-center gap-2 mb-3">
                <div className="flex gap-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                </div>
                <div className="flex-1 bg-zinc-700/50 rounded px-2 py-0.5 text-[10px] text-zinc-500">{selectedProject.previewUrl || `${selectedProject.name.toLowerCase().replace(/\s/g, "-")}.nelvyon.app`}</div>
              </div>
              <div className="h-32 rounded-lg flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${selectedProject.colorScheme}30, ${selectedProject.colorScheme}10)` }}>
                <div className="text-center">
                  <Smartphone className="w-8 h-8 mx-auto mb-2" style={{ color: selectedProject.colorScheme }} />
                  <p className="text-xs text-zinc-400">Preview de {selectedProject.name}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              {selectedProject.status !== "delivered" && (
                <Button variant="outline" className="flex-1 border-zinc-700" onClick={() => { handleStatusChange(selectedProject.id, selectedProject.status === "editing" ? "review" : selectedProject.status === "review" ? "delivered" : "editing"); setSelectedProject(null); }}>
                  Avanzar Estado <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              )}
              <Button className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600" onClick={() => { toast.success("Abriendo editor..."); setSelectedProject(null); }}>
                <Code2 className="w-4 h-4 mr-1" /> Abrir Editor
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}