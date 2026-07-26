import { describe, expect, it } from "vitest";
import {
  evaluateProdMigrateGate,
  readProdMigrateApproval,
  resolveDeployEnvironment,
} from "../prodMigrateGate";

describe("prodMigrateGate — environment resolution", () => {
  it("treats railway staging as non-production", () => {
    expect(resolveDeployEnvironment({ RAILWAY_ENVIRONMENT_NAME: "staging" })).toEqual({
      isProduction: false,
      label: "staging",
    });
  });

  it("treats railway production as production", () => {
    expect(resolveDeployEnvironment({ RAILWAY_ENVIRONMENT_NAME: "production" }).isProduction).toBe(
      true,
    );
  });

  it("allows NELVYON_DEPLOY_ENV to force staging even if NODE_ENV=production", () => {
    expect(
      resolveDeployEnvironment({
        NODE_ENV: "production",
        NELVYON_DEPLOY_ENV: "staging",
      }),
    ).toEqual({ isProduction: false, label: "staging" });
  });

  it("fail-closes NODE_ENV=production without explicit non-prod label", () => {
    expect(resolveDeployEnvironment({ NODE_ENV: "production" }).isProduction).toBe(true);
  });
});

describe("prodMigrateGate — low-level migrate.ts must share gate semantics", () => {
  it("blocks production apply when pending>0 without approval (pnpm migrate bypass)", () => {
    const decision = evaluateProdMigrateGate({
      isProduction: true,
      approval: readProdMigrateApproval({}),
      pendingCount: 2,
    });
    expect(decision.allowApply).toBe(false);
    expect(decision.exitCode).toBe(1);
  });

  it("allows non-production apply without approval (staging/local migrate.ts)", () => {
    const decision = evaluateProdMigrateGate({
      isProduction: false,
      approval: readProdMigrateApproval({}),
      pendingCount: 2,
    });
    expect(decision.allowApply).toBe(true);
    expect(decision.exitCode).toBe(0);
  });
});

describe("prodMigrateGate — approval", () => {
  it("rejects missing approval flag", () => {
    const a = readProdMigrateApproval({});
    expect(a.approved).toBe(false);
  });

  it("rejects approval without APPROVED_BY", () => {
    const a = readProdMigrateApproval({ NELVYON_PROD_MIGRATE_APPROVED: "1" });
    expect(a.approved).toBe(false);
  });

  it("rejects soft truthy strings — only exact '1' counts (CEO policy 2026-07-26)", () => {
    for (const flag of ["true", "yes", "YES", "approved", "True", "0", "2", ""]) {
      const a = readProdMigrateApproval({
        NELVYON_PROD_MIGRATE_APPROVED: flag,
        NELVYON_PROD_MIGRATE_APPROVED_BY: "Daniel",
      });
      expect(a.approved, `flag=${JSON.stringify(flag)}`).toBe(false);
    }
  });

  it("rejects APPROVED_BY shorter than 2 chars", () => {
    const a = readProdMigrateApproval({
      NELVYON_PROD_MIGRATE_APPROVED: "1",
      NELVYON_PROD_MIGRATE_APPROVED_BY: "D",
    });
    expect(a.approved).toBe(false);
  });

  it("accepts approval with by-name", () => {
    const a = readProdMigrateApproval({
      NELVYON_PROD_MIGRATE_APPROVED: "1",
      NELVYON_PROD_MIGRATE_APPROVED_BY: "Daniel",
    });
    expect(a.approved).toBe(true);
    expect(a.approvedBy).toBe("Daniel");
  });

  it("rejects commit pin mismatch", () => {
    const a = readProdMigrateApproval({
      NELVYON_PROD_MIGRATE_APPROVED: "1",
      NELVYON_PROD_MIGRATE_APPROVED_BY: "Daniel",
      NELVYON_PROD_MIGRATE_COMMIT_SHA: "aaaaaaaa",
      RAILWAY_GIT_COMMIT_SHA: "bbbbbbbbcccc",
    });
    expect(a.approved).toBe(false);
    expect(a.reason).toMatch(/commit pin mismatch/);
  });

  it("accepts commit pin prefix match", () => {
    const a = readProdMigrateApproval({
      NELVYON_PROD_MIGRATE_APPROVED: "1",
      NELVYON_PROD_MIGRATE_APPROVED_BY: "Daniel",
      NELVYON_PROD_MIGRATE_COMMIT_SHA: "5a36809c",
      RAILWAY_GIT_COMMIT_SHA: "5a36809cca52deadbeef",
    });
    expect(a.approved).toBe(true);
  });
});

describe("prodMigrateGate — evaluate", () => {
  const denied = readProdMigrateApproval({});
  const approved = readProdMigrateApproval({
    NELVYON_PROD_MIGRATE_APPROVED: "1",
    NELVYON_PROD_MIGRATE_APPROVED_BY: "Daniel",
  });

  it("allows apply on non-production", () => {
    const d = evaluateProdMigrateGate({
      isProduction: false,
      approval: denied,
      pendingCount: 3,
    });
    expect(d.allowApply).toBe(true);
    expect(d.exitCode).toBe(0);
  });

  it("blocks prod deploy when pending without approval", () => {
    const d = evaluateProdMigrateGate({
      isProduction: true,
      approval: denied,
      pendingCount: 2,
    });
    expect(d.allowApply).toBe(false);
    expect(d.exitCode).toBe(1);
  });

  it("no-op success on prod when nothing pending without approval", () => {
    const d = evaluateProdMigrateGate({
      isProduction: true,
      approval: denied,
      pendingCount: 0,
    });
    expect(d.allowApply).toBe(false);
    expect(d.exitCode).toBe(0);
  });

  it("allows apply on prod with approval even if pending", () => {
    const d = evaluateProdMigrateGate({
      isProduction: true,
      approval: approved,
      pendingCount: 1,
    });
    expect(d.allowApply).toBe(true);
    expect(d.exitCode).toBe(0);
  });
});
