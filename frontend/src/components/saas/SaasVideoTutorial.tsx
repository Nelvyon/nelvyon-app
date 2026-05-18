import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  Play, Pause, SkipForward, SkipBack, RotateCcw, Volume2, VolumeX,
  Maximize2, Minimize2, Crown, CheckCircle, Globe,
  X, Sparkles, Zap, Star, TrendingUp,
  MousePointer2, Type, GripHorizontal, Eye, ToggleRight,
  ListChecks,
  LayoutDashboard, Users, Target, Mail, Megaphone, Layers, Share2,
  HeadphonesIcon, MessageSquare, Phone, Workflow, Bot, Calendar,
  FileText, Database, Palette, BookOpen, ShoppingCart,
  CreditCard, BarChart3, PieChart, Handshake, Settings,
  Swords, Trophy, Rocket, Server, Cpu, Wifi,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type SectionTutorial,
  type TutorialStep,
  tutorialLanguages,
} from "@/lib/saas-video-tutorials";

/* ═══════════════════════════════════════════════════════
   VOICE ENGINE — Natural human-like speech synthesis
   Uses Web Speech API with best available voice selection,
   slow rate, natural pitch, sentence-by-sentence delivery
   ═══════════════════════════════════════════════════════ */

const voiceLangMap: Record<string, string> = {
  es: "es", en: "en", pt: "pt", fr: "fr", de: "de",
};

/** Pick the most natural-sounding voice for a language */
function pickBestVoice(langCode: string): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis?.getVoices() ?? [];
  if (!voices.length) return null;
  const lang = voiceLangMap[langCode] || "es";

  // Priority: Google > Microsoft > Apple > any
  const priorities = ["google", "microsoft", "apple", "natural", "premium"];
  const matching = voices.filter(v => v.lang.startsWith(lang));
  if (!matching.length) return voices.find(v => v.lang.startsWith(lang)) || voices[0];

  for (const keyword of priorities) {
    const found = matching.find(v => v.name.toLowerCase().includes(keyword));
    if (found) return found;
  }
  // Prefer non-local voices (usually higher quality)
  const remote = matching.find(v => !v.localService);
  return remote || matching[0];
}

/** Speak text naturally — sentence by sentence with pauses */
function speakText(
  text: string,
  langCode: string,
  onEnd?: () => void,
  rate = 0.82,
  pitch = 1.02,
): SpeechSynthesisUtterance | null {
  if (!window.speechSynthesis) return null;
  window.speechSynthesis.cancel();

  const voice = pickBestVoice(langCode);
  const utt = new SpeechSynthesisUtterance(text);
  utt.voice = voice;
  utt.lang = voiceLangMap[langCode] || "es";
  utt.rate = rate;
  utt.pitch = pitch;
  utt.volume = 1;
  if (onEnd) utt.onend = onEnd;

  window.speechSynthesis.speak(utt);
  return utt;
}

/* ═══════════════════════════════════════════════════════
   TYPES & CONSTANTS
   ═══════════════════════════════════════════════════════ */

interface Props {
  tutorial: SectionTutorial;
  onClose?: () => void;
  defaultLang?: string;
  compact?: boolean;
}

interface SidebarItem {
  path?: string;
  icon?: LucideIcon;
  label: string;
  divider?: boolean;
  badge?: string;
  sectionId?: string;
}

const sidebarItems: SidebarItem[] = [
  { path: "/saas/dashboard", icon: LayoutDashboard, label: "Dashboard", sectionId: "dashboard" },
  { divider: true, label: "Marketing & Ventas" },
  { path: "/saas/crm", icon: Users, label: "CRM & Contactos", sectionId: "crm" },
  { path: "/saas/pipelines", icon: Target, label: "Pipelines & Deals" },
  { path: "/saas/email-marketing", icon: Mail, label: "Email Marketing", sectionId: "email-marketing" },
  { path: "/saas/campaigns", icon: Megaphone, label: "Campañas", sectionId: "campaigns" },
  { path: "/saas/funnels", icon: Layers, label: "Funnels & Landing", sectionId: "funnels" },
  { path: "/saas/social", icon: Share2, label: "Social Media", sectionId: "social" },
  { divider: true, label: "Comunicación" },
  { path: "/saas/helpdesk", icon: HeadphonesIcon, label: "Helpdesk" },
  { path: "/saas/conversations", icon: MessageSquare, label: "Conversaciones", sectionId: "conversations" },
  { path: "/saas/calls", icon: Phone, label: "Llamadas & VoIP" },
  { divider: true, label: "Automatización" },
  { path: "/saas/workflows", icon: Workflow, label: "Workflows" },
  { path: "/saas/bots", icon: Bot, label: "Bots & Chatbots" },
  { path: "/saas/agents-marketplace", icon: Bot, label: "Agentes SaaS", badge: "16" },
  { path: "/saas/calendar", icon: Calendar, label: "Calendario", sectionId: "calendar" },
  { divider: true, label: "Documentos & Datos" },
  { path: "/saas/contracts", icon: FileText, label: "Contratos Élite", badge: "NEW" },
  { path: "/saas/segmentation", icon: Database, label: "Segmentación" },
  { divider: true, label: "Contenido & Web" },
  { path: "/saas/websites", icon: Globe, label: "Websites & Builder" },
  { path: "/saas/templates", icon: Palette, label: "Templates", badge: "∞" },
  { path: "/saas/forms", icon: FileText, label: "Forms & Surveys" },
  { path: "/saas/blog", icon: BookOpen, label: "Blog & CMS" },
  { divider: true, label: "Negocio" },
  { path: "/saas/sales", icon: ShoppingCart, label: "Ventas & Pricing" },
  { path: "/saas/payments", icon: CreditCard, label: "Pagos & Facturas" },
  { path: "/saas/analytics", icon: BarChart3, label: "Analytics Pro" },
  { path: "/saas/reports", icon: PieChart, label: "Reportes", sectionId: "reports" },
  { divider: true, label: "Partners" },
  { path: "/saas/partners", icon: Handshake, label: "Programa Partners", sectionId: "partners", badge: "NEW" },
  { divider: true, label: "Herramientas" },
  { path: "/saas/benchmark", icon: Trophy, label: "Benchmark" },
  { path: "/saas/comparison", icon: BarChart3, label: "Comparativa" },
  { path: "/saas/vs-ghl", icon: Swords, label: "vs GHL" },
  { path: "/saas/settings", icon: Settings, label: "Configuración" },
];

