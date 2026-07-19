import fs from "node:fs/promises";
import path from "node:path";

import { sha256 } from "./db";
import { getRagIngestPipeline } from "./RagIngestPipeline";
import { buildKnowledgeManifest, manifestSummary, sourceIdForEntry, type KnowledgeSourceEntry } from "./specialization/knowledgeManifest";

export type IngestReport = {
  ok: boolean;
  ingested: number;
  skipped: number;
  failed: number;
  errors: string[];
  summary: ReturnType<typeof manifestSummary> & { purgedStale?: number };
};

export class KnowledgeIngestService {
  /** Archive RAG documents whose source_id is not in the current manifest. */
  async purgeStaleSources(tenantId: string, manifest: KnowledgeSourceEntry[]): Promise<number> {
    const active = new Set(manifest.map(sourceIdForEntry));
    const { withTenantClient } = await import("./db");
    return withTenantClient(tenantId, async (client) => {
      const rows = await client.query<{ source_id: string }>(
        `SELECT DISTINCT source_id FROM local_ai_rag_documents WHERE tenant_id = $1 AND status = 'active'`,
        [tenantId],
      );
      let purged = 0;
      for (const row of rows.rows) {
        if (active.has(row.source_id)) continue;
        await client.query(
          `UPDATE local_ai_rag_documents SET status = 'archived', updated_at = NOW()
           WHERE tenant_id = $1 AND source_id = $2 AND status = 'active'`,
          [tenantId, row.source_id],
        );
        await client.query(
          `UPDATE local_ai_rag_chunks SET status = 'archived'
           WHERE tenant_id = $1 AND source_id = $2 AND status = 'active'`,
          [tenantId, row.source_id],
        );
        purged++;
      }
      return purged;
    });
  }

  private async hasMatchingChecksum(tenantId: string, sourceId: string, checksum: string): Promise<boolean> {
    try {
      const { withTenantClient } = await import("./db");
      return withTenantClient(tenantId, async (client) => {
        const r = await client.query<{ checksum: string }>(
          `SELECT checksum FROM local_ai_rag_documents
           WHERE tenant_id = $1 AND source_id = $2 AND status = 'active'
           ORDER BY version DESC LIMIT 1`,
          [tenantId, sourceId],
        );
        return r.rows[0]?.checksum === checksum;
      });
    } catch {
      return false;
    }
  }

  async ingestManifest(tenantId: string, entries?: KnowledgeSourceEntry[]): Promise<IngestReport> {
    const manifest = entries ?? buildKnowledgeManifest();
    const pipeline = getRagIngestPipeline();
    const purged = await this.purgeStaleSources(tenantId, manifest);
    const report: IngestReport = {
      ok: true,
      ingested: 0,
      skipped: 0,
      failed: 0,
      errors: [],
      summary: { ...manifestSummary(manifest), purgedStale: purged },
    };

    for (const entry of manifest) {
      try {
        const raw = await fs.readFile(entry.path, "utf8");
        if (!raw.trim()) {
          report.skipped++;
          continue;
        }
        const sourceId = sourceIdForEntry(entry);
        const checksum = sha256(raw);
        // Skip re-embed when active document checksum unchanged (perf)
        const unchanged = await this.hasMatchingChecksum(tenantId, sourceId, checksum);
        if (unchanged) {
          report.skipped++;
          continue;
        }
        await pipeline.ingestFile({
          tenantId,
          sourceId,
          title: entry.title,
          filePath: entry.path,
          uri: `file://${entry.path}`,
          mimeType: "text/markdown",
          metadata: {
            domain: entry.domain,
            priority: entry.priority,
            license: entry.license,
            sourceType: entry.sourceType,
            checksum,
          },
        });
        report.ingested++;
      } catch (e) {
        report.failed++;
        report.errors.push(`${entry.path}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    report.ok = report.failed === 0;
    return report;
  }
}

let _svc: KnowledgeIngestService | undefined;
export function getKnowledgeIngestService(): KnowledgeIngestService {
  _svc ??= new KnowledgeIngestService();
  return _svc;
}
