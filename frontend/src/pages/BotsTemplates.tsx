import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import { motion } from "framer-motion";
import {
  Bot, Search, Star, Users, Zap, MessageCircle, Clock, TrendingUp,
  ShoppingCart, Headphones, CreditCard, GraduationCap, Building,
  ClipboardList, BookOpen, FileQuestion, Loader2, Database,
  CheckCircle2, ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { toast } from "sonner";

/* ─── Icon mapping ─── */
const iconMap: Record<string, React.ElementType> = {
  TrendingUp, Clock, Headphones, ShoppingCart, Star, MessageCircle,
  CreditCard, GraduationCap, Building, ClipboardList, BookOpen, FileQuestion,
  Bot, Zap, Users,
};

interface BotTemplate {
  id: number;
  template_id: string;
  name: string;
  description: string;
  category: string;
  channels: string[];
  rating: number;
  uses: number;
  icon_name: string;
  color: string;
  features: string[];
  is_active: boolean;
}

function parseJsonSafe<T>(val: unknown, fallback: T): T {
  if (Array.isArray(val)) return val as T;
  if (typeof val === "string") {
    try { return JSON.parse(val) as T; } catch (err) { return fallback; }
  }
  return fallback;
}

const categories = ["Todos", "Ventas", "Soporte", "Citas", "E-commerce", "Reputacion", "Social", "Pagos", "Educacion", "Onboarding", "Feedback", "Inmobiliaria"];

export default function BotsTemplates() {
  const { ts } = useI18n();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [searchQuery, setSearchQuery] = useState("");
  const [templates, setTemplates] = useState<BotTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [backendConnected, setBackendConnected] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const loadTemplates = async () => {
      try {
        setLoading(true);
        const res = await api.getBotTemplates(0, 50);
        if (res.items && res.items.length > 0) {
          const parsed = res.items.map((item) => ({
            id: item.id as number,
            template_id: item.template_id as string,
            name: item.name as string,
            description: (item.description as string) || "",
            category: (item.category as string) || "General",
            channels: parseJsonSafe<string[]>(item.channels, []),
            rating: (item.rating as number) || 0,
            uses: (item.uses as number) || 0,
            icon_name: (item.icon_name as string) || "Bot",
            color: (item.color as string) || "from-zinc-500 to-zinc-600",
            features: parseJsonSafe<string[]>(item.features, []),
            is_active: (item.is_active as boolean) ?? true,
          }));
          setTemplates(parsed);
          setBackendConnected(true);
        }
      } catch (err) {

        if (import.meta.env.DEV) console.warn("[BotsTemplates] Error (// Keep empty):", err);

      } finally {
        setLoading(false);
      }
    };
    loadTemplates();
  }, []);

  const filtered = templates.filter((t) => {
    const matchCat = selectedCategory === "Todos" || t.category === selectedCategory;
    const matchSearch = !searchQuery || t.name.toLowerCase().includes(searchQuery.toLowerCase()) || t.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  const totalUses = templates.reduce((a, t) => a + t.uses, 0);
  const avgRating = templates.length > 0 ? (templates.reduce((a, t) => a + t.rating, 0) / templates.length).toFixed(1) : "0";

  return (
    <DashboardLayout title="Bot Templates" subtitle="Plantillas de bots inteligentes desde el backend">
      <div className="space-y-6">
        {/* Backend status + Stats */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${backendConnected ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
            <span className="text-[10px] text-zinc-500">
              {backendConnected ? "Datos desde PostgreSQL" : "Cargando..."}
            </span>
            <Database className="w-3 h-3 text-zinc-600" />
          </div>
          <div className="flex gap-4 ml-auto">
            <div className="text-center">
              <p className="text-lg font-bold text-white">{templates.length}</p>
              <p className="text-[10px] text-zinc-500">Templates</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-emerald-400">{totalUses.toLocaleString()}</p>
              <p className="text-[10px] text-zinc-500">Usos totales</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-amber-400">⭐ {avgRating}</p>
              <p className="text-[10px] text-zinc-500">Rating promedio</p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Buscar template..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[#111113] border border-white/[0.06] rounded-xl text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/30"
          />
        </div>

        {/* Categories */}
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                selectedCategory === cat
                  ? "bg-violet-500/15 text-violet-300 border border-violet-500/20"
                  : "bg-white/[0.03] text-zinc-500 border border-white/[0.06] hover:text-white"
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Templates Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
            <span className="ml-2 text-sm text-zinc-400">Cargando templates del backend...</span>
          </div>
        ) : (
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {filtered.map((t) => {
              const Icon = iconMap[t.icon_name] || Bot;
              return (
                <motion.div
                  key={t.id}
                  whileHover={{ y: -4 }}
                  className="rounded-xl bg-[#111113] border border-white/[0.06] overflow-hidden hover:border-white/[0.12] transition-all group"
                >
                  {/* Header gradient */}
                  <div className={cn("h-20 bg-gradient-to-r flex items-center justify-center relative", t.color)}>
                    <Icon className="w-10 h-10 text-white/80" />
                    <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/30 rounded-full px-2 py-0.5">
                      <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                      <span className="text-[10px] text-white font-medium">{t.rating}</span>
                    </div>
                    {t.is_active && (
                      <div className="absolute top-2 left-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      </div>
                    )}
                  </div>

                  <div className="p-4 space-y-3">
                    <div>
                      <h3 className="text-sm font-semibold text-white">{t.name}</h3>
                      <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{t.description}</p>
                    </div>

                    {/* Channels */}
                    <div className="flex flex-wrap gap-1">
                      {t.channels.map((ch) => (
                        <span key={ch} className="px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-[9px] text-zinc-400">
                          {ch}
                        </span>
                      ))}
                    </div>

                    {/* Features */}
                    <div className="space-y-1">
                      {t.features.slice(0, 3).map((f) => (
                        <div key={f} className="flex items-center gap-1.5">
                          <Zap className="w-3 h-3 text-violet-400" />
                          <span className="text-[10px] text-zinc-400">{f}</span>
                        </div>
                      ))}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-2 border-t border-white/[0.04]">
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3 text-zinc-500" />
                        <span className="text-[10px] text-zinc-500">{t.uses.toLocaleString()} usos</span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-300 border border-violet-500/20">
                        {t.category}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-12">
            <Bot className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
            <p className="text-sm text-zinc-500">No se encontraron templates</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}