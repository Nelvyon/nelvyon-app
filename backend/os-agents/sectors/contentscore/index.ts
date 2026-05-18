import { ContentScoreAnalyzerAgent } from "./ContentScoreAnalyzerAgent";
import { ContentScoreBenchmarkAgent } from "./ContentScoreBenchmarkAgent";
import { ContentScoreCTAAgent } from "./ContentScoreCTAAgent";
import { ContentScoreRankAgent } from "./ContentScoreRankAgent";
import { ContentScoreReportAgent } from "./ContentScoreReportAgent";
import { ContentScoreRewriterAgent } from "./ContentScoreRewriterAgent";
import { ContentScoreSEOAgent } from "./ContentScoreSEOAgent";
import { ContentScoreToneAgent } from "./ContentScoreToneAgent";

export type { ContentScoreInput, ContentScoreOutput } from "./shared";
export { parseContentScoreLlmJson, buildContentScorePrompt, llmOpts as contentScoreLlmOpts } from "./shared";

export {
  ContentScoreAnalyzerAgent,
  getContentScoreAnalyzerAgent,
  resetContentScoreAnalyzerAgentForTests,
} from "./ContentScoreAnalyzerAgent";
export {
  ContentScoreRankAgent,
  getContentScoreRankAgent,
  resetContentScoreRankAgentForTests,
} from "./ContentScoreRankAgent";
export {
  ContentScoreRewriterAgent,
  getContentScoreRewriterAgent,
  resetContentScoreRewriterAgentForTests,
} from "./ContentScoreRewriterAgent";
export {
  ContentScoreSEOAgent,
  getContentScoreSEOAgent,
  resetContentScoreSEOAgentForTests,
} from "./ContentScoreSEOAgent";
export {
  ContentScoreCTAAgent,
  getContentScoreCTAAgent,
  resetContentScoreCTAAgentForTests,
} from "./ContentScoreCTAAgent";
export {
  ContentScoreToneAgent,
  getContentScoreToneAgent,
  resetContentScoreToneAgentForTests,
} from "./ContentScoreToneAgent";
export {
  ContentScoreBenchmarkAgent,
  getContentScoreBenchmarkAgent,
  resetContentScoreBenchmarkAgentForTests,
} from "./ContentScoreBenchmarkAgent";
export {
  ContentScoreReportAgent,
  getContentScoreReportAgent,
  resetContentScoreReportAgentForTests,
} from "./ContentScoreReportAgent";

export function resetAllContentScoreAgentsForTests(): void {
  ContentScoreAnalyzerAgent.reset();
  ContentScoreRankAgent.reset();
  ContentScoreRewriterAgent.reset();
  ContentScoreSEOAgent.reset();
  ContentScoreCTAAgent.reset();
  ContentScoreToneAgent.reset();
  ContentScoreBenchmarkAgent.reset();
  ContentScoreReportAgent.reset();
}
