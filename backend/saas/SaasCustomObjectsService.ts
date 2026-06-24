import type { DbClient } from "../db/DbClient";
import { DbClient as DbClientClass } from "../db/DbClient";

export interface CustomObjectField {
  name: string;
  type: "text" | "number" | "date" | "boolean" | "select" | "email" | "url";
  label: string;
  required?: boolean;
  options?: string[];
}

export interface CustomObject {
  id: string;
  tenantId: string;
  name: string;
  pluralName: string;
  icon: string;
  fields: CustomObjectField[];
  recordsCount: number;
  createdAt: string;
}

export interface CustomObjectRecord {
  id: string;
  objectId: string;
  tenantId: string;
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomObjectInput {
  name: string;
  pluralName?: string;
  icon?: string;
  fields?: CustomObjectField[];
}

export type SaasCustomObjectsServiceDeps = { db?: Pick<DbClient, "query"> };

const OBJ_SEL = `id, tenant_id as "tenantId", name, plural_name as "pluralName",
  icon, fields, records_count as "recordsCount", created_at as "createdAt"`;
const REC_SEL = `id, object_id as "objectId", tenant_id as "tenantId",
  data, created_at as "createdAt", updated_at as "updatedAt"`;

function mapObj(r: Record<string, unknown>): CustomObject {
  return {
    id: String(r.id), tenantId: String(r.tenantId), name: String(r.name),
    pluralName: String(r.pluralName ?? r.name + "s"),
    icon: String(r.icon ?? "📦"),
    fields: Array.isArray(r.fields) ? r.fields as CustomObjectField[] : [],
    recordsCount: Number(r.recordsCount ?? 0),
    createdAt: String(r.createdAt),
  };
}

function mapRec(r: Record<string, unknown>): CustomObjectRecord {
  return {
    id: String(r.id), objectId: String(r.objectId), tenantId: String(r.tenantId),
    data: (r.data as Record<string, unknown>) ?? {},
    createdAt: String(r.createdAt), updatedAt: String(r.updatedAt),
  };
}

export class SaasCustomObjectsService {
  constructor(private readonly deps: SaasCustomObjectsServiceDeps = {}) {}
  private get db() { return this.deps.db ?? DbClientClass.getInstance(); }

  // ── Object types ─────────────────────────────────────────────────────────

  async listObjects(tenantId: string): Promise<CustomObject[]> {
    const rows = await this.db.query<Record<string, unknown>>(
      `SELECT ${OBJ_SEL} FROM custom_objects WHERE tenant_id=$1 ORDER BY name`,
      [tenantId],
    );
    return rows.map(mapObj);
  }

  async getObject(tenantId: string, id: string): Promise<CustomObject | null> {
    const rows = await this.db.query<Record<string, unknown>>(
      `SELECT ${OBJ_SEL} FROM custom_objects WHERE id=$1::uuid AND tenant_id=$2`,
      [id, tenantId],
    );
    return rows[0] ? mapObj(rows[0]) : null;
  }

  async createObject(tenantId: string, input: CreateCustomObjectInput): Promise<CustomObject> {
    if (!input.name?.trim()) throw Object.assign(new Error("name is required"), { code: "VALIDATION" });
    const rows = await this.db.query<Record<string, unknown>>(
      `INSERT INTO custom_objects (tenant_id, name, plural_name, icon, fields)
       VALUES ($1,$2,$3,$4,$5::jsonb)
       RETURNING ${OBJ_SEL}`,
      [tenantId, input.name.trim(),
       input.pluralName ?? input.name.trim() + "s",
       input.icon ?? "📦",
       JSON.stringify(input.fields ?? [])],
    );
    const row = rows[0];
    if (!row) throw new Error("SaasCustomObjectsService.createObject: no row");
    return mapObj(row);
  }

  async updateObject(tenantId: string, id: string, patch: Partial<CreateCustomObjectInput>): Promise<CustomObject | null> {
    const rows = await this.db.query<Record<string, unknown>>(
      `UPDATE custom_objects SET
         name        = COALESCE($3, name),
         plural_name = COALESCE($4, plural_name),
         icon        = COALESCE($5, icon),
         fields      = COALESCE($6::jsonb, fields)
       WHERE id=$1::uuid AND tenant_id=$2
       RETURNING ${OBJ_SEL}`,
      [id, tenantId, patch.name ?? null, patch.pluralName ?? null,
       patch.icon ?? null, patch.fields ? JSON.stringify(patch.fields) : null],
    );
    return rows[0] ? mapObj(rows[0]) : null;
  }

  async deleteObject(tenantId: string, id: string): Promise<boolean> {
    const rows = await this.db.query<{ id: string }>(
      `DELETE FROM custom_objects WHERE id=$1::uuid AND tenant_id=$2 RETURNING id`,
      [id, tenantId],
    );
    return rows.length > 0;
  }

  // ── Records ───────────────────────────────────────────────────────────────

  async listRecords(tenantId: string, objectId: string): Promise<CustomObjectRecord[]> {
    const rows = await this.db.query<Record<string, unknown>>(
      `SELECT ${REC_SEL} FROM custom_object_records
       WHERE object_id=$1::uuid AND tenant_id=$2 ORDER BY created_at DESC`,
      [objectId, tenantId],
    );
    return rows.map(mapRec);
  }

  async createRecord(tenantId: string, objectId: string, data: Record<string, unknown>): Promise<CustomObjectRecord> {
    const rows = await this.db.query<Record<string, unknown>>(
      `WITH ins AS (
         INSERT INTO custom_object_records (object_id, tenant_id, data)
         VALUES ($1::uuid, $2, $3::jsonb)
         RETURNING ${REC_SEL}
       ), upd AS (
         UPDATE custom_objects SET records_count = records_count + 1
         WHERE id=$1::uuid AND tenant_id=$2
       )
       SELECT * FROM ins`,
      [objectId, tenantId, JSON.stringify(data)],
    );
    const row = rows[0];
    if (!row) throw new Error("SaasCustomObjectsService.createRecord: no row");
    return mapRec(row);
  }

  async updateRecord(tenantId: string, objectId: string, recordId: string, data: Record<string, unknown>): Promise<CustomObjectRecord | null> {
    const rows = await this.db.query<Record<string, unknown>>(
      `UPDATE custom_object_records SET data=$3::jsonb, updated_at=NOW()
       WHERE id=$1::uuid AND object_id=$4::uuid AND tenant_id=$2
       RETURNING ${REC_SEL}`,
      [recordId, tenantId, JSON.stringify(data), objectId],
    );
    return rows[0] ? mapRec(rows[0]) : null;
  }

  async deleteRecord(tenantId: string, objectId: string, recordId: string): Promise<boolean> {
    const rows = await this.db.query<{ id: string }>(
      `WITH del AS (
         DELETE FROM custom_object_records
         WHERE id=$1::uuid AND object_id=$2::uuid AND tenant_id=$3
         RETURNING id
       ), upd AS (
         UPDATE custom_objects SET records_count = GREATEST(records_count - 1, 0)
         WHERE id=$2::uuid AND tenant_id=$3 AND EXISTS (SELECT 1 FROM del)
       )
       SELECT id FROM del`,
      [recordId, objectId, tenantId],
    );
    return rows.length > 0;
  }
}

let _svc: SaasCustomObjectsService | undefined;
export function getSaasCustomObjectsService(): SaasCustomObjectsService {
  if (!_svc) _svc = new SaasCustomObjectsService();
  return _svc;
}
export function resetSaasCustomObjectsServiceForTests(): void { _svc = undefined; }
