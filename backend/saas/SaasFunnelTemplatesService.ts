/**
 * Official funnel templates — GHL snapshot parity.
 */
import { getSaasFunnelService, type CreateFunnelInput } from "./SaasFunnelService";

export type FunnelTemplate = {
  id: string;
  name: string;
  description: string;
  category: "local" | "ecommerce" | "saas" | "lead-gen";
  steps: NonNullable<CreateFunnelInput["steps"]>;
};

const OFFICIAL: FunnelTemplate[] = [
  {
    id: "local-lead-capture",
    name: "Local · Lead → CRM",
    description: "Anuncio → Landing → Formulario → Thank you",
    category: "local",
    steps: [
      { type: "landing", name: "Landing local", ctaLabel: "Solicitar info", ctaUrl: "#form" },
      { type: "form", name: "Formulario captura", ctaLabel: "Enviar", content: "Nombre, email, teléfono" },
      { type: "thankyou", name: "Gracias", content: "Te contactamos en 24h" },
    ],
  },
  {
    id: "ecom-purchase",
    name: "Ecommerce · Compra",
    description: "Landing producto → Checkout → Upsell → Thank you",
    category: "ecommerce",
    steps: [
      { type: "landing", name: "Página producto", ctaLabel: "Comprar ahora" },
      { type: "checkout", name: "Checkout", ctaLabel: "Pagar" },
      { type: "upsell", name: "Oferta complementaria", ctaLabel: "Añadir al pedido" },
      { type: "thankyou", name: "Pedido confirmado", content: "Gracias por tu compra" },
    ],
  },
  {
    id: "saas-demo",
    name: "SaaS B2B · Demo",
    description: "Landing PLG → Form demo → Video → Thank you",
    category: "saas",
    steps: [
      { type: "landing", name: "Landing PLG", ctaLabel: "Probar gratis" },
      { type: "form", name: "Registro demo", content: "Email corporativo + empresa" },
      { type: "video", name: "Demo en vídeo", content: "Walkthrough 3 min" },
      { type: "thankyou", name: "Demo agendada", content: "Revisa tu email" },
    ],
  },
  {
    id: "webinar-funnel",
    name: "Webinar registration",
    description: "HubSpot-style webinar funnel.",
    category: "lead-gen",
    steps: [
      { type: "landing", name: "Registro webinar", ctaLabel: "Reservar plaza" },
      { type: "form", name: "Datos asistente", content: "Nombre, email, empresa" },
      { type: "thankyou", name: "Confirmación", content: "Enlace calendario enviado" },
    ],
  },
  {
    id: "quote-funnel",
    name: "Solicitud presupuesto",
    description: "Landing → Form quote → Thank you + CRM",
    category: "lead-gen",
    steps: [
      { type: "landing", name: "Propuesta de valor", ctaLabel: "Pedir presupuesto" },
      { type: "form", name: "Brief proyecto", content: "Empresa, presupuesto, necesidades" },
      { type: "thankyou", name: "Propuesta en camino", content: "Respuesta en 48h" },
    ],
  },
  {
    id: "vsl-funnel",
    name: "VSL → Oferta",
    description: "Video sales letter clásico GHL.",
    category: "lead-gen",
    steps: [
      { type: "video", name: "VSL principal", content: "Vídeo de ventas 15 min" },
      { type: "landing", name: "Oferta limitada", ctaLabel: "Comprar ahora" },
      { type: "checkout", name: "Checkout", ctaLabel: "Finalizar" },
      { type: "thankyou", name: "Acceso confirmado", content: "Bienvenido" },
    ],
  },
];

export class SaasFunnelTemplatesError extends Error {
  constructor(message: string, public readonly code: "NOT_FOUND") {
    super(message);
    this.name = "SaasFunnelTemplatesError";
  }
}

export class SaasFunnelTemplatesService {
  list(category?: FunnelTemplate["category"]): FunnelTemplate[] {
    if (!category) return [...OFFICIAL];
    return OFFICIAL.filter((t) => t.category === category);
  }

  get(id: string): FunnelTemplate {
    const t = OFFICIAL.find((x) => x.id === id);
    if (!t) throw new SaasFunnelTemplatesError("Template not found", "NOT_FOUND");
    return t;
  }

  async importTemplate(tenantId: string, templateId: string, overrideName?: string) {
    const template = this.get(templateId);
    const funnel = await getSaasFunnelService().create(tenantId, {
      name: overrideName ?? template.name,
      description: template.description,
      steps: template.steps,
    });
    return { funnelId: funnel.id, name: funnel.name, stepsCount: funnel.steps.length };
  }
}

let _instance: SaasFunnelTemplatesService | null = null;
export function getSaasFunnelTemplatesService(): SaasFunnelTemplatesService {
  if (!_instance) _instance = new SaasFunnelTemplatesService();
  return _instance;
}
