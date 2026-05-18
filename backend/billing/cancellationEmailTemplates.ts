export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

function baseHtml(title: string, body: string): string {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<title>${title}</title></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:system-ui,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px;">
<table width="600" style="max-width:600px;background:#111;border-radius:12px;padding:40px;border:1px solid #27272a;">
<tr><td>
<div style="color:#6366f1;font-size:22px;font-weight:700;margin-bottom:32px;">NELVYON</div>
${body}
</td></tr></table></td></tr></table></body></html>`;
}

export function cancellationScheduledEmail(
  customerName: string,
  planName: string,
  periodEnd: string,
  reactivateUrl: string,
): EmailContent {
  const subject = "Tu suscripción se cancelará al final del periodo — NELVYON";
  const html = baseHtml(
    subject,
    `
<h1 style="color:#f4f4f5;font-size:24px;margin:0 0 16px;">Hola, ${customerName}</h1>
<p style="color:#a1a1aa;font-size:16px;line-height:1.6;margin:0 0 16px;">
  Hemos recibido tu solicitud de cancelación del plan <strong style="color:#f4f4f5;">${planName}</strong>.
  Seguirás teniendo acceso completo hasta el <strong style="color:#f4f4f5;">${periodEnd}</strong>.
</p>
<p style="color:#71717a;font-size:14px;margin:0 0 24px;">
  Si cambias de opinión antes de esa fecha, puedes reactivar tu suscripción en un clic.
</p>
<a href="${reactivateUrl}"
   style="display:inline-block;background:#6366f1;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;">
  Gestionar suscripción →
</a>`,
  );
  const text = `Hola ${customerName}, tu plan ${planName} se cancelará el ${periodEnd}. Acceso completo hasta entonces. Reactivar: ${reactivateUrl}`;
  return { subject, html, text };
}

export function offboardingEmail(customerName: string, exportUrl: string): EmailContent {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://nelvyon.com";
  const subject = "Gracias por haber usado NELVYON";
  const html = baseHtml(
    subject,
    `
<h1 style="color:#f4f4f5;font-size:24px;margin:0 0 16px;">Gracias, ${customerName}</h1>
<p style="color:#a1a1aa;font-size:16px;line-height:1.6;margin:0 0 16px;">
  Tu suscripción ha finalizado. Ha sido un placer acompañarte.
</p>
<p style="color:#a1a1aa;font-size:16px;line-height:1.6;margin:0 0 16px;">
  Tus datos permanecerán disponibles durante <strong style="color:#f4f4f5;">30 días</strong>
  por si necesitas exportarlos. Después se eliminarán de forma automática conforme al RGPD.
</p>
<a href="${exportUrl}"
   style="display:inline-block;background:#6366f1;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;margin-right:12px;">
  Ver mis datos →
</a>
<a href="${appUrl}/pricing"
   style="display:inline-block;background:#27272a;color:#f4f4f5;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;">
  Volver a NELVYON
</a>`,
  );
  const text = `Gracias ${customerName}. Tus datos estarán disponibles 30 días: ${exportUrl}. Volver: ${appUrl}/pricing`;
  return { subject, html, text };
}
