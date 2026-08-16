/**
 * Durable ERP domain snapshot store (Blocks 26–29).
 *
 * Persists JSON payloads in `erp_domain_snapshots` with optimistic versioning.
 * Always sets `app.tenant_id` via set_config(…, true) inside transactions —
 * lecturas incluidas, desde la migracion 542: las politicas ERP dejaron de
 * abrir cuando el contexto falta, asi que una consulta sin GUC ya no devuelve
 * «todo» sino «nada».
 */

import { randomUUID } from "node:crypto";
import type pg from "pg";

import { DbClient } from "../../db/DbClient";
import { mirrorErpDomainToRelational } from "./ErpRelationalMirror";

export type ErpDomain = "purchases" | "inventory" | "manufacturing" | "projects_fs";

export type ErpSnapshotRow = {
  payload: Record<string, unknown>;
  version: number;
};

export class ErpSnapshotConflictError extends Error {
  readonly code = "CONFLICT" as const;

  constructor(message: string) {
    super(message);
    this.name = "ErpSnapshotConflictError";
  }
}

export type ErpAuditEventInput = {
  tenantId: string;
  domain: ErpDomain;
  actorId?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  detail?: string;
};

type SnapshotDbRow = {
  payload: unknown;
  version: string | number | bigint;
};

function asVersion(raw: string | number | bigint): number {
  return typeof raw === "bigint" ? Number(raw) : Number(raw);
}

function asPayload(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      /* fall through */
    }
  }
  return {};
}

async function setTenantGuc(client: pg.PoolClient, tenantId: string): Promise<void> {
  await client.query(`SELECT set_config('app.tenant_id', $1, true)`, [tenantId]);
}

export class ErpDomainSnapshotStore {
  constructor(private readonly db: DbClient = DbClient.getInstance()) {}

  /**
   * Read path. Runs inside a transaction ONLY to fix `app.tenant_id` first.
   *
   * Era el unico camino de esta clase que no fijaba el GUC: todas las
   * escrituras llaman a `setTenantGuc`, la lectura no. Con la politica de RLS
   * original —`nelvyon_erp_tenant_text() IS NULL OR tenant_id = ...`— daba
   * igual, porque sin contexto la politica abria todo y el filtro por
   * `tenant_id = $1` de aqui abajo hacia el trabajo.
   *
   * La migracion 542 quita esa rama para que la ausencia de contexto cierre en
   * vez de abrir. Sin este `set_config`, esta consulta pasaria a devolver cero
   * filas: el ERP arrancaria vacio para todo el mundo, sin un solo error. Por
   * eso el cambio de politica y este de aqui van juntos.
   */
  async loadSnapshot(tenantId: string, domain: ErpDomain): Promise<ErpSnapshotRow | null> {
    const row = await this.db.withTransaction(async (client) => {
      await setTenantGuc(client, tenantId);
      const result = await client.query<SnapshotDbRow>(
        `SELECT payload, version
           FROM erp_domain_snapshots
          WHERE tenant_id = $1 AND domain = $2`,
        [tenantId, domain],
      );
      return result.rows[0];
    });
    if (!row) return null;
    return {
      payload: asPayload(row.payload),
      version: asVersion(row.version),
    };
  }

  /**
   * Persist payload with optimistic concurrency.
   * `expectedVersion` must match the current row version (use 0 when no row exists).
   * Returns the new version after a successful write.
   */
  async saveSnapshot(
    tenantId: string,
    domain: ErpDomain,
    payload: object,
    expectedVersion: number,
  ): Promise<number> {
    return this.db.withTransaction(async (client) => {
      await setTenantGuc(client, tenantId);
      return this.saveSnapshotLocked(client, tenantId, domain, payload, expectedVersion);
    });
  }

