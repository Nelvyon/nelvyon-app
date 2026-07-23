# HANDOVER — NELVYON

> **Lee primero** `docs/NELVYON_MASTER_CONTEXT.md` · **luego este HANDOVER**.  
> Última actualización: **2026-07-23** — Mesh staging: Ollama privado PASS · Tailscale join **FAIL** (auth key) · prod OFF · `claimReady: false`

---

## Estado actual

| Campo | Valor |
|-------|-------|
| **Estado** | **CONDITIONAL_READY** (mesh join pendiente) |
| **Staging live/ready** | **200** · `git_sha=bf9b24d1d4c5` |
| **Ollama privado** | **PASS** (Tailscale IP only · loopback cerrado) |
| **Tailscale join staging** | **FAIL** · `TS_AUTHKEY` invalid · peer offline |
| **Pack E2E / Router remoto** | **BLOCKED** hasta `MESH_JOIN_OK` |
| **Prod IA/mesh** | **ABSENT** |
| **OpenAI / OpenClaw / payouts / campañas** | **OFF** · coste **0** |
| **claimReady** | **false** |

### Rollback emergencia (2 flags → 0)

`NELVYON_AI_ENABLED=0` · `OLLAMA_CONFIGURED=0` (solo staging `ideal-victory`)

---

## Próximo paso EXACTO

1. CEO: regenerar auth key (`docs/ops/MESH_OPTION_A_STAGING.md`) → reemplazar `TS_AUTHKEY` en Railway **staging** → redeploy `ideal-victory`.  
2. Confirmar logs `MESH_JOIN_OK` + peer `nelvyon-staging-web` **online**.  
3. Re-verificar Pack E2E staging + Router/3b/8b remoto.  
4. Legal campañas: checklist (sigue bloqueando claimReady).

SSOT: `docs/ops/MESH_OPTION_A_STAGING.md` · `docs/CTO_FINAL_VERIFY.md`
