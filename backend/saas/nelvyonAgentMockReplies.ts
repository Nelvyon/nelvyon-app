/**
 * Zero-cost rule-based replies for Nelvyon agent skills (no OPENAI_API_KEY).
 * Professional templates per skill — used by inbox agent and social bridge.
 */
import type { NelvyonAgentSkill } from "./nelvyonAgentSkillsCatalog";

const SKILL_REPLIES: Record<string, Array<{ test: RegExp; reply: string }>> = {
  inbox_support: [
    {
      test: /hola|buenas|buenos|hey|saludos/i,
      reply:
        "¡Hola! Gracias por contactarnos. Soy el asistente de soporte. ¿En qué puedo ayudarte hoy? " +
        "Puedo orientarte sobre servicios, horarios o conectarte con el equipo.",
    },
    {
      test: /horario|cuando abren|abierto/i,
      reply:
        "Nuestro horario de atención es de lunes a viernes, 9:00–18:00 (hora peninsular). " +
        "Fuera de ese horario tomamos nota y te respondemos a primera hora.",
    },
    {
      test: /contacto|telefono|email|llamar/i,
      reply:
        "Puedes responder por este mismo canal o dejar tu email/teléfono y un especialista te contactará en breve.",
    },
    {
      test: /precio|cuanto cuesta|tarifa|presupuesto/i,
      reply:
        "Tenemos packs adaptados a negocio local, ecommerce y SaaS B2B. " +
        "¿Qué tipo de negocio tienes? Te oriento con la opción más adecuada sin compromiso.",
    },
  ],
  crm_assist: [
    {
      test: /lead|contacto|cliente|oportunidad/i,
      reply:
        "Perfecto, puedo ayudarte a calificar este lead. ¿Me confirmas nombre, empresa y necesidad principal? " +
        "Así movemos la oportunidad al siguiente paso del pipeline.",
    },
    {
      test: /presupuesto|cotizacion|propuesta/i,
      reply:
        "Para preparar una propuesta necesitamos: alcance, plazo y presupuesto orientativo. " +
        "¿Quieres que agendemos una llamada de 15 minutos con el equipo comercial?",
    },
    {
      test: /agendar|cita|reunion|llamada/i,
      reply:
        "Genial. Indica 2 franjas horarias que te vengan bien y confirmamos la reunión por email.",
    },
  ],
  nelvyon_services: [
    {
      test: /pack|nelvyon|servicio|agencia/i,
      reply:
        "Nelvyon ejecuta packs de crecimiento con IA: local-business, ecommerce y saas-b2b. " +
        "Entregables en portal con QA. ¿Quieres que lancemos un brief?",
    },
    {
      test: /landing|web|pagina/i,
      reply:
        "NELVYON-LANDING genera landing optimizada con copy, diseño y publicación en portal para tu revisión. " +
        "¿Tienes ya dominio y referencias de marca?",
    },
    {
      test: /seo|posicionamiento|google/i,
      reply:
        "NELVYON-SEO incluye auditoría, keywords, contenido y plan técnico. " +
        "No garantizamos posiciones — sí entregables medibles y aprobables en portal.",
    },
    {
      test: /chatbot|bot|asistente virtual/i,
      reply:
        "NELVYON-CHATBOT configura un asistente web con captura de leads y escalado a humano. " +
        "¿Quieres ver un ejemplo en tu sector?",
    },
  ],
  social_publisher: [
    {
      test: /instagram|ig|stories|reels/i,
      reply:
        "Para Instagram te sugiero un post con gancho claro + CTA en bio. " +
        "¿Es promoción, educación o testimonio? Te redacto el copy en 1 minuto.",
    },
    {
      test: /facebook|fb|meta/i,
      reply:
        "En Facebook funcionan bien posts con beneficio concreto y enlace a reserva/compra. " +
        "¿Cuál es la oferta o mensaje principal esta semana?",
    },
    {
      test: /post|publicar|redes|contenido/i,
      reply:
        "Puedo proponerte un borrador listo para revisar: titular, cuerpo breve y 3–5 hashtags. " +
        "Dime sector (restaurante, clínica, ecommerce…) y objetivo (ventas, confianza, reservas).",
    },
    {
      test: /hashtag|etiqueta/i,
      reply:
        "Recomiendo 3–5 hashtags de nicho + 1–2 amplios. Evita más de 10 en Instagram. " +
        "¿Sobre qué tema es el post?",
    },
  ],
  campaigns_email: [
    {
      test: /campana|newsletter|mailing/i,
      reply:
        "Para tu campaña email: asunto corto (≤45 caracteres), preview text con beneficio y un solo CTA. " +
        "¿Es lanzamiento, nurturing o reactivación?",
    },
    {
      test: /asunto|subject|titulo email/i,
      reply:
        "Ideas de asunto: pregunta directa, número concreto o urgencia suave. " +
        "Ejemplo: «¿Listo para duplicar leads este mes?» — ¿Cuál es tu audiencia?",
    },
    {
      test: /apertura|clic|ctr|rebote/i,
      reply:
        "Mejora apertura segmentando lista, limpiando bounces y probando 2 asuntos A/B. " +
        "¿Quieres revisar la última campaña juntos?",
    },
  ],
  workflows_ops: [
    {
      test: /workflow|automatizacion|autopilot|trigger/i,
      reply:
        "Empieza con un workflow simple: nuevo lead → email bienvenida → tarea CRM a 24h. " +
        "¿Qué evento quieres automatizar primero?",
    },
    {
      test: /delay|espera|programar/i,
      reply:
        "Los delays de 1–3 días suelen funcionar bien en nurturing B2B. " +
        "¿Cuántos pasos tiene tu flujo actual?",
    },
  ],
};

