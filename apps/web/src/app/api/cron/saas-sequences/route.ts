export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import {
  getSaasSequencesService,
  getSaasSmsService,
  getSaasWhatsAppCloudService,
} from "@nelvyon/saas";
import { verifyCronBearer } from "@/lib/cronAuth";
import { runWithCronDeadline } from "../../../../../../../backend/http/cronDeadline";

export async function POST(req: Request) {
  const denied = verifyCronBearer(req.headers.get("authorization"));
  if (denied) return denied;

  try {
    const processed = await runWithCronDeadline("saas-sequences", () =>
      getSaasSequencesService().processDueEnrollments({
        sendEmail: async (to, subject, html) => {
          if (!process.env.SES_FROM_EMAIL || !process.env.SES_ACCESS_KEY_ID) {
            throw new Error("SES not configured");
          }
          const { getSesClient } = await import("../../../../../../../backend/email/sesClient");
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
      }),
    );

    return NextResponse.json({ ok: true, processed });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Cron failed";
    console.error("[cron/saas-sequences]", e);
    return NextResponse.json({ ok: false, error: msg }, { status: 504 });
  }
}
