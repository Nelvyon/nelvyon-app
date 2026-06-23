import type { SeedLicenseRecord } from "./types";

/**
 * License registry — Envato Elements + Aceternity UI Pro only.
 * Seeds live outside client deliverables; only nelvyon_native compositions ship.
 */
export const SEED_LICENSE_REGISTRY: SeedLicenseRecord[] = [
  {
    license_id: "lic-aceternity-ui-pro-2026",
    vendor: "aceternity_ui_pro",
    subscription_ref: "aceternity-ui-pro-all-access",
    redistribution: "none",
    notes:
      "Aceternity UI Pro All-Access. Bundles en templates/seeds/aceternity/. Port a componentes React Nelvyon. No redistribuir ZIP ni marca.",
  },
  {
    license_id: "lic-envato-elements-2026",
    vendor: "envato_elements",
    subscription_ref: "envato-elements",
    redistribution: "none",
    notes:
      "Envato Elements. Seeds en templates/seeds/envato/. Conversión a bloques nativos; nunca servir HTML del item tal cual.",
  },
];

export function getLicense(licenseId: string): SeedLicenseRecord | undefined {
  return SEED_LICENSE_REGISTRY.find((l) => l.license_id === licenseId);
}

export function assertClientDeliverable(source: string, nelvyonOwned: boolean): void {
  if (!nelvyonOwned && source !== "nelvyon_native") {
    throw new Error(
      `Template source "${source}" cannot be delivered to clients. Convert to nelvyon_native first.`,
    );
  }
}
