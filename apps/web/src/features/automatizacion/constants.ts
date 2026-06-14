import type { AutomationRecipe } from "@/features/automatizacion/types";

export const AUTOMATION_RECIPES: AutomationRecipe[] = [
  {
    id: "onboarding-lead",
    title: "Onboarding de lead en CRM",
    description: "Cuando entra un contacto nuevo, crea actividad de seguimiento y notifica al owner.",
    connector: "crm",
    trigger: "contact_created",
    action: "create_activity",
  },
  {
    id: "cart-recovery",
    title: "Recuperación de carrito",
    description: "Carrito abandonado en ecommerce → campaña email de recuperación.",
    connector: "ecommerce",
    trigger: "cart_abandoned",
    action: "send_email",
  },
  {
    id: "roas-alert",
    title: "Alerta ROAS bajo",
    description: "Si el ROAS de Publicidad cae bajo umbral, crea notificación y ticket interno.",
    connector: "publicidad",
    trigger: "roas_below_threshold",
    action: "create_notification",
  },
  {
    id: "urgent-ticket",
    title: "Ticket urgente Helpdesk",
    description: "Ticket SLA urgente → asignación automática y email al responsable.",
    connector: "helpdesk",
    trigger: "ticket_sla_urgent",
    action: "send_email",
  },
  {
    id: "deal-stage",
    title: "Deal avanza de etapa",
    description: "Deal pasa a propuesta → tarea comercial y email al cliente.",
    connector: "crm",
    trigger: "deal_stage_changed",
    action: "create_activity",
  },
  {
    id: "welcome-email",
    title: "Secuencia bienvenida Email",
    description: "Nuevo suscriptor → campaña email de bienvenida en 3 pasos.",
    connector: "email",
    trigger: "subscriber_created",
    action: "send_email",
  },
];

export const CONNECTOR_LABELS: Record<AutomationRecipe["connector"], string> = {
  crm: "CRM",
  helpdesk: "Helpdesk",
  publicidad: "Publicidad",
  email: "Email",
  ecommerce: "Ecommerce",
};

export const CONNECTOR_LINKS: Record<AutomationRecipe["connector"], string> = {
  crm: "/crm/deals",
  helpdesk: "/inbox/tickets",
  publicidad: "/publicidad",
  email: "/campaigns",
  ecommerce: "/ecommerce",
};
