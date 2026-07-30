# Ads OAuth + Spend — CEO Checklist

> Capability: `ads_attribution_core` · Module: `backend/agency/AdsAttributionCore.ts`
> Flag: `NELVYON_ADS_SPEND_ENABLED` (default `0`) · Catálogo OS v1.3.0 · Status: `PREPARED_OFF`

## Estado actual (honesto)

Hay **dos capas**:

1. **Agency** `AdsAttributionCore` + conectores fail-closed — sin gasto real (tabla abajo).
2. **SaaS App Router** `/api/oauth/{google,meta,linkedin}` + `GoogleOAuthProvider` / `MetaOAuthProvider` /
   `LinkedInOAuthProvider` — OAuth HTTP **real** cuando hay Client ID/Secret en Railway.
   Spend sigue OFF (`NELVYON_ADS_SPEND_ENABLED=0`). Catálogo hub marca ads como **beta**.

`AdsAttributionCore` implementa el **núcleo sintético** de ads/attribution:

- Borrador de campaña (`buildCampaignDraft`) con objetivos, plataforma, presupuesto diario,
  audiencia y creatividades — siempre `status: "draft"`, `oauthConnected: false`,
  `spendCentsToDate: 0`.
- Audiencias sintéticas por sector (`buildSyntheticAudiences`) — nunca datos reales de
  usuarios ni de plataformas.
- Constructor de UTM (`buildUtmParams` / `appendUtmToUrl`).
- Ledger de eventos de conversión **en memoria** (`recordConversionEvent` /
  `listConversionEvents`) — no hay píxel, webhook ni integración real de conversión.
- Enforcement de tope de presupuesto (`enforceBudgetCap`) — **cualquier** `spendCentsSoFar > 0`
  sin `ceoApproved: true` es un bloqueo duro, sin importar cuán pequeño sea el importe.
- Gates de aprobación CEO + cliente (`evaluateAdsApprovalGates`).
- Snapshot de reporting **siempre sintético**: `impressions: 0`, `clicks: 0`, `spendCents: 0`.

Los tres conectores agency (`GoogleAdsConnector`, `MetaAdsConnector`, `LinkedInAdsConnector`) son
**fail-closed por diseño**:

| Método | Comportamiento |
|---|---|
| `connect()` | Siempre lanza `AdsConnectorBlockedError` con código `BLOCKED_EXTERNAL` — no existe integración OAuth real en este código. |
| `spend()` | Con `NELVYON_ADS_SPEND_ENABLED=0` (default) lanza `SPEND_DISABLED`. Con el flag en `1` lanza `BLOCKED_EXTERNAL` — el flag por sí solo **nunca** puede gastar dinero real porque no hay proveedor real conectado. |

## Antes de conectar cualquier proveedor real

1. **CEO** aprueba por escrito presupuesto máximo mensual/diario por plataforma.
2. Implementación real de OAuth por plataforma (Google Ads API, Meta Marketing API,
   LinkedIn Marketing API) — credenciales en variables de entorno, nunca hardcodeadas.
3. Sustituir los métodos `connect()`/`spend()` de cada conector fail-closed por la
   integración real, manteniendo `enforceBudgetCap` como gate previo a cualquier llamada de
   gasto.
4. `NELVYON_ADS_SPEND_ENABLED=1` solo se activa en producción **después** de 1-3, nunca antes.
5. Evidencia de staging E2E con gasto síntetico (`spendCentsSoFar` simulado) validando que
   `enforceBudgetCap` bloquea sin aprobación CEO, antes de promover `ads_attribution_core` a
   `IMPLEMENTED_VERIFIED` en `backend/agency/OsCatalogV1.ts`.
6. Nunca marcar `ads` (paid media real) como disponible en `servicePacksCatalog.ts` sin este
   checklist completo y firmado.

## Tests

`backend/agency/__tests__/AdsAttributionCore.test.ts` — cubre draft/audiencias/UTM/
conversión/budget cap/approval gates/conectores fail-closed/flag default OFF.

## Forbidden

Gasto real · OAuth real sin CEO · Pepito DB como fuente de audiencias · OpenAI
