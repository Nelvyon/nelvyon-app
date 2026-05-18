/**
 * AI Helper — centralised wrapper around the aihub/gentxt endpoint.
 * Every SaaS page that needs AI calls this instead of duplicating fetch logic.
 */
import { getAPIBaseURL } from "./config";

export interface AIRequest {
  prompt: string;
  /** System instruction that shapes the AI persona / output format */
  system?: string;
  /** Maximum tokens (default 1024) */
  maxTokens?: number;
}

export interface AIResponse {
  text: string;
  ok: boolean;
  error?: string;
}

/**
 * Call the platform AI (aihub/gentxt) with retry and timeout.
 */
export async function callAI(req: AIRequest): Promise<AIResponse> {
  const baseUrl = getAPIBaseURL();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const response = await fetch(`${baseUrl}/api/v1/aihub/gentxt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: req.prompt,
        system: req.system ?? "Eres un asistente experto de la plataforma NELVYON SaaS. Responde en el idioma del prompt.",
        max_tokens: req.maxTokens ?? 1024,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return { text: "", ok: false, error: `HTTP ${response.status}` };
    }

    const data = await response.json();
    const text = data?.text || data?.result || data?.content || data?.choices?.[0]?.message?.content || JSON.stringify(data);
    return { text, ok: true };
  } catch (err: unknown) {
    clearTimeout(timeout);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { text: "", ok: false, error: msg };
  }
}

/**
 * Convenience: generate marketing copy
 */
export function aiMarketingCopy(product: string, audience: string, lang = "es") {
  return callAI({
    prompt: `Genera 3 variantes de copy publicitario para "${product}" dirigido a "${audience}". Idioma: ${lang}. Formato JSON array: [{"headline":"...","body":"...","cta":"..."}]`,
    system: "Eres un copywriter experto en marketing digital. Responde SOLO con JSON válido.",
  });
}

/**
 * Convenience: generate campaign strategy
 */
export function aiCampaignStrategy(campaignName: string, budget: number, platforms: string, lang = "es") {
  return callAI({
    prompt: `Diseña una estrategia para la campaña "${campaignName}" con presupuesto ${budget}€ en plataformas: ${platforms}. Idioma: ${lang}. Incluye: objetivos, segmentación, calendario, KPIs esperados. Formato JSON: {"objectives":[],"targeting":"...","calendar":"...","kpis":[]}`,
    system: "Eres un estratega de marketing digital senior. Responde SOLO con JSON válido.",
  });
}

/**
 * Convenience: generate funnel optimization suggestions
 */
export function aiFunnelOptimize(funnelData: string, lang = "es") {
  return callAI({
    prompt: `Analiza este funnel de ventas y sugiere optimizaciones: ${funnelData}. Idioma: ${lang}. Formato JSON: {"analysis":"...","suggestions":[],"expected_improvement":"..."}`,
    system: "Eres un experto en optimización de funnels de conversión. Responde SOLO con JSON válido.",
  });
}

/**
 * Convenience: generate report summary
 */
export function aiReportSummary(metrics: string, lang = "es") {
  return callAI({
    prompt: `Resume estas métricas de negocio en un informe ejecutivo: ${metrics}. Idioma: ${lang}. Formato JSON: {"summary":"...","highlights":[],"recommendations":[],"risk_areas":[]}`,
    system: "Eres un analista de datos senior. Responde SOLO con JSON válido.",
  });
}

/**
 * Convenience: generate social media content
 */
export function aiSocialContent(topic: string, platforms: string[], lang = "es") {
  return callAI({
    prompt: `Genera contenido para redes sociales sobre "${topic}" para: ${platforms.join(", ")}. Idioma: ${lang}. Formato JSON array: [{"platform":"...","content":"...","hashtags":[],"best_time":"..."}]`,
    system: "Eres un community manager experto. Responde SOLO con JSON válido.",
  });
}

/**
 * Convenience: generate workflow suggestions
 */
export function aiWorkflowSuggestions(processDescription: string, lang = "es") {
  return callAI({
    prompt: `Sugiere automatizaciones para este proceso: "${processDescription}". Idioma: ${lang}. Formato JSON: {"automations":[],"estimated_time_saved":"...","priority_order":[]}`,
    system: "Eres un experto en automatización de procesos empresariales. Responde SOLO con JSON válido.",
  });
}

/**
 * Convenience: generate helpdesk response suggestion
 */
export function aiHelpdeskResponse(ticketSubject: string, ticketDescription: string, lang = "es") {
  return callAI({
    prompt: `Sugiere una respuesta profesional para este ticket de soporte. Asunto: "${ticketSubject}". Descripción: "${ticketDescription}". Idioma: ${lang}. Formato JSON: {"suggested_response":"...","category":"...","priority_suggestion":"...","knowledge_base_articles":[]}`,
    system: "Eres un agente de soporte técnico experto y empático. Responde SOLO con JSON válido.",
  });
}

/**
 * Convenience: generate analytics insights
 */
export function aiAnalyticsInsights(data: string, lang = "es") {
  return callAI({
    prompt: `Analiza estos datos y genera insights accionables: ${data}. Idioma: ${lang}. Formato JSON: {"insights":[],"trends":[],"anomalies":[],"action_items":[]}`,
    system: "Eres un analista de datos con experiencia en business intelligence. Responde SOLO con JSON válido.",
  });
}

/**
 * Convenience: generate website SEO suggestions
 */
export function aiWebsiteSEO(url: string, description: string, lang = "es") {
  return callAI({
    prompt: `Genera sugerencias SEO para un sitio web: "${description}" (${url}). Idioma: ${lang}. Formato JSON: {"title_tag":"...","meta_description":"...","keywords":[],"content_suggestions":[],"technical_fixes":[]}`,
    system: "Eres un especialista SEO senior. Responde SOLO con JSON válido.",
  });
}

/**
 * Convenience: score and qualify a sales lead
 */
export function aiLeadScoring(leadInfo: string, lang = "es") {
  return callAI({
    prompt: `Evalúa y puntúa este lead de ventas: ${leadInfo}. Idioma: ${lang}. Formato JSON: {"score":0-100,"qualification":"hot|warm|cold","reasoning":"...","next_steps":[],"estimated_value":"..."}`,
    system: "Eres un experto en ventas B2B y lead scoring. Responde SOLO con JSON válido.",
  });
}

/**
 * Convenience: generate pricing recommendation
 */
export function aiPricingRecommendation(context: string, lang = "es") {
  return callAI({
    prompt: `Basándote en este contexto, recomienda una estrategia de precios: ${context}. Idioma: ${lang}. Formato JSON: {"recommended_tiers":[],"reasoning":"...","competitive_analysis":"...","upsell_opportunities":[]}`,
    system: "Eres un experto en estrategia de precios SaaS. Responde SOLO con JSON válido.",
  });
}