import { describe, it, expect, vi } from "vitest";

import { pickSkillForMessage, resolveSkillsForChannel } from "../nelvyonAgentSkillsCatalog";
import { SaasInboxAgentService } from "../SaasInboxAgentService";

const TENANT = "t-agent-1";

const convRow = {
  id: "cv1",
  tenant_id: TENANT,
  contact_id: null,
  channel: "whatsapp",
  status: "open",
  priority: "normal",
  assigned_to: null,
  thread_id: null,
  subject: null,
  first_response_at: null,
  sla_due_at: null,
  sla_breached: false,
  unread_count: 1,
  last_message: "hola",
  last_message_at: new Date(),
  created_at: new Date(),
  updated_at: new Date(),
  contact_name: null,
  contact_email: null,
  contact_phone: null,
};

const msgRow = {
  id: "m1",
  conversation_id: "cv1",
  tenant_id: TENANT,
  direction: "inbound",
  channel: "whatsapp",
  body: "¿Cuánto cuesta un pack SEO?",
  status: "sent",
  external_id: null,
  parent_message_id: null,
  metadata: {},
  created_at: new Date(),
};

describe("nelvyonAgentSkillsCatalog", () => {
  it("resolves skills for whatsapp channel", () => {
    const skills = resolveSkillsForChannel("whatsapp", ["inbox_support", "nelvyon_services"]);
    expect(skills.length).toBeGreaterThan(0);
    const picked = pickSkillForMessage("quiero un pack seo", skills);
    expect(picked.id).toBe("nelvyon_services");
  });
});

describe("SaasInboxAgentService", () => {
  it("suggestReply uses mock when LLM off", async () => {
    const db = {
      query: vi.fn(async (sql: string) => {
        if (sql.includes("saas_inbox_agent_settings")) {
          return [
            {
              tenant_id: TENANT,
              enabled: true,
              auto_reply_enabled: false,
              auto_reply_min_confidence: 0.85,
              system_prompt: null,
              escalate_keywords: ["abogado"],
              active_skill_ids: ["inbox_support", "nelvyon_services"],
              speak_responses: true,
              updated_at: new Date(),
            },
          ];
        }
        if (sql.includes("INSERT INTO saas_inbox_agent_suggestions")) {
          return [{ id: "sug-1" }];
        }
        return [];
      }),
    };

    const inbox = {
      getConversation: vi.fn(async () => convRow),
      listMessages: vi.fn(async () => [msgRow]),
      replyToConversation: vi.fn(),
    };

    const svc = new SaasInboxAgentService({ db, inbox: inbox as never, llm: null });
    const result = await svc.suggestReply(TENANT, "cv1");
    expect(result.mock).toBe(true);
    expect(result.suggestion.length).toBeGreaterThan(10);
    expect(result.skillId).toBe("nelvyon_services");
  });

  it("handleInbound escalates on legal keywords", async () => {
    const db = {
      query: vi.fn(async (sql: string) => {
        if (sql.includes("saas_inbox_agent_settings")) {
          return [
            {
              tenant_id: TENANT,
              enabled: true,
              auto_reply_enabled: true,
              auto_reply_min_confidence: 0.5,
              system_prompt: null,
              escalate_keywords: ["abogado"],
              active_skill_ids: ["inbox_support"],
              speak_responses: true,
              updated_at: new Date(),
            },
          ];
        }
        if (sql.includes("INSERT INTO saas_inbox_agent_suggestions")) {
          return [{ id: "sug-2" }];
        }
        return [];
      }),
    };

    const inbox = {
      getConversation: vi.fn(async () => convRow),
      listMessages: vi.fn(async () => [{ ...msgRow, body: "voy a llamar a mi abogado" }]),
      replyToConversation: vi.fn(),
    };

    const svc = new SaasInboxAgentService({ db, inbox: inbox as never, llm: null });
    const out = await svc.handleInbound(TENANT, "cv1", "voy a llamar a mi abogado");
    expect(out.suggested?.escalated).toBe(true);
    expect(out.autoReplied).toBe(false);
    expect(inbox.replyToConversation).not.toHaveBeenCalled();
  });
});
