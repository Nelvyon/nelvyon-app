export type { ManufacturaInput, ManufacturaOutput } from "./shared";
export {
  manufacturaLlmOpts as manufacturaLlmOpts,
  parseManufacturaLlmJson,
  buildManufacturaPrompt,
  runManufacturaAgentCore,
  getDefaultManufacturaLlm,
} from "./shared";
export * from "./ManufacturaLeadGenAgent";
export * from "./ManufacturaExportacionAgent";
export * from "./ManufacturaPreciosAgent";
export * from "./ManufacturaSEOAgent";
export * from "./ManufacturaSocialAgent";
export * from "./ManufacturaEmailAgent";
export * from "./ManufacturaReviewsAgent";
export * from "./ManufacturaAnalyticsAgent";

import { resetManufacturaAnalyticsAgentForTests } from "./ManufacturaAnalyticsAgent";
import { resetManufacturaEmailAgentForTests } from "./ManufacturaEmailAgent";
import { resetManufacturaExportacionAgentForTests } from "./ManufacturaExportacionAgent";
import { resetManufacturaLeadGenAgentForTests } from "./ManufacturaLeadGenAgent";
import { resetManufacturaPreciosAgentForTests } from "./ManufacturaPreciosAgent";
import { resetManufacturaReviewsAgentForTests } from "./ManufacturaReviewsAgent";
import { resetManufacturaSEOAgentForTests } from "./ManufacturaSEOAgent";
import { resetManufacturaSocialAgentForTests } from "./ManufacturaSocialAgent";

export function resetAllManufacturaAgentsForTests(): void {
  resetManufacturaLeadGenAgentForTests();
  resetManufacturaExportacionAgentForTests();
  resetManufacturaPreciosAgentForTests();
  resetManufacturaSEOAgentForTests();
  resetManufacturaSocialAgentForTests();
  resetManufacturaEmailAgentForTests();
  resetManufacturaReviewsAgentForTests();
  resetManufacturaAnalyticsAgentForTests();
}
