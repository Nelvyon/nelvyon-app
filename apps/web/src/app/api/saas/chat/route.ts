import { NextResponse } from "next/server";

import { requireSaasContext, saasErrorBody, saasErrorStatus } from "@nelvyon/saas";
import {
  nelvyonTextErrorStatus,
  runNelvyonTextTask,
} from "../../../../../../../backend/saas/NelvyonAiTextService";
import { saasChatService } from "../../../../../../../backend/saas/SaasChatService";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const limitRaw = new URL(req.url).searchParams.get("limit");
    const limit = Math.min(Math.max(Number(limitRaw ?? 50) || 50, 1), 100);
    const messages = await saasChatService.getHistory(ctx.claims.userId, ctx.tenant.id, limit);
    return NextResponse.json({
      messages,
      // Contrato neutral: el chat corre sobre la IA propia de NELVYON y no
      // depende de ninguna clave de terceros.
      ai_provider: "nelvyon-local",
      ai_available: true,
      company: ctx.tenant.companyName ?? null,
    });
  } catch (e: unknown) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const body = (await req.json()) as { messages?: ChatMessage[] };

    if (!Array.isArray(body.messages) || body.messages.length === 0) {
      return NextResponse.json({ error: "messages array required" }, { status: 400 });
    }

    const systemPrompt = `Eres el asistente de marketing IA de Nelvyon para la empresa "${ctx.tenant.companyName ?? "tu empresa"}".
Tienes acceso a todos los módulos: CRM, Email Marketing, SMS, WhatsApp, Redes Sociales, Publicidad, SEO, Workflows, Formularios, Agenda y 193 agentes especializados.
Responde siempre en español. Sé conciso, práctico y accionable. Si el usuario pregunta cómo hacer algo en Nelvyon, explica exactamente dónde ir y qué pasos seguir.
Plan actual del cliente: ${ctx.tenant.plan ?? "starter"}.`;

    /**
     * IA propia de NELVYON. Antes esta ruta hacía `fetch` a `api.openai.com` y
     * devolvía "Configura OPENAI_API_KEY" cuando faltaba la clave, dejando el
     * chat inservible y generando coste por tokens de un tercero. Ahora va por
     * `LocalModelRouter`, con `tenantId` obligatorio del contexto autenticado.
     * Sin fallback externo: si la IA local no está, se dice claramente.
     */
    const conversation = body.messages
      .slice(-20)
      .map((m) => `${m.role === "assistant" ? "Asistente" : "Usuario"}: ${m.content}`)
      .join("\n");

    const ai = await runNelvyonTextTask({
      tenantId: String(ctx.tenant.id),
      system: systemPrompt,
      prompt: conversation,
      agentId: "saas-chat",
    });

    if (!ai.ok) {
      return NextResponse.json(
        { error: ai.message, code: ai.code },
        { status: nelvyonTextErrorStatus(ai.code) },
      );
    }
    const reply = ai.content;

    const lastUserMessage = [...body.messages].reverse().find((m) => m.role === "user")?.content ?? "";
    await saasChatService.saveExchange(ctx.claims.userId, ctx.tenant.id, lastUserMessage, reply).catch((err: unknown) => {
      console.error("[saas/chat] failed to persist exchange", err);
    });

    return NextResponse.json({ reply, mock: false });
  } catch (e: unknown) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

export async function DELETE(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const deleted = await saasChatService.clearHistory(ctx.claims.userId, ctx.tenant.id);
    return NextResponse.json({ deleted });
  } catch (e: unknown) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
