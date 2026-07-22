# ARCHITECTURE — Local AI runtime for agents (cost = 0)

> Status: **design only** · **not activated** · Date: **2026-07-22**  
> Constraint: no paid APIs · no new paid infra · **do not expose owner PC to public Internet**  
> Related: ADR-034/036 · `docs/PROPOSAL_QUALITY_ROUTING_LOCAL.md` · HANDOVER IA OFF in prod

---

## Goal

Make local/open-weight models reachable by **agent runtimes** (autonomous packs, OS `LlmClient`, Private AI router) without:

- `OLLAMA_HOST=http://localhost:11434` from Railway (impossible / forbidden),
- OpenAI / paid LLM defaults,
- opening the owner workstation to the public Internet,
- new monthly cloud GPU spend.

---

## Recommended architecture (0 incremental cost)

### Option A — Private mesh to owner GPU (preferred)

```
[Railway @nelvyon/web] --Tailscale/WireGuard--> [Owner GPU host: Ollama :11434]
                         private overlay only
```

| Layer | Choice |
|-------|--------|
| Network | Tailscale or WireGuard **private** — no public inbound ports on PC |
| Auth | Mesh ACL + service identity; Railway uses Tailscale IP / MagicDNS name only |
| App config | `OLLAMA_HOST=http://100.x.y.z:11434` (private) · never public DNS |
| Models | `OLLAMA_MODEL` = 3b fast · `OLLAMA_STRATEGY_MODEL` = 8b quality |
| Flags | Prod IA still **CEO-gated**; mesh can be staging-first |
| Rollback | Unset `OLLAMA_*` · leave mesh; agents fail-closed / `LLM_NOT_CONFIGURED` |

**Security:** PRIVATE_MODE still blocks public egress; Tailscale peer is allowlisted host. No Cloudflare tunnel to open web. No MFA bypass.

**Cost:** $0 if owner already has GPU + Tailscale free tier.

### Option B — Same-project private worker (only if already in Railway plan)

Ollama as **private** Railway service (`*.railway.internal`) in the same project — **only** if no new billable GPU addon. If Railway would charge GPU, **reject** and stay on Option A.

### Option C — Dev/cert only (current verified path)

Ollama on `127.0.0.1:11434` for local gates, Phase C, pack gate. Staging/prod remain IA OFF until CEO + Option A/B.

---

## What is forbidden

| Pattern | Why |
|---------|-----|
| Staging/prod → `localhost:11434` on laptop | Unreachable; security anti-pattern |
| Public expose Ollama (0.0.0.0 / ngrok / open CF tunnel) | Attack surface |
| `AUTONOMOUS_ALLOW_OPENAI=1` as default | Violates IA privada |
| Silent mock success when LLM missing | Honesty |

---

## Activation checklist (CEO)

1. Approve Option A or B.  
2. Configure private `OLLAMA_HOST` + models (3b/8b).  
3. Set `AUTONOMOUS_QUALITY_ROUTING=1` for pack QA path (ADR-036) on **staging first**.  
4. Keep prod IA flags OFF until soak evidence.  
5. Never set OpenAI allow by default.

---

## Rollback

Unset `OLLAMA_HOST` / `OLLAMA_BASE_URL` / `AUTONOMOUS_QUALITY_ROUTING` → fail-closed. No data migration.

---

## Decision gate

**Do not implement infra in this phase.** This document is the architecture deliverable. Implementation of mesh/worker requires explicit CEO approval (even at $0) because it changes production blast radius.
