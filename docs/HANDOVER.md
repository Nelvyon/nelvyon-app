# HANDOVER — NELVYON

> **Lee este archivo primero.**  
> Última actualización: **2026-07-19** — **Bloque A Workforce:** inventario completo · ADR-027 · siguiente Bloque B

---

## Estado actual

| Campo | Valor |
|-------|-------|
| **Fase 1** | Interno READY · prod bloqueada por terceros |
| **Fase 2 Elite** | PASS repo (`phase2EliteCertified=true`) · residuales Docker/ops |
| **Workforce** | Auditoría A ✅ · `docs/AGENT_WORKFORCE_INVENTORY.md` · **no** `NELVYON_AUTONOMOUS_WORKFORCE_CERTIFIED` aún |
| **Freeze** | Router / MCP / Specialization **intactos** |

### Conteos fuerza de trabajo (SSOT)

| Universo | N |
|----------|--:|
| Private AI runtime | 17 |
| Specialist designs | 23 |
| Unified IDs | 30 |
| Design-only | 13 |
| Eval-covered | 10 |
| OS agents (excluido) | ~1634 |

---

## Próximo paso EXACTO

1. **Bloque B:** lifecycle states · hierarchy metadata · deprecar 4 aliases · schemas/permisos (sin mintar permanentes masivos)  
2. **Bloque C:** runtime persistente (queue/checkpoint/recovery/kill switch) sobre orchestrator existente  
3. Ops residual: Docker pgvector · mig 514 · OpenClaw URL · SES/Stripe  

## Evidencia

```powershell
# Inventario
# docs/AGENT_WORKFORCE_INVENTORY.md · ADR-027

# Elite (no romper)
node scripts/run-phase2-elite-cert.mjs
```
