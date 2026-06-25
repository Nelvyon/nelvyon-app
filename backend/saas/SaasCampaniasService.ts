import { SendEmailCommand } from "@aws-sdk/client-ses";

import { DbClient } from "../db/DbClient";
import { getSesClient } from "../email/sesClient";
import { signTrackingToken } from "../email/trackingToken";
import type { ContactStatus, PipelineStage } from "./SaasCrmService";
import type { SaasPostgresPort } from "./SaasOnboardingService";
import { assertSaasPlanCanCreate } from "./saasPlanQuota";
import { isOpenDealStage, type DealStage } from "./saasDealsDedupe";

const FROM_EMAIL = process.env.SES_FROM_EMAIL ?? "no-reply@nelvyon.com";

async function sendCampaniaEmail(
  to: string,
  subject: string,
  html: string,
  meta?: { campaniaId: string; contactId: string; tenantId: string },
): Promise<"sent" | "bounced"> {
  try {
    const client = getSesClient();
    await client.send(
      new SendEmailCommand({
        Source: `NELVYON <${FROM_EMAIL}>`,
        Destination: { ToAddresses: [to] },
        Message: {
          Subject: { Data: subject, Charset: "UTF-8" },
          Body: { Html: { Data: html, Charset: "UTF-8" } },
        },
        ...(meta && {
          Tags: [
            { Name: "campania_id", Value: meta.campaniaId },
            { Name: "contact_id", Value: meta.contactId },
            { Name: "tenant_id", Value: meta.tenantId },
          ],
        }),
      }),
    );
    return "sent";
  } catch {
    return "bounced";
  }
}

export type CampaniaStatus = "draft" | "scheduled" | "running" | "paused" | "completed" | "cancelled";
export type CampaniaChannel = "email" | "sms" | "notification" | "multi";
export type RecipientStatus = "pending" | "sent" | "opened" | "clicked" | "bounced" | "unsubscribed";

export type AudienceFilter = {
  status?: ContactStatus;
  /** @deprecated Prefer deal_stage — synced from deals but not authoritative. */
  pipeline_stage?: PipelineStage;
  tags?: string[];
  /** Contacts linked to at least one deal in this stage (saas_deals). */
  deal_stage?: DealStage;
  /** Contacts with any open deal (stage not won/lost). */
  deal_open_only?: boolean;
};

