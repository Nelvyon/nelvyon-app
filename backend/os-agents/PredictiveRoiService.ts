import type { DbClient } from "../db/DbClient";
import { DbClient as DbClientClass } from "../db/DbClient";
import type { ILlmClient } from "./LlmClient";
import { LlmClient } from "./LlmClient";

const MODEL = "gpt-4o";
const TEMP = 0.1;
const MAX_TOKENS = 1000;

export type CampaignParams = {
  budget: number;
  channel: string;
  targetAudience: string;
  duration: number;
  industry: string;
  objective: string;
};

export type ActualResults = {
  actualRoi: number;
  actualRevenue: number;
  actualConversions: number;
};

export type RoiPrediction = {
  id: string;
  userId: string;
  campaignParams: CampaignParams;
  predictedRoi: number;
  predictedRevenue: number;
  predictedConversions: number;
  confidenceScore: number;
  reasoning: string;
  modelVersion: string;
  createdAt: string;
};

export type RoiPredictionResult = {
  id: string;
  predictionId: string;
  actualRoi: number;
  actualRevenue: number;
  actualConversions: number;
  accuracyScore: number;
  evaluatedAt: string;
};

export type ModelAccuracy = {
  avgAccuracy: number;
  totalPredictions: number;
  evaluatedPredictions: number;
};

export type ChannelPerformance = {
  channel: string;
  totalRevenue: number;
  conversions: number;
  avgRoi: number;
};

export type PredictiveRoiServiceDeps = {
  db?: Pick<DbClient, "query">;
  llm?: ILlmClient;
};

