import { getGlobalPrivateAiConfig, isNelvyonAiEnabled } from "../config";
import { getProviderRegistry } from "./ProviderRegistry";
import type { AiMode, ILlmProvider, LlmCompletionRequest, LlmCompletionResult, PrivateAiSettings, PrivateAiPlatformStatus } from "../types";

export type ProviderResolution = {
  result: LlmCompletionResult;
  attempted: string[];
  fallbackReason?: string;
};

export class PrivateAiRouter {
  private readonly global = getGlobalPrivateAiConfig();
  private readonly registry = getProviderRegistry();

  resolveMode(tenant?: Partial<PrivateAiSettings>): AiMode {
    if (!isNelvyonAiEnabled()) return "unconfigured";

    const tenantMode = tenant?.aiMode;
    const globalMode = this.global.aiMode;

    if (tenant?.privateAiOnly || this.global.privateAiOnly) {
      const m = tenantMode ?? globalMode;
      if (m === "openai" || m === "anthropic") return "local";
      if (m === "stub" || m === "mock") return "stub";
      if (m === "local") return "local";
      if (m === "unconfigured") return "unconfigured";
      return "auto";
    }

    const m = tenantMode ?? globalMode;
    if (m === "mock") return "stub";
    return m;
  }

  private async pickChain(mode: AiMode, privateOnly: boolean): Promise<string[]> {
    if (!isNelvyonAiEnabled()) return ["unconfigured"];
    if (mode === "unconfigured") return ["unconfigured"];
    if (mode === "stub") return ["stub"];
    if (mode === "local") return ["local_ollama", "unconfigured"];
    if (mode === "openai") return privateOnly ? ["local_ollama", "unconfigured"] : ["openai", "local_ollama", "unconfigured"];
    if (mode === "anthropic") {
      return privateOnly ? ["local_ollama", "unconfigured"] : ["anthropic", "local_ollama", "unconfigured"];
    }

    // auto — only probe when enabled
    const chain: string[] = [];
    const local = this.registry.get("local_ollama");
    if (local && (await local.isAvailable())) chain.push("local_ollama");
    if (!privateOnly) {
      for (const id of ["openai", "anthropic"]) {
        const p = this.registry.get(id);
        if (p && (await p.isAvailable())) chain.push(id);
      }
    }
    chain.push("unconfigured");
    return chain;
  }

  async complete(
    request: LlmCompletionRequest,
    tenant?: Partial<PrivateAiSettings>,
  ): Promise<ProviderResolution> {
    const privateOnly = Boolean(tenant?.privateAiOnly || this.global.privateAiOnly);
    const mode = this.resolveMode(tenant);
    const chain = await this.pickChain(mode, privateOnly);
    const attempted: string[] = [];
    let lastError: string | undefined;

    for (const id of chain) {
      const provider = this.registry.get(id);
      if (!provider) continue;
      attempted.push(id);

      if (id !== "unconfigured" && id !== "stub" && !(await provider.isAvailable())) {
        lastError = `${id} not available`;
        continue;
      }

      try {
        const modelOverride = this.modelForProvider(id, tenant);
        const result = await provider.complete({
          ...request,
          model: request.model ?? modelOverride ?? undefined,
        });
        return {
          result,
          attempted,
          fallbackReason:
            !result.ready && attempted.length > 1 ? lastError ?? "no real provider ready" : undefined,
        };
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
      }
    }

    const fallback = await this.registry.get("unconfigured")!.complete(request);
    return { result: fallback, attempted, fallbackReason: lastError ?? "all providers failed" };
  }

  async platformStatus(tenant?: Partial<PrivateAiSettings>): Promise<PrivateAiPlatformStatus> {
    const mode = this.resolveMode(tenant);
    const providers = await this.registry.status();
    const localReady = providers.find((p) => p.id === "local_ollama")?.available ?? false;
    const anyRemote = providers.some((p) => p.kind === "remote" && p.available);
    const ready = localReady || anyRemote;
    const configured = isNelvyonAiEnabled() && mode !== "unconfigured";

    let message = "Arquitectura IA privada preparada. Ningún modelo conectado.";
    if (!isNelvyonAiEnabled()) {
      message = "NELVYON_AI_ENABLED=0 — IA desactivada hasta activación explícita.";
    } else if (mode === "stub") {
      message = "Modo stub (desarrollo). mock:true en respuestas.";
    } else if (ready) {
      message = "Proveedor de modelo listo.";
    } else if (mode === "local" || mode === "auto") {
      message = "Configure OLLAMA_CONFIGURED=1 tras instalar runtime local.";
    }

    return {
      enabled: isNelvyonAiEnabled(),
      privateAiOnly: Boolean(tenant?.privateAiOnly || this.global.privateAiOnly),
      mode,
      ready,
      configured,
      providers,
      openClawBridge: "disabled",
      ragIngest: "not_started",
      message,
    };
  }

  private modelForProvider(providerId: string, tenant?: Partial<PrivateAiSettings>): string | undefined {
    if (providerId === "local_ollama") return tenant?.ollamaModel ?? this.global.ollamaModel;
    if (providerId === "openai") return tenant?.openaiModel ?? this.global.openaiModel;
    if (providerId === "anthropic") return tenant?.anthropicModel ?? this.global.anthropicModel;
    return undefined;
  }
}

let _router: PrivateAiRouter | undefined;
export function getPrivateAiRouter(): PrivateAiRouter {
  _router ??= new PrivateAiRouter();
  return _router;
}
export function resetPrivateAiRouterForTests(): void {
  _router = undefined;
}
