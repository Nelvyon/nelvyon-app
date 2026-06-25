/**
 * SaasMembershipService — membership plans, member management, resource gating.
 * Tables: saas_membership_plans, saas_membership_members, saas_membership_access
 * (migration 451).
 */
import { DbClient } from "../db/DbClient";
import type { SaasPostgresPort } from "./SaasOnboardingService";

// ── Error ─────────────────────────────────────────────────────────────────────

export class SaasMembershipError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = "SaasMembershipError";
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type BillingInterval = "month" | "year" | "lifetime";
export type MemberStatus = "active" | "cancelled" | "expired";
export type AccessResourceType = "course" | "community";

export interface MembershipPlanIncludes {
  courses: string[];
  communities: string[];
  features: string[];
}

export interface MembershipPlan {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  priceAmount: number;
  priceCurrency: string;
  billingInterval: BillingInterval;
  includes: MembershipPlanIncludes;
  affiliateCommissionPct: number;
  isActive: boolean;
  stripePriceId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MembershipMember {
  id: string;
  tenantId: string;
  planId: string;
  contactId: string | null;
  contactEmail: string;
  status: MemberStatus;
  stripeSubscriptionId: string | null;
  startsAt: string;
  expiresAt: string | null;
  affiliateRef: string | null;
  createdAt: string;
}

export interface MembershipAccess {
  id: string;
  tenantId: string;
  memberId: string;
  resourceType: AccessResourceType;
  resourceId: string;
  grantedAt: string;
}

export interface CreatePlanInput {
  name: string;
  slug?: string;
  priceAmount?: number;
  priceCurrency?: string;
  billingInterval?: BillingInterval;
  includes?: Partial<MembershipPlanIncludes>;
  affiliateCommissionPct?: number;
  stripePriceId?: string | null;
}

export interface SubscribeMemberInput {
  planId: string;
  contactEmail: string;
  contactId?: string | null;
  stripeSubscriptionId?: string | null;
  affiliateRef?: string | null;
  expiresAt?: string | null;
}

export interface MemberPortal {
  plans: MembershipPlan[];
  courses: string[];
  communities: string[];
}

// ── DB row mappers ─────────────────────────────────────────────────────────────

interface PlanRow {
  id: string; tenant_id: string; name: string; slug: string;
  price_amount: string; price_currency: string; billing_interval: string;
  includes: MembershipPlanIncludes; affiliate_commission_pct: string;
  is_active: boolean; stripe_price_id: string | null;
  created_at: string; updated_at: string;
}

interface MemberRow {
  id: string; tenant_id: string; plan_id: string; contact_id: string | null;
  contact_email: string; status: string; stripe_subscription_id: string | null;
  starts_at: string; expires_at: string | null; affiliate_ref: string | null;
  created_at: string;
}

function rowToPlan(r: PlanRow): MembershipPlan {
  return {
    id: r.id, tenantId: r.tenant_id, name: r.name, slug: r.slug,
    priceAmount: Number(r.price_amount),
    priceCurrency: r.price_currency,
    billingInterval: r.billing_interval as BillingInterval,
    includes: r.includes ?? { courses: [], communities: [], features: [] },
    affiliateCommissionPct: Number(r.affiliate_commission_pct),
    isActive: Boolean(r.is_active),
    stripePriceId: r.stripe_price_id,
    createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

function rowToMember(r: MemberRow): MembershipMember {
  return {
    id: r.id, tenantId: r.tenant_id, planId: r.plan_id,
    contactId: r.contact_id, contactEmail: r.contact_email,
    status: r.status as MemberStatus,
    stripeSubscriptionId: r.stripe_subscription_id,
    startsAt: r.starts_at, expiresAt: r.expires_at,
    affiliateRef: r.affiliate_ref, createdAt: r.created_at,
  };
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// ── Service ───────────────────────────────────────────────────────────────────

export class SaasMembershipService {
  constructor(private readonly db: SaasPostgresPort = DbClient.getInstance()) {}

  // ── Plans ─────────────────────────────────────────────────────────────────

  async listPlans(tenantId: string, activeOnly = false): Promise<MembershipPlan[]> {
    const cond = activeOnly ? `AND is_active = true` : "";
    const rows = await this.db.query<PlanRow>(
      `SELECT * FROM saas_membership_plans WHERE tenant_id=$1 ${cond} ORDER BY price_amount`,
      [tenantId]
    );
    return rows.map(rowToPlan);
  }

  async createPlan(tenantId: string, input: CreatePlanInput): Promise<MembershipPlan> {
    if (!input.name?.trim()) throw new SaasMembershipError("name is required", "VALIDATION");
    const slug = input.slug?.trim() || slugify(input.name);
    const includes: MembershipPlanIncludes = {
      courses: input.includes?.courses ?? [],
      communities: input.includes?.communities ?? [],
      features: input.includes?.features ?? [],
    };
    const rows = await this.db.query<PlanRow>(
      `INSERT INTO saas_membership_plans
         (tenant_id, name, slug, price_amount, price_currency, billing_interval,
          includes, affiliate_commission_pct, stripe_price_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9)
       RETURNING *`,
      [
        tenantId, input.name.trim(), slug,
        input.priceAmount ?? 0,
        input.priceCurrency ?? "EUR",
        input.billingInterval ?? "month",
        JSON.stringify(includes),
        input.affiliateCommissionPct ?? 0,
        input.stripePriceId ?? null,
      ]
    );
    if (!rows[0]) throw new SaasMembershipError("Failed to create plan", "DB_ERROR");
    return rowToPlan(rows[0]);
  }

  async updatePlan(tenantId: string, planId: string, patch: Partial<CreatePlanInput>): Promise<MembershipPlan> {
    const existing = await this.db.query<PlanRow>(
      `SELECT * FROM saas_membership_plans WHERE id=$1 AND tenant_id=$2 LIMIT 1`,
      [planId, tenantId]
    );
    if (!existing[0]) throw new SaasMembershipError("Plan not found", "NOT_FOUND");
    const current = rowToPlan(existing[0]);
    const includes: MembershipPlanIncludes = {
      courses: patch.includes?.courses ?? current.includes.courses,
      communities: patch.includes?.communities ?? current.includes.communities,
      features: patch.includes?.features ?? current.includes.features,
    };
    const rows = await this.db.query<PlanRow>(
      `UPDATE saas_membership_plans SET
         name                    = $3,
         price_amount            = $4,
         billing_interval        = $5,
         includes                = $6::jsonb,
         affiliate_commission_pct = $7,
         stripe_price_id         = $8,
         updated_at              = NOW()
       WHERE id=$1 AND tenant_id=$2
       RETURNING *`,
      [
        planId, tenantId,
        patch.name ?? current.name,
        patch.priceAmount ?? current.priceAmount,
        patch.billingInterval ?? current.billingInterval,
        JSON.stringify(includes),
        patch.affiliateCommissionPct ?? current.affiliateCommissionPct,
        patch.stripePriceId !== undefined ? patch.stripePriceId : current.stripePriceId,
      ]
    );
    return rowToPlan(rows[0]!);
  }

  async deletePlan(tenantId: string, planId: string): Promise<void> {
    await this.db.query(
      `DELETE FROM saas_membership_plans WHERE id=$1 AND tenant_id=$2`,
      [planId, tenantId]
    );
  }

  // ── Members ───────────────────────────────────────────────────────────────

  async subscribeMember(tenantId: string, input: SubscribeMemberInput): Promise<MembershipMember> {
    const plan = await this.db.query<PlanRow>(
      `SELECT * FROM saas_membership_plans WHERE id=$1 AND tenant_id=$2 AND is_active=true LIMIT 1`,
      [input.planId, tenantId]
    );
    if (!plan[0]) throw new SaasMembershipError("Plan not found or inactive", "NOT_FOUND");

    const rows = await this.db.query<MemberRow>(
      `INSERT INTO saas_membership_members
         (tenant_id, plan_id, contact_id, contact_email, stripe_subscription_id, expires_at, affiliate_ref)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (tenant_id, contact_email, plan_id) DO UPDATE SET
         status                 = 'active',
         stripe_subscription_id = EXCLUDED.stripe_subscription_id,
         expires_at             = EXCLUDED.expires_at,
         affiliate_ref          = COALESCE(saas_membership_members.affiliate_ref, EXCLUDED.affiliate_ref),
         updated_at             = NOW()
       RETURNING *`,
      [
        tenantId, input.planId,
        input.contactId ?? null,
        input.contactEmail.toLowerCase().trim(),
        input.stripeSubscriptionId ?? null,
        input.expiresAt ?? null,
        input.affiliateRef ?? null,
      ]
    );
    if (!rows[0]) throw new SaasMembershipError("Failed to subscribe", "DB_ERROR");
    const member = rowToMember(rows[0]);

    // Grant access to included resources
    const planData = rowToPlan(plan[0]);
    const resources: Array<{ type: AccessResourceType; id: string }> = [
      ...planData.includes.courses.map((id) => ({ type: "course" as const, id })),
      ...planData.includes.communities.map((id) => ({ type: "community" as const, id })),
    ];
    for (const res of resources) {
      await this.db.query(
        `INSERT INTO saas_membership_access (tenant_id, member_id, resource_type, resource_id)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT DO NOTHING`,
        [tenantId, member.id, res.type, res.id]
      );
    }

    // Affiliate hook: if ref code present, track conversion
    if (input.affiliateRef) {
      try {
        const { getSaasAffiliateService } = await import("./SaasAffiliateService");
        await getSaasAffiliateService().trackConversion(tenantId, input.affiliateRef, planData.priceAmount);
      } catch { /* non-fatal */ }
    }

    return member;
  }

  async listMembers(tenantId: string, planId?: string): Promise<MembershipMember[]> {
    const cond = planId ? `AND plan_id=$2` : "";
    const params = planId ? [tenantId, planId] : [tenantId];
    const rows = await this.db.query<MemberRow>(
      `SELECT * FROM saas_membership_members WHERE tenant_id=$1 ${cond} ORDER BY created_at DESC`,
      params
    );
    return rows.map(rowToMember);
  }

  async cancelMember(tenantId: string, memberId: string): Promise<void> {
    await this.db.query(
      `UPDATE saas_membership_members SET status='cancelled', updated_at=NOW()
       WHERE id=$1 AND tenant_id=$2`,
      [memberId, tenantId]
    );
  }

  async updateMemberStatus(
    tenantId: string,
    stripeSubscriptionId: string,
    status: MemberStatus
  ): Promise<void> {
    await this.db.query(
      `UPDATE saas_membership_members SET status=$3, updated_at=NOW()
       WHERE tenant_id=$1 AND stripe_subscription_id=$2`,
      [tenantId, stripeSubscriptionId, status]
    );
  }

  // ── Access gating ─────────────────────────────────────────────────────────

  async checkAccess(
    tenantId: string,
    contactEmail: string,
    resourceType: AccessResourceType,
    resourceId: string
  ): Promise<boolean> {
    // Direct access grant
    const direct = await this.db.query<{ id: string }>(
      `SELECT a.id FROM saas_membership_access a
       JOIN saas_membership_members m ON m.id = a.member_id
       WHERE a.tenant_id=$1
         AND m.contact_email=$2
         AND m.status='active'
         AND (m.expires_at IS NULL OR m.expires_at > NOW())
         AND a.resource_type=$3
         AND a.resource_id::text=$4
       LIMIT 1`,
      [tenantId, contactEmail.toLowerCase(), resourceType, resourceId]
    );
    if (direct[0]) return true;

    // Also check via plan includes JSONB
    const viaIncludes = await this.db.query<{ id: string }>(
      `SELECT m.id FROM saas_membership_members m
       JOIN saas_membership_plans p ON p.id = m.plan_id
       WHERE m.tenant_id=$1
         AND m.contact_email=$2
         AND m.status='active'
         AND (m.expires_at IS NULL OR m.expires_at > NOW())
         AND p.includes->$3 @> to_jsonb($4::text)
       LIMIT 1`,
      [tenantId, contactEmail.toLowerCase(), `${resourceType}s`, resourceId]
    );
    return !!viaIncludes[0];
  }

  async getMemberPortal(tenantId: string, contactEmail: string): Promise<MemberPortal> {
    const rows = await this.db.query<MemberRow & { includes: MembershipPlanIncludes }>(
      `SELECT m.*, p.includes FROM saas_membership_members m
       JOIN saas_membership_plans p ON p.id = m.plan_id
       WHERE m.tenant_id=$1
         AND m.contact_email=$2
         AND m.status='active'
         AND (m.expires_at IS NULL OR m.expires_at > NOW())`,
      [tenantId, contactEmail.toLowerCase()]
    );

    const planIds = [...new Set(rows.map((r) => r.plan_id))];
    const plans = planIds.length > 0
      ? await this.db.query<PlanRow>(
          `SELECT * FROM saas_membership_plans WHERE id = ANY($1::uuid[])`,
          [planIds]
        ).then((r) => r.map(rowToPlan))
      : [];

    const courses = [...new Set(rows.flatMap((r) => r.includes?.courses ?? []))];
    const communities = [...new Set(rows.flatMap((r) => r.includes?.communities ?? []))];

    return { plans, courses, communities };
  }
}

let _svc: SaasMembershipService | null = null;
export function getSaasMembershipService(): SaasMembershipService {
  if (!_svc) _svc = new SaasMembershipService();
  return _svc;
}
export function resetSaasMembershipServiceForTests(): void {
  _svc = null;
}
