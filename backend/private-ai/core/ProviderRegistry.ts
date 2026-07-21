import { getGlobalPrivateAiConfig } from "../config";
import { AnthropicProvider } from "../providers/AnthropicProvider";
import { LocalModelRouterProvider } from "../providers/LocalModelRouterProvider";
import { LocalOllamaProvider } from "../providers/LocalOllamaProvider";
import { OpenAiProvider } from "../providers/OpenAiProvider";
import { StubProvider } from "../providers/StubProvider";
import { UnconfiguredProvider } from "../providers/UnconfiguredProvider";
import type { ILlmProvider, ProviderStatus } from "../types";

export class ProviderRegistry {
  private readonly providers: ILlmProvider[];

  constructor() {
    const cfg = getGlobalPrivateAiConfig();
    this.providers = [
      new UnconfiguredProvider(),
      new StubProvider(),
      new LocalModelRouterProvider(cfg),
      new LocalOllamaProvider(cfg),
      new OpenAiProvider(cfg),
      new AnthropicProvider(cfg),
    ];
  }

  all(): ILlmProvider[] {
    return [...this.providers];
  }

  get(id: string): ILlmProvider | undefined {
    return this.providers.find((p) => p.id === id || (id === "mock" && p.id === "stub"));
  }

  async status(): Promise<ProviderStatus[]> {
    const out: ProviderStatus[] = [];
    for (const p of this.providers) {
      const configured = p.isConfigured();
      let available = false;
      let reason: string | undefined;

      if (p.id === "unconfigured" || p.id === "stub") {
        available = true;
      } else if (!configured) {
        reason = "not_configured";
      } else {
        available = await p.isAvailable();
        if (!available) reason = "unavailable";
      }

      out.push({
        id: p.id,
        label: p.describe().label,
        kind: p.kind,
        configured,
        available,
        reason,
      });
    }
    return out;
  }
}

let _registry: ProviderRegistry | undefined;
export function getProviderRegistry(): ProviderRegistry {
  _registry ??= new ProviderRegistry();
  return _registry;
}
export function resetProviderRegistryForTests(): void {
  _registry = undefined;
}
