import { GeoEngineCompetitorAgent } from "./GeoEngineCompetitorAgent";
import { GeoEngineContentAgent } from "./GeoEngineContentAgent";
import { GeoEngineDetectorAgent } from "./GeoEngineDetectorAgent";
import { GeoEngineHeatmapAgent } from "./GeoEngineHeatmapAgent";
import { GeoEngineLocalSEOAgent } from "./GeoEngineLocalSEOAgent";
import { GeoEnginePricingAgent } from "./GeoEnginePricingAgent";
import { GeoEngineReportAgent } from "./GeoEngineReportAgent";
import { GeoEngineTargetingAgent } from "./GeoEngineTargetingAgent";

export type { GeoEngineInput, GeoEngineOutput } from "./shared";
export { parseGeoEngineLlmJson, buildGeoEnginePrompt, llmOpts as geoEngineLlmOpts } from "./shared";

export {
  GeoEngineDetectorAgent,
  getGeoEngineDetectorAgent,
  resetGeoEngineDetectorAgentForTests,
} from "./GeoEngineDetectorAgent";
export {
  GeoEngineTargetingAgent,
  getGeoEngineTargetingAgent,
  resetGeoEngineTargetingAgentForTests,
} from "./GeoEngineTargetingAgent";
export {
  GeoEngineLocalSEOAgent,
  getGeoEngineLocalSEOAgent,
  resetGeoEngineLocalSEOAgentForTests,
} from "./GeoEngineLocalSEOAgent";
export {
  GeoEngineCompetitorAgent,
  getGeoEngineCompetitorAgent,
  resetGeoEngineCompetitorAgentForTests,
} from "./GeoEngineCompetitorAgent";
export {
  GeoEnginePricingAgent,
  getGeoEnginePricingAgent,
  resetGeoEnginePricingAgentForTests,
} from "./GeoEnginePricingAgent";
export {
  GeoEngineContentAgent,
  getGeoEngineContentAgent,
  resetGeoEngineContentAgentForTests,
} from "./GeoEngineContentAgent";
export {
  GeoEngineHeatmapAgent,
  getGeoEngineHeatmapAgent,
  resetGeoEngineHeatmapAgentForTests,
} from "./GeoEngineHeatmapAgent";
export {
  GeoEngineReportAgent,
  getGeoEngineReportAgent,
  resetGeoEngineReportAgentForTests,
} from "./GeoEngineReportAgent";

export function resetAllGeoEngineAgentsForTests(): void {
  GeoEngineDetectorAgent.reset();
  GeoEngineTargetingAgent.reset();
  GeoEngineLocalSEOAgent.reset();
  GeoEngineCompetitorAgent.reset();
  GeoEnginePricingAgent.reset();
  GeoEngineContentAgent.reset();
  GeoEngineHeatmapAgent.reset();
  GeoEngineReportAgent.reset();
}
