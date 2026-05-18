import { sendEmail } from "../email/emailService";
import { DbClient } from "../db/DbClient";
import { createLogger } from "../logger";

const SURVEY_VERSION = "v1";
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

const FEEDBACK_TYPES = new Set(["bug", "feature", "praise", "other"]);

export type NpsCategory = "promoter" | "passive" | "detractor";
export type FeedbackType = "bug" | "feature" | "praise" | "other";
export type FeedbackStatus = "received" | "reviewing" | "planned" | "done" | "wont_fix";

export interface NpsResponse {
  id: string;
  userId: string;
  score: number;
  comment: string | null;
  category: NpsCategory;
  surveyVersion: string;
  createdAt: string;
}

export interface FeedbackItem {
  id: string;
  userId: string;
  type: FeedbackType;
  title: string;
  body: string;
  urlContext: string | null;
  status: FeedbackStatus;
  upvotes: number;
  createdAt: string;
  updatedAt: string;
}

interface NpsRow {
  id: string;
  user_id: string;
  score: number;
  comment: string | null;
  category: NpsCategory;
  survey_version: string;
  created_at: string;
}

interface FeedbackRow {
  id: string;
  user_id: string;
  type: FeedbackType;
  title: string;
  body: string;
  url_context: string | null;
  status: FeedbackStatus;
  upvotes: number;
  created_at: string;
  updated_at: string;
}

function mapFeedback(r: FeedbackRow): FeedbackItem {
  return {
    id: r.id,
    userId: r.user_id,
    type: r.type,
    title: r.title,
    body: r.body,
    urlContext: r.url_context,
    status: r.status,
    upvotes: r.upvotes,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

let inst: FeedbackService | undefined;

export class FeedbackService {
  private readonly db: DbClient;
  private readonly logger = createLogger("feedback");

  private constructor() {
    this.db = DbClient.getInstance();
  }

  static instance(): FeedbackService {
    if (!inst) inst = new FeedbackService();
    return inst;
  }

  static reset(): void {
    inst = undefined;
  }

  async submitNps(userId: string, score: number, comment?: string): Promise<{ id: string; category: string }> {
    if (!Number.isInteger(score) || score < 0 || score > 10) {
      throw new Error("NPS score must be an integer between 0 and 10");
    }

    const trimmedComment = comment?.trim() ? comment.trim() : null;

    let rows = await this.db.query<Pick<NpsRow, "id" | "category">>(
      `INSERT INTO nps_responses (user_id, score, comment, survey_version)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, survey_version) DO NOTHING
       RETURNING id, category`,
      [userId, score, trimmedComment, SURVEY_VERSION],
    );

    if (rows.length === 0) {
      rows = await this.db.query<Pick<NpsRow, "id" | "category">>(
        `SELECT id, category FROM nps_responses WHERE user_id = $1 AND survey_version = $2 LIMIT 1`,
        [userId, SURVEY_VERSION],
      );
      if (rows.length === 0) {
        throw new Error("Failed to save NPS response");
      }
    }

    const { id, category } = rows[0]!;

    this.logger.info("nps_submitted", { userId, score, category });

    void this.sendNpsThankYouEmail(userId, score).catch((err: unknown) => {
      this.logger.warn("nps_thank_you_email_failed", {
        userId,
        error: err instanceof Error ? err.message : String(err),
      });
    });

    return { id, category };
  }

  private async sendNpsThankYouEmail(userId: string, score: number): Promise<void> {
    const users = await this.db.query<{ email: string; full_name: string }>(
      `SELECT email, full_name FROM nelvyon_users WHERE user_id = $1 LIMIT 1`,
      [userId],
    );
    const user = users[0];
    if (!user?.email) return;

    await sendEmail("nps_thank_you", {
      email: user.email,
      name: user.full_name,
      score: String(score),
      appUrl: process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? "https://nelvyon.com",
    });
  }

  async shouldShowNps(userId: string, registeredAt: Date): Promise<boolean> {
    if (Date.now() - registeredAt.getTime() < SEVEN_DAYS_MS) {
      return false;
    }

    const rows = await this.db.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM nps_responses WHERE user_id = $1 AND survey_version = $2`,
      [userId, SURVEY_VERSION],
    );
    const count = Number.parseInt(rows[0]?.count ?? "0", 10);
    return count === 0;
  }

  async submitFeedback(
    userId: string,
    data: { type: string; title: string; body: string; urlContext?: string },
  ): Promise<{ id: string }> {
    const type = data.type.trim();
    if (!FEEDBACK_TYPES.has(type)) {
      throw new Error("Invalid feedback type");
    }
    const title = data.title.trim();
    const body = data.body.trim();
    if (title.length === 0 || body.length === 0) {
      throw new Error("title and body are required");
    }

    const urlContext = data.urlContext?.trim() ? data.urlContext.trim() : null;

    const inserted = await this.db.query<{ id: string }>(
      `INSERT INTO feedback_items (user_id, type, title, body, url_context)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [userId, type, title, body, urlContext],
    );

    const id = inserted[0]!.id;
    this.logger.info("feedback_submitted", { userId, type });
    return { id };
  }

  async getFeedback(filters?: { type?: string; status?: string }): Promise<FeedbackItem[]> {
    const clauses: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (filters?.type?.trim()) {
      clauses.push(`type = $${idx++}`);
      params.push(filters.type.trim());
    }
    if (filters?.status?.trim()) {
      clauses.push(`status = $${idx++}`);
      params.push(filters.status.trim());
    }

    const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";

    const rows = await this.db.query<FeedbackRow>(
      `SELECT * FROM feedback_items ${where} ORDER BY upvotes DESC, created_at DESC LIMIT 100`,
      params,
    );
    return rows.map(mapFeedback);
  }
}
