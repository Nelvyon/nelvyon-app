import { NextRequest, NextResponse } from "next/server";

import {
  type ChatStage,
  detectSectorHeuristic,
  getSector,
  parseClientTarget,
  pickPlan,
  PLANS,
  SECTOR_PROFILES,
} from "@/lib/nelvyon-site-chat";

export const runtime = "nodejs";

type HistoryItem = { role: "user" | "assistant"; content: string };
type Body = {
  message?: string;
  history?: HistoryItem[];
  stage?: ChatStage;
  sectorId?: string;
};

async function classifySectorWithAI(text: string): Promise<string> {
  const key = process.env.OPENAI_API_KEY || process.env.APP_AI_KEY;
  if (!key) return detectSectorHeuristic(text);
  const labels = SECTOR_PROFILES.map((s) => s.id).join(", ");
  try {
    const res = await fetch(
      (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "") +
        "/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || "gpt-4o",
          temperature: 0.2,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content: `Clasifica el negocio del usuario en UN id de esta lista: ${labels}. Responde JSON {"sector_id":"..."}.`,
            },
            { role: "user", content: text.slice(0, 1500) },
          ],
        }),
      },
    );
    if (!res.ok) return detectSectorHeuristic(text);
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const raw = data.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw) as { sector_id?: string };
    const id = parsed.sector_id || detectSectorHeuristic(text);
    return SECTOR_PROFILES.some((s) => s.id === id) ? id : detectSectorHeuristic(text);
  } catch {
    return detectSectorHeuristic(text);
  }
}

function buildReply(
  stage: ChatStage,
  sectorId: string,
  userMessage: string,
  lang: "es" | "en",
): { reply: string; nextStage: ChatStage; sectorId: string } {
  const sector = getSector(sectorId);
  const en = lang === "en";

  if (stage === "detect_sector") {
    const cases = sector.cases.slice(0, 2).join(en ? " " : " ");
    return {
      sectorId,
      nextStage: "qualify",
      reply: en
        ? `Got it — you're in **${sector.label}**. Real results: ${cases}\n\n${sector.qualify}`
        : `Perfecto, encajas en **${sector.label}**. Resultados reales:\n• ${sector.cases[0]}\n• ${sector.cases[1]}\n\n${sector.qualify}`,
    };
  }

  if (stage === "qualify") {
    const n = parseClientTarget(userMessage);
    const planKey = pickPlan(n);
    const plan = PLANS[planKey];
    return {
      sectorId,
      nextStage: "cta",
      reply: en
        ? `For **${n} new clients/month** in ${sector.label}, I recommend **${plan.name} (${plan.price})**: ${plan.includes}. Tailored: ${sector.planHint}.\n\n**Start your 14-day free trial →** https://nelvyon.com/register`
        : `Para **${n} clientes nuevos/mes** en ${sector.label}, te encaja **${plan.name} (${plan.price})**: ${plan.includes}. En tu caso: ${sector.planHint}.\n\n**Empieza tu prueba gratuita de 14 días →** https://nelvyon.com/register`,
    };
  }

  return {
    sectorId,
    nextStage: "cta",
    reply: en
      ? `NELVYON runs marketing 24/7 with AI agents. **Start your 14-day free trial →** https://nelvyon.com/register`
      : `NELVYON ejecuta tu marketing 24/7 con agentes IA. **Empieza tu prueba gratuita de 14 días →** https://nelvyon.com/register`,
  };
}

function detectLang(text: string): "es" | "en" {
  const en = /\b(the|hello|price|need|clients|business|marketing)\b/i.test(text);
  const es = /\b(hola|precio|clientes|negocio|marketing|necesito)\b/i.test(text);
  if (en && !es) return "en";
  return "es";
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Body;
    const message = (body.message || "").trim();
    if (!message) {
      return NextResponse.json({ error: "message required" }, { status: 400 });
    }

    const history = Array.isArray(body.history) ? body.history : [];
    const userTurns = history.filter((h) => h.role === "user").length;
    let stage: ChatStage = body.stage || (userTurns === 0 ? "detect_sector" : userTurns === 1 ? "qualify" : "cta");
    let sectorId = body.sectorId || "";

    if (stage === "detect_sector" || !sectorId) {
      sectorId = await classifySectorWithAI(message);
      stage = "detect_sector";
    }

    const lang = detectLang(message + " " + history.map((h) => h.content).join(" "));
    const { reply, nextStage } = buildReply(stage, sectorId, message, lang);

    if (/eres ia|are you ai|bot\?/i.test(message)) {
      const aiNote =
        lang === "en"
          ? "I'm NELVYON's assistant — here to help you win more clients."
          : "Soy el asistente de NELVYON, aquí para ayudarte a conseguir más clientes.";
      return NextResponse.json({
        reply: `${aiNote}\n\n${reply}`,
        stage: nextStage,
        sectorId,
      });
    }

    return NextResponse.json({ reply, stage: nextStage, sectorId });
  } catch (e) {
    console.error("nelvyon-site chat", e);
    return NextResponse.json(
      {
        reply:
          "NELVYON multiplica clientes con SEO, ads y automatización IA. **Empieza tu prueba gratuita de 14 días →** https://nelvyon.com/register",
        stage: "cta",
        sectorId: "otro",
      },
      { status: 200 },
    );
  }
}
