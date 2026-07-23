# HANDOVER — NELVYON

> **Lee primero** `docs/NELVYON_MASTER_CONTEXT.md` · **luego este HANDOVER**.  
> Última actualización: **2026-07-23** — Code tip `1d5d620a` deployed · Pack E2E WARN (critical=0) · **MESH_JOIN_FAIL** (ephemeral key) · prod OFF · `claimReady: false`

---

## Estado actual

| Campo | Valor |
|-------|-------|
| **Estado** | **CONDITIONAL_READY** (mesh join pendiente) |
| **Staging tip / deploy** | `1d5d620a` · deploy `03a16532` **SUCCESS** · live `git_sha=1d5d620ab4e9` · ready **200** |
| **Ollama privado (PC)** | **PASS** — Tailscale IP `100.102.207.30:11434` only · loopback **CLOSED** |
| **Tailscale join staging** | **FAIL** · `MESH_JOIN_FAIL` invalid/consumed ephemeral `TS_AUTHKEY` · peer `nelvyon-staging-web*` **offline** |
| **Unit tests (mesh)** | **44/44 PASS** |
| **Pack E2E staging** | **WARN_FAIL** · critical=0 · 1 WARN download 404 · kickoff completed (no mesh path proven) |
| **Prod IA/mesh** | **ABSENT** |
| **OpenAI / OpenClaw / payouts / campañas** | **OFF** · coste **0** |
| **claimReady** | **false** |

### Rollback emergencia (2 flags → 0)

`NELVYON_AI_ENABLED=0` · `OLLAMA_CONFIGURED=0` (solo staging `ideal-victory`)

---

## Próximo paso EXACTO

1. CEO: generar **nueva** auth key ephemeral+pre-approved (`docs/ops/MESH_OPTION_A_STAGING.md`) → reemplazar `TS_AUTHKEY` en Railway **staging** → **un** redeploy `ideal-victory` (cada redeploy consume key ephemeral).  
2. Confirmar logs **`MESH_JOIN_OK`** + peer `nelvyon-staging-web*` **online**.  
3. Re-verificar Pack E2E + health Ollama vía mesh proxy (no declarar mesh PASS sin join).  
4. Legal campañas: checklist (sigue bloqueando claimReady).

SSOT: `docs/ops/MESH_OPTION_A_STAGING.md` · `docs/CTO_FINAL_VERIFY.md` · ADR-044
