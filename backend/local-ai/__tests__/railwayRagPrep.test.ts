import { describe, expect, it } from "vitest";
import {
  assertSchemaApplyAllowed,
  isLocalAiSchemaApplyEnabled,
  isLocalAiUseMainDbEnabled,
  resolveLocalAiDatabaseUrl,
} from "../railwayRagPrep";

describe("railwayRagPrep — fail-closed (no activation)", () => {
  it("defaults schema apply OFF", () => {
    expect(isLocalAiSchemaApplyEnabled({})).toBe(false);
    expect(isLocalAiUseMainDbEnabled({})).toBe(false);
  });

  it("rejects non-1 flags", () => {
    expect(
      isLocalAiSchemaApplyEnabled({ NELVYON_LOCAL_AI_SCHEMA_APPLY: "true" }),
    ).toBe(false);
  });

  it("prefers LOCAL_AI_DATABASE_URL when set", () => {
    const r = resolveLocalAiDatabaseUrl({
      LOCAL_AI_DATABASE_URL: "postgresql://local/ai",
      DATABASE_URL: "postgresql://main/saas",
    });
    expect(r.source).toBe("LOCAL_AI_DATABASE_URL");
    expect(r.url).toContain("local/ai");
  });

  it("does not fall back to DATABASE_URL without USE_MAIN_DB=1", () => {
    const r = resolveLocalAiDatabaseUrl({ DATABASE_URL: "postgresql://main/saas" });
    expect(r.url).toBeNull();
    expect(r.blockedReason).toMatch(/NELVYON_LOCAL_AI_USE_MAIN_DB/);
  });

  it("allows DATABASE_URL only when USE_MAIN_DB=1", () => {
    const r = resolveLocalAiDatabaseUrl({
      DATABASE_URL: "postgresql://main/saas",
      NELVYON_LOCAL_AI_USE_MAIN_DB: "1",
    });
    expect(r.source).toBe("DATABASE_URL");
    expect(r.url).toContain("main/saas");
  });

  it("assertSchemaApplyAllowed throws when flag off", () => {
    expect(() => assertSchemaApplyAllowed({})).toThrow(/BLOCKED/);
  });

  it("assertSchemaApplyAllowed passes when flag=1", () => {
    expect(() =>
      assertSchemaApplyAllowed({ NELVYON_LOCAL_AI_SCHEMA_APPLY: "1" }),
    ).not.toThrow();
  });

  it("production rejects loopback LOCAL_AI_DATABASE_URL", () => {
    const r = resolveLocalAiDatabaseUrl({
      NELVYON_DEPLOY_ENV: "production",
      LOCAL_AI_DATABASE_URL: "postgresql://nelvyon_local_app:x@127.0.0.1:5434/nelvyon_local_ai",
    });
    expect(r.url).toBeNull();
    expect(r.blockedReason).toMatch(/loopback|localhost/i);
  });

  it("production without RAG flags fails closed (no owner default)", () => {
    const r = resolveLocalAiDatabaseUrl({
      NELVYON_DEPLOY_ENV: "production",
      DATABASE_URL: "postgresql://u:p@remote:5432/saas",
    });
    expect(r.url).toBeNull();
    expect(r.blockedReason).toMatch(/USE_MAIN_DB|PRIVATE_AI_RAG_BLOCKED/);
  });
});
