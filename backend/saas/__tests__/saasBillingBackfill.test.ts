import { describe, expect, it } from "vitest";

import type { SaasBillingSyncBatchReport } from "../SaasBillingSyncService";
import {
  assertApplyAllowed,
  assertDatabaseAllowed,
  buildCliReport,
  emptySkipReasonCounts,
  looksLikeProductionDb,
  maskDatabaseUrl,
  parseMode,
  parseOutputPath,
  parseVerbose,
  parseWorkspaceId,
  summarizeSkipReasons,
  BillingBackfillCliError,
} from "../scripts/billingBackfillCli";

function sampleBatch(overrides?: Partial<SaasBillingSyncBatchReport>): SaasBillingSyncBatchReport {
  return {
    mode: "dry-run",
    executedAt: "2026-06-09T12:00:00.000Z",
    scanned: 2,
    synced: 1,
    skipped: 1,
    errors: [],
    results: [
      {
        mode: "dry-run",
        tenantId: "t-1",
        workspaceId: 10,
        ownerUserId: "u-1",
        previousPlan: "starter",
        targetPlan: "pro",
        subscriptionPlanId: "pro",
        subscriptionStatus: "active",
        synced: true,
        skipped: false,
        executedAt: "2026-06-09T12:00:00.000Z",
      },
      {
        mode: "dry-run",
        tenantId: "t-2",
        workspaceId: 11,
        ownerUserId: "u-2",
        previousPlan: "pro",
        targetPlan: "pro",
        subscriptionPlanId: "pro",
        subscriptionStatus: "active",
        synced: false,
        skipped: true,
        skipReason: "PLAN_UNCHANGED",
        executedAt: "2026-06-09T12:00:00.000Z",
      },
    ],
    ...overrides,
  };
}

describe("billingBackfillCli parsers", () => {
  it("parseMode defaults to dry-run", () => {
    expect(parseMode([])).toBe("dry-run");
    expect(parseMode(["--dry-run"])).toBe("dry-run");
  });

  it("parseMode --apply", () => {
    expect(parseMode(["--apply", "--i-understand-apply"])).toBe("apply");
  });

  it("parseWorkspaceId extracts positive integer", () => {
    expect(parseWorkspaceId(["--workspace-id=42"])).toBe(42);
  });

  it("parseWorkspaceId absent returns undefined", () => {
    expect(parseWorkspaceId(["--dry-run"])).toBeUndefined();
  });

  it("parseWorkspaceId invalid throws", () => {
    expect(() => parseWorkspaceId(["--workspace-id=0"])).toThrow(BillingBackfillCliError);
    expect(() => parseWorkspaceId(["--workspace-id=abc"])).toThrow(BillingBackfillCliError);
  });

  it("parseOutputPath extracts path", () => {
    expect(parseOutputPath(["--output=reports/backfill.json"])).toBe("reports/backfill.json");
  });

  it("parseOutputPath empty throws", () => {
    expect(() => parseOutputPath(["--output="])).toThrow(BillingBackfillCliError);
  });

  it("parseVerbose", () => {
    expect(parseVerbose([])).toBe(false);
    expect(parseVerbose(["--verbose"])).toBe(true);
  });
});

describe("billingBackfillCli guards", () => {
  it("assertApplyAllowed blocks apply without i-understand-apply", () => {
    expect(() => assertApplyAllowed("apply", ["--apply"])).toThrow(BillingBackfillCliError);
    expect(() => assertApplyAllowed("apply", ["--apply", "--i-understand-apply"])).not.toThrow();
    expect(() => assertApplyAllowed("dry-run", ["--apply"])).not.toThrow();
  });

  it("looksLikeProductionDb detects prod hints", () => {
    expect(looksLikeProductionDb("postgresql://x@aws-0.supabase.co:5432/postgres")).toBe(true);
    expect(looksLikeProductionDb("postgresql://nelvyon:nelvyon@localhost:5433/nelvyon_test")).toBe(
      false,
    );
  });

  it("maskDatabaseUrl hides password", () => {
    const masked = maskDatabaseUrl("postgresql://user:secret@localhost:5432/db");
    expect(masked).toContain("***");
    expect(masked).not.toContain("secret");
  });

  it("assertDatabaseAllowed blocks prod without override", () => {
    const prev = process.env.SAAS_BILLING_BACKFILL_ALLOW_PROD;
    delete process.env.SAAS_BILLING_BACKFILL_ALLOW_PROD;
    expect(() =>
      assertDatabaseAllowed("postgresql://postgres@foo.supabase.co:5432/postgres"),
    ).toThrow(BillingBackfillCliError);
    if (prev !== undefined) process.env.SAAS_BILLING_BACKFILL_ALLOW_PROD = prev;
  });

  it("assertDatabaseAllowed allows prod with override", () => {
    const prev = process.env.SAAS_BILLING_BACKFILL_ALLOW_PROD;
    process.env.SAAS_BILLING_BACKFILL_ALLOW_PROD = "true";
    expect(() =>
      assertDatabaseAllowed("postgresql://postgres@foo.supabase.co:5432/postgres"),
    ).not.toThrow();
    if (prev !== undefined) process.env.SAAS_BILLING_BACKFILL_ALLOW_PROD = prev;
    else delete process.env.SAAS_BILLING_BACKFILL_ALLOW_PROD;
  });

  it("assertDatabaseAllowed requires DATABASE_URL", () => {
    expect(() => assertDatabaseAllowed("")).toThrow(BillingBackfillCliError);
  });
});

describe("billingBackfillCli report", () => {
  it("emptySkipReasonCounts initializes all keys to zero", () => {
    expect(emptySkipReasonCounts()).toEqual({
      NO_TENANT: 0,
      NO_SUBSCRIPTION: 0,
      STATUS_NOT_SYNCABLE: 0,
      PLAN_UNCHANGED: 0,
      VALIDATION: 0,
    });
  });

  it("summarizeSkipReasons counts skip reasons", () => {
    const batch = sampleBatch();
    expect(summarizeSkipReasons(batch.results)).toEqual({
      NO_TENANT: 0,
      NO_SUBSCRIPTION: 0,
      STATUS_NOT_SYNCABLE: 0,
      PLAN_UNCHANGED: 1,
      VALIDATION: 0,
    });
  });

  it("buildCliReport omits results without verbose", () => {
    const report = buildCliReport(sampleBatch(), {
      scope: "global",
      databaseUrlMasked: "postgresql://user:***@localhost/db",
      verbose: false,
      generatedAt: "2026-06-09T12:00:00.000Z",
    });
    expect(report.phase).toBe("3.5-billing-backfill");
    expect(report.mode).toBe("dry-run");
    expect(report.scope).toBe("global");
    expect(report.summary.synced).toBe(1);
    expect(report.summary.skipped).toBe(1);
    expect(report.summary.bySkipReason.PLAN_UNCHANGED).toBe(1);
    expect(report.results).toBeUndefined();
  });

  it("buildCliReport includes results with verbose", () => {
    const report = buildCliReport(sampleBatch(), {
      scope: { workspaceId: 10 },
      databaseUrlMasked: "masked",
      verbose: true,
    });
    expect(report.scope).toEqual({ workspaceId: 10 });
    expect(report.results).toHaveLength(2);
  });
});
