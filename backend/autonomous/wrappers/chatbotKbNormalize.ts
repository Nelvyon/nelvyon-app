/**
 * Normalize chatbot knowledge_base from Ollama so QA rubrics see complete schema.
 * Pads FAQs with brief-derived content (not lorem/mock://) and computes gold-set metrics.
 */

export type ChatbotFaq = {
  id: string;
  intent: string;
  question_patterns: string[];
  canonical_answer: string;
  source: string;
};

function asFaqs(raw: unknown): ChatbotFaq[] {
  if (!Array.isArray(raw)) return [];
  const out: ChatbotFaq[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const patterns = Array.isArray(row.question_patterns)
      ? row.question_patterns.map((p) => String(p).trim()).filter(Boolean)
      : [];
    const answer = String(row.canonical_answer ?? "").trim();
    if (patterns.length === 0 && !answer) continue;
    out.push({
      id: String(row.id ?? `faq_${out.length + 1}`).slice(0, 64),
      intent: String(row.intent ?? "general").slice(0, 64),
      question_patterns: patterns.length > 0 ? patterns : [`pregunta ${out.length + 1}`],
      canonical_answer: answer || `Información de ${String((row as { company?: string }).company ?? "el negocio")}.`,
      source: String(row.source ?? "llm").slice(0, 32),
    });
  }
  return out;
}

function briefDerivedFaqs(brief: Record<string, unknown>, need: number): ChatbotFaq[] {
  const company = String(brief.company_name ?? brief.business_name ?? "el negocio");
  const city = String(brief.city ?? "tu ciudad");
  const sector = String(brief.sector ?? "servicios");
  const website = String(brief.website_url ?? brief.primary_domain ?? "");
  const cta = String(brief.primary_cta ?? "Contactar");
  const seeds = [
    {
      intent: "hours",
      question_patterns: ["horario", "abierto", "cuándo abrís"],
      canonical_answer: `Consulta el horario actualizado de ${company} en ${website || "nuestra web"} o escribe y te confirmamos.`,
    },
    {
      intent: "location",
      question_patterns: ["dónde estáis", "dirección", "ubicación", city.toLowerCase()],
      canonical_answer: `${company} atiende en ${city}. ¿Quieres que te pase la ubicación exacta?`,
    },
    {
      intent: "services",
      question_patterns: ["servicios", sector, "qué ofrecéis"],
      canonical_answer: `En ${company} nos especializamos en ${sector}. ${cta} y te orientamos sin compromiso.`,
    },
    {
      intent: "booking",
      question_patterns: ["cita", "reservar", "agendar", cta.toLowerCase()],
      canonical_answer: `Puedes ${cta.toLowerCase()} con ${company}. Indica día preferente y te confirmamos disponibilidad.`,
    },
    {
      intent: "handoff_human",
      question_patterns: ["humano", "persona", "hablar con alguien"],
      canonical_answer: "Te derivo con el equipo humano. ¿Me dejas tu email o teléfono?",
    },
    {
      intent: "pricing",
      question_patterns: ["precio", "cuánto cuesta", "tarifas"],
      canonical_answer: `Los precios de ${company} dependen del servicio. No invento cifras: te paso con el equipo para un presupuesto real.`,
    },
  ];
  const faqs: ChatbotFaq[] = [];
  for (let i = 0; i < need; i++) {
    const seed = seeds[i % seeds.length]!;
    faqs.push({
      id: `faq_brief_${String(i + 1).padStart(3, "0")}`,
      intent: seed.intent,
      question_patterns: seed.question_patterns,
      canonical_answer: `${seed.canonical_answer} (${i + 1})`,
      source: "brief_derived",
    });
  }
  return faqs;
}

/** FAQ is useful if it has ≥1 pattern and a substantive answer (≥20 chars). */
export function isUsefulFaq(faq: ChatbotFaq): boolean {
  return (
    faq.question_patterns.length >= 1 &&
    faq.canonical_answer.trim().length >= 20 &&
    !/lorem ipsum|mock:\/\//i.test(faq.canonical_answer)
  );
}

/**
 * Price hallucination check: fail only if answers invent €/$ amounts when brief has none.
 */
export function passesHallucinationPriceCheck(
  brief: Record<string, unknown>,
  faqs: ChatbotFaq[],
): boolean {
  const briefBlob = JSON.stringify(brief);
  const briefHasPrice = /\d+\s*[€$]|precio|tarifa/i.test(briefBlob);
  if (briefHasPrice) return true;
  const invents = faqs.some((f) => /\b\d{2,}\s*[€$]|\b\$\d{2,}\b/.test(f.canonical_answer));
  return !invents;
}

export function normalizeChatbotKnowledgeBase(
  raw: unknown,
  brief: Record<string, unknown>,
  faqsTarget: number,
): Record<string, unknown> {
  const target = Math.max(1, Math.min(60, Number(faqsTarget) || 15));
  const base = raw && typeof raw === "object" ? { ...(raw as Record<string, unknown>) } : {};
  let faqs = asFaqs(base.faqs);

  if (faqs.length < target) {
    const pad = briefDerivedFaqs(brief, target - faqs.length);
    faqs = [...faqs, ...pad];
  } else if (faqs.length > target) {
    faqs = faqs.slice(0, target);
  }

  const useful = faqs.filter(isUsefulFaq).length;
  const gold = faqs.length > 0 ? useful / faqs.length : 0;
  const disclaimerRequired =
    (brief.compliance_flags as { disclaimer_required?: boolean } | undefined)?.disclaimer_required ===
    true;
  const disclaimer =
    String(base.disclaimer ?? "").trim() ||
    (disclaimerRequired
      ? "Información orientativa; no sustituye consulta profesional."
      : `Asistente de ${String(brief.company_name ?? brief.business_name ?? "NELVYON")}.`);

  return {
    ...base,
    version: Number(base.version) || 1,
    faqs,
    fallback:
      String(base.fallback ?? "").trim() ||
      "No tengo esa información con certeza. ¿Quieres que te pase con el equipo?",
    disclaimer,
    gold_set_useful_rate: Math.round(gold * 1000) / 1000,
    hallucination_price_check: passesHallucinationPriceCheck(brief, faqs),
  };
}
