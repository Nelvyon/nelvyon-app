import { useEffect, useState, useCallback } from "react";
import { useI18n } from "@/lib/i18n";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import SaasLayout from "@/components/SaasLayout";
import { api } from "@/lib/api";
import {
  Palette, Search, Star, Eye, Download, Plus, Filter,
  Globe, Mail, FileText, Layers, MessageSquare, Bot,
  ShoppingCart, Calendar, Phone, Sparkles, ArrowRight,
  CheckCircle2, Crown, Zap, Loader2, RefreshCw,
} from "lucide-react";
import { InlineServiceDemo } from "@/components/saas/InlineServiceDemo";
import { cn } from "@/lib/utils";

interface BotTemplate {
  id: number;
  template_id: string;
  name: string;
  description?: string;
  category?: string;
  channels?: string;
  rating?: number;
  uses?: number;
  icon_name?: string;
  color?: string;
  features?: string;
  is_active?: boolean;
}

/* Fallback hardcoded templates used when backend is empty */
interface LocalTemplate {
  id: number;
  name: string;
  category: string;
  type: string;
  uses: number;
  rating: number;
  preview: string;
  tags: string[];
  premium: boolean;
  new: boolean;
}

const localTemplates: LocalTemplate[] = [
  { id: 1, name: "SaaS Landing Pro", category: "Landing Pages", type: "landing", uses: 12400, rating: 4.9, preview: "from-blue-500 to-cyan-500", tags: ["SaaS", "Conversión"], premium: false, new: false },
  { id: 2, name: "E-commerce Mega Store", category: "Websites", type: "website", uses: 8900, rating: 4.8, preview: "from-violet-500 to-purple-500", tags: ["Tienda", "Catálogo"], premium: true, new: false },
  { id: 3, name: "Funnel de Ventas 5 Pasos", category: "Funnels", type: "funnel", uses: 15600, rating: 4.9, preview: "from-emerald-500 to-green-500", tags: ["Ventas", "B2B"], premium: false, new: true },
  { id: 4, name: "Welcome Email Series", category: "Email", type: "email", uses: 23400, rating: 4.7, preview: "from-amber-500 to-orange-500", tags: ["Onboarding"], premium: false, new: false },
  { id: 5, name: "Survey NPS Avanzado", category: "Surveys", type: "form", uses: 5600, rating: 4.6, preview: "from-pink-500 to-rose-500", tags: ["Feedback"], premium: false, new: false },
  { id: 6, name: "Bot Atención al Cliente", category: "Bots", type: "bot", uses: 7800, rating: 4.8, preview: "from-indigo-500 to-blue-500", tags: ["Nelvyon", "Soporte"], premium: true, new: true },
  { id: 7, name: "Workflow Lead Scoring", category: "Workflows", type: "workflow", uses: 4500, rating: 4.7, preview: "from-teal-500 to-cyan-500", tags: ["Automatización"], premium: false, new: false },
  { id: 8, name: "Blog Magazine Pro", category: "Blogs", type: "website", uses: 6700, rating: 4.5, preview: "from-rose-500 to-pink-500", tags: ["Contenido", "SEO"], premium: false, new: false },
  { id: 9, name: "Dashboard Analytics KPI", category: "Dashboards", type: "dashboard", uses: 3400, rating: 4.9, preview: "from-blue-600 to-violet-600", tags: ["Métricas", "Real-time"], premium: true, new: true },
  { id: 10, name: "Social Media Calendar", category: "Social Media", type: "social", uses: 9100, rating: 4.6, preview: "from-fuchsia-500 to-purple-500", tags: ["Planificación"], premium: false, new: false },
  { id: 11, name: "Checkout Optimizado", category: "E-commerce", type: "ecommerce", uses: 11200, rating: 4.8, preview: "from-emerald-600 to-teal-500", tags: ["Pagos", "Conversión"], premium: false, new: false },
  { id: 12, name: "Propuesta Comercial Pro", category: "Proposals", type: "document", uses: 2800, rating: 4.7, preview: "from-amber-600 to-yellow-500", tags: ["Ventas", "PDF"], premium: true, new: false },
];

