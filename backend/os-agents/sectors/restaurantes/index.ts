import { RestauranteAnalyticsAgent } from "./RestauranteAnalyticsAgent";
import { RestauranteEmailSMSAgent } from "./RestauranteEmailSMSAgent";
import { RestauranteMenuAgent } from "./RestauranteMenuAgent";
import { RestaurantePresenciaAgent } from "./RestaurantePresenciaAgent";
import { RestauranteReservasAgent } from "./RestauranteReservasAgent";
import { RestauranteReviewsAgent } from "./RestauranteReviewsAgent";
import { RestauranteSEOLocalAgent } from "./RestauranteSEOLocalAgent";
import { RestauranteSocialAgent } from "./RestauranteSocialAgent";

export type { RestaurantesInput, RestaurantesOutput } from "./shared";
export { parseRestaurantesLlmJson, buildRestaurantesPrompt, llmOpts as restaurantesLlmOpts } from "./shared";

export {
  RestaurantePresenciaAgent,
  getRestaurantePresenciaAgent,
  resetRestaurantePresenciaAgentForTests,
} from "./RestaurantePresenciaAgent";
export {
  RestauranteReviewsAgent,
  getRestauranteReviewsAgent,
  resetRestauranteReviewsAgentForTests,
} from "./RestauranteReviewsAgent";
export {
  RestauranteSEOLocalAgent,
  getRestauranteSEOLocalAgent,
  resetRestauranteSEOLocalAgentForTests,
} from "./RestauranteSEOLocalAgent";
export {
  RestauranteMenuAgent,
  getRestauranteMenuAgent,
  resetRestauranteMenuAgentForTests,
} from "./RestauranteMenuAgent";
export {
  RestauranteReservasAgent,
  getRestauranteReservasAgent,
  resetRestauranteReservasAgentForTests,
} from "./RestauranteReservasAgent";
export {
  RestauranteEmailSMSAgent,
  getRestauranteEmailSMSAgent,
  resetRestauranteEmailSMSAgentForTests,
} from "./RestauranteEmailSMSAgent";
export {
  RestauranteSocialAgent,
  getRestauranteSocialAgent,
  resetRestauranteSocialAgentForTests,
} from "./RestauranteSocialAgent";
export {
  RestauranteAnalyticsAgent,
  getRestauranteAnalyticsAgent,
  resetRestauranteAnalyticsAgentForTests,
} from "./RestauranteAnalyticsAgent";

export function resetAllRestaurantesAgentsForTests(): void {
  RestaurantePresenciaAgent.reset();
  RestauranteReviewsAgent.reset();
  RestauranteSEOLocalAgent.reset();
  RestauranteMenuAgent.reset();
  RestauranteReservasAgent.reset();
  RestauranteEmailSMSAgent.reset();
  RestauranteSocialAgent.reset();
  RestauranteAnalyticsAgent.reset();
}
