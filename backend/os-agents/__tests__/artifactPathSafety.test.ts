import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  assertSafeArtifactSegment,
  resolveArtifactZipPath,
} from "../artifacts/artifactPublisher";

describe("resolveArtifactZipPath containment", () => {
  it("rejects path traversal in jobId", () => {
    expect(() => resolveArtifactZipPath("tenant-1", "../other", "saas-dashboard-report")).toThrow(/Invalid jobId/);
    expect(() => resolveArtifactZipPath("tenant-1", "a/b", "saas-dashboard-report")).toThrow(/Invalid jobId/);
  });

  it("rejects traversal in clientId", () => {
    expect(() => resolveArtifactZipPath("..", "job-1", "saas-dashboard-report")).toThrow(/Invalid clientId/);
  });

  it("resolves under tenant root for safe ids", () => {
    const p = resolveArtifactZipPath("tenant_abc", "report-1", "saas-dashboard-report");
    expect(p.replace(/\\/g, "/")).toMatch(/tenant_abc\/report-1\/bundle\.zip$/);
    expect(path.isAbsolute(p)).toBe(true);
  });

  it("assertSafeArtifactSegment allows uuid-like ids", () => {
    expect(assertSafeArtifactSegment("550e8400-e29b-41d4-a716-446655440000", "id")).toContain("550e8400");
  });
});
