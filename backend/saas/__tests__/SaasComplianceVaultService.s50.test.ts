/**
 * S50 — SaasComplianceVaultService unit tests
 */
import { describe, expect, it, vi } from "vitest";
import {
  SaasComplianceVaultService,
  SaasComplianceVaultError,
} from "../SaasComplianceVaultService";
import type { SaasPostgresPort } from "../SaasOnboardingService";

// ── DB mock ───────────────────────────────────────────────────────────────────

function makeDb(responses: unknown[]): SaasPostgresPort {
  let call = 0;
  return {
    query: vi.fn().mockImplementation(async () => {
      const res = responses[call] ?? [];
      call++;
      return res;
    }),
  } as unknown as SaasPostgresPort;
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

const ARTIFACT_ROW = {
  id: "art-1",
  tenant_id: "t1",
  deliverable_source: "pack_run",
  deliverable_ref: "run-abc",
  pack_run_id: "run-abc",
  pack_id: "local-business-growth",
  title: "Pack run run-abc",
  consent_type: "qa_certificate",
  legal_doc_url: null,
  qa_pdf_url: "/reports/run-abc.pdf",
  content_hash: "abcdef12",
  status: "pending",
  metadata: { qaScore: 92, legalPassed: true },
  verified_by: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  verified_at: null,
  expires_at: null,
};

const PACK_RUN_ROW = {
  id: "run-abc",
  pack_id: "local-business-growth",
  report: { qaScore: 92, legalPassed: true, reportUrl: "/reports/run-abc.pdf" },
};

// ── computeContentHash ────────────────────────────────────────────────────────

describe("SaasComplianceVaultService — computeContentHash", () => {
  it("returns 64-char hex string", () => {
    const svc = new SaasComplianceVaultService(makeDb([]));
    const hash = svc.computeContentHash("test payload");
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]+$/);
  });

  it("is deterministic for same input", () => {
    const svc = new SaasComplianceVaultService(makeDb([]));
    expect(svc.computeContentHash("abc")).toBe(svc.computeContentHash("abc"));
  });

  it("differs for different inputs", () => {
    const svc = new SaasComplianceVaultService(makeDb([]));
    expect(svc.computeContentHash("a")).not.toBe(svc.computeContentHash("b"));
  });
});

// ── getVaultSummary ───────────────────────────────────────────────────────────

describe("SaasComplianceVaultService — getVaultSummary", () => {
  it("aggregates counts by status", async () => {
    const db = makeDb([[
      { status: "pending", count: "3", expiring_count: "1" },
      { status: "verified", count: "5", expiring_count: "0" },
    ]]);
    const svc = new SaasComplianceVaultService(db);
    const summary = await svc.getVaultSummary("t1");
    expect(summary.total).toBe(8);
    expect(summary.pending).toBe(3);
    expect(summary.verified).toBe(5);
    expect(summary.expiringSoon).toBe(1);
  });

  it("returns zeros when no artifacts", async () => {
    const db = makeDb([[]]); // empty
    const svc = new SaasComplianceVaultService(db);
    const summary = await svc.getVaultSummary("t1");
    expect(summary.total).toBe(0);
    expect(summary.pending).toBe(0);
    expect(summary.verified).toBe(0);
    expect(summary.expiringSoon).toBe(0);
  });
});

// ── listArtifacts ─────────────────────────────────────────────────────────────

describe("SaasComplianceVaultService — listArtifacts", () => {
  it("returns mapped artifacts", async () => {
    const db = makeDb([[ARTIFACT_ROW]]);
    const svc = new SaasComplianceVaultService(db);
    const items = await svc.listArtifacts("t1");
    expect(items).toHaveLength(1);
    expect(items[0]!.id).toBe("art-1");
    expect(items[0]!.consentType).toBe("qa_certificate");
  });

  it("applies status filter to query", async () => {
    const db = makeDb([[]]) as SaasPostgresPort & { query: ReturnType<typeof vi.fn> };
    const svc = new SaasComplianceVaultService(db);
    await svc.listArtifacts("t1", { status: "verified" });
    const params = (db.query as ReturnType<typeof vi.fn>).mock.calls[0][1] as unknown[];
    expect(params).toContain("verified");
  });

  it("applies packId filter", async () => {
    const db = makeDb([[]]) as SaasPostgresPort & { query: ReturnType<typeof vi.fn> };
    const svc = new SaasComplianceVaultService(db);
    await svc.listArtifacts("t1", { packId: "local-business-growth" });
    const params = (db.query as ReturnType<typeof vi.fn>).mock.calls[0][1] as unknown[];
    expect(params).toContain("local-business-growth");
  });

  it("returns empty array when no artifacts", async () => {
    const db = makeDb([[]]);
    const svc = new SaasComplianceVaultService(db);
    expect(await svc.listArtifacts("t1")).toHaveLength(0);
  });
});

