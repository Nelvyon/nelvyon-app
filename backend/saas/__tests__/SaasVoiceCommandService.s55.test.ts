/**
 * S55 — SaasVoiceCommandService unit tests
 */
import { describe, expect, it, vi } from "vitest";
import {
  SaasVoiceCommandService,
  SaasVoiceCommandError,
  normalizeTranscript,
} from "../SaasVoiceCommandService";
import type { SaasPostgresPort } from "../SaasOnboardingService";

function makeDb(handler: (sql: string, params: unknown[]) => unknown[]): SaasPostgresPort {
  return {
    query: vi.fn().mockImplementation(async (sql: string, params: unknown[]) => handler(sql, params)),
  } as unknown as SaasPostgresPort;
}

const NO_DATA = makeDb(() => []);

// ── normalizeTranscript ─────────────────────────────────────────────────────────

describe("normalizeTranscript", () => {
  it("strips accents and lowercases", () => {
    expect(normalizeTranscript("Campañas")).toBe("campanas");
  });

  it("collapses whitespace and punctuation", () => {
    expect(normalizeTranscript("  ¡Ir   a, CRM!  ")).toBe("ir a crm");
  });
});

// ── getCatalog ──────────────────────────────────────────────────────────────────

describe("SaasVoiceCommandService — getCatalog", () => {
  it("returns the intent catalog", () => {
    const svc = new SaasVoiceCommandService(NO_DATA);
    const catalog = svc.getCatalog();
    expect(catalog.length).toBeGreaterThan(10);
    expect(catalog.find((c) => c.id === "nav_crm")).toBeDefined();
  });
});

// ── parseTranscript: navigation ─────────────────────────────────────────────────

describe("SaasVoiceCommandService — parseTranscript navigation", () => {
  const svc = new SaasVoiceCommandService(NO_DATA);

  it("matches 'ir a crm' → /saas/crm", () => {
    const r = svc.parseTranscript("Ir a CRM");
    expect(r.success).toBe(true);
    expect(r.route).toBe("/saas/crm");
    expect(r.intent?.actionType).toBe("navigate");
  });

  it("matches 'abre campañas' with accents → campanias route", () => {
    const r = svc.parseTranscript("abre campañas");
    expect(r.success).toBe(true);
    expect(r.route).toBe("/saas/campanias");
  });

  it("matches 'pack store' → /saas/packs", () => {
    expect(svc.parseTranscript("pack store").route).toBe("/saas/packs");
  });

  it("matches 'compliance' → /saas/compliance", () => {
    expect(svc.parseTranscript("compliance").route).toBe("/saas/compliance");
  });

  it("matches 'partner zone' → /saas/partner", () => {
    expect(svc.parseTranscript("abrir partner zone").route).toBe("/saas/partner");
  });

  it("matches 'benchmark' → /saas/benchmark", () => {
    expect(svc.parseTranscript("muéstrame el benchmark").route).toBe("/saas/benchmark");
  });

  it("matches English 'go to billing' → /saas/billing", () => {
    expect(svc.parseTranscript("go to billing").route).toBe("/saas/billing");
  });

  it("matches 'configuración' → /saas/settings", () => {
    expect(svc.parseTranscript("configuración").route).toBe("/saas/settings");
  });
});

// ── parseTranscript: actions + queries ──────────────────────────────────────────

describe("SaasVoiceCommandService — parseTranscript actions", () => {
  const svc = new SaasVoiceCommandService(NO_DATA);

  it("matches 'sincronizar playbooks' as action", () => {
    const r = svc.parseTranscript("sincronizar playbooks");
    expect(r.intent?.actionType).toBe("action");
    expect(r.intent?.action).toBe("refresh_playbooks");
  });

  it("matches 'actualizar benchmark' as action", () => {
    const r = svc.parseTranscript("actualizar benchmark");
    expect(r.intent?.action).toBe("refresh_benchmark");
  });

  it("matches 'cuántas subcuentas' as query", () => {
    const r = svc.parseTranscript("cuántas subcuentas");
    expect(r.intent?.actionType).toBe("query");
    expect(r.intent?.action).toBe("count_subcuentas");
  });
});

// ── parseTranscript: unknown ────────────────────────────────────────────────────

describe("SaasVoiceCommandService — parseTranscript unknown", () => {
  const svc = new SaasVoiceCommandService(NO_DATA);

  it("returns success=false + suggestions for gibberish", () => {
    const r = svc.parseTranscript("xyzzy plugh quux");
    expect(r.success).toBe(false);
    expect(r.intent).toBeNull();
    expect(r.suggestions?.length).toBe(3);
  });

  it("throws VALIDATION for empty transcript", () => {
    expect(() => svc.parseTranscript("   ")).toThrow(SaasVoiceCommandError);
  });
});

// ── logCommand + listHistory ────────────────────────────────────────────────────

describe("SaasVoiceCommandService — logging", () => {
  function logRow(over: Record<string, unknown> = {}) {
    return {
      id: "v1", tenant_id: "t1", user_id: null, transcript: "ir a crm",
      matched_intent: "nav_crm", action_type: "navigate", action_payload: {},
      success: true, error_message: null, source: "web_speech", created_at: "", ...over,
    };
  }

  it("logCommand inserts and maps the row", async () => {
    const db = makeDb(() => [logRow()]);
    const svc = new SaasVoiceCommandService(db);
    const log = await svc.logCommand("t1", { transcript: "ir a crm", matchedIntent: "nav_crm", actionType: "navigate", success: true });
    expect(log.id).toBe("v1");
    expect(log.matchedIntent).toBe("nav_crm");
  });

  it("listHistory returns mapped logs", async () => {
    const db = makeDb(() => [logRow(), logRow({ id: "v2" })]);
    const svc = new SaasVoiceCommandService(db);
    const hist = await svc.listHistory("t1");
    expect(hist).toHaveLength(2);
  });

  it("listHistory returns [] when none", async () => {
    const svc = new SaasVoiceCommandService(NO_DATA);
    expect(await svc.listHistory("t1")).toHaveLength(0);
  });
});

// ── executeCommand ──────────────────────────────────────────────────────────────

describe("SaasVoiceCommandService — executeCommand", () => {
  it("parses, logs and returns the result", async () => {
    let inserted = false;
    const db = makeDb((sql) => {
      if (sql.includes("INSERT INTO saas_voice_commands")) {
        inserted = true;
        return [{ id: "v1", tenant_id: "t1", user_id: null, transcript: "ir a crm", matched_intent: "nav_crm", action_type: "navigate", action_payload: {}, success: true, error_message: null, source: "web_speech", created_at: "" }];
      }
      return [];
    });
    const svc = new SaasVoiceCommandService(db);
    const r = await svc.executeCommand("t1", "ir a crm", { userId: "u1" });
    expect(r.success).toBe(true);
    expect(r.route).toBe("/saas/crm");
    expect(inserted).toBe(true);
  });

  it("still returns result if logging throws", async () => {
    const db = makeDb((sql) => {
      if (sql.includes("INSERT INTO saas_voice_commands")) throw new Error("db down");
      return [];
    });
    const svc = new SaasVoiceCommandService(db);
    const r = await svc.executeCommand("t1", "ir a crm");
    expect(r.success).toBe(true);
    expect(r.route).toBe("/saas/crm");
  });
});
