export type { CryptoInput, CryptoOutput } from "./shared";
export {
  cryptoLlmOpts as cryptoLlmOpts,
  parseCryptoLlmJson,
  buildCryptoPrompt,
  runCryptoAgentCore,
  getDefaultCryptoLlm,
} from "./shared";
export * from "./CryptoComunidadAgent";
export * from "./CryptoLaunchAgent";
export * from "./CryptoPreciosAgent";
export * from "./CryptoSEOAgent";
export * from "./CryptoSocialAgent";
export * from "./CryptoEmailAgent";
export * from "./CryptoReviewsAgent";
export * from "./CryptoAnalyticsAgent";

import { resetCryptoAnalyticsAgentForTests } from "./CryptoAnalyticsAgent";
import { resetCryptoComunidadAgentForTests } from "./CryptoComunidadAgent";
import { resetCryptoEmailAgentForTests } from "./CryptoEmailAgent";
import { resetCryptoLaunchAgentForTests } from "./CryptoLaunchAgent";
import { resetCryptoPreciosAgentForTests } from "./CryptoPreciosAgent";
import { resetCryptoReviewsAgentForTests } from "./CryptoReviewsAgent";
import { resetCryptoSEOAgentForTests } from "./CryptoSEOAgent";
import { resetCryptoSocialAgentForTests } from "./CryptoSocialAgent";

export function resetAllCryptoAgentsForTests(): void {
  resetCryptoComunidadAgentForTests();
  resetCryptoLaunchAgentForTests();
  resetCryptoPreciosAgentForTests();
  resetCryptoSEOAgentForTests();
  resetCryptoSocialAgentForTests();
  resetCryptoEmailAgentForTests();
  resetCryptoReviewsAgentForTests();
  resetCryptoAnalyticsAgentForTests();
}