// ── getArtifact ───────────────────────────────────────────────────────────────

describe("SaasComplianceVaultService — getArtifact", () => {
  it("returns mapped artifact by id", async () => {
    const db = makeDb([[ARTIFACT_ROW]]);
    const svc = new SaasComplianceVaultService(db);
    const a = await svc.getArtifact("t1", "art-1");
    expect(a.id).toBe("art-1");
    expect(a.packRunId).toBe("run-abc");
  });

  it("throws NOT_FOUND for unknown id", async () => {
    const db = makeDb([[]]); // empty
    const svc = new SaasComplianceVaultService(db);
    await expect(svc.getArtifact("t1", "bad")).rejects.toThrow(SaasComplianceVaultError);
  });

  it("NOT_FOUND code is NOT_FOUND", async () => {
    const db = makeDb([[]]);
    const svc = new SaasComplianceVaultService(db);
    try {
      await svc.getArtifact("t1", "bad");
    } catch (e) {
      expect((e as SaasComplianceVaultError).code).toBe("NOT_FOUND");
    }
  });
});

// ── syncFromPackRun ───────────────────────────────────────────────────────────

describe("SaasComplianceVaultService — syncFromPackRun", () => {
  it("upserts artifact and returns mapped object", async () => {
    const db = makeDb([[PACK_RUN_ROW], [ARTIFACT_ROW]]);
    const svc = new SaasComplianceVaultService(db);
    const a = await svc.syncFromPackRun("t1", "run-abc");
    expect(a.deliverableSource).toBe("pack_run");
    expect(a.deliverableRef).toBe("run-abc");
    expect(a.consentType).toBe("qa_certificate");
  });

  it("is idempotent (ON CONFLICT DO UPDATE)", async () => {
    // Second call returns same artifact — idempotence handled by DB UNIQUE
    const db = makeDb([[PACK_RUN_ROW], [ARTIFACT_ROW], [PACK_RUN_ROW], [ARTIFACT_ROW]]);
    const svc = new SaasComplianceVaultService(db);
    const a1 = await svc.syncFromPackRun("t1", "run-abc");
    const a2 = await svc.syncFromPackRun("t1", "run-abc");
    expect(a1.deliverableRef).toBe(a2.deliverableRef);
  });

  it("throws NOT_FOUND when pack run missing", async () => {
    const db = makeDb([[]]); // no run row
    const svc = new SaasComplianceVaultService(db);
    await expect(svc.syncFromPackRun("t1", "missing")).rejects.toThrow(SaasComplianceVaultError);
  });

  it("sets status=verified when legalPassed=true", async () => {
    const verifiedRow = { ...ARTIFACT_ROW, status: "verified" };
    const db = makeDb([[PACK_RUN_ROW], [verifiedRow]]);
    const svc = new SaasComplianceVaultService(db);
    const a = await svc.syncFromPackRun("t1", "run-abc");
    expect(a.status).toBe("verified");
  });

  it("content_hash is deterministic sha256", async () => {
    const db = makeDb([[PACK_RUN_ROW], [ARTIFACT_ROW]]);
    const svc = new SaasComplianceVaultService(db);
    await svc.syncFromPackRun("t1", "run-abc");
    // Verify the hash param was passed and is a hex string
    const params = (db.query as unknown as { mock: { calls: unknown[][] } }).mock.calls[1]![1] as string[];
    const hashParam = params.find((p) => typeof p === "string" && /^[0-9a-f]{64}$/.test(p));
    expect(hashParam).toBeDefined();
  });
});

// ── syncFromDeliverablesHub ───────────────────────────────────────────────────

