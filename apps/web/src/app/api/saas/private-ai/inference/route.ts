export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import {
  getSaasPrivateAiService,
  requireSaasContext,
  saasErrorBody,
  saasErrorStatus,
} from "@nelvyon/saas";

type InferenceBody = {
  mode?: "route" | "execute";
  query?: string;
  agentId?: string;
  clientId?: string | null;
  domain?: string;
  hints?: Record<string, unknown>;
  systemPrompt?: string;
};

/** Certified Model Router — route or execute via SaaS tenant context. */
export async function POST(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "workflows.execute");
    const body = (await req.json()) as InferenceBody;
    const query = String(body.query ?? "").trim();
    if (!query) {
      return NextResponse.json({ error: "query required" }, { status: 400 });
    }

    const mode = body.mode === "route" ? "route" : "execute";
    const svc = getSaasPrivateAiService();
    const taskInput = {
      query,
      agentId: body.agentId,
      clientId: body.clientId,
      domain: body.domain as never,
      hints: body.hints as never,
      systemPrompt: body.systemPrompt,
    };

    if (mode === "route") {
      const decision = svc.routeInference(ctx.tenant.id, taskInput);
      return NextResponse.json({ mode: "route", decision });
    }

    const result = await svc.executeInference({
      tenantId: ctx.tenant.id,
      userId: ctx.claims.userId,
      ...taskInput,
    });

    return NextResponse.json({ mode: "execute", result });
  } catch (e: unknown) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
