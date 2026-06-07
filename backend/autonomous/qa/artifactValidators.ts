/** Structure & completeness validators for Phase C offline QA */

import type { AutonomousSku } from "../types";

export interface ValidationIssue {
  code: string;
  message: string;
  blocking: boolean;
}

export function validateBrief(sku: AutonomousSku, brief: Record<string, unknown>): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const req = (field: string, msg: string) => {
    if (brief[field] === undefined || brief[field] === null || brief[field] === "") {
      issues.push({ code: `BRIEF-${field}`, message: msg, blocking: true });
    }
  };

  if (sku === "NELVYON-LANDING") {
    req("company_name", "company_name required");
    req("sector", "sector required");
    req("value_proposition", "value_proposition required");
    req("primary_cta", "primary_cta required");
    const domain = brief.domain as { host?: string } | undefined;
    if (!domain?.host) issues.push({ code: "BRIEF-domain.host", message: "domain.host required", blocking: true });
  }

  if (sku === "NELVYON-CHATBOT") {
    req("website_url", "website_url required");
    req("bot_name", "bot_name required");
    if (brief.openai_cost_bearer !== "client") {
      issues.push({ code: "BRIEF-openai_cost", message: "openai_cost_bearer must be client", blocking: true });
    }
  }

  if (sku === "NELVYON-SEO") {
    req("primary_domain", "primary_domain required");
    if (!Array.isArray(brief.seed_keywords) || (brief.seed_keywords as unknown[]).length < 5) {
      issues.push({ code: "BRIEF-seed_keywords", message: "min 5 seed_keywords", blocking: true });
    }
    const ack = (brief.compliance_flags as { no_ranking_guarantee_ack?: boolean })?.no_ranking_guarantee_ack;
    if (!ack) issues.push({ code: "BRIEF-ranking_ack", message: "no_ranking_guarantee_ack required", blocking: true });
  }

  return issues;
}

export function validateArtifactStructure(sku: AutonomousSku, artifacts: Record<string, unknown>): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const has = (key: string) => artifacts[key] !== undefined && artifacts[key] !== null;

  if (sku === "NELVYON-LANDING") {
    for (const k of ["plan", "strategy", "copy", "design", "build"]) {
      if (!has(k)) issues.push({ code: `STRUCT-${k}`, message: `missing artifact ${k}`, blocking: true });
    }
    const copy = artifacts.copy as { hero?: { headline?: string } } | undefined;
    if (copy && !copy.hero?.headline) {
      issues.push({ code: "STRUCT-copy-hero", message: "copy.hero.headline missing", blocking: true });
    }
  }

  if (sku === "NELVYON-CHATBOT") {
    for (const k of ["plan", "strategy", "knowledge_base", "config"]) {
      if (!has(k)) issues.push({ code: `STRUCT-${k}`, message: `missing artifact ${k}`, blocking: true });
    }
  }

  if (sku === "NELVYON-SEO") {
    for (const k of ["plan", "priority", "audit", "keywords", "on_page_fixes", "report"]) {
      if (!has(k)) issues.push({ code: `STRUCT-${k}`, message: `missing artifact ${k}`, blocking: true });
    }
  }

  return issues;
}