export interface SaasCampania {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  status: CampaniaStatus;
  channel: CampaniaChannel;
  subject: string | null;
  body: string;
  ctaText: string | null;
  ctaUrl: string | null;
  audienceFilter: AudienceFilter;
  scheduledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  totalRecipients: number;
  sentCount: number;
  openedCount: number;
  clickedCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CampaniaRecipient {
  id: string;
  campaniaId: string;
  contactId: string;
  tenantId: string;
  status: RecipientStatus;
  sentAt: string | null;
  openedAt: string | null;
  clickedAt: string | null;
}

export interface CampaniaStats {
  total_recipients: number;
  sent_count: number;
  opened_count: number;
  clicked_count: number;
  open_rate: number;
  click_rate: number;
}

export interface CampaniaLaunchResult {
  campaniaId: string;
  totalSent: number;
  status: CampaniaStatus;
}

export class SaasCampaniasError extends Error {
  constructor(
    message: string,
    public readonly code: "NOT_FOUND" | "VALIDATION" | "CONSTRAINT" | "FORBIDDEN",
  ) {
    super(message);
    this.name = "SaasCampaniasError";
  }
}

type CampaniaRow = {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  status: CampaniaStatus;
  channel: CampaniaChannel;
  subject: string | null;
  body: string;
  cta_text: string | null;
  cta_url: string | null;
  audience_filter: AudienceFilter | null;
  scheduled_at: Date | string | null;
  started_at: Date | string | null;
  completed_at: Date | string | null;
  total_recipients: number | string;
  sent_count: number | string;
  opened_count: number | string;
  clicked_count: number | string;
  created_at: Date | string;
  updated_at: Date | string;
};

type RecipientRow = {
  id: string;
  campania_id: string;
  contact_id: string;
  tenant_id: string;
  status: RecipientStatus;
  sent_at: Date | string | null;
  opened_at: Date | string | null;
  clicked_at: Date | string | null;
};

type ContactRow = { id: string };

const STATUSES: readonly CampaniaStatus[] = ["draft", "scheduled", "running", "paused", "completed", "cancelled"] as const;
const CHANNELS: readonly CampaniaChannel[] = ["email", "sms", "notification", "multi"] as const;
const CONTACT_STATUSES: readonly ContactStatus[] = ["lead", "prospect", "client", "churned"] as const;
const STAGES: readonly PipelineStage[] = ["new", "contacted", "qualified", "proposal", "won", "lost"] as const;

function toIso(v: Date | string): string {
  return typeof v === "string" ? v : v.toISOString();
}

function toNumber(v: string | number | null | undefined): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function isCheckViolation(e: unknown): boolean {
  return typeof e === "object" && e !== null && "code" in e && (e as { code: unknown }).code === "23514";
}

function assertStatus(v: string): CampaniaStatus {
  if ((STATUSES as readonly string[]).includes(v)) return v as CampaniaStatus;
  throw new SaasCampaniasError("Invalid campania status", "VALIDATION");
}

function assertChannel(v: string): CampaniaChannel {
  if ((CHANNELS as readonly string[]).includes(v)) return v as CampaniaChannel;
  throw new SaasCampaniasError("Invalid channel", "VALIDATION");
}

function assertAudienceFilter(filter: AudienceFilter): void {
  if (filter.status && !(CONTACT_STATUSES as readonly string[]).includes(filter.status)) {
    throw new SaasCampaniasError("Invalid audience status", "VALIDATION");
  }
  if (filter.pipeline_stage && !(STAGES as readonly string[]).includes(filter.pipeline_stage)) {
    throw new SaasCampaniasError("Invalid audience pipeline_stage", "VALIDATION");
  }
  if (filter.deal_stage && !(STAGES as readonly string[]).includes(filter.deal_stage)) {
    throw new SaasCampaniasError("Invalid audience deal_stage", "VALIDATION");
  }
  if (filter.deal_open_only !== undefined && typeof filter.deal_open_only !== "boolean") {
    throw new SaasCampaniasError("Invalid audience deal_open_only", "VALIDATION");
  }
}

function rowToCampania(r: CampaniaRow): SaasCampania {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    name: r.name,
    description: r.description,
    status: r.status,
    channel: r.channel,
    subject: r.subject,
    body: r.body,
    ctaText: r.cta_text,
    ctaUrl: r.cta_url,
    audienceFilter: r.audience_filter ?? {},
    scheduledAt: r.scheduled_at ? toIso(r.scheduled_at) : null,
    startedAt: r.started_at ? toIso(r.started_at) : null,
    completedAt: r.completed_at ? toIso(r.completed_at) : null,
    totalRecipients: toNumber(r.total_recipients),
    sentCount: toNumber(r.sent_count),
    openedCount: toNumber(r.opened_count),
    clickedCount: toNumber(r.clicked_count),
    createdAt: toIso(r.created_at),
    updatedAt: toIso(r.updated_at),
  };
}

function rowToRecipient(r: RecipientRow): CampaniaRecipient {
  return {
    id: r.id,
    campaniaId: r.campania_id,
    contactId: r.contact_id,
    tenantId: r.tenant_id,
    status: r.status,
    sentAt: r.sent_at ? toIso(r.sent_at) : null,
    openedAt: r.opened_at ? toIso(r.opened_at) : null,
    clickedAt: r.clicked_at ? toIso(r.clicked_at) : null,
  };
}

export type CreateCampaniaInput = {
  name: string;
  description?: string | null;
  status?: CampaniaStatus;
  channel: CampaniaChannel;
  subject?: string | null;
  body: string;
  ctaText?: string | null;
  ctaUrl?: string | null;
  audienceFilter?: AudienceFilter;
};

