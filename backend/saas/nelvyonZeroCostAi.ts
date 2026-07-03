/**
 * Zero-cost AI fallbacks for SaaS routes when OPENAI_API_KEY is unset.
 * Keeps UI functional in dev/staging without LLM spend.
 */

export type MockCopyType =
  | "email_subject"
  | "email_body"
  | "sms_message"
  | "social_post"
  | "ad_copy"
  | "landing_headline"
  | "cta_button"
  | "blog_intro";

export type MockTone = "formal" | "casual" | "urgente" | "inspirador";

const TONE_PREFIX: Record<MockTone, string> = {
  formal: "",
  casual: "",
  urgente: "⚡ ",
  inspirador: "✨ ",
};

function clip(s: string, max: number): string {
  const t = s.trim();
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}

export function buildMockCopies(input: {
  type: MockCopyType;
  context: string;
  tone?: MockTone;
  variations?: number;
  company?: string | null;
}): string[] {
  const ctx = clip(input.context, 120);
  const company = input.company?.trim() || "tu negocio";
  const tone = input.tone ?? "casual";
  const n = Math.min(Math.max(input.variations ?? 3, 1), 5);
  const p = TONE_PREFIX[tone];

  const byType: Record<MockCopyType, string[]> = {
    email_subject: [
      `${p}${ctx} — oferta exclusiva para ti`,
      `${p}¿Listo para ${ctx.toLowerCase()}?`,
      `${p}${company}: lo que necesitas saber hoy`,
    ],
    email_body: [
      `${p}Hola {{nombre}},\n\nEn ${company} ayudamos con: ${ctx}.\n\nBeneficios claros, siguiente paso sencillo.\n\n→ Reserva una demo en 2 clics.\n\nUn saludo,\nEquipo ${company}`,
      `${p}Hola {{nombre}},\n\nGracias por tu interés en ${ctx}.\n\nTe compartimos cómo otros clientes lo resolvieron en 30 días.\n\nCTA: Responder a este email.\n\n${company}`,
    ],
    sms_message: [
      clip(`${p}${company}: ${ctx}. Responde SI. [URL]`, 160),
      clip(`${p}Oferta 48h — ${ctx}. Info: [URL]`, 160),
    ],
    social_post: [
      `${p}${ctx}\n\n¿Te interesa? DM o link en bio 👇\n\n#marketing #${company.replace(/\s+/g, "")}`,
      `${p}Nuevo en ${company}: ${ctx}\n\nComenta INFO y te contamos más.`,
    ],
    ad_copy: [
      `${p}${ctx}\nBeneficio inmediato · Prueba gratis\n→ Empieza hoy`,
      `${p}${company} — ${ctx}\nResultados medibles · Sin permanencia`,
    ],
    landing_headline: [
      `${p}${ctx} sin complicaciones`,
      `${p}El crecimiento de ${company} empieza aquí`,
      `${p}${ctx} — implementado en días, no meses`,
    ],
    cta_button: [`${p}Empezar ahora`, `${p}Ver demo gratis`, `${p}Quiero más info`],
    blog_intro: [
      `${p}Muchas pymes se preguntan cómo abordar ${ctx.toLowerCase()}.\n\nEn este artículo verás pasos concretos que puedes aplicar esta semana en ${company}.`,
      `${p}Si buscas resultados con ${ctx.toLowerCase()}, no estás solo.\n\nTe mostramos el método que usamos con clientes reales.`,
    ],
  };

  const pool = byType[input.type] ?? [`${p}${ctx}`];
  const out: string[] = [];
  for (let i = 0; i < n; i++) out.push(pool[i % pool.length]!);
  return out;
}

