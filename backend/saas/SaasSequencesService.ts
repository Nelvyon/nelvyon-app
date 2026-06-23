import { DbClient } from "../db/DbClient";
import type { SaasPostgresPort } from "./SaasOnboardingService";

export type SequenceStatus = "active" | "paused" | "archived";
export type SequenceTrigger = "manual" | "contact_created" | "form_submitted" | "tag_added";

export interface SaasSequence {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  triggerType: SequenceTrigger;
  triggerConfig: Record<string, unknown>;
  status: SequenceStatus;
  enrollmentsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SaasSequenceStep {
  id: string;
  sequenceId: string;
  position: number;
  delayDays: number;
  delayHours: number;
  subject: string;
  bodyHtml: string;
  createdAt: string;
  updatedAt: string;
}

export interface SaasSequenceEnrollment {
  id: string;
  sequenceId: string;
  tenantId: string;
  contactId: string;
  currentStep: number;
  status: "active" | "completed" | "unsubscribed" | "failed";
  nextSendAt: string | null;
  enrolledAt: string;
  completedAt: string | null;
}

export interface CreateSequenceInput {
  name: string;
  description?: string | null;
  triggerType?: SequenceTrigger;
  triggerConfig?: Record<string, unknown>;
}

export interface CreateStepInput {
  position?: number;
  delayDays?: number;
  delayHours?: number;
  subject: string;
  bodyHtml: string;
}

export class SaasSequencesError extends Error {
  constructor(
    message: string,
    public readonly code: "NOT_FOUND" | "VALIDATION" | "CONSTRAINT",
  ) {
    super(message);
    this.name = "SaasSequencesError";
  }
}

type SeqRow = {
  id: string; tenant_id: string; name: string; description: string | null;
  trigger_type: SequenceTrigger; trigger_config: Record<string, unknown>;
  status: SequenceStatus; enrollments_count: number | string;
  created_at: Date | string; updated_at: Date | string;
};

type StepRow = {
  id: string; sequence_id: string; position: number | string; delay_days: number | string;
  delay_hours: number | string; subject: string; body_html: string;
  created_at: Date | string; updated_at: Date | string;
};

type EnrollRow = {
  id: string; sequence_id: string; tenant_id: string; contact_id: string;
  current_step: number | string; status: "active" | "completed" | "unsubscribed" | "failed";
  next_send_at: Date | string | null; enrolled_at: Date | string; completed_at: Date | string | null;
};

function rowToSeq(r: SeqRow): SaasSequence {
  return {
    id: r.id, tenantId: r.tenant_id, name: r.name, description: r.description,
    triggerType: r.trigger_type, triggerConfig: r.trigger_config ?? {},
    status: r.status, enrollmentsCount: Number(r.enrollments_count),
    createdAt: new Date(r.created_at).toISOString(),
    updatedAt: new Date(r.updated_at).toISOString(),
  };
}

function rowToStep(r: StepRow): SaasSequenceStep {
  return {
    id: r.id, sequenceId: r.sequence_id, position: Number(r.position),
    delayDays: Number(r.delay_days), delayHours: Number(r.delay_hours),
    subject: r.subject, bodyHtml: r.body_html,
    createdAt: new Date(r.created_at).toISOString(),
    updatedAt: new Date(r.updated_at).toISOString(),
  };
}

function rowToEnroll(r: EnrollRow): SaasSequenceEnrollment {
  return {
    id: r.id, sequenceId: r.sequence_id, tenantId: r.tenant_id, contactId: r.contact_id,
    currentStep: Number(r.current_step), status: r.status,
    nextSendAt: r.next_send_at ? new Date(r.next_send_at).toISOString() : null,
    enrolledAt: new Date(r.enrolled_at).toISOString(),
    completedAt: r.completed_at ? new Date(r.completed_at).toISOString() : null,
  };
}

const TRIGGERS: SequenceTrigger[] = ["manual", "contact_created", "form_submitted", "tag_added"];
const STATUSES: SequenceStatus[] = ["active", "paused", "archived"];

export class SaasSequencesService {
  constructor(private readonly db: SaasPostgresPort = DbClient.getInstance()) {}