export type UpdateCampaniaPatch = Partial<CreateCampaniaInput>;

export interface CampaniasAuditPort {
  log(tenantId: string, input: { action: string; module: string; resourceId?: string; details?: Record<string, unknown> }): Promise<void>;
}

export class SaasCampaniasService {
  constructor(private readonly db: SaasPostgresPort, private readonly audit?: CampaniasAuditPort) {}

  async createCampania(tenantId: string, data: CreateCampaniaInput): Promise<SaasCampania> {
    await assertSaasPlanCanCreate(this.db, tenantId, "campanias");
    const name = data.name.trim();
    const body = data.body.trim();
    if (!name) throw new SaasCampaniasError("name is required", "VALIDATION");
    if (!body) throw new SaasCampaniasError("body is required", "VALIDATION");
    const status = data.status ?? "draft";
    assertStatus(status);
    const channel = assertChannel(data.channel);
    const audienceFilter = data.audienceFilter ?? {};
    assertAudienceFilter(audienceFilter);
    try {
      const rows = await this.db.query<CampaniaRow>(
        `INSERT INTO saas_campanias
         (tenant_id, name, description, status, channel, subject, body, cta_text, cta_url, audience_filter, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())
         RETURNING id, tenant_id, name, description, status, channel, subject, body, cta_text, cta_url, audience_filter,
           scheduled_at, started_at, completed_at, total_recipients, sent_count, opened_count, clicked_count, created_at, updated_at`,
        [tenantId, name, data.description ?? null, status, channel, data.subject ?? null, body, data.ctaText ?? null, data.ctaUrl ?? null, audienceFilter],
      );
      const row = rows[0];
      if (!row) throw new SaasCampaniasError("Failed to create campania", "CONSTRAINT");
      return rowToCampania(row);
    } catch (e: unknown) {
      if (isCheckViolation(e)) throw new SaasCampaniasError("Invalid status or channel", "CONSTRAINT");
      throw e;
    }
  }

  async getCampanias(tenantId: string): Promise<SaasCampania[]> {
    const rows = await this.db.query<CampaniaRow>(
      `SELECT id, tenant_id, name, description, status, channel, subject, body, cta_text, cta_url, audience_filter,
        scheduled_at, started_at, completed_at, total_recipients, sent_count, opened_count, clicked_count, created_at, updated_at
       FROM saas_campanias
       WHERE tenant_id = $1
       ORDER BY created_at DESC`,
      [tenantId],
    );
    return rows.map(rowToCampania);
  }

  async getCampania(tenantId: string, campaniaId: string): Promise<SaasCampania | null> {
    const rows = await this.db.query<CampaniaRow>(
      `SELECT id, tenant_id, name, description, status, channel, subject, body, cta_text, cta_url, audience_filter,
        scheduled_at, started_at, completed_at, total_recipients, sent_count, opened_count, clicked_count, created_at, updated_at
       FROM saas_campanias
       WHERE tenant_id = $1 AND id = $2
       LIMIT 1`,
      [tenantId, campaniaId],
    );
    return rows[0] ? rowToCampania(rows[0]) : null;
  }

