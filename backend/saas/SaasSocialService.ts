/**
 * SaasSocialService — schedule and publish posts to Meta (Facebook/Instagram) and LinkedIn.
 * Tenant-scoped. Uses tokens stored in saas_social_accounts.
 * If no token → { connected: false }; never returns fake data.
 */
import { DbClient } from "../db/DbClient";

export type SocialPlatform = "meta" | "linkedin" | "instagram";
export type SocialPostStatus = "draft" | "scheduled" | "published" | "failed";

export type SocialAccount = {
  id: string;
  tenantId: string;
  platform: SocialPlatform;
  accountId: string;
  accountName: string;
  pageId: string | null;
  isActive: boolean;
  tokenExpiresAt: string | null;
  createdAt: string;
};

export type SocialPost = {
  id: string;
  tenantId: string;
  socialAccountId: string;
  platform: SocialPlatform;
  content: string;
  mediaUrls: string[];
  status: SocialPostStatus;
  scheduledAt: string | null;
  publishedAt: string | null;
  externalPostId: string | null;
  errorMessage: string | null;
  createdAt: string;
};

export type CreateSocialAccountInput = {
  platform: SocialPlatform;
  accountId: string;
  accountName: string;
  pageId?: string;
  accessToken: string;
  tokenExpiresAt?: string;
};

export type CreateSocialPostInput = {
  socialAccountId: string;
  content: string;
  mediaUrls?: string[];
  scheduledAt?: string;
};

export type PublishNowResult = {
  ok: true; externalPostId: string;
} | {
  ok: false; error: string;
};

export class SaasSocialError extends Error {
  constructor(message: string, public readonly code: "NOT_FOUND" | "VALIDATION" | "NOT_CONNECTED" | "PUBLISH_FAILED") {
    super(message);
    this.name = "SaasSocialError";
  }
}

const PLATFORMS: SocialPlatform[] = ["meta", "linkedin", "instagram"];

type DbPort = { query: <T = Record<string, unknown>>(sql: string, params?: unknown[]) => Promise<T[]> };
type FetchFn = typeof fetch;

type AccountRow = {
  id: string; tenant_id: string; platform: string; account_id: string;
  account_name: string; page_id: string | null; is_active: boolean;
  token_expires_at: string | null; created_at: Date;
};
type PostRow = {
  id: string; tenant_id: string; social_account_id: string; platform: string;
  content: string; media_urls: string[]; status: string;
  scheduled_at: string | null; published_at: string | null;
  external_post_id: string | null; error_message: string | null; created_at: Date;
};

function rowToAccount(r: AccountRow): SocialAccount {
  return {
    id: r.id, tenantId: r.tenant_id, platform: r.platform as SocialPlatform,
    accountId: r.account_id, accountName: r.account_name, pageId: r.page_id,
    isActive: r.is_active, tokenExpiresAt: r.token_expires_at,
    createdAt: new Date(r.created_at).toISOString(),
  };
}

function rowToPost(r: PostRow): SocialPost {
  return {
    id: r.id, tenantId: r.tenant_id, socialAccountId: r.social_account_id,
    platform: r.platform as SocialPlatform, content: r.content,
    mediaUrls: r.media_urls ?? [], status: r.status as SocialPostStatus,
    scheduledAt: r.scheduled_at, publishedAt: r.published_at,
    externalPostId: r.external_post_id, errorMessage: r.error_message,
    createdAt: new Date(r.created_at).toISOString(),
  };
}

export class SaasSocialService {
  constructor(private readonly db: DbPort, private readonly fetchFn: FetchFn = fetch) {}

  // --- Accounts ---

  async listAccounts(tenantId: string): Promise<SocialAccount[]> {
    const rows = await this.db.query<AccountRow>(
      `SELECT id,tenant_id,platform,account_id,account_name,page_id,is_active,token_expires_at,created_at
       FROM saas_social_accounts WHERE tenant_id=$1 ORDER BY created_at DESC`,
      [tenantId],
    );
    return rows.map(rowToAccount);
  }

