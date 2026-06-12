import { HELP_ARTICLES, HelpArticle } from "@/features/help/content";
import { inferHelpModuleFromPath } from "@/features/help/context";
import { BotReply } from "@/features/helpbot/types";

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "to", "for", "with", "in", "on", "of",
  "de", "la", "el", "los", "las", "un", "una", "y", "o", "en", "por", "que",
]);

type Playbook = {
  patterns: RegExp[];
  answer: string;
  actionHref: string;
  actionLabel: string;
  confidence: BotReply["confidence"];
};

const OUTCOME_PLAYBOOKS: Playbook[] = [
  {
    patterns: /(lead|cliente|client|revenue|crm|venta|pipeline|deal)/i,
    answer:
      "Para generar más oportunidades, empieza registrando cuentas en Revenue y vinculando deals. Un cliente bien definido desbloquea campañas y reportes coherentes.",
    actionHref: "/crm/clients/new",
    actionLabel: "Añadir cliente en Revenue",
    confidence: "high",
  },
  {
    patterns: /(campaña|campaign|email|sms|marketing|demanda|nurturing)/i,
    answer:
      "Las campañas funcionan mejor con un cliente o segmento claro. Crea una campaña piloto, define objetivo y canal, y mide respuestas desde Analytics.",
    actionHref: "/campaigns/new",
    actionLabel: "Crear campaña",
    confidence: "high",
  },
  {
    patterns: /(ticket|soporte|helpdesk|incidencia|support|petición)/i,
    answer:
      "Helpdesk centraliza solicitudes del equipo y clientes. Abre un ticket con contexto claro y así evitas perder demanda comercial escondida en soporte.",
    actionHref: "/inbox/tickets/new",
    actionLabel: "Nuevo ticket",
    confidence: "high",
  },
  {
    patterns: /(automat|workflow|webhook|job)/i,
    answer:
      "Automatiza tareas repetitivas con jobs y webhooks. Revisa la cola de automatización y conecta eventos (nuevo cliente, ticket cerrado) a acciones externas.",
    actionHref: "/automations/jobs",
    actionLabel: "Ver automatizaciones",
    confidence: "high",
  },
  {
    patterns: /(empezar|start|primeros pasos|onboarding|activar|setup|configur)/i,
    answer:
      "Tu checklist de activación en Inicio te guía en 5 minutos: workspace, cliente, ticket y campaña. Es la forma más rápida de validar que todo funciona.",
    actionHref: "/dashboard",
    actionLabel: "Ir al checklist",
    confidence: "high",
  },
];

function tokenize(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9áéíóúüñ\s]/g, " ")
    .split(/\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 1 && !STOPWORDS.has(s));
}

function scoreArticle(questionTokens: string[], article: HelpArticle, routeModule: string | null) {
  const blob = `${article.title} ${article.summary} ${article.body} ${article.kind}`.toLowerCase();
  let score = 0;
  for (const token of questionTokens) {
    if (blob.includes(token)) score += 2;
  }
  if (routeModule && article.module === routeModule) score += 2;
  return score;
}

function matchPlaybook(question: string): Playbook | null {
  for (const playbook of OUTCOME_PLAYBOOKS) {
    if (playbook.patterns.test(question)) return playbook;
  }
  return null;
}

function detectHandoff(question: string): BotReply | null {
  const q = question.toLowerCase();
  if (/(bug|error|falla|roto|500|404|crash|incidencia técnica)/.test(q)) {
    return {
      answer: "Parece un error técnico. Envía un informe con contexto para que el equipo lo resuelva cuanto antes.",
      confidence: "high",
      handoffKind: "bug",
      handoffHref: "/help#structured-forms",
    };
  }
  if (/(feedback|sugerencia|mejora|feature request|idea de producto)/.test(q)) {
    return {
      answer: "Gracias por la idea. Compártela en el formulario de feedback para que llegue al roadmap.",
      confidence: "high",
      handoffKind: "feedback",
      handoffHref: "/help#structured-forms",
    };
  }
  if (/(bloqueado|atascado|blocked|no puedo|can't|cannot|necesito ayuda humana)/.test(q)) {
    return {
      answer: "Si estás bloqueado, abre un ticket de ayuda con el módulo y el paso exacto donde te quedaste.",
      confidence: "high",
      handoffKind: "help",
      handoffHref: "/help#structured-forms",
    };
  }
  return null;
}

export function answerHelpQuestion(question: string, pathname: string): BotReply {
  const handoff = detectHandoff(question);
  if (handoff) return handoff;

  const tokens = tokenize(question);
  const routeModule = inferHelpModuleFromPath(pathname);
  const ranked = HELP_ARTICLES.map((article) => ({
    article,
    score: scoreArticle(tokens, article, routeModule),
  })).sort((a, b) => b.score - a.score);

  const top = ranked[0];
  if (top && top.score >= 4) {
    return {
      answer: `${top.article.summary} Te recomiendo abrir la guía y seguir el enlace de acción.`,
      confidence: "high",
      article: top.article,
    };
  }

  const playbook = matchPlaybook(question);
  if (playbook) {
    return {
      answer: playbook.answer,
      confidence: playbook.confidence,
      actionHref: playbook.actionHref,
      actionLabel: playbook.actionLabel,
    };
  }

  if (top && top.score >= 2) {
    return {
      answer: `${top.article.summary} Te recomiendo abrir la guía y seguir el enlace de acción.`,
      confidence: "low",
      article: top.article,
      handoffKind: "help",
      handoffHref: "/help",
    };
  }

  return {
    answer:
      "No tengo suficiente contexto para responder con seguridad. Prueba preguntando por clientes, campañas o tickets, o abre el centro de ayuda.",
    confidence: "low",
    handoffKind: "help",
    handoffHref: "/help",
  };
}
