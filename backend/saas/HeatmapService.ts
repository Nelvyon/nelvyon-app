import { randomBytes } from "crypto";

import type { DbClient } from "../db/DbClient";
import { DbClient as DbClientClass } from "../db/DbClient";
import type { ILlmClient } from "../os-agents/LlmClient";
import { LLM_DEFAULT_MAX_TOKENS, LLM_DEFAULT_MODEL, LlmClient } from "../os-agents/LlmClient";

export type HeatmapEventType = "click" | "move" | "scroll" | "pageview" | "rage_click" | "u_turn";

export type HeatmapTrackEvent = {
  type: HeatmapEventType;
  x?: number;
  y?: number;
  page: string;
  element?: string;
  timestamp: number;
};

export type HeatmapSessionData = {
  userAgent: string;
  page: string;
  referrer?: string;
  duration?: number;
  scrollDepth?: number;
  device: "desktop" | "mobile" | "tablet";
};

export type HeatmapPoint = {
  x: number;
  y: number;
  value: number;
};

export type SessionRow = {
  id: string;
  siteId: string;
  sessionId: string;
  userAgent: string | null;
  device: string;
  page: string | null;
  referrer: string | null;
  duration: number;
  scrollDepth: number;
  pagesViewed: number;
  hasRageClick: boolean;
  createdAt: string;
};

export type FunnelStepResult = {
  page: string;
  sessions: number;
  dropoffRate: number;
};

export type FunnelAnalysis = {
  steps: FunnelStepResult[];
  overallConversion: number;
};

export type AIAnalysisResult = {
  insights: string[];
  criticalIssues: string[];
  recommendations: string[];
  priorityScore: number;
};

export type HeatmapAlert = {
  id: string;
  siteId: string;
  userId: string;
  type: string;
  message: string;
  severity: string;
  createdAt: string;
};

export type SiteConfig = {
  id: string;
  userId: string;
  domain: string;
  siteId: string;
  trackingScript: string;
  createdAt: string;
};

export type SessionFilters = {
  device?: string;
  fromDate?: string;
  toDate?: string;
};

export type HeatmapServiceDeps = {
  db?: Pick<DbClient, "query">;
  llm?: ILlmClient;
  appOrigin?: string;
};

const AI_TEMPERATURE = 0.2;
const GRID = 24;

