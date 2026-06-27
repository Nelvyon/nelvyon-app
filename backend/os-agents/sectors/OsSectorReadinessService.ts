/**
 * O16 — OsSectorReadinessService
 * Computes a production-readiness score for each of the 20 sector verticals from
 * REAL signals: sector seeds (prompt + landing), Envato registry coverage, agent
 * prompt presence, portal template, and a compliance QA rubric for regulated
 * sectors. No mock scores — every point maps to a verifiable artifact.
 */

// Minimal DB port (matches DbClient.getInstance()).
export type SectorDbPort = {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
};

// ── Sector seed port (apps/web sectorSeeds.ts, injectable for tests) ─────────────

export type SectorSeedInfo = {
  count: number;
  prompt: string;
  landingHeadline: string;
  metaTitle: string;
  chatbotGreeting: string;
};

export type SectorSeedPort = {
  getSeedInfo(sectorId: string): Promise<SectorSeedInfo | null>;
};

const defaultSeedPort: SectorSeedPort = {
  async getSeedInfo(sectorId) {
    const mod = (await import("../../../apps/web/src/lib/packs/sectorSeeds")) as {
      getSeedByIndex(s: string, i: number): {
        prompt: string; landing_headline: string; meta_title: string; chatbot_greeting: string;
      } | null;
      getSectorSeedCount(s: string): number;
    };
    const count = mod.getSectorSeedCount(sectorId);
    if (count === 0) return null;
    const seed = mod.getSeedByIndex(sectorId, 0);
    if (!seed) return null;
    return {
      count,
      prompt: seed.prompt ?? "",
      landingHeadline: seed.landing_headline ?? "",
      metaTitle: seed.meta_title ?? "",
      chatbotGreeting: seed.chatbot_greeting ?? "",
    };
  },
};

// ── Sector catalog (20 fixed verticals — matches docs/OS_SEEDS.md) ────────────────

export type Sensitivity = "low" | "medium" | "high";

type CatalogEntry = { id: string; label: string; sensitivity: Sensitivity; regulated: boolean };

export const SECTOR_CATALOG: readonly CatalogEntry[] = [
  { id: "dental", label: "Clínicas dentales", sensitivity: "high", regulated: true },
  { id: "legal", label: "Despachos de abogados", sensitivity: "high", regulated: true },
  { id: "fitness", label: "Gimnasios / fitness", sensitivity: "medium", regulated: false },
  { id: "beauty", label: "Clínicas estéticas", sensitivity: "high", regulated: true },
  { id: "restaurant", label: "Restaurantes", sensitivity: "low", regulated: false },
  { id: "real_estate", label: "Inmobiliarias", sensitivity: "medium", regulated: false },
  { id: "ecommerce", label: "Ecommerce / tiendas online", sensitivity: "medium", regulated: false },
  { id: "solar", label: "Instaladores solares", sensitivity: "medium", regulated: true },
  { id: "coaching", label: "Coaches y mentores", sensitivity: "low", regulated: false },
  { id: "saas_b2b", label: "SaaS B2B", sensitivity: "low", regulated: false },
  { id: "veterinaria", label: "Clínicas veterinarias", sensitivity: "medium", regulated: false },
  { id: "educacion", label: "Academias y centros educativos", sensitivity: "low", regulated: false },
  { id: "turismo", label: "Turismo y alojamiento", sensitivity: "low", regulated: false },
  { id: "construccion", label: "Construcción y reformas", sensitivity: "medium", regulated: false },
  { id: "automocion", label: "Concesionarios y talleres", sensitivity: "medium", regulated: false },
  { id: "logistica", label: "Logística y transporte B2B", sensitivity: "medium", regulated: false },
  { id: "seguros", label: "Corredurías de seguros", sensitivity: "high", regulated: true },
  { id: "contabilidad", label: "Asesorías fiscales y gestorías", sensitivity: "medium", regulated: true },
  { id: "hosteleria", label: "Hoteles y hostelería", sensitivity: "low", regulated: false },
  { id: "tecnologia", label: "Agencias IT / desarrollo software", sensitivity: "low", regulated: false },
] as const;

// Envato registry sectors use English ids that map to the first 10 verticals.
const ENVATO_SECTOR_ALIASES: Record<string, string> = {
  real_estate: "real_estate",
};

// Compliance markers that prove a regulated sector ships a QA rubric in its prompt.
const COMPLIANCE_MARKERS = ["disclaimer", "escalate", "no diagnost", "no prometas", "no proporciones", "confidencial", "sanitario"];

// ── Types ───────────────────────────────────────────────────────────────────────

