import { GoogleDataFetcher, type AnalyticsData, type GoogleAdsPerformanceData, type SearchConsoleData } from "../integrations/google/GoogleDataFetcher";
import { MetaDataFetcher, type MetaAdsInsights } from "../integrations/meta/MetaDataFetcher";
import { createLogger } from "../logger";
import { OAuthService } from "../oauth/OAuthService";
import {
  formatBenchmarkComparison,
  getBenchmark,
  INDUSTRY_BENCHMARKS,
} from "./benchmarks";
import { resolveIndustryKey } from "./benchmarks/industryBenchmarks";

const log = createLogger("context_enricher");

export interface AgentContext {
  searchConsoleData: SearchConsoleData | null;
  analyticsData: AnalyticsData | null;
  googleAdsData: GoogleAdsPerformanceData | null;
  metaAdsData: MetaAdsInsights | null;
  industryKey?: string;
}

function str(v: unknown): string | undefined {
  if (typeof v === "string" && v.trim().length > 0) return v.trim();
  return undefined;
}

export async function enrichAgentContext(
  userId: string,
  input: Record<string, unknown>,
): Promise<AgentContext> {
  const ctx: AgentContext = {
    searchConsoleData: null,
    analyticsData: null,
    googleAdsData: null,
    metaAdsData: null,
    industryKey: resolveIndustryKey(input),
  };

  if (!userId?.trim()) return ctx;

  try {
    const connections = await OAuthService.instance().listConnections(userId);
    const googleConnected = connections.some((c) => c.provider === "google");
    const metaConnected = connections.some((c) => c.provider === "meta");

    const siteUrl = str(input.siteUrl) ?? str(input.domain) ?? str(input.url) ?? str(input.currentWebsiteUrl);

    if (googleConnected && siteUrl) {
      try {
        ctx.searchConsoleData = await GoogleDataFetcher.instance().getSearchConsoleData(userId, siteUrl);
      } catch (err: unknown) {
        log.warn("enrich_search_console_failed", {
          userId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    const analyticsPropertyId = str(input.analyticsPropertyId);
    if (googleConnected && analyticsPropertyId) {
      try {
        ctx.analyticsData = await GoogleDataFetcher.instance().getAnalyticsData(userId, analyticsPropertyId);
      } catch (err: unknown) {
        log.warn("enrich_analytics_failed", {
          userId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    const googleAdsCustomerId = str(input.googleAdsCustomerId);
    if (googleConnected && googleAdsCustomerId) {
      try {
        ctx.googleAdsData = await GoogleDataFetcher.instance().getGoogleAdsData(userId, googleAdsCustomerId);
      } catch (err: unknown) {
        log.warn("enrich_google_ads_failed", {
          userId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    const metaAdAccountId = str(input.metaAdAccountId);
    if (metaConnected && metaAdAccountId) {
      try {
        ctx.metaAdsData = await MetaDataFetcher.instance().getAdAccountInsights(userId, metaAdAccountId);
      } catch (err: unknown) {
        log.warn("enrich_meta_ads_failed", {
          userId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  } catch (err: unknown) {
    log.warn("enrich_agent_context_failed", {
      userId,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  return ctx;
}

function pctToRate(pct: number): number {
  return pct > 1 ? pct / 100 : pct;
}

function formatBenchmarkSection(ctx: AgentContext, industry: string): string {
  const lines: string[] = [];

  if (ctx.googleAdsData) {
    const d = ctx.googleAdsData;
    const impressions = d.campaigns.reduce((s, c) => s + c.impressions, 0);
    const clicks = d.campaigns.reduce((s, c) => s + c.clicks, 0);
    const ctrClient =
      impressions > 0 ? clicks / impressions : pctToRate(d.campaigns[0]?.ctr ?? 0);
    const ctrBench = getBenchmark("googleAds", "averageCTR", industry);
    if (ctrBench !== null) {
      lines.push(formatBenchmarkComparison(ctrClient, ctrBench, "CTR Google Ads"));
    }
    if (d.totalConversions > 0) {
      const cpaClient = d.totalSpend / d.totalConversions;
      const cpaBench = getBenchmark("googleAds", "averageCPA", industry);
      if (cpaBench !== null) {
        lines.push(
          formatBenchmarkComparison(cpaClient, cpaBench, "CPA Google Ads", { asRate: false }),
        );
      }
    }
  }

  if (ctx.metaAdsData) {
    const d = ctx.metaAdsData;
    const impressions = d.campaigns.reduce((s, c) => s + c.impressions, 0);
    const clicks = d.campaigns.reduce((s, c) => s + c.clicks, 0);
    const spend = d.campaigns.reduce((s, c) => s + c.spend, 0);
    const ctrClient =
      impressions > 0 ? clicks / impressions : pctToRate(d.campaigns[0]?.ctr ?? 0);
    const ctrBench = getBenchmark("metaAds", "averageCTR", industry);
    if (ctrBench !== null) {
      lines.push(formatBenchmarkComparison(ctrClient, ctrBench, "CTR Meta Ads"));
    }
    const cpcClient =
      clicks > 0 ? spend / clicks : d.campaigns[0]?.cpc ?? 0;
    const cpcBench = getBenchmark("metaAds", "averageCPC", industry);
    if (cpcBench !== null && cpcClient > 0) {
      lines.push(formatBenchmarkComparison(cpcClient, cpcBench, "CPC Meta Ads", { asRate: false }));
    }
    if (d.avgRoas > 0) {
      const roasBench = getBenchmark("metaAds", "averageROAS", industry);
      if (roasBench !== null) {
        lines.push(
          formatBenchmarkComparison(d.avgRoas, roasBench, "ROAS Meta Ads", { asRate: false }),
        );
      }
    }
  }

  if (ctx.searchConsoleData) {
    const d = ctx.searchConsoleData;
    const ctrClient = pctToRate(d.avgCtr);
    const ctrBench = getBenchmark("googleAds", "averageCTR", industry);
    if (ctrBench !== null) {
      lines.push(formatBenchmarkComparison(ctrClient, ctrBench, "CTR orgánico (Search Console)"));
    }
    const pos = Math.min(10, Math.max(1, Math.round(d.avgPosition)));
    const posBench = getBenchmark("seo", "averageCTRByPosition", String(pos));
    if (posBench !== null) {
      lines.push(
        formatBenchmarkComparison(
          ctrClient,
          posBench,
          `CTR vs posición media ${pos} en SERP`,
        ),
      );
    }
  }

  if (ctx.analyticsData) {
    const d = ctx.analyticsData;
    const bounceClient = pctToRate(d.overallBounceRate);
    const bounceBench = INDUSTRY_BENCHMARKS.emailMarketing.averageBounceRate.default;
    if (bounceClient > 0) {
      lines.push(
        `Bounce rate web (GA4): ${(bounceClient * 100).toFixed(1)}% — referencia email industria: ${(bounceBench * 100).toFixed(2)}% (métrica distinta; úsala solo como orden de magnitud de engagement).`,
      );
    }
    if (d.totalSessions > 0 && d.totalConversions >= 0) {
      const convClient = d.totalConversions / d.totalSessions;
      const convBench = getBenchmark("googleAds", "averageConversionRate", industry);
      if (convBench !== null) {
        lines.push(
          formatBenchmarkComparison(convClient, convBench, "tasa de conversión (GA4)"),
        );
      }
    }
  }

  if (lines.length === 0) {
    const ctrBench = getBenchmark("googleAds", "averageCTR", industry);
    const metaCtrBench = getBenchmark("metaAds", "averageCTR", industry);
    const openBench = getBenchmark("emailMarketing", "averageOpenRate", industry);
    const ref: string[] = [];
    if (ctrBench !== null) ref.push(`Google Ads CTR: ${(ctrBench * 100).toFixed(2)}%`);
    if (metaCtrBench !== null) ref.push(`Meta Ads CTR: ${(metaCtrBench * 100).toFixed(2)}%`);
    if (openBench !== null) ref.push(`Email open rate: ${(openBench * 100).toFixed(2)}%`);
    if (ref.length === 0) return "";
    return `## 📊 BENCHMARKS DE LA INDUSTRIA (${industry})\nReferencias sectoriales (WordStream / HubSpot / Mailchimp 2024-2025):\n- ${ref.join("\n- ")}`;
  }

  return `## 📊 BENCHMARKS DE LA INDUSTRIA (${industry})\n${lines.join("\n")}`;
}

export function formatContextForPrompt(ctx: AgentContext): string {
  const sections: string[] = [];
  const industry = ctx.industryKey || "default";

  if (ctx.searchConsoleData) {
    const d = ctx.searchConsoleData;
    const topQ = d.topQueries
      .map((q) => `${q.query}: ${q.clicks} clics`)
      .join(", ");
    const topP = d.topPages.map((p) => p.page).join(", ");
    sections.push(
      `## DATOS REALES DE SEARCH CONSOLE (últimos 30 días)
- Clics totales: ${d.totalClicks}
- Impresiones: ${d.totalImpressions}
- CTR medio: ${d.avgCtr}%
- Posición media: ${d.avgPosition}
- Top queries: ${topQ || "—"}
- Top páginas: ${topP || "—"}`,
    );
  }

  if (ctx.analyticsData) {
    const d = ctx.analyticsData;
    const channels = d.topChannels
      .map((c) => `${c.source}/${c.medium}: ${c.sessions} sesiones, ${c.conversions} conv.`)
      .join("; ");
    sections.push(
      `## DATOS REALES DE GOOGLE ANALYTICS (últimos 30 días)
- Sesiones totales: ${d.totalSessions}
- Conversiones: ${d.totalConversions}
- Revenue: ${d.totalRevenue}€
- Bounce rate: ${d.overallBounceRate}%
- Top canales: ${channels || "—"}`,
    );
  }

  if (ctx.googleAdsData) {
    const d = ctx.googleAdsData;
    const camps = d.campaigns
      .map(
        (c) =>
          `${c.campaignName} (${c.status}): ${c.costEuros}€, ${c.clicks} clics, CTR ${c.ctr}%, ${c.conversions} conv.`,
      )
      .join("; ");
    sections.push(
      `## DATOS REALES DE GOOGLE ADS (últimos 30 días)
- Gasto total: ${d.totalSpend}€
- Conversiones: ${d.totalConversions}
- ROAS medio: ${d.avgRoas}
- Campañas activas: ${camps || "—"}`,
    );
  }

  if (ctx.metaAdsData) {
    const d = ctx.metaAdsData;
    const camps = d.campaigns
      .map(
        (c) =>
          `${c.campaignName}: ${c.spend}€, ${c.clicks} clics, CTR ${c.ctr}%, ROAS ${c.roas}`,
      )
      .join("; ");
    sections.push(
      `## DATOS REALES DE META ADS (últimos 30 días)
- Gasto total: ${d.totalSpend}€
- Conversiones: ${d.totalConversions}
- ROAS medio: ${d.avgRoas}
- Campañas: ${camps || "—"}`,
    );
  }

  const benchmarkSection = formatBenchmarkSection(ctx, industry);
  const dataSections = sections;

  if (dataSections.length === 0) {
    const empty = "## CONTEXTO\nEl cliente no tiene cuentas conectadas todavía.";
    return benchmarkSection ? `${empty}\n\n${benchmarkSection}` : empty;
  }

  if (benchmarkSection) dataSections.push(benchmarkSection);
  return dataSections.join("\n\n");
}

/** Antepone bloque de datos reales al prompt si el payload del job lo incluye. */
export function prependRealDataToPrompt(payload: Record<string, unknown>, prompt: string): string {
  const block = payload.realDataContext;
  if (typeof block === "string" && block.trim().length > 0) {
    return `${block.trim()}\n\n${prompt}`;
  }
  return prompt;
}
