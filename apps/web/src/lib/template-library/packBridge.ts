/**
 * Bridge from template-library → pack kickoff / elite templates.
 * SaaS packs resolve seeds only via saasServiceTemplates; native compositions via registry.
 */
import { resolvePackTemplateBundle, resolveTemplate } from "./registry";
import {
  getPrimarySaasServiceForPack,
  resolveSaasPackTemplates,
  resolveSaasServiceTemplate,
} from "./saas-service-templates";
import type { TemplateResolveInput } from "./types";

export function getPackLandingTemplateId(input: {
  pack_id: string;
  sector: TemplateResolveInput["sector"];
  language?: TemplateResolveInput["language"];
}): string | null {
  const native =
    resolveTemplate({
      service: "landing",
      kind: "landing",
      sector: input.sector,
      pack_id: input.pack_id,
      language: input.language,
    })?.template.id ?? null;

  const primary = getPrimarySaasServiceForPack(input.pack_id);
  if (primary) {
    resolveSaasServiceTemplate({
      saas_service_id: primary.id,
      sector: input.sector,
      kind: "landing",
    });
  }
  return native;
}

export function getPackTemplateBundleSummary(pack_id: string, sector: TemplateResolveInput["sector"]) {
  const bundle = resolvePackTemplateBundle({ pack_id, sector });
  const saasSeeds = resolveSaasPackTemplates({ pack_id, sector });
  return {
    native: Object.fromEntries(
      Object.entries(bundle).map(([kind, entry]) => [
        kind,
        entry ? { id: entry.id, name: entry.name, composition: entry.composition } : null,
      ]),
    ),
    saas_seeds: saasSeeds,
  };
}
