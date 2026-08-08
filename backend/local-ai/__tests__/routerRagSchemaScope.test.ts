import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Alcance del fail-closed del esquema RAG.
 *
 * `executeTask` ejecutaba SIEMPRE `assertLocalAiRagSchemaPresent`, una consulta
 * real a `pg_tables`, incluso para tareas que la política de routing marca como
 * sin retrieval. Eso convertía el esquema RAG en requisito de funcionalidades de
 * texto que no lo necesitan (chat, copy, social).
 *
 * Ahora es condicional. Lo que NO cambia, y este test lo protege:
 * `assertLocalAiDatabaseUrlReady` (ADR-069, guard anti-loopback en producción)
 * sigue siendo incondicional en todos los caminos.
 */
const { urlReadyMock, schemaMock, chatMock } = vi.hoisted(() => ({
  urlReadyMock: vi.fn(() => "postgres://nelvyon:x@db.internal:5432/localai"),
  schemaMock: vi.fn(async () => undefined),
  chatMock: vi.fn(async () => ({
    content: "respuesta",
    model: "llama3.2:3b-instruct-q4_K_M",
    evalCount: 5,
    promptEvalCount: 5,
  })),
}));

vi.mock("../railwayRagPrep", async () => {
  const actual = await vi.importActual<typeof import("../railwayRagPrep")>("../railwayRagPrep");
  return {
    ...actual,
    assertLocalAiDatabaseUrlReady: urlReadyMock,
    assertLocalAiRagSchemaPresent: schemaMock,
  };
});

vi.mock("../OllamaClient", () => ({
  getOllamaClient: () => ({ chat: chatMock, isModelAvailable: async () => true }),
}));

import { executeTask, resetLocalModelRouterForTests } from "../router/LocalModelRouter";
import { planRag } from "../router/RoutingPolicy";
import { classifyTask } from "../router/TaskClassifier";
import { resetExecutionLimiterForTests } from "../router/ExecutionLimiter";
import { resetInferenceGateForTests } from "../router/InferenceGate";
import { resetRouterQueueForTests } from "../router/RouterQueue";

const TENANT = "8f873b4e-a1d0-4009-9e29-9ad978bea0f9";

beforeEach(() => {
  process.env.OLLAMA_MODEL = "llama3.2:3b-instruct-q4_K_M";
  urlReadyMock.mockClear();
  schemaMock.mockClear();
  chatMock.mockClear();
  resetLocalModelRouterForTests();
  resetRouterQueueForTests();
  resetInferenceGateForTests();
  resetExecutionLimiterForTests();
});

describe("política de RAG", () => {
  it("una tarea simple no habilita retrieval", () => {
    expect(classifyTask({ tenantId: TENANT, query: "Hola" })).toBe("simple");
    expect(planRag("simple", false).enabled).toBe(false);
  });
});

describe("alcance del guard de esquema RAG", () => {
  it("ADR-069 se comprueba SIEMPRE, incluso en tarea simple sin retrieval", async () => {
    await executeTask({ tenantId: TENANT, query: "Hola" });
    expect(urlReadyMock).toHaveBeenCalled();
  });

  it("tarea simple sin retrieval NO exige el esquema RAG", async () => {
    await executeTask({ tenantId: TENANT, query: "Hola" });
    expect(schemaMock).not.toHaveBeenCalled();
  });

  it("tarea simple funciona aunque el esquema RAG no esté aplicado", async () => {
    schemaMock.mockRejectedValue(
      new Error("PRIVATE_AI_RAG_BLOCKED: missing RAG schema tables (local_ai_documents)"),
    );

    const res = await executeTask({ tenantId: TENANT, query: "Hola" });

    // No se consultó el esquema, así que su ausencia no bloquea la tarea.
    expect(schemaMock).not.toHaveBeenCalled();
    expect(res.content).toBeTruthy();
  });

  it("tarea con retrieval SÍ exige el esquema y falla sin él", async () => {
    schemaMock.mockRejectedValue(
      new Error("PRIVATE_AI_RAG_BLOCKED: missing RAG schema tables (local_ai_documents)"),
    );

    const res = await executeTask({
      tenantId: TENANT,
      query: "Según el corpus, ¿cómo funciona el billing?",
      domain: "saas",
      hints: { requireCitations: true },
    });

    // Lo esencial: el guard SÍ se evaluó para una tarea con retrieval...
    expect(schemaMock).toHaveBeenCalled();
    // ...y su fallo impidió completar la tarea (executeTask no relanza: convierte
    // el error en un resultado fallido, así que se comprueba el estado).
    expect(res.status).not.toBe("completed");
  });
});
