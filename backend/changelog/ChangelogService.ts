import { DbClient } from "../db/DbClient";
import { createLogger } from "../logger";

export type ChangelogType = "feature" | "improvement" | "fix" | "security";
export type RoadmapStatus = "planned" | "in_progress" | "done";
export type RoadmapCategory = "core" | "integrations" | "ai" | "billing" | "ux";

export interface ChangelogEntry {
  id: string;
  version: string;
  title: string;
  body: string;
  type: ChangelogType;
  publishedAt: string;
  isPublished: boolean;
  createdAt: string;
}

export interface RoadmapItem {
  id: string;
  title: string;
  description: string;
  status: RoadmapStatus;
  category: RoadmapCategory;
  votes: number;
  eta: string | null;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ChangelogRow {
  id: string;
  version: string;
  title: string;
  body: string;
  type: ChangelogType;
  published_at: string;
  is_published: boolean;
  created_at: string;
}

interface RoadmapRow {
  id: string;
  title: string;
  description: string;
  status: RoadmapStatus;
  category: RoadmapCategory;
  votes: number;
  eta: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

function mapChangelog(r: ChangelogRow): ChangelogEntry {
  return {
    id: r.id,
    version: r.version,
    title: r.title,
    body: r.body,
    type: r.type,
    publishedAt: r.published_at,
    isPublished: r.is_published,
    createdAt: r.created_at,
  };
}

function mapRoadmap(r: RoadmapRow): RoadmapItem {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    status: r.status,
    category: r.category,
    votes: r.votes,
    eta: r.eta,
    isPublic: r.is_public,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

let inst: ChangelogService | undefined;

export class ChangelogService {
  private readonly db: DbClient;
  private readonly logger = createLogger("changelog");

  private constructor() {
    this.db = DbClient.getInstance();
  }

  static instance(): ChangelogService {
    if (!inst) inst = new ChangelogService();
    return inst;
  }

  static reset(): void {
    inst = undefined;
  }

  async getChangelog(): Promise<ChangelogEntry[]> {
    const rows = await this.db.query<ChangelogRow>(
      `SELECT * FROM changelog_entries
       WHERE is_published = true
       ORDER BY published_at DESC
       LIMIT 50`,
    );
    this.logger.info("changelog_fetched", { count: rows.length });
    return rows.map(mapChangelog);
  }

  async getRoadmap(): Promise<RoadmapItem[]> {
    const rows = await this.db.query<RoadmapRow>(
      `SELECT * FROM roadmap_items
       WHERE is_public = true
       ORDER BY status ASC, votes DESC, created_at DESC`,
    );
    this.logger.info("roadmap_fetched", { count: rows.length });
    return rows.map(mapRoadmap);
  }
}
