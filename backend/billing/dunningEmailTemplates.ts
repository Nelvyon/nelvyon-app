export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

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
<div style="color:#6366f1;font-size:22px;font-weight:700;margin-bottom:32px;">NELVYON</div>
${body}
</td></tr></table>
</td></tr></table></body></html>`;
}

function cta(href: string, label: string, color = "#6366f1"): string {
  return `<a href="${href}"
   style="display:inline-block;background:${color};color:#fff;padding:14px 28px;
   border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">
  ${label} →
</a>`;
}

export function paymentFailedEmail(customerName: string, planName: string, updateUrl: string): EmailContent {
  const subject = "Tu pago no se ha procesado — NELVYON";
  const html = baseHtml(
    subject,
    `
<h1 style="color:#f4f4f5;font-size:24px;margin:0 0 16px;">Hola, ${customerName}</h1>
<p style="color:#a1a1aa;font-size:16px;line-height:1.6;margin:0 0 16px;">
  No hemos podido cobrar tu plan <strong style="color:#f4f4f5;">${planName}</strong>.
  Tu acceso sigue activo durante 7 días mientras actualizas el método de pago.
</p>
<p style="color:#71717a;font-size:14px;margin:0 0 24px;">
  Paddle reintentará el cobro automáticamente. Si prefieres, puedes actualizar tu tarjeta ahora.
</p>
${cta(updateUrl, "Actualizar método de pago", "#f59e0b")}`,
  );
  const text = `Hola ${customerName}, no hemos podido cobrar tu plan ${planName}. Tienes 7 días de gracia. Actualiza tu pago: ${updateUrl}`;
  return { subject, html, text };
}

export function secondNoticeEmail(customerName: string, daysLeft: number, updateUrl: string): EmailContent {
  const subject = "Segundo aviso — actualiza tu método de pago — NELVYON";
  const html = baseHtml(
    subject,
    `
<h1 style="color:#f4f4f5;font-size:24px;margin:0 0 16px;">Segundo aviso, ${customerName}</h1>
<p style="color:#a1a1aa;font-size:16px;line-height:1.6;margin:0 0 16px;">
  El segundo intento de cobro no se ha completado. Te quedan
  <strong style="color:#f59e0b;">${daysLeft} días</strong> antes de que suspendamos el acceso a los agentes.
</p>
${cta(updateUrl, "Actualizar método de pago", "#f97316")}`,
  );
  const text = `Hola ${customerName}, segundo aviso de pago. Quedan ${daysLeft} días. Actualiza: ${updateUrl}`;
  return { subject, html, text };
}

export function finalWarningEmail(customerName: string, updateUrl: string): EmailContent {
  const subject = "Tu cuenta se suspende mañana — NELVYON";
  const html = baseHtml(
    subject,
    `
<h1 style="color:#f4f4f5;font-size:24px;margin:0 0 16px;">Último aviso, ${customerName}</h1>
<p style="color:#a1a1aa;font-size:16px;line-height:1.6;margin:0 0 16px;">
  Mañana suspenderemos el acceso a la ejecución de agentes si no recibimos el pago.
  Podrás seguir viendo tu dashboard, pero no podrás lanzar agentes hasta reactivar.
</p>
${cta(updateUrl, "Actualizar ahora", "#ef4444")}`,
  );
  const text = `Hola ${customerName}, tu cuenta se suspende mañana si no actualizas el pago: ${updateUrl}`;
  return { subject, html, text };
}

export function suspensionEmail(customerName: string, reactivateUrl: string): EmailContent {
  const subject = "Tu cuenta ha sido suspendida — NELVYON";
  const html = baseHtml(
    subject,
    `
<h1 style="color:#f4f4f5;font-size:24px;margin:0 0 16px;">Cuenta suspendida, ${customerName}</h1>
<p style="color:#a1a1aa;font-size:16px;line-height:1.6;margin:0 0 16px;">
  Hemos suspendido el acceso a los agentes por impago. Puedes consultar tu dashboard,
  pero necesitas reactivar la suscripción para volver a ejecutar agentes.
</p>
${cta(reactivateUrl, "Reactivar suscripción", "#6366f1")}`,
  );
  const text = `Hola ${customerName}, tu cuenta está suspendida. Reactiva en: ${reactivateUrl}`;
  return { subject, html, text };
}

export function reactivationEmail(customerName: string, planName: string): EmailContent {
  const subject = "Suscripción reactivada — NELVYON";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://nelvyon.com";
  const html = baseHtml(
    subject,
    `
<h1 style="color:#f4f4f5;font-size:24px;margin:0 0 16px;">¡Bienvenido de nuevo, ${customerName}!</h1>
<p style="color:#a1a1aa;font-size:16px;line-height:1.6;margin:0 0 16px;">
  Tu plan <strong style="color:#6366f1;">${planName}</strong> está activo de nuevo.
  Ya puedes ejecutar todos tus agentes.
</p>
${cta(`${appUrl}/saas/dashboard`, "Ir al dashboard")}`,
  );
  const text = `Hola ${customerName}, tu plan ${planName} está activo de nuevo. Dashboard: ${appUrl}/saas/dashboard`;
  return { subject, html, text };
}
