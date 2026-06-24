import type { DbClient } from "../db/DbClient";
import { DbClient as DbClientClass } from "../db/DbClient";

// ── Types ──────────────────────────────────────────────────────────────────────

export type ReviewReplyStatus = "pending" | "replied" | "ignored";

export interface GbpReview {
  id: string;
  tenantId: string;
  googleReviewId: string;
  authorName: string;
  rating: number;
  reviewText: string | null;
  reviewTime: string | null;
  replyText: string | null;
  replyTime: string | null;
  replyStatus: ReviewReplyStatus;
  syncedAt: string;
  createdAt: string;
}

export interface GbpConfig {
  placesConfigured: boolean;
  oauthConfigured: boolean;
  placeId: string | null;
  accountId: string | null;
  locationId: string | null;
}

export interface SyncResult {
  synced: number;
  newNegative: number;
}

export interface GbpStats {
  total: number;
  avgRating: number;
  byRating: Record<number, number>;
  pendingReplies: number;
}

export class SaasReputationError extends Error {
  constructor(message: string, public code: "NOT_FOUND" | "VALIDATION" | "OAUTH_REQUIRED" | "EXTERNAL_ERROR") {
    super(message);
    this.name = "SaasReputationError";
  }
}

// ── Mapper ─────────────────────────────────────────────────────────────────────

function rowToReview(r: Record<string, unknown>): GbpReview {
  return {
    id: String(r.id),
    tenantId: String(r.tenantId ?? r.tenant_id),
    googleReviewId: String(r.googleReviewId ?? r.google_review_id),
    authorName: String(r.authorName ?? r.author_name),
    rating: Number(r.rating),
    reviewText: r.reviewText != null ? String(r.reviewText) : r.review_text != null ? String(r.review_text) : null,
    reviewTime: r.reviewTime != null ? String(r.reviewTime) : r.review_time != null ? String(r.review_time) : null,
    replyText: r.replyText != null ? String(r.replyText) : r.reply_text != null ? String(r.reply_text) : null,
    replyTime: r.replyTime != null ? String(r.replyTime) : r.reply_time != null ? String(r.reply_time) : null,
    replyStatus: String(r.replyStatus ?? r.reply_status ?? "pending") as ReviewReplyStatus,
    syncedAt: String(r.syncedAt ?? r.synced_at ?? new Date().toISOString()),
    createdAt: String(r.createdAt ?? r.created_at),
  };
}

// ── Service ────────────────────────────────────────────────────────────────────

const REVIEW_SEL = `id, tenant_id AS "tenantId", google_review_id AS "googleReviewId",
  author_name AS "authorName", rating, review_text AS "reviewText",
  review_time AS "reviewTime", reply_text AS "replyText", reply_time AS "replyTime",
  reply_status AS "replyStatus", synced_at AS "syncedAt", created_at AS "createdAt"`;

export class SaasReputationService {
  private db: Pick<DbClient, "query">;

  constructor(deps?: { db?: Pick<DbClient, "query"> }) {
    this.db = deps?.db ?? DbClientClass.getInstance();
  }

  // ── Config ─────────────────────────────────────────────────────────────────

  getGbpConfig(): GbpConfig {
    const placeId = process.env.GBP_PLACE_ID?.trim() ?? null;
    const apiKey = process.env.GOOGLE_PLACES_API_KEY?.trim() ?? null;
    const accountId = process.env.GBP_ACCOUNT_ID?.trim() ?? null;
    const locationId = process.env.GBP_LOCATION_ID?.trim() ?? null;
    const accessToken = process.env.GBP_ACCESS_TOKEN?.trim() ?? null;
    return {
      placesConfigured: !!(placeId && apiKey),
      oauthConfigured: !!(accountId && locationId && accessToken),
      placeId,
      accountId,
      locationId,
    };
  }

  // ── Sync ───────────────────────────────────────────────────────────────────

  async syncGbpReviews(tenantId: string, workflowDispatch?: (triggerData: Record<string, unknown>) => Promise<void>): Promise<SyncResult> {
    const cfg = this.getGbpConfig();
    if (!cfg.placesConfigured) return { synced: 0, newNegative: 0 };

    const placeId = cfg.placeId!;
    const apiKey = process.env.GOOGLE_PLACES_API_KEY!;

    // Fetch from Google Places API
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=reviews&key=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) throw new SaasReputationError(`Google Places API error: ${res.status}`, "EXTERNAL_ERROR");

    const data = await res.json() as {
      result?: { reviews?: Array<{ author_name: string; rating: number; text?: string; time: number; review_id?: string }> };
      status?: string;
    };
    if (data.status && data.status !== "OK") {
      throw new SaasReputationError(`Google Places status: ${data.status}`, "EXTERNAL_ERROR");
    }

    const apiReviews = data.result?.reviews ?? [];
    let synced = 0;
    let newNegative = 0;

    for (const r of apiReviews) {
      // Use composite key as google_review_id since Places API doesn't expose review IDs directly
      const gId = r.review_id ?? `${placeId}-${r.author_name}-${r.time}`;
      const reviewTime = r.time ? new Date(r.time * 1000).toISOString() : null;

      const existing = await this.db.query<{ id: string; rating: number }>(
        `SELECT id, rating FROM gbp_reviews WHERE tenant_id = $1 AND google_review_id = $2`, [tenantId, gId],
      );

      const isNew = !existing[0];

      await this.db.query(
        `INSERT INTO gbp_reviews (tenant_id, google_review_id, author_name, rating, review_text, review_time, synced_at)
         VALUES ($1,$2,$3,$4,$5,$6,NOW())
         ON CONFLICT (tenant_id, google_review_id)
         DO UPDATE SET author_name = EXCLUDED.author_name, rating = EXCLUDED.rating,
           review_text = EXCLUDED.review_text, synced_at = NOW()`,
        [tenantId, gId, r.author_name, r.rating, r.text ?? null, reviewTime],
      );
      synced++;

      // Fire workflow trigger for new negative reviews (rating ≤ 2)
      if (isNew && r.rating <= 2) {
        newNegative++;
        if (workflowDispatch) {
          await workflowDispatch({
            author: r.author_name,
            rating: r.rating,
            text: r.text ?? "",
            review_time: reviewTime,
          });
        }
      }
    }

