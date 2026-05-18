import type { PersonalDigitalProjectConfig } from "@/templates/personal-digital-premium/types";
import { PERSONAL_DIGITAL_PREMIUM_PREVIEW_PATH } from "@/templates/personal-digital-premium/paths";

/** Demo OS handoff — illustrative only; does not extend PERSONAL DIGITAL v1 runtime; DS v2 shell. */
export const personalDigitalPremiumNelvyonDemoProject: PersonalDigitalProjectConfig = {
  pageSeo: {
    title: "NELVYON OS — Personal Digital Premium delivery template (preview)",
    description:
      "Premium personal digital checklist: profile, web, networks, content, reputation, reporting. Layers on closed PERSONAL DIGITAL v1 — no duplicate infra.",
    canonicalPath: PERSONAL_DIGITAL_PREMIUM_PREVIEW_PATH,
    siteName: "NELVYON Personal Digital Premium",
    keywords: ["personal brand", "NELVYON", "OS", "delivery"],
    locale: "es_ES",
  },
  clientLabel: "Demo mandate · Apex Individual Practice",
  projectName: "Perfil ejecutivo piloto · Paquete de entrega OS",
  projectSubtitle:
    "Lista de chequeo antes de que el cliente asuma la presencia digital como “lista”. Contrastar con PERSONAL DIGITAL NELVYON v1 ya cerrado.",
  generatedNote:
    "Plantilla v2 (Design System aplicado): no añade conectores sociales ni motores nuevos. La verificación apunta a rutas existentes (branding, advisor, comunicaciones, plantilla web OS).",
  sections: [
    {
      id: "profile_presence",
      module: "profile_presence",
      title: "Perfil y presencia",
      intro: "Narrativa profesional coherente con el workspace y políticas visibles.",
      items: [
        {
          id: "brand-narrative",
          label: "Historia y propuesta de valor alineadas con `/app/branding`",
          status: "pass",
          priority: "P1",
          evidence:
            "Copy revisado contra superficies de marca del workspace — sin prometer white-label fuera del plan vendido.",
        },
        {
          id: "visual-preview",
          label: "Matriz preview v2 coherente (allowed vs blocked)",
          status: "warn",
          priority: "P2",
          evidence:
            "`/app/branding/preview-v2` usado como evidencia antes de READY; política efectiva pendiente si tenant hereda restricciones.",
        },
      ],
    },
    {
      id: "personal_web",
      module: "personal_web",
      title: "Web personal",
      intro: "Presencia propia dentro del alcance declarado del engagement.",
      items: [
        {
          id: "web-scope",
          label: "Alcance del sitio (plantilla OS vs hospedaje externo) explícito",
          status: "pass",
          priority: "P1",
          evidence:
            "Si aplica demo interna, contrastar párrafos con `/os/web-premium/preview`; si es externo, URL y dueño registrados fuera.",
        },
        {
          id: "seo-snippet",
          label: "Título y meta descripción acordados (sin garantías de ranking)",
          status: "pending",
          priority: "P3",
          evidence: "Entregables de copy fuera del producto; plantilla solo marca estado.",
        },
      ],
    },
    {
      id: "professional_networks",
      module: "professional_networks",
      title: "Redes profesionales",
      intro: "LinkedIn y redes — trabajo manual/documentado; sin APIs fantasmas.",
      items: [
        {
          id: "linkedin-baseline",
          label: "Perfil LinkedIn / redes alineadas al mensaje principal",
          status: "warn",
          priority: "P1",
          evidence:
            "Checklist manual con capturas o enlaces públicos — no automatización OAuth desde esta capa premium.",
        },
        {
          id: "cross-channel",
          label: "`/app/communications` revisado cuando el cliente declara uso de canal propio",
          status: "pending",
          priority: "P2",
          evidence:
            "Solo si engagement incluye coordinación de mensajes internos — de lo contrario N/A declarado.",
        },
      ],
    },
    {
      id: "personal_content",
      module: "personal_content",
      title: "Contenido personal",
      intro: "Calendario temático y límites de voz de marca.",
      items: [
        {
          id: "content-pillars",
          label: "Pilares de contenido y frecuencia acordados",
          status: "pass",
          priority: "P2",
          evidence: "Documento externo; OS marca cumplimiento cualitativo antes de cierre.",
        },
        {
          id: "advisor-alignment",
          label: "Asesoría narrativa contrastada con `/app/advisor` cuando el piloto lo incluye",
          status: "warn",
          priority: "P2",
          evidence: "Evitar duplicar promesas que el asesor no cubre en producto.",
        },
      ],
    },
    {
      id: "reputation_visibility",
      module: "reputation_visibility",
      title: "Reputación y visibilidad",
      intro: "Búsqueda básica, menciones públicas y riesgos declarados.",
      items: [
        {
          id: "search-sanity",
          label: "Búsqueda de marca/persona (snapshot manual)",
          status: "pending",
          priority: "P3",
          evidence: "No hay motor de reputación aquí — operador registra fecha y hallazgos.",
        },
        {
          id: "escalation-help",
          label: "Escalación fuera de alcance por `/help` comunicada",
          status: "pass",
          priority: "P1",
          evidence:
            "Cuando reputación CRM/legal excede producto, flujo humano conocido está documentado para el cliente.",
        },
      ],
    },
    {
      id: "reporting",
      module: "reporting",
      title: "Reporting",
      intro: "Métricas alineadas al piloto (alcance declarado únicamente).",
      items: [
        {
          id: "kpi-scope",
          label: "KPIs declarados sin inflar alcance viral",
          status: "warn",
          priority: "P2",
          evidence:
            "Hoja externa de métricas; plantilla marca expectativas, no recolecta datos de redes sociales.",
        },
        {
          id: "gate-note",
          label: "`pnpm gate` verde antes de READY si código web/branding tocó releases",
          status: "pending",
          priority: "P3",
          evidence:
            "`/os/excellence/golden-path` referencia institucional; ejecución real fuera del preview.",
        },
      ],
    },
  ],
};
