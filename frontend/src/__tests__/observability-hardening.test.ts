/**
 * Observability & Hardening Tests
 * Tests: rate limiting, input validation, error logging, metric recording.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { recordMetric, isRateLimited, getHealthSummary, resetMetrics, recordPageView } from "@/lib/observability";

// Mock the web SDK before importing api-middleware
vi.mock("@metagptx/web-sdk", () => ({
  createClient: () => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      signInWithOAuth: vi.fn(),
      signOut: vi.fn(),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({ data: [], error: null }),
      insert: vi.fn().mockReturnValue({ data: null, error: null }),
    }),
  }),
}));

import { validateInput, logError, getRecentErrors } from "@/lib/api-middleware";

describe("Observability — Metric Recording", () => {
  beforeEach(() => {
    resetMetrics();
  });

  it("should record API call metrics", () => {
    recordMetric({ endpoint: "/api/clients", module: "crm", latencyMs: 120, status: "success" });
    recordMetric({ endpoint: "/api/clients", module: "crm", latencyMs: 80, status: "success" });
    recordMetric({ endpoint: "/api/clients", module: "crm", latencyMs: 500, status: "error" });

    const summary = getHealthSummary(60);
    expect(summary.totalRequests).toBe(3);
    expect(summary.successRate).toBeCloseTo(66.67, 0);
    expect(summary.avgLatencyMs).toBeGreaterThan(0);
  });

  it("should track AI calls separately", () => {
    recordMetric({ endpoint: "/api/generate-web", module: "generator", latencyMs: 2000, status: "success", isAI: true });
    recordMetric({ endpoint: "/api/generate-social", module: "generator", latencyMs: 1500, status: "success", isAI: true });
    recordMetric({ endpoint: "/api/clients", module: "crm", latencyMs: 100, status: "success" });

    const summary = getHealthSummary(60);
    expect(summary.aiCalls.total).toBe(2);
    expect(summary.aiCalls.success).toBe(2);
    expect(summary.aiCalls.avgLatencyMs).toBe(1750);
  });

  it("should track errors by endpoint", () => {
    recordMetric({ endpoint: "/api/generate-web", module: "generator", latencyMs: 5000, status: "error" });
    recordMetric({ endpoint: "/api/generate-web", module: "generator", latencyMs: 3000, status: "error" });
    recordMetric({ endpoint: "/api/clients", module: "crm", latencyMs: 100, status: "error" });

    const summary = getHealthSummary(60);
    expect(summary.errorsByEndpoint["/api/generate-web"]).toBe(2);
    expect(summary.errorsByEndpoint["/api/clients"]).toBe(1);
  });

  it("should calculate P95 latency", () => {
    for (let i = 0; i < 100; i++) {
      recordMetric({ endpoint: "/api/test", module: "test", latencyMs: 100 + i, status: "success" });
    }
    const summary = getHealthSummary(60);
    expect(summary.p95LatencyMs).toBeGreaterThanOrEqual(195);
  });

  it("should record page views", () => {
    recordPageView("crm");
    recordPageView("crm");
    recordPageView("dashboard");

    const summary = getHealthSummary(60);
    const crmModule = summary.moduleUsage.find(m => m.module === "crm");
    expect(crmModule?.views).toBe(2);
  });

  it("should track uptime", () => {
    const summary = getHealthSummary(60);
    expect(summary.uptimeMinutes).toBeGreaterThanOrEqual(0);
  });
});

describe("Rate Limiting", () => {
  beforeEach(() => {
    resetMetrics();
  });

  it("should allow requests within limit", () => {
    for (let i = 0; i < 5; i++) {
      expect(isRateLimited("test-key", 10, 60_000)).toBe(false);
    }
  });

  it("should block requests exceeding limit", () => {
    for (let i = 0; i < 10; i++) {
      isRateLimited("block-test", 5, 60_000);
    }
    expect(isRateLimited("block-test", 5, 60_000)).toBe(true);
  });

  it("should use separate windows per key", () => {
    for (let i = 0; i < 10; i++) {
      isRateLimited("key-a", 5, 60_000);
    }
    expect(isRateLimited("key-a", 5, 60_000)).toBe(true);
    expect(isRateLimited("key-b", 5, 60_000)).toBe(false);
  });
});

describe("Input Validation", () => {
  it("should validate required fields for clients", () => {
    const result = validateInput("nelvyon_clients", { business_name: "", sector: "" });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
  });

  it("should pass validation with valid client data", () => {
    const result = validateInput("nelvyon_clients", { business_name: "Acme Corp", sector: "Tech" });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should reject oversized string fields", () => {
    const longString = "x".repeat(15_000);
    const result = validateInput("nelvyon_clients", { business_name: longString, sector: "Tech" });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes("límite"))).toBe(true);
  });

  it("should reject script injection attempts", () => {
    const result = validateInput("nelvyon_clients", {
      business_name: '<script>alert("xss")</script>',
      sector: "Tech",
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes("peligroso") || e.includes("no permitido"))).toBe(true);
  });

  it("should validate required fields for projects", () => {
    const result = validateInput("nelvyon_projects", { name: "", project_type: "" });
    expect(result.valid).toBe(false);
  });

  it("should validate required fields for user roles", () => {
    const result = validateInput("user_roles", { role: "" });
    expect(result.valid).toBe(false);
  });

  it("should pass for unknown entity types", () => {
    const result = validateInput("unknown_entity", { anything: "goes" });
    expect(result.valid).toBe(true);
  });
});

describe("Error Logging", () => {
  it("should log errors with context", () => {
    logError({
      module: "crm",
      endpoint: "/api/clients",
      timestamp: Date.now(),
      error: "Network timeout",
      statusCode: 408,
    });

    const errors = getRecentErrors(10);
    expect(errors.length).toBeGreaterThanOrEqual(1);
    const last = errors[errors.length - 1];
    expect(last.module).toBe("crm");
    expect(last.error).toBe("Network timeout");
    expect(last.statusCode).toBe(408);
  });

  it("should limit error log size", () => {
    for (let i = 0; i < 600; i++) {
      logError({
        module: "test",
        endpoint: "/api/test",
        timestamp: Date.now(),
        error: `Error ${i}`,
      });
    }
    const errors = getRecentErrors(1000);
    expect(errors.length).toBeLessThanOrEqual(500);
  });
});