const CHAT_NAV_HINTS: Array<{ test: RegExp; reply: string }> = [
  {
    test: /crm|contacto|lead/i,
    reply: "Abre **CRM** en `/saas/crm` para gestionar contactos, importar leads y ver actividades.",
  },
  {
    test: /campana|email|newsletter|ses/i,
    reply: "Las campañas están en `/saas/campanias`. Crea una campaña, añade destinatarios y revisa aperturas en el panel.",
  },
  {
    test: /whatsapp|wasap/i,
    reply: "WhatsApp Business en `/saas/whatsapp`. Conecta Meta Cloud API y gestiona conversaciones en `/saas/inbox`.",
  },
  {
    test: /inbox|mensaje|bandeja/i,
    reply: "Bandeja unificada en `/saas/inbox`. Activa el **Agente Nelvyon** para sugerencias y auto-respuesta (modo 0€ sin API key).",
  },
  {
    test: /pack|landing|seo|chatbot|brief/i,
    reply: "Packs en `/saas/packs` o lanza desde `/saas/brief-to-launch`. Entregables en portal con QA ≥85.",
  },
  {
    test: /workflow|automat/i,
    reply: "Workflows en `/saas/workflows`. Empieza con trigger «nuevo lead» → email bienvenida → tarea CRM.",
  },
  {
    test: /redes|social|instagram|facebook/i,
    reply: "Redes en `/saas/social`. Usa plantillas élite o el botón **Agente redes (0€)** al crear un post.",
  },
  {
    test: /factur|billing|plan|precio/i,
    reply: "Facturación y plan en `/saas/billing`. Starter, Pro y Agency con límites de uso IA según plan.",
  },
  {
    test: /hola|ayuda|que puedes|que haces/i,
    reply:
      "Soy el asistente Nelvyon (modo ahorro, sin coste IA). Puedo orientarte: CRM, campañas, inbox, packs, workflows, redes. ¿Qué módulo necesitas?",
  },
];

export function buildMockChatReply(input: {
  messages: Array<{ role: string; content: string }>;
  company?: string | null;
  plan?: string | null;
}): string {
  const lastUser =
    [...input.messages].reverse().find((m) => m.role === "user")?.content?.trim() ?? "";
  if (!lastUser) {
    return "Escribe tu pregunta sobre Nelvyon (CRM, campañas, inbox, packs…).";
  }

  for (const hint of CHAT_NAV_HINTS) {
    if (hint.test.test(lastUser)) return hint.reply;
  }

  const company = input.company ?? "tu empresa";
  const plan = input.plan ?? "starter";
  return (
    `Entendido sobre «${clip(lastUser, 80)}».\n\n` +
    `En Nelvyon (${company}, plan ${plan}) puedes usar CRM, campañas, inbox con agente IA, packs OS y workflows. ` +
    `Indica el módulo (ej. «ir a campañas») o activa voz JARVIS en el panel.`
  );
}

const AGENT_TEMPLATES: Record<string, (input: string, company: string) => string> = {
  seo: (input, company) =>
    `## Auditoría SEO (modo ahorro)\n\n**Consulta:** ${input}\n\n` +
    `1. Keywords long-tail por intención comercial\n2. Titles ≤60 chars + meta descriptions\n` +
    `3. Schema LocalBusiness si aplica\n4. Contenido pilar + clusters\n\n` +
    `Ejecuta pack NELVYON-SEO en portal para entregables completos de ${company}.`,
  emailmarketing: (input) =>
    `## Email Marketing\n\n**Brief:** ${input}\n\n` +
    `- Asunto A/B: beneficio + curiosidad\n- Preview text con CTA\n- Secuencia: bienvenida → valor → oferta\n\n` +
    `Configura en /saas/campanias cuando SES esté activo.`,
  social: (input) =>
    `## Redes Sociales\n\n**Brief:** ${input}\n\n` +
    `Post sugerido:\n«${clip(input, 100)}»\n\nHashtags: #marketing #crecimiento\n\n` +
    `Publica desde /saas/social con plantillas élite.`,
  crm: (input) =>
    `## CRM\n\n**Consulta:** ${input}\n\n` +
    `Pipeline sugerido: Lead → Calificado → Propuesta → Ganado.\n` +
    `Registra actividad y usa lead scoring en /saas/lead-scoring.`,
  ads: (input) =>
    `## Publicidad\n\n**Objetivo:** ${input}\n\n` +
    `Estructura: 1 campaña · 2 ad sets (audiencias) · 3 creatividades.\n` +
    `Conecta Meta/Google en /saas/publicidad cuando OAuth esté configurado.`,
};

export function buildMockAgentOutput(agentId: string, input: string, company?: string | null): string {
  const co = company?.trim() || "tu empresa";
  const key = agentId.toLowerCase().replace(/[^a-z]/g, "");
  const fn =
    AGENT_TEMPLATES[key] ??
    AGENT_TEMPLATES.seo ??
    ((brief: string, c: string) =>
      `## Agente ${agentId} (modo ahorro)\n\n**Entrada:** ${brief}\n\n` +
      `Plan de acción para ${c}:\n1. Define objetivo SMART\n2. Elige módulo Nelvyon (CRM, campañas, packs)\n` +
      `3. Lanza pack OS o workflow\n4. Mide en /saas/reportes\n\n` +
      `Para respuesta IA avanzada, configura OPENAI_API_KEY en Railway.`);

  return fn(input.trim(), co);
}
