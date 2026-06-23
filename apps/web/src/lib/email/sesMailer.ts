import { SendEmailCommand } from "@aws-sdk/client-ses";

import { getSesClient, isSesConfigured, resolveSesRegion } from "@/lib/email/sesClient";

export type SesSendResult = {
  ok: boolean;
  error?: string;
  messageId?: string;
};

export function resolveSesFromAddress(): { email: string; name: string } {
  return {
    email:
      process.env.SES_FROM_EMAIL?.trim() ||
      process.env.EMAIL_FROM?.trim() ||
      "no-reply@nelvyon.com",
    name:
      process.env.SES_FROM_NAME?.trim() ||
      process.env.EMAIL_FROM_NAME?.trim() ||
      "NELVYON",
  };
}

function formatSesError(error: unknown): string {
  if (error && typeof error === "object") {
    const err = error as { name?: string; message?: string; Code?: string; $metadata?: { httpStatusCode?: number } };
    const code = err.name || err.Code || "SESError";
    const status = err.$metadata?.httpStatusCode;
    const msg = err.message || String(error);
    return status ? `SES ${status} ${code}: ${msg}` : `SES ${code}: ${msg}`;
  }
  return `SES error: ${String(error)}`;
}

export function isSesCredentialError(error: string): boolean {
  const lower = error.toLowerCase();
  return (
    lower.includes("credentials missing") ||
    lower.includes("credential") && lower.includes("missing") ||
    lower.includes("could not load credentials") ||
    lower.includes("access key") && lower.includes("missing")
  );
}

export function isSesPermanentFailure(error: string): boolean {
  const lower = error.toLowerCase();
  return (
    lower.includes("messagerejected") ||
    lower.includes("mailfromdomainnotverified") ||
    lower.includes("emailaddressnotverified") ||
    lower.includes("accountsendingpaused") ||
    lower.includes("configuration set") ||
    lower.includes("invalidparameter") ||
    lower.includes(" ses 400 ") ||
    lower.includes(" ses 403 ")
  );
}

export async function sendEmailViaSes(params: {
  toEmail: string;
  toName?: string;
  subject: string;
  bodyText: string;
  bodyHtml: string;
}): Promise<SesSendResult> {
  if (!isSesConfigured()) {
    return { ok: false, error: "SES credentials missing" };
  }

  const from = resolveSesFromAddress();
  const toEmail = params.toEmail.trim();

  try {
    const response = await getSesClient().send(
      new SendEmailCommand({
        Source: `${from.name} <${from.email}>`,
        Destination: { ToAddresses: [toEmail] },
        Message: {
          Subject: { Data: params.subject, Charset: "UTF-8" },
          Body: {
            Text: { Data: params.bodyText, Charset: "UTF-8" },
            Html: { Data: params.bodyHtml, Charset: "UTF-8" },
          },
        },
      }),
    );

    return { ok: true, messageId: response.MessageId };
  } catch (error) {
    return { ok: false, error: formatSesError(error) };
  }
}

export function describeSesConfig(): { region: string; fromEmail: string; configured: boolean } {
  const from = resolveSesFromAddress();
  return {
    region: resolveSesRegion(),
    fromEmail: from.email,
    configured: isSesConfigured(),
  };
}
