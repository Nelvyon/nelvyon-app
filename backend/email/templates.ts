import {
  getAccountDeletedCopy,
  getCancellationCopy,
  getDataExportConfirmCopy,
  getEmailChromeCopy,
  getEmailVerifyCopy,
  getInvoiceSesCopy,
  getNpsThankYouCopy,
  getPasswordResetCopy,
  getPaymentFailedCopy,
  getPlanActivatedCopy,
  getPlanActivatedStepPaths,
  getWelcomeCopy,
  resolveEmailLocale,
} from "./localeCopy";

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

export function buildEmail(
  template: EmailTemplate,
  params: Record<string, string>,
  locale?: string | null,
): EmailData {
  switch (template) {
    case "welcome": {
      const copy = getWelcomeCopy(locale);
      return {
        to: params.email,
        subject: copy.sesSubject,
        html: welcomeHtml(params, locale),
        text: copy.sesText(params.name, params.appUrl),
      };
    }
    case "email_verify": {
      const copy = getEmailVerifyCopy(locale);
      return {
        to: params.email,
        subject: copy.subject,
        html: emailVerifyHtml(params, locale),
        text: copy.text(params.name, params.verifyUrl),
      };
    }
    case "password_reset": {
      const copy = getPasswordResetCopy(locale);
      return {
        to: params.email,
        subject: `${copy.subject} — NELVYON`,
        html: passwordResetHtml(params, locale),
        text: copy.text(params.name, params.resetUrl),
      };
    }
    case "plan_activated": {
      const copy = getPlanActivatedCopy(locale);
      return {
        to: params.email,
        subject: copy.subject(params.plan),
        html: planActivatedHtml(params, locale),
        text: copy.text(params.plan, params.periodEnd),
      };
    }
    case "invoice": {
      const copy = getInvoiceSesCopy(locale);
      return {
        to: params.email,
        subject: copy.subject(params.period),
        html: invoiceHtml(params, locale),
        text: copy.text(params.invoiceId, params.amount, params.period),
      };
    }
    case "payment_failed": {
      const copy = getPaymentFailedCopy(locale);
      return {
        to: params.email,
        subject: copy.subject,
        html: paymentFailedHtml(params, locale),
        text: copy.text(params.appUrl),
      };
    }
    case "cancellation": {
      const copy = getCancellationCopy(locale);
      return {
        to: params.email,
        subject: copy.subject,
        html: cancellationHtml(params, locale),
        text: copy.text(params.accessUntil),
      };
    }
    case "data_export_confirm": {
      const copy = getDataExportConfirmCopy(locale);
      return {
        to: params.email,
        subject: copy.subject,
        html: dataExportConfirmHtml(params, locale),
        text: copy.text(params.name, params.exportedAt, params.appUrl),
      };
    }
    case "account_deleted": {
      const copy = getAccountDeletedCopy(locale);
      return {
        to: params.email,
        subject: copy.subject,
        html: accountDeletedHtml(params, locale),
        text: copy.text(params.summary),
      };
    }
    case "nps_thank_you": {
      const copy = getNpsThankYouCopy(locale);
      return {
        to: params.email,
        subject: copy.subject,
        html: npsThankYouHtml(params, locale),
        text: copy.text(params.name, params.score),
      };
    }
  }
}

// ── HTML helpers ─────────────────────────────────────────────────────────────
function baseHtml(title: string, body: string, locale?: string | null): string {
  const lang = resolveEmailLocale(locale);
  const chrome = getEmailChromeCopy(locale);
  return `<!DOCTYPE html><html lang="${lang}"><head><meta charset="UTF-8">
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
  NELVYON · ${chrome.rightsReserved} ·
  <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "https://nelvyon.com"}/legal"
     style="color:#6366f1;">${chrome.legal}</a>
</div>
</td></tr></table>
</td></tr></table></body></html>`;
}

function welcomeHtml(p: Record<string, string>, locale?: string | null): string {
  const copy = getWelcomeCopy(locale);
  return baseHtml(
    copy.sesSubject,
    `
<h1 style="color:#f4f4f5;font-size:24px;margin:0 0 16px;">${copy.title(p.name)}</h1>
<p style="color:#a1a1aa;font-size:16px;line-height:1.6;margin:0 0 24px;">
  ${copy.sesDashboardBody}
</p>
<a href="${p.appUrl}/dashboard"
   style="display:inline-block;background:#6366f1;color:#fff;padding:14px 28px;
   border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">
  ${copy.sesDashboardCta}
</a>`,
    locale,
  );
}

