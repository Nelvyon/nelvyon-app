export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { type NextRequest, NextResponse } from "next/server";
import {
  buildDeliverableSocialProofPost,
  getSaasSocialProofService,
  requireSaasContext,
  saasErrorBody,
  saasErrorStatus,
} from "@nelvyon/saas";
import {
  nelvyonTextErrorStatus,
  runNelvyonTextTask,
} from "../../../../../../../../backend/saas/NelvyonAiTextService";

export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const drafts = await getSaasSocialProofService().list(ctx.tenant.id);
    return NextResponse.json({ drafts });
  } catch (e: unknown) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

/** POST — social post draft from topic or deliverable (0€) */
export async function POST(req: NextRequest) {
  try {
    const ctx = await requireSaasContext(req, "contacts.write");
    const body = (await req.json().catch(() => ({}))) as {
      topic?: string;
      platform?: string;
      deliverableId?: string;
      title?: string;
      qaScore?: number;
      packName?: string;
      save?: boolean;
    };

    if (body.deliverableId || body.title) {
      const draft = body.save
        ? await getSaasSocialProofService().createFromDeliverable(ctx.tenant.id, body)
        : buildDeliverableSocialProofPost(body);
      return NextResponse.json({ draft, template: true });
    }

    const topic = body.topic?.trim();
    if (!topic) {
      return NextResponse.json({ error: "topic es obligatorio (o deliverableId/title)" }, { status: 400 });
    }

    const platform = body.platform?.trim() || "linkedin";
    // IA propia de NELVYON con `tenantId` obligatorio. Sin fallback externo.
    const ai = await runNelvyonTextTask({
      tenantId: String(ctx.tenant.id),
      system:
        'Genera un borrador de post para redes sociales en español. Responde JSON: {"content":"...","hashtags":["..."]}',
      prompt: `Plataforma: ${platform}. Tema: ${topic}`,
      agentId: "saas-social-suggest",
      hints: { requireJson: true },
    });
    if (!ai.ok) {
      return NextResponse.json(
        { error: ai.message, code: ai.code },
        { status: nelvyonTextErrorStatus(ai.code) },
      );
    }
    const raw = ai.content;
    let content = raw;
    let hashtags: string[] = [];
    try {
      const parsed = JSON.parse(raw) as { content?: string; hashtags?: string[] };
      content = parsed.content ?? raw;
      hashtags = Array.isArray(parsed.hashtags) ? parsed.hashtags.map(String) : [];
    } catch {
      content = raw.trim() || topic;
    }

    const draft = body.save
      ? await getSaasSocialProofService().createFromGenerated(ctx.tenant.id, { platform, content, hashtags })
      : { platform, content, hashtags };

    return NextResponse.json({ draft });
  } catch (e: unknown) {
    const status = (e as { status?: number }).status === 401 ? 401 : saasErrorStatus(e);
    return NextResponse.json(saasErrorBody(e), { status });
  }
}