const actionIcons: Record<string, { icon: LucideIcon; label: Record<string, string>; color: string }> = {
  click:  { icon: MousePointer2, label: { es: "Clic", en: "Click" }, color: "#3B82F6" },
  type:   { icon: Type, label: { es: "Escribir", en: "Type" }, color: "#8B5CF6" },
  drag:   { icon: GripHorizontal, label: { es: "Arrastrar", en: "Drag" }, color: "#F59E0B" },
  scroll: { icon: Eye, label: { es: "Observar", en: "Observe" }, color: "#10B981" },
  select: { icon: ListChecks, label: { es: "Seleccionar", en: "Select" }, color: "#EC4899" },
  toggle: { icon: ToggleRight, label: { es: "Completado", en: "Complete" }, color: "#10B981" },
};

function getSectionColors(sectionId: string) {
  const map: Record<string, { primary: string; secondary: string; accent: string; glow: string }> = {
    dashboard:        { primary: "#3B82F6", secondary: "#6366F1", accent: "#818CF8", glow: "shadow-blue-500/20" },
    crm:              { primary: "#8B5CF6", secondary: "#A855F7", accent: "#C084FC", glow: "shadow-violet-500/20" },
    campaigns:        { primary: "#EF4444", secondary: "#F43F5E", accent: "#FB7185", glow: "shadow-red-500/20" },
    "email-marketing":{ primary: "#EC4899", secondary: "#F43F5E", accent: "#FB7185", glow: "shadow-pink-500/20" },
    funnels:          { primary: "#06B6D4", secondary: "#14B8A6", accent: "#5EEAD4", glow: "shadow-cyan-500/20" },
    calendar:         { primary: "#06B6D4", secondary: "#3B82F6", accent: "#93C5FD", glow: "shadow-cyan-500/20" },
    conversations:    { primary: "#8B5CF6", secondary: "#6366F1", accent: "#A5B4FC", glow: "shadow-violet-500/20" },
    social:           { primary: "#10B981", secondary: "#059669", accent: "#6EE7B7", glow: "shadow-emerald-500/20" },
    reports:          { primary: "#EC4899", secondary: "#F43F5E", accent: "#FCA5A5", glow: "shadow-pink-500/20" },
    partners:         { primary: "#F59E0B", secondary: "#EF4444", accent: "#FCD34D", glow: "shadow-amber-500/20" },
  };
  return map[sectionId] || map.dashboard;
}

/* ═══════════════════════════════════════════════════════
   ANIMATED CURSOR
   ═══════════════════════════════════════════════════════ */

