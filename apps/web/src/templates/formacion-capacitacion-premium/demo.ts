import type { FormacionProjectConfig } from "@/templates/formacion-capacitacion-premium/types";
import { FORMACION_CAPACITACION_PREMIUM_PREVIEW_PATH } from "@/templates/formacion-capacitacion-premium/paths";

/** Demo OS handoff — illustrative only; no LMS or live courseware; DS v2 shell. */
export const formacionCapacitacionPremiumNelvyonDemoProject: FormacionProjectConfig = {
  pageSeo: {
    title: "NELVYON OS — Formación y capacitación digital Premium delivery template (preview)",
    description:
      "Premium training checklist: diagnosis, curriculum, materials, delivery, evaluation, certification, reporting. Paperwork only — no LMS APIs or course authoring.",
    canonicalPath: FORMACION_CAPACITACION_PREMIUM_PREVIEW_PATH,
    siteName: "NELVYON Formación digital Premium",
    keywords: ["formación", "capacitación", "LMS", "NELVYON", "OS"],
    locale: "es_ES",
  },
  clientLabel: "Demo cuenta · Cumbre Logistics",
  projectName: "Academia interna datos + seguridad · Plantilla OS",
  projectSubtitle:
    "Contrato de entregables antes de abrir aula virtual. Esta capa no publica cursos ni enrola alumnos.",
  generatedNote:
    "Plantilla v2 (Design System aplicado). Badges taller, curso online, mentoría, webinar, manual, onboarding herramienta, programa continuo describen modalidad — no emiten certificados.",
  sections: [
    {
      id: "needs_diagnosis",
      module: "needs_diagnosis",
      title: "Diagnóstico de necesidades",
      intro: "Roles, brechas y restricciones.",
      items: [
        {
          id: "skills-matrix",
          label: "Matriz competencias vs herramientas internas (BI, CRM)",
          status: "pass",
          priority: "P1",
          types: ["taller_presencial", "curso_online"],
          evidence: "Workshops discovery externos; plantilla no lee HRIS.",
        },
        {
          id: "lang-a11y",
          label: "Idioma obligatorio ES + subtítulos ES/EN en vídeo async",
          status: "warn",
          priority: "P1",
          types: ["curso_online", "webinar"],
          evidence: "Pendiente proveedor captions — warn hasta presupuesto.",
        },
      ],
    },
    {
      id: "curriculum_design",
      module: "curriculum_design",
      title: "Diseño curricular",
      intro: "Resultados y módulos.",
      items: [
        {
          id: "blooms-map",
          label: "Mapa Bloom nivel 2–4 en 6 módulos + tiempo 12h",
          status: "pass",
          priority: "P1",
          types: ["mentoria", "webinar"],
          evidence: "Storyline en Figma externo; sin export SCORM desde OS.",
        },
      ],
    },
    {
      id: "materials_resources",
      module: "materials_resources",
      title: "Materiales y recursos",
      intro: "Decks, guías y licencias.",
      items: [
        {
          id: "job-aids",
          label: "Kit 8 job aids PDF + plantillas checklist",
          status: "pass",
          priority: "P2",
          types: ["manual_tecnico", "onboarding_herramienta"],
          evidence: "Assets en drive cliente; OS no aloja binarios.",
        },
        {
          id: "stock-media",
          label: "Banco stock con licencia enterprise anexada",
          status: "pending",
          priority: "P2",
          types: ["manual_tecnico", "curso_online"],
          evidence: "Pendiente renovación licencia — sin API stock desde template.",
        },
      ],
    },
    {
      id: "delivery_instruction",
      module: "delivery_instruction",
      title: "Impartición",
      intro: "Calendario y modalidad.",
      items: [
        {
          id: "cohort-hybrid",
          label: "Cohorte 40 pax: 2 talleres presenciales + 4 semanas async",
          status: "pass",
          priority: "P1",
          types: ["curso_online", "programa_continuo"],
          evidence: "Zoom/Teams fuera de NELVYON; plantilla solo agenda acordada.",
        },
        {
          id: "office-hours",
          label: "Mentoría 1:1 — 6 cupos ejecutivos",
          status: "warn",
          priority: "P2",
          types: ["mentoria", "taller_presencial"],
          evidence: "Capacidad limitada — warn si ventas promete 10 cupos.",
        },
      ],
    },
    {
      id: "evaluation_feedback",
      module: "evaluation_feedback",
      title: "Evaluación y feedback",
      intro: "Encuestas y conocimiento.",
      items: [
        {
          id: "kirkpatrick-l1",
          label: "Kirkpatrick L1 post-módulo + NPS interno",
          status: "pass",
          priority: "P2",
          types: ["webinar", "taller_presencial"],
          evidence: "Typeform externo; sin webhook LMS desde checklist.",
        },
      ],
    },
    {
      id: "certification",
      module: "certification",
      title: "Certificación",
      intro: "Criterios de emisión.",
      items: [
        {
          id: "badge-rules",
          label: "Badge digital si ≥80% quiz + asistencia 90%",
          status: "pass",
          priority: "P2",
          types: ["onboarding_herramienta", "mentoria"],
          evidence: "Credly/manual externo; OS no firma credenciales.",
        },
      ],
    },
    {
      id: "reporting_followup",
      module: "reporting_followup",
      title: "Reporting y seguimiento",
      intro: "Métricas y refuerzo.",
      items: [
        {
          id: "monthly-dash",
          label: "Dashboard mensual: completitud, NPS, incidencias aula",
          status: "pending",
          priority: "P3",
          types: ["programa_continuo", "manual_tecnico"],
          evidence: "Looker fuera de NELVYON; contraste con `/help` si datos RH sensibles.",
        },
        {
          id: "refresher-q",
          label: "Refresher trimestral microlearning 15 min",
          status: "pass",
          priority: "P3",
          types: ["programa_continuo", "curso_online"],
          evidence: "Calendario L&D; sin auto-enrol desde OS.",
        },
      ],
    },
  ],
};
