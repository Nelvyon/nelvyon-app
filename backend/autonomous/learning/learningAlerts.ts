/** Phase P — internal learning alerts (operator+ consumption only) */

import type { TemplateOutcome } from "../templates/types";

export type LearningAlertType =
  | "conversion_rate_drop"
  | "lead_count_drop"
  | "qa_score_low"
  | "high_reject_rate"
  | "high_revisions"
  | "template_score_low";

export type LearningAlertSeverity = "warn" | "crit";

export interface LearningAlert {
  id: string;
  type: LearningAlertType;
  severity: LearningAlertSeverity;
  template_id?: string;
  sector?: string;
  service?: string;
  message: string;
  value?: number;
  threshold?: number;
  previous_value?: number;
  at: string;
}

export interface TemplateRankRow {
  template_id: string;
  sector: string;
  service: string;
  final_template_score: number;
  conversion_score?: number;
  qa_score: number;
  conversion_rate: number | null;
  lead_count: number;
  approved_by_client_rate: number;
  revisions_count: number;
  sample_size: number;
}

export interface TrendPoint {
  date: string;
  outcomes_count: number;
  conversion_rate_avg: number | null;
  lead_count_total: number;
}

export interface LearningSnapshot {
  computed_at: string;
  templates: Record<
    string,
    {
      conversion_rate: number | null;
      lead_count: number;
      final_template_score: number;
    }
  >;
  trend_cr_avg: number | null;
  trend_leads_total: number;
}

export const QA_SCORE_MIN = 85;
export const TEMPLATE_SCORE_MIN = 65;
export const REVISIONS_WARN = 2;
export const REJECT_RATE_WARN = 0.35;
export const CR_DROP_PCT = 15;
export const LEAD_DROP_PCT = 20;

function alertId(parts: string[]): string {
  return parts.filter(Boolean).join(":");
}

function weekAvgCr(trend: TrendPoint[], startIdx: number, len: number): number | null {
  const slice = trend.slice(startIdx, startIdx + len).filter((t) => t.conversion_rate_avg !== null);
  if (!slice.length) return null;
  return slice.reduce((s, t) => s + (t.conversion_rate_avg as number), 0) / slice.length;
}

function weekLeadSum(trend: TrendPoint[], startIdx: number, len: number): number {
  return trend.slice(startIdx, startIdx + len).reduce((s, t) => s + t.lead_count_total, 0);
}

