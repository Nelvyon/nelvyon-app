export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { SendEmailCommand } from "@aws-sdk/client-ses";
import { getSaasCeoBriefService } from "@nelvyon/saas";
import { getSesClient } from "../../../../../../../backend/email/sesClient";
import { verifyCronBearer } from "@/lib/cronAuth";

/** POST /api/cron/saas-ceo-brief — daily CEO morning brief per tenant */
export async function POST(req: Request) {
  const denied = verifyCronBearer(req.headers.get("authorization"));
  if (denied) return denied;

  const hourUtc = new Date().getUTCHours();
  const svc = getSaasCeoBriefService();
  const tenantIds = await svc.listTenantsForBrief(hourUtc);
  const results: Array<{ tenantId: string; delivered: string[] }> = [];

  for (const tenantId of tenantIds) {
    try {
      const brief = await svc.composeBrief(tenantId);
      const delivered: string[] = [];

      const fromEmail = process.env.SES_FROM_EMAIL;
      if (fromEmail && process.env.SES_ACCESS_KEY_ID) {
        try {
          await getSesClient().send(
            new SendEmailCommand({
              Source: `NELVYON <${fromEmail}>`,
              Destination: { ToAddresses: [process.env.CEO_BRIEF_EMAIL ?? fromEmail] },
              Message: {
                Subject: { Data: `Brief CEO Nelvyon — ${new Date().toLocaleDateString("es-ES")}`, Charset: "UTF-8" },
                Body: {
                  Text: { Data: brief.summaryText, Charset: "UTF-8" },
                },
              },
            }),
          );
          delivered.push("email");
        } catch {
          /* SES optional */
        }
      }

      delivered.push("stored");
      await svc.recordRun(tenantId, brief, delivered);
      results.push({ tenantId, delivered });
    } catch (e) {
      console.error("[cron/saas-ceo-brief]", tenantId, e);
    }
  }

  return NextResponse.json({ ok: true, processed: results.length, results });
}
