import { SendEmailCommand } from "@aws-sdk/client-ses";

import { getSesClient } from "./sesClient";

const FROM = process.env.SES_FROM_EMAIL ?? "no-reply@nelvyon.com";
const FROM_NAME = process.env.SES_FROM_NAME?.trim() || "NELVYON";

export type RawEmailPayload = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export type RawEmailResult = {
  messageId: string;
  dryRun: boolean;
};

export function isSesConfigured(): boolean {
  const accessKeyId = process.env.SES_ACCESS_KEY_ID ?? process.env.AWS_SES_ACCESS_KEY;
  const secretAccessKey = process.env.SES_SECRET_ACCESS_KEY ?? process.env.AWS_SES_SECRET_KEY;
  const from = process.env.SES_FROM_EMAIL?.trim();
  return Boolean(accessKeyId?.trim() && secretAccessKey?.trim() && from);
}

export function allowSaasEmailDryRun(): boolean {
  return process.env.NODE_ENV === "test" || process.env.SAAS_EMAIL_DRY_RUN === "1";
}

export async function sendRawEmail(payload: RawEmailPayload): Promise<RawEmailResult> {
  const to = payload.to.trim();
  if (!to) {
    throw new Error("Email recipient is required");
  }

  if (!isSesConfigured()) {
    if (allowSaasEmailDryRun()) {
      return { messageId: "dry-run", dryRun: true };
    }
    throw new Error(
      "SES no configurado: define SES_ACCESS_KEY_ID, SES_SECRET_ACCESS_KEY y SES_FROM_EMAIL",
    );
  }

  const client = getSesClient();
  const text = payload.text ?? payload.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const out = await client.send(
    new SendEmailCommand({
      Source: `${FROM_NAME} <${FROM}>`,
      Destination: { ToAddresses: [to] },
      Message: {
        Subject: { Data: payload.subject, Charset: "UTF-8" },
        Body: {
          Html: { Data: payload.html, Charset: "UTF-8" },
          Text: { Data: text, Charset: "UTF-8" },
        },
      },
    }),
  );

  return { messageId: out.MessageId ?? "sent", dryRun: false };
}
