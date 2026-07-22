# PROPOSAL — Quality routing local (3b vs 8b)

> **Status:** **implemented opt-in** (ADR-036) · certified Router **unchanged** · prod IA **OFF**  
> Date: **2026-07-22** · Code: `resolveAutonomousOllamaModel` in `backend/autonomous/llm/llmAdapter.ts`

---

## Problem

Local pack QA (threshold **≥85**, unchanged) shows a clear model-size gap on the same Phase C heliovolt fixture:

| Model (Ollama local) | QA score | Result | Notes |
|----------------------|----------|--------|-------|
| `llama3.2:3b` (fast path) | **55** | fail | Blocking: `STRUCT-copy-hero`, `L-SOP-02` CTA múltiple — **model/hardware limit**, not a false PASS |
| `llama3.1:8b` (quality path) | **89** | pass | Clears threshold 85 — **evidence only** |

HTTP kickoff with 3b ends in `needs_review` when smoke expects `completed` (QA&lt;85).

---

## Proposal (opt-in later)

When running **local** autonomous packs against Ollama (never prod IA activation in this proposal):

1. **Default / fast path:** keep **3b** for latency and cost-of-compute on the workstation.
2. **Quality path:** prefer **8b** when the goal is pack deliverables with **QA ≥ 85** (auto-approve / `completed`), or after a 3b run lands in `needs_review` due to structural/copy QA fails.
3. **No certification invalidation:** do **not** change certified Router default models, soak locks, or MCP/Router certification artifacts. Any routing remains an **opt-in** local ops choice (env or explicit kickoff param), documented separately from certified baselines.
4. **Prod:** remains **IA OFF** — no `OLLAMA_*` on Railway prod, no `AUTONOMOUS_ALLOW_OPENAI`, no SHARED_MEMORY/MCP/OpenClaw ON as part of this proposal.

---

## Acceptance criteria (ADR-036 — implemented)

- Explicit opt-in: `AUTONOMOUS_QUALITY_ROUTING=1`
- Critical roles → `OLLAMA_STRATEGY_MODEL` (8b); others → `OLLAMA_MODEL` (3b)
- Threshold 85 unchanged; `needs_review` when QA fails (orchestrator)
- Certified Router soak/locks untouched
- Zero OpenAI required
- Architecture for runtime reachability: `docs/ARCHITECTURE_LOCAL_AI_RUNTIME.md` (not activated)

---

## Non-goals

- Changing production model defaults or Router certification.
- Staging→localhost Ollama.
- Activating autonomous IA flags on production Railway.
