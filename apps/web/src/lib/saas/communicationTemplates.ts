/** NELVYON SaaS — transactional emails & in-app messages. */

export type TransactionalEmailTemplate = {
  id: string;
  subject: string;
  preheader?: string;
  bodyText: string;
  bodyHtml?: string;
  variables: string[];
};

export const TRANSACTIONAL_EMAILS: Record<string, TransactionalEmailTemplate> = {
  welcome: {
    id: "welcome",
    subject: "Bienvenido/a a NELVYON — tu marketing digital empieza aquí",
    preheader: "Elige tu primer pack en menos de 2 minutos",
    variables: ["name", "app_url"],
    bodyText: `Hola {{name}},

Gracias por unirte a NELVYON.

NELVYON te ayuda a ejecutar marketing digital con packs listos: SEO, ads, redes, email y funnels. No necesitas configurar herramientas técnicas — eliges un pack, das un brief corto y recibes entregables.

Tu siguiente paso: elige un pack acorde a tu negocio.
→ {{app_url}}/packs

Si tienes dudas, responde a este email.

— Equipo NELVYON`,
  },
  verify_email: {
    id: "verify_email",
    subject: "Verifica tu email en NELVYON",
    preheader: "Un clic y listo",
    variables: ["name", "verify_url", "expires_hours"],
    bodyText: `Hola {{name}},

Confirma tu email para acceder a todos los packs de NELVYON:

{{verify_url}}

Este enlace caduca en {{expires_hours}} horas. Si no creaste esta cuenta, ignora este mensaje.

— NELVYON`,
  },
  reset_password: {
    id: "reset_password",
    subject: "Restablece tu contraseña de NELVYON",
    variables: ["name", "reset_url", "expires_hours"],
    bodyText: `Hola {{name}},

Recibimos una solicitud para restablecer tu contraseña.

{{reset_url}}

Caduca en {{expires_hours}} horas. Si no fuiste tú, ignora este email.

— NELVYON`,
  },
  pack_completed: {
    id: "pack_completed",
    subject: "Tu pack {{pack_name}} está listo — revisa los resultados",
    preheader: "Informe y entregables disponibles",
    variables: ["name", "pack_name", "report_url", "business_name"],
    bodyText: `Hola {{name}},

Hemos completado el pack **{{pack_name}}** para {{business_name}}.

Revisa tu informe ejecutivo y entregables aquí:
{{report_url}}

Próximo paso recomendado: comparte el enlace de portal con tu cliente o lanza un pack complementario.

— NELVYON`,
  },
  pack_reminder: {
    id: "pack_reminder",
    subject: "Tienes un pack sin lanzar en NELVYON",
    variables: ["name", "packs_url"],
    bodyText: `Hola {{name}},

Creaste tu cuenta pero aún no has lanzado ningún pack.

Explora el catálogo y prueba una demo en 1 clic:
{{packs_url}}

— NELVYON`,
  },
  portal_invite: {
    id: "portal_invite",
    subject: "{{agency_name}} te invita a revisar entregables en NELVYON",
    variables: ["client_name", "agency_name", "invite_url"],
    bodyText: `Hola {{client_name}},

{{agency_name}} ha publicado entregables para ti en el portal NELVYON.

Accede aquí: {{invite_url}}

— NELVYON`,
  },
};

export type InAppMessage = {
  id: string;
  context: "empty_state" | "tooltip" | "success" | "error" | "help";
  title?: string;
  message: string;
};

export const IN_APP_MESSAGES: InAppMessage[] = [
  {
    id: "packs-first-visit",
    context: "help",
    title: "¿Por dónde empiezo?",
    message:
      "Si tienes negocio local, elige Pack Crecimiento Local. Ecommerce → Pack Ecommerce. SaaS B2B → Pack SaaS B2B. Puedes usar demo en 1 clic.",
  },
  {
    id: "pack-running",
    context: "success",
    title: "Pack en marcha",
    message: "Estamos generando landing, SEO, emails y más. Suele tardar unos minutos.",
  },
  {
    id: "pack-beta",
    context: "help",
    title: "Pack en beta",
    message: "Este pack reutiliza el motor del pack de crecimiento equivalente. Pronto tendrá flujo dedicado.",
  },
  {
    id: "no-report-yet",
    context: "empty_state",
    title: "Sin informes todavía",
    message: "Cuando completes un pack, aquí verás KPIs, entregables y enlaces al portal cliente.",
  },
  {
    id: "connect-analytics",
    context: "help",
    message: "Conecta Google Analytics en Ajustes → Integraciones para métricas en vivo en tus informes.",
  },
];

export function renderEmailTemplate(
  templateId: string,
  vars: Record<string, string>,
): { subject: string; text: string } | null {
  const tpl = TRANSACTIONAL_EMAILS[templateId];
  if (!tpl) return null;
  const replace = (s: string) =>
    s.replace(/\{\{(\w+)\}\}/g, (_, k: string) => vars[k] ?? "");
  return {
    subject: replace(tpl.subject),
    text: replace(tpl.bodyText),
  };
}

export function getInAppMessage(id: string): InAppMessage | undefined {
  return IN_APP_MESSAGES.find((m) => m.id === id);
}
