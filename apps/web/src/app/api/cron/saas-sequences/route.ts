export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import {
  getSaasSequencesService,
  getSaasSmsService,
  getSaasWhatsAppCloudService,
} from "@nelvyon/saas";

function assertCron(req: Request): NextResponse | null {
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET ?? "";
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function POST(req: Request) {
  const denied = assertCron(req);
  if (denied) return denied;

  const processed = await getSaasSequencesService().processDueEnrollments({
    sendEmail: async (to, subject, html) => {
      if (!process.env.SES_FROM_EMAIL || !process.env.SES_ACCESS_KEY_ID) return;
      const { getSesClient } = await import("../../../../../../backend/email/sesClient");
      const { SendEmailCommand } = await import("@aws-sdk/client-ses");
      const from = process.env.SES_FROM_EMAIL;
      await getSesClient().send(
        new SendEmailCommand({
          Source: `NELVYON <${from}>`,
          Destination: { ToAddresses: [to] },
          Message: {
            Subject: { Data: subject || "Secuencia Nelvyon", Charset: "UTF-8" },
            Body: { Html: { Data: html || "<p></p>", Charset: "UTF-8" } },
          },
        }),
      );
    },
    sendSms: async (tenantId, phone, body) => {
      await getSaasSmsService().send(tenantId, phone, body);
    },
    sendWhatsApp: async (tenantId, phone, body) => {
      const wa = getSaasWhatsAppCloudService();
      await wa.send(tenantId, { to: phone, body });
    },
  });

  return NextResponse.json({ ok: true, processed });
}
