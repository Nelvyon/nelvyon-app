import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { requireSaasContext, saasErrorBody, saasErrorStatus } from "@nelvyon/saas";
import { comprobarPuertaDeGasto } from "../../../../../../../../backend/gasto/puertaDeGastoEnRuta";

import { createLogger } from "@/lib/serverLogger";
import { OsAgentError } from "@nelvyon/os-agents";

import { MetaAdsExecutor } from "../../../../../../../../backend/integrations/meta/MetaAdsExecutor";

export const dynamic = 'force-dynamic';
export const runtime = "nodejs";

const logger = createLogger("meta_ads");

interface LaunchBody {
  adAccountId?: string;
  pageId?: string;
  campaignName?: string;
  dailyBudgetEuros?: number;
  primaryText?: string;
  headline?: string;
  websiteUrl?: string;
  countries?: string[];
  ageMin?: number;
  ageMax?: number;
  optimizationGoal?: string;
  ctaType?: string;
}

function validateBody(body: LaunchBody): string | null {
  if (!body.adAccountId?.trim()) return "adAccountId is required";
  if (!body.pageId?.trim()) return "pageId is required";
  if (!body.campaignName?.trim()) return "campaignName is required";
  if (!body.primaryText?.trim()) return "primaryText is required";
  if (!body.headline?.trim()) return "headline is required";
  if (!body.websiteUrl?.trim()) return "websiteUrl is required";
  if (typeof body.dailyBudgetEuros !== "number" || body.dailyBudgetEuros <= 0) {
    return "dailyBudgetEuros must be a positive number";
  }
  return null;
}

export async function POST(req: Request) {
  /**
   * PUERTA DE GASTO EXTERNO.
   *
   * Hasta ahora bastaba con tener sesión para crear una campaña con
   * presupuesto real. Ahora hacen falta tres cosas más, y las tres existen
   * porque esta ruta la va a llamar un agente:
   *
   *   - Contexto SaaS en vez de sólo sesión: hace falta el `workspace_id` para
   *     poder atribuir el gasto, y `campanias.launch` es el permiso que ya
   *     existía para esto y que nadie estaba usando.
   *   - Una autorización de gasto aprobada, con presupuesto, tope por
   *     operación y ventana temporal.
   *   - Una clave de idempotencia, para que un reintento de red no lance la
   *     campaña dos veces.
   *
   * Sin autorización devuelve 403 CON EL MOTIVO. Romper en silencio sería peor
   * que no proteger: quien pulse el botón tiene que saber qué le falta.
   */
  let ctx: Awaited<ReturnType<typeof requireSaasContext>>;
  try {
    ctx = await requireSaasContext(req, "campanias.launch");
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
  const userId = ctx.claims.userId;

  let body: LaunchBody;
  try {
    body = (await req.json()) as LaunchBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const validationError = validateBody(body);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const adAccountId = body.adAccountId!.trim();
  const dailyBudgetCents = Math.round(body.dailyBudgetEuros! * 100);

  // El presupuesto diario es lo que se autoriza: es el compromiso de gasto
  // que se adquiere al crear la campaña.
  const puerta = await comprobarPuertaDeGasto({
    tenantId: ctx.tenant.id,
    workspaceId: ctx.tenant.workspaceId,
    serviceId: "ads_premium",
    proveedor: "meta_ads",
    actor: (req.headers.get("x-nelvyon-actor") ?? `user:${userId}`).slice(0, 200),
    operacion: "lanzar_campana_meta",
    importeCents: Math.round(body.dailyBudgetEuros! * 100),
    // La clave la manda quien llama cuando puede repetir la petición
    // (un agente, un reintento). Si no viene, se genera una: la ruta
    // sigue funcionando y la idempotencia protege sólo a quien la usa.
    idempotencyKey: (req.headers.get("idempotency-key") ?? randomUUID()).slice(0, 200),
  });
  if (!puerta.permitido) {
    return NextResponse.json(puerta.cuerpo, { status: puerta.estado });
  }
  if (puerta.yaEjecutado) {
    // Ya se hizo con esta misma clave. Se devuelve lo de entonces en vez
    // de lanzar una segunda campaña idéntica.
    return NextResponse.json(
      { yaEjecutado: true, referencia: puerta.referenciaExterna },
      { status: 200 },
    );
  }
  const solicitud = await puerta.guarda.registrarSolicitud(
    puerta.peticion,
    puerta.autorizacionId,
  );
  if (!solicitud) {
    // Otra petición con la misma clave se adelantó entre la comprobación
    // y el registro. El UNIQUE lo detecta; no se lanza nada.
    return NextResponse.json(
      { error: "Gasto externo denegado", motivo: "clave_en_curso", detalle: "otra peticion con esta clave esta en curso" },
      { status: 409 },
    );
  }
  const campaignName = body.campaignName!.trim();
  const executor = MetaAdsExecutor.instance();

  try {
    const { campaignId } = await executor.createCampaign(userId, adAccountId, {
      name: campaignName,
    });
    const { adSetId } = await executor.createAdSet(userId, adAccountId, {
      name: `${campaignName} — Ad set`,
      campaignId,
      dailyBudgetCents,
      optimizationGoal: body.optimizationGoal,
      ageMin: body.ageMin,
      ageMax: body.ageMax,
      countries: body.countries,
    });
    const { creativeId } = await executor.createAdCreative(userId, adAccountId, {
      name: `${campaignName} — Creative`,
      pageId: body.pageId!.trim(),
      primaryText: body.primaryText!.trim(),
      headline: body.headline!.trim(),
      websiteUrl: body.websiteUrl!.trim(),
      ctaType: body.ctaType,
    });
    const { adId } = await executor.createAd(userId, adAccountId, {
      name: `${campaignName} — Ad`,
      adSetId,
      creativeId,
    });

    // El gasto se marca ejecutado SOLO cuando la campaña existe de verdad, y
    // descuenta del presupuesto autorizado en ese momento.
    await puerta.guarda.marcarEjecutado(
      solicitud.gastoId,
      puerta.autorizacionId,
      puerta.peticion.importeCents,
      campaignId,
    );
    logger.info("meta_ads_launch_complete", { userId, adAccountId, campaignId, adSetId, adId });
    return NextResponse.json({ campaignId, adSetId, adId }, { status: 201 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    // Un gasto fallido NO descuenta presupuesto: consumir el dinero de un
    // cliente por algo que no llegó a ocurrir es cobrarle por nada.
    await puerta.guarda.marcarFallido(solicitud.gastoId, message).catch(() => undefined);
    logger.error("meta_ads_launch_failed", { userId, message });
    return NextResponse.json({ error: "Failed to launch Meta Ads campaign" }, { status: 500 });
  }
}
