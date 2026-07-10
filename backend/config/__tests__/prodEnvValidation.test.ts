import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { validateProductionEnv } from "../prodEnvValidation";

describe("validateProductionEnv", () => {
  const env = process.env;

  beforeEach(() => {
    process.env = { ...env, NODE_ENV: "production" };
  });

  afterEach(() => {
    process.env = env;
  });

  it("passes when critical vars are set", () => {
    process.env.JWT_SECRET = "a".repeat(32);
    process.env.DATABASE_URL = "postgresql://localhost/nelvyon";
    process.env.CRON_SECRET = "cron-secret-min-16";
    const r = validateProductionEnv();
    expect(r.ok).toBe(true);
    expect(r.critical).toHaveLength(0);
  });

  it("fails when JWT_SECRET is missing", () => {
    delete process.env.JWT_SECRET;
    process.env.DATABASE_URL = "postgresql://localhost/nelvyon";
    process.env.CRON_SECRET = "cron-secret-min-16";
    const r = validateProductionEnv();
    expect(r.ok).toBe(false);
    expect(r.critical).toContain("JWT_SECRET");
  });

  it("skips validation outside production", () => {
    process.env.NODE_ENV = "development";
    delete process.env.JWT_SECRET;
    const r = validateProductionEnv();
    expect(r.ok).toBe(true);
  });
});
