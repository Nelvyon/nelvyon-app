import { getSaasTenantMemoryService } from "../../saas/SaasTenantMemoryService";
import type { MemoryChunk } from "../../saas/SaasTenantMemoryService";

function clip(s: string, max: number): string {
  const t = s.trim();
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}

/** Adapter — tenant memory stays in SaasTenantMemoryService; no duplication. */
export class TenantMemoryAdapter {
  async list(tenantId: string, limit = 5): Promise<MemoryChunk[]> {
    return getSaasTenantMemoryService().list(tenantId, limit);
  }

  async search(tenantId: string, query: string, limit = 5): Promise<MemoryChunk[]> {
    return getSaasTenantMemoryService().search(tenantId, query, limit);
  }

  formatForPrompt(chunks: MemoryChunk[]): string {
    if (!chunks.length) return "";
    return (
      "\n\nContexto memoria tenant:\n" +
      chunks.map((c) => `- ${c.title || c.source}: ${clip(c.content, 200)}`).join("\n")
    );
  }
}

let _adapter: TenantMemoryAdapter | undefined;
export function getTenantMemoryAdapter(): TenantMemoryAdapter {
  _adapter ??= new TenantMemoryAdapter();
  return _adapter;
}
