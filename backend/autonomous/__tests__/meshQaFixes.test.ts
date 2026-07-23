import { describe, expect, it } from "vitest";

import {
  isUsefulFaq,
  normalizeChatbotKnowledgeBase,
  passesHallucinationPriceCheck,
} from "../wrappers/chatbotKbNormalize";
import {
  clampSeoPriorityPages,
  generateSeoPackIsolated,
  normalizeKeywordsArtifact,
  normalizeSeoPlan,
} from "../wrappers/seoGenerator";
import { scoreOffline } from "../qa/offlineScorer";

describe("chatbotKbNormalize", () => {
  const brief = {
    company_name: "QA Local Mesh",
    business_name: "QA Local Mesh",
    city: "Madrid",
    sector: "restaurant",
    website_url: "https://example.test",
    primary_cta: "Reservar mesa",
    bot_name: "Asistente QA",
    compliance_flags: { disclaimer_required: true },
  };

  it("pads FAQs to target and computes gold_set ≥ 0.8", () => {
    const kb = normalizeChatbotKnowledgeBase(
      { version: 1, faqs: [{ id: "1", intent: "hours", question_patterns: ["horario"], canonical_answer: "Abrimos de 10 a 22 cada día laborable." }] },
      brief,
      15,
    );
    expect((kb.faqs as unknown[]).length).toBe(15);
    expect(Number(kb.gold_set_useful_rate)).toBeGreaterThanOrEqual(0.8);
    expect(kb.hallucination_price_check).toBe(true);
    expect(String(kb.disclaimer).length).toBeGreaterThan(10);
  });

  it("flags invented prices when brief has none", () => {
    const faqs = [
      {
        id: "p",
        intent: "pricing",
        question_patterns: ["precio"],
        canonical_answer: "El menú cuesta 45 € por persona siempre.",
        source: "llm",
      },
    ];
    expect(passesHallucinationPriceCheck(brief, faqs)).toBe(false);
    expect(isUsefulFaq(faqs[0]!)).toBe(true);
  });
});

describe("SEO plan/pages sync", () => {
  it("normalizeSeoPlan ignores invented LLM blockers when brief is complete", () => {
    const brief = {
      primary_domain: "https://example.test",
      company_name: "Biz",
      sector: "restaurant",
      primary_cta: "Reservar",
      target_geo: "Madrid",
      landing_slug: "biz-local",
      seed_keywords: ["a", "b", "c", "d", "e"],
      compliance_flags: { no_ranking_guarantee_ack: true },
    };
    const plan = normalizeSeoPlan(
      { pages_target: 7, blockers: ["invented-by-llm", "missing:primary_domain"] },
      brief,
    );
    expect(plan.pages_target).toBe(7);
    expect(plan.blockers).toEqual([]);
  });

  it("normalizeKeywordsArtifact pads thin LLM keyword lists to ≥10", () => {
    const brief = {
      primary_domain: "https://example.test",
      company_name: "Biz",
      seed_keywords: ["uno", "dos", "tres", "cuatro", "cinco"],
    };
    const normalized = normalizeKeywordsArtifact({ keywords: [{ keyword: "solo" }, { keyword: "dos" }, { keyword: "tres" }] }, brief);
    expect((normalized.keywords as unknown[]).length).toBeGreaterThanOrEqual(10);
  });

  it("clampSeoPriorityPages forces exact pages_target", () => {
    const clamped = clampSeoPriorityPages(
      { priority_pages: [{ url: "/", primary_keyword: "a", reason: "x" }] },
      5,
      { seed_keywords: ["k1", "k2", "k3", "k4", "k5"], company_name: "Biz" },
    );
    expect((clamped.priority_pages as unknown[]).length).toBe(5);
  });

  it("generateSeoPackIsolated matches plan pages_target", () => {
    const brief = {
      primary_domain: "https://example.test",
      company_name: "Biz",
      seed_keywords: ["seo uno", "seo dos", "seo tres", "seo cuatro", "seo cinco"],
      compliance_flags: { no_ranking_guarantee_ack: true },
    };
    const pack = generateSeoPackIsolated({
      brief,
      pages_target: 5,
      priority_override: { priority_pages: [{ url: "/", primary_keyword: "solo", reason: "bad length" }] },
    });
    expect((pack.on_page_fixes as { pages: unknown[] }).pages.length).toBe(5);
    expect((pack.priority as { priority_pages: unknown[] }).priority_pages.length).toBe(5);
  });

  it("offline SEO score ≥85 when pack is consistent", () => {
    const brief = {
      primary_domain: "https://example.test",
      company_name: "Biz",
      seed_keywords: ["seo uno", "seo dos", "seo tres", "seo cuatro", "seo cinco"],
      compliance_flags: { no_ranking_guarantee_ack: true },
      openai_cost_bearer: "client",
    };
    const pack = generateSeoPackIsolated({ brief, pages_target: 5 });
    const artifacts = {
      plan: { pages_target: 5, blockers: [], crawl_limit: 50, report_sections_required: 10 },
      priority: pack.priority,
      audit: pack.audit,
      keywords: pack.keywords,
      on_page_fixes: pack.on_page_fixes,
      report: pack.report,
    };
    const qa = scoreOffline("NELVYON-SEO", brief, artifacts, 1);
    expect(qa.score).toBeGreaterThanOrEqual(85);
    expect(qa.passed).toBe(true);
  });
});