function emailVerifyHtml(p: Record<string, string>, locale?: string | null): string {
  const copy = getEmailVerifyCopy(locale);
  return baseHtml(
    copy.title(p.name),
    `
<h1 style="color:#f4f4f5;font-size:24px;margin:0 0 16px;">${copy.title(p.name)}</h1>
<p style="color:#a1a1aa;font-size:16px;line-height:1.6;margin:0 0 24px;">
  ${copy.body}
</p>
<a href="${p.verifyUrl}"
   style="display:inline-block;background:#6366f1;color:#fff;padding:14px 28px;
   border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">
  ${copy.cta}
</a>
<p style="color:#71717a;font-size:13px;margin:24px 0 0;line-height:1.5;">
  ${copy.ignoreNote}
</p>`,
    locale,
  );
}

function passwordResetHtml(p: Record<string, string>, locale?: string | null): string {
  const copy = getPasswordResetCopy(locale);
  return baseHtml(
    copy.title,
    `
<h1 style="color:#f4f4f5;font-size:24px;margin:0 0 16px;">${copy.title}, ${p.name}</h1>
<p style="color:#a1a1aa;font-size:16px;line-height:1.6;margin:0 0 24px;">
  ${copy.body(p.name)}
  ${copy.detailHtml}
</p>
<a href="${p.resetUrl}"
   style="display:inline-block;background:#6366f1;color:#fff;padding:14px 28px;
   border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">
  ${copy.cta}
</a>
<p style="color:#71717a;font-size:13px;margin:24px 0 0;line-height:1.5;">
  ${copy.ignoreNote}
</p>`,
    locale,
  );
}

function planActivatedHtml(p: Record<string, string>, locale?: string | null): string {
  const copy = getPlanActivatedCopy(locale);
  const stepPaths = getPlanActivatedStepPaths();
  const planLabel = p.plan.charAt(0).toUpperCase() + p.plan.slice(1);
  const stepsHtml = copy.steps
    .map(
      (s, i) => `
<tr>
  <td style="padding:12px 16px;vertical-align:top;">
    <table cellpadding="0" cellspacing="0"><tr>
      <td style="width:32px;height:32px;background:#6366f1;border-radius:50%;text-align:center;vertical-align:middle;color:#fff;font-weight:700;font-size:13px;padding:0;">${i + 1}</td>
      <td style="padding-left:12px;">
        <a href="${p.appUrl}${stepPaths[i]}" style="color:#f4f4f5;font-weight:600;font-size:14px;text-decoration:none;">${s.title}</a>
        <p style="margin:2px 0 0;color:#71717a;font-size:13px;">${s.desc}</p>
      </td>
    </tr></table>
  </td>
</tr>`,
    )
    .join("");

  return baseHtml(
    copy.pageTitle(planLabel),
    `
<h1 style="color:#f4f4f5;font-size:26px;margin:0 0 8px;">
  ${copy.headline(planLabel)}
</h1>
<p style="color:#a1a1aa;font-size:15px;line-height:1.6;margin:0 0 24px;">
  ${copy.intro}
</p>
<table width="100%" cellpadding="0" cellspacing="0"
  style="border:1px solid #27272a;border-radius:10px;overflow:hidden;margin-bottom:24px;">
  ${stepsHtml}
</table>
<p style="color:#71717a;font-size:13px;margin:0 0 24px;">
  ${copy.renewalPrefix} <strong style="color:#f4f4f5;">${p.periodEnd}</strong>
</p>
<a href="${p.appUrl}/saas/dashboard"
   style="display:inline-block;background:#6366f1;color:#fff;padding:14px 32px;
   border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;letter-spacing:0.3px;">
  ${copy.cta}
</a>
<p style="color:#71717a;font-size:12px;margin:20px 0 0;">
  ${copy.helpPrefix} <a href="mailto:danicaste2004@gmail.com" style="color:#6366f1;">danicaste2004@gmail.com</a>
</p>`,
    locale,
  );
}

function invoiceHtml(p: Record<string, string>, locale?: string | null): string {
  const copy = getInvoiceSesCopy(locale);
  return baseHtml(
    `${copy.title} ${p.period}`,
    `
<h1 style="color:#f4f4f5;font-size:24px;margin:0 0 24px;">${copy.title}</h1>
<table width="100%" cellpadding="0" cellspacing="0"
  style="border:1px solid #27272a;border-radius:8px;overflow:hidden;margin-bottom:24px;">
<tr style="background:#1a1a1a;">
  <td style="padding:12px 16px;color:#71717a;font-size:13px;">${copy.invoiceNumberLabel}</td>
  <td style="padding:12px 16px;color:#f4f4f5;font-size:13px;">${p.invoiceId}</td>
</tr>
<tr>
  <td style="padding:12px 16px;color:#71717a;font-size:13px;">${copy.periodLabel}</td>
  <td style="padding:12px 16px;color:#f4f4f5;font-size:13px;">${p.period}</td>
</tr>
<tr style="background:#1a1a1a;">
  <td style="padding:12px 16px;color:#71717a;font-size:13px;">${copy.planLabel}</td>
  <td style="padding:12px 16px;color:#f4f4f5;font-size:13px;">${p.plan}</td>
</tr>
<tr>
  <td style="padding:12px 16px;color:#71717a;font-size:13px;">${copy.amountLabel}</td>
  <td style="padding:12px 16px;color:#6366f1;font-size:15px;font-weight:700;">${p.amount}</td>
</tr>
</table>
<p style="color:#71717a;font-size:13px;">
  ${copy.paddleNote}
</p>`,
    locale,
  );
}

