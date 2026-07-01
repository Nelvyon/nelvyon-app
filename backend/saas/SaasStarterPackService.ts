/**
 * Kit de arranque oficial Nelvyon — importa workflows + secuencias en un clic.
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

export type StarterPackResult = {
  workflows: Array<{ recipeId: string; workflowId: string; name: string }>;
  sequences: Array<{ templateId: string; sequenceId: string; name: string; stepsCreated: number }>;
  totalWorkflows: number;
  totalSequences: number;
};

export class SaasStarterPackService {
  async install(tenantId: string): Promise<StarterPackResult> {
    const recipes = getSaasWorkflowRecipesService();
    const templates = getSaasSequenceTemplatesService();

    const workflows: StarterPackResult["workflows"] = [];
    for (const recipeId of STARTER_WORKFLOWS) {
      const result = await recipes.importRecipe(tenantId, recipeId);
      workflows.push({ recipeId, workflowId: result.workflowId, name: result.name });
    }

    const sequences: StarterPackResult["sequences"] = [];
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

let _instance: SaasStarterPackService | null = null;
export function getSaasStarterPackService(): SaasStarterPackService {
  if (!_instance) _instance = new SaasStarterPackService();
  return _instance;
}
export function resetSaasStarterPackServiceForTests(): void {
  _instance = null;
}

/** @deprecated use SaasStarterPackService */
export type GhlStarterPackResult = StarterPackResult;
/** @deprecated use getSaasStarterPackService */
export const getSaasGhlStarterPackService = getSaasStarterPackService;
/** @deprecated use SaasStarterPackService */
export const SaasGhlStarterPackService = SaasStarterPackService;
/** @deprecated */
export const resetSaasGhlStarterPackServiceForTests = resetSaasStarterPackServiceForTests;
