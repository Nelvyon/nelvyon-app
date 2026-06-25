/**
 * SaasFunnelService — multi-step funnel CRUD + A/B variants + publish + analytics v2.
 * Tables: saas_funnels + saas_funnel_steps (mig 425) + variants + events (mig 445).
 */
import { DbClient } from "../db/DbClient";
import type { SaasPostgresPort } from "./SaasOnboardingService";

export class SaasFunnelError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = "SaasFunnelError";
  }
}

export type FunnelStatus = "draft" | "active" | "paused" | "archived";
export type FunnelStepType = "landing" | "form" | "video" | "checkout" | "upsell" | "thankyou";
export type FunnelEventType = "visit" | "conversion" | "checkout_start" | "checkout_complete";

export type FunnelVariant = {
  id: string;
  stepId: string;
  variantKey: "A" | "B";
  content: Record<string, unknown>;
  weightPct: number;
  visitors: number;
  conversions: number;
  createdAt: string;
  updatedAt: string;
};

export type FunnelEvent = {
  id: string;
  funnelId: string;
  stepId: string | null;
  variantKey: string | null;
  eventType: FunnelEventType;
  sessionId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type CreateVariantInput = {
  variantKey: "A" | "B";
  content?: Record<string, unknown>;
  weightPct?: number;
};

export type RecordEventInput = {
  funnelId: string;
  stepId?: string | null;
  variantKey?: string | null;
  eventType: FunnelEventType;
  sessionId?: string | null;
  metadata?: Record<string, unknown>;
};

export type FunnelStep = {
  id: string;
  funnelId: string;
  tenantId: string;
  stepOrder: number;
  type: FunnelStepType;
  name: string;
  content: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  visitors: number;
  conversions: number;
  createdAt: string;
  updatedAt: string;
};

export type Funnel = {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  status: FunnelStatus;
  slug: string | null;
  publicSlug: string | null;
  publishedAt: string | null;
  stepsCount: number;
  steps: FunnelStep[];
  totalVisitors: number;
  totalConversions: number;
  createdAt: string;
  updatedAt: string;
};

export type CreateFunnelInput = {
  name: string;
  description?: string | null;
  steps?: Array<{ type: FunnelStepType; name: string; ctaLabel?: string; ctaUrl?: string; content?: string }>;
};

export type UpdateFunnelInput = Partial<Pick<Funnel, "name" | "description" | "status">>;
export type CreateFunnelStepInput = { type: FunnelStepType; name: string; content?: string | null; ctaLabel?: string | null; ctaUrl?: string | null };
export type UpdateFunnelStepInput = Partial<CreateFunnelStepInput & { stepOrder: number }>;

type FunnelRow = { id: string; tenant_id: string; name: string; description: string | null; status: string; slug: string | null; public_slug: string | null; published_at: Date | null; steps_count: number; created_at: Date; updated_at: Date };
type VariantRow = { id: string; step_id: string; variant_key: string; content: Record<string, unknown>; weight_pct: number; visitors: number; conversions: number; created_at: Date; updated_at: Date };
type StepRow = { id: string; funnel_id: string; tenant_id: string; step_order: number; type: string; name: string; content: string | null; cta_label: string | null; cta_url: string | null; visitors: number; conversions: number; created_at: Date; updated_at: Date };

const STEP_TYPES: FunnelStepType[] = ["landing", "form", "video", "checkout", "upsell", "thankyou"];

function rowToStep(r: StepRow): FunnelStep {
  return {
    id: r.id, funnelId: r.funnel_id, tenantId: r.tenant_id, stepOrder: r.step_order,
    type: r.type as FunnelStepType, name: r.name, content: r.content, ctaLabel: r.cta_label,
    ctaUrl: r.cta_url, visitors: r.visitors, conversions: r.conversions,
    createdAt: new Date(r.created_at).toISOString(), updatedAt: new Date(r.updated_at).toISOString(),
  };
}

function rowToFunnel(r: FunnelRow, steps: FunnelStep[]): Funnel {
  return {
    id: r.id, tenantId: r.tenant_id, name: r.name, description: r.description,
    status: r.status as FunnelStatus, slug: r.slug,
    publicSlug: r.public_slug ?? null,
    publishedAt: r.published_at ? new Date(r.published_at).toISOString() : null,
    stepsCount: r.steps_count, steps,
    totalVisitors: steps.reduce((s, st) => s + st.visitors, 0),
    totalConversions: steps.reduce((s, st) => s + st.conversions, 0),
    createdAt: new Date(r.created_at).toISOString(), updatedAt: new Date(r.updated_at).toISOString(),
  };
}

function rowToVariant(r: VariantRow): FunnelVariant {
  return {
    id: r.id, stepId: r.step_id, variantKey: r.variant_key as "A" | "B",
    content: r.content, weightPct: r.weight_pct,
    visitors: Number(r.visitors), conversions: Number(r.conversions),
    createdAt: new Date(r.created_at).toISOString(), updatedAt: new Date(r.updated_at).toISOString(),
  };
}

function generatePublicSlug(name: string): string {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base}-${suffix}`;
}

/** Deterministic variant pick based on session_id hash (same user = same variant). */
function pickVariantFromList(variants: FunnelVariant[], sessionId: string): FunnelVariant | null {
  if (!variants.length) return null;
  const hash = sessionId.split("").reduce((acc, c) => (((acc * 31) >>> 0) + c.charCodeAt(0)) >>> 0, 0);
  const slot = hash % 100;
  let cumulative = 0;
  for (const v of variants) {
    cumulative += v.weightPct;
    if (slot < cumulative) return v;
  }
  return variants[variants.length - 1] ?? null;
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
}

export class SaasFunnelService {
  constructor(private readonly db: SaasPostgresPort = DbClient.getInstance()) {}

  async list(tenantId: string): Promise<Funnel[]> {
    const funnels = await this.db.query<FunnelRow>(
      `SELECT id,tenant_id,name,description,status,slug,public_slug,published_at,steps_count,created_at,updated_at
       FROM saas_funnels WHERE tenant_id=$1 ORDER BY updated_at DESC`,
      [tenantId],
    );
    if (!funnels.length) return [];
    const ids = funnels.map(f => f.id);
    const steps = await this.db.query<StepRow>(
      `SELECT id,funnel_id,tenant_id,step_order,type,name,content,cta_label,cta_url,visitors,conversions,created_at,updated_at
       FROM saas_funnel_steps WHERE funnel_id = ANY($1::uuid[]) ORDER BY funnel_id,step_order ASC`,
      [ids],
    );
    const stepsByFunnel = new Map<string, FunnelStep[]>();
    for (const s of steps) {
      const arr = stepsByFunnel.get(s.funnel_id) ?? [];
      arr.push(rowToStep(s));
      stepsByFunnel.set(s.funnel_id, arr);
    }
    return funnels.map(f => rowToFunnel(f, stepsByFunnel.get(f.id) ?? []));
  }

  async get(tenantId: string, id: string): Promise<Funnel | null> {
    const rows = await this.db.query<FunnelRow>(
      `SELECT id,tenant_id,name,description,status,slug,public_slug,published_at,steps_count,created_at,updated_at
       FROM saas_funnels WHERE tenant_id=$1 AND id=$2 LIMIT 1`,
      [tenantId, id],
    );
    if (!rows[0]) return null;
    const steps = await this.db.query<StepRow>(
      `SELECT id,funnel_id,tenant_id,step_order,type,name,content,cta_label,cta_url,visitors,conversions,created_at,updated_at
       FROM saas_funnel_steps WHERE funnel_id=$1 ORDER BY step_order ASC`,
      [id],
    );
    return rowToFunnel(rows[0], steps.map(rowToStep));
  }

  async create(tenantId: string, input: CreateFunnelInput): Promise<Funnel> {
    if (!input.name.trim()) throw new SaasFunnelError("name is required", "VALIDATION");
    const slug = slugify(input.name);
    const rows = await this.db.query<FunnelRow>(
      `INSERT INTO saas_funnels (tenant_id,name,description,slug,steps_count,updated_at)
       VALUES ($1,$2,$3,$4,0,NOW())
       RETURNING id,tenant_id,name,description,status,slug,steps_count,created_at,updated_at`,
      [tenantId, input.name.trim(), input.description ?? null, slug],
    );
    if (!rows[0]) throw new SaasFunnelError("Failed to create funnel", "DB_ERROR");
    const funnel = rows[0];

    const stepInputs = input.steps ?? [
      { type: "landing" as FunnelStepType, name: "Landing Page" },
      { type: "form" as FunnelStepType, name: "Formulario de captación" },
      { type: "thankyou" as FunnelStepType, name: "Página de gracias" },
    ];

    for (let i = 0; i < stepInputs.length; i++) {
      const s = stepInputs[i];
      if (!STEP_TYPES.includes(s.type)) throw new SaasFunnelError(`Invalid step type: ${s.type}`, "VALIDATION");
      await this.db.query(
        `INSERT INTO saas_funnel_steps (funnel_id,tenant_id,step_order,type,name,content,cta_label,cta_url,updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())`,
        [funnel.id, tenantId, i, s.type, s.name, s.content ?? null, s.ctaLabel ?? null, s.ctaUrl ?? null],
      );
    }
    await this.db.query(
      `UPDATE saas_funnels SET steps_count=$1,updated_at=NOW() WHERE id=$2`,
      [stepInputs.length, funnel.id],
    );

    return (await this.get(tenantId, funnel.id))!;
  }

  async update(tenantId: string, id: string, input: UpdateFunnelInput): Promise<Funnel> {
    const sets: string[] = ["updated_at=NOW()"];
    const params: unknown[] = [tenantId, id];
    let idx = 3;
    if (input.name !== undefined) { sets.push(`name=$${idx++}`); params.push(input.name.trim()); }
    if (input.description !== undefined) { sets.push(`description=$${idx++}`); params.push(input.description); }
    if (input.status !== undefined) { sets.push(`status=$${idx++}`); params.push(input.status); }
    await this.db.query(
      `UPDATE saas_funnels SET ${sets.join(",")} WHERE tenant_id=$1 AND id=$2`,
      params,
    );
    const updated = await this.get(tenantId, id);
    if (!updated) throw new SaasFunnelError("Funnel not found", "NOT_FOUND");
    return updated;
  }

  async publish(tenantId: string, id: string): Promise<Funnel> {
    const funnel = await this.get(tenantId, id);
    if (!funnel) throw new SaasFunnelError("Funnel not found", "NOT_FOUND");
    if (funnel.steps.length === 0) throw new SaasFunnelError("Cannot publish a funnel with no steps", "VALIDATION");
    const publicSlug = funnel.publicSlug ?? generatePublicSlug(funnel.name);
    await this.db.query(
      `UPDATE saas_funnels SET status='active', public_slug=$3, published_at=NOW(), updated_at=NOW()
       WHERE tenant_id=$1 AND id=$2`,
      [tenantId, id, publicSlug],
    );
    return (await this.get(tenantId, id))!;
  }

  async pause(tenantId: string, id: string): Promise<Funnel> {
    const funnel = await this.get(tenantId, id);
    if (!funnel) throw new SaasFunnelError("Funnel not found", "NOT_FOUND");
    if (funnel.status !== "active") throw new SaasFunnelError("Only active funnels can be paused", "VALIDATION");
    return this.update(tenantId, id, { status: "paused" });
  }

  // ── A/B Variants ──────────────────────────────────────────────────────────

  async listVariants(stepId: string): Promise<FunnelVariant[]> {
    const rows = await this.db.query<VariantRow>(
      `SELECT id,step_id,variant_key,content,weight_pct,visitors,conversions,created_at,updated_at
       FROM saas_funnel_step_variants WHERE step_id=$1 ORDER BY variant_key ASC`,
      [stepId],
    );
    return rows.map(rowToVariant);
  }

  async createVariant(stepId: string, input: CreateVariantInput): Promise<FunnelVariant> {
    if (input.variantKey !== "A" && input.variantKey !== "B") {
      throw new SaasFunnelError("variantKey must be A or B", "VALIDATION");
    }
    const weightPct = input.weightPct ?? 50;
    if (weightPct < 0 || weightPct > 100) throw new SaasFunnelError("weightPct must be 0–100", "VALIDATION");
    const rows = await this.db.query<VariantRow>(
      `INSERT INTO saas_funnel_step_variants (step_id, variant_key, content, weight_pct, updated_at)
       VALUES ($1,$2,$3,$4,NOW())
       ON CONFLICT (step_id, variant_key) DO UPDATE
         SET content=$3, weight_pct=$4, updated_at=NOW()
       RETURNING id,step_id,variant_key,content,weight_pct,visitors,conversions,created_at,updated_at`,
      [stepId, input.variantKey, JSON.stringify(input.content ?? {}), weightPct],
    );
    if (!rows[0]) throw new SaasFunnelError("Failed to create variant", "DB_ERROR");
    return rowToVariant(rows[0]);
  }

  async updateVariant(variantId: string, input: Partial<Pick<CreateVariantInput, "content" | "weightPct">>): Promise<FunnelVariant> {
    const sets: string[] = ["updated_at=NOW()"];
    const params: unknown[] = [variantId];
    let idx = 2;
    if (input.content !== undefined) { sets.push(`content=$${idx++}`); params.push(JSON.stringify(input.content)); }
    if (input.weightPct !== undefined) {
      if (input.weightPct < 0 || input.weightPct > 100) throw new SaasFunnelError("weightPct must be 0–100", "VALIDATION");
      sets.push(`weight_pct=$${idx++}`); params.push(input.weightPct);
    }
    const rows = await this.db.query<VariantRow>(
      `UPDATE saas_funnel_step_variants SET ${sets.join(",")} WHERE id=$1
       RETURNING id,step_id,variant_key,content,weight_pct,visitors,conversions,created_at,updated_at`,
      params,
    );
    if (!rows[0]) throw new SaasFunnelError("Variant not found", "NOT_FOUND");
    return rowToVariant(rows[0]);
  }

  /** Deterministic A/B pick for a session. Returns null if no variants configured. */
  async pickVariant(stepId: string, sessionId: string): Promise<FunnelVariant | null> {
    const variants = await this.listVariants(stepId);
    return pickVariantFromList(variants, sessionId);
  }

  // ── Events ────────────────────────────────────────────────────────────────

  async recordEvent(tenantId: string, input: RecordEventInput): Promise<void> {
    await this.db.query(
      `INSERT INTO saas_funnel_events (funnel_id, step_id, variant_key, event_type, session_id, metadata)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [
        input.funnelId,
        input.stepId ?? null,
        input.variantKey ?? null,
        input.eventType,
        input.sessionId ?? null,
        JSON.stringify(input.metadata ?? {}),
      ],
    );
    // Increment counters
    if (input.stepId) {
      if (input.eventType === "visit") {
        await this.db.query(
          `UPDATE saas_funnel_steps SET visitors=visitors+1, updated_at=NOW() WHERE id=$1 AND tenant_id=$2`,
          [input.stepId, tenantId],
        );
        if (input.variantKey) {
          await this.db.query(
            `UPDATE saas_funnel_step_variants SET visitors=visitors+1, updated_at=NOW()
             WHERE step_id=$1 AND variant_key=$2`,
            [input.stepId, input.variantKey],
          );
        }
      } else if (input.eventType === "conversion") {
        await this.db.query(
          `UPDATE saas_funnel_steps SET conversions=conversions+1, updated_at=NOW() WHERE id=$1 AND tenant_id=$2`,
          [input.stepId, tenantId],
        );
        if (input.variantKey) {
          await this.db.query(
            `UPDATE saas_funnel_step_variants SET conversions=conversions+1, updated_at=NOW()
             WHERE step_id=$1 AND variant_key=$2`,
            [input.stepId, input.variantKey],
          );
        }
      }
    }
  }

  // ── Public lookup ─────────────────────────────────────────────────────────

  async getByPublicSlug(publicSlug: string): Promise<Funnel | null> {
    const rows = await this.db.query<FunnelRow>(
      `SELECT id,tenant_id,name,description,status,slug,public_slug,published_at,steps_count,created_at,updated_at
       FROM saas_funnels WHERE public_slug=$1 AND status='active' LIMIT 1`,
      [publicSlug],
    );
    if (!rows[0]) return null;
    const steps = await this.db.query<StepRow>(
      `SELECT id,funnel_id,tenant_id,step_order,type,name,content,cta_label,cta_url,visitors,conversions,created_at,updated_at
       FROM saas_funnel_steps WHERE funnel_id=$1 ORDER BY step_order ASC`,
      [rows[0].id],
    );
    return rowToFunnel(rows[0], steps.map(rowToStep));
  }

  // ── Analytics v2 ──────────────────────────────────────────────────────────

  async delete(tenantId: string, id: string): Promise<void> {
    const rows = await this.db.query<{ id: string }>(
      `DELETE FROM saas_funnels WHERE tenant_id=$1 AND id=$2 RETURNING id`,
      [tenantId, id],
    );
    if (!rows[0]) throw new SaasFunnelError("Funnel not found", "NOT_FOUND");
  }

  async addStep(tenantId: string, funnelId: string, input: CreateFunnelStepInput): Promise<FunnelStep> {
    const funnel = await this.get(tenantId, funnelId);
    if (!funnel) throw new SaasFunnelError("Funnel not found", "NOT_FOUND");
    if (!STEP_TYPES.includes(input.type)) throw new SaasFunnelError(`Invalid step type: ${input.type}`, "VALIDATION");
    const nextOrder = funnel.steps.length;
    const rows = await this.db.query<StepRow>(
      `INSERT INTO saas_funnel_steps (funnel_id,tenant_id,step_order,type,name,content,cta_label,cta_url,updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())
       RETURNING id,funnel_id,tenant_id,step_order,type,name,content,cta_label,cta_url,visitors,conversions,created_at,updated_at`,
      [funnelId, tenantId, nextOrder, input.type, input.name, input.content ?? null, input.ctaLabel ?? null, input.ctaUrl ?? null],
    );
    await this.db.query(
      `UPDATE saas_funnels SET steps_count=steps_count+1,updated_at=NOW() WHERE id=$1`,
      [funnelId],
    );
    if (!rows[0]) throw new SaasFunnelError("Failed to add step", "DB_ERROR");
    return rowToStep(rows[0]);
  }

  async updateStep(tenantId: string, stepId: string, input: UpdateFunnelStepInput): Promise<FunnelStep> {
    const sets: string[] = ["updated_at=NOW()"];
    const params: unknown[] = [stepId, tenantId];
    let idx = 3;
    if (input.name !== undefined) { sets.push(`name=$${idx++}`); params.push(input.name); }
    if (input.type !== undefined) { sets.push(`type=$${idx++}`); params.push(input.type); }
    if (input.content !== undefined) { sets.push(`content=$${idx++}`); params.push(input.content); }
    if (input.ctaLabel !== undefined) { sets.push(`cta_label=$${idx++}`); params.push(input.ctaLabel); }
    if (input.ctaUrl !== undefined) { sets.push(`cta_url=$${idx++}`); params.push(input.ctaUrl); }
    const rows = await this.db.query<StepRow>(
      `UPDATE saas_funnel_steps SET ${sets.join(",")} WHERE id=$1 AND tenant_id=$2
       RETURNING id,funnel_id,tenant_id,step_order,type,name,content,cta_label,cta_url,visitors,conversions,created_at,updated_at`,
      params,
    );
    if (!rows[0]) throw new SaasFunnelError("Step not found", "NOT_FOUND");
    return rowToStep(rows[0]);
  }

  async deleteStep(tenantId: string, stepId: string): Promise<void> {
    const rows = await this.db.query<{ funnel_id: string }>(
      `DELETE FROM saas_funnel_steps WHERE id=$1 AND tenant_id=$2 RETURNING funnel_id`,
      [stepId, tenantId],
    );
    if (!rows[0]) throw new SaasFunnelError("Step not found", "NOT_FOUND");
    await this.db.query(
      `UPDATE saas_funnels SET steps_count=GREATEST(0,steps_count-1),updated_at=NOW() WHERE id=$1`,
      [rows[0].funnel_id],
    );
  }

  /** Increment visitor count for a step (called when someone enters the step). */
  async trackVisitor(tenantId: string, stepId: string): Promise<void> {
    const rows = await this.db.query<{ id: string }>(
      `UPDATE saas_funnel_steps SET visitors=visitors+1, updated_at=NOW()
       WHERE id=$1 AND tenant_id=$2 RETURNING id`,
      [stepId, tenantId],
    );
    if (!rows[0]) throw new SaasFunnelError("Step not found", "NOT_FOUND");
  }

  /** Increment conversion count for a step (called when someone completes the step CTA). */
  async trackConversion(tenantId: string, stepId: string): Promise<void> {
    const rows = await this.db.query<{ id: string }>(
      `UPDATE saas_funnel_steps SET conversions=conversions+1, updated_at=NOW()
       WHERE id=$1 AND tenant_id=$2 RETURNING id`,
      [stepId, tenantId],
    );
    if (!rows[0]) throw new SaasFunnelError("Step not found", "NOT_FOUND");
  }

  /** Analytics v2 — per-step CVR, drop-off, and per-variant breakdown. */
  async getAnalytics(tenantId: string, funnelId: string): Promise<{
    funnelId: string; totalVisitors: number; totalConversions: number; overallCvr: number;
    steps: Array<{
      id: string; name: string; type: string; stepOrder: number;
      visitors: number; conversions: number; cvr: number; dropOff: number;
      variants: Array<{ variantKey: string; visitors: number; conversions: number; cvr: number }>;
    }>;
  }> {
    const funnel = await this.get(tenantId, funnelId);
    if (!funnel) throw new SaasFunnelError("Funnel not found", "NOT_FOUND");

    const allVariants = funnel.steps.length
      ? await this.db.query<VariantRow>(
          `SELECT id,step_id,variant_key,content,weight_pct,visitors,conversions,created_at,updated_at
           FROM saas_funnel_step_variants WHERE step_id = ANY($1::uuid[])`,
          [funnel.steps.map(s => s.id)],
        )
      : [];

    const variantsByStep = new Map<string, VariantRow[]>();
    for (const v of allVariants) {
      const arr = variantsByStep.get(v.step_id) ?? [];
      arr.push(v);
      variantsByStep.set(v.step_id, arr);
    }

    const steps = funnel.steps.map((s, i) => {
      const nextVisitors = funnel.steps[i + 1]?.visitors ?? 0;
      const cvr = s.visitors > 0 ? Math.round((s.conversions / s.visitors) * 1000) / 10 : 0;
      const dropOff = s.visitors > 0 && i < funnel.steps.length - 1
        ? Math.round(((s.visitors - nextVisitors) / s.visitors) * 1000) / 10
        : 0;
      const variants = (variantsByStep.get(s.id) ?? []).map(v => ({
        variantKey: v.variant_key,
        visitors: Number(v.visitors),
        conversions: Number(v.conversions),
        cvr: Number(v.visitors) > 0 ? Math.round((Number(v.conversions) / Number(v.visitors)) * 1000) / 10 : 0,
      }));
      return { id: s.id, name: s.name, type: s.type, stepOrder: s.stepOrder, visitors: s.visitors, conversions: s.conversions, cvr, dropOff, variants };
    });

    const overallCvr = funnel.totalVisitors > 0
      ? Math.round((funnel.totalConversions / funnel.totalVisitors) * 1000) / 10
      : 0;
    return { funnelId, totalVisitors: funnel.totalVisitors, totalConversions: funnel.totalConversions, overallCvr, steps };
  }
}

let _instance: SaasFunnelService | null = null;
export function getSaasFunnelService(): SaasFunnelService {
  if (!_instance) _instance = new SaasFunnelService();
  return _instance;
}
export function resetSaasFunnelServiceForTests(): void { _instance = null; }
