export const STEP_TYPE_LABELS: Record<string, string> = {
  Anuncio: "Tráfico de publicidad",
  Landing: "Página de aterrizaje",
  Formulario: "Captura de leads",
  CRM: "Deal en pipeline",
};

export const DEFAULT_FUNNEL_STEPS = [
  { name: "Anuncio", exit_url: "/publicidad" },
  { name: "Landing", exit_url: "/dashboard/landing-pages" },
  { name: "Formulario", exit_url: null },
  { name: "CRM", exit_url: "/crm/deals/new" },
] as const;
