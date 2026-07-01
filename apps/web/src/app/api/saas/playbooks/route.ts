export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import {
  requireSaasContext,
  saasErrorBody,
  saasErrorStatus,
  getSaasPlaybooksService,
  SaasPlaybooksError,
} from "@nelvyon/saas";
import type { DealStage } from "@nelvyon/saas";

export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "deals.read");
    const url = new URL(req.url);
    const stage = url.searchParams.get("stage") as DealStage | null;
    const id = url.searchParams.get("id");
    const svc = getSaasPlaybooksService();

    if (url.searchParams.get("resource") === "forecast") {
      const forecast = await svc.getForecast(ctx.tenant.id);
      return NextResponse.json({ forecast });
    }

    if (url.searchParams.get("resource") === "forecast-by-rep") {
      const byRep = await svc.getForecastByRep(ctx.tenant.id);
      return NextResponse.json({ byRep });
    }

    if (url.searchParams.get("resource") === "forecast-scenarios") {
      const scenarios = await svc.getForecastScenarios(ctx.tenant.id);
      return NextResponse.json({ scenarios });
    }

    if (url.searchParams.get("resource") === "probabilities") {
      const probs = await svc.getStageProbabilities(ctx.tenant.id);
      return NextResponse.json({ probabilities: probs });
    }

    if (id) {
      const pb = await svc.get(ctx.tenant.id, id);
      return NextResponse.json({ playbook: pb });
    }

    const playbooks = await svc.list(ctx.tenant.id, stage ?? undefined);
    return NextResponse.json({ playbooks });
  } catch (e: unknown) {
    if (e instanceof SaasPlaybooksError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: e.code === "NOT_FOUND" ? 404 : 400 });
    }
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "deals.write");
    const body = await req.json() as Record<string, unknown>;
    const action = String(body.action ?? "");
    const svc = getSaasPlaybooksService();

    if (action === "upsert-probability") {
      await svc.upsertStageProbability(ctx.tenant.id, String(body.stage) as DealStage, Number(body.probability));
      return NextResponse.json({ ok: true });
    }

    if (action === "update") {
      const pb = await svc.update(ctx.tenant.id, String(body.id ?? ""), {
        name: body.name ? String(body.name) : undefined,
        description: body.description ? String(body.description) : undefined,
        active: body.active !== undefined ? Boolean(body.active) : undefined,
      });
      return NextResponse.json({ playbook: pb });
    }

    if (action === "delete") {
      await svc.delete(ctx.tenant.id, String(body.id ?? ""));
      return NextResponse.json({ ok: true });
    }

    const pb = await svc.create(ctx.tenant.id, body as unknown as Parameters<typeof svc.create>[1]);
    return NextResponse.json({ playbook: pb }, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof SaasPlaybooksError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: e.code === "NOT_FOUND" ? 404 : 400 });
    }
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