const FALLBACK_BY_SKILL: Record<string, string> = {
  inbox_support:
    "Gracias por escribirnos. He registrado tu mensaje y te ayudo en lo que necesites. ¿Puedes darme un poco más de contexto?",
  crm_assist:
    "Entendido. Para avanzar en CRM, comparte nombre, empresa y qué buscas conseguir con nosotros.",
  nelvyon_services:
    "Nelvyon ofrece packs IA y SKUs (landing, SEO, chatbot). ¿Qué objetivo de marketing tienes ahora?",
  social_publisher:
    "Puedo prepararte un borrador para redes. Dime plataforma (IG/FB/LinkedIn) y mensaje clave.",
  campaigns_email:
    "Puedo ayudarte con asunto, cuerpo y CTA de tu próxima campaña. ¿Cuál es el objetivo del envío?",
  workflows_ops:
    "Te guío para automatizar tareas repetibles. ¿Qué acción manual quieres eliminar primero?",
};

export function buildMockAgentReply(
  skill: NelvyonAgentSkill,
  inbound: string,
  escalated: boolean,
): string {
  if (escalated) {
    return (
      "Gracias por tu mensaje. Por la naturaleza de tu consulta, la he derivado a un especialista humano " +
      "que te responderá muy pronto. Disculpa las molestias."
    );
  }

  const rules = SKILL_REPLIES[skill.id] ?? [];
  for (const rule of rules) {
    if (rule.test.test(inbound)) return rule.reply;
  }

  // Trigger-word boost from catalog
  const norm = inbound
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
  for (const t of skill.triggers) {
    if (norm.includes(t)) {
      return (
        FALLBACK_BY_SKILL[skill.id] ??
        `Gracias por tu mensaje (${skill.name}). ¿En qué más podemos ayudarte?`
      );
    }
  }

  const short = inbound.trim().slice(0, 60);
  const base =
    FALLBACK_BY_SKILL[skill.id] ??
    `Gracias por escribirnos. Hemos recibido tu mensaje y te atendemos con ${skill.name}.`;
  return short.length > 3 ? `${base} (ref: «${short}»)` : base;
}

/** Rule-based social post draft — 0€ LLM */
export function buildMockSocialPost(input: {
  topic?: string;
  platform?: string;
}): { content: string; hashtags: string[]; platform: string; mock: true } {
  const topic = (input.topic ?? "tu negocio").trim().slice(0, 80);
  const platform = (input.platform ?? "instagram").toLowerCase();

  const templates: Record<string, { content: string; hashtags: string[] }> = {
    instagram: {
      content: `✨ ${topic}\n\n¿Listo para dar el siguiente paso? Escríbenos por DM o reserva en el link de la bio.`,
      hashtags: ["#marketing", "#negocioLocal", "#crecimiento"],
    },
    facebook: {
      content: `📣 ${topic}\n\nBeneficio claro para tu audiencia. Comenta o escríbenos si quieres más info.`,
      hashtags: ["#empresa", "#oferta", "#contacto"],
    },
    linkedin: {
      content: `${topic}\n\nEn B2B el crecimiento viene de sistemas, no de más herramientas sueltas. ¿Tu equipo opera con datos unificados?`,
      hashtags: ["#B2B", "#Marketing", "#SaaS"],
    },
    tiktok: {
      content: `🔥 ${topic}\n\nDM "INFO" y te contamos cómo empezar esta semana.`,
      hashtags: ["#emprendimiento", "#tips", "#negocio"],
    },
  };

  const t = templates[platform] ?? templates.instagram!;
  return { content: t.content, hashtags: t.hashtags, platform, mock: true };
}

/** Social proof from approved pack deliverable (0€). */
export function buildDeliverableSocialProofPost(input: {
  title?: string;
  qaScore?: number;
  packName?: string;
  platform?: string;
}): { content: string; hashtags: string[]; platform: string; mock: true } {
  const title = (input.title ?? input.packName ?? "Nuevo entregable").trim().slice(0, 100);
  const qa = input.qaScore != null ? ` QA ${input.qaScore}/100.` : "";
  const platform = (input.platform ?? "linkedin").toLowerCase();
  const content =
    platform === "linkedin"
      ? `🚀 Entregable aprobado: ${title}.${qa}\n\nResultados reales, proceso transparente. ¿Quieres lo mismo para tu negocio?`
      : `✨ ${title}${qa}\n\nNuevo case live — escríbenos si quieres replicarlo en tu marca.`;
  const hashtags =
    platform === "linkedin"
      ? ["#MarketingDigital", "#CasodeExito", "#B2B"]
      : ["#negocioLocal", "#marketing", "#resultados"];
  return { content, hashtags, platform, mock: true };
}
