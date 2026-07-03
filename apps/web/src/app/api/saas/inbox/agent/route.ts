import { NextResponse } from "next/server";

import {
  getSaasInboxAgentService,
  requireSaasContext,
  SaasInboxAgentError,
  saasErrorBody,
  saasErrorStatus,
} from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET/PATCH — Nelvyon inbox AI agent settings */
export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const settings = await getSaasInboxAgentService().getSettings(ctx.tenant.id);
    return NextResponse.json({ settings });
  } catch (e: unknown) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

export async function PATCH(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "settings.write");
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const settings = await getSaasInboxAgentService().updateSettings(ctx.tenant.id, {
      enabled: typeof body.enabled === "boolean" ? body.enabled : undefined,
      autoReplyEnabled: typeof body.autoReplyEnabled === "boolean" ? body.autoReplyEnabled : undefined,
      autoReplyMinConfidence:
        typeof body.autoReplyMinConfidence === "number" ? body.autoReplyMinConfidence : undefined,
      systemPrompt: typeof body.systemPrompt === "string" ? body.systemPrompt : body.systemPrompt === null ? null : undefined,
      escalateKeywords: Array.isArray(body.escalateKeywords) ? body.escalateKeywords.map(String) : undefined,
      activeSkillIds: Array.isArray(body.activeSkillIds) ? body.activeSkillIds.map(String) : undefined,
      speakResponses: typeof body.speakResponses === "boolean" ? body.speakResponses : undefined,
    });
    return NextResponse.json({ settings });
  } catch (e: unknown) {
    if (e instanceof SaasInboxAgentError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: 400 });
    }
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
