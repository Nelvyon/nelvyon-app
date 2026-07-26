# Evidence — Private AI staging canary PREP drill (no production activation)

| Campo | Valor |
|-------|-------|
| Fecha | 2026-07-25T11:27:00Z (sesión local Windows) |
| Alcance | Staging PREP + fail-closed prod · **sin** activación productiva |
| OpenAI | `AUTONOMOUS_ALLOW_OPENAI=0` (forzado en probes) |
| `isProductionCanaryAuthorized()` | **false** (hardcoded; confirmado por vitest) |
| Prod canary | **BLOCKED_CEO** — `docs/ops/CEO_IA_PROD_CANARY_REQUEST.md` = `PENDING_CEO` |
| Staging Router+QR | Ya aprobado (`CEO_IA_STAGING_APPROVAL_REQUEST.md`) — este drill **no** flippea Railway |

## VERDICT

| Capa | Resultado |
|------|-----------|
| Prep / código / tests | **VERIFIED** |
| Canary productivo | **BLOCKED_CEO** |
| Activación producción | **OFF** (no tocada) |

## Checks ejecutados

| Check | Result | Detail |
|-------|--------|--------|
| vitest `PrivateAiCanaryPrep` | **PASS** | 24/24 |
| vitest qualityRouting + OllamaRuntimePrep (`AUTONOMOUS_ALLOW_OPENAI=0`) | **PASS** | 12/12 |
| `isProductionCanaryAuthorized()` | **PASS** | siempre `false` (incluso con flags peligrosos=1) |
| Ollama Tailscale `100.102.207.30:11434` `/api/tags` | **VERIFIED** | HTTP 200 · 6 modelos · **tags only, no generate, 0€** |
| Modelos canary presentes (tags) | **VERIFIED** | `llama3.2:3b-instruct-q4_K_M` · `llama3.1:8b-instruct-q4_K_M` (+ embeds/otros) |
| Ollama localhost `127.0.0.1:11434` | **UNREACHABLE** | Option C local generate probe no aplicable esta sesión |
| `scripts/staging-canary-router-qr-local-probe.mjs` (hardcoded localhost) | **BLOCKED** | falla al no alcanzar 127.0.0.1 — no se forzó generate vía Tailscale (política: tags only / no spend) |
| Railway prod IA flags | **untouched** | ningún flag de producción cambiado por este drill |

### Tags Ollama mesh (live)

```
host: http://100.102.207.30:11434
models:
  - llama3.1:8b-instruct-q4_K_M
  - mxbai-embed-large:latest
  - nomic-embed-text:latest
  - qwen2.5:3b-instruct-q4_K_M
  - phi3:mini
  - llama3.2:3b-instruct-q4_K_M
```

Nota honesta: en esta máquina `OLLAMA_HOST` env apareció como `100.102.207.30:11434` **sin** esquema. El probe HTTP usó `http://…` explícito. El checker de código (`assertOllamaHostSafeForRuntime`) exige URL con `http(s)://` — bare host:port → `OLLAMA_HOST_invalid_url`. Recomendación ops: fijar `OLLAMA_HOST=http://100.102.207.30:11434`.

## Prod-dangerous flags (deben permanecer OFF)

Esperados OFF/unset: `AUTONOMOUS_ALLOW_OPENAI`, `NELVYON_CEO_PARTNER_PAYOUTS`, `NELVYON_MCP_PRODUCTIVE_ENABLED`, `NELVYON_SHARED_MEMORY_ENABLED`, `NELVYON_OPENCLAW_BRIDGE_ENABLED`, `NELVYON_PRIVATE_AI_PROD_CANARY_ENABLED`.

Kill switch de emergencia (no engagé en este drill): `NELVYON_PRIVATE_AI_CANARY_KILL_SWITCH`.

## Rollback (cualquier entorno)

```
NELVYON_PRIVATE_AI_CANARY_KILL_SWITCH=1
NELVYON_AI_ENABLED=0
AUTONOMOUS_ALLOW_OPENAI=0
```

## Honestidad

- **VERIFIED prep** = tests + tags mesh + OpenAI=0 + `isProductionCanaryAuthorized()===false`.
- **BLOCKED_CEO prod** = sin firma CEO + sin cambio manual de código; no hay flag env que active prod canary.
- No se ejecutó `/api/generate` contra Tailscale en esta sesión (tags only).
- No se mutó Railway staging ni production.
