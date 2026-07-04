export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import {
  getSaasPrivateAiService,
  requireSaasContext,
  saasErrorBody,
  saasErrorStatus,
} from "@nelvyon/saas";

export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const svc = getSaasPrivateAiService();
    const [settings, status] = await Promise.all([
      svc.getSettings(ctx.tenant.id),
      svc.getPlatformStatus(ctx.tenant.id),
    ]);
    return NextResponse.json({ settings, status });
  } catch (e: unknown) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

export async function PATCH(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "settings.write");
    const body = (await req.json()) as {
      aiMode?: string;
      privateAiOnly?: boolean;
      ollamaBaseUrl?: string | null;
      ollamaModel?: string | null;
      openaiModel?: string | null;
      anthropicModel?: string | null;
      defaultAgentId?: string | null;
    };
    const allowed = new Set(["unconfigured", "stub", "mock", "auto", "local", "openai", "anthropic"]);
    if (body.aiMode && !allowed.has(body.aiMode)) {
      return NextResponse.json({ error: "invalid aiMode" }, { status: 400 });
    }
    const aiMode = body.aiMode === "mock" ? "stub" : body.aiMode;
    const svc = getSaasPrivateAiService();
    const settings = await svc.updateSettings(ctx.tenant.id, {
      aiMode: aiMode as never,
      privateAiOnly: body.privateAiOnly,
      ollamaBaseUrl: body.ollamaBaseUrl,
      ollamaModel: body.ollamaModel,
      openaiModel: body.openaiModel,
      anthropicModel: body.anthropicModel,
      defaultAgentId: body.defaultAgentId,
    });
    const status = await svc.getPlatformStatus(ctx.tenant.id);
    return NextResponse.json({ settings, status });
  } catch (e: unknown) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
