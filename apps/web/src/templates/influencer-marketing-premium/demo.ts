import type { InfluencerProjectConfig } from "@/templates/influencer-marketing-premium/types";
import { INFLUENCER_MARKETING_PREMIUM_PREVIEW_PATH } from "@/templates/influencer-marketing-premium/paths";

/** Demo OS handoff — illustrative only; no influencer platforms or live contracts; DS v2 shell. */
export const influencerMarketingPremiumNelvyonDemoProject: InfluencerProjectConfig = {
  pageSeo: {
    title: "NELVYON OS — Influencer Marketing Premium delivery template (preview)",
    description:
      "Premium influencer checklist: strategy, selection, briefing, production, publication, metrics, reporting. Paperwork only — no marketplace APIs or e-sign.",
    canonicalPath: INFLUENCER_MARKETING_PREMIUM_PREVIEW_PATH,
    siteName: "NELVYON Influencer Marketing Premium",
    keywords: ["influencer", "UGC", "creator", "NELVYON", "OS"],
    locale: "es_ES",
  },
  clientLabel: "Demo cuenta · Solstice Skincare EU",
  projectName: "Lanzamiento SPF cohorte creators · Plantilla OS",
  projectSubtitle:
    "Estados antes de activar pagos talento. Esta capa no busca creators en marketplaces ni firma contratos.",
  generatedNote:
    "Plantilla v2 (Design System aplicado). Badges nano→mega, embajador, UGC, celebrity, B2B thought leader describen mix — no disparan briefs reales.",
  sections: [
    {
      id: "strategy_objectives",
      module: "strategy_objectives",
      title: "Estrategia y objetivos",
      intro: "KPIs, presupuesto y seguridad de marca.",
      items: [
        {
          id: "kpi-mix",
          label: "Mix KPI: alcance 60% / consideración 25% / tráfico UTM 15%",
          status: "pass",
          priority: "P1",
          types: ["nano", "micro", "macro"],
          evidence: "Workshop estrategia externo; sin datos ads live desde OS.",
        },
        {
          id: "brand-safety",
          label: "Tier seguridad marca A/B — lista palabras vetadas",
          status: "warn",
          priority: "P1",
          types: ["macro", "mega"],
          evidence: "Cliente quiere mega sin presupuesto moderación — warn documentado.",
        },
      ],
    },
    {
      id: "influencer_search_selection",
      module: "influencer_search_selection",
      title: "Búsqueda y selección de influencers",
      intro: "Vetting y overlap audiencia.",
      items: [
        {
          id: "longlist-40",
          label: "Longlist 40 perfiles + scoring fraude (growth spikes)",
          status: "pass",
          priority: "P1",
          types: ["mega", "celebrity", "brand_ambassador"],
          evidence: "Sheets manual; sin API discovery desde plantilla.",
        },
      ],
    },
    {
      id: "briefing_contract",
      module: "briefing_contract",
      title: "Briefing y contrato",
      intro: "Entregables, derechos y disclosure.",
      items: [
        {
          id: "usage-12m",
          label: "Whitelisting paid 90d + orgánico 12m en paid social",
          status: "pending",
          priority: "P1",
          types: ["ugc_creator", "brand_ambassador", "b2b_thought_leader"],
          evidence: "Legal redline externo; OS no DocuSign.",
        },
        {
          id: "hashtag-ad",
          label: "Hashtag #ad + mención marca obligatoria caption/reel",
          status: "pass",
          priority: "P2",
          types: ["ugc_creator", "brand_ambassador"],
          evidence: "Alineación con `/os/contenido-copywriting-premium/preview` como papeleo.",
        },
      ],
    },
    {
      id: "content_production",
      module: "content_production",
      title: "Producción de contenido",
      intro: "Rodajes y aprobaciones.",
      items: [
        {
          id: "shot-list",
          label: "Shot list 18 planos + 2 rondas revisión legal claims",
          status: "pass",
          priority: "P2",
          types: ["ugc_creator", "nano"],
          evidence: "Drive producción fuera de NELVYON.",
        },
      ],
    },
    {
      id: "publication_tracking",
      module: "publication_tracking",
      title: "Publicación y seguimiento",
      intro: "Ventanas y UTM.",
      items: [
        {
          id: "stagger-window",
          label: "Escalado publicaciones 10 días + tracker UTM campaña",
          status: "pass",
          priority: "P2",
          types: ["micro", "mega"],
          evidence: "Calendario cruzado con `/os/social-media-premium/preview`; sin auto-post.",
        },
      ],
    },
    {
      id: "metrics_roi",
      module: "metrics_roi",
      title: "Métricas y ROI",
      intro: "EMV, CPA y lift.",
      items: [
        {
          id: "emv-method",
          label: "EMV con tarifa card acordada + disclaimer honesto",
          status: "warn",
          priority: "P3",
          types: ["macro", "b2b_thought_leader"],
          evidence: "Sin triple digit EMV prometido — contraste `/os/ads-premium/preview` si boost.",
        },
      ],
    },
    {
      id: "final_reporting",
      module: "final_reporting",
      title: "Reporting final",
      intro: "Aprendizajes y renovación.",
      items: [
        {
          id: "renewal-pack",
          label: "Pack renovación Q4 + riesgos reputacionales",
          status: "pending",
          priority: "P3",
          types: ["celebrity", "brand_ambassador"],
          evidence: "PDF final en cliente; plantilla no agrega métricas live.",
        },
      ],
    },
  ],
};
