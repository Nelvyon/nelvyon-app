import { afterEach, describe, expect, it } from "vitest";
import { getLocalAiConfig, resetLocalAiConfigForTests } from "../config";
import {
  LOCAL_AI_OWNER_DEFAULT_DATABASE_URL,
  assertLocalAiDatabaseUrlReady,
  assertLocalAiRagSchemaPresent,
  isLoopbackOrLocalDatabaseUrl,
  resolveLocalAiDatabaseUrl,
} from "../railwayRagPrep";
import {
  assertPrivateAiProdCanaryRuntimeAllowed,
  isCanaryKillSwitchEngaged,
} from "../../agency/PrivateAiCanaryPrep";

const PROD_ENV_KEYS = [
  "NELVYON_DEPLOY_ENV",
  "RAILWAY_ENVIRONMENT_NAME",
  "RAILWAY_ENVIRONMENT",
  "LOCAL_AI_DATABASE_URL",
  "DATABASE_URL",
  "NELVYON_LOCAL_AI_USE_MAIN_DB",
  "OLLAMA_HOST",
  "OLLAMA_BASE_URL",
  "NELVYON_LOCAL_AI_URL",
  "NELVYON_PRIVATE_AI_CANARY_KILL_SWITCH",
  "NELVYON_PRIVATE_AI_PROD_CANARY_ENABLED",
  "NELVYON_AI_ENABLED",
  "AUTONOMOUS_ALLOW_OPENAI",
  "OPENAI_API_KEY",
] as const;

function clearEnv(): void {
  for (const k of PROD_ENV_KEYS) delete process.env[k];
  resetLocalAiConfigForTests();
}

describe("ADR-069 — production never uses localhost RAG/DB", () => {
  afterEach(clearEnv);

  it("detects owner default and loopback hosts", () => {
    expect(isLoopbackOrLocalDatabaseUrl(LOCAL_AI_OWNER_DEFAULT_DATABASE_URL)).toBe(true);
    expect(isLoopbackOrLocalDatabaseUrl("postgresql://u:p@127.0.0.1:5432/db")).toBe(true);
    expect(isLoopbackOrLocalDatabaseUrl("postgresql://u:p@localhost:5434/db")).toBe(true);
    expect(isLoopbackOrLocalDatabaseUrl("postgresql://u:p@host.docker.internal:5434/db")).toBe(true);
    expect(isLoopbackOrLocalDatabaseUrl("postgresql://u:p@db.railway.app:5432/railway")).toBe(false);
  });

  it("production resolve refuses missing URL (no 5434 fallback)", () => {
    const r = resolveLocalAiDatabaseUrl({
      NELVYON_DEPLOY_ENV: "production",
      DATABASE_URL: "postgresql://u:p@db.railway.app:5432/railway",
    });
    expect(r.url).toBeNull();
    expect(r.blockedReason).toMatch(/PRIVATE_AI_RAG_BLOCKED|NELVYON_LOCAL_AI_USE_MAIN_DB/);
  });

  it("production getLocalAiConfig never returns 127.0.0.1:5434", () => {
    const cfg = getLocalAiConfig({
      NELVYON_DEPLOY_ENV: "production",
      DATABASE_URL: "postgresql://u:p@db.railway.app:5432/railway",
    } as NodeJS.ProcessEnv);
    expect(cfg.databaseUrl).toBe("");
    expect(cfg.databaseUrl).not.toContain("127.0.0.1");
    expect(cfg.databaseUrl).not.toContain("5434");
  });

  it("production rejects explicit LOCAL_AI_DATABASE_URL loopback", () => {
    const r = resolveLocalAiDatabaseUrl({
      NELVYON_DEPLOY_ENV: "production",
      LOCAL_AI_DATABASE_URL: LOCAL_AI_OWNER_DEFAULT_DATABASE_URL,
    });
    expect(r.url).toBeNull();
    expect(r.blockedReason).toMatch(/loopback|localhost/i);
  });

  it("production rejects Ollama loopback default", () => {
    const cfg = getLocalAiConfig({
      NELVYON_DEPLOY_ENV: "production",
      NELVYON_LOCAL_AI_USE_MAIN_DB: "1",
      DATABASE_URL: "postgresql://u:p@db.railway.app:5432/railway",
    } as NodeJS.ProcessEnv);
    expect(cfg.ollamaBaseUrl).toBe("");
  });

  it("assertLocalAiDatabaseUrlReady throws clear message in production without RAG config", () => {
    expect(() =>
      assertLocalAiDatabaseUrlReady({
        NELVYON_DEPLOY_ENV: "production",
        DATABASE_URL: "postgresql://u:p@db.railway.app:5432/railway",
      }),
    ).toThrow(/PRIVATE_AI_RAG_BLOCKED|NELVYON_LOCAL_AI_USE_MAIN_DB/);
  });

  it("allows production when USE_MAIN_DB=1 and remote DATABASE_URL", () => {
    const url = assertLocalAiDatabaseUrlReady({
      NELVYON_DEPLOY_ENV: "production",
      NELVYON_LOCAL_AI_USE_MAIN_DB: "1",
      DATABASE_URL: "postgresql://u:p@db.railway.app:5432/railway",
    });
    expect(url).toContain("db.railway.app");
  });

  it("non-prod still allows owner default for local Option C", () => {
    const cfg = getLocalAiConfig({ NELVYON_DEPLOY_ENV: "development" } as NodeJS.ProcessEnv);
    expect(cfg.databaseUrl).toBe(LOCAL_AI_OWNER_DEFAULT_DATABASE_URL);
  });
});

