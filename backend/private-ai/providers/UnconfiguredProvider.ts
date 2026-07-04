import type { ILlmProvider, LlmCompletionRequest, LlmCompletionResult } from "../types";

export class UnconfiguredProvider implements ILlmProvider {
  readonly id = "unconfigured";
  readonly kind = "internal" as const;

  describe() {
    return { label: "Sin modelo conectado" };
  }

  isConfigured(): boolean {
    return true;
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async complete(_request: LlmCompletionRequest): Promise<LlmCompletionResult> {
    return {
      text:
        "IA privada Nelvyon: arquitectura preparada, ningún proveedor de modelo conectado.\n\n" +
        "Para activar un modelo local más adelante:\n" +
        "1. Instale Ollama (u otro runtime compatible)\n" +
        "2. Descargue el modelo abierto deseado\n" +
        "3. Configure NELVYON_AI_ENABLED=1, OLLAMA_CONFIGURED=1, NELVYON_AI_MODE=local\n\n" +
        "Para desarrollo sin modelo: NELVYON_AI_MODE=stub",
      provider: this.id,
      model: "none",
      mock: false,
      configured: false,
      ready: false,
    };
  }
}
