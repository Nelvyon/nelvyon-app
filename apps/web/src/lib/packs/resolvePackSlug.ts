import { PACK_REGISTRY } from "@/lib/packs/packRegistry";
import type { PackId } from "@/lib/packs/types";

/** Resolve pack registry id from URL slug under /os/packs/{slug}. */
export function resolvePackIdFromSlug(packSlug: string): PackId | null {
  for (const meta of Object.values(PACK_REGISTRY)) {
    const slug = meta.kickoffPath.replace(/^\/os\/packs\//, "").split("?")[0];
    if (slug === packSlug) return meta.id;
  }
  return null;
}

export function getPackMetaBySlug(packSlug: string) {
  const id = resolvePackIdFromSlug(packSlug);
  return id ? PACK_REGISTRY[id] : null;
}
