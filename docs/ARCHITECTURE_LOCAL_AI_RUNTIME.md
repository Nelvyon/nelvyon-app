# ARCHITECTURE — Local AI runtime for agents (cost = 0)

> Status: **Mesh Option A local PASS** · Railway staging **WAITING_TS_AUTHKEY** · prod OFF · Date: **2026-07-23**  
> Constraint: no paid APIs · no Funnel/Serve/exit/subnet · **do not expose owner PC to public Internet**  
> Related: ADR-034/036/041/042 · `docs/ops/MESH_OPTION_A_STAGING.md`

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

## Prep implementada (código · sin activar mesh)

| Pieza | Rol |
|-------|-----|
| `backend/local-ai/OllamaRuntimePrep.ts` | Host safety (ban loopback remoto) · `probeOllamaHealth` · snapshot prep |
| Tests | `backend/local-ai/__tests__/OllamaRuntimePrep.test.ts` |
| Canary doc | `docs/ops/CANARY_IA_FLAGS.md` |

### Procedimiento humano (solo tras CEO Option A)

```bash
# En el host GPU (privado): Ollama escuchando solo en IP mesh, no 0.0.0.0 público
# En Railway STAGING (no prod primero):
# OLLAMA_HOST=http://100.x.y.z:11434
# OLLAMA_CONFIGURED=1
# OLLAMA_MODEL=llama3.2:3b-instruct-q4_K_M
# OLLAMA_STRATEGY_MODEL=llama3.1:8b-instruct-q4_K_M
# NELVYON_LOCAL_ROUTER_ENABLED=1   # canary
# AUTONOMOUS_QUALITY_ROUTING=1     # canary opcional
# Nunca: AUTONOMOUS_ALLOW_OPENAI=1 por defecto
```

Rollback: unset todas las vars anteriores.

---

## Decision gate

**No instalar Tailscale/WireGuard/Ollama remoto desde Cursor.** CEO aprueba Option A/B → ops ejecuta mesh → canary staging vía `CANARY_IA_FLAGS.md`.
