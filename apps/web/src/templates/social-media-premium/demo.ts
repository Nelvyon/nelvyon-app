import type { SocialMediaProjectConfig } from "@/templates/social-media-premium/types";
import { SOCIAL_MEDIA_PREMIUM_PREVIEW_PATH } from "@/templates/social-media-premium/paths";

/** Demo OS handoff — illustrative only; no social API integration; DS v2 shell. */
export const socialMediaPremiumNelvyonDemoProject: SocialMediaProjectConfig = {
  pageSeo: {
    title: "NELVYON OS — Social Media Premium delivery template (preview)",
    description:
      "Premium social checklist: strategy, calendar, creative, publishing, community, growth, reporting. Paperwork only — no network APIs.",
    canonicalPath: SOCIAL_MEDIA_PREMIUM_PREVIEW_PATH,
    siteName: "NELVYON Social Media Premium",
    keywords: ["social media", "NELVYON", "OS", "delivery"],
    locale: "es_ES",
  },
  clientLabel: "Demo retainer · Pulse Lifestyle Co.",
  projectName: "Always-on social Q3 · Paquete de entrega OS",
  projectSubtitle:
    "Lista de chequeo antes de que marca asuma el programa social como “en producción”. Sin conectores OAuth ni publicadores automáticos desde esta capa.",
  generatedNote:
    "Plantilla v2 (Design System aplicado). Badges de plataforma son etiquetas de alcance (Instagram, LinkedIn, TikTok, X/Twitter, Facebook, YouTube) — no activan envíos ni lecturas de API.",
  sections: [
    {
      id: "strategy_calendar",
      module: "strategy_calendar",
      title: "Estrategia y calendario",
      intro: "Pilares, frecuencia y ventanas de campaña por red.",
      items: [
        {
          id: "pillars",
          label: "Pilares de contenido y tono aprobados por marca",
          status: "pass",
          priority: "P1",
          platforms: ["instagram", "tiktok", "facebook"],
          evidence: "Matriz externa; contraste visual opcional con `/app/branding` si el retainer lo incluye.",
        },
        {
          id: "editorial-calendar",
          label: "Calendario editorial 8 semanas con slots por plataforma",
          status: "warn",
          priority: "P1",
          platforms: ["instagram", "linkedin", "youtube"],
          evidence: "Hoja compartida; plantilla OS solo refleja estado de revisión legal.",
        },
      ],
    },
    {
      id: "creative_copy",
      module: "creative_copy",
      title: "Creatividades y copies",
      intro: "Piezas estáticas, reels guionizados y variantes de copy.",
      items: [
        {
          id: "asset-pack",
          label: "Pack creativo versionado (naming + derechos de uso)",
          status: "pass",
          priority: "P1",
          platforms: ["instagram", "facebook", "youtube"],
          evidence: "Drive externo; sin DAM nuevo en NELVYON desde este preview.",
        },
        {
          id: "copy-variants",
          label: "Copies cortos/longos por plataforma (límite caracteres declarado)",
          status: "pending",
          priority: "P2",
          platforms: ["x_twitter", "linkedin", "tiktok"],
          evidence: "Pendiente copy legal para claims regulados (finanzas/salud).",
        },
      ],
    },
    {
      id: "publishing",
      module: "publishing",
      title: "Publicación",
      intro: "Scheduling manual documentado; sin APIs de redes.",
      items: [
        {
          id: "publish-rhythm",
          label: "Ritmo de publicación y zona horaria acordados",
          status: "pass",
          priority: "P1",
          platforms: ["instagram", "linkedin", "tiktok", "x_twitter", "facebook", "youtube"],
          evidence: "Operador documenta herramienta externa o proceso manual — producto NELVYON no publica desde aquí.",
        },
        {
          id: "cross-post-rules",
          label: "Reglas cross-post (qué va a cada red vs exclusivo)",
          status: "warn",
          priority: "P2",
          platforms: ["instagram", "facebook"],
          evidence: "Evitar duplicar contenido que rompa políticas de cada plataforma.",
        },
      ],
    },
    {
      id: "community_engagement",
      module: "community_engagement",
      title: "Comunidad y engagement",
      intro: "Moderación, respuestas y crisis ligera.",
      items: [
        {
          id: "moderation-playbook",
          label: "Playbook moderación (spam, odio, PII en comentarios)",
          status: "pass",
          priority: "P1",
          platforms: ["instagram", "facebook", "youtube", "tiktok"],
          evidence: "Escalación humana documentada; `/help` cuando el incidente excede alcance social.",
        },
        {
          id: "response-sla",
          label: "SLA de respuesta a DMs/comentarios (expectativas realistas)",
          status: "warn",
          priority: "P2",
          platforms: ["instagram", "linkedin", "x_twitter"],
          evidence: "Horario de cobertura ops vs promesa al cliente alineados.",
        },
      ],
    },
    {
      id: "growth_reach",
      module: "growth_reach",
      title: "Crecimiento y alcance",
      intro: "Tácticas orgánicas/pagas descritas sin garantías virales.",
      items: [
        {
          id: "growth-levers",
          label: "Palancas de crecimiento (colabs, UGC, hooks) listadas",
          status: "pending",
          priority: "P2",
          platforms: ["tiktok", "youtube", "instagram"],
          evidence: "Sin prometer algoritmo; experimentos acotados y medibles.",
        },
        {
          id: "paid-boost-boundary",
          label: "Límite anuncios pagos (si aplica) fuera de este template",
          status: "pass",
          priority: "P3",
          platforms: ["facebook", "instagram", "linkedin"],
          evidence: "Ads gestionados en plataformas externas — checklist solo marca si hay riesgo de promesa inflada.",
        },
      ],
    },
    {
      id: "reporting",
      module: "reporting",
      title: "Reporting y métricas",
      intro: "KPIs por plataforma y narrativa ejecutiva.",
      items: [
        {
          id: "kpi-sheet",
          label: "Hoja KPI (alcance, engagement rate, saves, clicks out)",
          status: "warn",
          priority: "P1",
          platforms: ["instagram", "linkedin", "tiktok", "x_twitter", "facebook", "youtube"],
          evidence: "Datos ingresados manualmente desde exports nativos de cada red — sin conector.",
        },
        {
          id: "campaign-bridge",
          label: "Si el piloto enlaza campañas workspace, referencia honesta a `/campaigns`",
          status: "pending",
          priority: "P3",
          evidence: "Solo si negocio vendió puente explícito; si no, N/A declarado.",
        },
      ],
    },
  ],
};
