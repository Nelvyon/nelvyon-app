import { escapeHtml } from "../os-agents/artifacts/htmlUtils";
import { sendRawEmail } from "../email/sendRawEmail";

export type CampaniaEmailContact = {
  id: string;
  email: string | null;
  name: string;
};

export function personalizeCampaniaBody(template: string, contact: CampaniaEmailContact): string {
  return template
    .replace(/\{\{\s*name\s*\}\}/gi, contact.name)
    .replace(/\{\{\s*email\s*\}\}/gi, contact.email ?? "");
}

export function buildCampaniaEmailHtml(params: {
  body: string;
  ctaText?: string | null;
  ctaUrl?: string | null;
}): string {
  const bodyHtml = escapeHtml(params.body).replace(/\n/g, "<br>");
  const cta =
    params.ctaText && params.ctaUrl
      ? `<p style="margin-top:24px"><a href="${escapeHtml(params.ctaUrl)}" style="display:inline-block;padding:12px 20px;background:#0066FF;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">${escapeHtml(params.ctaText)}</a></p>`
      : "";
  return `<div style="font-family:system-ui,sans-serif;line-height:1.6;color:#111">${bodyHtml}${cta}</div>`;
}

export async function sendCampaniaEmailToContact(params: {
  contact: CampaniaEmailContact;
  subject: string;
  body: string;
  ctaText?: string | null;
  ctaUrl?: string | null;
}): Promise<{ ok: true } | { ok: false; reason: "missing_email" | "send_failed"; error?: string }> {
  const email = params.contact.email?.trim();
  if (!email) {
    return { ok: false, reason: "missing_email" };
  }
  const personalized = personalizeCampaniaBody(params.body, params.contact);
  try {
    await sendRawEmail({
      to: email,
      subject: params.subject,
      html: buildCampaniaEmailHtml({
        body: personalized,
        ctaText: params.ctaText,
        ctaUrl: params.ctaUrl,
      }),
      text: personalized,
    });
    return { ok: true };
  } catch (e: unknown) {
    return {
      ok: false,
      reason: "send_failed",
      error: e instanceof Error ? e.message : "send failed",
    };
  }
}
