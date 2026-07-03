export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getSaasApprovalCardsService } from "@nelvyon/saas";

/** POST /api/webhooks/slack/interactions — Slack Block Kit button callbacks */
export async function POST(req: Request) {
  const rawBody = await req.text();
  const timestamp = req.headers.get("x-slack-request-timestamp") ?? "";
  const signature = req.headers.get("x-slack-signature") ?? "";
  const svc = getSaasApprovalCardsService();

  if (!svc.verifySlackSignature(rawBody, timestamp, signature)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  const params = new URLSearchParams(rawBody);
  const payloadRaw = params.get("payload");
  if (!payloadRaw) return NextResponse.json({ ok: true });

  try {
    const payload = JSON.parse(payloadRaw) as {
      type?: string;
      actions?: Array<{ action_id?: string; value?: string }>;
      response_url?: string;
    };
    if (payload.type === "block_actions" && payload.response_url) {
      await fetch(payload.response_url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          replace_original: true,
          text: "✅ Acción registrada. Revisa el portal Nelvyon para confirmar.",
        }),
      }).catch(() => {});
    }
  } catch {
    /* ignore parse errors */
  }

  return NextResponse.json({ ok: true });
}
