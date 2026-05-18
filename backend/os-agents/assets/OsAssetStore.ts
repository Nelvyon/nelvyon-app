import type { DbClient } from "../../db/DbClient";
import { DbClient as DbClientClass } from "../../db/DbClient";
import { logger } from "../cron/logger";

export type AssetType = "image" | "video" | "audio" | "3d" | "pdf" | "document";

export interface OsAsset {
  id: string;
  clientId: string;
  tenantId: string;
  jobId?: string;
  serviceId?: string;
  type: AssetType;
  name: string;
  url: string;
  sizeBytes?: number;
  mimeType?: string;
  createdAt: string;
}

export type OsAssetStoreDeps = {
  db?: Pick<DbClient, "query">;
};

export class OsAssetStore {
  constructor(private readonly deps: OsAssetStoreDeps = {}) {}

  private get db(): Pick<DbClient, "query"> {
    return this.deps.db ?? DbClientClass.getInstance();
  }

  async saveAsset(asset: Omit<OsAsset, "id" | "createdAt">): Promise<OsAsset> {
    const rows = await this.db.query<OsAsset>(
      `INSERT INTO os_assets (client_id, tenant_id, job_id, service_id, type, name, url, size_bytes, mime_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, client_id as "clientId", tenant_id as "tenantId", job_id as "jobId",
                 service_id as "serviceId", type, name, url, size_bytes as "sizeBytes",
                 mime_type as "mimeType", created_at as "createdAt"`,
      [
        asset.clientId,
        asset.tenantId,
        asset.jobId ?? null,
        asset.serviceId ?? null,
        asset.type,
        asset.name,
        asset.url,
        asset.sizeBytes ?? null,
        asset.mimeType ?? null,
      ],
    );
    const row = rows[0];
    if (!row) {
      throw new Error("OsAssetStore.saveAsset: INSERT returned no row");
    }
    logger.info(`[ASSETS] Activo guardado: ${asset.name} (${asset.type}) para cliente ${asset.clientId}`);
    return row;
  }

  async getClientAssets(clientId: string, tenantId: string, type?: AssetType): Promise<OsAsset[]> {
    const baseQuery = `SELECT id, client_id as "clientId", tenant_id as "tenantId", job_id as "jobId",
                              service_id as "serviceId", type, name, url, size_bytes as "sizeBytes",
                              mime_type as "mimeType", created_at as "createdAt"
                       FROM os_assets
                       WHERE client_id = $1 AND tenant_id = $2`;

    if (type) {
      return this.db.query<OsAsset>(`${baseQuery} AND type = $3 ORDER BY created_at DESC`, [clientId, tenantId, type]);
    }
    return this.db.query<OsAsset>(`${baseQuery} ORDER BY created_at DESC`, [clientId, tenantId]);
  }

  async getAssetById(id: string, clientId: string): Promise<OsAsset | null> {
    const rows = await this.db.query<OsAsset>(
      `SELECT id, client_id as "clientId", tenant_id as "tenantId", job_id as "jobId",
              service_id as "serviceId", type, name, url, size_bytes as "sizeBytes",
              mime_type as "mimeType", created_at as "createdAt"
       FROM os_assets WHERE id = $1::uuid AND client_id = $2`,
      [id, clientId],
    );
    return rows[0] ?? null;
  }

  async deleteAsset(id: string, clientId: string): Promise<boolean> {
    const rows = await this.db.query<{ id: string }>(
      `DELETE FROM os_assets WHERE id = $1::uuid AND client_id = $2 RETURNING id`,
      [id, clientId],
    );
    return rows.length > 0;
  }
}

export const osAssetStore = new OsAssetStore();
