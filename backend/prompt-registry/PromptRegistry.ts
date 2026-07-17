/**
 * Prompt Registry — versioned prompt SSOT for Phase 2 agents.
 * Complements (does not replace) specialization PromptBuilder / autonomous promptTemplates.
 */

import { NELVYON_PRIVATE_AGENTS } from "../private-ai/nelvyonAgentRegistry";

export const PROMPT_REGISTRY_CONTRACT_VERSION = "1.0.0";

export type PromptRecord = {
  id: string;
  agentId: string;
  name: string;
  version: string;
  locale: string;
  body: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  active: boolean;
};

export type PromptWriteInput = {
  agentId: string;
  name: string;
  body: string;
  version?: string;
  locale?: string;
  tags?: string[];
  activate?: boolean;
};

function nowIso(): string {
  return new Date().toISOString();
}

/** In-process registry — durable store can back this later without API change. */
export class InMemoryPromptRegistry {
  readonly contractVersion = PROMPT_REGISTRY_CONTRACT_VERSION;
  private readonly items = new Map<string, PromptRecord>();

  upsert(input: PromptWriteInput): PromptRecord {
    const version = input.version ?? "1.0.0";
    const id = `${input.agentId}:${input.name}:${version}`;
    const ts = nowIso();
    if (input.activate !== false) {
      for (const [k, v] of this.items) {
        if (v.agentId === input.agentId && v.name === input.name && v.active) {
          this.items.set(k, { ...v, active: false, updatedAt: ts });
        }
      }
    }
    const rec: PromptRecord = {
      id,
      agentId: input.agentId,
      name: input.name,
      version,
      locale: input.locale ?? "es-ES",
      body: input.body.slice(0, 50_000),
      tags: input.tags ?? [],
      createdAt: this.items.get(id)?.createdAt ?? ts,
      updatedAt: ts,
      active: input.activate !== false,
    };
    this.items.set(id, rec);
    return rec;
  }

  getActive(agentId: string, name: string): PromptRecord | null {
    for (const v of this.items.values()) {
      if (v.agentId === agentId && v.name === name && v.active) return v;
    }
    return null;
  }

  listByAgent(agentId: string): PromptRecord[] {
    return [...this.items.values()]
      .filter((v) => v.agentId === agentId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  listAll(): PromptRecord[] {
    return [...this.items.values()].sort((a, b) => a.id.localeCompare(b.id));
  }
}

let _reg: InMemoryPromptRegistry | undefined;
export function getPromptRegistry(): InMemoryPromptRegistry {
  _reg ??= new InMemoryPromptRegistry();
  if (_reg.listAll().length === 0) {
    for (const a of NELVYON_PRIVATE_AGENTS) {
      _reg.upsert({
        agentId: a.id,
        name: "system",
        version: "1.0.0",
        body: a.systemPrompt,
        tags: ["system", "seed", "private_ai"],
      });
    }
  }
  return _reg;
}

export function resetPromptRegistryForTests(): void {
  _reg = undefined;
}
