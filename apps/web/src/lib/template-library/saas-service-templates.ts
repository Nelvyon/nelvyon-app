/**
 * SaaS-facing template resolution namespace.
 * Packs and client UI must ONLY call functions from this module (not OS).
 */
import { matchSeedForLayer } from "./seed-download-catalog";
import { getSaasService, SAAS_SERVICES, type SaasServiceDef } from "./service-layers";
import type { SeedCatalogEntry } from "./seed-download-catalog";

export type SaasTemplateMatch = {
  saas_service_id: string;
  saas_service_label: string;
  sector: string;
  kind: string;
  layer: "saas" | "both";
  seed: SeedCatalogEntry;
};

export function listSaasServices(): SaasServiceDef[] {
  return SAAS_SERVICES;
}

export function resolveSaasServiceTemplate(input: {
  saas_service_id: string;
  sector: string;
  kind: string;
}): SaasTemplateMatch | null {
  const svc = getSaasService(input.saas_service_id);
  if (!svc) return null;
  if (!svc.kinds.includes(input.kind as SaasServiceDef["kinds"][number])) return null;
  const seed = matchSeedForLayer("saas", input.sector, input.saas_service_id, input.kind);
  const layer = svc.dual_os_id ? ("both" as const) : ("saas" as const);
  return {
    saas_service_id: svc.id,
    saas_service_label: svc.label,
    sector: input.sector,
    kind: input.kind,
    layer,
    seed,
  };
}

export function resolveSaasPackTemplates(input: {
  pack_id: string;
  sector: string;
}): Record<string, SaasTemplateMatch | null> {
  const services = SAAS_SERVICES.filter((s) => s.pack_id === input.pack_id);
  const out: Record<string, SaasTemplateMatch | null> = {};
  for (const svc of services) {
    for (const kind of svc.kinds) {
      const key = `${svc.id}:${kind}`;
      out[key] = resolveSaasServiceTemplate({
        saas_service_id: svc.id,
        sector: input.sector,
        kind,
      });
    }
  }
  return out;
}

/** Primary pack service for a growth pack (first pack-type service). */
export function getPrimarySaasServiceForPack(pack_id: string): SaasServiceDef | undefined {
  return SAAS_SERVICES.find((s) => s.pack_id === pack_id && s.origin === "pack");
}
