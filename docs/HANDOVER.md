# HANDOVER — NELVYON

> **Lee primero** `docs/NELVYON_MASTER_CONTEXT.md` · **luego este HANDOVER**.  
> Última actualización: **2026-08-01** — Staging password cert **31/31** · LH login a11y **100** · canary **KILL** · `claimReady: false` · **READY_FOR_PRODUCTION** (sin flip claimReady / sin prod deploy)

| Campo | Valor |
|-------|-------|
| **Tip prod live** | `3f10c272` (sin cambios — no tocar) |
| **Staging deploy** | `4ed47ae0` SUCCESS (rate-limit staging + a11y login) |
| **Calidad local** | tsc **PASS** · ESLint SaaS **0 warnings** · Vitest **6256** · build:prod **PASS** |
| **Staging evidencia** | password **31/31** · isolation **PASS** · JWT **23/23** · LH `/login` a11y **100** |
| **claimReady** | **false** |
| **Canary / spend / publish** | **KILL / OFF / OFF** |

## Próximo paso EXACTO

1. **Autorización humana (no automática):** si se acepta el veredicto READY_FOR_PRODUCTION, autorizar explícitamente (a) `claimReady: true` y/o (b) deploy a producción.
2. **Antes del primer deploy prod con auth crítico:** configurar Upstash Redis en el servicio **production** (`UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`). Sin Upstash, producción sigue **fail-closed** en reglas críticas (`auth-login`, etc.) — intencional. Staging no requiere Upstash (memory fallback acotado a `RAILWAY_ENVIRONMENT=staging`).
3. Mantener canary **KILL** hasta go-live controlado.

### Rollback IA / spend

```
NELVYON_PRIVATE_AI_CANARY_KILL_SWITCH=1
NELVYON_PRIVATE_AI_PROD_CANARY_ENABLED=0
NELVYON_AI_ENABLED=0
AUTONOMOUS_ALLOW_OPENAI=0
NELVYON_ADS_SPEND_ENABLED=0
NELVYON_SMS_BULK_ENABLED=0
NELVYON_ORCHESTRATOR_ENABLED=0
```

### Rollback rate-limit staging

Revertir `isCriticalRateLimitStrictEnvironment` en `apps/web/src/lib/security/rateLimit.ts` (o redeploy tip anterior). Staging volvería a 429 permanente sin Upstash.

### Evidencia clave

- `docs/evidence/staging-password-cert-1785549975520.json` — PASSWORD_CERT_PASS 31/31
- `docs/evidence/staging-isolation-1785549995141.json` — ISOLATION_PASS
- `docs/evidence/staging-saas-cert-1785550017633.json` — STAGING_CERT_PASS 23/23
- `docs/evidence/lighthouse-login-staging.json` — a11y 100
- `docs/evidence/vitest-full-gate.txt` — 6256 passed
- `docs/evidence/build-prod-gate.txt` — BUILD_EXIT=0