  async connectAccount(tenantId: string, input: CreateSocialAccountInput): Promise<SocialAccount> {
    if (!PLATFORMS.includes(input.platform)) throw new SaasSocialError(`platform must be one of: ${PLATFORMS.join(", ")}`, "VALIDATION");
    if (!input.accountId?.trim()) throw new SaasSocialError("accountId required", "VALIDATION");
    if (!input.accountName?.trim()) throw new SaasSocialError("accountName required", "VALIDATION");
    if (!input.accessToken?.trim()) throw new SaasSocialError("accessToken required", "VALIDATION");

    const rows = await this.db.query<AccountRow>(
      `INSERT INTO saas_social_accounts (tenant_id,platform,account_id,account_name,page_id,access_token,token_expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (tenant_id,platform,account_id) DO UPDATE SET
         account_name=EXCLUDED.account_name, page_id=EXCLUDED.page_id,
         access_token=EXCLUDED.access_token, token_expires_at=EXCLUDED.token_expires_at,
         is_active=true, updated_at=NOW()
       RETURNING id,tenant_id,platform,account_id,account_name,page_id,is_active,token_expires_at,created_at`,
      [tenantId, input.platform, input.accountId, input.accountName, input.pageId ?? null,
       input.accessToken, input.tokenExpiresAt ?? null],
    );
    return rowToAccount(rows[0]);
  }

  async disconnectAccount(tenantId: string, accountId: string): Promise<void> {
    const rows = await this.db.query<{ id: string }>(
      `UPDATE saas_social_accounts SET is_active=false, updated_at=NOW()
       WHERE tenant_id=$1 AND id=$2 RETURNING id`,
      [tenantId, accountId],
    );
    if (!rows.length) throw new SaasSocialError("Social account not found", "NOT_FOUND");
  }

  // --- Posts ---

  async listPosts(tenantId: string, opts: { platform?: SocialPlatform; status?: SocialPostStatus } = {}): Promise<SocialPost[]> {
    let sql = `SELECT id,tenant_id,social_account_id,platform,content,media_urls,status,
               scheduled_at,published_at,external_post_id,error_message,created_at
               FROM saas_social_posts WHERE tenant_id=$1`;
    const params: unknown[] = [tenantId];
    if (opts.platform) { params.push(opts.platform); sql += ` AND platform=$${params.length}`; }
    if (opts.status) { params.push(opts.status); sql += ` AND status=$${params.length}`; }
    sql += ` ORDER BY created_at DESC LIMIT 200`;
    const rows = await this.db.query<PostRow>(sql, params);
    return rows.map(rowToPost);
  }

  async createPost(tenantId: string, input: CreateSocialPostInput): Promise<SocialPost> {
    if (!input.content?.trim()) throw new SaasSocialError("content required", "VALIDATION");

    // Verify account belongs to tenant and is active
    const accounts = await this.db.query<AccountRow>(
      `SELECT id,tenant_id,platform,account_id,account_name,page_id,is_active,token_expires_at,created_at
       FROM saas_social_accounts WHERE id=$1 AND tenant_id=$2 AND is_active=true LIMIT 1`,
      [input.socialAccountId, tenantId],
    );
    if (!accounts.length) throw new SaasSocialError("Social account not found or inactive", "NOT_FOUND");
    const account = accounts[0];

    const status: SocialPostStatus = input.scheduledAt ? "scheduled" : "draft";
    const rows = await this.db.query<PostRow>(
      `INSERT INTO saas_social_posts (tenant_id,social_account_id,platform,content,media_urls,status,scheduled_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING id,tenant_id,social_account_id,platform,content,media_urls,status,
                 scheduled_at,published_at,external_post_id,error_message,created_at`,
      [tenantId, input.socialAccountId, account.platform, input.content.trim(),
       input.mediaUrls ?? [], status, input.scheduledAt ?? null],
    );
    return rowToPost(rows[0]);
  }

  async deletePost(tenantId: string, postId: string): Promise<void> {
    const rows = await this.db.query<{ id: string }>(
      `DELETE FROM saas_social_posts WHERE id=$1 AND tenant_id=$2 AND status IN ('draft','scheduled') RETURNING id`,
      [postId, tenantId],
    );
    if (!rows.length) throw new SaasSocialError("Post not found or already published", "NOT_FOUND");
  }

