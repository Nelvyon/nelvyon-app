/**
 * Aceternity bundles already in repo — seed → native block mapping.
 * Never serve extracted ZIP HTML to clients.
 */
export type AceternitySeedManifest = {
  seed_id: string;
  bundle_folder: string;
  license_id: string;
  status: "ported_partial" | "pending" | "converted";
  nelvyon_components: string[];
  nelvyon_blocks: string[];
  target_landings: string[];
};

export const ACETERNITY_SEED_MANIFEST: AceternitySeedManifest[] = [
  {
    seed_id: "aceternity-foxtrot",
    bundle_folder: "manuarora700-foxtrot-aceternity-ceff465c7268dcef02ccfd6a574dacf35aa209ff",
    license_id: "lic-aceternity-ui-pro-2026",
    status: "pending",
    nelvyon_components: [],
    nelvyon_blocks: ["hero:center-gradient", "testimonials:cards-3", "faq:accordion"],
    target_landings: ["landing-saas-demo-v1", "landing-agency-audit-v1"],
  },
  {
    seed_id: "aceternity-proactiv",
    bundle_folder: "manuarora700-proactiv-aceternity-c0e9dc32fd207e736e4ceb6c030fd88ac8489d02",
    license_id: "lic-aceternity-ui-pro-2026",
    status: "pending",
    nelvyon_components: [],
    nelvyon_blocks: ["hero_3d:aceternity-glow", "stats_3d:metrics-row", "cta:banner-rounded"],
    target_landings: ["landing-saas-trial-v1"],
  },
  {
    seed_id: "aceternity-simplistic-saas",
    bundle_folder: "manuarora700-simplistic-saas-template-369dd51e05e7cecf551eb2e90bfa8150c75ab8f1",
    license_id: "lic-aceternity-ui-pro-2026",
    status: "ported_partial",
    nelvyon_components: [
      "apps/web/src/components/nelvyon-enterprise",
      "apps/web/src/components/nelvyon-site/NelvyonEnterpriseHomePage.tsx",
      "apps/web/src/core/shell/AppShell.tsx",
      "apps/web/src/styles/nelvyon-enterprise.css",
    ],
    nelvyon_blocks: ["pricing:three-tier", "features:icon-grid", "logos:trust-bar", "hero:product-frame-preview"],
    target_landings: ["nelvyon-platform-ui"],
  },
  {
    seed_id: "aceternity-productized-agency",
    bundle_folder: "productized-agency/manuarora700-productized-agency-template-aceternity-48d418fa2899b09137d9456a5cc63b014bb98879",
    license_id: "lic-aceternity-ui-pro-2026",
    status: "ported_partial",
    nelvyon_components: [
      "apps/web/src/components/pa/hero",
      "apps/web/src/components/pa/pricing",
      "apps/web/src/components/pa/blogs",
      "apps/web/src/components/pa/acebuilder",
    ],
    nelvyon_blocks: ["hero_3d:aceternity-glow", "pricing:three-tier", "testimonials:cards-3"],
    target_landings: ["landing-agency-audit-v1"],
  },
];
