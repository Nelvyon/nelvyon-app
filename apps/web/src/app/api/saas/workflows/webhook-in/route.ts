/**
 * Incoming webhook endpoint — triggers workflow with trigger_type=webhook_in.
 * Authenticated with JWT (requireSaasContext). Accepts any JSON payload.
 * Source name comes from query param ?source= for discriminating between multiple senders.
 * Idempotency: Idempotency-Key / x-idempotency-key (process-local, 15m TTL).
 */
import { NextResponse } from "next/server";
import {
  requireSaasContext,
  requestIdFrom,
  saasErrorBody,
  saasErrorStatus,
} from "@nelvyon/saas";
import { dispatchWebhookIn } from "../../../../../../../../backend/saas/saasWorkflowDispatch";
import { DbClient } from "../../../../../../../../backend/db/DbClient";
import {
  claimWebhookInIdempotency,
  releaseWebhookInIdempotency,
  reclamarEntregaPersistente,
  soltarEntregaPersistente,
} from "../../../../../../../../backend/saas/webhookInIdempotency";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "workflows.execute");
    const requestId = requestIdFrom(req);
    const { searchParams } = new URL(req.url);
    const source = searchParams.get("source") ?? "default";

    const payload = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const idem =
      req.headers.get("idempotency-key")?.trim() ||
      req.headers.get("x-idempotency-key")?.trim() ||
      (typeof payload.idempotencyKey === "string" ? payload.idempotencyKey.trim() : "");

    if (idem) {
      // La memoria del proceso primero: es gratis y corta el caso mas comun,
      // que es el reintento inmediato contra la misma instancia.
      const prior = claimWebhookInIdempotency(ctx.tenant.id, source, idem);
      if (prior) {
        return NextResponse.json({
          ok: true,
          source,
          duplicate: true,
          received: prior,
          ...(requestId ? { requestId } : {}),
        });
      }

      // Y DESPUES PostgreSQL, que es la que vale de verdad.
      //
      // El `Map` de arriba solo deduplica dentro de un proceso. Con dos
      // instancias -o una que se reinicia entre dos entregas- el proveedor
      // reintenta contra el balanceador y la segunda entrega entra como si
      // fuera nueva: `dispatchWebhookIn` vuelve a lanzar los workflows del
      // inquilino, con sus correos y sus llamadas a integraciones.
      //
      // `reclamarEntregaPersistente` resuelve la carrera en la base con un
      // `INSERT ... ON CONFLICT DO NOTHING`, que es donde se puede resolver.
      const primeraVez = await reclamarEntregaPersistente(
        DbClient.getInstance(),
        ctx.tenant.id,
        source,
        idem,
      );
      if (!primeraVez) {
        return NextResponse.json({
          ok: true,
          source,
          duplicate: true,
          ...(requestId ? { requestId } : {}),
        });
      }
    }

    try {
      await dispatchWebhookIn(ctx.tenant.id, source, payload);
    } catch (err) {
      if (idem) {
        // Se sueltan LAS DOS reclamaciones: si solo se soltara la de memoria,
        // el reintento del proveedor chocaria con la fila persistente y el
        // evento se perderia en silencio, que es peor que procesarlo dos veces.
        releaseWebhookInIdempotency(ctx.tenant.id, source, idem);
        await soltarEntregaPersistente(DbClient.getInstance(), ctx.tenant.id, source, idem)
          .catch((e) => {
            // No se traga: se registra. Una reclamacion huerfana hace que el
            // reintento se descarte, asi que tiene que verse.
            console.error("[webhook-in] no se pudo soltar la reclamacion", e);
          });
      }
      throw err;
    }

    return NextResponse.json({
      ok: true,
      source,
      duplicate: false,
      received: new Date().toISOString(),
      ...(requestId ? { requestId } : {}),
    });
  } catch (e: unknown) {
    return NextResponse.json(saasErrorBody(e, { requestId: requestIdFrom(req) }), {
      status: saasErrorStatus(e),
    });
  }
}
