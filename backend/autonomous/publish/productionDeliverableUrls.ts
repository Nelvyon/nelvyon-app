/** Production deliverable URLs — never mock:// in AUTONOMOUS_PRODUCTION. */

import type { AutonomousSku, OsDeliverableDraft } from "../types";

export function isAutonomousProductionPublish(): boolean {
  return process.env.AUTONOMOUS_PRODUCTION === "true";
}

export function resolveAutonomousAppOrigin(): string {
  const raw =
    process.env.FRONTEND_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.VERCEL_URL?.trim();
  if (!raw) return "https://app.nelvyon.com";
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw.replace(/\/$/, "");
  return `https://${raw.replace(/\/$/, "")}`;
}

export function productionArtifactUrl(
  projectSlug: string,
  artifact: string,
  origin = resolveAutonomousAppOrigin(),
): string {
  const safe = projectSlug.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 64);
  return `${origin}/api/os/autonomous/artifacts/${safe}/${artifact}`;
}

export function productionSeoReportUrl(domain: string, origin = resolveAutonomousAppOrigin()): string {
  const host = domain.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return `${origin}/api/os/autonomous/seo-report/${encodeURIComponent(host)}`;
}

export function sanitizePublishValue(
  value: string,
  fallback: string,
): string {
  if (!value || value.includes("mock://")) return fallback;
  return value;
}

export function defaultProductionDeliverables(
  sku: AutonomousSku,
  artifacts: Record<string, unknown>,
  brief: Record<string, unknown>,
  projectSlug: string,
): OsDeliverableDraft[] {
  const origin = resolveAutonomousAppOrigin();
  const domain = String(brief.primary_domain ?? brief.website_url ?? "client.nelvyon.com").replace(
    /\/$/,
    "",
  );

  switch (sku) {
    case "NELVYON-LANDING": {
      const build = artifacts.build as { staging_url?: string } | undefined;
      const landingUrl = sanitizePublishValue(
        build?.staging_url ?? "",
        productionArtifactUrl(projectSlug, "landing.html", origin),
      );
      return [
        { type: "url", label: "Landing staging/live", value: landingUrl, visibility: "client" },
        {
          type: "json",
          label: "Copy map",
          value: productionArtifactUrl(projectSlug, "copy.json", origin),
          visibility: "client",
        },
        {
          type: "file",
          label: "Handoff 1-pager",
          value: productionArtifactUrl(projectSlug, "handoff.md", origin),
          visibility: "client",
        },
      ];
    }
    case "NELVYON-CHATBOT": {
      const config = artifacts.config as { widget_snippet?: string; bot_id?: string } | undefined;
      const botId = config?.bot_id ?? "bot";
      return [
        {
          type: "json",
          label: "Widget snippet",
          value: config?.widget_snippet ?? "",
          visibility: "client",
        },
        {
          type: "json",
          label: "Bot config",
          value: productionArtifactUrl(projectSlug, `bots/${botId}.json`, origin),
          visibility: "client",
        },
        {
          type: "json",
          label: "Knowledge base",
          value: productionArtifactUrl(projectSlug, "kb.json", origin),
          visibility: "client",
        },
      ];
    }
    case "NELVYON-SEO": {
      const report = artifacts.report as { pdf_url?: string } | undefined;
      const pdfUrl = sanitizePublishValue(
        report?.pdf_url ?? "",
        productionSeoReportUrl(domain, origin),
      );
      return [
        { type: "file", label: "SEO Report PDF", value: pdfUrl, visibility: "client" },
        {
          type: "json",
          label: "Issues CSV",
          value: productionArtifactUrl(projectSlug, "issues.csv", origin),
          visibility: "client",
        },
        {
          type: "json",
          label: "Keyword map",
          value: productionArtifactUrl(projectSlug, "keyword-map.json", origin),
          visibility: "client",
        },
        {
          type: "file",
          label: "Plan 90d",
          value: productionArtifactUrl(projectSlug, "plan-90d.md", origin),
          visibility: "client",
        },
      ];
    }
    default:
      return [];
  }
}
