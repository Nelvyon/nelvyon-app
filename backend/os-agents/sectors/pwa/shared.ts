import type { ILlmClient, LlmOptions } from "../../LlmClient";
import { LlmClient } from "../../LlmClient";
import { LearningService } from "../../learning/LearningService";

import { ELITE_V300_STANDARDS } from "../../prompts/elitePromptLibrary";
export interface PwaInput {
  userId: string;
  businessContext: string;
  agentId: string;
}

export interface PwaOutput {
  result: string;
  insights: string[];
  recommendedActions: string[];
}

export const pwaLlmOpts: LlmOptions = {
  model: "gpt-4o",
  temperature: 0.4,
  maxTokens: 1500,
};

const PWA_OS_RULES = `Eres el agente de **PWA** y **experiencia multi-dispositivo** de NELVYON OS.
- Diseñas, auditas y optimizas Progressive Web Apps para que funcionen perfectamente en móvil, tablet y escritorio **sin app nativa**.
- Gestionas **service workers**, **caché offline**, **manifest.json**, **push notifications**, **instalación en homescreen**, **performance Core Web Vitals**, **sincronización en segundo plano** y experiencia de app nativa en navegador.
- Calidad enterprise, **cero dependencia de app stores**.`;

function parseJson<T>(raw: string, label: string): T {
  const trimmed = raw.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)```/m.exec(trimmed);
  const payload = fenced?.[1] ? fenced[1].trim() : trimmed;
  try {
    return JSON.parse(payload) as T;
  } catch {
    throw new Error(`${label}: JSON inválido`);
  }
}

function parseStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((x) => (typeof x === "string" ? x.trim() : String(x))).filter(Boolean);
}

export function parsePwaLlmJson(raw: string, label: string): PwaOutput {
  const p = parseJson<{ result?: unknown; insights?: unknown; recommendedActions?: unknown }>(raw, label);
  const result = typeof p.result === "string" ? p.result : String(p.result ?? "");
  return {
    result,
    insights: parseStringArray(p.insights),
    recommendedActions: parseStringArray(p.recommendedActions),
  };
}

export function buildPwaPrompt(params: {
  eliteRole: string;
  mission: string;
  fewShotExample: string;
  input: PwaInput;
}): string {
  const ctx = params.input.businessContext.trim() || "no indicado";

  return `${params.eliteRole}

${ELITE_V300_STANDARDS}

${PWA_OS_RULES}

FEW-SHOT (alto rendimiento):
${params.fewShotExample}

### CONTEXTO DE NEGOCIO
${ctx}

MISIÓN DEL AGENTE (${params.input.agentId}):
${params.mission}

