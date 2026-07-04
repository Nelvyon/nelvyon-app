import { buildMockAgentOutput } from "../../saas/nelvyonZeroCostAi";
import type { ILlmProvider, LlmCompletionRequest, LlmCompletionResult } from "../types";

/** Dev-only stub — explicit mock: true, never for production masquerading. */
export class StubProvider implements ILlmProvider {
  readonly id = "stub";
  readonly kind = "internal" as const;

  describe() {
    return { label: "Stub desarrollo (sin LLM real)" };
  }

  isConfigured(): boolean {
    return true;
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async complete(request: LlmCompletionRequest): Promise<LlmCompletionResult> {
    const system = request.messages.find((m) => m.role === "system")?.content ?? "";
    const user = [...request.messages].reverse().find((m) => m.role === "user")?.content ?? "";
    const agentHint = system.match(/agente[:\s]+([a-z0-9_-]+)/i)?.[1] ?? "ceo_supervisor";
    const text = buildMockAgentOutput(agentHint, user);
    return {
      text: `[stub dev — mock:true — sin LLM real]\n\n${text}`,
      provider: this.id,
      model: "nelvyon-stub-v1",
      mock: true,
      configured: true,
      ready: false,
    };
  }
}

/** @deprecated use StubProvider — kept for registry id compatibility */
export class MockProvider implements ILlmProvider {
  readonly id = "mock";
  readonly kind = "internal" as const;
  private readonly stub = new StubProvider();

  describe() {
    return { label: "Stub desarrollo (legacy id mock)" };
  }

  isConfigured(): boolean {
    return true;
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async complete(request: LlmCompletionRequest): Promise<LlmCompletionResult> {
    const result = await this.stub.complete(request);
    return { ...result, provider: this.id };
  }
}