export type ReadinessCheck = { key: string; label: string; done: boolean; points: number };

export type SectorReadiness = {
  sectorId: string;
  label: string;
  sensitivity: Sensitivity;
  regulated: boolean;
  seedCount: number;
  envatoCount: number;
  agentCount: number;
  hasPortalTemplate: boolean;
  hasQaRubric: boolean;
  readinessScore: number;
  checklist: ReadinessCheck[];
  metadata: Record<string, unknown>;
  updatedAt?: string;
};

export type ReadinessSummary = {
  totalSectors: number;
  productionReady: number; // score >= 80
  avgScore: number;
  regulatedCount: number;
};

export type OsSectorReadinessErrorCode = "NOT_FOUND";

export class OsSectorReadinessError extends Error {
  constructor(
    public readonly code: OsSectorReadinessErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "OsSectorReadinessError";
  }
}

// ── Scoring weights ──────────────────────────────────────────────────────────────

const POINTS = { seed: 25, envato: 15, agent: 25, portal: 20, qa: 15 } as const;

type ReadinessRow = {
  sector_id: string;
  label: string;
  sensitivity: Sensitivity;
  regulated: boolean;
  seed_count: number;
  envato_count: number;
  agent_count: number;
  has_portal_template: boolean;
  has_qa_rubric: boolean;
  readiness_score: number;
  checklist: ReadinessCheck[];
  metadata: Record<string, unknown>;
  updated_at: string;
};

function rowToReadiness(r: ReadinessRow): SectorReadiness {
  return {
    sectorId: r.sector_id,
    label: r.label,
    sensitivity: r.sensitivity,
    regulated: r.regulated,
    seedCount: r.seed_count,
    envatoCount: r.envato_count,
    agentCount: r.agent_count,
    hasPortalTemplate: r.has_portal_template,
    hasQaRubric: r.has_qa_rubric,
    readinessScore: r.readiness_score,
    checklist: r.checklist ?? [],
    metadata: r.metadata ?? {},
    updatedAt: r.updated_at,
  };
}

// ── Singleton ─────────────────────────────────────────────────────────────────────

let _instance: OsSectorReadinessService | null = null;

export function getOsSectorReadinessService(): OsSectorReadinessService {
  if (!_instance) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { DbClient } = require("../../db/DbClient") as { DbClient: { getInstance(): SectorDbPort } };
    _instance = new OsSectorReadinessService(DbClient.getInstance());
  }
  return _instance;
}

export function resetOsSectorReadinessServiceForTests(): void {
  _instance = null;
}

// ── Service ───────────────────────────────────────────────────────────────────────

export class OsSectorReadinessService {
  constructor(
    private readonly db: SectorDbPort,
    private readonly seedPort: SectorSeedPort = defaultSeedPort,
  ) {}

  /** Static catalog of the 20 verticals. */
  catalog(): readonly CatalogEntry[] {
    return SECTOR_CATALOG;
  }

  private async envatoCount(sectorId: string): Promise<number> {
    const key = ENVATO_SECTOR_ALIASES[sectorId] ?? sectorId;
    try {
      const rows = await this.db.query<{ count: string }>(
        `SELECT COUNT(*) AS count FROM os_envato_seed_registry WHERE sector = $1`,
        [key],
      );
      return parseInt(rows[0]?.count ?? "0", 10);
    } catch {
      return 0;
    }
  }

  /** Compute readiness from real artifacts (does not persist). */
  async computeReadiness(sectorId: string): Promise<SectorReadiness> {
    const entry = SECTOR_CATALOG.find((c) => c.id === sectorId);
    if (!entry) throw new OsSectorReadinessError("NOT_FOUND", `Sector ${sectorId} desconocido`);

    const seed = await this.seedPort.getSeedInfo(sectorId);
    const seedCount = seed?.count ?? 0;
    const envatoCount = await this.envatoCount(sectorId);

    const prompt = (seed?.prompt ?? "").toLowerCase();
    const agentCount = seed && seed.prompt.trim().length >= 20 ? seedCount : 0;
    const hasPortalTemplate = !!seed && seed.landingHeadline.trim().length > 0 && seed.metaTitle.trim().length > 0;
    // QA rubric: regulated sectors must carry compliance markers in the prompt;
    // non-regulated sectors don't require one (rubric considered satisfied/N/A).
    const hasQaRubric = entry.regulated
      ? COMPLIANCE_MARKERS.some((m) => prompt.includes(m))
      : true;

    const checklist: ReadinessCheck[] = [
      { key: "seed", label: "Seed sectorial con prompt", done: seedCount > 0, points: POINTS.seed },
      { key: "envato", label: "Plantillas Envato en registry", done: envatoCount > 0, points: POINTS.envato },
      { key: "agent", label: "Agente sectorial (prompt ≥20 chars)", done: agentCount > 0, points: POINTS.agent },
      { key: "portal", label: "Plantilla portal (landing + meta)", done: hasPortalTemplate, points: POINTS.portal },
      {
        key: "qa",
        label: entry.regulated ? "Rúbrica QA compliance (regulado)" : "Rúbrica QA (no requerida)",
        done: hasQaRubric,
        points: POINTS.qa,
      },
    ];

    const readinessScore = checklist.reduce((acc, c) => acc + (c.done ? c.points : 0), 0);

    return {
      sectorId: entry.id,
      label: entry.label,
      sensitivity: entry.sensitivity,
      regulated: entry.regulated,
      seedCount,
      envatoCount,
      agentCount,
      hasPortalTemplate,
      hasQaRubric,
      readinessScore,
      checklist,
      metadata: { computedAt: new Date().toISOString() },
    };
  }