const gradientMap: Record<string, string> = {
  "Landing Pages": "from-blue-500 to-cyan-500",
  "Funnels": "from-emerald-500 to-green-500",
  "Email": "from-amber-500 to-orange-500",
  "Websites": "from-violet-500 to-purple-500",
  "Bots": "from-indigo-500 to-blue-500",
  "Workflows": "from-teal-500 to-cyan-500",
  "Blogs": "from-rose-500 to-pink-500",
  "Dashboards": "from-blue-600 to-violet-600",
  "Social Media": "from-fuchsia-500 to-purple-500",
  "E-commerce": "from-emerald-600 to-teal-500",
  "Surveys": "from-pink-500 to-rose-500",
  "Forms": "from-cyan-500 to-blue-500",
  "Proposals": "from-amber-600 to-yellow-500",
  "Invoices": "from-slate-500 to-zinc-500",
};

const categories = [
  "Todos", "Landing Pages", "Funnels", "Email", "Websites",
  "Forms", "Surveys", "Bots", "Workflows", "Social Media",
  "E-commerce", "Blogs", "Dashboards", "Invoices", "Proposals",
];

export default function SaasTemplates() {
  const { ts } = useI18n();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("Todos");
  const [showPremium, setShowPremium] = useState(false);

  // ── Backend data ──
  const [backendTemplates, setBackendTemplates] = useState<BotTemplate[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [usingBackend, setUsingBackend] = useState(false);

  const loadBackendTemplates = useCallback(async () => {
    setLoadingData(true);
    try {
      const res = await api.getBotTemplates(0, 200);
      const items = (res.items || []) as BotTemplate[];
      if (items.length > 0) {
        setBackendTemplates(items);
        setUsingBackend(true);
      }
    } catch (err) {
      if (import.meta.env.DEV) console.warn("[SaasTemplates] backend load error:", err);
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (!loading && !user) navigate("/saas");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) loadBackendTemplates();
  }, [user, loadBackendTemplates]);

  // ── Merge backend + local fallback ──
  const displayTemplates: LocalTemplate[] = usingBackend
    ? backendTemplates.map((bt) => {
        let tags: string[] = [];
        try { tags = JSON.parse(bt.features || "[]"); } catch { tags = bt.features ? bt.features.split(",").map(s => s.trim()) : []; }
        return {
          id: bt.id,
          name: bt.name,
          category: bt.category || "Todos",
          type: bt.template_id || "template",
          uses: bt.uses || 0,
          rating: bt.rating || 4.5,
          preview: gradientMap[bt.category || ""] || bt.color || "from-blue-500 to-cyan-500",
          tags,
          premium: false,
          new: false,
        };
      })
    : localTemplates;

  const filtered = displayTemplates.filter((t) => {
    const matchSearch = t.name.toLowerCase().includes(search.toLowerCase()) || t.tags.some(tag => tag.toLowerCase().includes(search.toLowerCase()));
    const matchCategory = activeCategory === "Todos" || t.category === activeCategory;
    const matchPremium = !showPremium || t.premium;
    return matchSearch && matchCategory && matchPremium;
  });

  const totalUses = displayTemplates.reduce((s, t) => s + t.uses, 0);
  const avgRating = displayTemplates.length > 0
    ? (displayTemplates.reduce((s, t) => s + t.rating, 0) / displayTemplates.length).toFixed(1)
    : "0";

  return (
    <SaasLayout title="Templates" subtitle="Plantillas — Datos desde base de datos cuando están disponibles">
      <InlineServiceDemo serviceKey="templates" serviceName="Templates" />

      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-br from-blue-500/[0.08] to-violet-500/[0.04] border border-blue-500/10 p-8 mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Plantillas</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: usingBackend ? "#10B981" : "#F59E0B" }} />
              <p className="text-xs text-slate-500">
                {usingBackend
                  ? `${backendTemplates.length} templates desde PostgreSQL (nelvyon_bot_templates)`
                  : `${localTemplates.length} templates locales (backend vacío)`}
              </p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Templates", value: displayTemplates.length.toString(), icon: Palette },
            { label: "Categorías", value: `${categories.length - 1}`, icon: Filter },
            { label: "Usos Totales", value: totalUses > 1000 ? `${(totalUses / 1000).toFixed(0)}K+` : totalUses.toString(), icon: Download },
            { label: "Rating Promedio", value: `${avgRating}★`, icon: Star },
          ].map((s) => (
            <div key={s.label} className="p-3 rounded-lg bg-black/20 border border-white/[0.04]">
              <s.icon className="w-4 h-4 text-blue-400 mb-1" />
              <p className="text-lg font-bold text-white">{s.value}</p>
              <p className="text-[10px] text-slate-600">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
          <input
            type="text"
            placeholder="Buscar template..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-xl bg-[#0F1419] border border-blue-500/[0.06] text-sm text-white placeholder:text-slate-700 focus:outline-none focus:border-blue-500/30"
          />
        </div>
        {!usingBackend && (
          <button
            onClick={() => setShowPremium(!showPremium)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all border ${
              showPremium ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "text-slate-600 border-white/[0.06] hover:text-slate-400"
            }`}
          >
            <Crown className="w-3.5 h-3.5" /> Premium
          </button>
        )}
        <button onClick={loadBackendTemplates} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-500 border border-white/[0.06] hover:text-slate-300 transition-all">
          <RefreshCw className="w-3.5 h-3.5" /> Recargar
        </button>
      </div>

      {/* Category Pills */}
      <div className="flex flex-wrap gap-2 mb-6">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeCategory === cat
                ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                : "text-slate-600 hover:text-slate-400 border border-transparent hover:border-white/[0.06]"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Templates Grid */}
      {loadingData ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {filtered.map((t) => (
            <div key={t.id} className="rounded-xl bg-[#0F1419] border border-blue-500/[0.06] hover:border-blue-500/[0.15] transition-all cursor-pointer group overflow-hidden">
              {/* Preview */}
              <div className={`h-36 bg-gradient-to-br ${t.preview} relative overflow-hidden`}>
                <div className="absolute inset-0 bg-black/20" />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                  <div className="flex items-center gap-2">
                    <button className="px-3 py-1.5 rounded-lg bg-white/20 backdrop-blur text-white text-xs font-medium hover:bg-white/30 transition-all flex items-center gap-1">
                      <Eye className="w-3 h-3" /> Preview
                    </button>
                    <button className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-500 transition-all flex items-center gap-1">
                      <Zap className="w-3 h-3" /> Usar
                    </button>
                  </div>
                </div>
                {/* Badges */}
                <div className="absolute top-2 left-2 flex gap-1">
                  {t.premium && (
                    <span className="px-2 py-0.5 rounded bg-amber-500/90 text-[9px] font-bold text-white flex items-center gap-1">
                      <Crown className="w-2.5 h-2.5" /> PRO
                    </span>
                  )}
                  {t.new && (
                    <span className="px-2 py-0.5 rounded bg-emerald-500/90 text-[9px] font-bold text-white">NUEVO</span>
                  )}
                  {usingBackend && (
                    <span className="px-2 py-0.5 rounded bg-blue-500/90 text-[9px] font-bold text-white">DB</span>
                  )}
                </div>
              </div>

              {/* Info */}
              <div className="p-4">
                <h4 className="text-sm font-semibold text-white group-hover:text-blue-300 transition-colors truncate">{t.name}</h4>
                <p className="text-[10px] text-blue-400 mt-0.5">{t.category}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {t.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="px-1.5 py-0.5 rounded text-[9px] text-slate-500 bg-white/[0.04] border border-white/[0.04]">{tag}</span>
                  ))}
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/[0.04]">
                  <span className="text-[10px] text-slate-600">{t.uses.toLocaleString()} usos</span>
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                    <span className="text-[10px] text-slate-500">{t.rating}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {filtered.length === 0 && !loadingData && (
        <div className="text-center py-16 rounded-xl bg-[#0A0E13] border border-white/[0.04]">
          <Search className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
          <p className="text-sm text-zinc-500">No se encontraron templates con este filtro</p>
        </div>
      )}

      {/* Footer */}
      <div className="text-center mt-8">
        <p className="text-[10px] text-slate-700">
          {usingBackend
            ? `Mostrando ${filtered.length} de ${backendTemplates.length} templates desde base de datos`
            : `Mostrando ${filtered.length} de ${localTemplates.length} templates locales`}
        </p>
      </div>
    </SaasLayout>
  );
}