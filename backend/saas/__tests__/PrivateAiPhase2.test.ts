import { describe, expect, it, beforeEach } from "vitest";

import {
  getGlobalPrivateAiConfig,
  isNelvyonAiEnabled,
  resetGlobalPrivateAiConfigForTests,
} from "../../private-ai/config";
import { resetProviderRegistryForTests } from "../../private-ai/core/ProviderRegistry";
import { NELVYON_PRIVATE_AGENTS, getPrivateAgent, PILOT_AGENT_ID } from "../../private-ai/nelvyonAgentRegistry";
import { getPrivateAiRouter, resetPrivateAiRouterForTests } from "../../private-ai/PrivateAiRouter";
import { getOpenClawBridge, resetOpenClawBridgeForTests } from "../../private-ai/adapters/OpenClawBridge";
import { requiresApproval, isSensitiveAction } from "../../private-ai/sensitiveActions";
import { SaasPrivateAiService, resetSaasPrivateAiServiceForTests } from "../SaasPrivateAiService";

describe("Private AI modular architecture", () => {
  beforeEach(() => {
    resetGlobalPrivateAiConfigForTests();
    resetPrivateAiRouterForTests();
    resetProviderRegistryForTests();
    resetOpenClawBridgeForTests();
    resetSaasPrivateAiServiceForTests();
  });

  it("registers 17 expert agents including pilot CEO", () => {
    expect(NELVYON_PRIVATE_AGENTS.length).toBe(17);
    expect(getPrivateAgent(PILOT_AGENT_ID)?.role).toMatch(/Supervisor/i);
  });

  it("default platform state is unconfigured with AI disabled", async () => {
    expect(isNelvyonAiEnabled()).toBe(false);
    const { result } = await getPrivateAiRouter().complete({
      messages: [{ role: "user", content: "hola" }],
    });
    expect(result.provider).toBe("unconfigured");
    expect(result.ready).toBe(false);
    expect(result.mock).toBe(false);
  });

  it("stub mode returns mock:true for dev only", async () => {
    process.env.NELVYON_AI_ENABLED = "1";
    process.env.NELVYON_AI_MODE = "stub";
    resetPrivateAiRouterForTests();
    const { result } = await getPrivateAiRouter().complete({
      messages: [
        { role: "system", content: "Agente: ceo_supervisor" },
        { role: "user", content: "Prioridades" },
      ],
    });
    expect(result.mock).toBe(true);
    expect(result.provider).toBe("stub");
    expect(result.ready).toBe(false);
  });

  it("local provider does not probe network without OLLAMA_CONFIGURED", async () => {
    process.env.NELVYON_AI_ENABLED = "1";
    process.env.NELVYON_AI_MODE = "local";
    resetPrivateAiRouterForTests();
    resetProviderRegistryForTests();
    const status = await getPrivateAiRouter().platformStatus();
    expect(status.providers.find((p) => p.id === "local_ollama")?.available).toBe(false);
  });

  it("private_ai_only blocks external provider preference", () => {
    process.env.NELVYON_AI_ENABLED = "1";
    process.env.PRIVATE_AI_ONLY = "1";
    process.env.NELVYON_AI_MODE = "openai";
    resetPrivateAiRouterForTests();
    expect(getPrivateAiRouter().resolveMode()).toBe("local");
  });

  it("OpenClaw bridge is disabled by default", () => {
    expect(getOpenClawBridge().status()).toBe("disabled");
  });

  it("sensitive actions always require approval", () => {
    expect(isSensitiveAction("delete_data")).toBe(true);
    const agent = getPrivateAgent("email_marketing")!;
    expect(requiresApproval("send_mass_campaign", agent.approvalRequiredActions)).toBe(true);
  });

  it("runAgent queues approval for sensitive action", async () => {
    const db = {
      query: async (sql: string) => {
        if (sql.includes("INSERT INTO saas_private_ai_settings")) return [];
        if (sql.includes("FROM saas_private_ai_settings")) {
          return [{ tenant_id: "t1", ai_mode: "unconfigured", private_ai_only: false }];
        }
        if (sql.includes("INSERT INTO saas_private_ai_approvals")) return [{ id: "appr-1" }];
        if (sql.includes("INSERT INTO saas_private_ai_audit")) return [{ id: "audit-1" }];
        if (sql.includes("autonomy_mode") || sql.includes("saas_tenants")) {
          return [{ autonomy_mode: "propose" }];
        }
        return [];
      },
    };
    const svc = new SaasPrivateAiService(db as never);
    const out = await svc.runAgent({
      tenantId: "t1",
      userId: "u1",
      agentId: PILOT_AGENT_ID,
      input: "Enviar campaña masiva",
      action: "send_mass_campaign",
    });
    expect(out.approvalRequired).toBe(true);
    expect(out.approvalId).toBe("appr-1");
  });

  it("runAgent advise uses unconfigured when AI disabled", async () => {
    const db = {
      query: async (sql: string) => {
        if (sql.includes("INSERT INTO saas_private_ai_settings")) return [];
        if (sql.includes("FROM saas_private_ai_settings")) {
          return [{ tenant_id: "t1", ai_mode: "unconfigured", private_ai_only: false }];
        }
        if (sql.includes("INSERT INTO saas_private_ai_audit")) return [{ id: "audit-2" }];
        if (sql.includes("autonomy_mode") || sql.includes("saas_tenants")) {
          return [{ autonomy_mode: "execute" }];
        }
        if (sql.includes("nelvyon_rag_chunks")) return [];
        if (sql.includes("saas_tenant_memory")) return [];
        return [];
      },
    };
    const svc = new SaasPrivateAiService(db as never);
    const out = await svc.runAgent({
      tenantId: "t1",
      agentId: PILOT_AGENT_ID,
      input: "Prioridades CEO",
      action: "advise",
    });
    expect(out.ready).toBe(false);
    expect(out.mock).toBe(false);
    expect(out.provider).toBe("unconfigured");
    expect(out.auditId).toBe("audit-2");
  });

  it("global config defaults to unconfigured and disabled", () => {
    const cfg = getGlobalPrivateAiConfig();
    expect(cfg.aiMode).toBe("unconfigured");
    expect(cfg.enabled).toBe(false);
  });
});
