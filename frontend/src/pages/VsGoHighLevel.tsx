import SaasLayout from "@/components/SaasLayout";
import { useI18n } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Trophy, Crown, Star, TrendingUp, CheckCircle2, XCircle,
  Zap, Shield, Globe, Sparkles, Award, ArrowUpRight,
} from "lucide-react";

type Verdict = "win" | "tie" | "lose";

interface Feature {
  name: string;
  nexus: string;
  ghl: string;
  nexusScore: number;
  ghlScore: number;
  verdict: Verdict;
  detail?: string;
}

interface Section {
  category: string;
  emoji: string;
  features: Feature[];
}

const sections: Section[] = [
  {
    category: "CRM y Gestion de Contactos",
    emoji: "🏢",
    features: [
      { name: "Gestion de contactos", nexus: "Nelvyon scoring, tags, segmentación dinámica", ghl: "Contactos con tags y campos custom", nexusScore: 98, ghlScore: 85, verdict: "win", detail: "Scoring Nelvyon predice conversión automáticamente" },
      { name: "Campos personalizados", nexus: "Ilimitados + campos calculados + formulas", ghl: "Campos custom basicos", nexusScore: 95, ghlScore: 80, verdict: "win" },
      { name: "Import/Export masivo", nexus: "CSV, Excel, API, migracion con mapeo Nelvyon", ghl: "CSV basico", nexusScore: 96, ghlScore: 70, verdict: "win" },
      { name: "Segmentacion avanzada", nexus: "Segmentos dinamicos con 50+ filtros", ghl: "Smart lists con filtros basicos", nexusScore: 95, ghlScore: 82, verdict: "win" },
      { name: "Timeline unificado", nexus: "Todas las interacciones en una vista", ghl: "Timeline de actividad", nexusScore: 94, ghlScore: 85, verdict: "win" },
      { name: "Deduplicacion", nexus: "Automatica con Nelvyon + merge inteligente", ghl: "Manual", nexusScore: 95, ghlScore: 60, verdict: "win" },
    ],
  },
  {
    category: "Pipeline y Ventas",
    emoji: "📊",
    features: [
      { name: "Pipeline visual Kanban", nexus: "Multi-pipeline + drag and drop + automaciones", ghl: "Pipeline Kanban con stages", nexusScore: 96, ghlScore: 90, verdict: "win" },
      { name: "Multiples pipelines", nexus: "Ilimitados con vistas personalizadas", ghl: "Multiples pipelines", nexusScore: 95, ghlScore: 90, verdict: "win" },
      { name: "Probabilidad de cierre", nexus: "Nelvyon predictiva + scoring automatico", ghl: "Manual por stage", nexusScore: 97, ghlScore: 75, verdict: "win", detail: "Predicción Nelvyon basada en patrones historicos" },
      { name: "Reportes de ventas", nexus: "Dashboards BI con drill-down", ghl: "Reportes basicos de pipeline", nexusScore: 95, ghlScore: 72, verdict: "win" },
      { name: "Asignacion automatica", nexus: "Round-robin + por capacidad + por skill", ghl: "Round-robin basico", nexusScore: 93, ghlScore: 80, verdict: "win" },
    ],
  },
  {
    category: "Comunicacion Multicanal",
    emoji: "💬",
    features: [
      { name: "Email", nexus: "Envio masivo + secuencias + templates Nelvyon", ghl: "Email con templates", nexusScore: 97, ghlScore: 88, verdict: "win" },
      { name: "SMS", nexus: "SMS bidireccional + MMS + secuencias", ghl: "SMS bidireccional", nexusScore: 95, ghlScore: 90, verdict: "win" },
      { name: "WhatsApp", nexus: "API oficial + chatbot Nelvyon + templates", ghl: "WhatsApp integrado", nexusScore: 97, ghlScore: 85, verdict: "win" },
      { name: "Chat en vivo", nexus: "Widget + chatbot Nelvyon + co-browsing", ghl: "Chat widget", nexusScore: 95, ghlScore: 82, verdict: "win" },
      { name: "VoIP / Llamadas", nexus: "VoIP + grabacion + transcripción Nelvyon", ghl: "Twilio + grabacion", nexusScore: 93, ghlScore: 88, verdict: "win" },
      { name: "Bandeja unificada", nexus: "Todos los canales + prioridad Nelvyon", ghl: "Conversations unificadas", nexusScore: 96, ghlScore: 88, verdict: "win" },
      { name: "Facebook Messenger", nexus: "Integrado + chatbot", ghl: "Integrado + chatbot", nexusScore: 90, ghlScore: 90, verdict: "tie" },
      { name: "Instagram DM", nexus: "Integrado + auto-respuestas Nelvyon", ghl: "Integrado", nexusScore: 92, ghlScore: 85, verdict: "win" },
    ],
  },
  {
    category: "Automatizacion y Workflows",
    emoji: "🔄",
    features: [
      { name: "Builder visual", nexus: "Drag and drop + branches + loops + delays", ghl: "Workflow builder visual", nexusScore: 95, ghlScore: 92, verdict: "win" },
      { name: "Triggers disponibles", nexus: "80+ triggers + webhooks + API", ghl: "50+ triggers", nexusScore: 95, ghlScore: 88, verdict: "win" },
      { name: "Acciones disponibles", nexus: "100+ acciones + custom code + API calls", ghl: "60+ acciones", nexusScore: 96, ghlScore: 85, verdict: "win" },
      { name: "Logica condicional", nexus: "If/else + switch + A/B testing", ghl: "If/else + wait conditions", nexusScore: 95, ghlScore: 88, verdict: "win" },
      { name: "Templates de workflows", nexus: "200+ templates + marketplace", ghl: "Templates de workflows", nexusScore: 93, ghlScore: 85, verdict: "win" },
      { name: "Webhooks", nexus: "Entrantes + salientes + retry automatico", ghl: "Webhooks basicos", nexusScore: 95, ghlScore: 82, verdict: "win" },
    ],
  },
  {
    category: "Funnels y Landing Pages",
    emoji: "🚀",
    features: [
      { name: "Editor drag and drop", nexus: "Editor visual + componentes premium", ghl: "Funnel builder drag and drop", nexusScore: 94, ghlScore: 92, verdict: "win" },
      { name: "Templates", nexus: "500+ templates + marketplace + Nelvyon", ghl: "Templates de funnels", nexusScore: 95, ghlScore: 88, verdict: "win" },
      { name: "A/B Testing", nexus: "Multi-variante + auto-optimización Nelvyon", ghl: "A/B split testing", nexusScore: 95, ghlScore: 85, verdict: "win" },
      { name: "Checkout pages", nexus: "Checkout optimizado + upsells + order bumps", ghl: "Order forms + upsells", nexusScore: 94, ghlScore: 90, verdict: "win" },
      { name: "Velocidad de carga", nexus: "CDN global + lazy loading + score 95+", ghl: "Hosting estandar", nexusScore: 96, ghlScore: 78, verdict: "win" },
    ],
  },
  {
    category: "Formularios y Encuestas",
    emoji: "📝",
    features: [
      { name: "Form builder", nexus: "15 tipos de campo + logica condicional", ghl: "Form builder con campos", nexusScore: 95, ghlScore: 85, verdict: "win" },
      { name: "Surveys tipo Typeform", nexus: "Surveys interactivas + quiz + scoring", ghl: "Surveys basicas", nexusScore: 94, ghlScore: 78, verdict: "win" },
      { name: "Logica condicional", nexus: "Avanzada con branches multiples", ghl: "Logica basica", nexusScore: 95, ghlScore: 75, verdict: "win" },
      { name: "Pagos en formularios", nexus: "Stripe + PayPal integrado", ghl: "Stripe en forms", nexusScore: 93, ghlScore: 85, verdict: "win" },
    ],
  },
  {
    category: "Pagos y Suscripciones",
    emoji: "💳",
    features: [
      { name: "Procesador de pagos", nexus: "Stripe + PayPal + multiples gateways", ghl: "Stripe + Authorize.net", nexusScore: 95, ghlScore: 82, verdict: "win" },
      { name: "Suscripciones recurrentes", nexus: "Planes flexibles + trials + upgrades", ghl: "Suscripciones basicas", nexusScore: 95, ghlScore: 78, verdict: "win" },
      { name: "Metricas SaaS", nexus: "MRR, ARR, Churn, LTV, ARPU, cohorts", ghl: "Revenue basico", nexusScore: 97, ghlScore: 65, verdict: "win" },
      { name: "Invoicing", nexus: "Facturas auto + impuestos + multi-moneda", ghl: "Invoicing basico", nexusScore: 94, ghlScore: 75, verdict: "win" },
      { name: "Cupones y descuentos", nexus: "Cupones + volumen + referidos", ghl: "Cupones basicos", nexusScore: 93, ghlScore: 80, verdict: "win" },
    ],
  },
  {
    category: "Cursos y Membership",
    emoji: "📚",
    features: [
      { name: "Plataforma de cursos", nexus: "LMS completo con modulos y quizzes", ghl: "Membership sites basicos", nexusScore: 93, ghlScore: 78, verdict: "win" },
      { name: "Area de miembros", nexus: "Portal + niveles + drip content", ghl: "Membership areas", nexusScore: 92, ghlScore: 80, verdict: "win" },
      { name: "Certificados", nexus: "Automaticos + verificables", ghl: "No disponible", nexusScore: 90, ghlScore: 0, verdict: "win" },
      { name: "Progreso del estudiante", nexus: "Tracking detallado + gamificacion", ghl: "Progreso basico", nexusScore: 93, ghlScore: 65, verdict: "win" },
      { name: "Comunidad", nexus: "Foro integrado + grupos + chat", ghl: "Communities (nuevo)", nexusScore: 88, ghlScore: 75, verdict: "win" },
    ],
  },
  {
    category: "Reputacion y Resenas",
    emoji: "⭐",
    features: [
      { name: "Solicitud de resenas", nexus: "Automatica por email/SMS + secuencias", ghl: "Review requests automaticos", nexusScore: 96, ghlScore: 90, verdict: "win" },
      { name: "Google Reviews", nexus: "Monitoreo + respuesta + analytics", ghl: "Google Reviews integrado", nexusScore: 95, ghlScore: 90, verdict: "win" },
      { name: "Facebook Reviews", nexus: "Monitoreo + respuesta automática Nelvyon", ghl: "Facebook Reviews", nexusScore: 95, ghlScore: 88, verdict: "win" },
      { name: "Analisis de sentimiento", nexus: "Nelvyon analiza sentimiento + tendencias", ghl: "No disponible", nexusScore: 96, ghlScore: 0, verdict: "win" },
      { name: "Widget de resenas", nexus: "Widget embebible + personalizable", ghl: "Widget de reviews", nexusScore: 92, ghlScore: 85, verdict: "win" },
    ],
  },
  {
    category: "Redes Sociales",
    emoji: "📱",
    features: [
      { name: "Programacion de posts", nexus: "Multi-plataforma + calendario + Nelvyon", ghl: "Social planner (limitado)", nexusScore: 94, ghlScore: 70, verdict: "win" },
      { name: "Calendario de contenidos", nexus: "Vista mensual/semanal + drag and drop", ghl: "Basico", nexusScore: 95, ghlScore: 65, verdict: "win" },
      { name: "Generacion con Nelvyon", nexus: "Contenido + imagenes + hashtags Nelvyon", ghl: "No disponible", nexusScore: 94, ghlScore: 0, verdict: "win" },
      { name: "Analytics por plataforma", nexus: "Metricas detalladas por red social", ghl: "Basico", nexusScore: 93, ghlScore: 55, verdict: "win" },
    ],
  },
  {
    category: "Helpdesk y Soporte",
    emoji: "🎧",
    features: [
      { name: "Sistema de tickets", nexus: "Tickets con SLA + prioridad + asignacion", ghl: "No disponible nativo", nexusScore: 95, ghlScore: 30, verdict: "win" },
      { name: "Base de conocimiento", nexus: "KB con busqueda + categorias + analytics", ghl: "No disponible", nexusScore: 93, ghlScore: 0, verdict: "win" },
      { name: "SLA Management", nexus: "SLAs configurables + alertas automaticas", ghl: "No disponible", nexusScore: 94, ghlScore: 0, verdict: "win" },
      { name: "Satisfaccion del cliente", nexus: "CSAT + NPS + encuestas post-ticket", ghl: "No disponible", nexusScore: 92, ghlScore: 0, verdict: "win" },
    ],
  },
  {
    category: "Ads y Tracking",
    emoji: "📈",
    features: [
      { name: "Facebook Pixel", nexus: "Pixel + CAPI + eventos custom", ghl: "Facebook Pixel basico", nexusScore: 95, ghlScore: 78, verdict: "win" },
      { name: "Google Ads tracking", nexus: "Conversion tracking + audiencias", ghl: "Google Ads basico", nexusScore: 93, ghlScore: 72, verdict: "win" },
      { name: "Atribucion multi-touch", nexus: "First/last/linear/custom attribution", ghl: "No disponible", nexusScore: 95, ghlScore: 0, verdict: "win" },
      { name: "ROI por campana", nexus: "ROAS + CPA + LTV por fuente", ghl: "Reportes basicos", nexusScore: 94, ghlScore: 65, verdict: "win" },
      { name: "Optimizador Nelvyon", nexus: "Recomendaciones de budget con Nelvyon", ghl: "No disponible", nexusScore: 93, ghlScore: 0, verdict: "win" },
    ],
  },
  {
    category: "Analytics y BI",
    emoji: "📊",
    features: [
      { name: "Dashboard personalizable", nexus: "Drag and drop + widgets + KPIs", ghl: "Dashboard fijo", nexusScore: 97, ghlScore: 72, verdict: "win" },
      { name: "Reportes avanzados", nexus: "Custom reports + drill-down + export", ghl: "Reportes predefinidos", nexusScore: 96, ghlScore: 70, verdict: "win" },
      { name: "Alertas proactivas", nexus: "Nelvyon detecta anomalias + notifica", ghl: "No disponible", nexusScore: 95, ghlScore: 0, verdict: "win" },
      { name: "Funnel analytics", nexus: "Conversion funnel + drop-off analysis", ghl: "Funnel stats basicos", nexusScore: 95, ghlScore: 75, verdict: "win" },
    ],
  },
  {
    category: "Nelvyon Avanzado",
    emoji: "🤖",
    features: [
      { name: "Lead scoring Nelvyon", nexus: "Scoring predictivo con ML", ghl: "No disponible nativo", nexusScore: 97, ghlScore: 40, verdict: "win" },
      { name: "Next best action", nexus: "Nelvyon recomienda siguiente accion", ghl: "No disponible", nexusScore: 95, ghlScore: 0, verdict: "win" },
      { name: "Generacion de contenido", nexus: "Emails, posts, landing pages con Nelvyon", ghl: "Basica en algunos modulos", nexusScore: 96, ghlScore: 60, verdict: "win" },
      { name: "Chatbot Nelvyon", nexus: "Chatbot conversacional + entrenamiento", ghl: "Bot basico con flujos", nexusScore: 95, ghlScore: 65, verdict: "win" },
      { name: "Transcripcion de llamadas", nexus: "Transcripcion + resumen + action items", ghl: "No disponible", nexusScore: 94, ghlScore: 0, verdict: "win" },
    ],
  },
  {
    category: "White-Label y Plataforma",
    emoji: "🏷️",
    features: [
      { name: "White-label completo", nexus: "Branding total + dominio + app", ghl: "White-label SaaS mode", nexusScore: 98, ghlScore: 95, verdict: "win" },
      { name: "Sub-cuentas", nexus: "Ilimitadas + permisos granulares", ghl: "Sub-accounts", nexusScore: 96, ghlScore: 92, verdict: "win" },
      { name: "Marketplace", nexus: "Marketplace de templates + snapshots", ghl: "Snapshots marketplace", nexusScore: 93, ghlScore: 88, verdict: "win" },
      { name: "API publica", nexus: "REST + GraphQL + webhooks + SDKs", ghl: "REST API", nexusScore: 96, ghlScore: 80, verdict: "win" },
      { name: "2FA y seguridad", nexus: "2FA + SSO + audit log + RBAC", ghl: "2FA basico", nexusScore: 97, ghlScore: 78, verdict: "win" },
      { name: "Editor colaborativo", nexus: "Edicion en tiempo real multi-usuario", ghl: "No disponible", nexusScore: 92, ghlScore: 0, verdict: "win" },
    ],
  },
];

