# AUTONOMOUS Phase N — GA4 Conversion Learning

Conecta métricas de conversión reales (GA4 read-only) al Learning Engine de forma aislada y segura.

## Resumen

| Pieza | Ubicación |
|-------|-----------|
| GA4 adapter | `backend/autonomous/analytics/` |
| Enrich job | `pnpm -C apps/web autonomous:enrich-outcomes` |
| Scoring | `templateRanking.ts` — `conversion_score` con CR y/o leads |
| Output | `enrichedOutcomes.json`, `rankings.json`, `learningReport.json` |

**Autonomía:** 78% → **82%** (+4%)

---

## 1. Variables necesarias

| Variable | Requerida | Default | Efecto |
|----------|-----------|---------|--------|
| `ENABLE_AUTONOMOUS_GA4` | Real mode | `false` | `true` + credenciales → GA4 Data API |
| `GA4_PROPERTY_ID` | Real mode | — | Property ID numérico GA4 |
| `GOOGLE_APPLICATION_CREDENTIALS` | Real mode | — | Ruta JSON service account (read-only) |
| `AUTONOMOUS_GA4_MOCK` | Mock staging | — | `realistic` → métricas mock deterministas |
| `AUTONOMOUS_GA4_DAYS` | Opcional | `30` | Ventana de fechas (máx 90) |
| `ENABLE_TEMPLATE_LEARNING_DB` | Opcional | `false` | Lee outcomes desde Postgres |

**Producción real:** NO activar `ENABLE_AUTONOMOUS_GA4` sin revisión ops y property de staging.

---

## 2. Modos del adapter

```
mock (default)     → conversion_rate=null, lead_count=0, source=none
realistic mock     → AUTONOMOUS_GA4_MOCK=realistic — CR calculado sin API
real GA4           → ENABLE_AUTONOMOUS_GA4 + GA4_PROPERTY_ID + GOOGLE_APPLICATION_CREDENTIALS
fallback           → credenciales inválidas o error API → null, no throw
```

Archivos:

- `ga4Adapter.ts` — entry point
- `ga4MockAdapter.ts` — mock determinista por sector/template
- `ga4RealAdapter.ts` — GA4 Data API `runReport` (sessions + conversions)
- `ga4ServiceAccount.ts` — JWT service account (sin dependencias extra)

---

## 3. Cómo probar mock

```bash
# Métricas null (seguro, default)
pnpm -C apps/web autonomous:enrich-outcomes

# Mock realista — CR y leads calculados
AUTONOMOUS_GA4_MOCK=realistic pnpm -C apps/web autonomous:enrich-outcomes
```

Verificar:

```bash
cat backend/autonomous/output/learning/enrichedOutcomes.json
cat backend/autonomous/output/learning/rankings.json
```

Tests:

```bash
pnpm -C apps/web test -- ../../backend/autonomous/__tests__/phaseN.test.ts
```

---

## 4. Cómo activar GA4 real en staging

1. Crear service account Google con rol **Viewer** en la property GA4 de staging.
2. Descargar JSON y montar en el servidor:

```bash
export ENABLE_AUTONOMOUS_GA4=true
export GA4_PROPERTY_ID="123456789"
export GOOGLE_APPLICATION_CREDENTIALS="/secrets/ga4-sa-staging.json"
export ENABLE_TEMPLATE_LEARNING_DB=true   # opcional, outcomes en Postgres
export DATABASE_URL="postgresql://..."
```

3. Ejecutar enrich:

```bash
pnpm -C apps/web autonomous:enrich-outcomes
```

4. Recalcular selector (si no usó enrich):

```bash
pnpm -C apps/web autonomous:rank-templates
```

El adapter filtra opcionalmente por `pagePath` si el outcome incluye path en notes/metadata.

---

## 5. Métricas guardadas

Por outcome en `enrichedOutcomes.json`:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `sessions` | number | Sesiones en ventana |
| `conversions` | number | Eventos conversión GA4 |
| `conversion_rate` | number \| null | `(conversions/sessions)*100` |
| `lead_count` | number | Alias conversions (hasta webhook leads) |
| `date_range` | object | `{ startDate, endDate }` |
| `source` | string | `mock` \| `ga4` \| `none` |
| `mode` | string | `mock` \| `real` \| `fallback` |

Tras enrich, `rankings.json` usa outcomes fusionados con CR/leads para `conversion_score`.

---

## 6. Cómo cambia el ranking

`computeConversionScore` (Phase N):

1. **Con `conversion_rate`** — peso 50% CR + QA + first-pass + boost suave por `lead_count`
2. **Solo `lead_count`** — señal suave (log-normalizada), sin penalización fuerte
3. **Sin datos** — benchmark sectorial + QA (cold-start, sin castigo agresivo)

Desempate en `rankTemplatesForSlice`: `final_template_score` → `conversion_score` → `quality_score`.

---

## 7. Limitaciones legales / privacidad

- **Solo agregados** — no se almacenan user_id, client_id ni PII de GA4.
- **Read-only** — scope `analytics.readonly`; sin escritura en GA4.
- **Staging first** — property separada del cliente producción hasta acuerdo DPA.
- **Retención** — `enrichedOutcomes.json` en `output/` gitignored; DB `template_outcomes` sin RLS (interno).
- **GDPR** — métricas agregadas; revisar base legal con cliente antes de activar property real.
- **Service account** — rotar claves; nunca commitear JSON de credenciales.

---

## 8. Qué queda para dashboards

| Pendiente | Fase futura |
|-----------|-------------|
| UI interna learning dashboard | Phase O |
| Webhook leads (CRM) además de GA4 | Phase O |
| Ventana rolling 30d automática en cron | Phase O |
| Comparativa template A/B por sector | Phase P |
| Alertas CR caída post-deploy | Phase P |

---

## 9. Comandos

```bash
pnpm -C apps/web autonomous:enrich-outcomes      # Phase N
pnpm -C apps/web autonomous:rank-templates       # Phase M
pnpm -C apps/web autonomous:learning             # Phase K
```

**Cron staging sugerido:**

```cron
0 3 * * * AUTONOMOUS_GA4_MOCK=realistic pnpm -C apps/web autonomous:enrich-outcomes
0 4 * * * pnpm -C apps/web autonomous:rank-templates
```

---

## 10. Siguiente paso recomendado

**Phase O — Learning dashboard interno**

- Vista OS interna (no portal público) con rankings, CR por template, tendencia 30d
- Cron enrich + rank en pipeline CI staging
- Webhook leads opcional para `lead_count` independiente de GA4 conversions
