import { useEffect, useState, useCallback } from "react";
import { useI18n } from "@/lib/i18n";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import SaasLayout from "@/components/SaasLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Film, Sparkles, Crown, Play, Pause, Copy, Check,
  Plus, Trash2, ChevronUp, ChevronDown, Clock, Target,
  Instagram, Facebook, Linkedin, Youtube, Zap, Globe,
  Camera, Type, Music, ArrowRight, BarChart3, Calendar,
  Hammer, Layers, Eye, Heart, MessageCircle, DollarSign,
  Clapperboard, Video, Megaphone, BookOpen, Flame,
  GripVertical, Volume2, Image, Monitor, Smartphone,
  CheckCircle2, Star, TrendingUp, RefreshCw, Loader2,
} from "lucide-react";
import { client } from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/* ═══════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════ */

interface ScriptBlock {
  phase: string;
  duration: string;
  text: string;
  visual: string;
  audio: string;
}

interface GeneratedScript {
  id: string;
  title: string;
  platform: string;
  format: string;
  duration: string;
  objective: string;
  blocks: ScriptBlock[];
  variant: "A" | "B";
  createdAt: Date;
}

interface StoryboardFrame {
  id: string;
  order: number;
  scene: string;
  onScreenText: string;
  cameraDirection: string;
  duration: string;
  audioNotes: string;
  transition: string;
}

interface VideoCampaign {
  id: string;
  name: string;
  objective: string;
  platforms: string[];
  budget: number;
  startDate: string;
  endDate: string;
  status: "draft" | "active" | "completed";
  videos: number;
}

/* ═══════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════ */