  async updateCampania(tenantId: string, campaniaId: string, data: UpdateCampaniaPatch): Promise<SaasCampania> {
    const existing = await this.getCampania(tenantId, campaniaId);
    if (!existing) throw new SaasCampaniasError("Campania not found", "NOT_FOUND");
    if (data.status) assertStatus(data.status);
    if (data.channel) assertChannel(data.channel);
    if (data.audienceFilter) assertAudienceFilter(data.audienceFilter);
    const name = data.name !== undefined ? data.name.trim() : undefined;
    if (name !== undefined && !name) throw new SaasCampaniasError("name cannot be empty", "VALIDATION");
    const body = data.body !== undefined ? data.body.trim() : undefined;
    if (body !== undefined && !body) throw new SaasCampaniasError("body cannot be empty", "VALIDATION");
    try {
      const rows = await this.db.query<CampaniaRow>(
        `UPDATE saas_campanias SET
          name = COALESCE($3, name),
          description = COALESCE($4, description),
          status = COALESCE($5, status),
          channel = COALESCE($6, channel),
          subject = COALESCE($7, subject),
          body = COALESCE($8, body),
          cta_text = COALESCE($9, cta_text),
          cta_url = COALESCE($10, cta_url),
          audience_filter = COALESCE($11, audience_filter),
          updated_at = NOW()
         WHERE tenant_id = $1 AND id = $2
         RETURNING id, tenant_id, name, description, status, channel, subject, body, cta_text, cta_url, audience_filter,
           scheduled_at, started_at, completed_at, total_recipients, sent_count, opened_count, clicked_count, created_at, updated_at`,
        [
          tenantId,
          campaniaId,
          name ?? null,
          data.description ?? null,
          data.status ?? null,
          data.channel ?? null,
          data.subject ?? null,
          body ?? null,
          data.ctaText ?? null,
          data.ctaUrl ?? null,
          data.audienceFilter ?? null,
        ],
      );
      const row = rows[0];
      if (!row) throw new SaasCampaniasError("Campania not found", "NOT_FOUND");
      return rowToCampania(row);
    } catch (e: unknown) {
      if (isCheckViolation(e)) throw new SaasCampaniasError("Invalid status or channel", "CONSTRAINT");
      throw e;
    }
  }

  async deleteCampania(tenantId: string, campaniaId: string): Promise<void> {
    await this.db.query(`DELETE FROM saas_campanias WHERE tenant_id = $1 AND id = $2`, [tenantId, campaniaId]);
  }

  async scheduleCampania(tenantId: string, campaniaId: string, scheduledAt: string): Promise<SaasCampania> {
    const rows = await this.db.query<CampaniaRow>(
      `UPDATE saas_campanias SET
        status = 'scheduled',
        scheduled_at = $3,
        updated_at = NOW()
       WHERE tenant_id = $1 AND id = $2
       RETURNING id, tenant_id, name, description, status, channel, subject, body, cta_text, cta_url, audience_filter,
         scheduled_at, started_at, completed_at, total_recipients, sent_count, opened_count, clicked_count, created_at, updated_at`,
      [tenantId, campaniaId, scheduledAt],
    );
    const row = rows[0];
    if (!row) throw new SaasCampaniasError("Campania not found", "NOT_FOUND");
    return rowToCampania(row);
  }

  private async resolveAudience(tenantId: string, audienceFilter: AudienceFilter): Promise<string[]> {
    const usesDealJoin = Boolean(audienceFilter.deal_stage || audienceFilter.deal_open_only);
    if (usesDealJoin) {
      const where: string[] = ["c.tenant_id = $1", "d.tenant_id = $1", "d.contact_id = c.id"];
      const params: unknown[] = [tenantId];
      let n = 2;
      if (audienceFilter.status) {
        where.push(`c.status = $${n++}`);
        params.push(audienceFilter.status);
      }
      if (audienceFilter.tags && audienceFilter.tags.length > 0) {
        where.push(`c.tags && $${n++}::text[]`);
        params.push(audienceFilter.tags);
      }
      if (audienceFilter.deal_stage) {
        where.push(`d.stage = $${n++}`);
        params.push(audienceFilter.deal_stage);
      }
      if (audienceFilter.deal_open_only) {
        where.push(`d.stage NOT IN ('won', 'lost')`);
      }
      const rows = await this.db.query<ContactRow>(
        `SELECT DISTINCT c.id
         FROM saas_contacts c
         INNER JOIN saas_deals d ON d.contact_id = c.id AND d.tenant_id = c.tenant_id
         WHERE ${where.join(" AND ")}`,
        params,
      );
      return rows.map((r) => r.id);
    }

    const where: string[] = ["tenant_id = $1"];
    const params: unknown[] = [tenantId];
    let n = 2;
    if (audienceFilter.status) {
      where.push(`status = $${n++}`);
      params.push(audienceFilter.status);
    }
    if (audienceFilter.pipeline_stage) {
      where.push(`pipeline_stage = $${n++}`);
      params.push(audienceFilter.pipeline_stage);
    }
    if (audienceFilter.tags && audienceFilter.tags.length > 0) {
      where.push(`tags && $${n++}::text[]`);
      params.push(audienceFilter.tags);
    }
    const rows = await this.db.query<ContactRow>(
      `SELECT id FROM saas_contacts WHERE ${where.join(" AND ")}`,
      params,
    );
    return rows.map((r) => r.id);
  }

