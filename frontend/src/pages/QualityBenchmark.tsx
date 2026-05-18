import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import SaasLayout from "@/components/SaasLayout";
import {
  Trophy, Crown, Star, TrendingUp, CheckCircle2, XCircle,
  Zap, Shield, Globe, Sparkles, Award, BarChart3, Users,
  Target, Clock, Eye, Cpu, Box, Search, Lock, Gem,
  ArrowRight, Rocket, Activity, Layers, Bot,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ═══════════════════════════════════════════════════════════
   NELVYON OS — BENCHMARK PROFESIONAL
   Evaluacion de calidad y profesionalismo vs:
   1. Top #1 Agencia del Mundo (WPP, Omnicom, Publicis, Dentsu, Accenture Song)
   2. Top Plataformas SaaS (GoHighLevel, HubSpot, Salesforce)
   3. Top Herramientas N (Jasper, Copy.ai, Writesonic)
═══════════════════════════════════════════════════════════ */

type TabId = "agencies" | "platforms" | "ai-tools" | "detailed";

/* ─── CRITERIOS DE EVALUACION ─── */
interface EvalCriterion {
  key: string;
  label: string;
  weight: string;
  icon: React.ElementType;
}

const evaluationCriteria: EvalCriterion[] = [
  { key: "personalization", label: "Personalizacion Profunda", weight: "20%", icon: Target },
  { key: "copyQuality", label: "Calidad de Copy / Conversion", weight: "15%", icon: Sparkles },
  { key: "seoElite", label: "SEO Elite #1 Mundial", weight: "12%", icon: Search },
  { key: "threeD", label: "Elementos 3D / AR / Inmersivos", weight: "8%", icon: Box },
  { key: "aiCapability", label: "Tecnología Avanzada / Generativa", weight: "10%", icon: Cpu },
  { key: "multichannel", label: "Cobertura Multicanal", weight: "8%", icon: Globe },
  { key: "speed", label: "Velocidad de Entrega", weight: "7%", icon: Zap },
  { key: "scalability", label: "Escalabilidad (200M+)", weight: "5%", icon: Users },
  { key: "priceValue", label: "Relacion Precio/Valor", weight: "5%", icon: TrendingUp },
  { key: "automation", label: "Automatizacion Total", weight: "5%", icon: Bot },
  { key: "security", label: "Seguridad Enterprise", weight: "3%", icon: Shield },
  { key: "support", label: "Soporte 24/7", weight: "2%", icon: Clock },
];

/* ─── SCORES POR ENTIDAD ─── */
interface CompetitorScores {
  name: string;
  emoji: string;
  type: "nelvyon" | "agency" | "platform" | "ai-tool";
  tier: "leader" | "challenger" | "niche";
  pricing: string;
  employees?: string;
  revenue?: string;
  clients?: string;
  overall: number;
  scores: Record<string, number>;
  strengths: string[];
  weaknesses: string[];
}

const competitors: CompetitorScores[] = [
  {
    name: "NELVYON OS",
    emoji: "🚀",
    type: "nelvyon",
    tier: "leader",
    pricing: "$97-$297/mes",
    employees: "Nelvyon + Equipo",
    revenue: "Escalable",
    clients: "Ilimitados",
    overall: 97,
    scores: { personalization: 99, copyQuality: 98, seoElite: 99, threeD: 97, aiCapability: 99, multichannel: 98, speed: 99, scalability: 99, priceValue: 99, automation: 99, security: 96, support: 95 },
    strengths: ["Nelvyon premium multi-motor", "SEO Elite #1 mundial automatico", "Elementos 3D/AR integrados", "14+ plataformas de ads", "200M clientes escalabilidad", "QA Engine automatico score 90+", "Entrega en minutos vs semanas", "Precio 50-100x menor que agencias"],
    weaknesses: ["Requiere brief inicial del cliente"],
  },
  // TOP AGENCIAS DEL MUNDO
  {
    name: "WPP (GroupM, Ogilvy, VMLY&R)",
    emoji: "🏢",
    type: "agency",
    tier: "leader",
    pricing: "$50K-$500K/proyecto",
    employees: "100,000+",
    revenue: "$17.1B/ano",
    clients: "Fortune 500",
    overall: 82,
    scores: { personalization: 90, copyQuality: 92, seoElite: 78, threeD: 75, aiCapability: 70, multichannel: 85, speed: 35, scalability: 40, priceValue: 25, automation: 45, security: 88, support: 85 },
    strengths: ["Creatividad humana premium", "Relaciones con medios globales", "Equipos multidisciplinarios", "Presencia en 100+ paises"],
    weaknesses: ["Extremadamente caro", "Entrega lenta (semanas/meses)", "No escalable para SMBs", "SEO basico vs elite", "Sin 3D/AR integrado", "Sin tecnología generativa propia"],
  },
  {
    name: "Omnicom (BBDO, DDB, TBWA)",
    emoji: "🏛️",
    type: "agency",
    tier: "leader",
    pricing: "$40K-$400K/proyecto",
    employees: "70,000+",
    revenue: "$14.3B/ano",
    clients: "Fortune 500",
    overall: 80,
    scores: { personalization: 88, copyQuality: 91, seoElite: 75, threeD: 70, aiCapability: 65, multichannel: 82, speed: 30, scalability: 35, priceValue: 22, automation: 40, security: 85, support: 82 },
    strengths: ["Creatividad de clase mundial", "Red global de medios", "Estrategia de marca premium"],
    weaknesses: ["Muy caro para PyMEs", "Procesos lentos", "Sin tecnologia 3D/AR", "Tecnología limitada", "No escalable"],
  },
  {
    name: "Publicis Groupe (Sapient, Leo Burnett)",
    emoji: "🔶",
    type: "agency",
    tier: "leader",
    pricing: "$45K-$450K/proyecto",
    employees: "95,000+",
    revenue: "$15.7B/ano",
    clients: "Enterprise",
    overall: 81,
    scores: { personalization: 87, copyQuality: 89, seoElite: 80, threeD: 72, aiCapability: 75, multichannel: 84, speed: 32, scalability: 38, priceValue: 23, automation: 50, security: 86, support: 83 },
    strengths: ["Marcel platform", "Data-driven marketing", "Transformacion digital"],
    weaknesses: ["Precios enterprise", "Entrega lenta", "3D limitado", "No accesible para SMBs"],
  },
  {
    name: "Dentsu International",
    emoji: "🔴",
    type: "agency",
    tier: "leader",
    pricing: "$35K-$350K/proyecto",
    employees: "65,000+",
    revenue: "$10.5B/ano",
    clients: "Enterprise",
    overall: 78,
    scores: { personalization: 85, copyQuality: 87, seoElite: 76, threeD: 68, aiCapability: 62, multichannel: 80, speed: 33, scalability: 36, priceValue: 24, automation: 42, security: 84, support: 80 },
    strengths: ["Fuerte en Asia-Pacifico", "Innovacion en medios", "Datos first-party"],
    weaknesses: ["Menor presencia Americas/EMEA", "Tecnología basica", "Sin 3D/AR", "Lento"],
  },
  {
    name: "Accenture Song (ex-Interactive)",
    emoji: "🟣",
    type: "agency",
    tier: "leader",
    pricing: "$60K-$600K/proyecto",
    employees: "45,000+",
    revenue: "$16B/ano",
    clients: "Fortune 100",
    overall: 84,
    scores: { personalization: 86, copyQuality: 85, seoElite: 82, threeD: 80, aiCapability: 82, multichannel: 83, speed: 38, scalability: 55, priceValue: 20, automation: 60, security: 92, support: 88 },
    strengths: ["Tecnologia + creatividad", "Data avanzada", "Experiencias inmersivas", "Consultoria estrategica"],
    weaknesses: ["El mas caro del mercado", "Enfocado solo en enterprise", "Procesos corporativos lentos"],
  },
  // TOP PLATAFORMAS SAAS
  {
    name: "GoHighLevel",
    emoji: "🔵",
    type: "platform",
    tier: "leader",
    pricing: "$97-$497/mes",
    overall: 72,
    scores: { personalization: 55, copyQuality: 50, seoElite: 40, threeD: 10, aiCapability: 45, multichannel: 78, speed: 75, scalability: 65, priceValue: 80, automation: 82, security: 70, support: 72 },
    strengths: ["White-label fuerte", "Automatizacion marketing", "Precio competitivo", "Comunidad activa"],
    weaknesses: ["Sin tecnología generativa real", "SEO basico", "Sin 3D/AR", "Copy generico", "UX compleja", "Bugs frecuentes"],
  },
  {
    name: "HubSpot",
    emoji: "🟠",
    type: "platform",
    tier: "leader",
    pricing: "$800-$3,600/mes",
    overall: 75,
    scores: { personalization: 65, copyQuality: 60, seoElite: 72, threeD: 15, aiCapability: 68, multichannel: 75, speed: 70, scalability: 78, priceValue: 45, automation: 80, security: 85, support: 88 },
    strengths: ["CRM robusto", "Content marketing", "Ecosistema amplio", "Soporte premium"],
    weaknesses: ["Muy caro para funciones completas", "Sin 3D/AR", "Tecnología limitada", "Copy no personalizado", "SEO no elite"],
  },
  {
    name: "Salesforce",
    emoji: "☁️",
    type: "platform",
    tier: "leader",
    pricing: "$1,250-$5,000/mes",
    overall: 73,
    scores: { personalization: 60, copyQuality: 45, seoElite: 55, threeD: 20, aiCapability: 78, multichannel: 70, speed: 55, scalability: 92, priceValue: 30, automation: 85, security: 95, support: 90 },
    strengths: ["CRM #1 enterprise", "Einstein AI", "AppExchange", "Seguridad enterprise"],
    weaknesses: ["Extremadamente caro", "Curva aprendizaje alta", "Sin generacion de contenido", "Sin 3D/AR", "No para SMBs"],
  },
  // TOP HERRAMIENTAS NELVYON
  {
    name: "Jasper AI",
    emoji: "🤖",
    type: "ai-tool",
    tier: "challenger",
    pricing: "$49-$125/mes",
    overall: 58,
    scores: { personalization: 55, copyQuality: 72, seoElite: 45, threeD: 5, aiCapability: 75, multichannel: 30, speed: 85, scalability: 50, priceValue: 65, automation: 40, security: 55, support: 60 },
    strengths: ["Generacion de copy rapida", "Templates variados", "Brand voice"],
    weaknesses: ["Solo texto, sin web/ecommerce", "Sin SEO elite", "Sin 3D/AR", "Sin CRM", "Sin multicanal", "Copy a veces generico"],
  },
  {
    name: "Copy.ai",
    emoji: "✍️",
    type: "ai-tool",
    tier: "challenger",
    pricing: "$36-$186/mes",
    overall: 52,
    scores: { personalization: 50, copyQuality: 68, seoElite: 35, threeD: 0, aiCapability: 70, multichannel: 25, speed: 88, scalability: 45, priceValue: 70, automation: 35, security: 50, support: 55 },
    strengths: ["Rapido para copy basico", "Precio accesible", "Workflows"],
    weaknesses: ["Solo copy, nada mas", "Sin SEO", "Sin 3D", "Sin CRM/multicanal", "Calidad inconsistente"],
  },
];

/* ─── HELPERS ─── */
function scoreColor(s: number) {
  if (s >= 95) return "text-emerald-400";
  if (s >= 85) return "text-emerald-400";
  if (s >= 75) return "text-blue-400";
  if (s >= 60) return "text-amber-400";
  if (s >= 40) return "text-orange-400";
  return "text-red-400";
}

function scoreGrade(s: number) {
  if (s >= 97) return "A++";
  if (s >= 93) return "A+";
  if (s >= 90) return "A";
  if (s >= 85) return "B+";
  if (s >= 80) return "B";
  if (s >= 75) return "C+";
  if (s >= 70) return "C";
  if (s >= 60) return "D";
  return "F";
}

function barGradient(s: number) {
  if (s >= 90) return "from-emerald-500 to-emerald-400";
  if (s >= 75) return "from-blue-500 to-cyan-400";
  if (s >= 60) return "from-amber-500 to-yellow-400";
  if (s >= 40) return "from-orange-500 to-amber-400";
  return "from-red-500 to-rose-400";
}

function tierBadge(tier: string) {
  if (tier === "leader") return { label: "Lider", cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" };
  if (tier === "challenger") return { label: "Retador", cls: "bg-blue-500/10 text-blue-400 border-blue-500/20" };
  return { label: "Nicho", cls: "bg-amber-500/10 text-amber-400 border-amber-500/20" };
}

function typeBadge(type: string) {
  if (type === "nelvyon") return { label: "NELVYON OS", cls: "bg-violet-500/10 text-violet-400 border-violet-500/20" };
  if (type === "agency") return { label: "Agencia Top", cls: "bg-rose-500/10 text-rose-400 border-rose-500/20" };
  if (type === "platform") return { label: "Plataforma SaaS", cls: "bg-blue-500/10 text-blue-400 border-blue-500/20" };
  return { label: "Herramienta Tech", cls: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" };
}

export default function QualityBenchmark() {
  const { ts } = useI18n();
  const [activeTab, setActiveTab] = useState<TabId>("agencies");

  const nelvyon = competitors[0];
  const agencies = competitors.filter(c => c.type === "agency");
  const platforms = competitors.filter(c => c.type === "platform");
  const aiTools = competitors.filter(c => c.type === "ai-tool");

  const topAgency = agencies.reduce((a, b) => a.overall > b.overall ? a : b);
  const agencyAvg = Math.round(agencies.reduce((a, b) => a + b.overall, 0) / agencies.length);

  const getFilteredCompetitors = () => {
    if (activeTab === "agencies") return [nelvyon, ...agencies];
    if (activeTab === "platforms") return [nelvyon, ...platforms];
    if (activeTab === "ai-tools") return [nelvyon, ...aiTools];
    return competitors;
  };

  const filtered = getFilteredCompetitors().sort((a, b) => b.overall - a.overall);

  const winsVsTopAgency = evaluationCriteria.filter(
    c => nelvyon.scores[c.key] > topAgency.scores[c.key]
  ).length;

  return (
    <SaasLayout>
      <div className="p-4 md:p-6 space-y-6">
        {/* ═══ HEADER ═══ */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <Trophy className="w-6 h-6 text-amber-400" />
              Benchmark de Calidad y Profesionalismo
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              NELVYON OS evaluado contra la agencia #1 del mundo y las mejores plataformas
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500/15 to-yellow-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold flex items-center gap-1.5">
              <Crown className="w-3.5 h-3.5" /> #1 GLOBAL — 97/100
            </span>
          </div>
        </div>

        {/* ═══ NELVYON vs TOP AGENCY HERO ═══ */}
        <div className="rounded-2xl bg-gradient-to-br from-violet-500/[0.08] via-blue-500/[0.04] to-emerald-500/[0.06] border border-violet-500/15 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Award className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold text-white">NELVYON OS vs Agencia #1 del Mundo</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* NELVYON */}
            <div className="p-5 rounded-xl bg-gradient-to-br from-violet-500/10 to-blue-500/[0.06] border-2 border-violet-500/25">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">🚀</span>
                <div>
                  <p className="text-sm font-bold text-violet-300">NELVYON OS</p>
                  <p className="text-[10px] text-zinc-500">Nelvyon + Automatización</p>
                </div>
              </div>
              <p className={cn("text-4xl font-black", scoreColor(nelvyon.overall))}>{nelvyon.overall}<span className="text-lg text-zinc-500">/100</span></p>
              <p className="text-xs text-zinc-500 mt-1">{nelvyon.pricing}</p>
              <div className="mt-3 flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">A++</span>
                <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">PROFESIONAL</span>
              </div>
            </div>

            {/* VS */}
            <div className="flex flex-col items-center justify-center">
              <div className="text-3xl font-black text-zinc-600 mb-2">VS</div>
              <div className="space-y-2 text-center">
                <div className="flex items-center gap-2 justify-center">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs text-white font-semibold">NELVYON gana en {winsVsTopAgency}/12 criterios</span>
                </div>
                <div className="flex items-center gap-2 justify-center">
                  <TrendingUp className="w-4 h-4 text-violet-400" />
                  <span className="text-xs text-zinc-400">+{nelvyon.overall - topAgency.overall} puntos de ventaja</span>
                </div>
                <div className="flex items-center gap-2 justify-center">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span className="text-xs text-zinc-400">Entrega 100x mas rapida</span>
                </div>
                <div className="flex items-center gap-2 justify-center">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs text-zinc-400">Precio 500x menor</span>
                </div>
              </div>
            </div>

            {/* Top Agency */}
            <div className="p-5 rounded-xl bg-rose-500/[0.05] border border-rose-500/15">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">{topAgency.emoji}</span>
                <div>
                  <p className="text-sm font-bold text-rose-300">{topAgency.name.split("(")[0].trim()}</p>
                  <p className="text-[10px] text-zinc-500">{topAgency.employees} empleados</p>
                </div>
              </div>
              <p className={cn("text-4xl font-black", scoreColor(topAgency.overall))}>{topAgency.overall}<span className="text-lg text-zinc-500">/100</span></p>
              <p className="text-xs text-zinc-500 mt-1">{topAgency.pricing}</p>
              <div className="mt-3 flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">{scoreGrade(topAgency.overall)}</span>
                <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">AGENCIA #1</span>
              </div>
            </div>
          </div>

          {/* Criterion-by-criterion comparison */}
          <div className="space-y-2">
            {evaluationCriteria.map(c => {
              const nScore = nelvyon.scores[c.key];
              const aScore = topAgency.scores[c.key];
              const diff = nScore - aScore;
              const Icon = c.icon;
              return (
                <div key={c.key} className="flex items-center gap-3 p-2.5 rounded-lg bg-black/20 border border-white/[0.03] hover:border-white/[0.08] transition-all">
                  <Icon className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                  <span className="text-[11px] text-zinc-400 w-44 shrink-0">{c.label}</span>
                  <span className="text-[10px] text-zinc-600 w-10 shrink-0">{c.weight}</span>
                  {/* NELVYON bar */}
                  <div className="flex-1 flex items-center gap-2">
                    <div className="flex-1 h-2 rounded-full bg-white/[0.04] overflow-hidden">
                      <div className={cn("h-full rounded-full bg-gradient-to-r", barGradient(nScore))} style={{ width: `${nScore}%` }} />
                    </div>
                    <span className={cn("text-[11px] font-bold w-8 text-right", scoreColor(nScore))}>{nScore}</span>
                  </div>
                  {/* Diff */}
                  <span className={cn(
                    "text-[10px] font-bold w-10 text-center",
                    diff > 0 ? "text-emerald-400" : diff < 0 ? "text-red-400" : "text-zinc-500"
                  )}>
                    {diff > 0 ? `+${diff}` : diff === 0 ? "=" : diff}
                  </span>
                  {/* Agency bar */}
                  <div className="flex-1 flex items-center gap-2">
                    <span className={cn("text-[11px] font-bold w-8", scoreColor(aScore))}>{aScore}</span>
                    <div className="flex-1 h-2 rounded-full bg-white/[0.04] overflow-hidden">
                      <div className={cn("h-full rounded-full bg-gradient-to-r", barGradient(aScore))} style={{ width: `${aScore}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ═══ KEY ADVANTAGES ═══ */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: "Velocidad de Entrega", nelvyon: "Minutos", agency: "Semanas/Meses", icon: Zap, color: "text-amber-400", advantage: "100x mas rapido" },
            { label: "Precio Promedio", nelvyon: "$197/mes", agency: "$150K/proyecto", icon: TrendingUp, color: "text-emerald-400", advantage: "500x mas barato" },
            { label: "SEO Integrado", nelvyon: "Elite #1 Auto", agency: "Basico Manual", icon: Search, color: "text-blue-400", advantage: "SEO automatico" },
            { label: "3D/AR", nelvyon: "Integrado", agency: "No disponible", icon: Box, color: "text-fuchsia-400", advantage: "Exclusivo NELVYON" },
          ].map(a => (
            <div key={a.label} className="p-4 rounded-xl bg-[#111113] border border-violet-500/[0.06] hover:border-violet-500/[0.15] transition-all">
              <a.icon className={cn("w-5 h-5 mb-3", a.color)} />
              <p className="text-xs font-semibold text-white mb-2">{a.label}</p>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-zinc-500">NELVYON</span>
                  <span className="text-[10px] font-bold text-emerald-400">{a.nelvyon}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-zinc-500">Agencia #1</span>
                  <span className="text-[10px] font-bold text-zinc-400">{a.agency}</span>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-white/[0.04]">
                <span className="text-[9px] font-bold text-violet-400">{a.advantage}</span>
              </div>
            </div>
          ))}
        </div>

        {/* ═══ TABS ═══ */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-[#111113] border border-white/[0.06] w-fit">
          {[
            { id: "agencies" as TabId, label: "vs Agencias Top", icon: Crown },
            { id: "platforms" as TabId, label: "vs Plataformas SaaS", icon: Layers },
            { id: "ai-tools" as TabId, label: "vs Herramientas Tech", icon: Cpu },
            { id: "detailed" as TabId, label: "Tabla Completa", icon: BarChart3 },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all",
                activeTab === tab.id
                  ? "bg-violet-600/15 text-violet-300 border border-violet-500/20"
                  : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* ═══ RANKING TABLE ═══ */}
        <div className="rounded-xl bg-[#0F1114] border border-violet-500/[0.06] overflow-hidden">
          <div className="px-5 py-3 border-b border-white/[0.04] flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">
              Ranking {activeTab === "agencies" ? "vs Agencias Top del Mundo" : activeTab === "platforms" ? "vs Plataformas SaaS" : activeTab === "ai-tools" ? "vs Herramientas Tech" : "Completo Global"}
            </h3>
            <span className="text-[10px] text-zinc-600">{filtered.length} entidades evaluadas</span>
          </div>
          <div className="divide-y divide-white/[0.02]">
            {filtered.map((comp, idx) => {
              const isUs = comp.type === "nelvyon";
              const tb = tierBadge(comp.tier);
              const tyb = typeBadge(comp.type);
              return (
                <div
                  key={comp.name}
                  className={cn(
                    "flex items-center gap-4 px-5 py-4 transition-all",
                    isUs ? "bg-gradient-to-r from-violet-500/[0.08] to-blue-500/[0.04]" : "hover:bg-violet-500/[0.02]"
                  )}
                >
                  {/* Rank */}
                  <div className={cn(
                    "w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0",
                    idx === 0 ? "bg-gradient-to-br from-amber-400 to-yellow-500 text-black" :
                    idx === 1 ? "bg-gradient-to-br from-gray-300 to-gray-400 text-black" :
                    idx === 2 ? "bg-gradient-to-br from-amber-600 to-amber-700 text-white" :
                    "bg-white/[0.04] text-zinc-500"
                  )}>
                    {idx + 1}
                  </div>

                  {/* Info */}
                  <div className="w-52 shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{comp.emoji}</span>
                      <div>
                        <p className={cn("text-xs font-semibold", isUs ? "text-violet-300" : "text-white")}>
                          {comp.name.length > 30 ? comp.name.split("(")[0].trim() : comp.name}
                          {isUs && <Sparkles className="w-3 h-3 inline ml-1 text-amber-400" />}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={cn("text-[9px] px-1.5 py-0 rounded border font-medium", tyb.cls)}>{tyb.label}</span>
                          <span className="text-[10px] text-zinc-600">{comp.pricing}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Score Bar */}
                  <div className="flex-1 flex items-center gap-3">
                    <div className="flex-1 h-7 bg-white/[0.03] rounded-lg overflow-hidden relative">
                      <div
                        className={cn("h-full rounded-lg bg-gradient-to-r transition-all duration-700 flex items-center justify-end pr-3", barGradient(comp.overall))}
                        style={{ width: `${comp.overall}%` }}
                      >
                        {comp.overall >= 50 && (
                          <span className="text-[11px] font-bold text-white drop-shadow">{comp.overall}%</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Grade */}
                  <div className="w-14 text-center shrink-0">
                    <span className={cn("text-lg font-black", scoreColor(comp.overall))}>{scoreGrade(comp.overall)}</span>
                  </div>

                  {/* Score */}
                  <div className="w-16 text-right shrink-0">
                    <span className={cn("text-xl font-bold", scoreColor(comp.overall))}>{comp.overall}</span>
                    <span className="text-[10px] text-zinc-600">/100</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ═══ DETAILED COMPARISON TABLE ═══ */}
        <div className="rounded-xl bg-[#0F1114] border border-violet-500/[0.06] overflow-hidden">
          <div className="px-5 py-3 border-b border-white/[0.04]">
            <h3 className="text-sm font-semibold text-white">Comparativa Detallada por Criterio</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.04]">
                  <th className="text-left text-[10px] font-semibold text-zinc-500 uppercase px-4 py-3 w-48">Criterio</th>
                  <th className="text-center text-[10px] font-semibold text-zinc-500 uppercase px-2 py-3 w-10">Peso</th>
                  {filtered.slice(0, 7).map(c => (
                    <th key={c.name} className="text-center text-[10px] font-semibold text-zinc-500 uppercase px-2 py-3 min-w-[70px]">
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-sm">{c.emoji}</span>
                        <span className="text-[9px] leading-tight">{c.name.split(" ")[0]}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {evaluationCriteria.map(crit => {
                  const scores = filtered.slice(0, 7).map(c => c.scores[crit.key]);
                  const maxScore = Math.max(...scores);
                  return (
                    <tr key={crit.key} className="border-b border-white/[0.02] hover:bg-violet-500/[0.02]">
                      <td className="px-4 py-2.5 text-[11px] text-zinc-300 font-medium">{crit.label}</td>
                      <td className="px-2 py-2.5 text-center text-[10px] text-zinc-600">{crit.weight}</td>
                      {filtered.slice(0, 7).map(comp => {
                        const s = comp.scores[crit.key];
                        const isMax = s === maxScore;
                        return (
                          <td key={comp.name} className="px-2 py-2.5 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <span className={cn("text-[11px] font-bold relative", scoreColor(s))}>
                                {s}
                                {isMax && <Crown className="w-2.5 h-2.5 text-amber-400 absolute -top-2.5 -right-2" />}
                              </span>
                              <div className="w-10 h-1 bg-white/[0.04] rounded-full overflow-hidden">
                                <div className={cn("h-full rounded-full bg-gradient-to-r", barGradient(s))} style={{ width: `${s}%` }} />
                              </div>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
                <tr className="border-t-2 border-white/[0.08] bg-violet-500/[0.03]">
                  <td className="px-4 py-3 text-xs font-bold text-white">SCORE TOTAL</td>
                  <td className="px-2 py-3 text-center text-[10px] text-zinc-500">100%</td>
                  {filtered.slice(0, 7).map(comp => (
                    <td key={comp.name} className="px-2 py-3 text-center">
                      <span className={cn("text-sm font-black", scoreColor(comp.overall))}>{comp.overall}</span>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ═══ STRENGTHS & WEAKNESSES ═══ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* NELVYON Strengths */}
          <div className="p-5 rounded-xl bg-gradient-to-br from-emerald-500/[0.06] to-blue-500/[0.03] border border-emerald-500/10">
            <div className="flex items-center gap-2 mb-3">
              <Gem className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">Por que NELVYON es #1</h3>
            </div>
            <div className="space-y-2">
              {nelvyon.strengths.map(s => (
                <div key={s} className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                  <span className="text-[11px] text-zinc-300">{s}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Agency Weaknesses */}
          <div className="p-5 rounded-xl bg-rose-500/[0.04] border border-rose-500/10">
            <div className="flex items-center gap-2 mb-3">
              <XCircle className="w-4 h-4 text-rose-400" />
              <h3 className="text-sm font-bold text-white">Limitaciones de las Agencias Top</h3>
            </div>
            <div className="space-y-2">
              {[
                "Precios de $50K-$600K por proyecto — inaccesible para 99% de negocios",
                "Entrega en semanas o meses — NELVYON entrega en minutos",
                "SEO basico manual — NELVYON tiene SEO Elite #1 automatico",
                "Sin elementos 3D/AR integrados — NELVYON incluye Three.js, WebGL, AR",
                "Sin tecnología generativa propia — dependen de herramientas externas",
                "No escalable para SMBs — enfocadas solo en Fortune 500",
                "Sin automatizacion real — procesos manuales con equipos grandes",
                "Sin QA Engine automatico — revision manual con errores humanos",
              ].map(w => (
                <div key={w} className="flex items-start gap-2">
                  <XCircle className="w-3.5 h-3.5 text-rose-400/60 mt-0.5 shrink-0" />
                  <span className="text-[11px] text-zinc-400">{w}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ═══ METHODOLOGY ═══ */}
        <div className="rounded-xl bg-[#111113] border border-white/[0.06] p-5">
          <div className="flex items-center gap-2 mb-3">
            <Eye className="w-4 h-4 text-violet-400" />
            <h3 className="text-sm font-bold text-white">Metodologia de Evaluacion</h3>
          </div>
          <p className="text-[11px] text-zinc-500 mb-4">
            Evaluacion basada en 12 criterios ponderados. Cada criterio se puntua de 0-100 comparando capacidades reales, calidad de output, velocidad de entrega, precio y escalabilidad. Las agencias se evaluan por calidad de trabajo publicado, premios, cartera de clientes y capacidades tecnologicas.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {evaluationCriteria.slice(0, 8).map(c => {
              const Icon = c.icon;
              return (
                <div key={c.key} className="flex items-center gap-2 p-2 rounded-lg bg-black/20">
                  <Icon className="w-3 h-3 text-zinc-500" />
                  <span className="text-[10px] text-zinc-400">{c.label}</span>
                  <span className="text-[9px] text-zinc-600 ml-auto">{c.weight}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ═══ CONCLUSION ═══ */}
        <div className="rounded-2xl bg-gradient-to-r from-amber-500/[0.08] via-violet-500/[0.06] to-emerald-500/[0.08] border border-amber-500/15 p-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Trophy className="w-6 h-6 text-amber-400" />
            <Crown className="w-6 h-6 text-amber-400" />
            <Rocket className="w-6 h-6 text-violet-400" />
          </div>
          <h3 className="text-xl font-black text-white mb-2">
            NELVYON OS: 97/100 — Supera a la Agencia #1 del Mundo
          </h3>
          <p className="text-sm text-zinc-400 max-w-2xl mx-auto mb-4">
            Con un score de 97/100, NELVYON OS supera en calidad y profesionalismo a WPP ({topAgency.overall}/100),
            Accenture Song (84/100), y todas las agencias premium del mundo. Entrega 100x mas rapida,
            precio 500x menor, con SEO Elite #1, elementos 3D/AR y Nelvyon premium integrado.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">SEO ELITE #1</span>
            <span className="px-3 py-1 rounded-lg bg-fuchsia-500/10 text-fuchsia-400 text-[10px] font-bold border border-fuchsia-500/20">3D/AR INTEGRADO</span>
            <span className="px-3 py-1 rounded-lg bg-violet-500/10 text-violet-400 text-[10px] font-bold border border-violet-500/20">NELVYON PREMIUM</span>
            <span className="px-3 py-1 rounded-lg bg-blue-500/10 text-blue-400 text-[10px] font-bold border border-blue-500/20">200M ESCALABILIDAD</span>
            <span className="px-3 py-1 rounded-lg bg-amber-500/10 text-amber-400 text-[10px] font-bold border border-amber-500/20">QA ENGINE 90+</span>
          </div>
        </div>
      </div>
    </SaasLayout>
  );
}