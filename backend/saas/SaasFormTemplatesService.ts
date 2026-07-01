/**
 * Plantillas oficiales Nelvyon — captación de leads y formularios profesionales.
 */
import { DbClient } from "../db/DbClient";

export type FormTemplateCategory = "lead-capture" | "quote" | "event" | "feedback" | "booking";

export type FormFieldTemplate = {
  id: string;
  type: "text" | "email" | "phone" | "textarea" | "select" | "checkbox" | "number" | "date" | "url";
  label: string;
  placeholder: string;
  required: boolean;
  options?: string[];
};

export type FormTemplate = {
  id: string;
  name: string;
  description: string;
  category: FormTemplateCategory;
  tags: string[];
  fields: FormFieldTemplate[];
};

export class SaasFormTemplatesError extends Error {
  constructor(message: string, public readonly code: "NOT_FOUND" | "VALIDATION") {
    super(message);
    this.name = "SaasFormTemplatesError";
  }
}

const OFFICIAL: FormTemplate[] = [
  {
    id: "lead-capture-basic",
    name: "Lead Capture",
    description: "Nombre, email y teléfono — captación estándar para landing pages.",
    category: "lead-capture",
    tags: ["lead", "landing"],
    fields: [
      { id: "f1", type: "text", label: "Nombre completo", placeholder: "Tu nombre", required: true },
      { id: "f2", type: "email", label: "Email", placeholder: "tu@email.com", required: true },
      { id: "f3", type: "phone", label: "Teléfono", placeholder: "+34 600 000 000", required: false },
    ],
  },
  {
    id: "quote-request",
    name: "Solicitud de presupuesto",
    description: "Captura leads B2B con empresa y presupuesto estimado.",
    category: "quote",
    tags: ["b2b", "quote"],
    fields: [
      { id: "f1", type: "text", label: "Empresa", placeholder: "Nombre de la empresa", required: true },
      { id: "f2", type: "email", label: "Email corporativo", placeholder: "nombre@empresa.com", required: true },
      { id: "f3", type: "select", label: "Presupuesto mensual", placeholder: "Selecciona rango", required: true, options: ["< 500 €", "500–2.000 €", "2.000–10.000 €", "> 10.000 €"] },
      { id: "f4", type: "textarea", label: "¿Qué necesitas?", placeholder: "Describe tu proyecto…", required: true },
    ],
  },
  {
    id: "event-rsvp",
    name: "RSVP Evento / Webinar",
    description: "Registro para eventos y webinars.",
    category: "event",
    tags: ["webinar", "event"],
    fields: [
      { id: "f1", type: "text", label: "Nombre", placeholder: "Nombre", required: true },
      { id: "f2", type: "email", label: "Email", placeholder: "Email", required: true },
      { id: "f3", type: "text", label: "Empresa", placeholder: "Empresa (opcional)", required: false },
      { id: "f4", type: "checkbox", label: "Acepto recibir comunicaciones", placeholder: "GDPR marketing", required: true },
    ],
  },
  {
    id: "nps-feedback",
    name: "NPS Post-venta",
    description: "Encuesta NPS 0–10 + comentario abierto.",
    category: "feedback",
    tags: ["nps", "reviews"],
    fields: [
      { id: "f1", type: "email", label: "Email", placeholder: "tu@email.com", required: true },
      { id: "f2", type: "number", label: "¿Recomendarías nuestro servicio? (0-10)", placeholder: "10", required: true },
      { id: "f3", type: "textarea", label: "¿Qué podemos mejorar?", placeholder: "Tu feedback…", required: false },
    ],
  },
  {
    id: "booking-request",
    name: "Reserva de cita",
    description: "Formulario de citas para negocios locales.",
    category: "booking",
    tags: ["calendar", "local"],
    fields: [
      { id: "f1", type: "text", label: "Nombre", placeholder: "Nombre", required: true },
      { id: "f2", type: "phone", label: "Teléfono", placeholder: "Teléfono", required: true },
      { id: "f3", type: "email", label: "Email", placeholder: "Email", required: true },
      { id: "f4", type: "date", label: "Fecha preferida", placeholder: "", required: true },
      { id: "f5", type: "textarea", label: "Motivo de la cita", placeholder: "Cuéntanos qué necesitas", required: false },
    ],
  },
  {
    id: "newsletter-signup",
    name: "Newsletter signup",
    description: "Suscripción simple email + intereses.",
    category: "lead-capture",
    tags: ["newsletter", "email"],
    fields: [
      { id: "f1", type: "email", label: "Email", placeholder: "tu@email.com", required: true },
      { id: "f2", type: "select", label: "Interés", placeholder: "Tema", required: false, options: ["Marketing", "Ventas", "Producto", "Otros"] },
    ],
  },
  {
    id: "contact-us",
    name: "Contacto general",
    description: "Formulario de contacto profesional.",
    category: "lead-capture",
    tags: ["contact"],
    fields: [
      { id: "f1", type: "text", label: "Nombre", placeholder: "Nombre", required: true },
      { id: "f2", type: "email", label: "Email", placeholder: "Email", required: true },
      { id: "f3", type: "text", label: "Asunto", placeholder: "Asunto", required: true },
      { id: "f4", type: "textarea", label: "Mensaje", placeholder: "Tu mensaje…", required: true },
    ],
  },
  {
    id: "job-application",
    name: "Candidatura / recruiting",
    description: "Captura candidatos con LinkedIn y CV link.",
    category: "lead-capture",
    tags: ["hr", "recruiting"],
    fields: [
      { id: "f1", type: "text", label: "Nombre completo", placeholder: "Nombre", required: true },
      { id: "f2", type: "email", label: "Email", placeholder: "Email", required: true },
      { id: "f3", type: "url", label: "LinkedIn / Portfolio", placeholder: "https://", required: false },
      { id: "f4", type: "textarea", label: "Carta de presentación", placeholder: "Breve presentación…", required: false },
    ],
  },
];

type DbPort = { query: <T = Record<string, unknown>>(sql: string, params?: unknown[]) => Promise<T[]> };

export class SaasFormTemplatesService {
  constructor(private readonly db: DbPort = DbClient.getInstance()) {}

  list(category?: FormTemplateCategory): FormTemplate[] {
    if (!category) return [...OFFICIAL];
    return OFFICIAL.filter((t) => t.category === category);
  }

  get(id: string): FormTemplate {
    const t = OFFICIAL.find((x) => x.id === id);
    if (!t) throw new SaasFormTemplatesError("Template not found", "NOT_FOUND");
    return t;
  }

  async importTemplate(tenantId: string, templateId: string, overrideName?: string): Promise<{ formId: string; name: string }> {
    const template = this.get(templateId);
    const rows = await this.db.query<{ id: string }>(
      `INSERT INTO saas_forms (tenant_id, name, description, fields)
       VALUES ($1,$2,$3,$4::jsonb)
       RETURNING id`,
      [tenantId, overrideName ?? template.name, template.description, JSON.stringify(template.fields)],
    );
    if (!rows[0]) throw new SaasFormTemplatesError("Failed to create form", "VALIDATION");
    return { formId: rows[0].id, name: overrideName ?? template.name };
  }
}

let _instance: SaasFormTemplatesService | null = null;
export function getSaasFormTemplatesService(): SaasFormTemplatesService {
  if (!_instance) _instance = new SaasFormTemplatesService();
  return _instance;
}
export function resetSaasFormTemplatesServiceForTests(): void {
  _instance = null;
}
