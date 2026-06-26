/**
 * O15 — OsEnvatoSeedService
 * Registry of the 500-entry Envato seed catalog: sync from the committed metadata
 * file, browse/filter the catalog, and track per-seed download status.
 *
 * The catalog metadata (backend/data/envato-seeds-metadata.json) is committed and
 * works without ZIPs; the registry mirrors it in Postgres for the OS UI + stats.
 */
import * as fs from "node:fs";
import * as path from "node:path";

// Minimal DB port (matches DbClient.getInstance()).
export type SeedDbPort = {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
};

// ── Types ───────────────────────────────────────────────────────────────────────

export type SeedSource = "envato" | "synthetic";
export type DownloadStatus = "metadata_only" | "downloaded" | "failed";

export type SeedRegistryItem = {
  id: string;
  sector: string;
  source: SeedSource;
  envatoId: string | null;
  headline: string;
  metaTitle: string | null;
  ctaLabel: string | null;
  chatbotGreeting: string | null;
  previewUrl: string | null;
  zipPath: string | null;
  downloadedAt: string | null;
  downloadStatus: DownloadStatus;
  metadata: Record<string, unknown>;
};

export type SeedCatalogFilters = {
  sector?: string;
  source?: SeedSource;
  status?: DownloadStatus;
  limit?: number;
};

export type SectorStat = {
  sector: string;
  total: number;
  downloaded: number;
  metadataOnly: number;
  failed: number;
};

export type SeedSyncResult = { synced: number; inserted: number; updated: number };

export type OsEnvatoSeedErrorCode = "NOT_FOUND" | "VALIDATION" | "METADATA_MISSING";

export class OsEnvatoSeedError extends Error {
  constructor(
    public readonly code: OsEnvatoSeedErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "OsEnvatoSeedError";
  }
}

type MetadataFileEntry = {
  id: string;
  sector: string;
  source?: SeedSource;
  headline: string;
  meta_title?: string;
  cta_label?: string;
  chatbot_greeting?: string;
  preview_url?: string | null;
  downloaded_at?: string | null;
  envato_id?: string | null;
};

type RegistryRow = {
  id: string;
  sector: string;
  source: SeedSource;
  envato_id: string | null;
  headline: string;
  meta_title: string | null;
  cta_label: string | null;
  chatbot_greeting: string | null;
  preview_url: string | null;
  zip_path: string | null;
  downloaded_at: string | null;
  download_status: DownloadStatus;
  metadata: Record<string, unknown>;
};

function rowToItem(r: RegistryRow): SeedRegistryItem {
  return {
    id: r.id,
    sector: r.sector,
    source: r.source,
    envatoId: r.envato_id,
    headline: r.headline,
    metaTitle: r.meta_title,
    ctaLabel: r.cta_label,
    chatbotGreeting: r.chatbot_greeting,
    previewUrl: r.preview_url,
    zipPath: r.zip_path,
    downloadedAt: r.downloaded_at,
    downloadStatus: r.download_status,
    metadata: r.metadata ?? {},
  };
}

function defaultMetadataPath(): string {
  // service at backend/os-agents/seeds → metadata at backend/data/...
  // Mirror seed-selector.ts ESM-safe path resolution (handles Windows drive prefix).
  const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
  return path.resolve(here, "../../data/envato-seeds-metadata.json");
}

// ── Singleton ─────────────────────────────────────────────────────────────────────

let _instance: OsEnvatoSeedService | null = null;

export function getOsEnvatoSeedService(): OsEnvatoSeedService {
  if (!_instance) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { DbClient } = require("../../db/DbClient") as { DbClient: { getInstance(): SeedDbPort } };
    _instance = new OsEnvatoSeedService(DbClient.getInstance());
  }
  return _instance;
}

export function resetOsEnvatoSeedServiceForTests(): void {
  _instance = null;
}

// ── Service ───────────────────────────────────────────────────────────────────────

export class OsEnvatoSeedService {
  constructor(
    private readonly db: SeedDbPort,
    private readonly metadataPath: string = defaultMetadataPath(),
  ) {}

  /** Read + parse the committed metadata catalog file. */
  readMetadataFile(): MetadataFileEntry[] {
    if (!fs.existsSync(this.metadataPath)) {
      throw new OsEnvatoSeedError("METADATA_MISSING", `Metadata file no encontrado: ${this.metadataPath}`);
    }
    try {
      const raw = JSON.parse(fs.readFileSync(this.metadataPath, "utf-8")) as MetadataFileEntry[];
      return Array.isArray(raw) ? raw : [];
    } catch {
      throw new OsEnvatoSeedError("METADATA_MISSING", "Metadata file ilegible o corrupto");
    }
  }

