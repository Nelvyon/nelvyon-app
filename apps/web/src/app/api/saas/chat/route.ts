import { NextResponse } from "next/server";

import { requireSaasContext, saasErrorBody, saasErrorStatus } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export async function POST(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const body = (await req.json()) as { messages?: ChatMessage[] };

    if (!Array.isArray(body.messages) || body.messages.length === 0) {
      return NextResponse.json({ error: "messages array required" }, { status: 400 });
    }

    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      return NextResponse.json({
        reply: "El asistente IA requiere OPENAI_API_KEY. Añádela en Railway para activarlo.",
      });
    }

    const systemPrompt = `Eres el asistente de marketing IA de Nelvyon para la empresa "${ctx.tenant.companyName ?? "tu empresa"}".
Tienes acceso a todos los módulos: CRM, Email Marketing, SMS, WhatsApp, Redes Sociales, Publicidad, SEO, Workflows, Formularios, Agenda y 193 agentes especializados.
Responde siempre en español. Sé conciso, práctico y accionable. Si el usuario pregunta cómo hacer algo en Nelvyon, explica exactamente dónde ir y qué pasos seguir.
Plan actual del cliente: ${ctx.tenant.plan ?? "starter"}.`;

    const messages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...body.messages.slice(-20),
    ];

    const oaRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${openaiKey}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
        max_tokens: 1000,
        temperature: 0.7,
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!oaRes.ok) {
      const err = (await oaRes.json().catch(() => ({}))) as { error?: { message?: string } };
      throw new Error(err.error?.message ?? `OpenAI ${oaRes.status}`);
    }

    const data = (await oaRes.json()) as { choices?: { message?: { content?: string } }[] };
    const reply = data.choices?.[0]?.message?.content ?? "No pude generar una respuesta.";

    return NextResponse.json({ reply });
  } catch (e: unknown) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
