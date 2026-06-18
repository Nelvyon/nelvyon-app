/** Contextual copy when launching a growth pack from a focused catalog entry (?focus=). */

export type PackFocusKey = "seo" | "meta" | "email" | "landing";

export const PACK_FOCUS_COPY: Record<
  PackFocusKey,
  { title: string; hint: string; catalogPackName: string }
> = {
  seo: {
    catalogPackName: "Pack SEO Local",
    title: "Modo demo: SEO local",
    hint: "Lanzamos el motor de Crecimiento Local con plantilla de clínica/restaurante. Recibirás landing, informe SEO y chatbot — ideal para enseñar posicionamiento en tu ciudad.",
  },
  meta: {
    catalogPackName: "Pack Campañas Meta Ads",
    title: "Modo demo: Meta Ads + ecommerce",
    hint: "Usamos el pack Ecommerce con canal Meta preconfigurado. Entregables: landing tienda, kit Meta Ads y chatbot de ventas.",
  },
  email: {
    catalogPackName: "Pack Email Welcome + Nurturing",
    title: "Modo demo: email de bienvenida",
    hint: "El pack Local incluye secuencia welcome de 3 emails. Tras el lanzamiento, revisa el informe CEO y la campaña en CRM.",
  },
  landing: {
    catalogPackName: "Pack Landing + Funnel",
    title: "Modo demo: landing PLG y funnel B2B",
    hint: "Lanzamos el pack SaaS B2B con plantilla DevTools. Recibirás landing PLG, bot de demo, nurture y playbook outbound.",
  },
};

export function resolvePackFocus(focus: string | null): PackFocusKey | null {
  if (focus === "seo" || focus === "meta" || focus === "email" || focus === "landing") {
    return focus;
  }
  return null;
}
