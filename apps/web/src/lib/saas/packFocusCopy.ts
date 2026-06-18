/** Contextual copy when launching a growth pack from a focused catalog entry (?focus=). */

export type PackFocusKey = "seo" | "meta" | "email" | "landing";

export const PACK_FOCUS_COPY: Record<
  PackFocusKey,
  {
    title: string;
    hint: string;
    catalogPackName: string;
    parentPackName: string;
    reportComplementTitle: string;
  }
> = {
  seo: {
    catalogPackName: "Pack SEO Local",
    parentPackName: "Pack Crecimiento Local",
    title: "Modo demo: SEO local",
    hint: "Lanzamos el motor de Crecimiento Local con plantilla de clínica/restaurante. Recibirás landing, informe SEO y chatbot — ideal para enseñar posicionamiento en tu ciudad.",
    reportComplementTitle: "En el informe verás el bloque SEO resaltado y cómo encaja con landing, chatbot y email del pack integral.",
  },
  meta: {
    catalogPackName: "Pack Campañas Meta Ads",
    parentPackName: "Pack Crecimiento Ecommerce",
    title: "Modo demo: Meta Ads + ecommerce",
    hint: "Usamos el pack Ecommerce con canal Meta preconfigurado. Entregables: landing tienda, kit Meta Ads y chatbot de ventas.",
    reportComplementTitle: "El informe destaca el kit Meta Ads y muestra el resto del stack ecommerce (tienda, SEO, carrito abandonado).",
  },
  email: {
    catalogPackName: "Pack Email Welcome + Nurturing",
    parentPackName: "Pack Crecimiento Local",
    title: "Modo demo: email de bienvenida",
    hint: "El pack Local incluye secuencia welcome de 3 emails. Tras el lanzamiento, revisa el informe CEO y la campaña en CRM.",
    reportComplementTitle: "El informe resalta la secuencia welcome y explica cómo la landing y el chatbot del pack Local alimentan la lista.",
  },
  landing: {
    catalogPackName: "Pack Landing + Funnel",
    parentPackName: "Pack Crecimiento SaaS B2B",
    title: "Modo demo: landing PLG y funnel B2B",
    hint: "Lanzamos el pack SaaS B2B con plantilla DevTools. Recibirás landing PLG, bot de demo, nurture y playbook outbound.",
    reportComplementTitle: "El informe enfatiza landing + funnel y conecta con nurture, SEO y outbound del pack B2B integral.",
  },
};

export function resolvePackFocus(focus: string | null): PackFocusKey | null {
  if (focus === "seo" || focus === "meta" || focus === "email" || focus === "landing") {
    return focus;
  }
  return null;
}