function extractJsonPayload(text: string): string {
  const trimmed = text.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)```/m.exec(trimmed);
  if (fenced?.[1]) return fenced[1].trim();
  return trimmed;
}

function generatePublicSiteId(): string {
  return randomBytes(12).toString("hex");
}

function buildTrackingScript(siteKey: string, origin: string): string {
  const o = origin.replace(/\/$/, "");
  return `(function(){
  var S="${siteKey}";
  var O="${o}";
  var sid=sessionStorage.getItem("hm_sid")||(crypto.randomUUID&&crypto.randomUUID())||("s"+Date.now());
  sessionStorage.setItem("hm_sid",sid);
  function dev(){var ua=navigator.userAgent;if(/Mobile|Android|iPhone/i.test(ua))return "mobile";if(/Tablet|iPad/i.test(ua))return "tablet";return "desktop";}
  function send(type,payload){fetch(O+"/api/saas/heatmap/track",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({siteId:S,sessionId:sid,type:type,payload:payload})}).catch(function(){});}
  send("session",{userAgent:navigator.userAgent,page:location.href,referrer:document.referrer||null,device:dev(),duration:0,scrollDepth:Math.round((window.scrollY/Math.max(1,document.body.scrollHeight-window.innerHeight))*100)||0});
  send("event",{type:"pageview",page:location.href,timestamp:Date.now()});
  document.addEventListener("click",function(e){send("event",{type:"click",x:e.clientX,y:e.clientY,page:location.href,element:(e.target&&e.target.tagName)||"",timestamp:Date.now()});},true);
  window.addEventListener("scroll",function(){var sh=document.body.scrollHeight-window.innerHeight;var pct=sh>0?Math.round((window.scrollY/sh)*100):0;send("event",{type:"scroll",x:50,y:pct,page:location.href,timestamp:Date.now()});},{passive:true});
})();`;
}

export class HeatmapService {
  constructor(private readonly deps: HeatmapServiceDeps = {}) {}

  private get db(): Pick<DbClient, "query"> {
    return this.deps.db ?? DbClientClass.getInstance();
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? LlmClient.getInstance();
  }

  private origin(): string {
    return this.deps.appOrigin?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000";
  }

  async assertSiteOwner(siteKey: string, userId: string): Promise<void> {
    const rows = await this.db.query<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM heatmap_sites WHERE site_id = $1 AND user_id = $2::uuid`,
      [siteKey, userId],
    );
    if (!rows[0] || rows[0].n === "0") throw new Error("heatmap: sitio no autorizado");
  }

  async createSite(userId: string, domain: string): Promise<SiteConfig> {
    const siteKey = generatePublicSiteId();
    const rows = await this.db.query<{
      id: string;
      user_id: string;
      domain: string;
      site_id: string;
      created_at: Date | string;
    }>(
      `INSERT INTO heatmap_sites (user_id, domain, site_id)
       VALUES ($1::uuid, $2, $3)
       RETURNING id::text, user_id::text, domain, site_id, created_at`,
      [userId, domain.trim(), siteKey],
    );
    const r = rows[0];
    if (!r) throw new Error("createSite failed");
    const script = buildTrackingScript(r.site_id, this.origin());
    return {
      id: r.id,
      userId: r.user_id,
      domain: r.domain,
      siteId: r.site_id,
      trackingScript: `<script>${script}</script>`,
      createdAt: typeof r.created_at === "string" ? r.created_at : r.created_at.toISOString(),
    };
  }

  async getSiteConfig(userId: string): Promise<SiteConfig | null> {
    const rows = await this.db.query<{
      id: string;
      user_id: string;
      domain: string;
      site_id: string;
      created_at: Date | string;
    }>(
      `SELECT id::text, user_id::text, domain, site_id, created_at
       FROM heatmap_sites
       WHERE user_id = $1::uuid
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId],
    );
    const r = rows[0];
    if (!r) return null;
    const script = buildTrackingScript(r.site_id, this.origin());
    return {
      id: r.id,
      userId: r.user_id,
      domain: r.domain,
      siteId: r.site_id,
      trackingScript: `<script>${script}</script>`,
      createdAt: typeof r.created_at === "string" ? r.created_at : r.created_at.toISOString(),
    };
  }

  async trackEvent(siteKey: string, sessionId: string, event: HeatmapTrackEvent): Promise<void> {
    const own = await this.db.query<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM heatmap_sites WHERE site_id = $1`,
      [siteKey],
    );
    if (!own[0] || own[0].n === "0") throw new Error("trackEvent: site inválido");

    await this.db.query(
      `INSERT INTO heatmap_events (site_id, session_id, type, x, y, page, element, timestamp_ms)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        siteKey,
        sessionId,
        event.type,
        typeof event.x === "number" ? Math.round(event.x) : null,
        typeof event.y === "number" ? Math.round(event.y) : null,
        event.page,
        event.element ?? null,
        event.timestamp,
      ],
    );

    if (event.type === "rage_click") {
      await this.db.query(
        `UPDATE heatmap_sessions SET has_rage_click = true, updated_at = NOW()
         WHERE site_id = $1 AND session_id = $2`,
        [siteKey, sessionId],
      );
    }

    if (event.type === "pageview") {
      await this.db.query(
        `UPDATE heatmap_sessions
         SET pages_viewed = pages_viewed + 1, page = $3, updated_at = NOW()
         WHERE site_id = $1 AND session_id = $2`,
        [siteKey, sessionId, event.page],
      );
    }
  }

  async trackSession(siteKey: string, sessionId: string, data: HeatmapSessionData): Promise<void> {
    const own = await this.db.query<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM heatmap_sites WHERE site_id = $1`,
      [siteKey],
    );
    if (!own[0] || own[0].n === "0") throw new Error("trackSession: site inválido");

    const duration = typeof data.duration === "number" && Number.isFinite(data.duration) ? Math.max(0, Math.round(data.duration)) : 0;
    const scroll =
      typeof data.scrollDepth === "number" && Number.isFinite(data.scrollDepth)
        ? Math.min(100, Math.max(0, Math.round(data.scrollDepth)))
        : 0;

    await this.db.query(
      `INSERT INTO heatmap_sessions (
         site_id, session_id, user_agent, device, page, referrer, duration, scroll_depth, pages_viewed, updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 1, NOW())
       ON CONFLICT (site_id, session_id) DO UPDATE SET
         page = EXCLUDED.page,
         referrer = COALESCE(EXCLUDED.referrer, heatmap_sessions.referrer),
         duration = GREATEST(heatmap_sessions.duration, EXCLUDED.duration),
         scroll_depth = GREATEST(heatmap_sessions.scroll_depth, EXCLUDED.scroll_depth),
         user_agent = COALESCE(EXCLUDED.user_agent, heatmap_sessions.user_agent),
         device = EXCLUDED.device,
         updated_at = NOW()`,
      [
        siteKey,
        sessionId,
        data.userAgent,
        data.device,
        data.page,
        data.referrer ?? null,
        duration,
        scroll,
      ],
    );
  }

  async getHeatmapData(
    siteKey: string,
    userId: string,
    page: string,
    type: "click" | "move" | "scroll",
  ): Promise<HeatmapPoint[]> {
    await this.assertSiteOwner(siteKey, userId);

    const rows = await this.db.query<{ x: number | null; y: number | null }>(
      `SELECT x, y FROM heatmap_events
       WHERE site_id = $1 AND page = $2 AND type = $3
         AND x IS NOT NULL AND y IS NOT NULL`,
      [siteKey, page, type],
    );

    const buckets = new Map<string, number>();
    for (const r of rows) {
      if (r.x == null || r.y == null) continue;
      let gx: number;
      let gy: number;
      if (type === "scroll") {
        gx = Math.min(GRID - 1, Math.max(0, Math.floor((r.x / 100) * GRID)));
        gy = Math.min(GRID - 1, Math.max(0, Math.floor((r.y / 100) * GRID)));
      } else {
        gx = Math.min(GRID - 1, Math.max(0, Math.floor((r.x / 1920) * GRID)));
        gy = Math.min(GRID - 1, Math.max(0, Math.floor((r.y / 1080) * GRID)));
      }
      const k = `${gx},${gy}`;
      buckets.set(k, (buckets.get(k) ?? 0) + 1);
    }

    let max = 0;
    for (const v of buckets.values()) max = Math.max(max, v);
    if (max === 0) return [];

    const out: HeatmapPoint[] = [];
    for (const [k, c] of buckets) {
      const [gx, gy] = k.split(",").map(Number);
      const cx = ((gx + 0.5) / GRID) * 100;
      const cy = ((gy + 0.5) / GRID) * 100;
      const value = Math.round((c / max) * 100);
      out.push({ x: Math.round(cx * 10) / 10, y: Math.round(cy * 10) / 10, value });
    }
    return out.sort((a, b) => b.value - a.value);
  }

  async getSessions(siteKey: string, userId: string, filters?: SessionFilters): Promise<SessionRow[]> {
    await this.assertSiteOwner(siteKey, userId);

    const params: unknown[] = [siteKey];
    let sql = `SELECT id::text, site_id, session_id, user_agent, device, page, referrer,
                      duration, scroll_depth, pages_viewed, has_rage_click, created_at
               FROM heatmap_sessions WHERE site_id = $1`;
    let i = 2;
    if (filters?.device) {
      sql += ` AND device = $${i}`;
      params.push(filters.device);
      i += 1;
    }
    if (filters?.fromDate) {
      sql += ` AND created_at >= $${i}::timestamptz`;
      params.push(filters.fromDate);
      i += 1;
    }
    if (filters?.toDate) {
      sql += ` AND created_at <= $${i}::timestamptz`;
      params.push(filters.toDate);
      i += 1;
    }
    sql += ` ORDER BY created_at DESC LIMIT 500`;

    const rows = await this.db.query<{
      id: string;
      site_id: string;
      session_id: string;
      user_agent: string | null;
      device: string;
      page: string | null;
      referrer: string | null;
      duration: number;
      scroll_depth: number;
      pages_viewed: number;
      has_rage_click: boolean;
      created_at: Date | string;
    }>(sql, params);

    return rows.map((r) => ({
      id: r.id,
      siteId: r.site_id,
      sessionId: r.session_id,
      userAgent: r.user_agent,
      device: r.device,
      page: r.page,
      referrer: r.referrer,
      duration: r.duration,
      scrollDepth: r.scroll_depth,
      pagesViewed: r.pages_viewed,
      hasRageClick: r.has_rage_click,
      createdAt: typeof r.created_at === "string" ? r.created_at : r.created_at.toISOString(),
    }));
  }

  async getFunnelAnalysis(siteKey: string, userId: string, steps: string[]): Promise<FunnelAnalysis> {
    await this.assertSiteOwner(siteKey, userId);
    if (steps.length === 0) {
      return { steps: [], overallConversion: 0 };
    }

    const ev = await this.db.query<{ session_id: string; page: string; timestamp_ms: string | number }>(
      `SELECT session_id, page, timestamp_ms::text
       FROM heatmap_events
       WHERE site_id = $1 AND type = 'pageview'
       ORDER BY session_id, timestamp_ms ASC`,
      [siteKey],
    );

    const bySession = new Map<string, { page: string; ts: number }[]>();
    for (const row of ev) {
      const ts = typeof row.timestamp_ms === "string" ? Number(row.timestamp_ms) : row.timestamp_ms;
      if (!bySession.has(row.session_id)) bySession.set(row.session_id, []);
      bySession.get(row.session_id)!.push({ page: row.page, ts });
    }

    function pageMatches(path: string, step: string): boolean {
      return path === step || path.includes(step) || step.includes(path);
    }

    function sessionHitsSteps(sessionEvents: { page: string; ts: number }[]): boolean[] {
      const hits: boolean[] = steps.map(() => false);
      let si = 0;
      let lastTs = -1;
      const sorted = [...sessionEvents].sort((a, b) => a.ts - b.ts);
      for (const e of sorted) {
        if (si >= steps.length) break;
        if (pageMatches(e.page, steps[si]) && e.ts >= lastTs) {
          hits[si] = true;
          lastTs = e.ts;
          si += 1;
        }
      }
      return hits;
    }

    const totalSessions = bySession.size;
    if (totalSessions === 0) {
      return {
        steps: steps.map((p) => ({ page: p, sessions: 0, dropoffRate: 0 })),
        overallConversion: 0,
      };
    }
    const stepSessions: number[] = steps.map(() => 0);

    for (const [, events] of bySession) {
      const hits = sessionHitsSteps(events);
      for (let i = 0; i < steps.length; i += 1) {
        let ok = true;
        for (let j = 0; j <= i; j += 1) {
          if (!hits[j]) {
            ok = false;
            break;
          }
        }
        if (ok) stepSessions[i] += 1;
      }
    }

    const funnelSteps: FunnelStepResult[] = steps.map((page, idx) => {
      const s = stepSessions[idx];
      const prev = idx === 0 ? totalSessions : stepSessions[idx - 1];
      const dropoffRate = prev > 0 ? Math.round(((prev - s) / prev) * 1000) / 10 : 0;
      return { page, sessions: s, dropoffRate };
    });

    const first = stepSessions[0] ?? 0;
    const last = stepSessions[steps.length - 1] ?? 0;
    const overallConversion = first > 0 ? Math.round((last / first) * 1000) / 10 : 0;

    return { steps: funnelSteps, overallConversion };
  }

  async analyzeWithAI(siteKey: string, userId: string): Promise<AIAnalysisResult> {
    await this.assertSiteOwner(siteKey, userId);

    const sess = await this.db.query<{
      total: string;
      rage: string;
      avg_scroll: string;
      avg_dur: string;
      bounce: string;
    }>(
      `SELECT
         COUNT(*)::text AS total,
         COUNT(*) FILTER (WHERE has_rage_click = true)::text AS rage,
         COALESCE(AVG(scroll_depth), 0)::text AS avg_scroll,
         COALESCE(AVG(duration), 0)::text AS avg_dur,
         COUNT(*) FILTER (WHERE pages_viewed <= 1 AND duration < 45)::text AS bounce
       FROM heatmap_sessions
       WHERE site_id = $1`,
      [siteKey],
    );
    const topPages = await this.db.query<{ page: string; c: string }>(
      `SELECT page, COUNT(*)::text AS c FROM heatmap_events
       WHERE site_id = $1 AND type = 'pageview'
       GROUP BY page ORDER BY COUNT(*) DESC LIMIT 8`,
      [siteKey],
    );

    const s = sess[0] ?? { total: "0", rage: "0", avg_scroll: "0", avg_dur: "0", bounce: "0" };
    const summary = `Sitio ${siteKey}. Sesiones: ${s.total}. Rage sessions: ${s.rage}. Scroll medio: ${s.avg_scroll}%. Duración media: ${s.avg_dur}s. Posibles rebotes (1 página, <45s): ${s.bounce}. Top páginas: ${topPages.map((p) => `${p.page}(${p.c})`).join("; ")}.`;

    const prompt = `Eres analista UX/CRO. Datos agregados:\n${summary}\n\nResponde SOLO JSON válido:
{
  "insights": ["..."],
  "criticalIssues": ["..."],
  "recommendations": ["..."],
  "priorityScore": number del 0 al 100 (urgencia de actuar)
}`;

    const raw = await this.llm.complete(prompt, {
      model: LLM_DEFAULT_MODEL,
      maxTokens: LLM_DEFAULT_MAX_TOKENS,
      temperature: AI_TEMPERATURE,
    });

    const payload = extractJsonPayload(raw);
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(payload) as Record<string, unknown>;
    } catch {
      return {
        insights: ["No se pudo parsear el análisis automático."],
        criticalIssues: [],
        recommendations: ["Revisa los datos manualmente en el dashboard."],
        priorityScore: 50,
      };
    }

    const arr = (k: string): string[] =>
      Array.isArray(parsed[k]) ? (parsed[k] as unknown[]).map((x) => String(x)) : [];
    const priorityScore = typeof parsed.priorityScore === "number" ? Math.min(100, Math.max(0, parsed.priorityScore)) : 50;

    return {
      insights: arr("insights"),
      criticalIssues: arr("criticalIssues"),
      recommendations: arr("recommendations"),
      priorityScore,
    };
  }

  async checkAlerts(siteKey: string, userId: string): Promise<HeatmapAlert[]> {
    await this.assertSiteOwner(siteKey, userId);

    const agg = await this.db.query<{
      total: string;
      rage: string;
      bounce: string;
      avg_scroll: string;
    }>(
      `SELECT
         COUNT(*)::text AS total,
         COUNT(*) FILTER (WHERE has_rage_click = true)::text AS rage,
         COUNT(*) FILTER (WHERE pages_viewed <= 1 AND duration < 45)::text AS bounce,
         COALESCE(AVG(scroll_depth), 0)::text AS avg_scroll
       FROM heatmap_sessions
       WHERE site_id = $1`,
      [siteKey],
    );

    const a = agg[0] ?? { total: "0", rage: "0", bounce: "0", avg_scroll: "0" };
    const total = Number(a.total) || 0;
    const rageN = Number(a.rage) || 0;
    const bounceN = Number(a.bounce) || 0;
    const avgScroll = Number(a.avg_scroll) || 0;

    const created: HeatmapAlert[] = [];

    if (total >= 10 && rageN / total > 0.05) {
      const rows = await this.db.query<{
        id: string;
        site_id: string;
        user_id: string;
        type: string;
        message: string;
        severity: string;
        created_at: Date | string;
      }>(
        `INSERT INTO heatmap_alerts (site_id, user_id, type, message, severity)
         VALUES ($1, $2::uuid, 'rage_click_rate', $3, 'high')
         RETURNING id::text, site_id, user_id::text, type, message, severity, created_at`,
        [
          siteKey,
          userId,
          `Rage clicks en más del 5% de sesiones (${Math.round((rageN / total) * 100)}%).`,
        ],
      );
      const r = rows[0];
      if (r)
        created.push({
          id: r.id,
          siteId: r.site_id,
          userId: r.user_id,
          type: r.type,
          message: r.message,
          severity: r.severity,
          createdAt: typeof r.created_at === "string" ? r.created_at : r.created_at.toISOString(),
        });
    }

    if (total >= 10 && bounceN / total > 0.8) {
      const rows = await this.db.query<{
        id: string;
        site_id: string;
        user_id: string;
        type: string;
        message: string;
        severity: string;
        created_at: Date | string;
      }>(
        `INSERT INTO heatmap_alerts (site_id, user_id, type, message, severity)
         VALUES ($1, $2::uuid, 'bounce_rate', $3, 'warning')
         RETURNING id::text, site_id, user_id::text, type, message, severity, created_at`,
        [
          siteKey,
          userId,
          `Tasa de rebote estimada >80% (${Math.round((bounceN / total) * 100)}%).`,
        ],
      );
      const r = rows[0];
      if (r)
        created.push({
          id: r.id,
          siteId: r.site_id,
          userId: r.user_id,
          type: r.type,
          message: r.message,
          severity: r.severity,
          createdAt: typeof r.created_at === "string" ? r.created_at : r.created_at.toISOString(),
        });
    }

    if (total >= 10 && avgScroll < 30) {
      const rows = await this.db.query<{
        id: string;
        site_id: string;
        user_id: string;
        type: string;
        message: string;
        severity: string;
        created_at: Date | string;
      }>(
        `INSERT INTO heatmap_alerts (site_id, user_id, type, message, severity)
         VALUES ($1, $2::uuid, 'low_scroll', $3, 'warning')
         RETURNING id::text, site_id, user_id::text, type, message, severity, created_at`,
        [siteKey, userId, `Profundidad de scroll media baja (${Math.round(avgScroll)}%).`],
      );
      const r = rows[0];
      if (r)
        created.push({
          id: r.id,
          siteId: r.site_id,
          userId: r.user_id,
          type: r.type,
          message: r.message,
          severity: r.severity,
          createdAt: typeof r.created_at === "string" ? r.created_at : r.created_at.toISOString(),
        });
    }

    return created;
  }

  async getAlerts(siteKey: string, userId: string): Promise<HeatmapAlert[]> {
    await this.assertSiteOwner(siteKey, userId);
    const rows = await this.db.query<{
      id: string;
      site_id: string;
      user_id: string;
      type: string;
      message: string;
      severity: string;
      created_at: Date | string;
    }>(
      `SELECT id::text, site_id, user_id::text, type, message, severity, created_at
       FROM heatmap_alerts
       WHERE site_id = $1 AND user_id = $2::uuid
       ORDER BY created_at DESC
       LIMIT 100`,
      [siteKey, userId],
    );
    return rows.map((r) => ({
      id: r.id,
      siteId: r.site_id,
      userId: r.user_id,
      type: r.type,
      message: r.message,
      severity: r.severity,
      createdAt: typeof r.created_at === "string" ? r.created_at : r.created_at.toISOString(),
    }));
  }
}

let cachedHeatmapService: HeatmapService | undefined;

export function getHeatmapService(): HeatmapService {
  if (!cachedHeatmapService) cachedHeatmapService = new HeatmapService();
  return cachedHeatmapService;
}

export function resetHeatmapServiceForTests(): void {
  cachedHeatmapService = undefined;
}
