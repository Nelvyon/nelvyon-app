import { getGlobalPrivateAiConfig, isOpenClawBridgeEnabled } from "../config";
import { assertUrlAllowed } from "../privateMode";
import {
  isOpenClawRuntimeAuthorized,
  OPENCLAW_ADAPTER_CONTRACT,
  resolveOpenClawRuntimeConfig,
} from "../../openclaw/contracts";
import { incPrivateAiMetric } from "../observability/PrivateAiMetrics";

function openClawBridgeUrl(): string | null {
  return resolveOpenClawRuntimeConfig().bridgeUrl ?? getGlobalPrivateAiConfig().openClawBridgeUrl ?? null;
}

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
  status?: OpenClawBridgeStatus;
};

/**
 * Optional OpenClaw bridge — Nelvyon owns orchestration; OpenClaw is a plugin.
 */
export interface IOpenClawBridge {
  status(): OpenClawBridgeStatus;
  dispatch(request: OpenClawAgentRequest): Promise<OpenClawAgentResponse>;
}

export class DisabledOpenClawBridge implements IOpenClawBridge {
  status(): OpenClawBridgeStatus {
    if (!isOpenClawBridgeEnabled() || !isOpenClawRuntimeAuthorized()) return "disabled";
    const url = openClawBridgeUrl();
    return url ? "available" : "disabled";
  }

  async dispatch(_request: OpenClawAgentRequest): Promise<OpenClawAgentResponse> {
    const url = openClawBridgeUrl();
    if (url) assertUrlAllowed(url, "openclaw_bridge");
    return {
      ok: false,
      status: this.status(),
      error:
        "OpenClaw bridge not connected. Require NELVYON_SHARED_MEMORY_ENABLED=1, NELVYON_OPENCLAW_BRIDGE_ENABLED=1, and NELVYON_OPENCLAW_BRIDGE_URL.",
      delegatedTo: "nelvyon_private_ai",
    };
  }
}

/**
 * HTTP bridge — only used when runtime authorized + URL configured.
 * Fail-closed: no secrets in logs; PRIVATE_MODE URL allowlist enforced.
 */
export class HttpOpenClawBridge implements IOpenClawBridge {
  status(): OpenClawBridgeStatus {
    if (!isOpenClawRuntimeAuthorized()) return "disabled";
    const url = openClawBridgeUrl();
    if (!url) return "disabled";
    return "available";
  }

  async dispatch(request: OpenClawAgentRequest): Promise<OpenClawAgentResponse> {
    if (!isOpenClawRuntimeAuthorized()) {
      return {
        ok: false,
        status: "disabled",
        error: "openclaw_not_authorized",
        delegatedTo: "nelvyon_private_ai",
      };
    }
    if (!request.tenantId?.trim()) {
      return { ok: false, error: "tenant_required", delegatedTo: "nelvyon_private_ai" };
    }

    const url = openClawBridgeUrl();
    if (!url) {
      return {
        ok: false,
        status: "disabled",
        error: "openclaw_url_missing",
        delegatedTo: "nelvyon_private_ai",
      };
    }

    assertUrlAllowed(url, "openclaw_bridge");

    const forbidden = new Set(OPENCLAW_ADAPTER_CONTRACT.security.forbiddenTools);
    const tools = (request.tools ?? []).filter((t) => !forbidden.has(t));

    const maxBytes = OPENCLAW_ADAPTER_CONTRACT.security.maxPayloadBytes;
    const body = JSON.stringify({
      agentId: request.agentId,
      tenantId: request.tenantId,
      input: request.input.slice(0, 20_000),
      tools,
    });
    if (Buffer.byteLength(body, "utf8") > maxBytes) {
      return { ok: false, error: "payload_too_large", delegatedTo: "nelvyon_private_ai" };
    }

    incPrivateAiMetric("openClawDispatches");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);
    try {
      const res = await fetch(url.replace(/\/$/, "") + "/v1/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body,
        signal: controller.signal,
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        return {
          ok: false,
          status: "available",
          error: `openclaw_http_${res.status}:${errText.slice(0, 120)}`,
          delegatedTo: "nelvyon_private_ai",
        };
      }
      const data = (await res.json()) as { output?: string; ok?: boolean; error?: string };
      return {
        ok: data.ok !== false,
        status: "connected",
        output: data.output,
        error: data.error,
      };
    } catch (e) {
      return {
        ok: false,
        status: "available",
        error: e instanceof Error ? e.message : "openclaw_fetch_failed",
        delegatedTo: "nelvyon_private_ai",
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}

let _bridge: IOpenClawBridge | undefined;

export function getOpenClawBridge(): IOpenClawBridge {
  if (_bridge) return _bridge;
  const cfg = resolveOpenClawRuntimeConfig();
  if (cfg.liveReady) {
    _bridge = new HttpOpenClawBridge();
  } else {
    _bridge = new DisabledOpenClawBridge();
  }
  return _bridge;
}

export function setOpenClawBridgeForTests(bridge: IOpenClawBridge): void {
  _bridge = bridge;
}

export function resetOpenClawBridgeForTests(): void {
  _bridge = undefined;
}
