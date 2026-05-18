import { MultiIdiomaAnalyticsAgent } from "./MultiIdiomaAnalyticsAgent";
import { MultiIdiomaCalidadAgent } from "./MultiIdiomaCalidadAgent";
import { MultiIdiomaDetectorAgent } from "./MultiIdiomaDetectorAgent";
import { MultiIdiomaEmailAgent } from "./MultiIdiomaEmailAgent";
import { MultiIdiomaLegalAgent } from "./MultiIdiomaLegalAgent";
import { MultiIdiomaLocalizadorAgent } from "./MultiIdiomaLocalizadorAgent";
import { MultiIdiomaSEOAgent } from "./MultiIdiomaSEOAgent";
import { MultiIdiomaTraductorAgent } from "./MultiIdiomaTraductorAgent";

export type { MultiIdiomaAutomaticoInput, MultiIdiomaAutomaticoOutput } from "./shared";
export {
  parseMultiIdiomaAutomaticoLlmJson,
  buildMultiIdiomaAutomaticoPrompt,
  llmOpts as multiidiomaautomaticoLlmOpts,
} from "./shared";

export {
  MultiIdiomaTraductorAgent,
  getMultiIdiomaTraductorAgent,
  resetMultiIdiomaTraductorAgentForTests,
} from "./MultiIdiomaTraductorAgent";
export {
  MultiIdiomaLocalizadorAgent,
  getMultiIdiomaLocalizadorAgent,
  resetMultiIdiomaLocalizadorAgentForTests,
} from "./MultiIdiomaLocalizadorAgent";
export {
  MultiIdiomaSEOAgent,
  getMultiIdiomaSEOAgent,
  resetMultiIdiomaSEOAgentForTests,
} from "./MultiIdiomaSEOAgent";
export {
  MultiIdiomaDetectorAgent,
  getMultiIdiomaDetectorAgent,
  resetMultiIdiomaDetectorAgentForTests,
} from "./MultiIdiomaDetectorAgent";
export {
  MultiIdiomaCalidadAgent,
  getMultiIdiomaCalidadAgent,
  resetMultiIdiomaCalidadAgentForTests,
} from "./MultiIdiomaCalidadAgent";
export {
  MultiIdiomaEmailAgent,
  getMultiIdiomaEmailAgent,
  resetMultiIdiomaEmailAgentForTests,
} from "./MultiIdiomaEmailAgent";
export {
  MultiIdiomaLegalAgent,
  getMultiIdiomaLegalAgent,
  resetMultiIdiomaLegalAgentForTests,
} from "./MultiIdiomaLegalAgent";
export {
  MultiIdiomaAnalyticsAgent,
  getMultiIdiomaAnalyticsAgent,
  resetMultiIdiomaAnalyticsAgentForTests,
} from "./MultiIdiomaAnalyticsAgent";

export function resetAllMultiIdiomaAutomaticoAgentsForTests(): void {
  MultiIdiomaTraductorAgent.reset();
  MultiIdiomaLocalizadorAgent.reset();
  MultiIdiomaSEOAgent.reset();
  MultiIdiomaDetectorAgent.reset();
  MultiIdiomaCalidadAgent.reset();
  MultiIdiomaEmailAgent.reset();
  MultiIdiomaLegalAgent.reset();
  MultiIdiomaAnalyticsAgent.reset();
}