    return { synced, newNegative };
  }

  // ── List / Get ─────────────────────────────────────────────────────────────

  async listReviews(tenantId: string, opts?: { rating?: number; replyStatus?: ReviewReplyStatus; limit?: number }): Promise<GbpReview[]> {
    const conditions = [`r.tenant_id = $1`];
    const params: unknown[] = [tenantId];
    let i = 2;
    if (opts?.rating !== undefined) { conditions.push(`r.rating = $${i++}`); params.push(opts.rating); }
    if (opts?.replyStatus) { conditions.push(`r.reply_status = $${i++}`); params.push(opts.replyStatus); }
    const limit = opts?.limit ?? 50;
    params.push(limit);
    const rows = await this.db.query<Record<string, unknown>>(
      `SELECT ${REVIEW_SEL} FROM gbp_reviews r WHERE ${conditions.join(" AND ")}
       ORDER BY r.review_time DESC NULLS LAST, r.created_at DESC LIMIT $${i}`,
      params,
    );
    return rows.map(rowToReview);
  }

  async getReview(tenantId: string, reviewId: string): Promise<GbpReview> {
    const rows = await this.db.query<Record<string, unknown>>(
      `SELECT ${REVIEW_SEL} FROM gbp_reviews r WHERE r.tenant_id = $1 AND r.id = $2`,
      [tenantId, reviewId],
    );
    if (!rows[0]) throw new SaasReputationError("Reseña no encontrada", "NOT_FOUND");
    return rowToReview(rows[0]);
  }

  // ── Reply ──────────────────────────────────────────────────────────────────

  async replyToReview(tenantId: string, reviewId: string, comment: string): Promise<GbpReview> {
    if (!comment.trim()) throw new SaasReputationError("El comentario no puede estar vacío", "VALIDATION");

    const review = await this.getReview(tenantId, reviewId);
    const cfg = this.getGbpConfig();

    if (cfg.oauthConfigured) {
      // Call GBP API v4 via OAuth
      const accessToken = process.env.GBP_ACCESS_TOKEN!;
      const accountId = cfg.accountId!;
      const locationId = cfg.locationId!;
      const googleReviewId = review.googleReviewId;

      const gbpRes = await fetch(
        `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/reviews/${encodeURIComponent(googleReviewId)}/reply`,
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ comment: comment.trim() }),
        },
      );
      if (!gbpRes.ok) {
        const err = await gbpRes.json().catch(() => ({})) as { error?: { message?: string } };
        throw new SaasReputationError(
          `Google Business Profile API error: ${err.error?.message ?? gbpRes.status}`,
          "EXTERNAL_ERROR",
        );
      }
    }
    // If no OAuth configured → save locally only (soft reply)

    const updated = await this.db.query<Record<string, unknown>>(
      `UPDATE gbp_reviews SET reply_text = $3, reply_time = NOW(), reply_status = 'replied'
       WHERE tenant_id = $1 AND id = $2
       RETURNING ${REVIEW_SEL}`,
      [tenantId, reviewId, comment.trim()],
    );
    if (!updated[0]) throw new SaasReputationError("Reseña no encontrada", "NOT_FOUND");
    return rowToReview(updated[0]);
  }

  async markIgnored(tenantId: string, reviewId: string): Promise<GbpReview> {
    const updated = await this.db.query<Record<string, unknown>>(
      `UPDATE gbp_reviews SET reply_status = 'ignored'
       WHERE tenant_id = $1 AND id = $2
       RETURNING ${REVIEW_SEL}`,
      [tenantId, reviewId],
    );
    if (!updated[0]) throw new SaasReputationError("Reseña no encontrada", "NOT_FOUND");
    return rowToReview(updated[0]);
  }

  // ── Stats ──────────────────────────────────────────────────────────────────

  async getStats(tenantId: string): Promise<GbpStats> {
    const rows = await this.db.query<{ rating: string; cnt: string }>(
      `SELECT rating::text, COUNT(*) AS cnt FROM gbp_reviews WHERE tenant_id = $1 GROUP BY rating`, [tenantId],
    );
    const pendingRows = await this.db.query<{ cnt: string }>(
      `SELECT COUNT(*) AS cnt FROM gbp_reviews WHERE tenant_id = $1 AND reply_status = 'pending'`, [tenantId],
    );

    const byRating: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let total = 0;
    let ratingSum = 0;
    for (const r of rows) {
      const rating = Number(r.rating);
      const cnt = Number(r.cnt);
      byRating[rating] = cnt;
      total += cnt;
      ratingSum += rating * cnt;
    }

    return {
      total,
      avgRating: total > 0 ? Math.round((ratingSum / total) * 10) / 10 : 0,
      byRating,
      pendingReplies: Number(pendingRows[0]?.cnt ?? 0),
    };
  }
}

let _instance: SaasReputationService | null = null;
export function getSaasReputationService(): SaasReputationService {
  _instance ??= new SaasReputationService();
  return _instance;
}