export function detectLearningAlerts(params: {
  outcomes: TemplateOutcome[];
  topTemplates: TemplateRankRow[];
  trend: TrendPoint[];
  previousSnapshot?: LearningSnapshot | null;
  at?: string;
}): LearningAlert[] {
  const at = params.at ?? new Date().toISOString();
  const alerts: LearningAlert[] = [];
  const trend = [...params.trend].sort((a, b) => a.date.localeCompare(b.date));

  if (trend.length >= 14) {
    const recentCr = weekAvgCr(trend, trend.length - 7, 7);
    const priorCr = weekAvgCr(trend, trend.length - 14, 7);
    if (recentCr !== null && priorCr !== null && priorCr > 0) {
      const dropPct = ((priorCr - recentCr) / priorCr) * 100;
      if (dropPct >= CR_DROP_PCT) {
        alerts.push({
          id: alertId(["global", "cr_drop"]),
          type: "conversion_rate_drop",
          severity: dropPct >= 30 ? "crit" : "warn",
          message: `Caída global conversion_rate ${dropPct.toFixed(1)}% (7d reciente vs 7d anterior)`,
          value: recentCr,
          previous_value: priorCr,
          threshold: CR_DROP_PCT,
          at,
        });
      }
    }

    const recentLeads = weekLeadSum(trend, trend.length - 7, 7);
    const priorLeads = weekLeadSum(trend, trend.length - 14, 7);
    if (priorLeads > 0) {
      const dropPct = ((priorLeads - recentLeads) / priorLeads) * 100;
      if (dropPct >= LEAD_DROP_PCT) {
        alerts.push({
          id: alertId(["global", "lead_drop"]),
          type: "lead_count_drop",
          severity: dropPct >= 40 ? "crit" : "warn",
          message: `Caída global lead_count ${dropPct.toFixed(1)}% (7d reciente vs 7d anterior)`,
          value: recentLeads,
          previous_value: priorLeads,
          threshold: LEAD_DROP_PCT,
          at,
        });
      }
    }
  }

  if (params.previousSnapshot?.trend_cr_avg != null && trend.length >= 7) {
    const recentCr = weekAvgCr(trend, Math.max(0, trend.length - 7), 7);
    if (recentCr !== null && params.previousSnapshot.trend_cr_avg > 0) {
      const dropPct =
        ((params.previousSnapshot.trend_cr_avg - recentCr) / params.previousSnapshot.trend_cr_avg) * 100;
      if (dropPct >= CR_DROP_PCT && !alerts.some((a) => a.id === alertId(["global", "cr_drop"]))) {
        alerts.push({
          id: alertId(["global", "cr_drop", "snapshot"]),
          type: "conversion_rate_drop",
          severity: "warn",
          message: `CR vs último refresh: −${dropPct.toFixed(1)}%`,
          value: recentCr,
          previous_value: params.previousSnapshot.trend_cr_avg,
          threshold: CR_DROP_PCT,
          at,
        });
      }
    }
  }

  for (const tpl of params.topTemplates) {
    const prev = params.previousSnapshot?.templates[tpl.template_id];

    if (tpl.qa_score < QA_SCORE_MIN) {
      alerts.push({
        id: alertId(["tpl", tpl.template_id, "qa"]),
        type: "qa_score_low",
        severity: tpl.qa_score < 70 ? "crit" : "warn",
        template_id: tpl.template_id,
        sector: tpl.sector,
        service: tpl.service,
        message: `QA score ${tpl.qa_score.toFixed(1)} < ${QA_SCORE_MIN}`,
        value: tpl.qa_score,
        threshold: QA_SCORE_MIN,
        at,
      });
    }

    if (tpl.final_template_score < TEMPLATE_SCORE_MIN) {
      alerts.push({
        id: alertId(["tpl", tpl.template_id, "score"]),
        type: "template_score_low",
        severity: tpl.final_template_score < 55 ? "crit" : "warn",
        template_id: tpl.template_id,
        sector: tpl.sector,
        service: tpl.service,
        message: `final_template_score ${tpl.final_template_score.toFixed(1)} < ${TEMPLATE_SCORE_MIN}`,
        value: tpl.final_template_score,
        threshold: TEMPLATE_SCORE_MIN,
        at,
      });
    }

    if (tpl.revisions_count >= REVISIONS_WARN) {
      alerts.push({
        id: alertId(["tpl", tpl.template_id, "rev"]),
        type: "high_revisions",
        severity: tpl.revisions_count >= 3 ? "crit" : "warn",
        template_id: tpl.template_id,
        sector: tpl.sector,
        service: tpl.service,
        message: `Revisiones promedio ${tpl.revisions_count.toFixed(1)} ≥ ${REVISIONS_WARN}`,
        value: tpl.revisions_count,
        threshold: REVISIONS_WARN,
        at,
      });
    }

    if (tpl.sample_size >= 2 && 1 - tpl.approved_by_client_rate >= REJECT_RATE_WARN) {
      alerts.push({
        id: alertId(["tpl", tpl.template_id, "reject"]),
        type: "high_reject_rate",
        severity: "warn",
        template_id: tpl.template_id,
        sector: tpl.sector,
        service: tpl.service,
        message: `Tasa rechazo portal ${((1 - tpl.approved_by_client_rate) * 100).toFixed(0)}%`,
        value: 1 - tpl.approved_by_client_rate,
        threshold: REJECT_RATE_WARN,
        at,
      });
    }

    if (
      tpl.conversion_rate !== null &&
      prev?.conversion_rate != null &&
      prev.conversion_rate > 0
    ) {
      const dropPct = ((prev.conversion_rate - tpl.conversion_rate) / prev.conversion_rate) * 100;
      if (dropPct >= CR_DROP_PCT) {
        alerts.push({
          id: alertId(["tpl", tpl.template_id, "cr_drop"]),
          type: "conversion_rate_drop",
          severity: dropPct >= 30 ? "crit" : "warn",
          template_id: tpl.template_id,
          sector: tpl.sector,
          service: tpl.service,
          message: `CR plantilla −${dropPct.toFixed(1)}% vs refresh anterior`,
          value: tpl.conversion_rate,
          previous_value: prev.conversion_rate,
          threshold: CR_DROP_PCT,
          at,
        });
      }
    }

    if (prev && prev.lead_count > 0 && tpl.lead_count < prev.lead_count) {
      const dropPct = ((prev.lead_count - tpl.lead_count) / prev.lead_count) * 100;
      if (dropPct >= LEAD_DROP_PCT) {
        alerts.push({
          id: alertId(["tpl", tpl.template_id, "lead_drop"]),
          type: "lead_count_drop",
          severity: "warn",
          template_id: tpl.template_id,
          sector: tpl.sector,
          service: tpl.service,
          message: `Leads −${dropPct.toFixed(1)}% vs refresh anterior`,
          value: tpl.lead_count,
          previous_value: prev.lead_count,
          threshold: LEAD_DROP_PCT,
          at,
        });
      }
    }
  }

  for (const o of params.outcomes) {
    if (o.qa_score < QA_SCORE_MIN && !alerts.some((a) => a.template_id === o.template_id && a.type === "qa_score_low")) {
      alerts.push({
        id: alertId(["outcome", o.id, "qa"]),
        type: "qa_score_low",
        severity: "warn",
        template_id: o.template_id,
        sector: o.sector,
        service: o.service,
        message: `Outcome QA ${o.qa_score} < ${QA_SCORE_MIN}`,
        value: o.qa_score,
        threshold: QA_SCORE_MIN,
        at,
      });
    }
    if (o.result_status === "client_rejected" && o.revisions_count >= REVISIONS_WARN) {
      if (!alerts.some((a) => a.template_id === o.template_id && a.type === "high_revisions")) {
        alerts.push({
          id: alertId(["outcome", o.id, "rev"]),
          type: "high_revisions",
          severity: "warn",
          template_id: o.template_id,
          sector: o.sector,
          service: o.service,
          message: `Rechazo portal con ${o.revisions_count} revisiones`,
          value: o.revisions_count,
          threshold: REVISIONS_WARN,
          at,
        });
      }
    }
  }

  return alerts;
}

export function buildLearningSnapshot(params: {
  topTemplates: TemplateRankRow[];
  trend: TrendPoint[];
}): LearningSnapshot {
  const trend = [...params.trend].sort((a, b) => a.date.localeCompare(b.date));
  const recentCr = trend.length >= 7 ? weekAvgCr(trend, trend.length - 7, 7) : null;
  const recentLeads = trend.length >= 7 ? weekLeadSum(trend, trend.length - 7, 7) : 0;
  const templates: LearningSnapshot["templates"] = {};
  for (const t of params.topTemplates) {
    templates[t.template_id] = {
      conversion_rate: t.conversion_rate,
      lead_count: t.lead_count,
      final_template_score: t.final_template_score,
    };
  }
  return {
    computed_at: new Date().toISOString(),
    templates,
    trend_cr_avg: recentCr,
    trend_leads_total: recentLeads,
  };
}