OUTPUT: Responde **solo** JSON válido UTF-8 (sin markdown):
{"result":"documento maestro en español","insights":["bullets insight"],"recommendedActions":["acciones concretas"]}`;
}

type AgentPromptBlock = { eliteRole: string; mission: string; fewShotExample: string };

function getPwaAgentPromptBlock(agentId: string): AgentPromptBlock {
  switch (agentId) {
    case "pwa-auditoria":
      return {
        eliteRole: "Eres **PWA Auditoría** — checklist técnico y de producto instalable.",
        mission:
          "**Audita** PWA existente: manifest, service worker, offline, Core Web Vitals, seguridad HTTPS, scope y actualizaciones.",
        fewShotExample:
          '{"result":"Informe auditoría PWA 12 ítems + severidad","insights":["start_url fuera de scope rompe instalación","SW sin versionado dificulta rollback"],"recommendedActions":["Lighthouse CI en PR","Validar manifest con schema"]}',
      };
    case "pwa-serviceWorker":
      return {
        eliteRole: "Eres **PWA Service Worker** — estrategia de caché y ciclo de vida.",
        mission:
          "**Diseña y optimiza** service worker y estrategia de caché (precache, runtime, stale-while-revalidate, límites de tamaño).",
        fewShotExample:
          '{"result":"Plan SW: precache shell + runtime API","insights":["skipWaiting con UX de reload controlado","Evitar cachear auth responses"],"recommendedActions":["Workbox o patrón manual documentado","Métricas hit-rate caché"]}',
      };
    case "pwa-offline":
      return {
        eliteRole: "Eres **PWA Offline** — resiliencia y estados vacíos.",
        mission:
          "**Implementa** experiencia offline completa (fallback UI, cola de acciones, sincronización posterior, mensajes claros).",
        fewShotExample:
          '{"result":"Mapa rutas offline + pantallas fallback","insights":["IndexedDB para cola idempotente","Degradación lectura vs escritura"],"recommendedActions":["Detector online/offline unificado","Tests en throttling"]}',
      };
    case "pwa-notificaciones":
      return {
        eliteRole: "Eres **PWA Notificaciones** — push con respeto al usuario.",
        mission:
          "**Configura** push notifications y engagement (permisos, segmentación, frecuencia, deep links, métricas opt-in).",
        fewShotExample:
          '{"result":"Playbook push 4 casos de uso + copy permiso","insights":["Soft ask antes del prompt del SO","Quiet hours por timezone"],"recommendedActions":["VAPID rotación documentada","Supresión por canal"]}',
      };
    case "pwa-instalacion":
      return {
        eliteRole: "Eres **PWA Instalación** — A2HS y confianza.",
        mission:
          "**Optimiza** flujo de instalación en homescreen (beforeinstallprompt, criterios de elegibilidad, onboarding post-install).",
        fewShotExample:
          '{"result":"UX 3 pasos instalación + métricas funnel","insights":["Mostrar valor antes del CTA instalar","iOS: guía Add to Home"],"recommendedActions":["Eventos analytics install_*","Banners no intrusivos"]}',
      };
    case "pwa-performance":
      return {
        eliteRole: "Eres **PWA Performance** — velocidad percibida y CWV.",
        mission:
          "**Optimiza** Core Web Vitals y tiempo de carga (LCP, INP, CLS, code splitting, imágenes, fuentes, SW impact).",
        fewShotExample:
          '{"result":"Plan CWV: quick wins + backlog","insights":["CLS por anuncios: reservar altura","INP: delegar trabajo pesado"],"recommendedActions":["RUM en producción","Budget bundle SW"]}',
      };
    case "pwa-sincronizacion":
      return {
        eliteRole: "Eres **PWA Sincronización** — datos consistentes fuera de foco.",
        mission:
          "**Gestiona** sync en segundo plano y Background Fetch (reintentos, idempotencia, conflictos, batería y red).",
        fewShotExample:
          '{"result":"Diseño sync queue + política reintentos","insights":["Background Sync para formularios offline","Conflictos: last-write-wins documentado"],"recommendedActions":["Feature detect + fallback","Telemetría fallos sync"]}',
      };
    case "pwa-responsive":
      return {
        eliteRole: "Eres **PWA Responsive** — layout y interacción en todos los viewports.",
        mission:
          "**Asegura** experiencia perfecta en todos los dispositivos (touch targets, viewport, safe areas, teclado virtual, PWA standalone).",
        fewShotExample:
          '{"result":"Matriz breakpoints + componentes críticos","insights":["100vh iOS: unidades dinámicas","Modo standalone: padding safe-area"],"recommendedActions":["Pruebas en dispositivos reales","Checklist accesibilidad táctil"]}',
      };
    default:
      throw new Error(`${agentId}: agente no soportado`);
  }
}

export async function runPwaAgentCore(agentId: string, input: PwaInput, llm: ILlmClient): Promise<PwaOutput> {
  const block = getPwaAgentPromptBlock(agentId);
  const prompt = buildPwaPrompt({
    eliteRole: block.eliteRole,
    mission: block.mission,
    fewShotExample: block.fewShotExample,
    input: { ...input, agentId },
  });
  const raw = await llm.complete(prompt, pwaLlmOpts);
  const out = parsePwaLlmJson(raw, agentId);
  try {
    await new LearningService().recordOutcome(input.userId, agentId, "pwa", input, out, "generated");
  } catch {
    /* sin DB en tests */
  }
  return out;
}

export function getDefaultPwaLlm(): ILlmClient {
  return LlmClient.getInstance();
}
