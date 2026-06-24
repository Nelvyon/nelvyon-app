import type { DbClient } from "../db/DbClient";
import { DbClient as DbClientClass } from "../db/DbClient";

export type CountdownType = "datetime" | "duration" | "evergreen";
export type CountdownAction = "hide" | "show_message" | "redirect";

export interface CountdownTimer {
  id: string;
  tenantId: string;
  name: string;
  type: CountdownType;
  targetDatetime: string | null;
  durationSeconds: number | null;
  evergreenSeconds: number | null;
  timezone: string;
  actionOnEnd: CountdownAction;
  actionValue: string | null;
  scans: number;
  createdAt: string;
}

export interface CreateCountdownInput {
  name: string;
  type: CountdownType;
  targetDatetime?: string;
  durationSeconds?: number;
  evergreenSeconds?: number;
  timezone?: string;
  actionOnEnd?: CountdownAction;
  actionValue?: string;
}

export type SaasCountdownServiceDeps = { db?: Pick<DbClient, "query"> };

const SEL = `id, tenant_id as "tenantId", name, type,
  target_datetime as "targetDatetime", duration_seconds as "durationSeconds",
  evergreen_seconds as "evergreenSeconds", timezone,
  action_on_end as "actionOnEnd", action_value as "actionValue",
  scans, created_at as "createdAt"`;

function mapRow(r: Record<string, unknown>): CountdownTimer {
  return {
    id: String(r.id), tenantId: String(r.tenantId), name: String(r.name),
    type: String(r.type) as CountdownType,
    targetDatetime: r.targetDatetime != null ? String(r.targetDatetime) : null,
    durationSeconds: r.durationSeconds != null ? Number(r.durationSeconds) : null,
    evergreenSeconds: r.evergreenSeconds != null ? Number(r.evergreenSeconds) : null,
    timezone: String(r.timezone ?? "Europe/Madrid"),
    actionOnEnd: String(r.actionOnEnd ?? "hide") as CountdownAction,
    actionValue: r.actionValue != null ? String(r.actionValue) : null,
    scans: Number(r.scans ?? 0),
    createdAt: String(r.createdAt),
  };
}

export class SaasCountdownService {
  constructor(private readonly deps: SaasCountdownServiceDeps = {}) {}
  private get db() { return this.deps.db ?? DbClientClass.getInstance(); }

  async list(tenantId: string): Promise<CountdownTimer[]> {
    const rows = await this.db.query<Record<string, unknown>>(
      `SELECT ${SEL} FROM countdown_timers WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tenantId],
    );
    return rows.map(mapRow);
  }

  async get(tenantId: string, id: string): Promise<CountdownTimer | null> {
    const rows = await this.db.query<Record<string, unknown>>(
      `SELECT ${SEL} FROM countdown_timers WHERE id = $1::uuid AND tenant_id = $2`,
      [id, tenantId],
    );
    return rows[0] ? mapRow(rows[0]) : null;
  }

  async create(tenantId: string, input: CreateCountdownInput): Promise<CountdownTimer> {
    if (!input.name?.trim()) throw Object.assign(new Error("name is required"), { code: "VALIDATION" });
    if (input.type === "datetime" && !input.targetDatetime)
      throw Object.assign(new Error("targetDatetime required for datetime type"), { code: "VALIDATION" });
    if (input.type === "duration" && !input.durationSeconds)
      throw Object.assign(new Error("durationSeconds required for duration type"), { code: "VALIDATION" });
    if (input.type === "evergreen" && !input.evergreenSeconds)
      throw Object.assign(new Error("evergreenSeconds required for evergreen type"), { code: "VALIDATION" });

    const rows = await this.db.query<Record<string, unknown>>(
      `INSERT INTO countdown_timers
         (tenant_id, name, type, target_datetime, duration_seconds, evergreen_seconds,
          timezone, action_on_end, action_value)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING ${SEL}`,
      [
        tenantId, input.name.trim(), input.type,
        input.targetDatetime ?? null, input.durationSeconds ?? null, input.evergreenSeconds ?? null,
        input.timezone ?? "Europe/Madrid", input.actionOnEnd ?? "hide", input.actionValue ?? null,
      ],
    );
    const row = rows[0];
    if (!row) throw new Error("SaasCountdownService.create: no row returned");
    return mapRow(row);
  }

  async update(tenantId: string, id: string, patch: Partial<CreateCountdownInput>): Promise<CountdownTimer | null> {
    const rows = await this.db.query<Record<string, unknown>>(
      `UPDATE countdown_timers SET
         name            = COALESCE($3, name),
         type            = COALESCE($4, type),
         target_datetime = COALESCE($5::timestamptz, target_datetime),
         duration_seconds= COALESCE($6, duration_seconds),
         evergreen_seconds=COALESCE($7, evergreen_seconds),
         timezone        = COALESCE($8, timezone),
         action_on_end   = COALESCE($9, action_on_end),
         action_value    = COALESCE($10, action_value)
       WHERE id=$1::uuid AND tenant_id=$2
       RETURNING ${SEL}`,
      [id, tenantId, patch.name ?? null, patch.type ?? null,
       patch.targetDatetime ?? null, patch.durationSeconds ?? null, patch.evergreenSeconds ?? null,
       patch.timezone ?? null, patch.actionOnEnd ?? null, patch.actionValue ?? null],
    );
    return rows[0] ? mapRow(rows[0]) : null;
  }

  async delete(tenantId: string, id: string): Promise<boolean> {
    const rows = await this.db.query<{ id: string }>(
      `DELETE FROM countdown_timers WHERE id=$1::uuid AND tenant_id=$2 RETURNING id`,
      [id, tenantId],
    );
    return rows.length > 0;
  }

  async trackScan(id: string): Promise<void> {
    await this.db.query(
      `UPDATE countdown_timers SET scans = scans + 1 WHERE id = $1::uuid`,
      [id],
    );
  }
}

let _svc: SaasCountdownService | undefined;
export function getSaasCountdownService(): SaasCountdownService {
  if (!_svc) _svc = new SaasCountdownService();
  return _svc;
}
export function resetSaasCountdownServiceForTests(): void { _svc = undefined; }