describe("ADR-069 — missing RAG schema fail-closed", () => {
  it("throws when required local_ai_* tables are absent", async () => {
    await expect(
      assertLocalAiRagSchemaPresent({
        query: async () => ({ rows: [{ tablename: "unrelated" }] }),
      }),
    ).rejects.toThrow(/PRIVATE_AI_RAG_BLOCKED.*missing RAG schema/);
  });

  it("passes when all required tables present", async () => {
    await expect(
      assertLocalAiRagSchemaPresent({
        query: async () => ({
          rows: [
            { tablename: "local_ai_memory" },
            { tablename: "local_ai_rag_chunks" },
            { tablename: "local_ai_rag_documents" },
            { tablename: "local_ai_audit" },
          ],
        }),
      }),
    ).resolves.toBeUndefined();
  });
});

describe("ADR-069 — kill switch keeps AI inference gated", () => {
  afterEach(clearEnv);

  it("kill switch engaged blocks canary runtime even with window flags", () => {
    process.env.NELVYON_PRIVATE_AI_CANARY_KILL_SWITCH = "1";
    expect(isCanaryKillSwitchEngaged()).toBe(true);
    expect(() =>
      assertPrivateAiProdCanaryRuntimeAllowed({
        NELVYON_DEPLOY_ENV: "production",
        NELVYON_PRIVATE_AI_PROD_CANARY_ENABLED: "1",
        NELVYON_AI_ENABLED: "1",
        NELVYON_PRIVATE_AI_CANARY_KILL_SWITCH: "1",
        AUTONOMOUS_ALLOW_OPENAI: "0",
      }),
    ).toThrow(/KILL_SWITCH/);
  });

  it("without prod canary window, runtime gate blocks production inference path", () => {
    expect(() =>
      assertPrivateAiProdCanaryRuntimeAllowed({
        NELVYON_DEPLOY_ENV: "production",
        NELVYON_AI_ENABLED: "0",
        AUTONOMOUS_ALLOW_OPENAI: "0",
      }),
    ).toThrow(/PROD_CANARY_ENABLED/);
  });
});

describe("ADR-069 — tenant isolation contract for local-AI pool GUC", () => {
  it("withTenant helpers set app.tenant_id (source contract)", async () => {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const root = path.resolve(__dirname, "..");
    const dbSrc = await fs.readFile(path.join(root, "db.ts"), "utf8");
    expect(dbSrc).toMatch(/set_config\('app\.tenant_id'/);
    expect(dbSrc).toMatch(/withTenantReadOnly/);
    expect(dbSrc).toMatch(/withTenantClient/);
    // Both read and write paths must bind tenant before user SQL.
    const setConfigCount = (dbSrc.match(/set_config\('app\.tenant_id'/g) ?? []).length;
    expect(setConfigCount).toBeGreaterThanOrEqual(2);
  });
});