  /**
   * Load (FOR UPDATE) → mutateFn(payload) → save under one transaction.
   * mutateFn receives the current payload and must return the next payload.
   * Returns the new snapshot version.
   */
  async withDomainMutation(
    tenantId: string,
    domain: ErpDomain,
    mutateFn: (
      payload: Record<string, unknown>,
    ) => Record<string, unknown> | Promise<Record<string, unknown>>,
  ): Promise<number> {
    return this.db.withTransaction(async (client) => {
      await setTenantGuc(client, tenantId);

      const locked = await client.query<SnapshotDbRow>(
        `SELECT payload, version
           FROM erp_domain_snapshots
          WHERE tenant_id = $1 AND domain = $2
          FOR UPDATE`,
        [tenantId, domain],
      );
      const current = locked.rows[0];
      const expectedVersion = current ? asVersion(current.version) : 0;
      const currentPayload = current ? asPayload(current.payload) : {};

      const nextPayload = await mutateFn(currentPayload);
      return this.saveSnapshotLocked(
        client,
        tenantId,
        domain,
        nextPayload ?? {},
        expectedVersion,
      );
    });
  }

  /** Optional helper: append an audit event (same tenant GUC session when inside tx). */
  async appendAuditEvent(input: ErpAuditEventInput, client?: pg.PoolClient): Promise<void> {
    const sql = `INSERT INTO erp_audit_events
      (id, tenant_id, domain, at, actor_id, action, entity_type, entity_id, detail)
     VALUES ($1, $2, $3, NOW(), $4, $5, $6, $7, $8)`;
    const params = [
      randomUUID(),
      input.tenantId,
      input.domain,
      input.actorId ?? "",
      input.action,
      input.entityType ?? "",
      input.entityId ?? "",
      input.detail ?? "",
    ];
    if (client) {
      await setTenantGuc(client, input.tenantId);
      await client.query(sql, params);
      return;
    }
    await this.db.withTransaction(async (tx) => {
      await setTenantGuc(tx, input.tenantId);
      await tx.query(sql, params);
    });
  }

  private async saveSnapshotLocked(
    client: pg.PoolClient,
    tenantId: string,
    domain: ErpDomain,
    payload: object,
    expectedVersion: number,
  ): Promise<number> {
    const locked = await client.query<SnapshotDbRow>(
      `SELECT payload, version
         FROM erp_domain_snapshots
        WHERE tenant_id = $1 AND domain = $2
        FOR UPDATE`,
      [tenantId, domain],
    );
    const current = locked.rows[0];
    const currentVersion = current ? asVersion(current.version) : 0;

    if (currentVersion !== expectedVersion) {
      throw new ErpSnapshotConflictError(
        `erp_domain_snapshots version conflict for ${tenantId}/${domain}: expected ${expectedVersion}, found ${currentVersion}`,
      );
    }

    const nextVersion = currentVersion + 1;
    const payloadJson = JSON.stringify(payload ?? {});

    if (!current) {
      await client.query(
        `INSERT INTO erp_domain_snapshots (tenant_id, domain, payload, version, updated_at)
         VALUES ($1, $2, $3::jsonb, $4, NOW())`,
        [tenantId, domain, payloadJson, nextVersion],
      );
    } else {
      await client.query(
        `UPDATE erp_domain_snapshots
            SET payload = $3::jsonb, version = $4, updated_at = NOW()
          WHERE tenant_id = $1 AND domain = $2`,
        [tenantId, domain, payloadJson, nextVersion],
      );
    }

    // ADR-062: optional relational mirror in same TX (fail-closed; default OFF).
    await mirrorErpDomainToRelational(client, tenantId, domain, payload ?? {});

    return nextVersion;
  }
}

let storeSingleton: ErpDomainSnapshotStore | undefined;

export function getErpDomainSnapshotStore(): ErpDomainSnapshotStore {
  if (!storeSingleton) storeSingleton = new ErpDomainSnapshotStore();
  return storeSingleton;
}

export function resetErpDomainSnapshotStoreForTests(): void {
  storeSingleton = undefined;
}