function AnimatedCursor({ x, y, clicking, color }: { x: number; y: number; clicking: boolean; color: string }) {
  return (
    <div className="absolute z-50 pointer-events-none transition-all duration-1000 ease-[cubic-bezier(0.25,0.1,0.25,1)]"
      style={{ left: `${x}%`, top: `${y}%` }}>
      {clicking && (
        <>
          <div className="absolute -inset-4 rounded-full animate-ping opacity-30" style={{ background: color }} />
          <div className="absolute -inset-2 rounded-full opacity-20" style={{ background: color, animation: "pulse 0.6s ease-in-out" }} />
        </>
      )}
      <svg width="22" height="26" viewBox="0 0 20 24" fill="none" className="drop-shadow-xl filter drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]">
        <path d="M1 1L1 17L5.5 13L10 21L13 19.5L8.5 11.5L14 10L1 1Z" fill="white" stroke={color} strokeWidth="1.5" />
      </svg>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   STEP CONTENT — Main content panel for each step
   ═══════════════════════════════════════════════════════ */

function StepContent({ step, progress, colors, lang }: {
  step: TutorialStep; progress: number; colors: ReturnType<typeof getSectionColors>; lang: string;
}) {
  const p = progress;
  const SIcon = step.icon;
  const isLast = step.animationType === "toggle";
  const titleText = step.title[lang] || step.title.es || "";

  if (isLast) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 px-6">
        <div className={cn("w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-1000",
          p > 15 ? "scale-100 opacity-100" : "scale-50 opacity-0"
        )} style={{ background: `linear-gradient(135deg, ${colors.primary}25, ${colors.secondary}25)`, border: `2px solid ${colors.primary}50`, boxShadow: `0 0 50px ${colors.primary}30` }}>
          <CheckCircle className="w-10 h-10 text-emerald-400" />
        </div>
        {p > 30 && (
          <div className="text-center transition-all duration-700" style={{ opacity: p > 30 ? 1 : 0, transform: `translateY(${p > 30 ? 0 : 10}px)` }}>
            <p className="text-lg font-black text-white">{titleText}</p>
            <p className="text-xs text-zinc-400 mt-1">
              {lang === "en" ? "You've mastered this section completely" : "Has dominado esta sección completamente"}
            </p>
          </div>
        )}
        {p > 50 && (
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map(i => (
              <Star key={i} className={cn("w-6 h-6 transition-all duration-500 fill-current",
                p > 50 + i * 6 ? "opacity-100 scale-100 text-amber-400" : "opacity-0 scale-50 text-zinc-600"
              )} />
            ))}
          </div>
        )}
        {p > 80 && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl border transition-all duration-500" style={{ background: `${colors.primary}15`, borderColor: `${colors.primary}30`, opacity: p > 80 ? 1 : 0 }}>
            <Sparkles className="w-4 h-4" style={{ color: colors.accent }} />
            <span className="text-[11px] font-bold" style={{ color: colors.accent }}>
              {lang === "en" ? "Expert Level Unlocked" : "Nivel Experto Desbloqueado"}
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-4 gap-3 overflow-hidden">
      {/* Header toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SIcon className="w-4 h-4" style={{ color: colors.primary }} />
          <span className="text-xs font-bold text-white">{titleText}</span>
        </div>
        <div className="flex items-center gap-2 transition-all duration-700" style={{ opacity: p > 15 ? 1 : 0, transform: `translateX(${p > 15 ? 0 : 10}px)` }}>
          <button className="px-3 py-1.5 rounded-lg text-[10px] font-bold text-white shadow-lg" style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`, boxShadow: `0 4px 15px ${colors.primary}40` }}>
            + {lang === "en" ? "New" : "Nuevo"}
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "Total", val: "2,847", icon: TrendingUp, c: colors.primary },
          { label: lang === "en" ? "Active" : "Activos", val: "1,234", icon: Zap, c: "#10B981" },
          { label: lang === "en" ? "New" : "Nuevos", val: "+89", icon: Star, c: colors.secondary },
          { label: "ROI", val: "340%", icon: TrendingUp, c: "#F59E0B" },
        ].map((card, i) => (
          <div key={i} className={cn("rounded-lg border p-2.5 transition-all duration-1000",
            p > 6 + i * 3 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          )} style={{ background: `${card.c}08`, borderColor: `${card.c}15` }}>
            <div className="flex items-center justify-between mb-0.5">
              <p className="text-[7px] text-zinc-500 font-medium">{card.label}</p>
              <card.icon className="w-2.5 h-2.5" style={{ color: card.c }} />
            </div>
            <p className="text-sm font-black" style={{ color: card.c }}>{card.val}</p>
          </div>
        ))}
      </div>

      {/* Main content area */}
      <div className="flex-1 rounded-xl border overflow-hidden transition-all duration-1000" style={{ background: `${colors.primary}04`, borderColor: `${colors.primary}12`, opacity: p > 20 ? 1 : 0, transform: `scale(${p > 20 ? 1 : 0.97})` }}>
        {step.animationType === "type" && (
          <div className="p-4 space-y-3">
            <p className="text-[9px] text-zinc-500 font-semibold uppercase tracking-wider mb-2">
              {lang === "en" ? "Form Fields" : "Campos del Formulario"}
            </p>
            {[
              { label: "Nombre", value: p > 32 ? "Carlos Martínez" : p > 26 ? "Carlos Mar" : p > 22 ? "Car" : "", ph: "Nombre completo" },
              { label: "Email", value: p > 44 ? "carlos@empresa.com" : p > 38 ? "carlos@emp" : p > 34 ? "car" : "", ph: "email@ejemplo.com" },
              { label: lang === "en" ? "Phone" : "Teléfono", value: p > 56 ? "+34 612 345 678" : p > 50 ? "+34 612 34" : p > 46 ? "+34" : "", ph: "+34 600 000 000" },
              { label: lang === "en" ? "Company" : "Empresa", value: p > 68 ? "Acme Corp S.L." : p > 62 ? "Acme Corp" : p > 58 ? "Acm" : "", ph: "Nombre de empresa" },
            ].map((field, i) => (
              <div key={i} className="transition-all duration-700" style={{ opacity: p > 20 + i * 4 ? 1 : 0, transform: `translateX(${p > 20 + i * 4 ? 0 : -8}px)` }}>
                <label className="text-[8px] text-zinc-400 mb-1 block font-medium">{field.label}</label>
                <div className="h-8 rounded-lg border px-3 flex items-center" style={{ background: `${colors.primary}06`, borderColor: field.value ? `${colors.primary}30` : "rgba(255,255,255,0.06)" }}>
                  {field.value ? (
                    <span className="text-[10px] font-mono" style={{ color: colors.accent }}>
                      {field.value}
                      {p < 72 && <span className="inline-block w-0.5 h-3.5 ml-0.5 animate-pulse align-middle" style={{ background: colors.primary }} />}
                    </span>
                  ) : (
                    <span className="text-[10px] text-zinc-700">{field.ph}</span>
                  )}
                </div>
              </div>
            ))}
            {p > 75 && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 mt-2 transition-all duration-500" style={{ opacity: p > 75 ? 1 : 0 }}>
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span className="text-[10px] text-emerald-300 font-semibold">
                  {lang === "en" ? "Contact saved successfully!" : "¡Contacto guardado correctamente!"}
                </span>
              </div>
            )}
          </div>
        )}
        {step.animationType === "drag" && (
          <div className="p-4 flex flex-col gap-3">
            <p className="text-[9px] text-zinc-500 font-semibold uppercase tracking-wider">
              {lang === "en" ? "Drag & Drop Builder" : "Constructor Drag & Drop"}
            </p>
            <div className="flex-1 grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <p className="text-[8px] text-zinc-600">{lang === "en" ? "Available" : "Disponibles"}</p>
                {["Header", "CTA Button", "Image", "Form"].map((item, i) => (
                  <div key={i} className={cn("p-2 rounded-lg border flex items-center gap-2 transition-all duration-1000",
                    p > 42 && i === 0 ? "opacity-30 scale-95" : p > 58 && i === 1 ? "opacity-30 scale-95" : "opacity-100"
                  )} style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.06)" }}>
                    <div className="w-5 h-5 rounded" style={{ background: `${colors.primary}15` }} />
                    <span className="text-[9px] text-zinc-400">{item}</span>
                  </div>
                ))}
              </div>
              <div className="border-2 border-dashed rounded-xl p-3 flex flex-col gap-2 transition-all duration-700" style={{ borderColor: p > 35 ? `${colors.primary}40` : "rgba(255,255,255,0.06)", background: p > 35 ? `${colors.primary}05` : "transparent" }}>
                <p className="text-[8px] text-zinc-600">{lang === "en" ? "Your Page" : "Tu Página"}</p>
                {p > 48 && (
                  <div className="p-2 rounded-lg border flex items-center gap-2 transition-all duration-700" style={{ background: `${colors.primary}10`, borderColor: `${colors.primary}25`, opacity: p > 48 ? 1 : 0 }}>
                    <div className="w-5 h-5 rounded" style={{ background: `${colors.primary}20` }} />
                    <span className="text-[9px] font-medium" style={{ color: colors.accent }}>Header</span>
                    <CheckCircle className="w-3 h-3 text-emerald-400 ml-auto" />
                  </div>
                )}
                {p > 64 && (
                  <div className="p-2 rounded-lg border flex items-center gap-2 transition-all duration-700" style={{ background: `${colors.secondary}10`, borderColor: `${colors.secondary}25`, opacity: p > 64 ? 1 : 0 }}>
                    <div className="w-5 h-5 rounded" style={{ background: `${colors.secondary}20` }} />
                    <span className="text-[9px] font-medium" style={{ color: colors.accent }}>CTA Button</span>
                    <CheckCircle className="w-3 h-3 text-emerald-400 ml-auto" />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {step.animationType === "scroll" && (
          <div className="p-4 space-y-3">
            <p className="text-[9px] text-zinc-500 font-semibold uppercase tracking-wider">
              {lang === "en" ? "Analytics Overview" : "Resumen de Analíticas"}
            </p>
            <div className="h-24 flex items-end gap-1.5 px-2">
              {Array.from({ length: 12 }).map((_, i) => {
                const seed = Math.sin(i * 1.3 + 42) * 0.5 + 0.5;
                const h = 25 + seed * 55;
                return (
                  <div key={i} className="flex-1 rounded-t transition-all ease-out" style={{
                    height: p > 25 + i * 2.5 ? `${h}%` : "0%",
                    transitionDuration: "1200ms",
                    background: `linear-gradient(to top, ${colors.primary}70, ${colors.primary}20)`,
                  }} />
                );
              })}
            </div>
            <div className="space-y-2 mt-2">
              {[
                { label: "Leads", w: "88%", c: colors.primary },
                { label: lang === "en" ? "Sales" : "Ventas", w: "72%", c: colors.secondary },
                { label: "Emails", w: "56%", c: colors.accent },
                { label: lang === "en" ? "Calls" : "Llamadas", w: "41%", c: "#10B981" },
              ].map((bar, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-14 text-[8px] text-zinc-500 text-right">{bar.label}</span>
                  <div className="flex-1 h-4 rounded-md overflow-hidden" style={{ background: "rgba(255,255,255,0.03)" }}>
                    <div className="h-full rounded-md flex items-center justify-end pr-2 transition-all ease-out" style={{
                      width: p > 38 + i * 7 ? bar.w : "0%",
                      transitionDuration: "1400ms",
                      background: `linear-gradient(90deg, ${bar.c}50, ${bar.c}90)`,
                    }}>
                      {p > 48 + i * 7 && <span className="text-[7px] text-white font-bold">{bar.w}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {(step.animationType === "click" || step.animationType === "select") && (
          <div className="p-4 space-y-2">
            <p className="text-[9px] text-zinc-500 font-semibold uppercase tracking-wider mb-2">
              {lang === "en" ? "Select an option" : "Selecciona una opción"}
            </p>
            {[
              { title: lang === "en" ? "Quick Actions" : "Acciones Rápidas", desc: lang === "en" ? "Create, send, manage" : "Crear, enviar, gestionar" },
              { title: lang === "en" ? "View Reports" : "Ver Reportes", desc: lang === "en" ? "Analytics & metrics" : "Analíticas y métricas" },
              { title: lang === "en" ? "Automations" : "Automatizaciones", desc: lang === "en" ? "Set up workflows" : "Configurar flujos" },
              { title: lang === "en" ? "Settings" : "Configuración", desc: lang === "en" ? "Customize your space" : "Personaliza tu espacio" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl border transition-all duration-700"
                style={{
                  opacity: p > 24 + i * 5 ? 1 : 0,
                  transform: `translateX(${p > 24 + i * 5 ? 0 : -12}px)`,
                  background: p > 48 && i === 0 ? `${colors.primary}12` : "rgba(255,255,255,0.02)",
                  borderColor: p > 48 && i === 0 ? `${colors.primary}30` : "rgba(255,255,255,0.06)",
                  boxShadow: p > 48 && i === 0 ? `0 4px 20px ${colors.primary}15` : "none",
                }}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${colors.primary}12` }}>
                  <span className="text-xs font-bold" style={{ color: colors.primary }}>{i + 1}</span>
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-semibold text-white">{item.title}</p>
                  <p className="text-[8px] text-zinc-600">{item.desc}</p>
                </div>
                {p > 48 && i === 0 && (
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full animate-ping" style={{ background: colors.primary }} />
                    <CheckCircle className="w-4 h-4" style={{ color: colors.primary }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   VIDEO SCENE — Full app simulation
   ═══════════════════════════════════════════════════════ */

function VideoScene({ step, tutorial, stepIndex, progress, lang, transitioning }: {
  step: TutorialStep; tutorial: SectionTutorial; stepIndex: number; progress: number; lang: string; transitioning: boolean;
}) {
  const colors = getSectionColors(tutorial.sectionId);
  const p = progress;
  const descText = step.description[lang] || step.description.es || "";
  // Much slower typing: spread across 90% of progress
  const descChars = Math.floor((Math.max(0, p - 3) / 90) * descText.length);
  const visibleDesc = descText.slice(0, descChars);
  const actionInfo = actionIcons[step.animationType] || actionIcons.click;
  const AIcon = actionInfo.icon;
  const SIcon = step.icon;
  const titleText = step.title[lang] || step.title.es || "";

  // Smooth cursor movement
  const cursorX = useMemo(() => {
    if (p < 15) return 6 + Math.sin(p / 6) * 2;
    if (p < 35) return 6 + (p - 15) * 2.2;
    if (p < 60) return 50 + Math.sin(p / 10) * 8;
    return 55 + Math.cos(p / 8) * 10;
  }, [p]);
  const cursorY = useMemo(() => {
    if (p < 15) return 28 + stepIndex * 3;
    if (p < 35) return 28 + Math.cos(p / 5) * 5;
    return 35 + Math.sin(p / 7) * 12;
  }, [p, stepIndex]);

  const activeSidebarIdx = sidebarItems.findIndex(item => item.sectionId === tutorial.sectionId);

  return (
    <div className={cn("absolute inset-0 overflow-hidden select-none bg-[#09090B] transition-opacity duration-700", transitioning ? "opacity-0" : "opacity-100")}>
      {/* macOS window chrome */}
      <div className="absolute top-0 left-0 right-0 h-8 bg-[#0D1117] border-b border-white/[0.08] flex items-center px-3 z-30">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F57] shadow-sm shadow-red-500/30" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E] shadow-sm shadow-amber-500/30" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#28C840] shadow-sm shadow-emerald-500/30" />
        </div>
        <div className="flex-1 flex justify-center">
          <div className="px-4 py-0.5 rounded-md bg-white/[0.05] border border-white/[0.06] text-[9px] text-zinc-400 flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: colors.primary }} />
            app.nelvyon.com/{tutorial.sectionId}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[7px] text-emerald-400 font-bold">ONLINE</span>
          </div>
        </div>
      </div>

      {/* Full sidebar */}
      <div className="absolute top-8 bottom-0 left-0 w-[180px] bg-[#0A0B0E] border-r border-white/[0.06] flex flex-col z-20 overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-3 border-b border-white/[0.04] shrink-0">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #3B82F6, #06B6D4)" }}>
            <Zap className="w-3 h-3 text-white" />
          </div>
          <div>
            <p className="text-[9px] font-bold text-white tracking-tight">NELVYON SaaS</p>
            <p className="text-[6px] text-zinc-700">Plataforma v3.0</p>
          </div>
        </div>
        <div className="px-2 py-1.5 shrink-0">
          <div className="px-2 py-1 rounded-md bg-emerald-500/5 border border-emerald-500/10 flex items-center gap-1">
            <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[6px] text-emerald-400 font-medium">SISTEMA ONLINE</span>
            <div className="ml-auto flex gap-0.5">
              {[Server, Database, Cpu, Wifi].map((Icon, i) => (
                <Icon key={i} className="w-1.5 h-1.5 text-zinc-800" />
              ))}
            </div>
          </div>
        </div>
        <nav className="flex-1 px-2 py-1 space-y-px overflow-y-auto" style={{ scrollbarWidth: "none" }}>
          {sidebarItems.map((item, i) => {
            if (item.divider) {
              return (
                <div key={i} className="pt-2 pb-0.5 px-2">
                  <span className="text-[6px] font-semibold text-zinc-800 uppercase tracking-wider">{item.label}</span>
                </div>
              );
            }
            const isActive = i === activeSidebarIdx;
            const Icon = item.icon!;
            const isHighlighted = isActive && p > 3;
            return (
              <div key={item.path} className={cn(
                "flex items-center gap-1.5 px-2 py-1 rounded-md text-[8px] font-medium transition-all duration-700",
                isHighlighted ? "text-white border shadow-sm" : "text-zinc-600 border border-transparent",
              )} style={isHighlighted ? {
                background: `${colors.primary}12`,
                borderColor: `${colors.primary}25`,
                boxShadow: `0 0 12px ${colors.primary}15`,
              } : {}}>
                <Icon className="w-2.5 h-2.5 shrink-0" style={isHighlighted ? { color: colors.primary } : {}} />
                <span className="truncate">{item.label}</span>
                {item.badge && (
                  <span className={cn("ml-auto text-[5px] px-1 py-0.5 rounded font-bold",
                    item.badge === "NEW" ? "bg-emerald-500/20 text-emerald-400" : "bg-blue-500/20 text-blue-400"
                  )}>{item.badge}</span>
                )}
              </div>
            );
          })}
        </nav>
        <div className="px-2 py-2 border-t border-white/[0.04] shrink-0">
          <div className="px-2 py-1 rounded-md bg-blue-500/5 border border-blue-500/10 flex items-center gap-1">
            <Rocket className="w-2 h-2 text-blue-400" />
            <span className="text-[6px] text-blue-400/80">24+ Servicios</span>
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="absolute top-8 bottom-0 left-[180px] right-0 flex flex-col">
        <div className="h-10 border-b border-white/[0.06] flex items-center justify-between px-4 bg-[#09090B]/80 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-2">
            <tutorial.icon className="w-4 h-4" style={{ color: colors.primary }} />
            <span className="text-[11px] font-bold text-white">{tutorial.sectionName[lang] || tutorial.sectionName.es}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[8px] text-zinc-700 font-mono">14:32:08</span>
            <div className="flex items-center gap-0.5">
              {[Server, Database, Cpu].map((Icon, idx) => (
                <div key={idx} className="flex items-center gap-0.5">
                  <Icon className="w-2 h-2 text-zinc-800" />
                  <div className="w-1 h-1 rounded-full bg-emerald-500" />
                </div>
              ))}
            </div>
            <span className="text-[7px] text-zinc-700 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">SaaS v3.0</span>
          </div>
        </div>
        <div className="flex-1 relative overflow-hidden">
          <StepContent step={step} progress={p} colors={colors} lang={lang} />
        </div>
      </div>

      {/* Animated cursor */}
      {p > 2 && p < 94 && step.animationType !== "toggle" && (
        <AnimatedCursor x={cursorX} y={cursorY} clicking={p > 12 && p < 20} color={colors.primary} />
      )}

      {/* Narration overlay */}
      <div className="absolute bottom-0 left-[180px] right-0 z-30">
        <div className={cn("mx-3 mb-3 transition-all duration-700", p > 2 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4")}>
          <div className="rounded-xl overflow-hidden" style={{ background: "rgba(0,0,0,0.90)", backdropFilter: "blur(20px)", boxShadow: "0 -4px 30px rgba(0,0,0,0.5)" }}>
            <div className="flex items-center gap-2.5 px-4 py-2 border-b" style={{ borderColor: `${colors.primary}15` }}>
              <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[9px] font-black text-white" style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})` }}>
                {stepIndex + 1}
              </div>
              <SIcon className="w-3.5 h-3.5 text-white/60" />
              <span className="text-[11px] font-bold text-white flex-1">{titleText}</span>
              {/* Voice indicator */}
              <div className="flex items-center gap-1 mr-1">
                <div className="flex gap-[2px]">
                  {[1, 2, 3, 4].map(j => (
                    <div key={j} className="w-[2px] rounded-full bg-emerald-400 transition-all" style={{
                      height: p > 5 && p < 92 ? `${4 + Math.sin((p + j * 3) * 0.5) * 4}px` : "2px",
                      opacity: p > 5 && p < 92 ? 0.8 : 0.3,
                    }} />
                  ))}
                </div>
              </div>
              <span className="text-[8px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1" style={{ background: `${colors.primary}20`, color: colors.accent }}>
                <AIcon className="w-2.5 h-2.5" />
                {actionInfo.label[lang] || actionInfo.label.es}
              </span>
            </div>
            <div className="px-4 py-2.5">
              <p className="text-[11px] leading-relaxed text-slate-200 min-h-[36px]">
                {visibleDesc}
                {descChars < descText.length && <span className="inline-block w-0.5 h-3.5 ml-0.5 animate-pulse align-middle" style={{ background: colors.primary }} />}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   MAIN PLAYER COMPONENT
   ═══════════════════════════════════════════════════════ */

export default function SaasVideoTutorial({ tutorial, onClose, defaultLang = "es", compact = false }: Props) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [lang, setLang] = useState(defaultLang);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [stepProgress, setStepProgress] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [voicesReady, setVoicesReady] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const spokenStepRef = useRef(-1);

  const totalSteps = tutorial.steps.length;
  const safeStep = Math.min(currentStep, Math.max(totalSteps - 1, 0));
  const step = totalSteps > 0 ? tutorial.steps[safeStep] : null;
  const colors = getSectionColors(tutorial.sectionId);
  const overallProgress = totalSteps > 0 ? ((safeStep / totalSteps) * 100) + ((stepProgress / 100) * (100 / totalSteps)) : 0;

  // Load voices
  useEffect(() => {
    const loadVoices = () => {
      const v = window.speechSynthesis?.getVoices();
      if (v && v.length > 0) setVoicesReady(true);
    };
    loadVoices();
    window.speechSynthesis?.addEventListener("voiceschanged", loadVoices);
    return () => window.speechSynthesis?.removeEventListener("voiceschanged", loadVoices);
  }, []);

  // Speak current step narration
  useEffect(() => {
    if (!step || !isPlaying || isMuted || completed || !voicesReady) return;
    if (spokenStepRef.current === currentStep) return;
    spokenStepRef.current = currentStep;

    const title = step.title[lang] || step.title.es || "";
    const desc = step.description[lang] || step.description.es || "";
    const fullText = `${title}. ${desc}`;

    const timeout = setTimeout(() => {
      speakText(fullText, lang, undefined, 0.82, 1.02);
    }, 400);

    return () => {
      clearTimeout(timeout);
    };
  }, [currentStep, isPlaying, isMuted, lang, step, completed, voicesReady]);

  // Stop speech when paused or muted
  useEffect(() => {
    if (!isPlaying || isMuted) {
      window.speechSynthesis?.cancel();
    }
  }, [isPlaying, isMuted]);

  // Cleanup speech on unmount
  useEffect(() => {
    return () => { window.speechSynthesis?.cancel(); };
  }, []);

  // Auto-play timer — MUCH SLOWER (divide by 16 for ~60% more time per step)
  const stepDuration = step ? step.duration : 5;
  useEffect(() => {
    if (isPlaying && !completed && !transitioning) {
      timerRef.current = setInterval(() => {
        setStepProgress(prev => {
          const inc = 100 / (stepDuration * 16);
          const next = prev + inc;
          if (next >= 100) {
            if (safeStep < totalSteps - 1) {
              // Smooth transition between steps
              setTransitioning(true);
              window.speechSynthesis?.cancel();
              spokenStepRef.current = -1;
              setTimeout(() => {
                setCurrentStep(s => Math.min(s + 1, totalSteps - 1));
                setStepProgress(0);
                setTransitioning(false);
              }, 500);
              return 100;
            } else {
              setIsPlaying(false);
              setCompleted(true);
              window.speechSynthesis?.cancel();
              return 100;
            }
          }
          return next;
        });
      }, 100);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isPlaying, safeStep, stepDuration, totalSteps, completed, transitioning]);

  const goToStep = useCallback((idx: number) => {
    window.speechSynthesis?.cancel();
    spokenStepRef.current = -1;
    setCurrentStep(idx);
    setStepProgress(0);
    setCompleted(false);
  }, []);

  const nextStep = useCallback(() => {
    if (currentStep < totalSteps - 1) {
      window.speechSynthesis?.cancel();
      spokenStepRef.current = -1;
      setTransitioning(true);
      setTimeout(() => {
        setCurrentStep(s => s + 1);
        setStepProgress(0);
        setTransitioning(false);
      }, 400);
    }
  }, [currentStep, totalSteps]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      window.speechSynthesis?.cancel();
      spokenStepRef.current = -1;
      setTransitioning(true);
      setTimeout(() => {
        setCurrentStep(s => s - 1);
        setStepProgress(0);
        setCompleted(false);
        setTransitioning(false);
      }, 400);
    }
  }, [currentStep]);

  const restart = useCallback(() => {
    window.speechSynthesis?.cancel();
    spokenStepRef.current = -1;
    setCurrentStep(0);
    setStepProgress(0);
    setCompleted(false);
    setIsPlaying(true);
  }, []);

  const togglePlay = useCallback(() => {
    if (completed) { restart(); return; }
    setIsPlaying(p => !p);
  }, [completed, restart]);

  const toggleMute = useCallback(() => {
    setIsMuted(m => {
      if (!m) window.speechSynthesis?.cancel();
      else spokenStepRef.current = -1; // Will re-speak on unmute
      return !m;
    });
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!isFullscreen) {
      containerRef.current.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
    setIsFullscreen(f => !f);
  }, [isFullscreen]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };
  const totalSecs = tutorial.steps.reduce((a, s) => a + s.duration, 0);
  const currentSecs = tutorial.steps.slice(0, currentStep).reduce((a, s) => a + s.duration, 0) + (stepProgress / 100) * stepDuration;

  // Guard: if tutorial has no steps, render nothing
  if (!step) return null;

  return (
    <div ref={containerRef} className={cn(
      "relative bg-black rounded-2xl overflow-hidden border border-white/[0.1] group",
      compact ? "w-full" : "w-full max-w-3xl",
      isFullscreen && "rounded-none border-none",
    )} style={{ boxShadow: `0 25px 60px rgba(0,0,0,0.6), 0 0 40px ${colors.primary}10` }}>
      {onClose && (
        <button onClick={() => { window.speechSynthesis?.cancel(); onClose(); }}
          className="absolute top-2 right-2 z-40 w-7 h-7 rounded-full bg-black/70 hover:bg-black/90 border border-white/10 flex items-center justify-center transition-all hover:scale-110">
          <X className="w-3.5 h-3.5 text-white" />
        </button>
      )}

      {/* Video area */}
      <div className="relative" style={{ aspectRatio: compact ? "16/10" : "16/9" }}>
        <VideoScene step={step} tutorial={tutorial} stepIndex={currentStep} progress={stepProgress} lang={lang} transitioning={transitioning} />

        {/* Completed overlay */}
        {completed && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/75 backdrop-blur-md">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: `linear-gradient(135deg, ${colors.primary}30, ${colors.secondary}30)`, border: `2px solid ${colors.primary}50`, boxShadow: `0 0 40px ${colors.primary}25` }}>
              <CheckCircle className="w-9 h-9 text-emerald-400" />
            </div>
            <p className="text-white font-black text-lg">
              {lang === "en" ? "Tutorial Complete!" : "¡Tutorial Completado!"}
            </p>
            <p className="text-zinc-400 text-xs mt-1">
              {lang === "en" ? "You've mastered this section" : "Has dominado esta sección"}
            </p>
            <div className="flex gap-1.5 mt-3">
              {[1, 2, 3, 4, 5].map(i => (
                <Star key={i} className="w-5 h-5 text-amber-400 fill-amber-400" />
              ))}
            </div>
            <button onClick={restart} className="mt-4 flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-bold hover:scale-105 transition-transform shadow-xl" style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})` }}>
              <RotateCcw className="w-4 h-4" />
              {lang === "en" ? "Watch Again" : "Ver de nuevo"}
            </button>
          </div>
        )}

        {/* Recording indicator */}
        {isPlaying && !completed && (
          <div className="absolute top-10 right-3 z-30 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-600/90 shadow-lg shadow-red-600/30">
            <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <span className="text-[8px] text-white font-bold tracking-wider">REC</span>
          </div>
        )}

        {/* Click to pause/play */}
        {!completed && (
          <div className="absolute inset-0 z-10 cursor-pointer" onClick={togglePlay} />
        )}
      </div>

      {/* Controls bar */}
      <div className="bg-[#0D1117] border-t border-white/[0.08]">
        {/* Progress bar */}
        <div className="relative h-1.5 bg-white/[0.06] cursor-pointer group/bar"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const pct = ((e.clientX - rect.left) / rect.width) * 100;
            const targetStep = Math.floor((pct / 100) * totalSteps);
            const stepPct = ((pct / 100) * totalSteps - targetStep) * 100;
            goToStep(Math.min(targetStep, totalSteps - 1));
            setStepProgress(Math.min(stepPct, 99));
          }}>
          <div className="h-full transition-all duration-200" style={{ width: `${overallProgress}%`, background: `linear-gradient(90deg, ${colors.primary}, ${colors.secondary})` }} />
          {tutorial.steps.map((_, i) => i > 0 && (
            <div key={i} className="absolute top-0 bottom-0 w-px bg-white/20" style={{ left: `${(i / totalSteps) * 100}%` }} />
          ))}
          <div className="absolute top-1/2 w-4 h-4 rounded-full bg-white shadow-lg opacity-0 group-hover/bar:opacity-100 transition-opacity border-2" style={{ left: `${overallProgress}%`, transform: "translate(-50%, -50%)", borderColor: colors.primary }} />
        </div>

        {/* Buttons row */}
        <div className="flex items-center gap-1.5 px-3 py-2">
          <button onClick={prevStep} disabled={currentStep === 0} className="p-1.5 rounded-lg hover:bg-white/5 disabled:opacity-30 transition-colors">
            <SkipBack className="w-4 h-4 text-white" />
          </button>
          <button onClick={togglePlay} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors">
            {isPlaying ? <Pause className="w-5 h-5 text-white" /> : <Play className="w-5 h-5 text-white" />}
          </button>
          <button onClick={nextStep} disabled={currentStep === totalSteps - 1} className="p-1.5 rounded-lg hover:bg-white/5 disabled:opacity-30 transition-colors">
            <SkipForward className="w-4 h-4 text-white" />
          </button>

          {/* Volume / Mute */}
          <button onClick={toggleMute} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors" title={isMuted ? "Activar voz" : "Silenciar voz"}>
            {isMuted ? <VolumeX className="w-4 h-4 text-zinc-500" /> : <Volume2 className="w-4 h-4 text-white" />}
          </button>

          <span className="text-[11px] text-zinc-400 font-mono ml-1">
            {formatTime(currentSecs)} / {formatTime(totalSecs)}
          </span>

          <div className="flex-1" />

          {/* Step indicator */}
          <span className="text-[9px] font-bold px-2 py-0.5 rounded-md" style={{ background: `${colors.primary}15`, color: colors.accent }}>
            {lang === "en" ? "Step" : "Paso"} {currentStep + 1}/{totalSteps}
          </span>

          {/* Language */}
          <div className="relative">
            <button onClick={() => setShowLangMenu(!showLangMenu)} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors flex items-center gap-1">
              <Globe className="w-3.5 h-3.5 text-white/60" />
              <span className="text-[10px] text-white/60">{tutorialLanguages.find(l => l.code === lang)?.flag}</span>
            </button>
            {showLangMenu && (
              <div className="absolute bottom-full right-0 mb-2 bg-[#111318] border border-white/10 rounded-xl shadow-2xl z-50 py-1.5 min-w-[140px]">
                {tutorialLanguages.map(l => (
                  <button key={l.code} onClick={() => {
                    window.speechSynthesis?.cancel();
                    spokenStepRef.current = -1;
                    setLang(l.code);
                    setShowLangMenu(false);
                  }}
                    className={cn("w-full flex items-center gap-2.5 px-4 py-2 text-[11px] hover:bg-white/5 transition-colors", lang === l.code ? "text-white font-bold" : "text-zinc-400")}>
                    <span className="text-base">{l.flag}</span><span>{l.label}</span>
                    {lang === l.code && <CheckCircle className="w-3.5 h-3.5 text-emerald-400 ml-auto" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Fullscreen */}
          <button onClick={toggleFullscreen} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors">
            {isFullscreen ? <Minimize2 className="w-4 h-4 text-white/60" /> : <Maximize2 className="w-4 h-4 text-white/60" />}
          </button>
        </div>
      </div>

      {/* Steps list */}
      {!compact && (
        <div className="bg-[#0A0E13] border-t border-white/[0.06] max-h-[180px] overflow-y-auto">
          {tutorial.steps.map((s, i) => {
            const SIcon = s.icon;
            const isCurrent = i === currentStep;
            const isDone = i < currentStep;
            return (
              <button key={i} onClick={() => goToStep(i)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 text-left transition-all border-b border-white/[0.04] hover:bg-white/[0.03]",
                  isCurrent && "bg-white/[0.05]",
                )}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-[11px] font-bold transition-all"
                  style={isCurrent ? { background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`, color: "white", boxShadow: `0 4px 15px ${colors.primary}30` } :
                    isDone ? { background: "rgba(16,185,129,0.1)", color: "#34D399", border: "1px solid rgba(16,185,129,0.2)" } :
                    { background: "rgba(255,255,255,0.04)", color: "#71717A" }}>
                  {isDone ? <CheckCircle className="w-4 h-4" /> : i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn("text-[11px] font-semibold truncate", isCurrent ? "text-white" : isDone ? "text-emerald-400/80" : "text-zinc-400")}>
                    {s.title[lang] || s.title.es}
                  </p>
                  <p className="text-[9px] text-zinc-600 truncate mt-0.5">{s.description[lang]?.slice(0, 70) || s.description.es?.slice(0, 70)}...</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[9px] text-zinc-600 font-mono">{s.duration}s</span>
                  {isCurrent && isPlaying && (
                    <div className="flex gap-0.5">
                      {[1, 2, 3].map(j => (
                        <div key={j} className="w-0.5 rounded-full bg-emerald-400 animate-pulse" style={{ height: `${5 + j * 3}px`, animationDelay: `${j * 150}ms` }} />
                      ))}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   TUTORIAL CARD — Compact card for gallery
   ═══════════════════════════════════════════════════════ */

export function TutorialCard({ tutorial, lang = "es", onPlay }: { tutorial: SectionTutorial; lang?: string; onPlay: () => void }) {
  const Icon = tutorial.icon;
  const colors = getSectionColors(tutorial.sectionId);
  return (
    <button onClick={onPlay} className="group w-full bg-[#0F1419] hover:bg-[#131922] border border-white/[0.06] hover:border-white/[0.12] rounded-xl overflow-hidden text-left transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
      <div className="relative aspect-video overflow-hidden" style={{ background: `linear-gradient(135deg, ${colors.primary}10, #0B0F15 60%, ${colors.secondary}08)` }}>
        <div className="absolute top-0 left-0 bottom-0 w-8 bg-[#0A0B0E] border-r border-white/[0.06]">
          <div className="mt-2 mx-1.5 w-5 h-5 rounded flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${colors.primary}40, ${colors.secondary}40)` }}>
            <Icon className="w-2.5 h-2.5 text-white/80" />
          </div>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="mx-1.5 mt-1 w-5 h-2 rounded bg-white/[0.04]" />
          ))}
        </div>
        <div className="absolute top-0 left-8 right-0 bottom-0 p-2">
          <div className="flex gap-1 mb-1.5">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex-1 h-6 rounded" style={{ background: `${colors.primary}${10 + i * 5}` }} />
            ))}
          </div>
          <div className="h-10 rounded" style={{ background: `${colors.primary}08`, border: `1px solid ${colors.primary}15` }} />
        </div>
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all bg-black/50">
          <div className="w-12 h-12 rounded-full flex items-center justify-center shadow-xl scale-90 group-hover:scale-100 transition-transform" style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`, boxShadow: `0 8px 25px ${colors.primary}40` }}>
            <Play className="w-6 h-6 text-white ml-0.5" />
          </div>
        </div>
        <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/80 text-[10px] text-white font-medium">
          {tutorial.totalDuration}
        </div>
        <div className="absolute top-2 left-10 px-2 py-0.5 rounded-md bg-black/80 text-[9px] text-amber-300 font-bold flex items-center gap-1">
          <Crown className="w-3 h-3" /> ÉLITE
        </div>
        {/* Voice badge */}
        <div className="absolute bottom-2 left-10 px-2 py-0.5 rounded-md bg-black/80 text-[9px] text-emerald-300 font-bold flex items-center gap-1">
          <Volume2 className="w-3 h-3" /> VOZ
        </div>
      </div>
      <div className="p-3">
        <h4 className="text-xs font-bold text-white truncate mb-1">
          {tutorial.sectionName[lang] || tutorial.sectionName.es}
        </h4>
        <p className="text-[9px] text-zinc-500 line-clamp-2 mb-2">
          {tutorial.steps[0]?.description[lang] || tutorial.steps[0]?.description.es || ""}
        </p>
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-zinc-600">{tutorial.steps.length} {lang === "en" ? "steps" : "pasos"}</span>
          <span className="text-[9px] text-zinc-700">·</span>
          <span className={cn("text-[9px] font-medium",
            tutorial.difficulty === "beginner" ? "text-emerald-400" :
            tutorial.difficulty === "intermediate" ? "text-amber-400" : "text-red-400"
          )}>
            {tutorial.difficulty === "beginner" ? "Principiante" : tutorial.difficulty === "intermediate" ? "Intermedio" : "Avanzado"}
          </span>
          <span className="text-[9px] text-zinc-700">·</span>
          <span className="text-[9px] text-emerald-400 flex items-center gap-0.5">
            <Volume2 className="w-2.5 h-2.5" /> {lang === "en" ? "Voice" : "Con voz"}
          </span>
        </div>
      </div>
    </button>
  );
}