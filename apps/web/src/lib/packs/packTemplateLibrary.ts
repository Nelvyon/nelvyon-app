/**
 * Connects SaaS packs → native compositions + internal seed references.
 * Never exposes Envato/Aceternity assets to client deliverables.
 */
import type { TemplateSector } from "@/lib/template-library/types";
import { getOnDiskSeedsForPack } from "@/lib/template-library/ingest/seed-store";
import { resolvePackTemplateBundle } from "@/lib/template-library/registry";
import { resolveSaasPackTemplates } from "@/lib/template-library/saas-service-templates";
import { selectSeedForPack } from "@/lib/template-library/seed-selector";

export type PackLibraryInternalRefs = {
  pack_id: string;
  sector: string;
  native_templates: Record<string, { id: string; name: string } | null>;
  saas_seeds: Record<
    string,
    { item_name: string; provider: string; layer: string; status: string } | null
  >;
  on_disk_seeds: Array<{ item_name: string; provider: string; slug: string }>;
  selected_landing_seed: {
    slug: string;
    item_name: string;
    provider: string;
    sector_group: string;
    shell_id: string;
    asset_status: string;
    selection_reason: string;
  } | null;
};

export function buildPackLibraryInternalRefs(input: {
  pack_id: string;
  sector: string;
}): PackLibraryInternalRefs {
  const sector = input.sector as TemplateSector;
  const bundle = resolvePackTemplateBundle({ pack_id: input.pack_id, sector });
  const saasSeeds = resolveSaasPackTemplates({ pack_id: input.pack_id, sector });
  const onDisk = getOnDiskSeedsForPack(input.pack_id);
  const landingSeed = selectSeedForPack({
    pack_id: input.pack_id,
    sector,
    kind: "landing",
    varietyKey: input.sector,
  });

  return {
    pack_id: input.pack_id,
    sector: input.sector,
    native_templates: Object.fromEntries(
      Object.entries(bundle).map(([kind, t]) => [
        kind,
        t ? { id: t.id, name: t.name } : null,
      ]),
    ),
    saas_seeds: Object.fromEntries(
      Object.entries(saasSeeds).map(([key, m]) => [
        key,
        m
          ? {
              item_name: m.seed.item_name,
              provider: m.seed.provider,
              layer: m.layer,
              status: "resolved",
            }
          : null,
      ]),
    ),
    on_disk_seeds: onDisk.map((s) => ({
      item_name: s.item_name,
      provider: s.provider,
      slug: s.slug,
    })),
    selected_landing_seed: {
      slug: landingSeed.slug,
      item_name: landingSeed.catalog_item_name,
      provider: landingSeed.provider,
      sector_group: landingSeed.sector_group,
      shell_id: landingSeed.shell_id,
      asset_status: landingSeed.asset_status,
      selection_reason: landingSeed.selection_reason,
    },
  };
}

export function enrichBriefWithPackLibrary(
  brief: Record<string, unknown>,
  input: { pack_id: string; sector: string },
): Record<string, unknown> {
  return {
    ...brief,
    template_library_internal: buildPackLibraryInternalRefs(input),
  };
}
