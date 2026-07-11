import { describe, it, expect, afterEach, beforeAll } from "vitest";
import { randomUUID } from "node:crypto";

import {
  assertUrlAllowed,
  isAllowedHost,
  isPrivateMode,
  resetPrivateModeForTests,
  PrivateModeBlockedError,
} from "../../private-ai/privateMode";
import { closeLocalAiPool, getLocalAiPool } from "../../local-ai/db";
import { getLocalMemoryStore } from "../../local-ai/LocalMemoryStore";
import { resetLocalEmbeddingProviderForTests } from "../../local-ai/LocalEmbeddingProvider";

const LOCAL_AI_URL = process.env.LOCAL_AI_DATABASE_URL;
const RUN_INTEGRATION = Boolean(LOCAL_AI_URL) || process.env.RUN_LOCAL_AI_INTEGRATION === "1";

afterEach(() => resetPrivateModeForTests());

describe("PRIVATE_MODE allowlist", () => {
  it("blocks public Internet hosts", () => {
    expect(() => assertUrlAllowed("https://api.openai.com/v1/chat/completions", "external_fetch")).toThrow(
      PrivateModeBlockedError,
    );
  });

  it("allows localhost Ollama", () => {
    expect(() => assertUrlAllowed("http://127.0.0.1:11434/api/tags", "external_fetch")).not.toThrow();
  });

  it("allows Docker private network hosts", () => {
    expect(isAllowedHost("10.0.0.5")).toBe(true);
    expect(isAllowedHost("172.18.0.2")).toBe(true);
    expect(isAllowedHost("192.168.1.10")).toBe(true);
  });

  it("allows OpenClaw local via allowlist host", () => {
    process.env.PRIVATE_MODE_ALLOWED_HOSTS = "openclaw,nelvyon-local-ai-postgres";
    expect(() => assertUrlAllowed("http://openclaw:18789/hook", "openclaw_bridge")).not.toThrow();
  });

  it("allows MCP local on localhost", () => {
    expect(() => assertUrlAllowed("http://localhost:3001/mcp", "mcp_local")).not.toThrow();
  });

  it("defaults PRIVATE_MODE ON", () => {
    expect(isPrivateMode()).toBe(true);
  });
});

describe.skipIf(!RUN_INTEGRATION)("Local AI tenant isolation (PostgreSQL + pgvector)", () => {
  beforeAll(async () => {
    await getLocalAiPool().query("SELECT 1");
  });

  afterEach(async () => {
    resetLocalEmbeddingProviderForTests();
    await closeLocalAiPool();
  });

  it("tenant A cannot read tenant B memory via RLS session", async () => {
    const tenantA = randomUUID();
    const tenantB = randomUUID();
    const store = getLocalMemoryStore();

    // Mock embedder for integration without Ollama
    const { getLocalEmbeddingProvider } = await import("../../local-ai/LocalEmbeddingProvider");
    const embedder = getLocalEmbeddingProvider();
    embedder.embed = async (text: string) => ({
      vector: Array.from({ length: 768 }, (_, i) => (text.charCodeAt(0) + i) * 0.001),
      model: "test",
      dim: 768,
    });

    await store.write({
      tenantId: tenantB,
      sourceId: "secret-doc",
      content: "Tenant B confidential knowledge",
    });

    const leak = await store.searchRawCrossTenant(tenantA, tenantB, "confidential");
    expect(leak).toHaveLength(0);

    const own = await store.search(tenantB, "confidential", 3);
    expect(own.length).toBeGreaterThan(0);
    expect(own[0]!.tenantId).toBe(tenantB);
  });

  it("tenant A cannot read tenant B RAG documents or chunks via RLS", async () => {
    const tenantA = randomUUID();
    const tenantB = randomUUID();
    const { getLocalEmbeddingProvider } = await import("../../local-ai/LocalEmbeddingProvider");
    const embedder = getLocalEmbeddingProvider();
    embedder.embed = async (text: string) => ({
      vector: Array.from({ length: 768 }, (_, i) => (text.charCodeAt(0) + i) * 0.001),
      model: "test",
      dim: 768,
    });

    const { withTenantClient, vectorLiteral, sha256 } = await import("../../local-ai/db");

    await withTenantClient(tenantB, async (client) => {
      const doc = await client.query<{ id: string }>(
        `INSERT INTO local_ai_rag_documents (tenant_id, source_id, title, checksum)
         VALUES ($1, 'doc-b', 'Secret B', $2) RETURNING id`,
        [tenantB, sha256("doc-b")],
      );
      const docId = doc.rows[0]!.id;
      const emb = await embedder.embed("chunk secret B");
      await client.query(
        `INSERT INTO local_ai_rag_chunks (tenant_id, document_id, source_id, chunk_index, content, embedding, checksum)
         VALUES ($1, $2, 'doc-b', 0, 'Tenant B secret chunk', $3::vector, $4)`,
        [tenantB, docId, vectorLiteral(emb.vector), sha256("chunk secret B")],
      );
    });

    await withTenantClient(tenantA, async (client) => {
      const docs = await client.query(`SELECT id FROM local_ai_rag_documents WHERE tenant_id = $1`, [tenantB]);
      expect(docs.rows).toHaveLength(0);
      const chunks = await client.query(`SELECT id FROM local_ai_rag_chunks WHERE tenant_id = $1`, [tenantB]);
      expect(chunks.rows).toHaveLength(0);
    });

    await withTenantClient(tenantB, async (client) => {
      const docs = await client.query(`SELECT id FROM local_ai_rag_documents WHERE tenant_id = $1`, [tenantB]);
      expect(docs.rows.length).toBeGreaterThan(0);
    });
  });
});
