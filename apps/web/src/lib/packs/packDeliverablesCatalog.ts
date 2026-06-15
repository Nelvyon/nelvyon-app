import {
  ECOMMERCE_GROWTH_PACK_ID,
  LOCAL_GROWTH_PACK_ID,
  SAAS_B2B_GROWTH_PACK_ID,
  type PackId,
} from "@/lib/packs/types";

export type PackDeliverableItem = {
  title: string;
  description: string;
  portalLabel: string;
};

const CATALOG: Record<PackId, PackDeliverableItem[]> = {
  [LOCAL_GROWTH_PACK_ID]: [
    {
      title: "Landing web local",
      description: "Página optimizada para conversión con CTA, mapa y formulario.",
      portalLabel: "Ver landing",
    },
    {
      title: "Auditoría SEO local",
      description: "Keywords geo, fichas Google y recomendaciones on-page.",
      portalLabel: "Descargar informe SEO",
    },
    {
      title: "Chatbot de citas",
      description: "Asistente 24/7 para reservas y preguntas frecuentes.",
      portalLabel: "Probar chatbot",
    },
    {
      title: "Campaña email de bienvenida",
      description: "Secuencia automática post-alta para activar nuevos clientes.",
      portalLabel: "Revisar campaña",
    },
    {
      title: "Informe ejecutivo",
      description: "Resumen de KPIs, QA y próximos pasos para el CEO.",
      portalLabel: "Abrir informe",
    },
  ],
  [ECOMMERCE_GROWTH_PACK_ID]: [
    {
      title: "Tienda / landing ecommerce",
      description: "Catálogo listo para vender con checkout y pixel.",
      portalLabel: "Ver tienda",
    },
    {
      title: "SEO de catálogo",
      description: "Optimización de fichas producto y categorías.",
      portalLabel: "Ver auditoría",
    },
    {
      title: "Chatbot de ventas",
      description: "Asistente que resuelve dudas y empuja al carrito.",
      portalLabel: "Probar chatbot",
    },
    {
      title: "Kit Meta Ads Advantage+",
      description: "Conjuntos de anuncios, creatividades y KPIs a seguir.",
      portalLabel: "Descargar kit",
    },
    {
      title: "Campaña carrito abandonado",
      description: "Secuencia 3-touch para recuperar ventas perdidas.",
      portalLabel: "Activar secuencia",
    },
    {
      title: "Informe ejecutivo",
      description: "ROAS objetivo, entregables y plan de 14 días.",
      portalLabel: "Abrir informe",
    },
  ],
  [SAAS_B2B_GROWTH_PACK_ID]: [
    {
      title: "Landing product-led",
      description: "Posicionamiento, prueba social y CTA a demo.",
      portalLabel: "Ver landing",
    },
    {
      title: "SEO demand gen",
      description: "Contenido y keywords para captar tráfico B2B.",
      portalLabel: "Ver informe SEO",
    },
    {
      title: "Bot de demo / calificación",
      description: "Califica leads y agenda demos automáticamente.",
      portalLabel: "Probar bot",
    },
    {
      title: "Secuencia nurture B2B",
      description: "Email 5-touch: problema → caso → demo → prueba social.",
      portalLabel: "Revisar secuencia",
    },
    {
      title: "Playbook outbound / ABM",
      description: "Secuencias LinkedIn, email frío y cuentas tier 1.",
      portalLabel: "Descargar playbook",
    },
    {
      title: "Informe ejecutivo",
      description: "Pipeline, demos objetivo y métricas MQL→SQL.",
      portalLabel: "Abrir informe",
    },
  ],
};

export function getPackDeliverablesCatalog(packId: PackId): PackDeliverableItem[] {
  return CATALOG[packId] ?? [];
}

export function getPackCeoKpis(
  packId: PackId,
  kpis: {
    deliverables_published: number;
    avg_qa_score: number;
    skus_passed: number;
    skus_total: number;
    extra_campaigns?: number;
  },
): { label: string; value: string; hint?: string }[] {
  const base = [
    {
      label: "Entregables en portal",
      value: String(kpis.deliverables_published),
      hint: "Lo que el cliente puede revisar hoy",
    },
    {
      label: "Calidad media",
      value: `${kpis.avg_qa_score}%`,
      hint: "Score QA autónomo",
    },
    {
      label: "Servicios completados",
      value: `${kpis.skus_passed}/${kpis.skus_total}`,
      hint: "Landing, SEO, chatbot",
    },
  ];

  if (packId === LOCAL_GROWTH_PACK_ID) {
    return [
      ...base,
      {
        label: "Campañas email",
        value: String(1 + (kpis.extra_campaigns ?? 0)),
        hint: "Bienvenida + activaciones",
      },
    ];
  }
  if (packId === ECOMMERCE_GROWTH_PACK_ID) {
    return [
      ...base,
      {
        label: "Campañas activas",
        value: String(1 + (kpis.extra_campaigns ?? 0)),
        hint: "Bienvenida + carrito abandonado",
      },
    ];
  }
  return [
    ...base,
    {
      label: "Playbooks B2B",
      value: "1",
      hint: "Outbound + ABM listo",
    },
  ];
}
