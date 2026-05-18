import type { BrandingProjectConfig } from "@/templates/branding-premium/types";
import { BRANDING_PREMIUM_PREVIEW_PATH } from "@/templates/branding-premium/paths";

/** Demo project — replace per engagement; no design-tool APIs; DS v2 shell. */
export const brandingPremiumNelvyonDemoProject: BrandingProjectConfig = {
  pageSeo: {
    title: "NELVYON OS — Branding Premium project template (preview)",
    description:
      "Premium branding OS shell: identity, type, color, voice, applications, brandbook. Internal preview — not client legal sign-off.",
    canonicalPath: BRANDING_PREMIUM_PREVIEW_PATH,
    siteName: "NELVYON Branding Premium",
    keywords: ["branding", "identity", "NELVYON", "OS"],
    locale: "en_US",
  },
  clientLabel: "Demo client · Meridian Publishing",
  projectName: "Meridian Signature System · v1 handoff",
  projectSubtitle:
    "Structured deliverable audit before tokens ship to web properties. Replace statuses with real QA outcomes per workspace.",
  generatedNote:
    "Template v2 (Design System applied) does not sync with Figma or asset DAMs. Policy and preview routes remain the source of truth for enforcement inside NELVYON.",
  sections: [
    {
      id: "visual_identity",
      module: "visual_identity",
      title: "Identidad visual",
      intro: "Logotipo, marcas y restricciones de uso.",
      items: [
        {
          id: "logo-master",
          label: "Logotipo principal + variantes (horizontal / isotipo)",
          status: "pass",
          priority: "P1",
          evidence: "Master SVG agreed; clear space rules documented in brand PDF handoff (external to OS).",
        },
        {
          id: "logo-misuse",
          label: "Guía anti-abuso (stretch, color, fondos)",
          status: "warn",
          priority: "P1",
          evidence: "Operators must confirm legal/trademark usage offline — template tracks acknowledgement only.",
        },
      ],
    },
    {
      id: "typography",
      module: "typography",
      title: "Tipografía",
      intro: "Familias, pesos y escalas tipográficas.",
      items: [
        {
          id: "type-scale",
          label: "Escala H1–caption + pesos permitidos",
          status: "pass",
          priority: "P1",
          evidence: "Aligns with Web Premium template font strategy — verify licensed webfont hosting separately.",
        },
        {
          id: "fallbacks",
          label: "Fallback stack accesible",
          status: "pending",
          priority: "P2",
          evidence: "Pending final AA contrast audit on secondary weights.",
        },
      ],
    },
    {
      id: "color",
      module: "color",
      title: "Paleta cromática",
      intro: "Primarios, secundarios, superficies y estados.",
      items: [
        {
          id: "tokens",
          label: "Tokens HEX + uso en UI (primario / neutros / semánticos)",
          status: "pass",
          priority: "P1",
          evidence: "Accent aligns with tenant policy preview — confirm `/app/branding/policy` before production.",
        },
        {
          id: "contrast",
          label: "Contraste AA en botones y enlaces",
          status: "warn",
          priority: "P1",
          evidence: "Spot-check against WCAG tooling outside NELVYON until automated audit front exists.",
        },
      ],
    },
    {
      id: "voice",
      module: "voice",
      title: "Tono de voz",
      intro: "Personalidad verbal, ejemplos y palabras evitadas.",
      items: [
        {
          id: "voice-principles",
          label: "Pilares de voz + ejemplos before/after",
          status: "pass",
          priority: "P2",
          evidence: "Copy deck maintained by content owner — OS lists approval status only.",
        },
        {
          id: "voice-i18n",
          label: "Coherencia multi-idioma vs `/os/i18n`",
          status: "warn",
          priority: "P2",
          evidence: "Prioritize P1 strings before scaling campaigns or SEO surfaces.",
        },
      ],
    },
    {
      id: "applications",
      module: "applications",
      title: "Aplicaciones de marca",
      intro: "Patrones en producto, email y piezas clave.",
      items: [
        {
          id: "web-shell",
          label: "Aplicación en shell web / landers",
          status: "warn",
          priority: "P1",
          evidence: "Cross-check Web Premium + SEO templates for token usage — no global reskin from this view.",
        },
        {
          id: "email-patterns",
          label: "Cabeceras email / social placeholders",
          status: "pending",
          priority: "P3",
          evidence: "Awaiting final asset export from design partner.",
        },
      ],
    },
    {
      id: "brandbook",
      module: "brandbook",
      title: "Brandbook y entregables",
      intro: "Paquete PDF, fuentes y checklist de release.",
      items: [
        {
          id: "pdf-version",
          label: "Brandbook PDF versionado (v1.0 handoff)",
          status: "pass",
          priority: "P2",
          evidence: "Version label recorded in ops handoff — file stored outside this repo.",
        },
        {
          id: "release-readiness",
          label: "Checklist READY + policy/preview sign-off",
          status: "warn",
          priority: "P1",
          evidence: "Requires `/os/excellence/golden-path` green and policy matrix verified.",
        },
      ],
    },
  ],
};
