# AUTONOMOUS Phase P — Alertas, Export CSV y Cron Refresh

Operacionaliza el Learning Dashboard con alertas internas, exports y refresco automático en staging.

## Resumen

| Pieza | Ubicación |
|-------|-----------|
| Alert engine | `backend/autonomous/learning/learningAlerts.ts` |
| CSV export | `backend/autonomous/learning/learningCsvExport.ts` |
| Refresh job | `pnpm -C apps/web autonomous:learning-refresh` |
| API export | `GET /api/v1/os/autonomous/learning/export/{key}` |
| UI | `/os/autonomous/learning` |

**Autonomía:** 86% → **90%** (+4%)

---

## 1. Alertas internas (operator+)

Tipos detectados:

| Tipo | Condición |
|------|-----------|
| `conversion_rate_drop` | Caída ≥15% CR (7d vs 7d anterior o vs snapshot previo) |
| `lead_count_drop` | Caída ≥20% leads globales |
| `qa_score_low` | QA &lt; 85 |
| `high_reject_rate` | Rechazos portal ≥35% |
| `high_revisions` | Revisiones promedio ≥ 2 |
| `template_score_low` | `final_template_score` &lt; 65 |

Output: `backend/autonomous/output/learning/learningAlerts.json`

Severidad: `warn` | `crit`

---

## 2. Export CSV

Archivos en `output/learning/exports/`:

| Archivo | Contenido |
|---------|-----------|
| `rankings.csv` | Top plantillas y scores |
| `outcomes.csv` | Outcomes individuales |
| `sector_summary.csv` | Resumen por sector |

**CLI:** generados por `autonomous:learning-refresh`

**UI:** botones en `/os/autonomous/learning`

**API:** `GET /api/v1/os/autonomous/learning/export/rankings` (operator+)

---

## 3. Comando refresh

```bash
pnpm -C apps/web autonomous:learning-refresh
```

Pipeline:

1. `enrich-outcomes` (GA4 mock/real según flags)
2. `rank-templates`
3. Generar alertas
4. Generar CSV exports
5. Escribir `refreshStatus.json` + `learningSnapshot.json`

**Cron staging:**

```bash
AUTONOMOUS_LEARNING_CRON=true pnpm -C apps/web autonomous:learning-refresh
```

```cron
0 4 * * * cd /app && AUTONOMOUS_LEARNING_CRON=true pnpm -C apps/web autonomous:learning-refresh
```

---

## 4. Flags y seguridad

| Variable | Default | Efecto |
|----------|---------|--------|
| `ENABLE_TEMPLATE_LEARNING_DB` | false | DB outcomes |
| `ENABLE_AUTONOMOUS_GA4` | false | GA4 real |
| `AUTONOMOUS_GA4_MOCK` | — | `realistic` → mock CR |
| `AUTONOMOUS_LEARNING_CRON` | false | Marca source=cron |
| `AUTONOMOUS_PRODUCTION` | false | Sin writes prod |

Sin flags → fallback local, sin API externa, sin producción.

---

## 5. UI

`/os/autonomous/learning` muestra:

- Panel alertas
- Botones export CSV
- Última actualización + estado refresh (manual/cron)
- Métricas existentes Phase O

---

## 6. Limitaciones

- Alertas CR requieren tendencia ≥14 días o snapshot previo
- Exports no se regeneran hasta ejecutar refresh
- Sin notificaciones push/email (solo dashboard)
- Sin mutación desde UI (read-only)
- Snapshot por template_id (no por sector slice)

---

## 7. Tests

```bash
pnpm -C apps/web test -- ../../backend/autonomous/__tests__/phaseP.test.ts
pytest backend/tests/test_os_autonomous_learning.py -q
```

---

## 8. Siguiente paso recomendado

**Phase Q — Notificaciones ops + A/B template comparison**

- Webhook Slack/email para alertas `crit`
- Comparativa A/B por sector en UI
- Auto-refresh vía scheduler OS interno
