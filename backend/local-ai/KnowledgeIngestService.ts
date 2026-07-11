import fs from "node:fs/promises";
import path from "node:path";

import { sha256 } from "./db";
import { getRagIngestPipeline } from "./RagIngestPipeline";
import type { KnowledgeSourceEntry } from "./specialization/knowledgeManifest";
import { buildKnowledgeManifest, manifestSummary } from "./specialization/knowledgeManifest";

export type IngestReport = {
  ok: boolean;
  ingested: number;
  skipped: number;
  failed: number;
  errors: string[];
  summary: ReturnType<typeof manifestSummary>;
};

export class KnowledgeIngestService {
  async ingestManifest(tenantId: string, entries?: KnowledgeSourceEntry[]): Promise<IngestReport> {
    const manifest = entries ?? buildKnowledgeManifest();
    const pipeline = getRagIngestPipeline();
    const report: IngestReport = {
      ok: true,
      ingested: 0,
      skipped: 0,
      failed: 0,
      errors: [],
      summary: manifestSummary(manifest),
    };

    for (const entry of manifest) {
      try {
        const raw = await fs.readFile(entry.path, "utf8");
        if (!raw.trim()) {
          report.skipped++;
          continue;
        }
        const sourceId = `kb:${entry.domain}:${path.basename(entry.path)}`;
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
            checksum: sha256(raw),
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