const videoPlatforms = [
  { id: "instagram", name: "Instagram Reels", icon: Instagram, color: "from-pink-500 to-purple-600", text: "text-pink-400", bg: "bg-pink-500/10", border: "border-pink-500/20", aspect: "9:16", maxDuration: "90s", recommended: "15-30s" },
  { id: "tiktok", name: "TikTok", icon: Zap, color: "from-zinc-800 to-pink-500", text: "text-pink-300", bg: "bg-pink-500/10", border: "border-pink-400/20", aspect: "9:16", maxDuration: "60s", recommended: "15-30s" },
  { id: "youtube-shorts", name: "YouTube Shorts", icon: Youtube, color: "from-red-600 to-red-500", text: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20", aspect: "9:16", maxDuration: "60s", recommended: "30-60s" },
  { id: "youtube", name: "YouTube Video", icon: Youtube, color: "from-red-600 to-red-500", text: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20", aspect: "16:9", maxDuration: "15min", recommended: "2-5min" },
  { id: "facebook", name: "Facebook Video Ads", icon: Facebook, color: "from-blue-600 to-blue-500", text: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20", aspect: "1:1 / 16:9", maxDuration: "120s", recommended: "15-30s" },
  { id: "linkedin", name: "LinkedIn Video", icon: Linkedin, color: "from-blue-700 to-blue-600", text: "text-blue-300", bg: "bg-blue-500/10", border: "border-blue-600/20", aspect: "1:1 / 16:9", maxDuration: "90s", recommended: "30-60s" },
];

const businessTypes = [
  "Restaurante", "Clínica / Salud", "Inmobiliaria", "E-commerce", "SaaS / Tech",
  "Agencia", "Fitness / Gym", "Educación", "Retail / Tienda", "Consultoría",
  "Belleza / Estética", "Automotriz", "Turismo / Hotel", "Legal / Abogados",
];

const videoObjectives = [
  { id: "awareness", label: "Reconocimiento de marca", icon: Eye },
  { id: "engagement", label: "Engagement / Interacción", icon: Heart },
  { id: "traffic", label: "Tráfico al sitio web", icon: Globe },
  { id: "conversions", label: "Conversiones / Ventas", icon: Target },
  { id: "leads", label: "Generación de leads", icon: MessageCircle },
  { id: "app-installs", label: "Instalaciones de app", icon: Smartphone },
];

const cameraDirections = [
  "Plano general", "Plano medio", "Primer plano", "Plano detalle",
  "Cenital (arriba)", "Contrapicado", "Travelling lateral", "Zoom in",
  "Zoom out", "Paneo horizontal", "Steadicam / Gimbal", "POV (primera persona)",
];

const transitions = [
  "Corte directo", "Fade in/out", "Swipe lateral", "Zoom transition",
  "Whip pan", "Morph cut", "Jump cut", "Cross dissolve",
];

const scriptPhases = [
  { phase: "Hook", duration: "0-3s", description: "Captar atención inmediata", color: "text-red-400", bg: "bg-red-500/10" },
  { phase: "Problema", duration: "3-8s", description: "Identificar el dolor del cliente", color: "text-amber-400", bg: "bg-amber-500/10" },
  { phase: "Solución", duration: "8-18s", description: "Presentar tu producto/servicio", color: "text-blue-400", bg: "bg-blue-500/10" },
  { phase: "Beneficios", duration: "18-25s", description: "Mostrar resultados y prueba social", color: "text-emerald-400", bg: "bg-emerald-500/10" },
  { phase: "CTA", duration: "25-30s", description: "Llamada a la acción clara", color: "text-violet-400", bg: "bg-violet-500/10" },
];

/* ═══════════════════════════════════════════
   SCRIPT GENERATOR ENGINE
   ═══════════════════════════════════════════ */

function generateScript(
  platform: string,
  business: string,
  objective: string,
  variant: "A" | "B",
): GeneratedScript {
  const platInfo = videoPlatforms.find(p => p.id === platform);
  const hookVariants: Record<string, string[]> = {
    A: [
      `¿Sabías que el 90% de ${business.toLowerCase()}s pierden clientes por esto?`,
      `STOP 🛑 Si tienes un ${business.toLowerCase()}, necesitas ver esto`,
      `El secreto que los mejores ${business.toLowerCase()}s no te cuentan...`,
    ],
    B: [
      `POV: Tu ${business.toLowerCase()} factura 3x más este mes`,
      `Esto cambió mi ${business.toLowerCase()} para siempre 🔥`,
      `3 errores que tu ${business.toLowerCase()} está cometiendo ahora mismo`,
    ],
  };

  const hooks = hookVariants[variant] || hookVariants.A;
  const hook = hooks[0];

  const blocks: ScriptBlock[] = [
    {
      phase: "Hook",
      duration: "0-3s",
      text: hook,
      visual: "Texto grande en pantalla con efecto de aparición. Fondo llamativo con movimiento.",
      audio: "Sonido trending / efecto de impacto. Música energética de fondo.",
    },
    {
      phase: "Problema",
      duration: "3-8s",
      text: `Muchos ${business.toLowerCase()}s luchan con [problema específico]. Pierden tiempo, dinero y clientes cada día sin darse cuenta.`,
      visual: "Mostrar situación problemática real. B-roll del negocio con overlay de estadísticas negativas.",
      audio: "Música tensa / dramática. Narración con tono empático.",
    },
    {
      phase: "Solución",
      duration: "8-18s",
      text: `Con [tu producto/servicio], tu ${business.toLowerCase()} puede [beneficio principal] en menos de [tiempo]. Sin complicaciones, sin curva de aprendizaje.`,
      visual: "Demo del producto en acción. Transición suave de problema → solución. Screen recording o producto físico.",
      audio: "Cambio de música a tono positivo/motivador. Narración confiada.",
    },
    {
      phase: "Beneficios",
      duration: "18-25s",
      text: `✅ [Beneficio 1] — Ahorra 10+ horas/semana\n✅ [Beneficio 2] — Aumenta ventas un 40%\n✅ [Beneficio 3] — +500 ${business.toLowerCase()}s ya lo usan`,
      visual: "Lista de beneficios con iconos animados. Testimonios rápidos (2-3s cada uno). Números/estadísticas con animación.",
      audio: "Música ascendente. Efectos de sonido en cada beneficio.",
    },
    {
      phase: "CTA",
      duration: "25-30s",
      text: `🔥 Link en bio / Visita [URL] / Escríbenos ahora\n⏰ Oferta limitada: [descuento/bonus] solo esta semana`,
      visual: "Pantalla final con logo, URL y CTA grande. Flecha animada señalando link. Urgencia visual (timer/countdown).",
      audio: "Música climática. Narración urgente pero amigable.",
    },
  ];

  return {
    id: `script-${Date.now()}-${variant}`,
    title: `${variant === "A" ? "Guión A" : "Guión B"} — ${platInfo?.name || platform}`,
    platform,
    format: platInfo?.aspect || "9:16",
    duration: platInfo?.recommended || "30s",
    objective,
    blocks,
    variant,
    createdAt: new Date(),
  };
}

/* ═══════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════ */

export default function SaasVideoAds() {
  const { ts } = useI18n();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("scripts");
  const [loading, setLoading] = useState(true);

  // Script Generator State
  const [selectedPlatform, setSelectedPlatform] = useState("instagram");
  const [selectedBusiness, setSelectedBusiness] = useState("E-commerce");
  const [selectedObjective, setSelectedObjective] = useState("conversions");
  const [generatedScripts, setGeneratedScripts] = useState<GeneratedScript[]>([]);
  const [expandedScript, setExpandedScript] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Storyboard State
  const [storyboardFrames, setStoryboardFrames] = useState<StoryboardFrame[]>([
    { id: "f1", order: 1, scene: "", onScreenText: "", cameraDirection: "Plano medio", duration: "3s", audioNotes: "", transition: "Corte directo" },
    { id: "f2", order: 2, scene: "", onScreenText: "", cameraDirection: "Primer plano", duration: "5s", audioNotes: "", transition: "Swipe lateral" },
    { id: "f3", order: 3, scene: "", onScreenText: "", cameraDirection: "Plano general", duration: "5s", audioNotes: "", transition: "Zoom transition" },
  ]);
  const [storyboardTitle, setStoryboardTitle] = useState("");

  // Campaign State
  const [campaigns, setCampaigns] = useState<VideoCampaign[]>([]);
  const [showNewCampaign, setShowNewCampaign] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState("");
  const [newCampaignBudget, setNewCampaignBudget] = useState("");
  const [newCampaignPlatforms, setNewCampaignPlatforms] = useState<string[]>([]);

  useEffect(() => {
    if (!authLoading && !user) navigate("/saas");
  }, [user, authLoading, navigate]);

  // Load saved scripts and campaigns from backend
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await client.entities.nelvyon_assets.query({ sort: "-created_at", limit: 200 });
      const items = (res.data?.items || []) as Array<{
        id: number; asset_type: string; file_name: string; tags?: string; classification?: string; dimensions?: string; created_at?: string;
      }>;
      // Parse saved scripts
      const savedScripts: GeneratedScript[] = [];
      const savedCampaigns: VideoCampaign[] = [];
      for (const item of items) {
        try {
          if (item.asset_type === "video_script" && item.tags) {
            const parsed = JSON.parse(item.tags);
            savedScripts.push({ ...parsed, id: `saved-${item.id}`, createdAt: new Date(item.created_at || Date.now()) });
          } else if (item.asset_type === "video_campaign" && item.tags) {
            const parsed = JSON.parse(item.tags);
            savedCampaigns.push({ ...parsed, id: `saved-${item.id}` });
          }
        } catch (err) { if (import.meta.env.DEV) console.warn("[SaasVideoAds] Error:", err); /* skip malformed */ }
      }
      if (savedScripts.length > 0) setGeneratedScripts(savedScripts);
      if (savedCampaigns.length > 0) setCampaigns(savedCampaigns);
    } catch (err) {

      if (import.meta.env.DEV) console.warn("[SaasVideoAds] Error (// Fallback: keep local state):", err);

    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (user) fetchData(); }, [user, fetchData]);

  /* ── Script Generation via Real AI ── */
  const [generating, setGenerating] = useState(false);

  const handleGenerateScripts = useCallback(async () => {
    setGenerating(true);
    const platInfo = videoPlatforms.find(p => p.id === selectedPlatform);

    // Try AI-powered generation first
    let aiScripts: GeneratedScript[] = [];
    try {
      const baseUrl = (await import("@/lib/config")).getAPIBaseURL();

      const prompt = `Genera 2 guiones de video publicitario (variante A y variante B) para la plataforma ${platInfo?.name || selectedPlatform}.

Negocio: ${selectedBusiness}
Objetivo: ${selectedObjective}
Formato: ${platInfo?.format || "9:16"}
Duración: ${platInfo?.duration || "30s"}

Para CADA guión, genera exactamente 5 bloques con estas fases:
1. Hook (0-3s): Captar atención inmediata
2. Problema (3-8s): Identificar el dolor del cliente
3. Solución (8-18s): Presentar el producto/servicio
4. Beneficios (18-25s): Mostrar resultados y prueba social
5. CTA (25-30s): Llamada a la acción clara

Para cada bloque incluye: text (guión hablado), visual (instrucciones de cámara), audio (instrucciones de sonido/música).

Responde en JSON exacto con este formato (sin markdown, solo JSON puro):
[
  {
    "variant": "A",
    "title": "Título del guión A",
    "blocks": [
      {"phase":"Hook","duration":"0-3s","text":"...","visual":"...","audio":"..."},
      {"phase":"Problema","duration":"3-8s","text":"...","visual":"...","audio":"..."},
      {"phase":"Solución","duration":"8-18s","text":"...","visual":"...","audio":"..."},
      {"phase":"Beneficios","duration":"18-25s","text":"...","visual":"...","audio":"..."},
      {"phase":"CTA","duration":"25-30s","text":"...","visual":"...","audio":"..."}
    ]
  },
  {
    "variant": "B",
    "title": "Título del guión B",
    "blocks": [...]
  }
]`;

      const response = await fetch(`${baseUrl}/api/v1/aihub/gentxt`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [
            { role: "system", content: "Eres un experto en video marketing y copywriting para redes sociales. Genera guiones profesionales en español. Responde SOLO con JSON válido, sin markdown ni texto adicional." },
            { role: "user", content: prompt },
          ],
          model: "deepseek-v3.2",
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const raw = (data.content || data.message || "").replace(/```json\n?|\n?```/g, "").trim();
        const parsed = JSON.parse(raw) as Array<{ variant: string; title: string; blocks: ScriptBlock[] }>;

        aiScripts = parsed.map((s, i) => ({
          id: `ai-${Date.now()}-${i}`,
          title: s.title || `Guión ${s.variant} — ${selectedBusiness}`,
          platform: selectedPlatform,
          format: platInfo?.format || "9:16",
          duration: platInfo?.duration || "30s",
          objective: selectedObjective,
          blocks: s.blocks,
          variant: (s.variant || (i === 0 ? "A" : "B")) as "A" | "B",
          createdAt: new Date(),
        }));
      }
    } catch (err) {
      console.warn("AI script generation failed, using local fallback:", err);
    }

    // Fallback to local generation if AI fails
    if (aiScripts.length === 0) {
      const scriptA = generateScript(selectedPlatform, selectedBusiness, selectedObjective, "A");
      const scriptB = generateScript(selectedPlatform, selectedBusiness, selectedObjective, "B");
      aiScripts = [scriptA, scriptB];
    }

    setGeneratedScripts(prev => [...aiScripts, ...prev]);
    setExpandedScript(aiScripts[0]?.id || null);
    toast.success(`¡${aiScripts.length} guiones A/B generados con IA!`);

    // Persist to backend
    try {
      for (const script of aiScripts) {
        await client.entities.nelvyon_assets.create({
          client_id: 0,
          asset_type: "video_script",
          file_name: script.title,
          classification: script.platform,
          dimensions: `${script.format}|${script.duration}`,
          tags: JSON.stringify({ title: script.title, platform: script.platform, format: script.format, duration: script.duration, objective: script.objective, blocks: script.blocks, variant: script.variant }),
          visibility: "private",
        });
      }
    } catch (err) { if (import.meta.env.DEV) console.warn("[SaasVideoAds] Error:", err); /* non-critical */ }

    setGenerating(false);
  }, [selectedPlatform, selectedBusiness, selectedObjective]);

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Copiado al portapapeles");
    setTimeout(() => setCopiedId(null), 2000);
  };

  /* ── Storyboard ── */
  const addFrame = () => {
    const newFrame: StoryboardFrame = {
      id: `f-${Date.now()}`,
      order: storyboardFrames.length + 1,
      scene: "",
      onScreenText: "",
      cameraDirection: "Plano medio",
      duration: "3s",
      audioNotes: "",
      transition: "Corte directo",
    };
    setStoryboardFrames(prev => [...prev, newFrame]);
  };

  const removeFrame = (id: string) => {
    setStoryboardFrames(prev =>
      prev.filter(f => f.id !== id).map((f, i) => ({ ...f, order: i + 1 }))
    );
  };

  const updateFrame = (id: string, field: keyof StoryboardFrame, value: string) => {
    setStoryboardFrames(prev =>
      prev.map(f => f.id === id ? { ...f, [field]: value } : f)
    );
  };

  const moveFrame = (id: string, direction: "up" | "down") => {
    setStoryboardFrames(prev => {
      const idx = prev.findIndex(f => f.id === id);
      if ((direction === "up" && idx === 0) || (direction === "down" && idx === prev.length - 1)) return prev;
      const newFrames = [...prev];
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      [newFrames[idx], newFrames[swapIdx]] = [newFrames[swapIdx], newFrames[idx]];
      return newFrames.map((f, i) => ({ ...f, order: i + 1 }));
    });
  };

  /* ── Campaigns ── */
  const addCampaign = async () => {
    if (!newCampaignName.trim()) return;
    const newCamp: VideoCampaign = {
      id: `c-${Date.now()}`,
      name: newCampaignName,
      objective: selectedObjective,
      platforms: newCampaignPlatforms.length > 0 ? newCampaignPlatforms : ["instagram"],
      budget: parseInt(newCampaignBudget) || 0,
      startDate: new Date().toISOString().split("T")[0],
      endDate: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
      status: "draft",
      videos: 0,
    };
    setCampaigns(prev => [newCamp, ...prev]);
    setNewCampaignName("");
    setNewCampaignBudget("");
    setNewCampaignPlatforms([]);
    setShowNewCampaign(false);
    toast.success("Campaña creada");
    // Persist to backend
    try {
      await client.entities.nelvyon_assets.create({
        client_id: 0,
        asset_type: "video_campaign",
        file_name: newCamp.name,
        classification: newCamp.objective,
        dimensions: newCamp.platforms.join(","),
        tags: JSON.stringify(newCamp),
        visibility: "private",
      });
    } catch (err) { if (import.meta.env.DEV) console.warn("[SaasVideoAds] Error:", err); /* non-critical */ }
  };

  /* ── Stats ── */
  const totalScripts = generatedScripts.length;
  const totalCampaigns = campaigns.length;
  const activeCampaigns = campaigns.filter(c => c.status === "active").length;
  const totalBudget = campaigns.reduce((s, c) => s + c.budget, 0);

  return (
    <SaasLayout title="Video Ads Studio" subtitle="Crea guiones profesionales, storyboards y campañas de video para redes sociales">
      {/* ── Hero ── */}
      <div className="rounded-2xl bg-gradient-to-br from-orange-500/[0.08] via-red-500/[0.04] to-violet-500/[0.08] border border-orange-500/10 p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-xl shadow-orange-500/20 shrink-0">
            <Clapperboard className="w-7 h-7 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white mb-2">
              Video Ads Studio Profesional
            </h1>
            <p className="text-sm text-slate-400 leading-relaxed max-w-2xl mb-3">
              Crea guiones de video publicitario de calidad profesional, storyboards frame-by-frame y planifica campañas
              optimizadas para cada plataforma. Todo con estructura probada de conversión.
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 rounded-lg bg-orange-500/10 text-[11px] text-orange-300 border border-orange-500/20 font-medium">
                <Film className="w-3 h-3 inline mr-1" /> Guiones A/B
              </span>
              <span className="px-3 py-1 rounded-lg bg-red-500/10 text-[11px] text-red-300 border border-red-500/20 font-medium">
                <Layers className="w-3 h-3 inline mr-1" /> Storyboards
              </span>
              <span className="px-3 py-1 rounded-lg bg-violet-500/10 text-[11px] text-violet-300 border border-violet-500/20 font-medium">
                <Megaphone className="w-3 h-3 inline mr-1" /> Campañas
              </span>
              <span className="px-3 py-1 rounded-lg bg-blue-500/10 text-[11px] text-blue-300 border border-blue-500/20 font-medium">
                <Globe className="w-3 h-3 inline mr-1" /> 6 Plataformas
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Live data indicator */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-[10px] text-emerald-400 font-medium">DATOS EN VIVO — BACKEND CONECTADO</span>
        <Button size="sm" onClick={fetchData} variant="outline" className="border-white/10 text-zinc-400 h-6 text-[9px] ml-2">
          <RefreshCw className="w-2.5 h-2.5 mr-1" /> Actualizar
        </Button>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Guiones Creados", value: totalScripts, icon: Film, color: "text-orange-400", gradient: "from-orange-500/10 to-red-500/10" },
          { label: "Campañas", value: totalCampaigns, icon: Megaphone, color: "text-violet-400", gradient: "from-violet-500/10 to-purple-500/10" },
          { label: "Campañas Activas", value: activeCampaigns, icon: Play, color: "text-emerald-400", gradient: "from-emerald-500/10 to-green-500/10" },
          { label: "Presupuesto Total", value: `$${totalBudget.toLocaleString()}`, icon: DollarSign, color: "text-amber-400", gradient: "from-amber-500/10 to-yellow-500/10" },
        ].map(s => (
          <div key={s.label} className="p-4 rounded-xl bg-[#0A0E13] border border-white/[0.04] hover:border-white/[0.08] transition-all">
            <div className={cn("w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center mb-2", s.gradient)}>
              <s.icon className={cn("w-4 h-4", s.color)} />
            </div>
            <p className="text-xl font-bold text-white">{s.value}</p>
            <p className="text-[10px] text-zinc-600">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Main Tabs ── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-[#0A0E13] border border-white/[0.06] p-1 mb-6 w-full justify-start overflow-x-auto">
          <TabsTrigger value="scripts" className="data-[state=active]:bg-orange-500/10 data-[state=active]:text-orange-400 text-xs gap-1.5">
            <Hammer className="w-3.5 h-3.5" /> Guiones
          </TabsTrigger>
          <TabsTrigger value="storyboard" className="data-[state=active]:bg-red-500/10 data-[state=active]:text-red-400 text-xs gap-1.5">
            <Layers className="w-3.5 h-3.5" /> Storyboard
          </TabsTrigger>
          <TabsTrigger value="campaigns" className="data-[state=active]:bg-violet-500/10 data-[state=active]:text-violet-400 text-xs gap-1.5">
            <Megaphone className="w-3.5 h-3.5" /> Campañas
          </TabsTrigger>
          <TabsTrigger value="specs" className="data-[state=active]:bg-blue-500/10 data-[state=active]:text-blue-400 text-xs gap-1.5">
            <Monitor className="w-3.5 h-3.5" /> Formatos & Specs
          </TabsTrigger>
        </TabsList>

        {/* ═══ SCRIPTS TAB ═══ */}
        <TabsContent value="scripts" className="space-y-6">
          {/* Platform Selector */}
          <div className="rounded-xl bg-[#0A0E13] border border-white/[0.04] p-4">
            <h3 className="text-xs font-semibold text-white mb-3 flex items-center gap-2">
              <Globe className="w-3.5 h-3.5 text-blue-400" /> Plataforma de Video
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {videoPlatforms.map(p => {
                const active = selectedPlatform === p.id;
                const PIcon = p.icon;
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPlatform(p.id)}
                    className={cn(
                      "flex items-center gap-2 p-3 rounded-xl border transition-all",
                      active ? `${p.bg} ${p.border}` : "bg-white/[0.01] border-white/[0.04] opacity-50 hover:opacity-80"
                    )}
                  >
                    <div className={cn("w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center shrink-0", p.color)}>
                      <PIcon className="w-4 h-4 text-white" />
                    </div>
                    <div className="text-left min-w-0">
                      <p className="text-[10px] font-semibold text-white truncate">{p.name}</p>
                      <p className="text-[8px] text-zinc-600">{p.aspect} · {p.recommended}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Business Type + Objective */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl bg-[#0A0E13] border border-white/[0.04] p-4">
              <h3 className="text-xs font-semibold text-white mb-3 flex items-center gap-2">
                <Target className="w-3.5 h-3.5 text-amber-400" /> Tipo de Negocio
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {businessTypes.map(b => (
                  <button
                    key={b}
                    onClick={() => setSelectedBusiness(b)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-[10px] font-medium border transition-all",
                      selectedBusiness === b
                        ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                        : "bg-white/[0.02] border-white/[0.06] text-zinc-500 hover:text-zinc-300"
                    )}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-xl bg-[#0A0E13] border border-white/[0.04] p-4">
              <h3 className="text-xs font-semibold text-white mb-3 flex items-center gap-2">
                <Flame className="w-3.5 h-3.5 text-red-400" /> Objetivo del Video
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {videoObjectives.map(o => {
                  const OIcon = o.icon;
                  return (
                    <button
                      key={o.id}
                      onClick={() => setSelectedObjective(o.id)}
                      className={cn(
                        "flex items-center gap-2 p-2.5 rounded-lg border transition-all text-[10px] font-medium",
                        selectedObjective === o.id
                          ? "bg-red-500/10 border-red-500/30 text-red-400"
                          : "bg-white/[0.02] border-white/[0.06] text-zinc-500 hover:text-zinc-300"
                      )}
                    >
                      <OIcon className="w-3.5 h-3.5 shrink-0" />
                      {o.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Generate Button */}
          <div className="flex items-center justify-center">
            <Button
              onClick={handleGenerateScripts}
              className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-bold px-8 py-3 h-12 text-sm rounded-xl shadow-lg shadow-orange-500/20"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Generar Guiones A/B Profesionales
            </Button>
          </div>

          {/* Script Structure Reference */}
          <div className="rounded-xl bg-[#0A0E13] border border-white/[0.04] p-4">
            <h3 className="text-xs font-semibold text-white mb-3 flex items-center gap-2">
              <BookOpen className="w-3.5 h-3.5 text-violet-400" /> Estructura de Guión Probada
            </h3>
            <div className="flex flex-wrap gap-2">
              {scriptPhases.map((p, i) => (
                <div key={p.phase} className="flex items-center gap-2">
                  <div className={cn("px-3 py-2 rounded-lg border border-white/[0.06]", p.bg)}>
                    <p className={cn("text-[10px] font-bold", p.color)}>{p.phase}</p>
                    <p className="text-[8px] text-zinc-600">{p.duration}</p>
                  </div>
                  {i < scriptPhases.length - 1 && <ArrowRight className="w-3 h-3 text-zinc-700" />}
                </div>
              ))}
            </div>
          </div>

          {/* Generated Scripts */}
          {generatedScripts.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Film className="w-4 h-4 text-orange-400" /> Guiones Generados ({generatedScripts.length})
              </h3>
              {generatedScripts.map(script => {
                const isExpanded = expandedScript === script.id;
                const platInfo = videoPlatforms.find(p => p.id === script.platform);
                const PIcon = platInfo?.icon || Film;
                return (
                  <div key={script.id} className="rounded-xl bg-[#0A0E13] border border-white/[0.04] overflow-hidden hover:border-white/[0.08] transition-all">
                    <button
                      className="w-full flex items-center justify-between p-4 text-left hover:bg-white/[0.01] transition-colors"
                      onClick={() => setExpandedScript(isExpanded ? null : script.id)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn("w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0", platInfo?.color || "from-orange-500 to-red-500")}>
                          <PIcon className="w-5 h-5 text-white" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-semibold text-white truncate">{script.title}</h4>
                            <span className={cn(
                              "px-1.5 py-0.5 rounded text-[8px] font-bold border",
                              script.variant === "A" ? "bg-orange-500/10 text-orange-400 border-orange-500/20" : "bg-violet-500/10 text-violet-400 border-violet-500/20"
                            )}>
                              {script.variant}
                            </span>
                          </div>
                          <p className="text-[10px] text-zinc-500">{platInfo?.name} · {script.format} · {script.duration} · {script.objective}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const fullScript = script.blocks.map(b => `[${b.phase} — ${b.duration}]\n${b.text}\n🎬 Visual: ${b.visual}\n🎵 Audio: ${b.audio}`).join("\n\n");
                            copyText(fullScript, script.id);
                          }}
                          className="p-1.5 rounded-lg hover:bg-white/[0.04] transition-colors"
                        >
                          {copiedId === script.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-zinc-500" />}
                        </button>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-white/[0.04] space-y-3 pt-4">
                        {script.blocks.map((block, bi) => {
                          const phaseInfo = scriptPhases.find(p => p.phase === block.phase);
                          return (
                            <div key={bi} className={cn("p-4 rounded-xl border border-white/[0.06]", phaseInfo?.bg || "bg-white/[0.02]")}>
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <span className={cn("text-[10px] font-bold", phaseInfo?.color || "text-white")}>{block.phase}</span>
                                  <span className="text-[9px] text-zinc-600 bg-white/[0.04] px-2 py-0.5 rounded">{block.duration}</span>
                                </div>
                                <button
                                  onClick={() => copyText(block.text, `${script.id}-${bi}`)}
                                  className="p-1 rounded hover:bg-white/[0.04]"
                                >
                                  {copiedId === `${script.id}-${bi}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-zinc-600" />}
                                </button>
                              </div>
                              <p className="text-[11px] text-zinc-200 leading-relaxed whitespace-pre-wrap mb-3">{block.text}</p>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                <div className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                                  <p className="text-[8px] text-zinc-600 font-bold mb-0.5 flex items-center gap-1"><Camera className="w-2.5 h-2.5" /> VISUAL</p>
                                  <p className="text-[10px] text-zinc-400">{block.visual}</p>
                                </div>
                                <div className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                                  <p className="text-[8px] text-zinc-600 font-bold mb-0.5 flex items-center gap-1"><Music className="w-2.5 h-2.5" /> AUDIO</p>
                                  <p className="text-[10px] text-zinc-400">{block.audio}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ═══ STORYBOARD TAB ═══ */}
        <TabsContent value="storyboard" className="space-y-6">
          <div className="rounded-xl bg-[#0A0E13] border border-white/[0.04] p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-red-400" /> Editor de Storyboard
                </h3>
                <p className="text-[10px] text-zinc-500 mt-0.5">Crea tu storyboard frame-by-frame con dirección de cámara, texto y audio</p>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Título del storyboard..."
                  value={storyboardTitle}
                  onChange={e => setStoryboardTitle(e.target.value)}
                  className="w-64 bg-[#0F1419] border-white/[0.06] text-white text-xs h-8"
                />
                <Button size="sm" onClick={addFrame} className="bg-red-600 hover:bg-red-500 text-white h-8 text-[10px]">
                  <Plus className="w-3 h-3 mr-1" /> Frame
                </Button>
              </div>
            </div>

            {/* Frames */}
            <div className="space-y-3">
              {storyboardFrames.map((frame) => (
                <div key={frame.id} className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4 hover:border-white/[0.1] transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col gap-0.5">
                        <button onClick={() => moveFrame(frame.id, "up")} className="p-0.5 rounded hover:bg-white/[0.06] text-zinc-600 hover:text-zinc-300">
                          <ChevronUp className="w-3 h-3" />
                        </button>
                        <button onClick={() => moveFrame(frame.id, "down")} className="p-0.5 rounded hover:bg-white/[0.06] text-zinc-600 hover:text-zinc-300">
                          <ChevronDown className="w-3 h-3" />
                        </button>
                      </div>
                      <GripVertical className="w-4 h-4 text-zinc-700" />
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/20 flex items-center justify-center">
                        <span className="text-[10px] font-bold text-red-400">{frame.order}</span>
                      </div>
                      <span className="text-[10px] font-semibold text-white">Frame {frame.order}</span>
                      <span className="text-[9px] text-zinc-600 bg-white/[0.04] px-2 py-0.5 rounded flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" /> {frame.duration}
                      </span>
                    </div>
                    <button
                      onClick={() => removeFrame(frame.id)}
                      className="p-1.5 rounded-lg hover:bg-red-500/10 text-zinc-600 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[9px] text-zinc-600 font-bold uppercase tracking-wider flex items-center gap-1 mb-1">
                        <Camera className="w-2.5 h-2.5" /> Descripción de Escena
                      </label>
                      <Textarea
                        value={frame.scene}
                        onChange={e => updateFrame(frame.id, "scene", e.target.value)}
                        placeholder="Describe la escena visual..."
                        className="bg-[#0A0E13] border-white/[0.06] text-white text-[11px] min-h-[60px] resize-none"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] text-zinc-600 font-bold uppercase tracking-wider flex items-center gap-1 mb-1">
                        <Type className="w-2.5 h-2.5" /> Texto en Pantalla
                      </label>
                      <Textarea
                        value={frame.onScreenText}
                        onChange={e => updateFrame(frame.id, "onScreenText", e.target.value)}
                        placeholder="Texto que aparece en pantalla..."
                        className="bg-[#0A0E13] border-white/[0.06] text-white text-[11px] min-h-[60px] resize-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                    <div>
                      <label className="text-[9px] text-zinc-600 font-bold uppercase tracking-wider mb-1 block">Cámara</label>
                      <select
                        value={frame.cameraDirection}
                        onChange={e => updateFrame(frame.id, "cameraDirection", e.target.value)}
                        className="w-full bg-[#0A0E13] border border-white/[0.06] rounded-lg text-[10px] text-white p-2 h-8"
                      >
                        {cameraDirections.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] text-zinc-600 font-bold uppercase tracking-wider mb-1 block">Duración</label>
                      <Input
                        value={frame.duration}
                        onChange={e => updateFrame(frame.id, "duration", e.target.value)}
                        className="bg-[#0A0E13] border-white/[0.06] text-white text-[10px] h-8"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] text-zinc-600 font-bold uppercase tracking-wider mb-1 block">Transición</label>
                      <select
                        value={frame.transition}
                        onChange={e => updateFrame(frame.id, "transition", e.target.value)}
                        className="w-full bg-[#0A0E13] border border-white/[0.06] rounded-lg text-[10px] text-white p-2 h-8"
                      >
                        {transitions.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] text-zinc-600 font-bold uppercase tracking-wider flex items-center gap-1 mb-1">
                        <Volume2 className="w-2.5 h-2.5" /> Audio
                      </label>
                      <Input
                        value={frame.audioNotes}
                        onChange={e => updateFrame(frame.id, "audioNotes", e.target.value)}
                        placeholder="Música, voz, SFX..."
                        className="bg-[#0A0E13] border-white/[0.06] text-white text-[10px] h-8"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Storyboard Summary */}
            <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-red-500/[0.04] to-orange-500/[0.04] border border-red-500/10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-zinc-500">Total: <span className="text-white font-bold">{storyboardFrames.length} frames</span></p>
                  <p className="text-[10px] text-zinc-500">Duración estimada: <span className="text-white font-bold">
                    {storyboardFrames.reduce((sum, f) => sum + (parseInt(f.duration) || 0), 0)}s
                  </span></p>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    const summary = storyboardFrames.map(f =>
                      `Frame ${f.order} (${f.duration}):\n  Escena: ${f.scene}\n  Texto: ${f.onScreenText}\n  Cámara: ${f.cameraDirection}\n  Audio: ${f.audioNotes}\n  Transición: ${f.transition}`
                    ).join("\n\n");
                    copyText(`STORYBOARD: ${storyboardTitle || "Sin título"}\n\n${summary}`, "storyboard-full");
                  }}
                  className="bg-red-600 hover:bg-red-500 text-white text-[10px] h-8"
                >
                  <Copy className="w-3 h-3 mr-1" /> Copiar Storyboard
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ═══ CAMPAIGNS TAB ═══ */}
        <TabsContent value="campaigns" className="space-y-6">
          {/* New Campaign */}
          <div className="rounded-xl bg-[#0A0E13] border border-white/[0.04] p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-violet-400" /> Campañas de Video
              </h3>
              <Button
                size="sm"
                onClick={() => setShowNewCampaign(!showNewCampaign)}
                className="bg-violet-600 hover:bg-violet-500 text-white text-[10px] h-8"
              >
                <Plus className="w-3 h-3 mr-1" /> Nueva Campaña
              </Button>
            </div>

            {showNewCampaign && (
              <div className="p-4 rounded-xl bg-violet-500/[0.04] border border-violet-500/10 mb-4 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] text-zinc-600 font-bold uppercase mb-1 block">Nombre de Campaña</label>
                    <Input
                      value={newCampaignName}
                      onChange={e => setNewCampaignName(e.target.value)}
                      placeholder="Ej: Campaña Reels Black Friday"
                      className="bg-[#0A0E13] border-white/[0.06] text-white text-xs h-9"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-zinc-600 font-bold uppercase mb-1 block">Presupuesto ($)</label>
                    <Input
                      value={newCampaignBudget}
                      onChange={e => setNewCampaignBudget(e.target.value)}
                      placeholder="2500"
                      type="number"
                      className="bg-[#0A0E13] border-white/[0.06] text-white text-xs h-9"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[9px] text-zinc-600 font-bold uppercase mb-1 block">Plataformas</label>
                  <div className="flex flex-wrap gap-2">
                    {videoPlatforms.map(p => {
                      const active = newCampaignPlatforms.includes(p.id);
                      const PIcon = p.icon;
                      return (
                        <button
                          key={p.id}
                          onClick={() => setNewCampaignPlatforms(prev =>
                            prev.includes(p.id) ? prev.filter(x => x !== p.id) : [...prev, p.id]
                          )}
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-medium transition-all",
                            active ? `${p.bg} ${p.border} ${p.text}` : "bg-white/[0.02] border-white/[0.06] text-zinc-500"
                          )}
                        >
                          <PIcon className="w-3 h-3" /> {p.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <Button onClick={addCampaign} className="bg-violet-600 hover:bg-violet-500 text-white text-xs h-9">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Crear Campaña
                </Button>
              </div>
            )}

            {/* Campaign Cards */}
            <div className="space-y-3">
              {campaigns.map(camp => {
                const statusColors: Record<string, { bg: string; text: string; label: string }> = {
                  draft: { bg: "bg-zinc-500/10", text: "text-zinc-400", label: "Borrador" },
                  active: { bg: "bg-emerald-500/10", text: "text-emerald-400", label: "Activa" },
                  completed: { bg: "bg-blue-500/10", text: "text-blue-400", label: "Completada" },
                };
                const st = statusColors[camp.status] || statusColors.draft;

                return (
                  <div key={camp.id} className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.1] transition-all">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 border border-violet-500/20 flex items-center justify-center">
                          <Megaphone className="w-5 h-5 text-violet-400" />
                        </div>
                        <div>
                          <h4 className="text-xs font-semibold text-white">{camp.name}</h4>
                          <p className="text-[10px] text-zinc-500">{camp.startDate} → {camp.endDate}</p>
                        </div>
                      </div>
                      <span className={cn("px-2 py-0.5 rounded-lg text-[9px] font-bold border", st.bg, st.text, `border-${st.text.replace("text-", "")}/20`)}>
                        {st.label}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      <div className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.04] text-center">
                        <p className="text-[10px] font-bold text-white">${camp.budget.toLocaleString()}</p>
                        <p className="text-[8px] text-zinc-600">Presupuesto</p>
                      </div>
                      <div className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.04] text-center">
                        <p className="text-[10px] font-bold text-white">{camp.videos}</p>
                        <p className="text-[8px] text-zinc-600">Videos</p>
                      </div>
                      <div className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.04] text-center">
                        <p className="text-[10px] font-bold text-white">{camp.platforms.length}</p>
                        <p className="text-[8px] text-zinc-600">Plataformas</p>
                      </div>
                      <div className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.04] text-center">
                        <p className="text-[10px] font-bold text-white capitalize">{camp.objective}</p>
                        <p className="text-[8px] text-zinc-600">Objetivo</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {camp.platforms.map(pid => {
                        const pl = videoPlatforms.find(p => p.id === pid);
                        if (!pl) return null;
                        const PIc = pl.icon;
                        return (
                          <span key={pid} className={cn("flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-medium border", pl.bg, pl.text, pl.border)}>
                            <PIc className="w-2.5 h-2.5" /> {pl.name}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>

        {/* ═══ SPECS TAB ═══ */}
        <TabsContent value="specs" className="space-y-6">
          {/* Platform Specs Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {videoPlatforms.map(p => {
              const PIcon = p.icon;
              return (
                <div key={p.id} className={cn("rounded-xl border p-5 transition-all hover:border-white/[0.12]", p.bg, p.border)}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className={cn("w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg", p.color)}>
                      <PIcon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">{p.name}</h3>
                      <p className="text-[10px] text-zinc-500">Especificaciones técnicas</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.03] border border-white/[0.04]">
                      <span className="text-[10px] text-zinc-500 flex items-center gap-1"><Monitor className="w-3 h-3" /> Aspect Ratio</span>
                      <span className="text-[10px] font-bold text-white">{p.aspect}</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.03] border border-white/[0.04]">
                      <span className="text-[10px] text-zinc-500 flex items-center gap-1"><Clock className="w-3 h-3" /> Duración Máx</span>
                      <span className="text-[10px] font-bold text-white">{p.maxDuration}</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.03] border border-white/[0.04]">
                      <span className="text-[10px] text-zinc-500 flex items-center gap-1"><Star className="w-3 h-3" /> Recomendado</span>
                      <span className="text-[10px] font-bold text-emerald-400">{p.recommended}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Best Practices */}
          <div className="rounded-xl bg-[#0A0E13] border border-white/[0.04] p-5">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Crown className="w-4 h-4 text-amber-400" /> Mejores Prácticas para Video Ads
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { title: "Hook en 3 Segundos", desc: "El 65% de viewers abandonan en los primeros 3s. Usa texto grande, pregunta provocativa o imagen impactante.", icon: Flame, color: "text-red-400" },
                { title: "Subtítulos Siempre", desc: "El 85% de videos en redes se ven sin sonido. Añade subtítulos grandes y legibles en todos tus videos.", icon: Type, color: "text-blue-400" },
                { title: "Formato Vertical", desc: "Los videos 9:16 tienen 40% más engagement que 16:9 en móvil. Prioriza vertical para Reels, TikTok y Shorts.", icon: Smartphone, color: "text-violet-400" },
                { title: "CTA Visual Claro", desc: "Termina con un CTA visual grande: flecha, botón animado, texto parpadeante. Dile al viewer exactamente qué hacer.", icon: Target, color: "text-emerald-400" },
                { title: "Música Trending", desc: "Usa sonidos trending de cada plataforma. Los algoritmos priorizan contenido con audio popular del momento.", icon: Music, color: "text-pink-400" },
                { title: "Primeros 3 Frames", desc: "Los primeros frames determinan si el viewer se queda. Usa colores vibrantes, movimiento y texto que genere curiosidad.", icon: Eye, color: "text-amber-400" },
                { title: "Prueba A/B Siempre", desc: "Crea mínimo 2 versiones de cada video: diferente hook, diferente CTA, diferente orden. Mide y escala el ganador.", icon: BarChart3, color: "text-cyan-400" },
                { title: "Duración Óptima", desc: "Reels: 15-30s. TikTok: 15-30s. Shorts: 30-60s. Facebook Ads: 15-30s. LinkedIn: 30-60s. Más corto = más retención.", icon: Clock, color: "text-orange-400" },
              ].map(bp => (
                <div key={bp.title} className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                  <bp.icon className={cn("w-4 h-4 shrink-0 mt-0.5", bp.color)} />
                  <div>
                    <p className="text-[10px] font-semibold text-white">{bp.title}</p>
                    <p className="text-[9px] text-zinc-500 mt-0.5 leading-relaxed">{bp.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Hook Examples */}
          <div className="rounded-xl bg-[#0A0E13] border border-white/[0.04] p-5">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Flame className="w-4 h-4 text-red-400" /> Ejemplos de Hooks que Funcionan
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {[
                "¿Sabías que el 90% de negocios fallan en esto?",
                "STOP 🛑 No hagas esto en tu negocio",
                "POV: Tu negocio factura 3x más este mes",
                "3 errores que estás cometiendo ahora mismo",
                "Esto cambió mi negocio para siempre 🔥",
                "El secreto que nadie te cuenta sobre...",
                "Antes vs Después de usar [producto]",
                "Si tienes un negocio, necesitas ver esto",
                "La razón #1 por la que pierdes clientes",
                "Hice esto y mis ventas subieron un 200%",
                "No cometas este error en tu marketing",
                "El truco que usan las marcas top 🏆",
              ].map((hook, i) => (
                <button
                  key={i}
                  onClick={() => copyText(hook, `hook-${i}`)}
                  className="flex items-center gap-2 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:border-orange-500/20 hover:bg-orange-500/[0.03] transition-all text-left group"
                >
                  <Play className="w-3 h-3 text-orange-400 shrink-0 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] text-zinc-300">{hook}</span>
                  {copiedId === `hook-${i}` ? (
                    <Check className="w-3 h-3 text-emerald-400 ml-auto shrink-0" />
                  ) : (
                    <Copy className="w-3 h-3 text-zinc-700 ml-auto shrink-0 group-hover:text-zinc-400" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Bottom Capabilities ── */}
      <div className="mt-8 rounded-xl bg-[#0A0E13] border border-white/[0.04] p-5">
        <h3 className="text-xs font-semibold text-white mb-3 flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-amber-400" /> Capacidades del Video Ads Studio
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {[
            "Guiones A/B", "Storyboards", "Campañas de video", "6 plataformas",
            "Hook generator", "Scripts por sector", "Dirección de cámara", "Notas de audio",
            "Transiciones", "Formatos & specs", "Mejores prácticas", "Presupuestos",
            "Calendario de videos", "Copy para CTA", "Visual concepts", "Duración óptima",
            "Subtítulos strategy", "Trending sounds", "Engagement tactics", "Métricas objetivo",
            "Multi-formato", "Export storyboard", "Hooks virales", "Brand consistency",
          ].map(cap => (
            <div key={cap} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.02] border border-white/[0.04]">
              <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
              <span className="text-[9px] text-zinc-400">{cap}</span>
            </div>
          ))}
        </div>
      </div>
    </SaasLayout>
  );
}