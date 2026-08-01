# HANDOVER — NELVYON

> **Lee primero** `docs/NELVYON_MASTER_CONTEXT.md` · **luego este HANDOVER**.  
> Última actualización: **2026-08-01** — SaaS **claimReady: true** · canary IA **KILL** · tip prod en despliegue

| Campo | Valor |
|-------|-------|
| **Tip prod live** | ver commit desplegado (post-deploy) |
| **Staging** | `4ed47ae0` SUCCESS · password cert 31/31 · JWT 23/23 · LH a11y 100 |
| **Calidad** | tsc/eslint SaaS PASS · Vitest 6256 · PW SaaS 349/349 · build:prod PASS |
| **claimReady** | **true** |
| **claimReadyLegal** | **false** (mass-send campañas bloqueado — legal) |
| **Canary / spend / publish** | **KILL / OFF / OFF** |

## Próximo paso EXACTO

1. Confirmar post-deploy prod: health/ready · login (401 credenciales inválidas, no 429) · APIs SaaS 401 sin sesión · canary flags KILL.
2. Ops humanos no bloqueantes: OAuth secrets · SES/SNS confirm · Twilio/WA · clientes (ver `docs/TODO.md` «Solo humano»).
3. No abrir canary IA ni `claimReadyLegal` sin autorización legal/CEO explícita.

### Seguridad producción (mantener)

```
NELVYON_PRIVATE_AI_CANARY_KILL_SWITCH=1
NELVYON_PRIVATE_AI_PROD_CANARY_ENABLED=0
NELVYON_AI_ENABLED=0
AUTONOMOUS_ALLOW_OPENAI=0
NELVYON_ADS_SPEND_ENABLED=0
NELVYON_SMS_BULK_ENABLED=0
NELVYON_ORCHESTRATOR_ENABLED=0
```

Upstash Redis obligatorio en prod (`UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`) — fail-closed en auth crítico sin él.
