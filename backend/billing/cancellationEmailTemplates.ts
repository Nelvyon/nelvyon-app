import { billingHtmlLang, getBillingLifecycleCopy } from "./billingLifecycleLocale";

export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

function baseHtml(title: string, body: string, locale?: string | null): string {
  const lang = billingHtmlLang(locale);
  return `<!DOCTYPE html><html lang="${lang}"><head><meta charset="UTF-8">
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
  locale?: string | null,
): EmailContent {
  const c = getBillingLifecycleCopy(locale).cancellationScheduled;
  const subject = c.subject;
  const html = baseHtml(
    subject,
    `
<h1 style="color:#f4f4f5;font-size:24px;margin:0 0 16px;">${c.greeting(customerName)}</h1>
<p style="color:#a1a1aa;font-size:16px;line-height:1.6;margin:0 0 16px;">
  ${c.body(planName, periodEnd)}
</p>
<p style="color:#71717a;font-size:14px;margin:0 0 24px;">
  ${c.note}
</p>
<a href="${reactivateUrl}"
   style="display:inline-block;background:#6366f1;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;">
  ${c.cta} →
</a>`,
    locale,
  );
  return { subject, html, text: c.text(customerName, planName, periodEnd, reactivateUrl) };
}

export function offboardingEmail(
  customerName: string,
  exportUrl: string,
  locale?: string | null,
): EmailContent {
  const c = getBillingLifecycleCopy(locale).offboarding;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://nelvyon.com";
  const pricing = `${appUrl}/pricing`;
  const subject = c.subject;
  const html = baseHtml(
    subject,
    `
<h1 style="color:#f4f4f5;font-size:24px;margin:0 0 16px;">${c.greeting(customerName)}</h1>
<p style="color:#a1a1aa;font-size:16px;line-height:1.6;margin:0 0 16px;">
  ${c.body}
</p>
<p style="color:#a1a1aa;font-size:16px;line-height:1.6;margin:0 0 16px;">
  ${c.retention}
</p>
<a href="${exportUrl}"
   style="display:inline-block;background:#6366f1;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;margin-right:12px;">
  ${c.ctaExport} →
</a>
<a href="${pricing}"
   style="display:inline-block;background:#27272a;color:#f4f4f5;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;">
  ${c.ctaBack}
</a>`,
    locale,
  );
  return { subject, html, text: c.text(customerName, exportUrl, pricing) };
}
