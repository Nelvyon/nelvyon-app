import type { VozProjectConfig } from "@/templates/voz-premium/types";
import { VOZ_PREMIUM_PREVIEW_PATH } from "@/templates/voz-premium/paths";

/** Demo OS handoff — does not change VOZ v2 behavior; statuses illustrative; DS v2 shell. */
export const vozPremiumNelvyonDemoProject: VozProjectConfig = {
  pageSeo: {
    title: "NELVYON OS — Voz Premium delivery template (preview)",
    description:
      "Premium voice OS handoff: agent config, quality, script, locales, handoff, reporting. Layered on VOZ v2 pilot — no duplicate infra.",
    canonicalPath: VOZ_PREMIUM_PREVIEW_PATH,
    siteName: "NELVYON Voz Premium",
    keywords: ["voice", "VOZ", "NELVYON", "OS", "pilot"],
    locale: "es_ES",
  },
  clientLabel: "Demo sponsor · Meridian Publishing",
  projectName: "Meridian Voice Pilot · OS delivery package",
  projectSubtitle:
    "Structured checklist before stakeholders rely on pilot flows. Cross-check every item against `/app/voz` governance and quotas.",
  generatedNote:
    "VOZ v2 remains the product boundary (inbound clip → ticket, browser synth, monthly cap). Template v2 (Design System applied) records OS commitment — it does not extend APIs or storage.",
  sections: [
    {
      id: "agent_config",
      module: "agent_config",
      title: "Configuración de agente",
      intro: "Nombre del programa, alcance del piloto y voz asignada en narrativa de cliente.",
      items: [
        {
          id: "agent-profile",
          label: "Perfil de agente / programa documentado (alcance piloto)",
          status: "pass",
          priority: "P1",
          evidence: "Matches honest scope on `/app/voz` — no dialer or mass outbound promised.",
        },
        {
          id: "voice-assigned",
          label: "Voz asignada (persona / idioma base declarados)",
          status: "warn",
          priority: "P1",
          evidence: "Outbound synth uses device/browser capability — quality varies by OS; documented to client.",
        },
      ],
    },
    {
      id: "voice_quality",
      module: "voice_quality",
      title: "Calidad de voz",
      intro: "Clips de referencia, nivel de ruido aceptable y expectativas de audio.",
      items: [
        {
          id: "audio-quality",
          label: "Calidad de audio objetivo (grabación inbound)",
          status: "warn",
          priority: "P1",
          evidence: "Inbound clips capped by pilot limits on `/app/voz/inbound`; advise headset vs speaker in ops notes.",
        },
        {
          id: "call-tests",
          label: "Pruebas de llamada / clip internas completadas",
          status: "pending",
          priority: "P2",
          evidence: "Tabletop with staging workspace — no PSTN integration in pilot.",
        },
      ],
    },
    {
      id: "script_flow",
      module: "script_flow",
      title: "Guión y flujo",
      intro: "Mensajes base, confirmaciones y cierre hacia humano.",
      items: [
        {
          id: "base-script",
          label: "Guión base de bienvenida y cierre",
          status: "pass",
          priority: "P1",
          evidence: "Stored outside NELVYON or in ticket templates — OS tracks approval status only.",
        },
        {
          id: "flow-human",
          label: "Puntos de decisión → siguiente paso humano documentados",
          status: "warn",
          priority: "P1",
          evidence: "Align with help/support routing already in workspace — no new automation claimed.",
        },
      ],
    },
    {
      id: "localization",
      module: "localization",
      title: "Idiomas y localización",
      intro: "Locales habilitados y deuda de copy si aplica.",
      items: [
        {
          id: "languages",
          label: "Idiomas habilitados vs `/os/i18n` baseline",
          status: "warn",
          priority: "P2",
          evidence: "Pilot copy may be single-locale; flag before expanding spend or SEO-dependent surfaces.",
        },
      ],
    },
    {
      id: "handoff",
      module: "handoff",
      title: "Handoff y escalado",
      intro: "Cuándo escalar a operador humano y SLAs de respuesta.",
      items: [
        {
          id: "human-handoff",
          label: "Handoff a humano (owner, canal, SLA declarado)",
          status: "pass",
          priority: "P1",
          evidence: "Uses existing inbox/ticket posture — template does not add queue product.",
        },
        {
          id: "escalation",
          label: "Escalado cuando cupo mensual o plan bloquea pilot",
          status: "warn",
          priority: "P1",
          evidence: "Operators confirm `/app/voz` governance messaging before client comms.",
        },
      ],
    },
    {
      id: "reporting",
      module: "reporting",
      title: "Reporting",
      intro: "Métricas admitidas en piloto y trazabilidad operativa.",
      items: [
        {
          id: "reporting-pack",
          label: "Paquete de reporting (clips usados, sintesis ejecutadas, incidentes)",
          status: "pending",
          priority: "P2",
          evidence: "Pull from workspace observability + manual tallies until BI bridge exists.",
        },
        {
          id: "traceability",
          label: "request_id / correlación si releases tocan APIs de voz",
          status: "pass",
          priority: "P2",
          evidence: "Use `/os/observability/incidents` when regressions suspected after deploy.",
        },
      ],
    },
  ],
};
