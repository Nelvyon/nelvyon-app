/**
 * Personalizes a seed template shell/HTML with client data.
 * Uses the real template structure & styles — only replaces content tokens.
 */
import fs from "node:fs";
import path from "node:path";

import { loadShellHtml } from "./seed-shells";
import { selectSeedForPack, type SeedSelectionResult } from "./seed-selector";

export type SeedPersonalizationInput = {
  pack_id: string;
  sector: string;
  business_name: string;
  city?: string;
  value_proposition: string;
  primary_cta: string;
  contact_email?: string;
  /** Brand colors — injected as CSS variables, never rewrite layout */
  primary_color?: string;
  accent_color?: string;
  logo_url?: string;
  hero_image?: string;
  /** SaaS-specific */
  icp_title?: string;
  sales_motion?: string;
  pricing_model?: string;
  varietyKey?: string;
};

export type SeedPersonalizationResult = {
  html: string;
  selection: SeedSelectionResult;
  tokens_applied: string[];
};

const SECTOR_LABELS: Record<string, string> = {
  restaurant: "Restaurante",
  dental: "Clínica dental",
  saas_b2b: "SaaS B2B",
  ecommerce: "Ecommerce",
  fitness: "Fitness",
  beauty: "Belleza",
};

function repoSeedsRoot(): string {
  const fromWeb = path.join(process.cwd(), "../../templates/seeds");
  if (fs.existsSync(fromWeb)) return fromWeb;
  return path.join(process.cwd(), "../../../templates/seeds");
}

function findHtmlInAssets(assetsDir: string): string | null {
  const candidates = ["index.html", "home.html", "landing.html", "main.html"];
  for (const name of candidates) {
    const p = path.join(assetsDir, name);
    if (fs.existsSync(p)) return fs.readFileSync(p, "utf8");
  }
  // Search one level deep (common Envato structure)
  if (!fs.existsSync(assetsDir)) return null;
  for (const entry of fs.readdirSync(assetsDir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      for (const name of candidates) {
        const p = path.join(assetsDir, entry.name, name);
        if (fs.existsSync(p)) return fs.readFileSync(p, "utf8");
      }
    }
  }
  return null;
}

function loadSeedHtml(selection: SeedSelectionResult): string {
  const seed = selection.seed;
  if (seed?.storage?.assets_dir) {
    const assetsPath = path.join(
      repoSeedsRoot(),
      selection.provider,
      selection.slug,
      seed.storage.assets_dir.replace(/\/$/, ""),
    );
    const html = findHtmlInAssets(assetsPath);
    if (html) return html;
  }
  return loadShellHtml(selection.shell_id);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildTokenMap(input: SeedPersonalizationInput, selection: SeedSelectionResult): Record<string, string> {
  const sectorLabel = SECTOR_LABELS[input.sector] ?? input.sector;
  return {
    business_name: escapeHtml(input.business_name),
    city: escapeHtml(input.city ?? "España"),
    value_proposition: escapeHtml(input.value_proposition),
    primary_cta: escapeHtml(input.primary_cta),
    contact_email: escapeHtml(input.contact_email ?? `info@${slugify(input.business_name)}.es`),
    primary_color: input.primary_color ?? defaultPrimaryColor(input.sector),
    accent_color: input.accent_color ?? defaultAccentColor(input.sector),
    logo_url: input.logo_url ?? "",
    hero_image:
      input.hero_image ??
      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&q=80",
    sector_label: escapeHtml(sectorLabel),
    icp_title: escapeHtml(input.icp_title ?? "Decision makers B2B"),
    sales_motion: escapeHtml(input.sales_motion ?? "hybrid"),
    pricing_model: escapeHtml(input.pricing_model ?? "subscription"),
    seed_template_name: escapeHtml(selection.catalog_item_name),
    seed_slug: escapeHtml(selection.slug),
    seed_provider: escapeHtml(selection.provider),
  };
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function defaultPrimaryColor(sector: string): string {
  if (sector === "saas_b2b") return "#0284c7";
  if (sector === "ecommerce") return "#7c3aed";
  return "#92400e";
}

function defaultAccentColor(sector: string): string {
  if (sector === "saas_b2b") return "#38bdf8";
  if (sector === "ecommerce") return "#f59e0b";
  return "#fbbf24";
}

function applyTokens(template: string, tokens: Record<string, string>): { html: string; applied: string[] } {
  const applied: string[] = [];
  let html = template;
  for (const [key, value] of Object.entries(tokens)) {
    const pattern = new RegExp(`\\{\\{${key}\\}\\}`, "g");
    if (pattern.test(html)) {
      applied.push(key);
      html = html.replace(pattern, value);
    }
  }
  // Inject logo if placeholder exists
  if (tokens.logo_url && html.includes("{{logo_img}}")) {
    html = html.replace(
      /\{\{logo_img\}\}/g,
      `<img src="${tokens.logo_url}" alt="${tokens.business_name}" style="height:40px" />`,
    );
    applied.push("logo_img");
  }
  return { html, applied };
}

/** Main entry: select seed + personalize HTML for client deliverable. */
export function personalizeSeedLanding(input: SeedPersonalizationInput): SeedPersonalizationResult {
  const selection = selectSeedForPack({
    pack_id: input.pack_id,
    sector: input.sector,
    service: "Landing",
    kind: "landing",
    varietyKey: input.varietyKey,
  });

  const templateHtml = loadSeedHtml(selection);
  const tokens = buildTokenMap(input, selection);
  const { html, applied } = applyTokens(templateHtml, tokens);

  return {
    html,
    selection,
    tokens_applied: applied,
  };
}

export function buildSeedProvenanceMeta(result: SeedPersonalizationResult): Record<string, unknown> {
  return {
    seed_slug: result.selection.slug,
    seed_provider: result.selection.provider,
    seed_template_name: result.selection.catalog_item_name,
    sector_group: result.selection.sector_group,
    shell_id: result.selection.shell_id,
    asset_status: result.selection.asset_status,
    selection_reason: result.selection.selection_reason,
    tokens_applied: result.tokens_applied,
    license: "internal_seed_personalization",
    redistribution: "none",
  };
}
