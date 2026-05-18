import type { BotsProjectConfig } from "@/templates/bots-premium/types";
import { BOTS_PREMIUM_PREVIEW_PATH } from "@/templates/bots-premium/paths";

/** Demo OS handoff — illustrative only; does not extend BOTS v1 runtime; DS v2 shell. */
export const botsPremiumNelvyonDemoProject: BotsProjectConfig = {
  pageSeo: {
    title: "NELVYON OS — Bots Premium delivery template (preview)",
    description:
      "Premium bots OS checklist: bot config, channels, conversational flow, integrations, handoff, metrics. Layers on closed BOTS v1 — no duplicate infra.",
    canonicalPath: BOTS_PREMIUM_PREVIEW_PATH,
    siteName: "NELVYON Bots Premium",
    keywords: ["bots", "assistant", "NELVYON", "OS"],
    locale: "es_ES",
  },
  clientLabel: "Demo sponsor · Meridian Publishing",
  projectName: "Meridian Copilot Pilot · Paquete de entrega OS",
  projectSubtitle:
    "Lista de chequeo antes de que negocio asuma el bot como “listo”. Contrastar cada ítem con BOTS PROFESIONALES v1 en sombra ya cerrado.",
  generatedNote:
    "Plantilla v2 (Design System aplicado): no añade intenciones, conectores ni motores nuevos. La verificación vive en rutas existentes (/app/assistant, /help, automatizaciones OS).",
  sections: [
    {
      id: "bot_config",
      module: "bot_config",
      title: "Configuración bot",
      intro: "Identidad interna del bot, alcance declarado y guardrails.",
      items: [
        {
          id: "bot-scope",
          label: "Configuración de alcance del bot (qué sí / qué no responde)",
          status: "pass",
          priority: "P1",
          evidence: "Alineado con copy honesto visible en `/app/assistant`; sin prometer CCaaS o agentes externos no soportados.",
        },
        {
          id: "persona-tone",
          label: "Persona y políticas de comportamiento registradas",
          status: "warn",
          priority: "P2",
          evidence: "Documentación externa; OS marca estado hasta que legal/compliance firme cambios.",
        },
      ],
    },
    {
      id: "channel_deploy",
      module: "channel_deploy",
      title: "Canal y despliegue",
      intro: "Dónde vive la experiencia bot y estado de rollout.",
      items: [
        {
          id: "deployment-channel",
          label: "Canal de despliegue declarado (workspace / producto)",
          status: "pass",
          priority: "P1",
          evidence: "Interno hasta integración WhatsApp/email — solo rutas workspace actuales en NELVYON.",
        },
        {
          id: "shadow-flag",
          label: "Modo sombra vs producción comunicado",
          status: "warn",
          priority: "P1",
          evidence: "BOTS v1 en sombra puede limitar audiencia — confirmado con stakeholder antes del handoff.",
        },
      ],
    },
    {
      id: "conversation",
      module: "conversation",
      title: "Flujo conversacional",
      intro: "Guiones maestros, ramas felices/error y evidencia de QA.",
      items: [
        {
          id: "flow-scripts",
          label: "Flujo conversacional base y ramas fallback",
          status: "pass",
          priority: "P1",
          evidence: "Guiones externos; OS marca revisión QA conversacional antes de READY.",
        },
        {
          id: "conversation-tests",
          label: "Pruebas de conversación (golden utterances)",
          status: "pending",
          priority: "P2",
          evidence: "`pnpm test:bot-evals` verde donde el codebase de bots haya sido tocado; checklist manual fuera.",
        },
      ],
    },
    {
      id: "integrations",
      module: "integrations",
      title: "Integraciones",
      intro: "Webhooks, jobs y límites técnicos documentados.",
      items: [
        {
          id: "integration-boundary",
          label: "Integraciones permitidas sin APIs externas fantasmas",
          status: "warn",
          priority: "P1",
          evidence: "Revisión de `/automations/webhooks` y jobs solo si engagement afirma automatización supervisada.",
        },
        {
          id: "os-agents-trace",
          label: "Trazabilidad OS para agent/automation runs si aplica",
          status: "pending",
          priority: "P3",
          evidence: "`/os/agents` para auditoría cuando flujos tocan trabajo async interno.",
        },
      ],
    },
    {
      id: "handoff",
      module: "handoff",
      title: "Handoff y escalado",
      intro: "Cuándo pasa a humano y SLA acordado.",
      items: [
        {
          id: "human-handoff",
          label: "Handoff humano (canal `/help`/tickets declarado)",
          status: "pass",
          priority: "P1",
          evidence: "Usuarios llegan por help center e inbox establecidos — no inventar canal nuevo desde plantilla.",
        },
        {
          id: "escalation-playbook",
          label: "Playbook cuando el bot rechaza alcance",
          status: "warn",
          priority: "P2",
          evidence: "Frases cortas grabadas fuera del producto si hace falta entrenamiento a ops.",
        },
      ],
    },
    {
      id: "reporting",
      module: "reporting",
      title: "Reporting y métricas",
      intro: "Qué número se muestra al cliente sin inflar KPIs.",
      items: [
        {
          id: "metrics-scope",
          label: "Métricas alineadas al piloto (deflection, tiempo a humano, errores conocidos)",
          status: "pending",
          priority: "P2",
          evidence: "Datos externos o analytics futuro — plantilla marca expectativas, no recolecta.",
        },
        {
          id: "quality-bar",
          label: "Indicadores de sesgo / seguridad marcados pendientes hasta revisión cualitativa",
          status: "warn",
          priority: "P2",
          evidence: "`test:bot-evals` cuando el núcleo helpbot cambia; revisión narrativa fuera.",
        },
      ],
    },
  ],
};