  async launchCampania(tenantId: string, campaniaId: string): Promise<CampaniaLaunchResult> {
    const campania = await this.getCampania(tenantId, campaniaId);
    if (!campania) throw new SaasCampaniasError("Campania not found", "NOT_FOUND");
    if (campania.status === "completed") throw new SaasCampaniasError("Campania already completed", "VALIDATION");
    const contactIds = await this.resolveAudience(tenantId, campania.audienceFilter);

    await this.db.query(
      `UPDATE saas_campanias SET
        status = 'running',
        total_recipients = $3,
        started_at = NOW(),
        updated_at = NOW()
       WHERE tenant_id = $1 AND id = $2`,
      [tenantId, campaniaId, contactIds.length],
    );

    for (const contactId of contactIds) {
      await this.db.query(
        `INSERT INTO saas_campania_recipients (campania_id, contact_id, tenant_id, status)
         VALUES ($1,$2,$3,'pending')
         ON CONFLICT (campania_id, contact_id) DO NOTHING`,
        [campaniaId, contactId, tenantId],
      );
    }

    let sentCount = 0;

    if (campania.channel === "email") {
      const subject = campania.subject ?? campania.name;
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? "https://nelvyon.com";
      const buildHtml = (contactId: string) => {
        const openToken = signTrackingToken({ tid: tenantId, cid: campaniaId, rid: contactId, t: "o" });
        const pixelUrl = `${appUrl}/api/track/email/open/${openToken}`;

        let ctaBlock = "";
        if (campania.ctaText && campania.ctaUrl) {
          const clickToken = signTrackingToken({ tid: tenantId, cid: campaniaId, rid: contactId, t: "c", url: campania.ctaUrl });
          const clickUrl = `${appUrl}/api/track/email/click/${clickToken}`;
          ctaBlock = `<p style="text-align:center;margin:24px 0;">
               <a href="${clickUrl}" style="background:#1d4ed8;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600;">${campania.ctaText}</a>
             </p>`;
        }

        const unsubscribeUrl = `${appUrl}/api/saas/campanias/unsubscribe?cid=${encodeURIComponent(campaniaId)}&rid=${encodeURIComponent(contactId)}&tid=${encodeURIComponent(tenantId)}`;
        return `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#0f172a;">
${campania.body}
${ctaBlock}
<hr style="margin-top:32px;border:none;border-top:1px solid #e2e8f0;" />
<p style="font-size:11px;color:#94a3b8;text-align:center;margin-top:8px;">
  Enviado por NELVYON · <a href="${unsubscribeUrl}" style="color:#94a3b8;">Darse de baja</a>
</p>
<img src="${pixelUrl}" width="1" height="1" alt="" style="display:none;" />
</div>`;
      };

      type ContactEmailRow = { id: string; email: string | null };
      const contacts = await this.db.query<ContactEmailRow>(
        `SELECT id, email FROM saas_contacts WHERE tenant_id = $1 AND id = ANY($2::uuid[])`,
        [tenantId, contactIds],
      );
      const emailByContactId = new Map(contacts.map((c) => [c.id, c.email]));

      for (const contactId of contactIds) {
        const email = emailByContactId.get(contactId);
        if (!email) {
          // Contact has no email address — mark bounced instead of silently skipping
          await this.db.query(
            `UPDATE saas_campania_recipients
             SET status = 'bounced', sent_at = NOW()
             WHERE tenant_id = $1 AND campania_id = $2 AND contact_id = $3`,
            [tenantId, campaniaId, contactId],
          );
          continue;
        }

        const html = buildHtml(contactId);
        const status = await sendCampaniaEmail(email, subject, html, { campaniaId, contactId, tenantId });
        await this.db.query(
          `UPDATE saas_campania_recipients
           SET status = $4, sent_at = NOW()
           WHERE tenant_id = $1 AND campania_id = $2 AND contact_id = $3`,
          [tenantId, campaniaId, contactId, status],
        );
        if (status === "sent") sentCount++;
      }
    } else {
      // SMS / notification / multi: mark as sent (real dispatch per channel TBD in Fase 1.2)
      await this.db.query(
        `UPDATE saas_campania_recipients
         SET status = 'sent', sent_at = NOW()
         WHERE tenant_id = $1 AND campania_id = $2`,
        [tenantId, campaniaId],
      );
      sentCount = contactIds.length;
    }

    await this.db.query(
      `UPDATE saas_campanias SET
        status = 'completed',
        sent_count = $3,
        completed_at = NOW(),
        updated_at = NOW()
       WHERE tenant_id = $1 AND id = $2`,
      [tenantId, campaniaId, sentCount],
    );

    void this.audit?.log(tenantId, { action: "send", module: "campanias", resourceId: campaniaId, details: { totalSent: sentCount } });
    return { campaniaId, totalSent: sentCount, status: "completed" };
  }

