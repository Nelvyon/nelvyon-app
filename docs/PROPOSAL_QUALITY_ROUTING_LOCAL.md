# PROPOSAL — Quality routing local (3b vs 8b)

> **Status:** proposal only · **no code** · does **not** change certified Router/models · **not** activated in prod  
> Date: **2026-07-22** · Evidence: `.release-logs/hardening-ia-packs-20260722.txt`

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

## Acceptance criteria (future implementation — out of scope here)

- Explicit opt-in only (flag or model override); 3b remains default unless quality path requested.
- Threshold 85 and certified model locks untouched unless a dedicated certification re-run is planned.
- Evidence logged (model id + QA score) per pack run.
- Zero OpenAI paid path required for this routing.

---

## Non-goals

- Changing production model defaults or Router certification.
- Staging→localhost Ollama.
- Activating autonomous IA flags on production Railway.
