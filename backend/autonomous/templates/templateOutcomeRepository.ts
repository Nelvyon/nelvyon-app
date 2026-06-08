/** Template outcome persistence — DB when flagged, else local JSON (never throws) */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

import { aggregateOutcomes, normalizeOutcome } from "./templateOutcome";
import { rankTemplatesForSlice } from "./templateRanking";
import { loadTemplateRegistry } from "./loadRegistry";
import type { TemplateCategory, TemplateOutcome, TemplateScoreBreakdown, TemplateSlice } from "./types";

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOCAL_OUTCOMES_PATH = join(__dirname, "..", "output", "learning", "local-outcomes.json");

export type StorageMode = "db" | "local" | "none";

export interface RecordOutcomeInput {
  workspace_id?: number | null;
  template_id: string;
  category: TemplateCategory;
  sector: string;
  service: string;
  objective?: string | null;
  channel?: string | null;
  language?: string | null;
  level?: string | null;
  qa_score?: number | null;
  approved_by_client?: boolean | null;
  revisions_count?: number;
  conversion_rate?: number | null;
  lead_count?: number | null;
  client_rating?: number | null;
  delivery_time_hours?: number | null;
  result_status?: string | null;
  notes?: string | null;
  metadata?: Record<string, unknown>;
}

type OutcomeRow = {
  id: string;
  workspace_id: number | null;
  template_id: string;
  category: string;
  sector: string;
  service: string;
  objective: string | null;
  channel: string | null;
  language: string | null;
  level: string | null;
  qa_score: string | number | null;
  approved_by_client: boolean | null;
  revisions_count: number;
  conversion_rate: string | number | null;
  lead_count: number | null;
  client_rating: string | number | null;
  delivery_time_hours: string | number | null;
  result_status: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};


export function learningDbEnabled(): boolean {
  return (
    process.env.ENABLE_TEMPLATE_LEARNING_DB === "true" &&
    typeof process.env.DATABASE_URL === "string" &&
    process.env.DATABASE_URL.trim().length > 0
  );
}

export function resolveStorageMode(): StorageMode {
  if (learningDbEnabled()) return "db";
  if (typeof process.env.DATABASE_URL === "string" && process.env.DATABASE_URL.trim().length > 0) {
    return "local";
  }
  return "local";
}

async function dbQuery<T>(sql: string, params?: unknown[]): Promise<T[] | null> {
  if (!learningDbEnabled()) return null;
  try {
    const mod = await import("./templateOutcomeDbPool");
    return await mod.queryTemplateOutcomes<T>(sql, params);
  } catch {
    return null;
  }
}

function num(v: string | number | null | undefined): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function rowToOutcome(row: OutcomeRow): TemplateOutcome {
  return normalizeOutcome({
    id: row.id,
    project_ref: String(row.metadata?.project_ref ?? row.id),
    template_id: row.template_id,
    category: row.category,
    sector: row.sector,
    service: row.service,
    objective: row.objective ?? "lead_gen",
    channel: row.channel ?? "web",
    language: row.language ?? "es",
    level: row.level ?? "professional",
    qa_score: num(row.qa_score) ?? 0,
    approved_by_client: row.approved_by_client ?? false,
    revisions_count: row.revisions_count ?? 0,
    conversion_rate: num(row.conversion_rate),
    lead_count: row.lead_count ?? 0,
    client_rating: num(row.client_rating),
    delivery_time_hours: num(row.delivery_time_hours) ?? 0,
    result_status: row.result_status ?? "generated",
    notes: row.notes ?? undefined,
    created_at: row.created_at,
  });
}

function readLocalOutcomes(): TemplateOutcome[] {
  if (!existsSync(LOCAL_OUTCOMES_PATH)) return [];
  try {
    const raw = JSON.parse(readFileSync(LOCAL_OUTCOMES_PATH, "utf-8")) as unknown;
    return loadOutcomesFromJsonSafe(raw);
  } catch {
    return [];
  }
}

function loadOutcomesFromJsonSafe(raw: unknown): TemplateOutcome[] {
  if (!Array.isArray(raw)) return [];
  const out: TemplateOutcome[] = [];
  for (const item of raw) {
    try {
      out.push(normalizeOutcome(item));
    } catch {
      /* skip invalid */
    }
  }
  return out;
}

function writeLocalOutcomes(outcomes: TemplateOutcome[]): void {
  mkdirSync(dirname(LOCAL_OUTCOMES_PATH), { recursive: true });
  writeFileSync(LOCAL_OUTCOMES_PATH, JSON.stringify(outcomes, null, 2));
}

