/**
 * Nelvyon Agent Skills — inspired by OpenClaw skill cards, native multi-tenant.
 * Each skill specializes one Nelvyon service lane (inbox, SEO, social, packs…).
 */

export type NelvyonAgentChannel = "email" | "whatsapp" | "sms" | "instagram" | "facebook" | "chat" | "voice" | "social";

export type NelvyonAgentSkill = {
  id: string;
  name: string;
  description: string;
  channels: NelvyonAgentChannel[];
  nelvyonServices: string[];
  systemPrompt: string;
  /** Keyword hints for mock / rule-based replies when LLM is off */
  triggers: string[];
};

export const NELVYON_AGENT_SKILLS: readonly NelvyonAgentSkill[] = [
  {
    id: "inbox_support",
    name: "Soporte Inbox",
    description: "Responde email y WhatsApp con tono profesional y escalado seguro.",
    channels: ["email", "whatsapp", "sms", "chat"],
    nelvyonServices: ["inbox", "helpdesk"],
    systemPrompt:
      "Eres el agente de soporte de NELVYON. Responde en español, breve y empático. " +
      "Si detectas reclamación legal o cancelación urgente, indica que un humano revisará el caso.",
    triggers: ["hola", "ayuda", "precio", "informacion", "horario", "contacto"],
  },
  {
    id: "crm_assist",
    name: "Asistente CRM",
    description: "Califica leads y sugiere siguientes pasos en pipeline.",
    channels: ["email", "whatsapp", "voice"],
    nelvyonServices: ["crm", "pipeline"],
    systemPrompt:
      "Ayudas a gestionar contactos y oportunidades. Pregunta datos clave (nombre, empresa, necesidad) " +
      "y propone agendar llamada o mover el deal al siguiente stage.",
    triggers: ["lead", "contacto", "cliente", "presupuesto", "cotizacion"],
  },
  {
    id: "nelvyon_services",
    name: "Catálogo Servicios Nelvyon",
    description: "Explica packs OS (local, ecommerce, SaaS B2B) y SKUs autónomos.",
    channels: ["email", "whatsapp", "chat", "voice"],
    nelvyonServices: ["packs", "NELVYON-LANDING", "NELVYON-SEO", "NELVYON-CHATBOT"],
    systemPrompt:
      "Conoces los packs de crecimiento Nelvyon: local-business-growth, ecommerce-growth, saas-b2b-growth " +
      "y SKUs NELVYON-LANDING, NELVYON-SEO, NELVYON-CHATBOT. Explica beneficios sin prometer resultados garantizados.",
    triggers: ["pack", "landing", "seo", "chatbot", "nelvyon", "servicio", "agencia"],
  },
  {
    id: "social_publisher",
    name: "Redes Sociales",
    description: "Redacta posts y responde comentarios alineados con la marca.",
    channels: ["instagram", "facebook", "social"],
    nelvyonServices: ["social", "SaasSocialService"],
    systemPrompt:
      "Redactas copy para redes (Instagram, Facebook, LinkedIn). Tono cercano, CTA claro, sin hashtags excesivos.",
    triggers: ["instagram", "facebook", "post", "redes", "publicar", "stories"],
  },
  {
    id: "campaigns_email",
    name: "Campañas Email",
    description: "Ayuda con asuntos, previews y respuestas de campañas SES.",
    channels: ["email"],
    nelvyonServices: ["campanias", "ses"],
    systemPrompt:
      "Especialista en email marketing B2B. Sugiere asuntos cortos, preview text y respuestas a dudas de campaña.",
    triggers: ["campana", "newsletter", "email", "apertura", "clic"],
  },
  {
    id: "workflows_ops",
    name: "Automatización",
    description: "Explica workflows y dispara acciones repetibles.",
    channels: ["email", "chat", "voice"],
    nelvyonServices: ["workflows", "autopilot"],
    systemPrompt:
      "Ayudas a configurar automatizaciones: triggers, delays y acciones CRM. Sugiere workflows simples primero.",
    triggers: ["workflow", "automatizacion", "autopilot", "trigger"],
  },
] as const;

export function getNelvyonAgentSkill(id: string): NelvyonAgentSkill | undefined {
  return NELVYON_AGENT_SKILLS.find((s) => s.id === id);
}

export function resolveSkillsForChannel(
  channel: string,
  activeSkillIds?: string[] | null,
): NelvyonAgentSkill[] {
  const active = activeSkillIds?.length ? new Set(activeSkillIds) : null;
  return NELVYON_AGENT_SKILLS.filter((s) => {
    if (active && !active.has(s.id)) return false;
    if (channel === "social") return s.channels.includes("social");
    return (s.channels as string[]).includes(channel);
  });
}

export function pickSkillForMessage(body: string, skills: NelvyonAgentSkill[]): NelvyonAgentSkill {
  const norm = body
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
  let best = skills[0] ?? NELVYON_AGENT_SKILLS[0]!;
  let score = 0;
  for (const skill of skills) {
    let s = 0;
    for (const t of skill.triggers) {
      if (norm.includes(t)) s += t.length;
    }
    if (s > score) {
      score = s;
      best = skill;
    }
  }
  return best;
}
