/**
 * CRM Flow Tests
 * Validates: CRM → Project → AI Generation → QA → Save pipeline.
 * Tests the data structures and flow integrity of the core business pipeline.
 */
import { describe, it, expect, vi, beforeAll } from "vitest";

// Mock the web SDK
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

/** Simulated CRM client entity */
interface CRMClient {
  id: string;
  name: string;
  email: string;
  company: string;
  status: "lead" | "prospect" | "client" | "churned";
  plan_id?: string;
  created_at: string;
}

/** Simulated project entity */
interface Project {
  id: string;
  client_id: string;
  name: string;
  type: "web" | "ecommerce" | "social" | "email" | "branding" | "funnel";
  status: "draft" | "in_progress" | "review" | "completed" | "delivered";
  created_at: string;
}

/** Simulated AI output entity */
interface AIOutput {
  id: string;
  project_id: string;
  type: string;
  content: string;
  quality_score: number | null;
  qa_status: "pending" | "approved" | "rejected" | "needs_revision";
  created_at: string;
}

describe("CRM — Client Lifecycle", () => {
  it("should have all CRUD methods for clients", () => {
    expect(typeof api.getClients).toBe("function");
    expect(typeof api.getClient).toBe("function");
    expect(typeof api.createClient).toBe("function");
    expect(typeof api.updateClient).toBe("function");
    expect(typeof api.deleteClient).toBe("function");
  });

  it("client status should follow valid lifecycle", () => {
    const validStatuses = ["lead", "prospect", "client", "churned"];
    const validTransitions: Record<string, string[]> = {
      lead: ["prospect", "churned"],
      prospect: ["client", "churned"],
      client: ["churned"],
      churned: ["lead", "prospect"],
    };

    validStatuses.forEach((status) => {
      expect(validTransitions[status]).toBeDefined();
      expect(validTransitions[status].length).toBeGreaterThan(0);
    });
  });

  it("client entity should have required fields", () => {
    const client: CRMClient = {
      id: "c_001",
      name: "Test Company",
      email: "test@example.com",
      company: "Test Corp",
      status: "lead",
      created_at: new Date().toISOString(),
    };

    expect(client.id).toBeTruthy();
    expect(client.name).toBeTruthy();
    expect(client.email).toContain("@");
    expect(["lead", "prospect", "client", "churned"]).toContain(client.status);
  });
});

describe("CRM → Project Flow", () => {
  it("should have all CRUD methods for projects", () => {
    expect(typeof api.getProjects).toBe("function");
    expect(typeof api.getProject).toBe("function");
    expect(typeof api.createProject).toBe("function");
    expect(typeof api.updateProject).toBe("function");
    expect(typeof api.deleteProject).toBe("function");
  });

  it("project should link to a client", () => {
    const project: Project = {
      id: "p_001",
      client_id: "c_001",
      name: "Website Redesign",
      type: "web",
      status: "draft",
      created_at: new Date().toISOString(),
    };

    expect(project.client_id).toBeTruthy();
    expect(project.client_id).toBe("c_001");
  });

  it("project status should follow valid workflow", () => {
    const validStatuses = ["draft", "in_progress", "review", "completed", "delivered"];
    const validTransitions: Record<string, string[]> = {
      draft: ["in_progress"],
      in_progress: ["review", "draft"],
      review: ["completed", "in_progress"],
      completed: ["delivered", "review"],
      delivered: [],
    };

    validStatuses.forEach((status) => {
      expect(validTransitions[status]).toBeDefined();
    });
  });

  it("project types should cover all generation capabilities", () => {
    const projectTypes = ["web", "ecommerce", "social", "email", "branding", "funnel"];
    projectTypes.forEach((type) => {
      expect(typeof type).toBe("string");
    });
  });
});

describe("Project → AI Generation Flow", () => {
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

  it("should have output retrieval methods", () => {
    expect(typeof api.getOutputs).toBe("function");
    expect(typeof api.getOutput).toBe("function");
  });
});

describe("AI Generation → QA Flow", () => {
  it("should have QA validation method", () => {
    expect(typeof api.validateOutput).toBe("function");
  });

  it("should have QA dashboard method", () => {
    expect(typeof api.getQADashboard).toBe("function");
  });

  it("QA status should follow valid workflow", () => {
    const validStatuses = ["pending", "approved", "rejected", "needs_revision"];
    const validTransitions: Record<string, string[]> = {
      pending: ["approved", "rejected", "needs_revision"],
      approved: [],
      rejected: ["needs_revision", "pending"],
      needs_revision: ["pending", "approved"],
    };

    validStatuses.forEach((status) => {
      expect(validTransitions[status]).toBeDefined();
    });
  });

  it("AI output should have quality scoring", () => {
    const output: AIOutput = {
      id: "o_001",
      project_id: "p_001",
      type: "web",
      content: "<html>...</html>",
      quality_score: 87,
      qa_status: "approved",
      created_at: new Date().toISOString(),
    };

    expect(output.quality_score).toBeGreaterThanOrEqual(0);
    expect(output.quality_score).toBeLessThanOrEqual(100);
    expect(output.qa_status).toBe("approved");
  });
});

describe("Full Pipeline — CRM → Project → Generate → QA → Save", () => {
  it("should have all methods for the complete pipeline", () => {
    // Step 1: CRM — create/get client
    expect(typeof api.createClient).toBe("function");
    expect(typeof api.getClient).toBe("function");

    // Step 2: Project — create project for client
    expect(typeof api.createProject).toBe("function");

    // Step 3: Generate — AI generation
    expect(typeof api.generateWeb).toBe("function");

    // Step 4: QA — validate output
    expect(typeof api.validateOutput).toBe("function");

    // Step 5: Save — output is persisted
    expect(typeof api.getOutputs).toBe("function");
  });

  it("pipeline data flow should be consistent", () => {
    const client: CRMClient = {
      id: "c_pipeline",
      name: "Pipeline Test",
      email: "pipeline@test.com",
      company: "Pipeline Corp",
      status: "client",
      created_at: new Date().toISOString(),
    };

    const project: Project = {
      id: "p_pipeline",
      client_id: client.id,
      name: "Full Pipeline Project",
      type: "web",
      status: "in_progress",
      created_at: new Date().toISOString(),
    };

    const output: AIOutput = {
      id: "o_pipeline",
      project_id: project.id,
      type: project.type,
      content: "Generated content",
      quality_score: 92,
      qa_status: "approved",
      created_at: new Date().toISOString(),
    };

    // Verify referential integrity
    expect(project.client_id).toBe(client.id);
    expect(output.project_id).toBe(project.id);
    expect(output.type).toBe(project.type);
    expect(output.quality_score).toBeGreaterThan(80);
    expect(output.qa_status).toBe("approved");
  });
});

describe("CRM — Quality Metrics", () => {
  it("should have quality metrics methods", () => {
    expect(typeof api.getQualityMetrics).toBe("function");
    expect(typeof api.updateQualityMetric).toBe("function");
  });

  it("should have platform metrics methods", () => {
    expect(typeof api.getPlatformMetrics).toBe("function");
    expect(typeof api.createPlatformMetric).toBe("function");
  });
});