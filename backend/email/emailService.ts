import { SendEmailCommand } from "@aws-sdk/client-ses";

import { getSesClient } from "./sesClient";
import { buildEmail, type EmailTemplate } from "./templates";

const FROM = process.env.SES_FROM_EMAIL ?? "no-reply@nelvyon.com";

export async function sendEmail(template: EmailTemplate, params: Record<string, string>): Promise<void> {
  const email = buildEmail(template, params);
  const client = getSesClient();
  await client.send(
    new SendEmailCommand({
      Source: `NELVYON <${FROM}>`,
      Destination: { ToAddresses: [email.to] },
      Message: {
        Subject: { Data: email.subject, Charset: "UTF-8" },
        Body: {
          Html: { Data: email.html, Charset: "UTF-8" },
          Text: { Data: email.text, Charset: "UTF-8" },
        },
      },
    }),
  );
}
