import { CreativeAdCopyAgent } from "./CreativeAdCopyAgent";
import { CreativeBrandVoiceAgent } from "./CreativeBrandVoiceAgent";
import { CreativeNamingAgent } from "./CreativeNamingAgent";
import { CreativeProductDescAgent } from "./CreativeProductDescAgent";
import { CreativeRepurposerAgent } from "./CreativeRepurposerAgent";
import { CreativeSlideDecksAgent } from "./CreativeSlideDecksAgent";
import { CreativeTaglineGeneratorAgent } from "./CreativeTaglineGeneratorAgent";
import { CreativeVideoScriptAgent } from "./CreativeVideoScriptAgent";

export type { CreativeInput, CreativeOutput } from "./shared";
export { parseCreativeLlmJson, buildCreatePrompt, llmOpts as creativeLlmOpts } from "./shared";

export {
  CreativeBrandVoiceAgent,
  getCreativeBrandVoiceAgent,
  resetCreativeBrandVoiceAgentForTests,
} from "./CreativeBrandVoiceAgent";
export {
  CreativeAdCopyAgent,
  getCreativeAdCopyAgent,
  resetCreativeAdCopyAgentForTests,
} from "./CreativeAdCopyAgent";
export {
  CreativeVideoScriptAgent,
  getCreativeVideoScriptAgent,
  resetCreativeVideoScriptAgentForTests,
} from "./CreativeVideoScriptAgent";
export {
  CreativeSlideDecksAgent,
  getCreativeSlideDecksAgent,
  resetCreativeSlideDecksAgentForTests,
} from "./CreativeSlideDecksAgent";
export {
  CreativeTaglineGeneratorAgent,
  getCreativeTaglineGeneratorAgent,
  resetCreativeTaglineGeneratorAgentForTests,
} from "./CreativeTaglineGeneratorAgent";
export {
  CreativeProductDescAgent,
  getCreativeProductDescAgent,
  resetCreativeProductDescAgentForTests,
} from "./CreativeProductDescAgent";
export {
  CreativeNamingAgent,
  getCreativeNamingAgent,
  resetCreativeNamingAgentForTests,
} from "./CreativeNamingAgent";
export {
  CreativeRepurposerAgent,
  getCreativeRepurposerAgent,
  resetCreativeRepurposerAgentForTests,
} from "./CreativeRepurposerAgent";

export function resetAllCreativeAgentsForTests(): void {
  CreativeBrandVoiceAgent.reset();
  CreativeAdCopyAgent.reset();
  CreativeVideoScriptAgent.reset();
  CreativeSlideDecksAgent.reset();
  CreativeTaglineGeneratorAgent.reset();
  CreativeProductDescAgent.reset();
  CreativeNamingAgent.reset();
  CreativeRepurposerAgent.reset();
}
