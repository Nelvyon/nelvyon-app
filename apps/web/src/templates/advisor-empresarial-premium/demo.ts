import type { AdvisorProjectConfig } from "@/templates/advisor-empresarial-premium/types";
import { ADVISOR_EMPRESARIAL_PREMIUM_PREVIEW_PATH } from "@/templates/advisor-empresarial-premium/paths";

/** Demo OS handoff — illustrative only; does not extend ADVISOR EMPRESARIAL v1 runtime; DS v2 shell. */
export const advisorPremiumNelvyonDemoProject: AdvisorProjectConfig = {
  pageSeo: {
    title: "NELVYON OS — Advisor Empresarial Premium delivery template (preview)",
    description:
      "Premium advisor checklist: diagnosis, strategy, action plan, KPIs, follow-up, deliverables. Layers on closed ADVISOR EMPRESARIAL v1 — no duplicate infra.",
    canonicalPath: ADVISOR_EMPRESARIAL_PREMIUM_PREVIEW_PATH,
    siteName: "NELVYON Advisor Empresarial Premium",
    keywords: ["advisor", "strategy", "NELVYON", "OS"],
    locale: "es_ES",
  },
  clientLabel: "Demo cuenta · Norte Mid-Market",
  projectName: "Transformación digital Q1 · Paquete de entrega OS",
  projectSubtitle:
    "Lista de chequeo antes de que negocio cierre la consultoría como entregada. Contrastar con ADVISOR EMPRESARIAL NELVYON v1 ya cerrado.",
  generatedNote:
    "Plantilla v2 (Design System aplicado): no añade motores de diagnóstico ni APIs externas. La evidencia debe apuntar a `/app/advisor`, proyectos declarados y canales documentados.",
  sections: [
    {
      id: "diagnosis_initial",
      module: "diagnosis_initial",
      title: "Diagnóstico inicial",
      intro: "Situación base, dolores declarados y mapa de partes.",
      items: [
        {
          id: "stakeholders",
          label: "Mapa de stakeholders y decision rights acordados",
          status: "pass",
          priority: "P1",
          evidence:
            "Resumen ejecutivo externo enlazado; mensajes públicos coherentes con tono de `/app/advisor`.",
        },
        {
          id: "pain-kpis-gap",
          label: "Brecha problema → resultado esperado cuantificado donde aplique",
          status: "warn",
          priority: "P2",
          evidence: "Sin inventar dashboards — uso de línea base cliente u operaciones.",
        },
      ],
    },
    {
      id: "strategy",
      module: "strategy",
      title: "Estrategia",
      intro: "Dirección estratégica digital y líneas de trabajo priorizadas.",
      items: [
        {
          id: "strategic-themes",
          label: "3–5 temas estratégicos alineados con capacidad workspace",
          status: "pass",
          priority: "P1",
          evidence:
            "Cada tema referenciado contra product modules existentes (ej. branding, comunicaciones) sin prometer features fantasma.",
        },
        {
          id: "risk-register",
          label: "Riesgos y dependencias externas documentados",
          status: "pending",
          priority: "P2",
          evidence: "Registro fuera del producto; plantilla marca pendiente hasta legal/ops firme.",
        },
      ],
    },
    {
      id: "action_plan",
      module: "action_plan",
      title: "Plan de acción",
      intro: "Hitos, dueños y ventanas de tiempo.",
      items: [
        {
          id: "milestones",
          label: "90 días con hitos fechados y responsable nombrado",
          status: "warn",
          priority: "P1",
          evidence:
            "Si depende de `/app/projects` o campañas, URLs o IDs de referencia en nota interna — no en este preview.",
        },
        {
          id: "dependency-chain",
          label: "Cadena crítica (qué bloquea qué) explícita",
          status: "pass",
          priority: "P2",
          evidence: "Diagrama o tabla externa; checklist OS solo refleja estado.",
        },
      ],
    },
    {
      id: "kpi_metrics",
      module: "kpi_metrics",
      title: "KPIs y métricas",
      intro: "Definiciones, fuentes y frecuencia de revisión.",
      items: [
        {
          id: "kpi-definitions",
          label: "Definición de cada KPI (numerador/denominador o regla clara)",
          status: "pass",
          priority: "P1",
          evidence: "Hoja compartida; plantilla no recolecta datos.",
        },
        {
          id: "leading-lagging",
          label: "Balance indicadores leading/lagging según fase del piloto",
          status: "warn",
          priority: "P3",
          evidence: "Revisión cualitativa — sin scoring automático.",
        },
      ],
    },
    {
      id: "followup_review",
      module: "followup_review",
      title: "Seguimiento y revisión",
      intro: "Ritmo de control, QBR o equivalente.",
      items: [
        {
          id: "cadence",
          label: "Cadencia de revisión (mensual/trimestral) acordada",
          status: "pass",
          priority: "P2",
          evidence: "Calendario externo; owners NELVYON vs cliente claros.",
        },
        {
          id: "help-escalation",
          label: "Escalación fuera de alcance vía `/help` comunicada al cliente",
          status: "pending",
          priority: "P2",
          evidence: "Cuando hay desvíos legales o fuera de producto, path humano conocido.",
        },
      ],
    },
    {
      id: "deliverables_reporting",
      module: "deliverables_reporting",
      title: "Entregables y reporting",
      intro: "Pack final y cierre documental.",
      items: [
        {
          id: "deliverable-pack",
          label: "Lista de entregables firmada (deck, playbook, anexos)",
          status: "warn",
          priority: "P1",
          evidence: "Versionado manual; sin almacenamiento nuevo en template.",
        },
        {
          id: "handoff-readme",
          label: "README de handoff con enlaces a `/app/advisor` y próximos pasos",
          status: "pass",
          priority: "P1",
          evidence: "Cliente sabe dónde retomar la narrativa en producto.",
        },
      ],
    },
  ],
};