  private async upsert(r: SectorReadiness): Promise<void> {
    await this.db.query(
      `INSERT INTO os_sector_readiness
         (sector_id, label, sensitivity, regulated, seed_count, envato_count,
          agent_count, has_portal_template, has_qa_rubric, readiness_score, checklist, metadata, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12::jsonb, NOW())
       ON CONFLICT (sector_id) DO UPDATE SET
         label = EXCLUDED.label,
         sensitivity = EXCLUDED.sensitivity,
         regulated = EXCLUDED.regulated,
         seed_count = EXCLUDED.seed_count,
         envato_count = EXCLUDED.envato_count,
         agent_count = EXCLUDED.agent_count,
         has_portal_template = EXCLUDED.has_portal_template,
         has_qa_rubric = EXCLUDED.has_qa_rubric,
         readiness_score = EXCLUDED.readiness_score,
         checklist = EXCLUDED.checklist,
         metadata = EXCLUDED.metadata,
         updated_at = NOW()`,
      [
        r.sectorId, r.label, r.sensitivity, r.regulated, r.seedCount, r.envatoCount,
        r.agentCount, r.hasPortalTemplate, r.hasQaRubric, r.readinessScore,
        JSON.stringify(r.checklist), JSON.stringify(r.metadata),
      ],
    );
  }

  /** UPSERT the 20-sector catalog with freshly computed readiness. */
  async syncSectorCatalog(): Promise<{ synced: number }> {
    let synced = 0;
    for (const entry of SECTOR_CATALOG) {
      const readiness = await this.computeReadiness(entry.id);
      await this.upsert(readiness);
      synced++;
    }
    return { synced };
  }

  /** Recompute + persist every sector and return the fresh list. */
  async refreshAll(): Promise<SectorReadiness[]> {
    await this.syncSectorCatalog();
    return this.listSectors();
  }

  async listSectors(): Promise<SectorReadiness[]> {
    const rows = await this.db.query<ReadinessRow>(
      `SELECT * FROM os_sector_readiness ORDER BY readiness_score DESC, sector_id ASC`,
    );
    return rows.map(rowToReadiness);
  }

  async getSector(sectorId: string): Promise<SectorReadiness> {
    const rows = await this.db.query<ReadinessRow>(
      `SELECT * FROM os_sector_readiness WHERE sector_id = $1`,
      [sectorId],
    );
    if (!rows[0]) throw new OsSectorReadinessError("NOT_FOUND", `Sector ${sectorId} no encontrado`);
    return rowToReadiness(rows[0]);
  }

  async getSummary(): Promise<ReadinessSummary> {
    const sectors = await this.listSectors();
    if (sectors.length === 0) {
      return { totalSectors: 0, productionReady: 0, avgScore: 0, regulatedCount: 0 };
    }
    const productionReady = sectors.filter((s) => s.readinessScore >= 80).length;
    const regulatedCount = sectors.filter((s) => s.regulated).length;
    const avgScore = Math.round(sectors.reduce((a, s) => a + s.readinessScore, 0) / sectors.length);
    return { totalSectors: sectors.length, productionReady, avgScore, regulatedCount };
  }

  /** Lightweight score lookup for the packOrchestrator hook (DB-only, no compute). */
  async getReadinessScore(sectorId: string): Promise<number | null> {
    try {
      const rows = await this.db.query<{ readiness_score: number }>(
        `SELECT readiness_score FROM os_sector_readiness WHERE sector_id = $1`,
        [sectorId],
      );
      return rows[0]?.readiness_score ?? null;
    } catch {
      return null;
    }
  }
}