function paymentFailedHtml(p: Record<string, string>, locale?: string | null): string {
  const copy = getPaymentFailedCopy(locale);
  return baseHtml(
    copy.title,
    `
<h1 style="color:#f4f4f5;font-size:24px;margin:0 0 16px;">
  ${copy.title}
</h1>
<p style="color:#a1a1aa;font-size:16px;line-height:1.6;margin:0 0 24px;">
  ${copy.body}
</p>
<a href="${p.appUrl}/billing"
   style="display:inline-block;background:#ef4444;color:#fff;padding:14px 28px;
   border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">
  ${copy.cta}
</a>`,
    locale,
  );
}

function cancellationHtml(p: Record<string, string>, locale?: string | null): string {
  const copy = getCancellationCopy(locale);
  return baseHtml(
    copy.title,
    `
<h1 style="color:#f4f4f5;font-size:24px;margin:0 0 16px;">
  ${copy.title}
</h1>
<p style="color:#a1a1aa;font-size:16px;line-height:1.6;margin:0 0 8px;">
  ${copy.body}
</p>
<p style="color:#71717a;font-size:14px;margin:0 0 24px;">
  ${copy.accessUntil(p.accessUntil)}
</p>
<a href="${p.appUrl}/pricing"
   style="display:inline-block;background:#6366f1;color:#fff;padding:14px 28px;
   border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">
  ${copy.cta}
</a>`,
    locale,
  );
}

function dataExportConfirmHtml(p: Record<string, string>, locale?: string | null): string {
  const copy = getDataExportConfirmCopy(locale);
  return baseHtml(
    copy.title,
    `
<h1 style="color:#f4f4f5;font-size:24px;margin:0 0 16px;">${copy.title}</h1>
<p style="color:#a1a1aa;font-size:16px;line-height:1.6;margin:0 0 16px;">
  ${copy.body(p.name)}
</p>
<p style="color:#71717a;font-size:14px;margin:0;">
  ${copy.exportedAtLabel} <strong style="color:#f4f4f5;">${p.exportedAt}</strong>
</p>
<p style="color:#71717a;font-size:13px;margin:24px 0 0;line-height:1.5;">
  ${copy.securityNote}
</p>
<p style="margin-top:16px;">
<a href="${p.appUrl}/legal"
   style="color:#6366f1;font-size:13px;">${copy.legalLink}</a>
</p>`,
    locale,
  );
}

function npsThankYouHtml(p: Record<string, string>, locale?: string | null): string {
  const copy = getNpsThankYouCopy(locale);
  return baseHtml(
    copy.title(p.name),
    `
<h1 style="color:#f4f4f5;font-size:24px;margin:0 0 16px;">${copy.title(p.name)}</h1>
<p style="color:#a1a1aa;font-size:16px;line-height:1.6;margin:0 0 16px;">
  ${copy.body(p.score)}
</p>
<p style="color:#71717a;font-size:14px;margin:0 0 24px;line-height:1.5;">
  ${copy.commentNote}
</p>
<a href="${p.appUrl}/saas/dashboard"
   style="display:inline-block;background:#01696F;color:#fff;padding:14px 28px;
   border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">
  ${copy.cta}
</a>`,
    locale,
  );
}

function accountDeletedHtml(p: Record<string, string>, locale?: string | null): string {
  const copy = getAccountDeletedCopy(locale);
  return baseHtml(
    copy.title,
    `
<h1 style="color:#f4f4f5;font-size:24px;margin:0 0 16px;">${copy.title}</h1>
<p style="color:#a1a1aa;font-size:16px;line-height:1.6;margin:0 0 16px;">
  ${copy.greeting(p.name)}
</p>
<p style="color:#a1a1aa;font-size:15px;line-height:1.6;margin:0 0 12px;">
  ${p.summary}
</p>
<p style="color:#71717a;font-size:13px;margin:0;line-height:1.5;">
  ${copy.retentionNote}
</p>`,
    locale,
  );
}
