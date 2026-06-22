import { NextResponse } from "next/server";

import { requireSaasContext, saasErrorBody, saasErrorStatus } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type CopyType =
  | "email_subject"
  | "email_body"
  | "sms_message"
  | "social_post"
  | "ad_copy"
  | "landing_headline"
  | "cta_button"
  | "blog_intro";

interface GenerateCopyRequest {
  type: CopyType;
  context: string;
  tone?: "formal" | "casual" | "urgente" | "inspirador";
  language?: "es" | "en";
  variations?: number;
}

const PROMPTS: Record<CopyType, string> = {
  email_subject: "Genera asuntos de email de marketing que maximicen la tasa de apertura. Crea varios asuntos cortos (máx 60 chars), con gancho emocional o curiosidad. Sin emojis en exceso.",
  email_body: "Genera el cuerpo de un email de marketing profesional en HTML básico. Incluye saludo personalizado, cuerpo con beneficios claros, CTA y cierre. Usa {{nombre}} para personalización.",
  sms_message: "Genera mensajes SMS de marketing. Máximo 160 caracteres. Directo, con CTA claro y urgencia. Incluye link placeholder [URL].",
  social_post: "Genera publicaciones para redes sociales. Incluye texto atractivo, emojis relevantes, y hashtags al final. Optimizado para engagement.",
  ad_copy: "Genera textos para anuncios de publicidad digital (Google/Meta). Titular de impacto + descripción con beneficios + CTA. Máximo 90 chars por línea.",
  landing_headline: "Genera titulares principales para landing pages. Propuesta de valor clara, orientada a beneficios, máximo 10 palabras.",
  cta_button: "Genera textos cortos para botones de llamada a la acción. Verbo de acción + beneficio. Máximo 5 palabras.",
  blog_intro: "Genera introducciones de blog posts que enganchen al lector. Primeras 3-4 frases que planteen el problema y prometan la solución.",
};

export async function POST(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const body = (await req.json()) as GenerateCopyRequest;

    if (!body.type || !body.context?.trim()) {
      return NextResponse.json({ error: "type y context son obligatorios" }, { status: 400 });
    }

    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      return NextResponse.json({ error: "OPENAI_API_KEY no configurada" }, { status: 503 });
    }

    const variations = Math.min(body.variations ?? 3, 5);
    const tone = body.tone ?? "casual";
    const toneMap = { formal: "formal y profesional", casual: "cercano y conversacional", urgente: "urgente y directo", inspirador: "motivador e inspirador" };

    const systemPrompt = `${PROMPTS[body.type]}

Tono: ${toneMap[tone]}.
Empresa: ${ctx.tenant.companyName ?? "la empresa del usuario"}.
Idioma: ${body.language === "en" ? "inglés" : "español"}.
Genera exactamente ${variations} variaciones numeradas (1., 2., 3...) separadas por líneas en blanco.`;

    const oaRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${openaiKey}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: body.context.trim() },
        ],
        max_tokens: 800,
        temperature: 0.8,
      }),
      signal: AbortSignal.timeout(20_000),
    });

    if (!oaRes.ok) {
      const err = (await oaRes.json().catch(() => ({}))) as { error?: { message?: string } };
      throw new Error(err.error?.message ?? `OpenAI ${oaRes.status}`);
    }

    const data = (await oaRes.json()) as { choices?: { message?: { content?: string } }[] };
    const raw = data.choices?.[0]?.message?.content ?? "";

    // Parse numbered variations
    const lines = raw.split(/\n\s*\n/).filter(Boolean);
    const copies = lines.map(l => l.replace(/^\d+\.\s*/, "").trim()).filter(Boolean);

    return NextResponse.json({ copies, raw });
  } catch (e: unknown) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
