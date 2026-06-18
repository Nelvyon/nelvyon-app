/**
 * Official internal base seed for Nelvyon platform UI (marketing + authenticated app).
 * Ported from Aceternity Simplistic SaaS — never serve seed ZIP/HTML to clients.
 */
export const NELVYON_PLATFORM_UI_SEED = {
  seed_id: "aceternity-simplistic-saas",
  catalog_id: "ace-simplistic-saas-template",
  item_name: "Simplistic SaaS Template",
  provider: "Aceternity" as const,
  quality_score: 95,
  bundle_path: "templates/seeds/aceternity/simplistic-saas-template",
  license_id: "lic-aceternity-ui-pro-2026",
  /** Blocks ported from this seed into Nelvyon product UI */
  ported_blocks: [
    "hero:gradient-badge-cta",
    "hero:product-frame-preview",
    "features:icon-grid-glass",
    "pricing:three-tier-highlight",
    "auth:split-panel-card",
    "dashboard:sidebar-navy-glass",
    "typography:display-tight-tracking",
    "motion:badge-hover-stagger",
  ] as const,
  /** Routes that consume this seed */
  surfaces: ["/", "/login", "/register", "/dashboard"] as const,
  /** Native React implementation — no seed assets served */
  nelvyon_implementation: {
    css: "apps/web/src/styles/nelvyon-enterprise.css",
    components: "apps/web/src/components/nelvyon-enterprise",
    marketing: "apps/web/src/components/nelvyon-site",
    shell: "apps/web/src/core/shell/AppShell.tsx",
  },
} as const;

export type NelvyonPlatformUiSeed = typeof NELVYON_PLATFORM_UI_SEED;