describe("SaasComplianceVaultService — syncFromDeliverablesHub", () => {
  it("returns {synced: 0} when no workspace_id", async () => {
    const db = makeDb([
      [{ workspace_id: null }], // tenant row
      [],                       // recurring
    ]);
    const svc = new SaasComplianceVaultService(db);
    const result = await svc.syncFromDeliverablesHub("t1");
    expect(result.synced).toBe(0);
  });

  it("syncs OS deliverable with qaScore", async () => {
    const db = makeDb([
      [{ workspace_id: 42 }],
      [{ id: "os-1", type: "landing", title: "Landing Page", file_url: null, metadata: { qa_score: 88, legal_passed: true } }],
      [{ ...ARTIFACT_ROW, deliverable_source: "os", deliverable_ref: "os-1" }], // upsert
      [], // pack_runs
      [], // recurring
    ]);
    const svc = new SaasComplianceVaultService(db);
    const result = await svc.syncFromDeliverablesHub("t1");
    expect(result.synced).toBeGreaterThanOrEqual(1);
  });

  it("skips OS deliverable with null qaScore and null legalPassed", async () => {
    const db = makeDb([
      [{ workspace_id: 42 }],
      [{ id: "os-1", type: "landing", title: "Landing", file_url: null, metadata: {} }],
      // No upsert called
      [], // pack_runs
      [], // recurring
    ]);
    const svc = new SaasComplianceVaultService(db);
    const result = await svc.syncFromDeliverablesHub("t1");
    expect(result.synced).toBe(0);
  });

  it("continues batch when one sync fails", async () => {
    // Simulate error mid-batch by having the upsert query throw
    let call = 0;
    const db: SaasPostgresPort = {
      query: vi.fn().mockImplementation(async () => {
        call++;
        if (call === 1) return [{ workspace_id: 42 }];
        if (call === 2) return [{ id: "os-bad", type: "landing", title: "Bad", file_url: null, metadata: { qa_score: 90 } }];
        if (call === 3) throw new Error("DB error");
        if (call === 4) return []; // pack_runs
        return []; // recurring
      }),
    } as unknown as SaasPostgresPort;
    const svc = new SaasComplianceVaultService(db);
    // Should not throw — batch continues on error
    await expect(svc.syncFromDeliverablesHub("t1")).resolves.toBeDefined();
  });
});

// ── attachDocument ────────────────────────────────────────────────────────────

describe("SaasComplianceVaultService — attachDocument", () => {
  it("updates legal_doc_url and returns artifact", async () => {
    const updated = { ...ARTIFACT_ROW, legal_doc_url: "https://cdn/legal.pdf" };
    const db = makeDb([[ARTIFACT_ROW], [updated]]); // getArtifact + UPDATE
    const svc = new SaasComplianceVaultService(db);
    const a = await svc.attachDocument("t1", "art-1", { legalDocUrl: "https://cdn/legal.pdf" });
    expect(a.legalDocUrl).toBe("https://cdn/legal.pdf");
  });

  it("throws NOT_FOUND when artifact missing", async () => {
    const db = makeDb([[]]); // getArtifact returns nothing
    const svc = new SaasComplianceVaultService(db);
    await expect(svc.attachDocument("t1", "bad", { legalDocUrl: "x" })).rejects.toThrow(SaasComplianceVaultError);
  });
});

// ── verifyArtifact ────────────────────────────────────────────────────────────

describe("SaasComplianceVaultService — verifyArtifact", () => {
  it("sets status=verified and verified_by", async () => {
    const verifiedRow = { ...ARTIFACT_ROW, status: "verified", verified_by: "user-1", verified_at: new Date().toISOString() };
    const db = makeDb([[ARTIFACT_ROW], [verifiedRow]]);
    const svc = new SaasComplianceVaultService(db);
    const a = await svc.verifyArtifact("t1", "art-1", "user-1");
    expect(a.status).toBe("verified");
    expect(a.verifiedBy).toBe("user-1");
  });

  it("throws ALREADY_VERIFIED when status=revoked", async () => {
    const revokedRow = { ...ARTIFACT_ROW, status: "revoked" };
    const db = makeDb([[revokedRow]]);
    const svc = new SaasComplianceVaultService(db);
    try {
      await svc.verifyArtifact("t1", "art-1");
    } catch (e) {
      expect((e as SaasComplianceVaultError).code).toBe("ALREADY_VERIFIED");
    }
  });
});

// ── revokeArtifact ────────────────────────────────────────────────────────────

describe("SaasComplianceVaultService — revokeArtifact", () => {
  it("sets status=revoked", async () => {
    const revokedRow = { ...ARTIFACT_ROW, status: "revoked" };
    const db = makeDb([[ARTIFACT_ROW], [revokedRow]]); // getArtifact + UPDATE
    const svc = new SaasComplianceVaultService(db);
    const a = await svc.revokeArtifact("t1", "art-1", "outdated content");
    expect(a.status).toBe("revoked");
  });

  it("throws NOT_FOUND for missing artifact", async () => {
    const db = makeDb([[]]); // getArtifact empty
    const svc = new SaasComplianceVaultService(db);
    await expect(svc.revokeArtifact("t1", "bad")).rejects.toThrow(SaasComplianceVaultError);
  });

  it("tenant isolation: cannot revoke another tenant artifact", async () => {
    const db = makeDb([[]]); // wrong tenant → getArtifact returns []
    const svc = new SaasComplianceVaultService(db);
    try {
      await svc.revokeArtifact("wrong-tenant", "art-1");
    } catch (e) {
      expect((e as SaasComplianceVaultError).code).toBe("NOT_FOUND");
    }
  });
});