  // ── Sequences CRUD ──────────────────────────────────────────────────────

  async list(tenantId: string): Promise<SaasSequence[]> {
    const rows = await this.db.query<SeqRow>(
      `SELECT id, tenant_id, name, description, trigger_type, trigger_config, status, enrollments_count, created_at, updated_at
       FROM saas_sequences WHERE tenant_id=$1 ORDER BY created_at DESC`,
      [tenantId],
    );
    return rows.map(rowToSeq);
  }

  async get(tenantId: string, id: string): Promise<SaasSequence | null> {
    const rows = await this.db.query<SeqRow>(
      `SELECT id, tenant_id, name, description, trigger_type, trigger_config, status, enrollments_count, created_at, updated_at
       FROM saas_sequences WHERE tenant_id=$1 AND id=$2 LIMIT 1`,
      [tenantId, id],
    );
    return rows[0] ? rowToSeq(rows[0]) : null;
  }

  async create(tenantId: string, input: CreateSequenceInput): Promise<SaasSequence> {
    if (!input.name.trim()) throw new SaasSequencesError("name is required", "VALIDATION");
    const trigger = input.triggerType ?? "manual";
    if (!TRIGGERS.includes(trigger)) throw new SaasSequencesError(`Invalid triggerType: ${trigger}`, "VALIDATION");
    const rows = await this.db.query<SeqRow>(
      `INSERT INTO saas_sequences (tenant_id, name, description, trigger_type, trigger_config, updated_at)
       VALUES ($1,$2,$3,$4,$5::jsonb,NOW())
       RETURNING id, tenant_id, name, description, trigger_type, trigger_config, status, enrollments_count, created_at, updated_at`,
      [tenantId, input.name.trim(), input.description ?? null, trigger, JSON.stringify(input.triggerConfig ?? {})],
    );
    if (!rows[0]) throw new SaasSequencesError("Failed to create sequence", "CONSTRAINT");
    return rowToSeq(rows[0]);
  }

  async updateStatus(tenantId: string, id: string, status: SequenceStatus): Promise<SaasSequence> {
    if (!STATUSES.includes(status)) throw new SaasSequencesError(`Invalid status: ${status}`, "VALIDATION");
    const rows = await this.db.query<SeqRow>(
      `UPDATE saas_sequences SET status=$3, updated_at=NOW() WHERE tenant_id=$1 AND id=$2
       RETURNING id, tenant_id, name, description, trigger_type, trigger_config, status, enrollments_count, created_at, updated_at`,
      [tenantId, id, status],
    );
    if (!rows[0]) throw new SaasSequencesError("Sequence not found", "NOT_FOUND");
    return rowToSeq(rows[0]);
  }

  async delete(tenantId: string, id: string): Promise<void> {
    const rows = await this.db.query<{ id: string }>(
      `DELETE FROM saas_sequences WHERE tenant_id=$1 AND id=$2 RETURNING id`,
      [tenantId, id],
    );
    if (!rows[0]) throw new SaasSequencesError("Sequence not found", "NOT_FOUND");
  }

  // ── Steps CRUD ──────────────────────────────────────────────────────────

  async listSteps(tenantId: string, sequenceId: string): Promise<SaasSequenceStep[]> {
    const seq = await this.get(tenantId, sequenceId);
    if (!seq) throw new SaasSequencesError("Sequence not found", "NOT_FOUND");
    const rows = await this.db.query<StepRow>(
      `SELECT id, sequence_id, position, delay_days, delay_hours, subject, body_html, created_at, updated_at
       FROM saas_sequence_steps WHERE sequence_id=$1 ORDER BY position ASC`,
      [sequenceId],
    );
    return rows.map(rowToStep);
  }

