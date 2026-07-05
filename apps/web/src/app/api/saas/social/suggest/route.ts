export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { type NextRequest, NextResponse } from "next/server";
import {
  buildDeliverableSocialProofPost,
  getSaasSocialProofService,
  isOpenAiEnvConfigured,
  requireSaasContext,
  saasErrorBody,
  saasErrorStatus,
} from "@nelvyon/saas";

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

    if (!isOpenAiEnvConfigured()) {
      return NextResponse.json(
        {
          error: "OpenAI no configurado. Configura OPENAI_API_KEY para generar borradores sociales.",
          code: "missing_openai",
        },
        { status: 503 },
      );
    }

    const openaiKey = process.env.OPENAI_API_KEY!.trim();
    const platform = body.platform?.trim() || "linkedin";
    const oaRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "Genera un borrador de post para redes sociales en español. Responde JSON: {\"content\":\"...\",\"hashtags\":[\"...\"]}",
          },
          { role: "user", content: `Plataforma: ${platform}. Tema: ${topic}` },
        ],
        max_tokens: 800,
        temperature: 0.7,
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!oaRes.ok) {
      return NextResponse.json(
        { error: "No se pudo generar el borrador social.", code: "openai_failed" },
        { status: 503 },
      );
    }
    const oaData = (await oaRes.json()) as { choices?: { message?: { content?: string } }[] };
    const raw = oaData.choices?.[0]?.message?.content ?? "";
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
