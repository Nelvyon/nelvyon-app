export type EmailTemplate =
  | "welcome"
  | "email_verify"
  | "password_reset"
  | "plan_activated"
  | "invoice"
  | "payment_failed"
  | "cancellation"
  | "data_export_confirm"
  | "account_deleted"
  | "nps_thank_you";

export interface EmailData {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export function buildEmail(template: EmailTemplate, params: Record<string, string>): EmailData {
  switch (template) {
    case "welcome":
      return {
        to: params.email,
        subject: "Bienvenido a NELVYON",
        html: welcomeHtml(params),
        text: `Bienvenido a NELVYON, ${params.name}. Tu cuenta está activa. Accede en ${params.appUrl}`,
      };
    case "email_verify":
      return {
        to: params.email,
        subject: "Confirma tu email — NELVYON",
        html: emailVerifyHtml(params),
        text: `Hola ${params.name}, confirma tu email en NELVYON: ${params.verifyUrl}`,
      };
    case "password_reset":
      return {
        to: params.email,
        subject: "Restablece tu contraseña — NELVYON",
        html: passwordResetHtml(params),
        text: `Hola ${params.name}, restablece tu contraseña en NELVYON: ${params.resetUrl}`,
      };
    case "plan_activated":
      return {
        to: params.email,
        subject: `Plan ${params.plan} activado — NELVYON`,
        html: planActivatedHtml(params),
        text: `Tu plan ${params.plan} está activo. Próxima renovación: ${params.periodEnd}.`,
      };
    case "invoice":
      return {
        to: params.email,
        subject: `Factura NELVYON — ${params.period}`,
        html: invoiceHtml(params),
        text: `Factura ${params.invoiceId} por ${params.amount}. Período: ${params.period}.`,
      };
    case "payment_failed":
      return {
        to: params.email,
        subject: "Problema con tu pago — NELVYON",
        html: paymentFailedHtml(params),
        text: `Hubo un problema con tu pago. Actualiza tu método de pago en ${params.appUrl}/billing`,
      };
    case "cancellation":
      return {
        to: params.email,
        subject: "Tu suscripción ha sido cancelada — NELVYON",
        html: cancellationHtml(params),
        text: `Tu suscripción ha sido cancelada. Tienes acceso hasta ${params.accessUntil}.`,
      };
    case "data_export_confirm":
      return {
        to: params.email,
        subject: "Has exportado tus datos — NELVYON",
        html: dataExportConfirmHtml(params),
        text: `Hola ${params.name}, adjuntamos confirmación: has descargado una copia de tus datos NELVYON el ${params.exportedAt}. Más info: ${params.appUrl}/legal`,
      };
    case "account_deleted":
      return {
        to: params.email,
        subject: "Tu cuenta NELVYON ha sido eliminada",
        html: accountDeletedHtml(params),
        text: `Tu cuenta NELVYON ha sido solicitada para eliminación. ${params.summary}`,
      };
    case "nps_thank_you":
      return {
        to: params.email,
        subject: "Gracias por tu feedback — NELVYON",
        html: npsThankYouHtml(params),
        text: `Hola ${params.name}, gracias por valorar NELVYON con ${params.score}/10. Tu opinión nos ayuda a mejorar cada día.`,
      };
  }
}

// ── HTML helpers ─────────────────────────────────────────────────────────────
function baseHtml(title: string, body: string): string {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:system-ui,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td align="center" style="padding:32px 16px;">
<table width="600" cellpadding="0" cellspacing="0"
  style="max-width:600px;background:#111;border-radius:12px;padding:40px;border:1px solid #27272a;">
<tr><td>
<div style="color:#6366f1;font-size:22px;font-weight:700;margin-bottom:32px;letter-spacing:-0.5px;">
  NELVYON
</div>
${body}
<div style="margin-top:40px;padding-top:24px;border-top:1px solid #27272a;
  color:#71717a;font-size:12px;">
  NELVYON · Todos los derechos reservados ·
  <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "https://nelvyon.com"}/legal"
     style="color:#6366f1;">Legal</a>
</div>
</td></tr></table>
</td></tr></table></body></html>`;
}

function welcomeHtml(p: Record<string, string>): string {
  return baseHtml("Bienvenido a NELVYON", `
<h1 style="color:#f4f4f5;font-size:24px;margin:0 0 16px;">Bienvenido, ${p.name}</h1>
<p style="color:#a1a1aa;font-size:16px;line-height:1.6;margin:0 0 24px;">
  Tu cuenta NELVYON está activa. Accede a tu dashboard y empieza a usar
  todos los agentes de IA ahora mismo.
</p>
<a href="${p.appUrl}/dashboard"
   style="display:inline-block;background:#6366f1;color:#fff;padding:14px 28px;
   border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">
  Ir al dashboard →
</a>`);
}

function emailVerifyHtml(p: Record<string, string>): string {
  return baseHtml("Confirma tu email", `
<h1 style="color:#f4f4f5;font-size:24px;margin:0 0 16px;">Confirma tu email, ${p.name}</h1>
<p style="color:#a1a1aa;font-size:16px;line-height:1.6;margin:0 0 24px;">
  Haz clic en el botón para verificar tu dirección de correo y activar tu cuenta NELVYON.
  El enlace caduca en 48 horas.
</p>
<a href="${p.verifyUrl}"
   style="display:inline-block;background:#6366f1;color:#fff;padding:14px 28px;
   border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">
  Confirmar email →
</a>
<p style="color:#71717a;font-size:13px;margin:24px 0 0;line-height:1.5;">
  Si no creaste esta cuenta, ignora este mensaje.
</p>`);
}

function passwordResetHtml(p: Record<string, string>): string {
  return baseHtml("Restablece tu contraseña", `
<h1 style="color:#f4f4f5;font-size:24px;margin:0 0 16px;">Restablece tu contraseña, ${p.name}</h1>
<p style="color:#a1a1aa;font-size:16px;line-height:1.6;margin:0 0 24px;">
  Hemos recibido una solicitud para cambiar la contraseña de tu cuenta NELVYON.
  El enlace caduca en 1 hora.
</p>
<a href="${p.resetUrl}"
   style="display:inline-block;background:#6366f1;color:#fff;padding:14px 28px;
   border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">
  Restablecer contraseña →
</a>
<p style="color:#71717a;font-size:13px;margin:24px 0 0;line-height:1.5;">
  Si no solicitaste este cambio, ignora este mensaje. Tu contraseña actual seguirá siendo válida.
</p>`);
}

function planActivatedHtml(p: Record<string, string>): string {
  const planLabel = p.plan.charAt(0).toUpperCase() + p.plan.slice(1);
  const steps = [
    { n: "1", title: "Completa tu perfil", desc: "Añade el nombre de tu empresa y logotipo.", href: `${p.appUrl}/saas/settings` },
    { n: "2", title: "Importa tus contactos", desc: "Sube tu CSV o conéctalos desde tu CRM anterior.", href: `${p.appUrl}/saas/crm` },
    { n: "3", title: "Crea tu primera campaña", desc: "Email, SMS o WhatsApp — en 2 minutos.", href: `${p.appUrl}/saas/campanias` },
    { n: "4", title: "Activa tus redes sociales", desc: "Conecta Instagram, Facebook, LinkedIn y TikTok.", href: `${p.appUrl}/saas/social` },
    { n: "5", title: "Configura tu primera automatización", desc: "Workflows que trabajan mientras duermes.", href: `${p.appUrl}/saas/workflows` },
  ];
  const stepsHtml = steps.map(s => `
<tr>
  <td style="padding:12px 16px;vertical-align:top;">
    <table cellpadding="0" cellspacing="0"><tr>
      <td style="width:32px;height:32px;background:#6366f1;border-radius:50%;text-align:center;vertical-align:middle;color:#fff;font-weight:700;font-size:13px;padding:0;">${s.n}</td>
      <td style="padding-left:12px;">
        <a href="${s.href}" style="color:#f4f4f5;font-weight:600;font-size:14px;text-decoration:none;">${s.title}</a>
        <p style="margin:2px 0 0;color:#71717a;font-size:13px;">${s.desc}</p>
      </td>
    </tr></table>
  </td>
</tr>`).join("");

  return baseHtml(`¡Bienvenido a NELVYON ${planLabel}!`, `
<h1 style="color:#f4f4f5;font-size:26px;margin:0 0 8px;">
  🎉 Tu plan <span style="color:#6366f1;">${planLabel}</span> está activo
</h1>
<p style="color:#a1a1aa;font-size:15px;line-height:1.6;margin:0 0 24px;">
  Tienes acceso completo a todos los módulos de NELVYON. Sigue estos 5 pasos para arrancar hoy mismo:
</p>
<table width="100%" cellpadding="0" cellspacing="0"
  style="border:1px solid #27272a;border-radius:10px;overflow:hidden;margin-bottom:24px;">
  ${stepsHtml}
</table>
<p style="color:#71717a;font-size:13px;margin:0 0 24px;">
  Próxima renovación: <strong style="color:#f4f4f5;">${p.periodEnd}</strong>
</p>
<a href="${p.appUrl}/saas/dashboard"
   style="display:inline-block;background:#6366f1;color:#fff;padding:14px 32px;
   border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;letter-spacing:0.3px;">
  Ir al dashboard →
</a>
<p style="color:#71717a;font-size:12px;margin:20px 0 0;">
  ¿Necesitas ayuda? Escríbenos a <a href="mailto:danicaste2004@gmail.com" style="color:#6366f1;">danicaste2004@gmail.com</a>
</p>`);
}

function invoiceHtml(p: Record<string, string>): string {
  return baseHtml(`Factura ${p.period}`, `
<h1 style="color:#f4f4f5;font-size:24px;margin:0 0 24px;">Factura</h1>
<table width="100%" cellpadding="0" cellspacing="0"
  style="border:1px solid #27272a;border-radius:8px;overflow:hidden;margin-bottom:24px;">
<tr style="background:#1a1a1a;">
  <td style="padding:12px 16px;color:#71717a;font-size:13px;">Nº Factura</td>
  <td style="padding:12px 16px;color:#f4f4f5;font-size:13px;">${p.invoiceId}</td>
</tr>
<tr>
  <td style="padding:12px 16px;color:#71717a;font-size:13px;">Período</td>
  <td style="padding:12px 16px;color:#f4f4f5;font-size:13px;">${p.period}</td>
</tr>
<tr style="background:#1a1a1a;">
  <td style="padding:12px 16px;color:#71717a;font-size:13px;">Plan</td>
  <td style="padding:12px 16px;color:#f4f4f5;font-size:13px;">${p.plan}</td>
</tr>
<tr>
  <td style="padding:12px 16px;color:#71717a;font-size:13px;">Importe</td>
  <td style="padding:12px 16px;color:#6366f1;font-size:15px;font-weight:700;">${p.amount}</td>
</tr>
</table>
<p style="color:#71717a;font-size:13px;">
  La factura fiscal la gestiona Paddle como Merchant of Record.
</p>`);
}

function paymentFailedHtml(p: Record<string, string>): string {
  return baseHtml("Problema con tu pago", `
<h1 style="color:#f4f4f5;font-size:24px;margin:0 0 16px;">
  Problema con tu pago
</h1>
<p style="color:#a1a1aa;font-size:16px;line-height:1.6;margin:0 0 24px;">
  No hemos podido procesar tu pago. Actualiza tu método de pago para
  mantener el acceso a NELVYON.
</p>
<a href="${p.appUrl}/billing"
   style="display:inline-block;background:#ef4444;color:#fff;padding:14px 28px;
   border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">
  Actualizar método de pago →
</a>`);
}

function cancellationHtml(p: Record<string, string>): string {
  return baseHtml("Suscripción cancelada", `
<h1 style="color:#f4f4f5;font-size:24px;margin:0 0 16px;">
  Suscripción cancelada
</h1>
<p style="color:#a1a1aa;font-size:16px;line-height:1.6;margin:0 0 8px;">
  Tu suscripción ha sido cancelada correctamente.
</p>
<p style="color:#71717a;font-size:14px;margin:0 0 24px;">
  Seguirás teniendo acceso hasta: <strong style="color:#f4f4f5;">${p.accessUntil}</strong>
</p>
<a href="${p.appUrl}/pricing"
   style="display:inline-block;background:#6366f1;color:#fff;padding:14px 28px;
   border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">
  Reactivar plan →
</a>`);
}

function dataExportConfirmHtml(p: Record<string, string>): string {
  return baseHtml("Exportación de datos", `
<h1 style="color:#f4f4f5;font-size:24px;margin:0 0 16px;">Copia de tus datos</h1>
<p style="color:#a1a1aa;font-size:16px;line-height:1.6;margin:0 0 16px;">
  Hola ${p.name}, confirmamos que has solicitado y descargado una copia de tus datos personales
  almacenados en NELVYON (Art. 15 y 20 RGPD).
</p>
<p style="color:#71717a;font-size:14px;margin:0;">
  Fecha de la exportación: <strong style="color:#f4f4f5;">${p.exportedAt}</strong>
</p>
<p style="color:#71717a;font-size:13px;margin:24px 0 0;line-height:1.5;">
  Conserva el archivo JSON en un lugar seguro. Si no fuiste tú, contacta con soporte de inmediato.
</p>
<p style="margin-top:16px;">
<a href="${p.appUrl}/legal"
   style="color:#6366f1;font-size:13px;">Legal y privacidad</a>
</p>`);
}

function npsThankYouHtml(p: Record<string, string>): string {
  return baseHtml("Gracias por tu feedback", `
<h1 style="color:#f4f4f5;font-size:24px;margin:0 0 16px;">¡Gracias, ${p.name}!</h1>
<p style="color:#a1a1aa;font-size:16px;line-height:1.6;margin:0 0 16px;">
  Hemos recibido tu valoración <strong style="color:#f4f4f5;">${p.score}/10</strong>.
  Tu opinión hace que NELVYON sea mejor cada día.
</p>
<p style="color:#71717a;font-size:14px;margin:0 0 24px;line-height:1.5;">
  Si dejaste un comentario, nuestro equipo lo revisará para priorizar mejoras en el producto.
</p>
<a href="${p.appUrl}/saas/dashboard"
   style="display:inline-block;background:#01696F;color:#fff;padding:14px 28px;
   border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">
  Volver al dashboard →
</a>`);
}

function accountDeletedHtml(p: Record<string, string>): string {
  return baseHtml("Cuenta eliminada", `
<h1 style="color:#f4f4f5;font-size:24px;margin:0 0 16px;">Cuenta solicitada para eliminación</h1>
<p style="color:#a1a1aa;font-size:16px;line-height:1.6;margin:0 0 16px;">
  Hola ${p.name}, tu cuenta NELVYON ha sido procesada según tu solicitud.
</p>
<p style="color:#a1a1aa;font-size:15px;line-height:1.6;margin:0 0 12px;">
  ${p.summary}
</p>
<p style="color:#71717a;font-size:13px;margin:0;line-height:1.5;">
  Los registros necesarios por obligaciones legales y fiscales (pago, facturación) se conservan el tiempo legal aplicable,
  anonimizados o separados de tu cuenta personal cuando proceda.
</p>`);
}