  /**
   * Publish a post immediately. Called from cron or direct API.
   * Always returns result — never throws on platform error (marks post as failed instead).
   */
  async publishPost(tenantId: string, postId: string): Promise<PublishNowResult> {
    const postRows = await this.db.query<PostRow & { access_token: string; page_id: string | null }>(
      `SELECT p.*, a.access_token, a.page_id
       FROM saas_social_posts p
       JOIN saas_social_accounts a ON a.id = p.social_account_id
       WHERE p.id=$1 AND p.tenant_id=$2 AND p.status IN ('draft','scheduled') LIMIT 1`,
      [postId, tenantId],
    );
    if (!postRows.length) throw new SaasSocialError("Post not found or already published", "NOT_FOUND");
    const row = postRows[0];

    let result: PublishNowResult;
    if (row.platform === "meta" || row.platform === "instagram") {
      result = await this._publishMeta(row.access_token, row.page_id, row.content, row.media_urls);
    } else if (row.platform === "linkedin") {
      result = await this._publishLinkedIn(row.access_token, row.page_id, row.content);
    } else {
      result = { ok: false, error: `Unsupported platform: ${row.platform}` };
    }

    if (result.ok) {
      await this.db.query(
        `UPDATE saas_social_posts SET status='published', published_at=NOW(), external_post_id=$1, error_message=NULL, updated_at=NOW() WHERE id=$2`,
        [result.externalPostId, postId],
      );
    } else {
      await this.db.query(
        `UPDATE saas_social_posts SET status='failed', error_message=$1, updated_at=NOW() WHERE id=$2`,
        [result.error, postId],
      );
    }
    return result;
  }

  /** Process all scheduled posts with scheduled_at <= NOW() (called from cron) */
  async processDueScheduled(): Promise<{ published: number; failed: number }> {
    const due = await this.db.query<{ id: string; tenant_id: string }>(
      `SELECT id, tenant_id FROM saas_social_posts WHERE status='scheduled' AND scheduled_at <= NOW() LIMIT 50`,
    );
    let published = 0, failed = 0;
    for (const { id, tenant_id } of due) {
      const r = await this.publishPost(tenant_id, id).catch((e) => ({ ok: false as const, error: String(e) }));
      if (r.ok) published++; else failed++;
    }
    return { published, failed };
  }

  // --- Platform API calls ---

  private async _publishMeta(token: string, pageId: string | null, message: string, mediaUrls: string[]): Promise<PublishNowResult> {
    if (!pageId) return { ok: false, error: "Meta page_id not configured for this account" };
    try {
      const body: Record<string, string> = { message, access_token: token };
      if (mediaUrls.length > 0) body["link"] = mediaUrls[0]; // simplified — full media upload is a separate flow
      const res = await this.fetchFn(`https://graph.facebook.com/v19.0/${pageId}/feed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json() as { id?: string; error?: { message: string } };
      if (!res.ok || data.error) return { ok: false, error: `Meta API: ${data.error?.message ?? "unknown error"}` };
      return { ok: true, externalPostId: data.id ?? "" };
    } catch (e) {
      return { ok: false, error: `Meta API error: ${String(e)}` };
    }
  }

  private async _publishLinkedIn(token: string, orgUrn: string | null, text: string): Promise<PublishNowResult> {
    if (!orgUrn) return { ok: false, error: "LinkedIn org URN not configured for this account" };
    try {
      const payload = {
        author: orgUrn,
        lifecycleState: "PUBLISHED",
        specificContent: {
          "com.linkedin.ugc.ShareContent": {
            shareCommentary: { text },
            shareMediaCategory: "NONE",
          },
        },
        visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
      };
      const res = await this.fetchFn("https://api.linkedin.com/v2/ugcPosts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "X-Restli-Protocol-Version": "2.0.0",
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { message?: string };
        return { ok: false, error: `LinkedIn API: ${err.message ?? res.statusText}` };
      }
      const postId = res.headers.get("x-restli-id") ?? "unknown";
      return { ok: true, externalPostId: postId };
    } catch (e) {
      return { ok: false, error: `LinkedIn API error: ${String(e)}` };
    }
  }
}

let _instance: SaasSocialService | null = null;
export function getSaasSocialService(): SaasSocialService {
  if (!_instance) _instance = new SaasSocialService(DbClient.getInstance());
  return _instance;
}
export function resetSaasSocialServiceForTests(): void { _instance = null; }