  /** UPSERT every metadata entry into the registry (idempotent). */
  async syncFromMetadataFile(): Promise<SeedSyncResult> {
    const entries = this.readMetadataFile();
    let synced = 0;
    let inserted = 0;
    let updated = 0;

    for (const e of entries) {
      if (!e.id || !e.sector || !e.headline) continue;
      const status: DownloadStatus = e.downloaded_at ? "downloaded" : "metadata_only";
      const rows = await this.db.query<{ inserted: boolean }>(
        `INSERT INTO os_envato_seed_registry
           (id, sector, source, envato_id, headline, meta_title, cta_label,
            chatbot_greeting, preview_url, downloaded_at, download_status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         ON CONFLICT (id) DO UPDATE SET
           sector = EXCLUDED.sector,
           source = EXCLUDED.source,
           envato_id = EXCLUDED.envato_id,
           headline = EXCLUDED.headline,
           meta_title = EXCLUDED.meta_title,
           cta_label = EXCLUDED.cta_label,
           chatbot_greeting = EXCLUDED.chatbot_greeting,
           preview_url = COALESCE(EXCLUDED.preview_url, os_envato_seed_registry.preview_url),
           -- never downgrade a downloaded seed back to metadata_only
           download_status = CASE
             WHEN os_envato_seed_registry.download_status = 'downloaded' THEN 'downloaded'
             ELSE EXCLUDED.download_status END,
           downloaded_at = COALESCE(os_envato_seed_registry.downloaded_at, EXCLUDED.downloaded_at),
           updated_at = NOW()
         RETURNING (xmax = 0) AS inserted`,
        [
          e.id, e.sector, e.source ?? "synthetic", e.envato_id ?? null, e.headline,
          e.meta_title ?? null, e.cta_label ?? null, e.chatbot_greeting ?? null,
          e.preview_url ?? null, e.downloaded_at ?? null, status,
        ],
      );
      synced++;
      if (rows[0]?.inserted) inserted++;
      else updated++;
    }
    return { synced, inserted, updated };
  }

  async listCatalog(filters: SeedCatalogFilters = {}): Promise<SeedRegistryItem[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;
    if (filters.sector) { conditions.push(`sector = $${idx++}`); params.push(filters.sector); }
    if (filters.source) { conditions.push(`source = $${idx++}`); params.push(filters.source); }
    if (filters.status) { conditions.push(`download_status = $${idx++}`); params.push(filters.status); }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const limit = Math.min(Math.max(filters.limit ?? 100, 1), 500);
    const rows = await this.db.query<RegistryRow>(
      `SELECT * FROM os_envato_seed_registry
       ${where}
       ORDER BY sector ASC, id ASC
       LIMIT $${idx}`,
      [...params, limit],
    );
    return rows.map(rowToItem);
  }

  async getSeed(id: string): Promise<SeedRegistryItem> {
    const rows = await this.db.query<RegistryRow>(
      `SELECT * FROM os_envato_seed_registry WHERE id = $1`,
      [id],
    );
    if (!rows[0]) throw new OsEnvatoSeedError("NOT_FOUND", `Seed ${id} no encontrado`);
    return rowToItem(rows[0]);
  }

  async getSectorStats(): Promise<SectorStat[]> {
    const rows = await this.db.query<{
      sector: string; total: string; downloaded: string; metadata_only: string; failed: string;
    }>(
      `SELECT sector,
              COUNT(*) AS total,
              COUNT(*) FILTER (WHERE download_status = 'downloaded') AS downloaded,
              COUNT(*) FILTER (WHERE download_status = 'metadata_only') AS metadata_only,
              COUNT(*) FILTER (WHERE download_status = 'failed') AS failed
       FROM os_envato_seed_registry
       GROUP BY sector
       ORDER BY sector ASC`,
    );
    return rows.map((r) => ({
      sector: r.sector,
      total: parseInt(r.total, 10),
      downloaded: parseInt(r.downloaded, 10),
      metadataOnly: parseInt(r.metadata_only, 10),
      failed: parseInt(r.failed, 10),
    }));
  }

  async markDownloaded(id: string, zipPath: string, envatoId?: string): Promise<SeedRegistryItem> {
    const rows = await this.db.query<RegistryRow>(
      `UPDATE os_envato_seed_registry
       SET download_status = 'downloaded',
           zip_path = $2,
           envato_id = COALESCE($3, envato_id),
           source = 'envato',
           downloaded_at = NOW(),
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, zipPath, envatoId ?? null],
    );
    if (!rows[0]) throw new OsEnvatoSeedError("NOT_FOUND", `Seed ${id} no encontrado`);
    return rowToItem(rows[0]);
  }

  async markFailed(id: string, error: string): Promise<SeedRegistryItem> {
    const rows = await this.db.query<RegistryRow>(
      `UPDATE os_envato_seed_registry
       SET download_status = 'failed',
           metadata = metadata || $2::jsonb,
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, JSON.stringify({ lastError: error })],
    );
    if (!rows[0]) throw new OsEnvatoSeedError("NOT_FOUND", `Seed ${id} no encontrado`);
    return rowToItem(rows[0]);
  }
}
