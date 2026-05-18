import {
  createArtifactZip,
  listZipEntryNames,
  publishArtifactZip,
  type PublishArtifactResult,
} from "./artifactPublisher";
import { escapeHtml, isValidHtmlDocument, parseLooseJson } from "./htmlUtils";
import { eliteLote2CommonVars } from "../agents/lote2PromptUtils";

export type EmailBundleFileMap = Record<string, string>;

export interface EmailItem {
  subject: string;
  preheader: string;
  body: string;
  cta: string;
  segmentHint?: string;
}

function padEmailIndex(n: number): string {
  return String(n).padStart(2, "0");
}

function buildResponsiveEmailHtml(
  email: EmailItem,
  brand: string,
  primary: string,
  accent: string,
): string {
  const bodyParagraphs = email.body
    .split(/\n{2,}|\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#334155;">${escapeHtml(p)}</p>`)
    .join("");

  return `<!DOCTYPE html>
<html lang="es" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${escapeHtml(email.subject)}</title>
  <!--[if mso]><style type="text/css">table { border-collapse: collapse; }</style><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${escapeHtml(email.preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f1f5f9;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:8px;overflow:hidden;">
          <tr>
            <td style="background-color:${primary};padding:24px 32px;text-align:center;">
              <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;font-family:Arial,sans-serif;">${escapeHtml(brand)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              ${bodyParagraphs || `<p style="margin:0;font-size:16px;color:#334155;">${escapeHtml(email.body)}</p>`}
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px auto 0;">
                <tr>
                  <td align="center" style="border-radius:6px;background-color:${accent};">
                    <a href="#" style="display:inline-block;padding:14px 28px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;font-family:Arial,sans-serif;">${escapeHtml(email.cta)}</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px;background-color:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
              <p style="margin:0;font-size:12px;color:#64748b;line-height:1.5;">${escapeHtml(brand)} · Generado por NELVYON OS</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function normalizeEmails(raw: unknown): EmailItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item, idx) => {
      const o = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
      return {
        subject: String(o.subject ?? `Email ${idx + 1}`),
        preheader: String(o.preheader ?? ""),
        body: String(o.body ?? ""),
        cta: String(o.cta ?? "Saber más"),
        segmentHint: typeof o.segmentHint === "string" ? o.segmentHint : undefined,
      };
    })
    .filter((e) => e.subject.trim().length > 0);
}

export function buildEmailBundleFiles(executionJson: string, payload: Record<string, unknown>): EmailBundleFileMap {
  const vars = eliteLote2CommonVars(payload as Parameters<typeof eliteLote2CommonVars>[0]);
  const brand = vars.CLIENT_NAME || "NELVYON";
  const primary = vars.PRIMARY_COLOR?.startsWith("#") ? vars.PRIMARY_COLOR : "#0f172a";
  const accent = vars.SECONDARY_COLOR?.startsWith("#") ? vars.SECONDARY_COLOR : "#7c3aed";

  const parsed = parseLooseJson<Record<string, unknown>>(executionJson, {});
  let emails = normalizeEmails(parsed.emails);

  if (emails.length === 0) {
    emails = Array.from({ length: 3 }, (_, i) => ({
      subject: `${brand} — Mensaje ${i + 1}`,
      preheader: "Actualización importante para ti",
      body: "Contenido de campaña generado por NELVYON OS. Personaliza este cuerpo con tu propuesta de valor.",
      cta: "Ver detalles",
    }));
  }

  const files: EmailBundleFileMap = {
    "README.txt": `Campaña de email — ${brand}\n${emails.length} plantillas HTML listas para importar en tu ESP.\n`,
  };

  emails.forEach((email, idx) => {
    const fileName = `emails/email-${padEmailIndex(idx + 1)}.html`;
    files[fileName] = buildResponsiveEmailHtml(email, brand, primary, accent);
  });

  return files;
}

export function runEmailCodegen(executionJson: string, payload: Record<string, unknown>): string {
  const files = buildEmailBundleFiles(executionJson, payload);
  const htmlFiles = Object.keys(files).filter((k) => k.endsWith(".html"));
  for (const key of htmlFiles) {
    if (!isValidHtmlDocument(files[key]!)) {
      throw new Error(`emailBundleBuilder: invalid HTML in ${key}`);
    }
  }
  return JSON.stringify({ emails: htmlFiles, count: htmlFiles.length });
}

export async function publishEmailBundleZip(options: {
  clientId: string;
  tenantId: string;
  jobId: string;
  serviceId: string;
  files: EmailBundleFileMap;
}): Promise<PublishArtifactResult> {
  return publishArtifactZip({
    kind: "email-bundle",
    ...options,
  });
}

export { createArtifactZip as createEmailBundleZip, listZipEntryNames };