export class TemplateOutcomeRepository {
  async recordOutcome(input: RecordOutcomeInput): Promise<{ id: string; mode: StorageMode }> {
    const id = randomUUID();
    const mode = resolveStorageMode();

    if (mode === "db") {
      try {
        await dbQuery(
          `INSERT INTO template_outcomes (
              id, workspace_id, template_id, category, sector, service, objective, channel, language, level,
              qa_score, approved_by_client, revisions_count, conversion_rate, lead_count, client_rating,
              delivery_time_hours, result_status, notes, metadata, created_at
            ) VALUES (
              $1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10,
              $11, $12, $13, $14, $15, $16, $17, $18, $19, $20::jsonb, NOW()
            )`,
            [
              id,
              input.workspace_id ?? null,
              input.template_id,
              input.category,
              input.sector,
              input.service,
              input.objective ?? null,
              input.channel ?? null,
              input.language ?? null,
              input.level ?? null,
              input.qa_score ?? null,
              input.approved_by_client ?? null,
              input.revisions_count ?? 0,
              input.conversion_rate ?? null,
              input.lead_count ?? null,
              input.client_rating ?? null,
              input.delivery_time_hours ?? null,
              input.result_status ?? "generated",
              input.notes ?? null,
              JSON.stringify(input.metadata ?? {}),
            ],
        );
        return { id, mode: "db" };
      } catch {
        /* fall through to local */
      }
    }

    const local = readLocalOutcomes();
    local.push(
      normalizeOutcome({
        id,
        project_ref: String(input.metadata?.project_ref ?? id),
        template_id: input.template_id,
        category: input.category,
        sector: input.sector,
        service: input.service,
        objective: input.objective ?? "lead_gen",
        channel: input.channel ?? "web",
        language: input.language ?? "es",
        level: input.level ?? "professional",
        qa_score: input.qa_score ?? 0,
        approved_by_client: input.approved_by_client ?? false,
        revisions_count: input.revisions_count ?? 0,
        conversion_rate: input.conversion_rate ?? null,
        lead_count: input.lead_count ?? 0,
        client_rating: input.client_rating ?? null,
        delivery_time_hours: input.delivery_time_hours ?? 0,
        result_status: input.result_status ?? "generated",
        notes: input.notes ?? undefined,
        created_at: new Date().toISOString(),
      }),
    );
    writeLocalOutcomes(local);
    return { id, mode: "local" };
  }

  async listOutcomes(filter?: Partial<TemplateSlice>): Promise<TemplateOutcome[]> {
    if (learningDbEnabled()) {
      try {
        const clauses: string[] = [];
        const params: unknown[] = [];
        let i = 1;
        if (filter?.category) {
          clauses.push(`category = $${i++}`);
          params.push(filter.category);
        }
        if (filter?.sector) {
          clauses.push(`sector = $${i++}`);
          params.push(filter.sector);
        }
        if (filter?.service) {
          clauses.push(`service = $${i++}`);
          params.push(filter.service);
        }
        const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
        const rows = await dbQuery<OutcomeRow>(
          `SELECT id, workspace_id, template_id, category, sector, service, objective, channel, language, level,
                  qa_score, approved_by_client, revisions_count, conversion_rate, lead_count, client_rating,
                  delivery_time_hours, result_status, notes, metadata, created_at
           FROM template_outcomes ${where}
           ORDER BY created_at DESC
           LIMIT 500`,
          params,
        );
        if (rows) return rows.map(rowToOutcome);
      } catch {
        /* fallback local */
      }
    }

    let outcomes = readLocalOutcomes();
    if (filter?.category) outcomes = outcomes.filter((o) => o.category === filter.category);
    if (filter?.sector) outcomes = outcomes.filter((o) => o.sector === filter.sector);
    if (filter?.service) outcomes = outcomes.filter((o) => o.service === filter.service);
    return outcomes;
  }

  aggregateOutcomes(outcomes: TemplateOutcome[]) {
    return aggregateOutcomes(outcomes);
  }

  async rankTemplatesFromDb(slice: TemplateSlice): Promise<TemplateScoreBreakdown[]> {
    const registry = loadTemplateRegistry();
    const outcomes = await this.listOutcomes({
      category: slice.category,
      sector: slice.sector,
      service: slice.service,
    });
    return rankTemplatesForSlice(slice, outcomes, registry.templates);
  }
}

export const templateOutcomeRepository = new TemplateOutcomeRepository();

/** Test helper — reset local file and pool */
export function resetTemplateOutcomeStorageForTests(): void {
  if (existsSync(LOCAL_OUTCOMES_PATH)) {
    writeFileSync(LOCAL_OUTCOMES_PATH, "[]");
  }
}

export { LOCAL_OUTCOMES_PATH };
