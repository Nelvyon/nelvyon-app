/**
 * Interchangeable visual generation provider (ADR-051).
 * Default OFF — no paid renders, no auto-spend, no keys in repo.
 * NELVYON produces strategy/script/storyboard/prompts/QA; external vendor only after CEO/client approval.
 */

export type VisualAssetKind = "image" | "video_scene" | "storyboard" | "voice_script";

export type VisualGenerationRequest = {
  workspaceId: number;
  tenantId: string;
  kind: VisualAssetKind;
  prompt: string;
  /** Scene-based video only — never promise unlimited single-shot duration. */
  sceneIndex?: number;
  maxScenes?: number;
  budgetCentsMax: number;
  humanApprovalToken?: string;
  commercialUse: boolean;
};

export type VisualGenerationResult = {
  ok: boolean;
  providerId: string;
  mode: "off" | "strategy_only" | "render_approved";
  assetUrl: string | null;
  costCents: number;
  license: string | null;
  ledgerId: string | null;
  errorCode?:
    | "PROVIDER_OFF"
    | "MISSING_APPROVAL"
    | "BUDGET_EXCEEDED"
    | "SCENE_LIMIT"
    | "NO_API_KEY";
  strategyArtifacts?: {
    script?: string;
    storyboard?: string[];
    prompts?: string[];
  };
};

export interface VisualGenerationProvider {
  readonly providerId: string;
  isEnabled(): boolean;
  generate(req: VisualGenerationRequest): Promise<VisualGenerationResult>;
}

/** Default provider — strategy/QA only, never spends. */
export class OffVisualGenerationProvider implements VisualGenerationProvider {
  readonly providerId = "nelvyon_visual_off";

  isEnabled(): boolean {
    return false;
  }

  async generate(req: VisualGenerationRequest): Promise<VisualGenerationResult> {
    const maxScenes = Math.min(req.maxScenes ?? 8, 12);
    if (req.kind === "video_scene" && (req.sceneIndex ?? 0) >= maxScenes) {
      return {
        ok: false,
        providerId: this.providerId,
        mode: "off",
        assetUrl: null,
        costCents: 0,
        license: null,
        ledgerId: null,
        errorCode: "SCENE_LIMIT",
      };
    }
    return {
      ok: true,
      providerId: this.providerId,
      mode: "strategy_only",
      assetUrl: null,
      costCents: 0,
      license: null,
      ledgerId: null,
      strategyArtifacts: {
        script: req.prompt.slice(0, 500),
        storyboard: [`scene_${(req.sceneIndex ?? 0) + 1}`],
        prompts: [req.prompt],
      },
      errorCode: "PROVIDER_OFF",
    };
  }
}

export function isVisualGenerationSpendEnabled(): boolean {
  const v = process.env.NELVYON_VISUAL_GENERATION_ENABLED?.trim();
  return v === "1" || v?.toUpperCase() === "ON" || v?.toLowerCase() === "true";
}

let activeProvider: VisualGenerationProvider = new OffVisualGenerationProvider();

export function getVisualGenerationProvider(): VisualGenerationProvider {
  if (!isVisualGenerationSpendEnabled()) {
    return new OffVisualGenerationProvider();
  }
  return activeProvider;
}

/** Test/ops only — never call from pack cert path with paid providers. */
export function setVisualGenerationProviderForTests(provider: VisualGenerationProvider): void {
  activeProvider = provider;
}

export type VisualCostLedgerEntry = {
  id: string;
  workspaceId: number;
  tenantId: string;
  providerId: string;
  costCents: number;
  approvalToken: string;
  license: string;
  privacyOk: boolean;
  commercialUse: boolean;
  createdAt: string;
};

/** In-memory ledger stub — persist only when spend path is CEO-authorized later. */
const ledger: VisualCostLedgerEntry[] = [];

export function listVisualCostLedger(): readonly VisualCostLedgerEntry[] {
  return ledger;
}

export function recordVisualCost(entry: Omit<VisualCostLedgerEntry, "id" | "createdAt">): VisualCostLedgerEntry {
  const row: VisualCostLedgerEntry = {
    ...entry,
    id: `vis_${Date.now()}_${ledger.length + 1}`,
    createdAt: new Date().toISOString(),
  };
  ledger.push(row);
  return row;
}
