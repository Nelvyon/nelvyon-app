import type { DbClient } from "../db/DbClient";
import { DbClient as DbClientClass } from "../db/DbClient";

export interface Community {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  icon: string;
  membersCount: number;
  postsCount: number;
  createdAt: string;
}

export interface CommunityPost {
  id: string;
  communityId: string;
  tenantId: string;
  authorName: string;
  authorEmail: string | null;
  title: string | null;
  content: string;
  likes: number;
  repliesCount: number;
  pinned: boolean;
  createdAt: string;
}

export interface CreateCommunityInput {
  name: string;
  description?: string;
  icon?: string;
}

export interface CreatePostInput {
  authorName: string;
  authorEmail?: string;
  title?: string;
  content: string;
}

export type SaasCommunitiesServiceDeps = { db?: Pick<DbClient, "query"> };

const COM_SEL = `id, tenant_id as "tenantId", name, description, icon,
  members_count as "membersCount", posts_count as "postsCount", created_at as "createdAt"`;
const POST_SEL = `id, community_id as "communityId", tenant_id as "tenantId",
  author_name as "authorName", author_email as "authorEmail",
  title, content, likes, replies_count as "repliesCount",
  pinned, created_at as "createdAt"`;

function mapCom(r: Record<string, unknown>): Community {
  return {
    id: String(r.id), tenantId: String(r.tenantId), name: String(r.name),
    description: r.description != null ? String(r.description) : null,
    icon: String(r.icon ?? "💬"),
    membersCount: Number(r.membersCount ?? 0), postsCount: Number(r.postsCount ?? 0),
    createdAt: String(r.createdAt),
  };
}

function mapPost(r: Record<string, unknown>): CommunityPost {
  return {
    id: String(r.id), communityId: String(r.communityId), tenantId: String(r.tenantId),
    authorName: String(r.authorName), authorEmail: r.authorEmail != null ? String(r.authorEmail) : null,
    title: r.title != null ? String(r.title) : null, content: String(r.content),
    likes: Number(r.likes ?? 0), repliesCount: Number(r.repliesCount ?? 0),
    pinned: Boolean(r.pinned), createdAt: String(r.createdAt),
  };
}

export class SaasCommunitiesService {
  constructor(private readonly deps: SaasCommunitiesServiceDeps = {}) {}
  private get db() { return this.deps.db ?? DbClientClass.getInstance(); }

  async listCommunities(tenantId: string): Promise<Community[]> {
    const rows = await this.db.query<Record<string, unknown>>(
      `SELECT ${COM_SEL} FROM communities WHERE tenant_id=$1 ORDER BY name`,
      [tenantId],
    );
    return rows.map(mapCom);
  }

  async getCommunity(tenantId: string, id: string): Promise<Community | null> {
    const rows = await this.db.query<Record<string, unknown>>(
      `SELECT ${COM_SEL} FROM communities WHERE id=$1::uuid AND tenant_id=$2`,
      [id, tenantId],
    );
    return rows[0] ? mapCom(rows[0]) : null;
  }

  async createCommunity(tenantId: string, input: CreateCommunityInput): Promise<Community> {
    if (!input.name?.trim()) throw Object.assign(new Error("name is required"), { code: "VALIDATION" });
    const rows = await this.db.query<Record<string, unknown>>(
      `INSERT INTO communities (tenant_id, name, description, icon)
       VALUES ($1,$2,$3,$4) RETURNING ${COM_SEL}`,
      [tenantId, input.name.trim(), input.description ?? null, input.icon ?? "💬"],
    );
    const row = rows[0];
    if (!row) throw new Error("SaasCommunitiesService.createCommunity: no row");
    return mapCom(row);
  }

  async deleteCommunity(tenantId: string, id: string): Promise<boolean> {
    const rows = await this.db.query<{ id: string }>(
      `DELETE FROM communities WHERE id=$1::uuid AND tenant_id=$2 RETURNING id`,
      [id, tenantId],
    );
    return rows.length > 0;
  }

  async listPosts(tenantId: string, communityId: string): Promise<CommunityPost[]> {
    const rows = await this.db.query<Record<string, unknown>>(
      `SELECT ${POST_SEL} FROM community_posts
       WHERE community_id=$1::uuid AND tenant_id=$2
       ORDER BY pinned DESC, created_at DESC`,
      [communityId, tenantId],
    );
    return rows.map(mapPost);
  }

  async createPost(tenantId: string, communityId: string, input: CreatePostInput): Promise<CommunityPost> {
    if (!input.content?.trim()) throw Object.assign(new Error("content is required"), { code: "VALIDATION" });
    if (!input.authorName?.trim()) throw Object.assign(new Error("authorName is required"), { code: "VALIDATION" });

    const rows = await this.db.query<Record<string, unknown>>(
      `WITH ins AS (
         INSERT INTO community_posts (community_id, tenant_id, author_name, author_email, title, content)
         VALUES ($1::uuid,$2,$3,$4,$5,$6) RETURNING ${POST_SEL}
       ), upd AS (
         UPDATE communities SET posts_count = posts_count + 1
         WHERE id=$1::uuid AND tenant_id=$2
       )
       SELECT * FROM ins`,
      [communityId, tenantId, input.authorName.trim(), input.authorEmail ?? null, input.title ?? null, input.content.trim()],
    );
    const row = rows[0];
    if (!row) throw new Error("SaasCommunitiesService.createPost: no row");
    return mapPost(row);
  }

  async likePost(tenantId: string, postId: string): Promise<boolean> {
    const rows = await this.db.query<{ id: string }>(
      `UPDATE community_posts SET likes = likes + 1
       WHERE id=$1::uuid AND tenant_id=$2 RETURNING id`,
      [postId, tenantId],
    );
    return rows.length > 0;
  }

  async pinPost(tenantId: string, postId: string, pinned: boolean): Promise<boolean> {
    const rows = await this.db.query<{ id: string }>(
      `UPDATE community_posts SET pinned=$3
       WHERE id=$1::uuid AND tenant_id=$2 RETURNING id`,
      [postId, tenantId, pinned],
    );
    return rows.length > 0;
  }

  async deletePost(tenantId: string, postId: string): Promise<boolean> {
    const rows = await this.db.query<{ id: string }>(
      `WITH del AS (
         DELETE FROM community_posts WHERE id=$1::uuid AND tenant_id=$2 RETURNING id, community_id
       ), upd AS (
         UPDATE communities SET posts_count = GREATEST(posts_count - 1, 0)
         WHERE id = (SELECT community_id FROM del) AND tenant_id=$2
       )
       SELECT id FROM del`,
      [postId, tenantId],
    );
    return rows.length > 0;
  }
}

let _svc: SaasCommunitiesService | undefined;
export function getSaasCommunitiesService(): SaasCommunitiesService {
  if (!_svc) _svc = new SaasCommunitiesService();
  return _svc;
}
export function resetSaasCommunitiesServiceForTests(): void { _svc = undefined; }
