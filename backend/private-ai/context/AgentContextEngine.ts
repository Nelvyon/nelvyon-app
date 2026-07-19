/**
 * Agent Context Engine — SSOT assembler for Private AI agent prompts.
 * Composes Shared Memory + tenant inbox memory + RAG (IRagStore) without duplicating specialization PromptBuilder.
 * Nelvyon-first: prefer indexed internal docs; never invent when RAG returns grounded chunks.
 */

import { isSharedMemoryEnabled } from "../../shared-memory/config";
import { getSaasSharedMemoryService } from "../../saas/SaasSharedMemoryService";
import type { IRagStore } from "../rag/IRagStore";
import type { AgentToolId } from "../types";
import { getTenantMemoryAdapter, type TenantMemoryAdapter } from "../memory/TenantMemoryAdapter";

export type AgentContextInput = {
  tenantId: string;
  userId: string;
  agentId: string;
  query: string;
  roles: string[];
  allowedTools: readonly AgentToolId[];
  rag: IRagStore;
  memory?: TenantMemoryAdapter;
  /** Optional domain hint for ranking (passed to LocalRag when Unified prefers local). */
  domainHint?: string;
};

export type AgentContextResult = {
  systemSuffix: string;
  meta: {
    sharedMemoryEntries: number;
    tenantMemoryChunks: number;
    ragChunks: number;
    sharedMemoryEnabled: boolean;
    nelvyonFirst: true;
    grounded: boolean;
  };
};

const NELVYON_FIRST_RULES = `
Reglas de razonamiento NELVYON (obligatorias):
1. Prioriza documentación interna NELVYON (RAG/citas) sobre conocimiento general.
2. Si hay chunks RAG relevantes, basate en ellos y cítalos; no inventes arquitectura, APIs ni métricas.
3. Si el contexto es insuficiente, dilo explícitamente y propone consultar HANDOVER/ADR/KNOWN_ISSUES.
4. Acciones sensibles (billing, prod, envíos masivos) requieren aprobación humana.
`.trim();

export async function buildAgentContext(input: AgentContextInput): Promise<AgentContextResult> {
  const parts: string[] = [`\n\n${NELVYON_FIRST_RULES}`];
  let sharedMemoryEntries = 0;
  let tenantMemoryChunks = 0;
  let ragChunks = 0;
  const sharedMemoryEnabled = isSharedMemoryEnabled();

  if (input.allowedTools.includes("memory.read") && sharedMemoryEnabled) {
    try {
      const svc = getSaasSharedMemoryService();
      const res = await svc.search(
        {
          tenantId: input.tenantId,
          userId: input.userId,
          agentId: input.agentId,
          roles: input.roles.length ? input.roles : ["member"],
          scopes: ["memory.read", "memory.write"],
        },
        {
          query: input.query.slice(0, 200),
          agentId: input.agentId,
          limit: 5,
        },
      );
      sharedMemoryEntries = res.entries.length;
      if (res.entries.length) {
        parts.push(
          "\n\nMemoria compartida Nelvyon (Shared Memory):\n" +
            res.entries
              .map((e) => `- [${e.layer}/${e.scope}] ${e.key}: ${e.content.slice(0, 220)}`)
              .join("\n"),
        );
      }
    } catch {
      /* optional */
    }
  }

  if (input.allowedTools.includes("memory.read")) {
    try {
      const mem = input.memory ?? getTenantMemoryAdapter();
      const chunks = await mem.list(input.tenantId, 5);
      tenantMemoryChunks = chunks.length;
      const block = mem.formatForPrompt(chunks);
      if (block) parts.push(block);
    } catch {
      /* optional */
    }
  }

  if (input.allowedTools.includes("rag.search")) {
    try {
      const limit = Number(process.env.NELVYON_AGENT_RAG_LIMIT ?? 6);
      const rag = await input.rag.searchPlatform(input.query.slice(0, 200), limit);
      ragChunks = rag.chunks.length;
      if (rag.chunks.length) {
        parts.push(
          "\n\nDocumentación Nelvyon (RAG — fuente prioritaria):\n" +
            rag.chunks
              .map((c, i) => `[${i + 1}] ${c.title || c.source}: ${c.content.slice(0, 280)}`)
              .join("\n"),
        );
      } else {
        parts.push(
          "\n\nDocumentación Nelvyon (RAG): sin hits relevantes. No inventes; declara laguna y sugiere docs HANDOVER/DECISIONS.",
        );
      }
    } catch {
      /* optional */
    }
  }

  void input.domainHint;

  return {
    systemSuffix: parts.join(""),
    meta: {
      sharedMemoryEntries,
      tenantMemoryChunks,
      ragChunks,
      sharedMemoryEnabled,
      nelvyonFirst: true,
      grounded: ragChunks > 0,
    },
  };
}

/** Persist a short STM note after a successful agent turn (opt-in). */
export async function maybeWriteAgentMemory(opts: {
  tenantId: string;
  userId: string;
  agentId: string;
  roles: string[];
  allowedTools: readonly AgentToolId[];
  query: string;
  output: string;
}): Promise<{ written: boolean; entryId?: string }> {
  if (!opts.allowedTools.includes("memory.write")) return { written: false };
  if (!isSharedMemoryEnabled()) return { written: false };
  if ((process.env.NELVYON_SHARED_MEMORY_AUTO_WRITE ?? "1") === "0") return { written: false };

  try {
    const svc = getSaasSharedMemoryService();
    const entry = await svc.write(
      {
        tenantId: opts.tenantId,
        userId: opts.userId,
        agentId: opts.agentId,
        roles: opts.roles.length ? opts.roles : ["owner"],
        scopes: ["memory.write", "memory.read"],
      },
      {
        tenantId: opts.tenantId,
        scope: "agent",
        visibility: "agent_shared",
        kind: "conversation_summary",
        layer: "stm",
        agentId: opts.agentId,
        key: `turn:${Date.now()}`,
        title: "Agent turn",
        content: `Q: ${opts.query.slice(0, 400)}\nA: ${opts.output.slice(0, 800)}`,
        createdBy: opts.userId,
      },
    );
    return { written: true, entryId: entry.id };
  } catch {
    return { written: false };
  }
}