  async addStep(tenantId: string, sequenceId: string, input: CreateStepInput): Promise<SaasSequenceStep> {
    const seq = await this.get(tenantId, sequenceId);
    if (!seq) throw new SaasSequencesError("Sequence not found", "NOT_FOUND");
    if (!input.subject.trim()) throw new SaasSequencesError("subject is required", "VALIDATION");
    if (!input.bodyHtml.trim()) throw new SaasSequencesError("bodyHtml is required", "VALIDATION");
    const posRow = await this.db.query<{ max_pos: number | null }>(
      `SELECT MAX(position) AS max_pos FROM saas_sequence_steps WHERE sequence_id=$1`,
      [sequenceId],
    );
    const nextPos = input.position ?? (posRow[0]?.max_pos != null ? Number(posRow[0].max_pos) + 1 : 0);
    const rows = await this.db.query<StepRow>(
      `INSERT INTO saas_sequence_steps (sequence_id, position, delay_days, delay_hours, subject, body_html, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,NOW())
       RETURNING id, sequence_id, position, delay_days, delay_hours, subject, body_html, created_at, updated_at`,
      [sequenceId, nextPos, input.delayDays ?? 0, input.delayHours ?? 0, input.subject.trim(), input.bodyHtml.trim()],
    );
    if (!rows[0]) throw new SaasSequencesError("Failed to add step", "CONSTRAINT");
    return rowToStep(rows[0]);
  }

  async deleteStep(tenantId: string, sequenceId: string, stepId: string): Promise<void> {
    const seq = await this.get(tenantId, sequenceId);
    if (!seq) throw new SaasSequencesError("Sequence not found", "NOT_FOUND");
    const rows = await this.db.query<{ id: string }>(
      `DELETE FROM saas_sequence_steps WHERE sequence_id=$1 AND id=$2 RETURNING id`,
      [sequenceId, stepId],
    );
    if (!rows[0]) throw new SaasSequencesError("Step not found", "NOT_FOUND");
  }

  // ── Enrollments ─────────────────────────────────────────────────────────

  async enroll(tenantId: string, sequenceId: string, contactId: string): Promise<SaasSequenceEnrollment> {
    const seq = await this.get(tenantId, sequenceId);
    if (!seq) throw new SaasSequencesError("Sequence not found", "NOT_FOUND");
    if (seq.status !== "active") throw new SaasSequencesError("Sequence is not active", "VALIDATION");
    const steps = await this.listSteps(tenantId, sequenceId);
    if (steps.length === 0) throw new SaasSequencesError("Sequence has no steps", "VALIDATION");

    const firstStep = steps[0]!;
    const nextSendAt = new Date(
      Date.now() + firstStep.delayDays * 86400_000 + firstStep.delayHours * 3600_000,
    ).toISOString();

    try {
      const rows = await this.db.query<EnrollRow>(
        `INSERT INTO saas_sequence_enrollments (sequence_id, tenant_id, contact_id, next_send_at)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (sequence_id, contact_id) DO UPDATE
           SET status='active', current_step=0, next_send_at=$4, completed_at=NULL
         RETURNING id, sequence_id, tenant_id, contact_id, current_step, status, next_send_at, enrolled_at, completed_at`,
        [sequenceId, tenantId, contactId, nextSendAt],
      );
      if (!rows[0]) throw new SaasSequencesError("Failed to enroll contact", "CONSTRAINT");
      await this.db.query(
        `UPDATE saas_sequences SET enrollments_count = enrollments_count + 1, updated_at = NOW()
         WHERE id = $1`,
        [sequenceId],
      );
      return rowToEnroll(rows[0]);
    } catch (e: unknown) {
      if (typeof e === "object" && e !== null && "code" in e && (e as { code: string }).code === "23503") {
        throw new SaasSequencesError("Contact not found", "NOT_FOUND");
      }
      throw e;
    }
  }

