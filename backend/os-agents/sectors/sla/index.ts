import { SlaClientNotificationAgent } from "./SlaClientNotificationAgent";
import { SlaCompensationCalculatorAgent } from "./SlaCompensationCalculatorAgent";
import { SlaEscalationProtocolAgent } from "./SlaEscalationProtocolAgent";
import { SlaIncidentClassifierAgent } from "./SlaIncidentClassifierAgent";
import { SlaPostmortemAgent } from "./SlaPostmortemAgent";
import { SlaReputationRepairAgent } from "./SlaReputationRepairAgent";
import { SlaRootCauseAgent } from "./SlaRootCauseAgent";
import { SlaUptimeMonitorAgent } from "./SlaUptimeMonitorAgent";

export type { SlaInput, SlaOutput } from "./shared";
export { parseSlaLlmJson, buildResolvePrompt, llmOpts as slaLlmOpts } from "./shared";

export {
  SlaIncidentClassifierAgent,
  getSlaIncidentClassifierAgent,
  resetSlaIncidentClassifierAgentForTests,
} from "./SlaIncidentClassifierAgent";
export {
  SlaUptimeMonitorAgent,
  getSlaUptimeMonitorAgent,
  resetSlaUptimeMonitorAgentForTests,
} from "./SlaUptimeMonitorAgent";
export {
  SlaClientNotificationAgent,
  getSlaClientNotificationAgent,
  resetSlaClientNotificationAgentForTests,
} from "./SlaClientNotificationAgent";
export {
  SlaCompensationCalculatorAgent,
  getSlaCompensationCalculatorAgent,
  resetSlaCompensationCalculatorAgentForTests,
} from "./SlaCompensationCalculatorAgent";
export {
  SlaPostmortemAgent,
  getSlaPostmortemAgent,
  resetSlaPostmortemAgentForTests,
} from "./SlaPostmortemAgent";
export {
  SlaEscalationProtocolAgent,
  getSlaEscalationProtocolAgent,
  resetSlaEscalationProtocolAgentForTests,
} from "./SlaEscalationProtocolAgent";
export {
  SlaRootCauseAgent,
  getSlaRootCauseAgent,
  resetSlaRootCauseAgentForTests,
} from "./SlaRootCauseAgent";
export {
  SlaReputationRepairAgent,
  getSlaReputationRepairAgent,
  resetSlaReputationRepairAgentForTests,
} from "./SlaReputationRepairAgent";

export function resetAllSlaAgentsForTests(): void {
  SlaIncidentClassifierAgent.reset();
  SlaUptimeMonitorAgent.reset();
  SlaClientNotificationAgent.reset();
  SlaCompensationCalculatorAgent.reset();
  SlaPostmortemAgent.reset();
  SlaEscalationProtocolAgent.reset();
  SlaRootCauseAgent.reset();
  SlaReputationRepairAgent.reset();
}
