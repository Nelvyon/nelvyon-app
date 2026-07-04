import { getGlobalPrivateAiConfig, isOpenClawBridgeEnabled } from "../config";

export type OpenClawBridgeStatus = "disabled" | "available" | "connected";

export type OpenClawAgentRequest = {
  agentId: string;
  input: string;
  tenantId: string;
  tools?: string[];
};

export type OpenClawAgentResponse = {
  ok: boolean;
  output?: string;
  error?: string;
  delegatedTo?: "nelvyon_private_ai";
};

/**
 * Optional OpenClaw bridge — NOT integrated.
 * Nelvyon owns agent orchestration; OpenClaw can plug in here without coupling the core.
 */
export interface IOpenClawBridge {
  status(): OpenClawBridgeStatus;
  dispatch(_request: OpenClawAgentRequest): Promise<OpenClawAgentResponse>;
}

export class DisabledOpenClawBridge implements IOpenClawBridge {
  status(): OpenClawBridgeStatus {
    if (!isOpenClawBridgeEnabled()) return "disabled";
    const url = getGlobalPrivateAiConfig().openClawBridgeUrl;
    return url ? "available" : "disabled";
  }

  async dispatch(_request: OpenClawAgentRequest): Promise<OpenClawAgentResponse> {
    return {
      ok: false,
      error:
        "OpenClaw bridge not connected. Set NELVYON_OPENCLAW_BRIDGE_ENABLED=1 and NELVYON_OPENCLAW_BRIDGE_URL when ready.",
      delegatedTo: "nelvyon_private_ai",
    };
  }
}

let _bridge: IOpenClawBridge | undefined;
export function getOpenClawBridge(): IOpenClawBridge {
  _bridge ??= new DisabledOpenClawBridge();
  return _bridge;
}

export function setOpenClawBridgeForTests(bridge: IOpenClawBridge): void {
  _bridge = bridge;
}

export function resetOpenClawBridgeForTests(): void {
  _bridge = undefined;
}