  async listEnrollments(tenantId: string, sequenceId: string): Promise<SaasSequenceEnrollment[]> {
    const seq = await this.get(tenantId, sequenceId);
    if (!seq) throw new SaasSequencesError("Sequence not found", "NOT_FOUND");
    const rows = await this.db.query<EnrollRow>(
      `SELECT id, sequence_id, tenant_id, contact_id, current_step, status, next_send_at, enrolled_at, completed_at
       FROM saas_sequence_enrollments WHERE sequence_id=$1 ORDER BY enrolled_at DESC`,
      [sequenceId],
    );
    return rows.map(rowToEnroll);
  }

  async unenroll(tenantId: string, sequenceId: string, contactId: string): Promise<void> {
    const rows = await this.db.query<{ id: string }>(
      `UPDATE saas_sequence_enrollments SET status='unsubscribed'
       WHERE sequence_id=$1 AND tenant_id=$2 AND contact_id=$3 RETURNING id`,
      [sequenceId, tenantId, contactId],
    );
    if (!rows[0]) throw new SaasSequencesError("Enrollment not found", "NOT_FOUND");
  }

  /**
   * Process due sequence emails. Called from cron.
   * Returns count of emails sent.
   */
  async processDueEnrollments(sendEmail: (to: string, subject: string, html: string) => Promise<void>): Promise<number> {
    const due = await this.db.query<{
      id: string; sequence_id: string; tenant_id: string; contact_id: string;
      current_step: number | string;
    }>(
      `SELECT e.id, e.sequence_id, e.tenant_id, e.contact_id, e.current_step
       FROM saas_sequence_enrollments e
       WHERE e.status = 'active' AND e.next_send_at <= NOW()
       LIMIT 100`,
      [],
    );

    let sent = 0;
    for (const enrollment of due) {
      const step = Number(enrollment.current_step);
      const stepRows = await this.db.query<StepRow & { contact_email: string | null; contact_name: string }>(
        `SELECT s.id, s.sequence_id, s.position, s.delay_days, s.delay_hours, s.subject, s.body_html, s.created_at, s.updated_at,
                c.email AS contact_email, c.name AS contact_name
         FROM saas_sequence_steps s
         JOIN contacts c ON c.id = $3
         WHERE s.sequence_id = $1 AND s.position = $2
         LIMIT 1`,
        [enrollment.sequence_id, step, enrollment.contact_id],
      );
      const stepData = stepRows[0];
      if (!stepData?.contact_email) {
        await this.db.query(
          `UPDATE saas_sequence_enrollments SET status='failed' WHERE id=$1`,
          [enrollment.id],
        );
        continue;
      }

      try {
        await sendEmail(stepData.contact_email, stepData.subject, stepData.body_html);
        sent += 1;

        const nextStepRows = await this.db.query<StepRow>(
          `SELECT position, delay_days, delay_hours FROM saas_sequence_steps
           WHERE sequence_id=$1 AND position > $2 ORDER BY position ASC LIMIT 1`,
          [enrollment.sequence_id, step],
        );
        const nextStep = nextStepRows[0];

        if (nextStep) {
          const nextSendAt = new Date(
            Date.now() + Number(nextStep.delay_days) * 86400_000 + Number(nextStep.delay_hours) * 3600_000,
          ).toISOString();
          await this.db.query(
            `UPDATE saas_sequence_enrollments SET current_step=$2, next_send_at=$3 WHERE id=$1`,
            [enrollment.id, Number(nextStep.position), nextSendAt],
          );
        } else {
          await this.db.query(
            `UPDATE saas_sequence_enrollments SET status='completed', completed_at=NOW() WHERE id=$1`,
            [enrollment.id],
          );
        }
      } catch {
        await this.db.query(
          `UPDATE saas_sequence_enrollments SET status='failed' WHERE id=$1`,
          [enrollment.id],
        );
      }
    }
    return sent;
  }
}

let _instance: SaasSequencesService | null = null;
export function getSaasSequencesService(): SaasSequencesService {
  if (!_instance) _instance = new SaasSequencesService();
  return _instance;
}
export function resetSaasSequencesServiceForTests(): void { _instance = null; }
