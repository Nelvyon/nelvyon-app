import { billingHtmlLang, getBillingLifecycleCopy } from "./billingLifecycleLocale";

export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

function baseHtml(title: string, body: string, locale?: string | null): string {
  const lang = billingHtmlLang(locale);
  return `<!DOCTYPE html><html lang="${lang}"><head><meta charset="UTF-8">
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

export function paymentFailedEmail(
  customerName: string,
  planName: string,
  updateUrl: string,
  locale?: string | null,
): EmailContent {
  const c = getBillingLifecycleCopy(locale).paymentFailed;
  const subject = c.subject;
  const html = baseHtml(
    subject,
    `
<h1 style="color:#f4f4f5;font-size:24px;margin:0 0 16px;">${c.greeting(customerName)}</h1>
<p style="color:#a1a1aa;font-size:16px;line-height:1.6;margin:0 0 16px;">
  ${c.body(planName)}
</p>
<p style="color:#71717a;font-size:14px;margin:0 0 24px;">
  ${c.note}
</p>
${cta(updateUrl, c.cta, "#f59e0b")}`,
    locale,
  );
  return { subject, html, text: c.text(customerName, planName, updateUrl) };
}

export function secondNoticeEmail(
  customerName: string,
  daysLeft: number,
  updateUrl: string,
  locale?: string | null,
): EmailContent {
  const c = getBillingLifecycleCopy(locale).secondNotice;
  const subject = c.subject;
  const html = baseHtml(
    subject,
    `
<h1 style="color:#f4f4f5;font-size:24px;margin:0 0 16px;">${c.greeting(customerName)}</h1>
<p style="color:#a1a1aa;font-size:16px;line-height:1.6;margin:0 0 16px;">
  ${c.body(daysLeft)}
</p>
${cta(updateUrl, c.cta, "#f97316")}`,
    locale,
  );
  return { subject, html, text: c.text(customerName, daysLeft, updateUrl) };
}

export function finalWarningEmail(
  customerName: string,
  updateUrl: string,
  locale?: string | null,
): EmailContent {
  const c = getBillingLifecycleCopy(locale).finalWarning;
  const subject = c.subject;
  const html = baseHtml(
    subject,
    `
<h1 style="color:#f4f4f5;font-size:24px;margin:0 0 16px;">${c.greeting(customerName)}</h1>
<p style="color:#a1a1aa;font-size:16px;line-height:1.6;margin:0 0 16px;">
  ${c.body}
</p>
${cta(updateUrl, c.cta, "#ef4444")}`,
    locale,
  );
  return { subject, html, text: c.text(customerName, updateUrl) };
}

export function suspensionEmail(
  customerName: string,
  reactivateUrl: string,
  locale?: string | null,
): EmailContent {
  const c = getBillingLifecycleCopy(locale).suspension;
  const subject = c.subject;
  const html = baseHtml(
    subject,
    `
<h1 style="color:#f4f4f5;font-size:24px;margin:0 0 16px;">${c.greeting(customerName)}</h1>
<p style="color:#a1a1aa;font-size:16px;line-height:1.6;margin:0 0 16px;">
  ${c.body}
</p>
${cta(reactivateUrl, c.cta, "#6366f1")}`,
    locale,
  );
  return { subject, html, text: c.text(customerName, reactivateUrl) };
}

export function reactivationEmail(
  customerName: string,
  planName: string,
  locale?: string | null,
): EmailContent {
  const c = getBillingLifecycleCopy(locale).reactivation;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://nelvyon.com";
  const dash = `${appUrl}/saas/dashboard`;
  const subject = c.subject;
  const html = baseHtml(
    subject,
    `
<h1 style="color:#f4f4f5;font-size:24px;margin:0 0 16px;">${c.greeting(customerName)}</h1>
<p style="color:#a1a1aa;font-size:16px;line-height:1.6;margin:0 0 16px;">
  ${c.body(planName)}
</p>
${cta(dash, c.cta)}`,
    locale,
  );
  return { subject, html, text: c.text(customerName, planName, dash) };
}
