import { FormulariosEncuestasAIAgent } from "./FormulariosEncuestasAIAgent";
import { FormulariosEncuestasAnalyticsAgent } from "./FormulariosEncuestasAnalyticsAgent";
import { FormulariosEncuestasBuilderAgent } from "./FormulariosEncuestasBuilderAgent";
import { FormulariosEncuestasDesignAgent } from "./FormulariosEncuestasDesignAgent";
import { FormulariosEncuestasIntegrationAgent } from "./FormulariosEncuestasIntegrationAgent";
import { FormulariosEncuestasLogicAgent } from "./FormulariosEncuestasLogicAgent";
import { FormulariosEncuestasNPSAgent } from "./FormulariosEncuestasNPSAgent";
import { FormulariosEncuestasReportAgent } from "./FormulariosEncuestasReportAgent";

export type { FormulariosEncuestasInput, FormulariosEncuestasOutput } from "./shared";
export {
  parseFormulariosEncuestasLlmJson,
  buildFormulariosEncuestasPrompt,
  llmOpts as formulariosencuestasLlmOpts,
} from "./shared";

export {
  FormulariosEncuestasBuilderAgent,
  getFormulariosEncuestasBuilderAgent,
  resetFormulariosEncuestasBuilderAgentForTests,
} from "./FormulariosEncuestasBuilderAgent";
export {
  FormulariosEncuestasDesignAgent,
  getFormulariosEncuestasDesignAgent,
  resetFormulariosEncuestasDesignAgentForTests,
} from "./FormulariosEncuestasDesignAgent";
export {
  FormulariosEncuestasLogicAgent,
  getFormulariosEncuestasLogicAgent,
  resetFormulariosEncuestasLogicAgentForTests,
} from "./FormulariosEncuestasLogicAgent";
export {
  FormulariosEncuestasAnalyticsAgent,
  getFormulariosEncuestasAnalyticsAgent,
  resetFormulariosEncuestasAnalyticsAgentForTests,
} from "./FormulariosEncuestasAnalyticsAgent";
export {
  FormulariosEncuestasNPSAgent,
  getFormulariosEncuestasNPSAgent,
  resetFormulariosEncuestasNPSAgentForTests,
} from "./FormulariosEncuestasNPSAgent";
export {
  FormulariosEncuestasIntegrationAgent,
  getFormulariosEncuestasIntegrationAgent,
  resetFormulariosEncuestasIntegrationAgentForTests,
} from "./FormulariosEncuestasIntegrationAgent";
export {
  FormulariosEncuestasAIAgent,
  getFormulariosEncuestasAIAgent,
  resetFormulariosEncuestasAIAgentForTests,
} from "./FormulariosEncuestasAIAgent";
export {
  FormulariosEncuestasReportAgent,
  getFormulariosEncuestasReportAgent,
  resetFormulariosEncuestasReportAgentForTests,
} from "./FormulariosEncuestasReportAgent";

export function resetAllFormulariosEncuestasAgentsForTests(): void {
  FormulariosEncuestasBuilderAgent.reset();
  FormulariosEncuestasDesignAgent.reset();
  FormulariosEncuestasLogicAgent.reset();
  FormulariosEncuestasAnalyticsAgent.reset();
  FormulariosEncuestasNPSAgent.reset();
  FormulariosEncuestasIntegrationAgent.reset();
  FormulariosEncuestasAIAgent.reset();
  FormulariosEncuestasReportAgent.reset();
}
