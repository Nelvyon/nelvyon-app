/**
 * One-click GHL/HubSpot starter pack — imports core workflows + drip sequences.
 */
import { getSaasWorkflowRecipesService } from "./SaasWorkflowRecipesService";
import { getSaasSequenceTemplatesService } from "./SaasSequenceTemplatesService";

const STARTER_WORKFLOWS = [
  "welcome-new-contact",
  "form-submitted-followup",
  "missed-call-text-back",
  "hot-lead-score-notify",
  "deal-won-celebration",
  "review-request-after-won",
] as const;

const STARTER_SEQUENCES = [
  "welcome-3-email",
  "nurture-5-touch",
  "form-followup-24h",
  "review-request-drip",
] as const;

export type GhlStarterPackResult = {
  workflows: Array<{ recipeId: string; workflowId: string; name: string }>;
  sequences: Array<{ templateId: string; sequenceId: string; name: string; stepsCreated: number }>;
  totalWorkflows: number;
  totalSequences: number;
};

export class SaasGhlStarterPackService {
  async install(tenantId: string): Promise<GhlStarterPackResult> {
    const recipes = getSaasWorkflowRecipesService();
    const templates = getSaasSequenceTemplatesService();

    const workflows: GhlStarterPackResult["workflows"] = [];
    for (const recipeId of STARTER_WORKFLOWS) {
      const result = await recipes.importRecipe(tenantId, recipeId);
      workflows.push({ recipeId, workflowId: result.workflowId, name: result.name });
    }

    const sequences: GhlStarterPackResult["sequences"] = [];
    for (const templateId of STARTER_SEQUENCES) {
      const result = await templates.importTemplate(tenantId, templateId);
      sequences.push({
        templateId,
        sequenceId: result.sequenceId,
        name: result.name,
        stepsCreated: result.stepsCreated,
      });
    }

    return {
      workflows,
      sequences,
      totalWorkflows: workflows.length,
      totalSequences: sequences.length,
    };
  }
}

let _instance: SaasGhlStarterPackService | null = null;
export function getSaasGhlStarterPackService(): SaasGhlStarterPackService {
  if (!_instance) _instance = new SaasGhlStarterPackService();
  return _instance;
}
export function resetSaasGhlStarterPackServiceForTests(): void {
  _instance = null;
}