export function validateConsistency(sku: AutonomousSku, brief: Record<string, unknown>, artifacts: Record<string, unknown>): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (sku === "NELVYON-LANDING") {
    const strategy = artifacts.strategy as { single_cta?: string; template_id?: string } | undefined;
    const copy = artifacts.copy as { hero?: { cta_label?: string } } | undefined;
    const design = artifacts.design as { template_id?: string } | undefined;
    if (strategy?.single_cta && copy?.hero?.cta_label && strategy.single_cta !== copy.hero.cta_label) {
      issues.push({ code: "CONSIST-cta", message: "CTA mismatch strategy vs copy", blocking: false });
    }
    if (strategy?.template_id && design?.template_id && strategy.template_id !== design.template_id) {
      issues.push({ code: "CONSIST-template", message: "template_id mismatch", blocking: true });
    }
    const company = String(brief.company_name ?? "");
    const headline = String(copy?.hero?.headline ?? "");
    if (company && headline && !headline.toLowerCase().includes(company.split(" ")[0]?.toLowerCase() ?? "___")) {
      issues.push({ code: "CONSIST-brand", message: "headline may not reference company", blocking: false });
    }
  }

  if (sku === "NELVYON-CHATBOT") {
    const strategy = artifacts.strategy as { persona?: { name?: string } } | undefined;
    const config = artifacts.config as { bot_id?: string } | undefined;
    const botName = String(brief.bot_name ?? "");
    if (strategy?.persona?.name && strategy.persona.name !== botName) {
      issues.push({ code: "CONSIST-bot-name", message: "persona name != brief.bot_name", blocking: false });
    }
    if (!config?.widget_snippet) {
      issues.push({ code: "CONSIST-snippet", message: "widget snippet missing", blocking: true });
    }
  }

  if (sku === "NELVYON-SEO") {
    const pagesTarget = (artifacts.plan as { pages_target?: number })?.pages_target ?? 5;
    const optimized = (artifacts.on_page_fixes as { pages?: unknown[] })?.pages?.length ?? 0;
    if (optimized !== pagesTarget) {
      issues.push({ code: "CONSIST-pages", message: `on_page pages ${optimized} != target ${pagesTarget}`, blocking: true });
    }
  }

  return issues;
}

export function scoreCopyQuality(sku: AutonomousSku, artifacts: Record<string, unknown>): { points: number; max: number; issues: ValidationIssue[] } {
  const issues: ValidationIssue[] = [];
  let points = 0;
  const max = 20;

  if (sku === "NELVYON-LANDING") {
    const copy = artifacts.copy as {
      hero?: { headline?: string; subheadline?: string };
      faq?: unknown[];
    };
    const headline = copy?.hero?.headline ?? "";
    const words = headline.split(/\s+/).filter(Boolean).length;
    if (words >= 3 && words <= 14) points += 6;
    else issues.push({ code: "COPY-headline-len", message: "headline length suboptimal", blocking: false });
    if ((copy?.hero?.subheadline?.length ?? 0) >= 20) points += 5;
    if ((copy?.faq?.length ?? 0) >= 3) points += 5;
    if (headline.length > 0) points += 4;
  }

  if (sku === "NELVYON-CHATBOT") {
    const kb = artifacts.knowledge_base as { faqs?: unknown[]; fallback?: string; disclaimer?: string };
    if ((kb?.faqs?.length ?? 0) >= 15) points += 10;
    if (kb?.fallback) points += 5;
    if (kb?.disclaimer) points += 5;
  }

  if (sku === "NELVYON-SEO") {
    const pages = (artifacts.on_page_fixes as { pages?: Array<{ title?: string; h1?: string }> })?.pages ?? [];
    if (pages.every((p) => (p.title?.length ?? 0) <= 60)) points += 10;
    if (pages.every((p) => p.h1 && p.title)) points += 10;
  }

  return { points: Math.min(points, max), max, issues };
}

export function scoreSeoBasic(sku: AutonomousSku, artifacts: Record<string, unknown>): { points: number; max: number; issues: ValidationIssue[] } {
  const issues: ValidationIssue[] = [];
  let points = 0;
  const max = 15;

  if (sku === "NELVYON-LANDING") {
    const copy = artifacts.copy as { meta?: { title?: string; description?: string }; seo_patch?: { canonical?: string } };
    if ((copy?.meta?.title?.length ?? 0) > 0 && (copy?.meta?.title?.length ?? 99) <= 60) points += 5;
    if ((copy?.meta?.description?.length ?? 0) > 0 && (copy?.meta?.description?.length ?? 999) <= 155) points += 5;
    if (copy?.seo_patch?.canonical) points += 5;
    else issues.push({ code: "SEO-canonical", message: "canonical missing", blocking: false });
  }

  if (sku === "NELVYON-SEO") {
    const report = artifacts.report as { sections_complete?: number };
    const kw = artifacts.keywords as { keywords?: unknown[] };
    if (report?.sections_complete === 10) points += 8;
    if ((kw?.keywords?.length ?? 0) >= 10) points += 7;
  }

  return { points: Math.min(points, max), max, issues };
}
