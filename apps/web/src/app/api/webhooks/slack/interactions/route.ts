export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getSaasApprovalCardsService } from "@nelvyon/saas";

/** Donde Slack recibe de verdad las respuestas a una interaccion. */
const URL_DE_SLACK = /^https:\/\/hooks\.slack\.com\//;

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
    // La firma dice que el mensaje no ha sido alterado en transito. NO dice que
    // su contenido sea inofensivo: `response_url` es una URL que llega DENTRO
    // del cuerpo y contra la que se hace un POST desde dentro de la
    // infraestructura de NELVYON. Sin anclar, sirve para alcanzar la metadata de
    // la instancia o cualquier servicio interno que no esta expuesto.
    //
    // Se ancla al host que Slack usa de verdad. La barra final es la parte que
    // importa: sin ella pasarian `hooks.slack.com.atacante.test` y
    // `hooks.slack.com@atacante.test`.
    if (
      payload.type === "block_actions" &&
      payload.response_url &&
      URL_DE_SLACK.test(payload.response_url)
    ) {
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