function toNum(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function parsePredictionPayload(raw: string): {
  predictedRoi: number;
  predictedRevenue: number;
  predictedConversions: number;
  confidenceScore: number;
  reasoning: string;
} {
  const fallback = {
    predictedRoi: 0,
    predictedRevenue: 0,
    predictedConversions: 0,
    confidenceScore: 50,
    reasoning: "Fallback: no se pudo parsear salida del modelo.",
  };
  try {
    const p = JSON.parse(raw) as {
      predictedRoi?: unknown;
      predictedRevenue?: unknown;
      predictedConversions?: unknown;
      confidenceScore?: unknown;
      reasoning?: unknown;
    };
    return {
      predictedRoi: toNum(p.predictedRoi),
      predictedRevenue: toNum(p.predictedRevenue),
      predictedConversions: Math.max(0, Math.round(toNum(p.predictedConversions))),
      confidenceScore: Math.max(0, Math.min(100, toNum(p.confidenceScore))),
      reasoning: typeof p.reasoning === "string" ? p.reasoning : fallback.reasoning,
    };
  } catch {
    return fallback;
  }
}

export class PredictiveRoiService {
  constructor(private readonly deps: PredictiveRoiServiceDeps = {}) {}

  private get db(): Pick<DbClient, "query"> {
    return this.deps.db ?? DbClientClass.getInstance();
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? LlmClient.getInstance();
  }

  async predictCampaignRoi(userId: string, campaignParams: CampaignParams): Promise<RoiPrediction> {
    const history = await this.db.query<{
      type: string;
      payload: Record<string, unknown>;
      created_at: Date | string;
    }>(
      `SELECT 'conversion' as type,
          jsonb_build_object(
            'revenue', revenue,
            'conversion_type', conversion_type,
            'channel', attributed_channel,
            'source', attributed_source,
            'created_at', created_at
          ) as payload,
          created_at
       FROM roi_conversions
       WHERE user_id = $1::uuid AND created_at >= NOW() - INTERVAL '90 days'
       UNION ALL
       SELECT 'event' as type,
          jsonb_build_object(
            'event_type', event_type,
            'channel', channel,
            'source', source,
            'created_at', created_at
          ) as payload,
          created_at
       FROM roi_events
       WHERE user_id = $1::uuid AND created_at >= NOW() - INTERVAL '90 days'
       ORDER BY created_at DESC
       LIMIT 200`,
      [userId],
    );

    const prompt = `Actúa como modelo de predicción ROI pre-campaña.
Parámetros campaña: ${JSON.stringify(campaignParams)}
Datos históricos últimos 90 días: ${JSON.stringify(history)}

Responde SOLO JSON válido:
{"predictedRoi":number,"predictedRevenue":number,"predictedConversions":number,"confidenceScore":number,"reasoning":"string"}`;

    const llmRaw = await this.llm.complete(prompt, { model: MODEL, temperature: TEMP, maxTokens: MAX_TOKENS });
    const parsed = parsePredictionPayload(llmRaw);

    const rows = await this.db.query<{
      id: string;
      userId: string;
      campaignParams: CampaignParams;
      predictedRoi: string | number;
      predictedRevenue: string | number;
      predictedConversions: number;
      confidenceScore: string | number;
      reasoning: string;
      modelVersion: string;
      createdAt: Date | string;
    }>(
      `INSERT INTO roi_predictions
        (user_id, campaign_params, predicted_roi, predicted_revenue, predicted_conversions, confidence_score, reasoning, model_version)
       VALUES ($1::uuid, $2::jsonb, $3::numeric, $4::numeric, $5::int, $6::numeric, $7, 'v1')
       RETURNING id::text as id,
         user_id::text as "userId",
         campaign_params as "campaignParams",
         predicted_roi as "predictedRoi",
         predicted_revenue as "predictedRevenue",
         predicted_conversions as "predictedConversions",
         confidence_score as "confidenceScore",
         reasoning,
         model_version as "modelVersion",
         created_at as "createdAt"`,
      [
        userId,
        JSON.stringify(campaignParams),
        parsed.predictedRoi,
        parsed.predictedRevenue,
        parsed.predictedConversions,
        parsed.confidenceScore,
        parsed.reasoning,
      ],
    );
    const r = rows[0];
    return {
      id: r.id,
      userId: r.userId,
      campaignParams: r.campaignParams,
      predictedRoi: toNum(r.predictedRoi),
      predictedRevenue: toNum(r.predictedRevenue),
      predictedConversions: r.predictedConversions,
      confidenceScore: toNum(r.confidenceScore),
      reasoning: r.reasoning,
      modelVersion: r.modelVersion,
      createdAt: typeof r.createdAt === "string" ? r.createdAt : r.createdAt.toISOString(),
    };
  }

  async evaluatePrediction(userId: string, predictionId: string, actualResults: ActualResults): Promise<RoiPredictionResult> {
    const predRows = await this.db.query<{ predicted_roi: string | number }>(
      `SELECT predicted_roi
       FROM roi_predictions
       WHERE id = $1::uuid AND user_id = $2::uuid
       LIMIT 1`,
      [predictionId, userId],
    );
    const predictedRoi = toNum(predRows[0]?.predicted_roi);
    const accuracyScore = Math.max(0, 100 - Math.abs(predictedRoi - actualResults.actualRoi));

    const rows = await this.db.query<{
      id: string;
      predictionId: string;
      actualRoi: string | number;
      actualRevenue: string | number;
      actualConversions: number;
      accuracyScore: string | number;
      evaluatedAt: Date | string;
    }>(
      `INSERT INTO roi_prediction_results
        (prediction_id, actual_roi, actual_revenue, actual_conversions, accuracy_score)
       VALUES ($1::uuid, $2::numeric, $3::numeric, $4::int, $5::numeric)
       RETURNING id::text as id,
         prediction_id::text as "predictionId",
         actual_roi as "actualRoi",
         actual_revenue as "actualRevenue",
         actual_conversions as "actualConversions",
         accuracy_score as "accuracyScore",
         evaluated_at as "evaluatedAt"`,
      [predictionId, actualResults.actualRoi, actualResults.actualRevenue, actualResults.actualConversions, accuracyScore],
    );
    const r = rows[0];
    return {
      id: r.id,
      predictionId: r.predictionId,
      actualRoi: toNum(r.actualRoi),
      actualRevenue: toNum(r.actualRevenue),
      actualConversions: r.actualConversions,
      accuracyScore: toNum(r.accuracyScore),
      evaluatedAt: typeof r.evaluatedAt === "string" ? r.evaluatedAt : r.evaluatedAt.toISOString(),
    };
  }

  async getPredictionHistory(userId: string): Promise<RoiPrediction[]> {
    const rows = await this.db.query<any>(
      `SELECT id::text as id,
         user_id::text as "userId",
         campaign_params as "campaignParams",
         predicted_roi as "predictedRoi",
         predicted_revenue as "predictedRevenue",
         predicted_conversions as "predictedConversions",
         confidence_score as "confidenceScore",
         reasoning,
         model_version as "modelVersion",
         created_at as "createdAt"
       FROM roi_predictions
       WHERE user_id = $1::uuid
       ORDER BY created_at DESC`,
      [userId],
    );
    return rows.map((r: any) => ({
      id: r.id,
      userId: r.userId,
      campaignParams: r.campaignParams,
      predictedRoi: toNum(r.predictedRoi),
      predictedRevenue: toNum(r.predictedRevenue),
      predictedConversions: Math.trunc(toNum(r.predictedConversions)),
      confidenceScore: toNum(r.confidenceScore),
      reasoning: r.reasoning,
      modelVersion: r.modelVersion,
      createdAt: typeof r.createdAt === "string" ? r.createdAt : r.createdAt.toISOString(),
    }));
  }

  async getModelAccuracy(userId: string): Promise<ModelAccuracy> {
    const rows = await this.db.query<{ avg_accuracy: string; total_predictions: string; evaluated_predictions: string }>(
      `SELECT
         COALESCE(AVG(rpr.accuracy_score), 0)::text as avg_accuracy,
         COUNT(DISTINCT rp.id)::text as total_predictions,
         COUNT(rpr.id)::text as evaluated_predictions
       FROM roi_predictions rp
       LEFT JOIN roi_prediction_results rpr ON rpr.prediction_id = rp.id
       WHERE rp.user_id = $1::uuid`,
      [userId],
    );
    const r = rows[0] ?? { avg_accuracy: "0", total_predictions: "0", evaluated_predictions: "0" };
    return {
      avgAccuracy: toNum(r.avg_accuracy),
      totalPredictions: Math.trunc(toNum(r.total_predictions)),
      evaluatedPredictions: Math.trunc(toNum(r.evaluated_predictions)),
    };
  }

  async getBestChannels(userId: string): Promise<ChannelPerformance[]> {
    const rows = await this.db.query<{ channel: string | null; total_revenue: string; conversions: string; avg_roi: string }>(
      `SELECT
         attributed_channel as channel,
         COALESCE(SUM(revenue), 0)::text as total_revenue,
         COUNT(*)::text as conversions,
         COALESCE(AVG(revenue), 0)::text as avg_roi
       FROM roi_conversions
       WHERE user_id = $1::uuid
       GROUP BY attributed_channel
       ORDER BY AVG(revenue) DESC NULLS LAST`,
      [userId],
    );
    return rows.map((r) => ({
      channel: r.channel ?? "unknown",
      totalRevenue: toNum(r.total_revenue),
      conversions: Math.trunc(toNum(r.conversions)),
      avgRoi: toNum(r.avg_roi),
    }));
  }
}

let cachedPredictiveRoiService: PredictiveRoiService | undefined;

export function getPredictiveRoiService(): PredictiveRoiService {
  if (!cachedPredictiveRoiService) cachedPredictiveRoiService = new PredictiveRoiService();
  return cachedPredictiveRoiService;
}

export function resetPredictiveRoiServiceForTests(): void {
  cachedPredictiveRoiService = undefined;
}
