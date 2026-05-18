import { NewsletterABTestAgent } from "./NewsletterABTestAgent";
import { NewsletterAnalyticsAgent } from "./NewsletterAnalyticsAgent";
import { NewsletterChurnAgent } from "./NewsletterChurnAgent";
import { NewsletterGrowthAgent } from "./NewsletterGrowthAgent";
import { NewsletterMonetizationAgent } from "./NewsletterMonetizationAgent";
import { NewsletterPersonalizationAgent } from "./NewsletterPersonalizationAgent";
import { NewsletterSchedulerAgent } from "./NewsletterSchedulerAgent";
import { NewsletterWriterAgent } from "./NewsletterWriterAgent";

export type { NewsletterInput, NewsletterOutput } from "./shared";
export { parseNewsletterLlmJson, buildNewsletterPrompt, llmOpts as newsletterLlmOpts } from "./shared";

export {
  NewsletterWriterAgent,
  getNewsletterWriterAgent,
  resetNewsletterWriterAgentForTests,
} from "./NewsletterWriterAgent";
export {
  NewsletterPersonalizationAgent,
  getNewsletterPersonalizationAgent,
  resetNewsletterPersonalizationAgentForTests,
} from "./NewsletterPersonalizationAgent";
export {
  NewsletterSchedulerAgent,
  getNewsletterSchedulerAgent,
  resetNewsletterSchedulerAgentForTests,
} from "./NewsletterSchedulerAgent";
export {
  NewsletterMonetizationAgent,
  getNewsletterMonetizationAgent,
  resetNewsletterMonetizationAgentForTests,
} from "./NewsletterMonetizationAgent";
export {
  NewsletterAnalyticsAgent,
  getNewsletterAnalyticsAgent,
  resetNewsletterAnalyticsAgentForTests,
} from "./NewsletterAnalyticsAgent";
export {
  NewsletterGrowthAgent,
  getNewsletterGrowthAgent,
  resetNewsletterGrowthAgentForTests,
} from "./NewsletterGrowthAgent";
export {
  NewsletterABTestAgent,
  getNewsletterABTestAgent,
  resetNewsletterABTestAgentForTests,
} from "./NewsletterABTestAgent";
export {
  NewsletterChurnAgent,
  getNewsletterChurnAgent,
  resetNewsletterChurnAgentForTests,
} from "./NewsletterChurnAgent";

export function resetAllNewsletterAgentsForTests(): void {
  NewsletterWriterAgent.reset();
  NewsletterPersonalizationAgent.reset();
  NewsletterSchedulerAgent.reset();
  NewsletterMonetizationAgent.reset();
  NewsletterAnalyticsAgent.reset();
  NewsletterGrowthAgent.reset();
  NewsletterABTestAgent.reset();
  NewsletterChurnAgent.reset();
}
