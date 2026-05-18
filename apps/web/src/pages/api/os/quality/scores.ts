import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import { agentQualityService } from "../../../../../../../backend/os-agents/AgentQualityService";
import { QualityEvaluatorService } from "../../../../../../../backend/os-agents/quality/QualityEvaluatorService";

function readParam(value: string | string[] | undefined): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0];
  return undefined;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    // Backward-compatible branch for prior endpoint shape.
    const legacyServiceType = readParam(req.query.serviceType);
    if (legacyServiceType) {
      const sector = readParam(req.query.sector);
      const score = await agentQualityService.getQualityScore(legacyServiceType, sector);
      return res.status(200).json({ score });
    }

    const token = req.cookies.nelvyon_token;
    if (!token) return res.status(401).json({ error: "No autenticado" });
    const user = await getAuthService().verifyToken(token);
    const q = req.query;
    const agentId = typeof q.agentId === "string" ? q.agentId : undefined;
    const passed = typeof q.passed === "string" ? (q.passed === "true" ? true : q.passed === "false" ? false : undefined) : undefined;
    const dateFrom = typeof q.dateFrom === "string" ? q.dateFrom : undefined;

    const svc = new QualityEvaluatorService();
    const history = await svc.getScores(user.userId, { agentId, passed, dateFrom });

    const byAgent = new Map<string, { scoreSum: number; attempts: number; passed: number; count: number }>();
    for (const h of history) {
      const row = byAgent.get(h.agentId) ?? { scoreSum: 0, attempts: 0, passed: 0, count: 0 };
      row.scoreSum += h.score;
      row.attempts += h.attempt;
      row.passed += h.passed ? 1 : 0;
      row.count++;
      byAgent.set(h.agentId, row);
    }
    const summary = Array.from(byAgent.entries()).map(([agent, row]) => ({
      agentId: agent,
      avgScore: row.count ? row.scoreSum / row.count : 0,
      avgAttempts: row.count ? row.attempts / row.count : 0,
      passRate: row.count ? (row.passed / row.count) * 100 : 0,
    }));
    const globalAverage = history.length ? history.reduce((s, x) => s + x.score, 0) / history.length : 0;
    return res.status(200).json({ history, summary, globalAverage });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") return res.status(401).json({ error: "Token inválido" });
    return res.status(500).json({ error: "Error interno" });
  }
}