  async pauseCampania(tenantId: string, campaniaId: string): Promise<SaasCampania> {
    const rows = await this.db.query<CampaniaRow>(
      `UPDATE saas_campanias SET
        status = 'paused',
        updated_at = NOW()
       WHERE tenant_id = $1 AND id = $2
       RETURNING id, tenant_id, name, description, status, channel, subject, body, cta_text, cta_url, audience_filter,
         scheduled_at, started_at, completed_at, total_recipients, sent_count, opened_count, clicked_count, created_at, updated_at`,
      [tenantId, campaniaId],
    );
    const row = rows[0];
    if (!row) throw new SaasCampaniasError("Campania not found", "NOT_FOUND");
    return rowToCampania(row);
  }

  async getCampaniaStats(tenantId: string, campaniaId: string): Promise<CampaniaStats> {
    const campania = await this.getCampania(tenantId, campaniaId);
    if (!campania) throw new SaasCampaniasError("Campania not found", "NOT_FOUND");
    const sent = campania.sentCount;
    const openRate = sent > 0 ? Number(((campania.openedCount / sent) * 100).toFixed(2)) : 0;
    const clickRate = sent > 0 ? Number(((campania.clickedCount / sent) * 100).toFixed(2)) : 0;
    return {
      total_recipients: campania.totalRecipients,
      sent_count: campania.sentCount,
      opened_count: campania.openedCount,
      clicked_count: campania.clickedCount,
      open_rate: openRate,
      click_rate: clickRate,
    };
  }

  async getRecipients(tenantId: string, campaniaId: string): Promise<CampaniaRecipient[]> {
    const rows = await this.db.query<RecipientRow>(
      `SELECT id, campania_id, contact_id, tenant_id, status, sent_at, opened_at, clicked_at
       FROM saas_campania_recipients
       WHERE tenant_id = $1 AND campania_id = $2
       ORDER BY sent_at DESC NULLS LAST, id DESC`,
      [tenantId, campaniaId],
    );
    return rows.map(rowToRecipient);
  }
}

let cached: SaasCampaniasService | undefined;

export function getSaasCampaniasService(): SaasCampaniasService {
  if (!cached) {
    const db = DbClient.getInstance();
    cached = new SaasCampaniasService(db);
  }
  return cached;
}

export function resetSaasCampaniasServiceForTests(): void {
  cached = undefined;
}
