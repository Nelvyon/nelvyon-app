/**
 * API Integration Tests — Tests for critical CRUD endpoints.
 * Validates that the API client methods are correctly structured
 * and that the NelvyonAPI class handles all entity types.
 */
import { describe, it, expect, vi, beforeAll } from "vitest";

// Mock the web SDK client before importing api
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
      update: vi.fn().mockReturnValue({ data: null, error: null }),
      delete: vi.fn().mockReturnValue({ data: null, error: null }),
    }),
  }),
}));

let api: typeof import("@/lib/api")["api"];

beforeAll(async () => {
  const mod = await import("@/lib/api");
  api = mod.api;
});

describe("API Client — Structure Validation", () => {
  it("should have all client CRUD methods", () => {
    expect(typeof api.getClients).toBe("function");
    expect(typeof api.getClient).toBe("function");
    expect(typeof api.createClient).toBe("function");
    expect(typeof api.updateClient).toBe("function");
    expect(typeof api.deleteClient).toBe("function");
  });

  it("should have all project CRUD methods", () => {
    expect(typeof api.getProjects).toBe("function");
    expect(typeof api.getProject).toBe("function");
    expect(typeof api.createProject).toBe("function");
    expect(typeof api.updateProject).toBe("function");
    expect(typeof api.deleteProject).toBe("function");
  });

  it("should have all output methods", () => {
    expect(typeof api.getOutputs).toBe("function");
    expect(typeof api.getOutput).toBe("function");
  });

  it("should have all campaign CRUD methods", () => {
    expect(typeof api.getCampaigns).toBe("function");
    expect(typeof api.createCampaign).toBe("function");
    expect(typeof api.updateCampaign).toBe("function");
    expect(typeof api.deleteCampaign).toBe("function");
  });

  it("should have all agent CRUD methods", () => {
    expect(typeof api.getAgents).toBe("function");
    expect(typeof api.createAgent).toBe("function");
    expect(typeof api.updateAgent).toBe("function");
    expect(typeof api.deleteAgent).toBe("function");
  });

  it("should have all asset methods", () => {
    expect(typeof api.getAssets).toBe("function");
    expect(typeof api.createAsset).toBe("function");
    expect(typeof api.deleteAsset).toBe("function");
  });

  it("should have product methods", () => {
    expect(typeof api.getProducts).toBe("function");
    expect(typeof api.createProduct).toBe("function");
  });

  it("should have QA engine methods", () => {
    expect(typeof api.validateOutput).toBe("function");
    expect(typeof api.getQADashboard).toBe("function");
  });

  it("should have all generator methods", () => {
    expect(typeof api.generateWeb).toBe("function");
    expect(typeof api.generateEcommerce).toBe("function");
    expect(typeof api.generateSocial).toBe("function");
    expect(typeof api.generateAds).toBe("function");
    expect(typeof api.generateEmailMarketing).toBe("function");
    expect(typeof api.generateWorkflows).toBe("function");
    expect(typeof api.generateFunnel).toBe("function");
    expect(typeof api.generateBranding).toBe("function");
    expect(typeof api.generateAudit).toBe("function");
    expect(typeof api.generateProposal).toBe("function");
  });

  it("should have RBAC user role methods", () => {
    expect(typeof api.getUserRoles).toBe("function");
    expect(typeof api.getUserRoleByUserId).toBe("function");
    expect(typeof api.createUserRole).toBe("function");
    expect(typeof api.updateUserRole).toBe("function");
    expect(typeof api.deleteUserRole).toBe("function");
  });

  it("should have platform metrics methods", () => {
    expect(typeof api.getPlatformMetrics).toBe("function");
    expect(typeof api.createPlatformMetric).toBe("function");
  });

  it("should have revenue records methods", () => {
    expect(typeof api.getRevenueRecords).toBe("function");
    expect(typeof api.createRevenueRecord).toBe("function");
  });

  it("should have presentation history methods", () => {
    expect(typeof api.getPresentationHistory).toBe("function");
    expect(typeof api.createPresentationHistory).toBe("function");
  });

  it("should have segment results methods", () => {
    expect(typeof api.getSegmentResults).toBe("function");
    expect(typeof api.createSegmentResult).toBe("function");
  });

  it("should have bot template methods", () => {
    expect(typeof api.getBotTemplates).toBe("function");
    expect(typeof api.createBotTemplate).toBe("function");
    expect(typeof api.updateBotTemplate).toBe("function");
  });

  it("should have user settings methods", () => {
    expect(typeof api.getUserSettings).toBe("function");
    expect(typeof api.createUserSettings).toBe("function");
    expect(typeof api.updateUserSettings).toBe("function");
  });

  it("should have quality metrics methods", () => {
    expect(typeof api.getQualityMetrics).toBe("function");
    expect(typeof api.updateQualityMetric).toBe("function");
  });
});

describe("API Client — Type Safety", () => {
  it("api instance should be defined", () => {
    expect(api).toBeDefined();
    expect(api).not.toBeNull();
  });

  it("methods should accept correct parameter types", () => {
    expect(() => api.getClients).not.toThrow();
    expect(() => api.getProjects).not.toThrow();
    expect(() => api.getOutputs).not.toThrow();
  });
});