function getScoreColor(score: number) {
  if (score >= 90) return "text-emerald-400";
  if (score >= 75) return "text-blue-400";
  if (score >= 60) return "text-amber-400";
  if (score >= 40) return "text-orange-400";
  return "text-red-400";
}

function getBarGradient(score: number) {
  if (score >= 90) return "from-emerald-500 to-emerald-400";
  if (score >= 75) return "from-blue-500 to-cyan-400";
  if (score >= 60) return "from-amber-500 to-yellow-400";
  if (score >= 40) return "from-orange-500 to-amber-400";
  return "from-red-500 to-rose-400";
}

export default function VsGoHighLevel() {
  const { ts } = useI18n();
  const allFeatures = sections.flatMap((s) => s.features);
  const wins = allFeatures.filter((f) => f.verdict === "win").length;
  const ties = allFeatures.filter((f) => f.verdict === "tie").length;
  const losses = allFeatures.filter((f) => f.verdict === "lose").length;
  const avgNexus = Math.round(allFeatures.reduce((s, f) => s + f.nexusScore, 0) / allFeatures.length);
  const avgGHL = Math.round(allFeatures.reduce((s, f) => s + f.ghlScore, 0) / allFeatures.length);

  return (
    <SaasLayout>
      <div className="p-6 space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Nelvyon vs GoHighLevel</h1>
            <p className="text-sm text-muted-foreground mt-1">Comparativa exhaustiva de {allFeatures.length} funcionalidades en {sections.length} categorias</p>
          </div>
          <Badge className="bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-bold text-sm px-4 py-1.5 hover:from-amber-500 hover:to-yellow-400">
            <Trophy className="w-4 h-4 mr-2" /> Nelvyon Gana
          </Badge>
        </div>

        {/* Score Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="bg-gradient-to-br from-indigo-500/10 to-purple-500/5 border-indigo-500/30 lg:col-span-1">
            <CardContent className="p-5 text-center">
              <Trophy className="w-8 h-8 text-amber-400 mx-auto mb-2" />
              <p className="text-3xl font-bold text-foreground">{wins}</p>
              <p className="text-xs text-emerald-400 font-semibold">Victorias</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border/40">
            <CardContent className="p-5 text-center">
              <div className="text-3xl font-bold text-foreground">{ties}</div>
              <p className="text-xs text-amber-400 font-semibold">Empates</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border/40">
            <CardContent className="p-5 text-center">
              <div className="text-3xl font-bold text-foreground">{losses}</div>
              <p className="text-xs text-red-400 font-semibold">Derrotas</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border/40">
            <CardContent className="p-5 text-center">
              <p className="text-[10px] text-muted-foreground uppercase mb-1">Nelvyon Avg</p>
              <div className="text-3xl font-bold text-emerald-400">{avgNexus}%</div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border/40">
            <CardContent className="p-5 text-center">
              <p className="text-[10px] text-muted-foreground uppercase mb-1">GHL Avg</p>
              <div className="text-3xl font-bold text-blue-400">{avgGHL}%</div>
            </CardContent>
          </Card>
        </div>

        {/* Head to Head Bar */}
        <Card className="bg-card border-border/40">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="text-right w-32">
                <p className="text-sm font-bold text-indigo-400">Nelvyon</p>
                <p className="text-2xl font-bold text-foreground">{avgNexus}%</p>
              </div>
              <div className="flex-1 h-10 bg-secondary/20 rounded-full overflow-hidden flex">
                <div
                  className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-l-full flex items-center justify-end pr-3 transition-all"
                  style={{ width: `${(avgNexus / (avgNexus + avgGHL)) * 100}%` }}
                >
                  <span className="text-xs font-bold text-white">{((avgNexus / (avgNexus + avgGHL)) * 100).toFixed(0)}%</span>
                </div>
                <div
                  className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-r-full flex items-center justify-start pl-3 transition-all"
                  style={{ width: `${(avgGHL / (avgNexus + avgGHL)) * 100}%` }}
                >
                  <span className="text-xs font-bold text-white">{((avgGHL / (avgNexus + avgGHL)) * 100).toFixed(0)}%</span>
                </div>
              </div>
              <div className="w-32">
                <p className="text-sm font-bold text-blue-400">GoHighLevel</p>
                <p className="text-2xl font-bold text-foreground">{avgGHL}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Category by Category */}
        {sections.map((section) => {
          const sectionAvgN = Math.round(section.features.reduce((s, f) => s + f.nexusScore, 0) / section.features.length);
          const sectionAvgG = Math.round(section.features.reduce((s, f) => s + f.ghlScore, 0) / section.features.length);
          const sectionWins = section.features.filter((f) => f.verdict === "win").length;

          return (
            <Card key={section.category} className="bg-card border-border/40">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <span className="text-lg">{section.emoji}</span> {section.category}
                  </CardTitle>
                  <div className="flex items-center gap-3">
                    <Badge className="bg-indigo-500/10 text-indigo-400 text-xs hover:bg-indigo-500/10">Nelvyon: {sectionAvgN}%</Badge>
                    <Badge className="bg-blue-500/10 text-blue-400 text-xs hover:bg-blue-500/10">GHL: {sectionAvgG}%</Badge>
                    <Badge className="bg-emerald-500/10 text-emerald-400 text-xs hover:bg-emerald-500/10">
                      <Trophy className="w-3 h-3 mr-1" /> {sectionWins}/{section.features.length} ganadas
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="space-y-2">
                  {section.features.map((feature) => (
                    <div key={feature.name} className="p-3.5 rounded-xl bg-secondary/10 border border-border/20 hover:border-border/40 transition-all">
                      <div className="flex items-start gap-4">
                        {/* Verdict Icon */}
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          feature.verdict === "win" ? "bg-emerald-500/15" :
                          feature.verdict === "tie" ? "bg-amber-500/15" :
                          "bg-red-500/15"
                        }`}>
                          {feature.verdict === "win" ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> :
                           feature.verdict === "tie" ? <Star className="w-4 h-4 text-amber-400" /> :
                           <XCircle className="w-4 h-4 text-red-400" />}
                        </div>

                        {/* Feature Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <p className="text-sm font-semibold text-foreground/90">{feature.name}</p>
                            {feature.verdict === "win" && (
                              <Badge className="bg-emerald-500/10 text-emerald-400 text-[9px] hover:bg-emerald-500/10">
                                +{feature.nexusScore - feature.ghlScore}pts
                              </Badge>
                            )}
                          </div>

                          {/* Score Bars */}
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-[10px]">
                                <span className="text-indigo-400 font-semibold">Nelvyon</span>
                                <span className={`font-bold ${getScoreColor(feature.nexusScore)}`}>{feature.nexusScore}%</span>
                              </div>
                              <div className="h-2 bg-secondary/30 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full bg-gradient-to-r ${getBarGradient(feature.nexusScore)}`} style={{ width: `${feature.nexusScore}%` }} />
                              </div>
                              <p className="text-[10px] text-muted-foreground leading-relaxed">{feature.nexus}</p>
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-[10px]">
                                <span className="text-blue-400 font-semibold">GoHighLevel</span>
                                <span className={`font-bold ${getScoreColor(feature.ghlScore)}`}>{feature.ghlScore}%</span>
                              </div>
                              <div className="h-2 bg-secondary/30 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full bg-gradient-to-r ${getBarGradient(feature.ghlScore)}`} style={{ width: `${feature.ghlScore}%` }} />
                              </div>
                              <p className="text-[10px] text-muted-foreground leading-relaxed">{feature.ghl}</p>
                            </div>
                          </div>

                          {feature.detail && (
                            <div className="mt-2 p-2 rounded-lg bg-indigo-500/5 border border-indigo-500/10">
                              <p className="text-[10px] text-indigo-400 flex items-center gap-1">
                                <Sparkles className="w-3 h-3" /> {feature.detail}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}

        {/* Final Verdict */}
        <Card className="bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-pink-500/10 border-2 border-indigo-500/30">
          <CardContent className="p-8 text-center space-y-4">
            <Trophy className="w-16 h-16 text-amber-400 mx-auto" />
            <h2 className="text-2xl font-bold text-foreground">Veredicto Final</h2>
            <div className="flex items-center justify-center gap-8">
              <div>
                <p className="text-4xl font-bold text-indigo-400">{avgNexus}%</p>
                <p className="text-sm text-muted-foreground">Nelvyon</p>
              </div>
              <div className="text-2xl font-bold text-muted-foreground">vs</div>
              <div>
                <p className="text-4xl font-bold text-blue-400">{avgGHL}%</p>
                <p className="text-sm text-muted-foreground">GoHighLevel</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground max-w-lg mx-auto leading-relaxed">
              Nelvyon supera a GoHighLevel en <span className="text-emerald-400 font-bold">{wins} de {allFeatures.length}</span> funcionalidades analizadas,
              con una ventaja promedio de <span className="text-indigo-400 font-bold">+{avgNexus - avgGHL} puntos</span>.
              Las mayores ventajas están en Nelvyon avanzado, analytics, helpdesk y redes sociales.
            </p>
            <Badge className="bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-bold text-base px-6 py-2 hover:from-amber-500 hover:to-yellow-400">
              <Crown className="w-5 h-5 mr-2" /> Nelvyon es la Mejor Plataforma SaaS del Mundo
            </Badge>
          </CardContent>
        </Card>
      </div>
    </SaasLayout>
  );
}
