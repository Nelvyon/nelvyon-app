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
  isActive?: boolean;
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

  async updatePlan(
    tenantId: string,
    planId: string,
    patch: Partial<CreatePlanInput> & { isActive?: boolean },
  ): Promise<MembershipPlan> {
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
         is_active               = $9,
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
        patch.isActive !== undefined ? patch.isActive : current.isActive,
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
    // `active` no pisa un estado terminal.
    //
    // Stripe NO garantiza el orden de entrega y reintenta durante dias. Sin esta
    // condicion, un `customer.subscription.created` que llegara —o se reintentara—
    // DESPUES del `deleted` que ya se proceso devolvia la fila a `active`, y con
    // ella el acceso al material de pago de alguien que se dio de baja:
    // `checkAccess` abre justamente con `m.status='active'`.
    //
    // No hace falta ningun ataque para provocarlo; basta con que Stripe reintente,
    // que es su comportamiento normal y documentado.
    //
    // Reactivar una suscripcion cancelada no llega por `created` —Stripe manda
    // `customer.subscription.updated`, que la ruta de membresia no trata—, asi que
    // un `created` sobre una baja es siempre una entrega fuera de orden.
    await this.db.query(
      `UPDATE saas_membership_members SET status=$3, updated_at=NOW()
       WHERE tenant_id=$1 AND stripe_subscription_id=$2
         AND NOT ($3 = 'active' AND status IN ('cancelled', 'expired'))`,
      [tenantId, stripeSubscriptionId, status]
    );
  }

  /**
   * Devuelve el acceso a quien caducó por impago y ha vuelto a pagar.
   *
   * EL AGUJERO QUE CIERRA
   * =====================
   * `updateMemberStatus` impide, con razón, que un `active` fuera de orden pise
   * un estado terminal. Pero el único evento que llevaba a `active` era
   * `customer.subscription.created`, y ése no se repite: se emite una vez, al
   * crear la suscripción.
   *
   * Consecuencia: quien caducaba por un impago **no volvía nunca**, aunque
   * pagara al día siguiente. Stripe cobraba y NELVYON seguía cerrado. Es el peor
   * de los dos errores posibles en un cobro recurrente, porque el cliente ya ha
   * pagado.
   *
   * POR QUÉ ESTO NO ES «QUITAR LA PROTECCIÓN»
   * ==========================================
   * La protección de `updateMemberStatus` existe porque un `created` que llega
   * tarde **no significa nada**: no es noticia de un pago, es la reentrega de un
   * evento viejo. Usarlo como reactivación era el agujero del Bloque 1, y no se
   * recupera.
   *
   * `invoice.payment_succeeded` es otra cosa: es la noticia de que **acaba de
   * entrar dinero**. Reactivar con eso no es fiarse del orden de entrega, es
   * fiarse del cobro — que es exactamente lo que decide si alguien tiene derecho
   * a entrar.
   *
   * Y la reactivación se acota a un solo salto:
   *
   *     expired   ──(pago)──>  active
   *     cancelled ──────────>  cancelled   (no se mueve)
   *
   * `expired` significa «se le cayó el cobro». `cancelled` significa «se dio de
   * baja», y una baja no la deshace un cobro rezagado: la deshace volver a
   * suscribirse, que emite un `created` nuevo con su propia suscripción.
   *
   * LA ÚNICA DECISIÓN QUE SIGUE SIENDO DE PRODUCTO
   * ===============================================
   * Si una baja explícita debería poder revivir con un pago posterior. Aquí se
   * responde que NO, que es la dirección que cierra: si se equivoca, alguien que
   * pagó llama y se le reactiva a mano. Al revés —abrir el material de pago a
   * quien se dio de baja— no lo llama nadie a decírtelo.
   */
  async reactivarPorPago(tenantId: string, stripeSubscriptionId: string): Promise<boolean> {
    const filas = await this.db.query<{ id: string }>(
      `UPDATE saas_membership_members SET status='active', updated_at=NOW()
       WHERE tenant_id=$1 AND stripe_subscription_id=$2
         AND status = 'expired'
       RETURNING id::text`,
      [tenantId, stripeSubscriptionId]
    );
    return filas.length > 0;
  }

  /**
   * El inquilino dueño de una suscripción de Stripe.
   *
   * Hace falta porque los eventos de FACTURA no traen `metadata.tenant_id`: la
   * metadata vive en la suscripción, no en la factura que genera. La ruta leía
   * `event.data.object.metadata.tenant_id` para todos los eventos por igual, y
   * en los de factura salía vacío — con lo que la petición se descartaba entera.
   *
   * Es una consulta ENTRE INQUILINOS a propósito, y es legítima: un webhook de
   * Stripe no tiene sesión detrás, así que no puede saber de quién es hasta que
   * lo pregunta. Lo que la acota es que sólo busca por un identificador que
   * emite Stripe (`sub_…`) y sólo devuelve el inquilino, nada más.
   */
  async inquilinoDeLaSuscripcion(stripeSubscriptionId: string): Promise<string | null> {
    if (!stripeSubscriptionId) return null;
    const filas = await this.db.query<{ tenant_id: string }>(
      `SELECT tenant_id::text FROM saas_membership_members
        WHERE stripe_subscription_id = $1
        ORDER BY updated_at DESC LIMIT 1`,
      [stripeSubscriptionId]
    );
    return filas[0]?.tenant_id ?? null;
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
