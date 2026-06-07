# NELVYON — Ads Agents Roadmap & Audit

**Versión:** 1.0  
**Fecha:** 2026-06-07  
**Estado:** Auditoría + planificación — **sin cambios de código**  
**Congelado:** Nuevas fases OS · SaaS · Portal

---

## 1. Resumen ejecutivo

| Agente | Código | Modo actual | API real | OAuth cliente |
|--------|--------|-------------|----------|---------------|
| **Google Ads Agent** | `AdsGoogleAgent` | LLM advisory | `GoogleAdsService` mock sin creds | Requerido para launch |
| **Meta Ads Agent** | `AdsMetaAgent` | LLM advisory | `MetaAdsService` mock sin creds | Requerido para launch |
| **Creative Agent** | `AdsCreatividadesAgent` | LLM advisory | Sin generación imagen wired | Opcional DALL·E |
| **Funnel Agent** | `FunnelPremiumAgent` | Pipeline 8 pasos + HTML ZIP | Builder real | No OAuth ads |

**Veredicto:** Los 4 agentes **producen estrategia y documentación** hoy. Lanzamiento de campañas reales depende de OAuth por workspace + variables globales NELVYON. Calidad de salida LLM es buena; **riesgo principal = confundir mock con live**.

---

## 2. Arquitectura actual

```
Cliente / Operador
    │
    ▼
POST /api/os/agents/ads  (agentId: ads-google | ads-meta | ads-creatividades)
    │
    ▼
Ads*Agent.execute(AdsInput)
    │
    ▼
runAdsAgentCore() ──► LLM gpt-4o ──► AdsOutput JSON
    │                      │
    │                      └── enrichAgentContext (GA4/GSC si OAuth)
    │
    └── LearningService.recordOutcome (opcional)

FunnelPremiumAgent (OS job store)
    │
    ▼
8 steps LLM + runFunnelCodegen ──► ZIP publishFunnelZip
```

**Servicios API Python (FastAPI):**

- `backend/services/google_ads_service.py` — GAQL search, create campaign (mock fallback)
- `backend/services/meta_ads_service.py` — facebook-business SDK (mock fallback)
- `backend/services/ads_agent_service.py` — orquestador cross-platform briefing → launch

---

## 3. Google Ads Agent

### 3.1 Identificación

| Campo | Valor |
|-------|-------|
| **ID** | `ads-google` |
| **Clase** | `backend/os-agents/sectors/ads/AdsGoogleAgent.ts` |
| **Core** | `runAdsAgentCore` → prompt Search, PMAX, Demand Gen |
| **API route** | `apps/web/src/pages/api/os/agents/ads.ts` |
| **Persistencia** | Tabla `ads_results` |

### 3.2 Inputs

| Campo | Obligatorio | Fuente |
|-------|-------------|--------|
| `userId` | Sí | JWT cookie `nelvyon_token` |
| `businessContext` | Sí | Body JSON — brief negocio |
| `agentId` | Sí | `"ads-google"` |
| `siteUrl` / `url` / `domain` | No | Enriquecimiento contexto |
| `googleAdsCustomerId` | No | Override cuenta cliente |
| `analyticsPropertyId` | No | GA4 vía OAuth |
| `realDataContext` | No | Datos reales pre-cargados |
| `metadata` | No | Persistido en jsonb sin validar agente |

### 3.3 Outputs

```json
{
  "result": "documento maestro español (estructura campañas, negativas, RSAs)",
  "insights": ["bullets insight"],
  "recommendedActions": ["acciones concretas"]
}
```

**Launch real (vía `AdsAgentService.run_briefing(launch=true)`):**

- Crea campaña Search + sube ad copy si `GOOGLE_ADS_*` configurado
- Sin creds → respuesta mock con `campaign_id` sintético

### 3.4 QA requerido

| Gate | Check |
|------|-------|
| Pre-entrega doc | Estructura ≥ 1 campaña Search + negativas + RSAs |
| Pre-launch | Tracking conversiones verificado (C5 `SERVICES_QA_MASTER`) |
| Post-launch | Smart Bidding solo con volumen conversiones |
| Humano | Revisión operador antes de `launch=true` |

**Scoring doc:** ≥ 85 checklist `GOOGLE_ADS_SOP.md`; **launch bloqueado** sin OAuth cliente activo.

### 3.5 Riesgos

| Riesgo | Severidad | Mitigación |
|--------|-----------|------------|
| Mock mode invisible al usuario | **Alta** | UI badge `mock: true`; checklist pre-launch |
| Token global vs cuenta cliente | **Alta** | Priorizar `oauth_connections` por `userId` |
| Developer token no aprobado Google | **Media** | Verificar MCC antes de prod |
| RSAs fuera políticas Google | **Media** | QA humano + linter claims |
| `GOOGLE_ADS_TOKEN` estático expira | **Media** | Refresh token OAuth por workspace |

### 3.6 Dependencias OAuth cliente

| Provider | Tabla | Scopes típicos |
|----------|-------|----------------|
| `google` | `oauth_connections` | `adwords`, Analytics, Search Console |

**Variables globales (fallback NELVYON):**

| Variable | Uso |
|----------|-----|
| `GOOGLE_ADS_CLIENT_ID` | OAuth app |
| `GOOGLE_ADS_CLIENT_SECRET` | OAuth app |
| `GOOGLE_ADS_REFRESH_TOKEN` | Token servidor |
| `GOOGLE_ADS_DEVELOPER_TOKEN` | API access |
| `GOOGLE_ADS_CUSTOMER_ID` | Cuenta default |
| `GOOGLE_ADS_LOGIN_CUSTOMER_ID` | MCC |
| `GOOGLE_ADS_TOKEN` | Bearer directo (legacy) |
| `OAUTH_ENCRYPTION_KEY` | Cifrado tokens en BD |

**Flujo cliente:** `GET /api/v1/oauth/authorize/google` → callback → `oauth_connections` → agente usa `googleAdsCustomerId` del brief.

---

## 4. Meta Ads Agent

### 4.1 Identificación

| Campo | Valor |
|-------|-------|
| **ID** | `ads-meta` |
| **Clase** | `backend/os-agents/sectors/ads/AdsMetaAgent.ts` |
| **Core** | Advantage+, catálogos, CAPI, creative testing |

### 4.2 Inputs

Igual esquema `AdsInput` + `metaAdAccountId` opcional.

### 4.3 Outputs

Mismo `AdsOutput` — plan Advantage+, ad sets, creatividades, CAPI audit, reglas fatiga.

**Launch real (`MetaAdsService`):**

- `create_campaign` con `META_ACCESS_TOKEN` + `META_AD_ACCOUNT_ID`
- Mock → campañas sintéticas con métricas aleatorias

### 4.4 QA requerido

| Gate | Check |
|------|-------|
| Pre-entrega | Funnel lógico 3–4 ad sets + creative batch |
| Pre-launch | Pixel + CAPI server-side audit |
| Post-launch | Event Match Quality ≥ umbral documentado |
| Regulado | Sin claims prohibidos (salud, finanzas) |

### 4.5 Riesgos

| Riesgo | Severidad | Mitigación |
|--------|-----------|------------|
| Mock campaigns con ROAS ficticio | **Alta** | Flag `mock: true` en dashboard |
| Token larga duración en env | **Alta** | OAuth per-user; rotar |
| Advantage+ sin creatividades suficientes | **Media** | Creative Agent previo |
| CAPI mal configurado | **Alta** | Checklist § META_ADS_SOP |
| Permisos BM insuficientes | **Media** | Validar scopes en connect |

### 4.6 Dependencias OAuth cliente

| Provider | Scopes |
|----------|--------|
| `meta` | `ads_management`, `ads_read`, `business_management` |

**Variables globales:**

| Variable | Uso |
|----------|-----|
| `META_APP_ID` | OAuth + SDK |
| `META_APP_SECRET` | OAuth + SDK |
| `META_ACCESS_TOKEN` | Fallback servidor |
| `META_AD_ACCOUNT_ID` | `act_XXXXX` default |
| `META_REDIRECT_URI` | Callback web |
| `FB_PAGE_ACCESS_TOKEN` | Creatividades página |
| `META_WEBHOOK_VERIFY_TOKEN` | Webhooks |

---

## 5. Creative Agent

### 5.1 Identificación

| Campo | Valor |
|-------|-------|
| **ID ads** | `ads-creatividades` |
| **Clase** | `AdsCreatividadesAgent` |
| **Sector creative** | 8 agentes en `backend/os-agents/sectors/creative/` (ad copy, video script, brand voice…) |
| **API ads** | `POST /api/os/agents/ads` con `ads-creatividades` |
| **API creative** | `POST /api/os/agents/creative` (tabla `creative_results`) |

**Scope este roadmap:** `AdsCreatividadesAgent` = rotación creativa, fatiga, hooks para paid media.

### 5.2 Inputs

`AdsInput` estándar — `businessContext` con ángulos, formatos, funnel stage.

### 5.3 Outputs

- Calendario rotación creativa
- Umbrales alerta fatiga (frecuencia, CTR decay)
- Bank de hooks reutilizables
- Kill rules por CPA/ROAS

**No genera imágenes** en pipeline actual — solo estrategia LLM. Generación visual vía `CreativeService` + DALL·E es capa separada.

### 5.4 QA requerido

| Gate | Check |
|------|-------|
| Doc | ≥ 3 winners por funnel stage |
| Assets | Formatos 1:1 y 9:16 si Meta |
| Brand | C2 `SERVICES_QA_MASTER` — colores/logo |
| Fatiga | Reglas documentadas antes de spend |

### 5.5 Riesgos

| Riesgo | Severidad | Mitigación |
|--------|-----------|------------|
| Estrategia sin assets visuales | **Alta** | Workflow: Creative Agent → diseñador → upload |
| Hooks genéricos sector | **Media** | Template library sectorial Meta |
| Copyright en prompts imagen | **Media** | Solo stock licenciado |
| Ad fatigue no detectada en mock | **Baja** | Conectar insights API post-OAuth |

### 5.6 Dependencias OAuth

**No requiere OAuth** para documento estrategia.  
**Requiere** Meta/Google OAuth para métricas reales de fatiga y para subir creatividades a plataforma.

---

## 6. Funnel Agent

### 6.1 Identificación

| Campo | Valor |
|-------|-------|
| **Service ID** | `funnel_premium` |
| **Clase** | `FunnelPremiumAgent` |
| **Registry** | `OsAgentRegistry.funnel_premium` |
| **Pasos** | 8: análisis → arquitectura → estrategia → CRO → SEO → reporte → codegen HTML → ZIP |

### 6.2 Inputs

`OsJobPayload` vía OS job store:

| Campo | Uso |
|-------|-----|
| `clientName` | Reporte y ZIP |
| `primaryColor` / `secondaryColor` | Design tokens |
| `tenantId` | Publish path |
| Payload ecommerce prompts | Sector y oferta |

### 6.3 Outputs

| Artefacto | Formato |
|-----------|---------|
| Análisis mercado | Markdown (step 1) |
| Arquitectura páginas | JSON/texto (step 2) |
| HTML paso 1–3 | `runFunnelCodegen` determinista |
| ZIP publicado | `publishFunnelZip` → storage OS |
| Reporte ejecutivo | Markdown (step 6) |

### 6.4 QA requerido

| Gate | Check |
|------|-------|
| HTML | 3 pasos navegables, CTA por etapa |
| Mobile | Responsive 375px |
| SEO step 5 | Meta + tracking documentado |
| Integración ads | URLs finales para Google/Meta destino |
| Score | ≥ 85 rubric landing adaptada a funnel |

### 6.5 Riesgos

| Riesgo | Severidad | Mitigación |
|--------|-----------|------------|
| Funnel desalineado con ads | **Media** | Funnel Agent antes de Ads Agents |
| Checkout no wired en funnel HTML | **Media** | Scope Premium explícito |
| ZIP sin hosting | **Baja** | OS entregables + staging CDN |
| Prompts ecommerce en funnel genérico | **Baja** | Parametrizar por sector |

### 6.6 Dependencias OAuth

**Ninguna** para generación funnel.  
**Opcional:** GA4 OAuth para tracking step 5 con datos reales.

---

## 7. Matriz comparativa

| Dimensión | Google | Meta | Creative | Funnel |
|-----------|--------|------|----------|--------|
| Tipo salida | JSON doc + campaña API | JSON doc + campaña API | JSON doc + hooks | HTML + ZIP |
| LLM model | gpt-4o | gpt-4o | gpt-4o | gpt-4o multi-step |
| Mock sin creds | Sí | Sí | No aplica | No |
| OAuth cliente | **Obligatorio launch** | **Obligatorio launch** | Opcional métricas | No |
| QA auto score | Doc only | Doc only | Doc only | Playwright posible |
| Tabla persistencia | `ads_results` | `ads_results` | `ads_results` / `creative_results` | OS jobs |

---

## 8. Roadmap ejecutable (Q2–Q3 2026)

### Fase A — Transparencia mock/live (1 semana, solo config/docs)

- [ ] Documentar en UI estado `GoogleAdsService.is_mock` / `MetaAdsService.is_mock`
- [ ] Checklist pre-launch en `GOOGLE_ADS_SOP.md` / `META_ADS_SOP.md` (ya existe — enforce ops)
- [ ] Verificar `OAUTH_ENCRYPTION_KEY` en Railway prod

### Fase B — OAuth cliente end-to-end (2 semanas)

- [ ] Flujo connect Google/Meta desde workspace cliente
- [ ] `AdsInput` auto-fill `googleAdsCustomerId` / `metaAdAccountId` desde `oauth_connections`
- [ ] Test E2E: connect → briefing → doc (sin launch)

### Fase C — Launch controlado (2 semanas)

- [ ] Gate `launch=true` solo rol operator+
- [ ] Primera campaña test budget ≤ 5€/día
- [ ] Logging campaña ID real vs mock

### Fase D — Creative pipeline (3 semanas)

- [ ] Template library Meta static (§ `TEMPLATE_LIBRARY_MASTER.md`)
- [ ] Wire `CreativeService` post `AdsCreatividadesAgent` output
- [ ] QA visual batch antes de upload Meta

### Fase E — Funnel → Ads handoff (1 semana)

- [ ] Contrato JSON: funnel ZIP URLs → `AdsInput.siteUrl`
- [ ] Piloto coaching + ecommerce

---

## 9. Variables entorno — checklist producción ads

### Railway API (servicio `backend/`)

```env
# OAuth cifrado (obligatorio si hay tokens en BD)
OAUTH_ENCRYPTION_KEY=<64 hex chars>

# Google Ads
GOOGLE_ADS_CLIENT_ID=
GOOGLE_ADS_CLIENT_SECRET=
GOOGLE_ADS_REFRESH_TOKEN=
GOOGLE_ADS_DEVELOPER_TOKEN=
GOOGLE_ADS_CUSTOMER_ID=
GOOGLE_ADS_LOGIN_CUSTOMER_ID=

# Meta Ads
META_APP_ID=
META_APP_SECRET=
META_ACCESS_TOKEN=
META_AD_ACCOUNT_ID=

# LLM (todos los agentes)
OPENAI_API_KEY=
```

### Railway Web (OAuth callbacks)

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=https://<APP>/api/oauth/google/callback
META_APP_ID=
META_APP_SECRET=
META_REDIRECT_URI=https://<APP>/api/oauth/meta/callback
OAUTH_ENCRYPTION_KEY=<mismo valor que API>
```

---

## 10. Criterios Go/No-Go ads en producción

| # | Criterio | Estado actual |
|---|----------|---------------|
| 1 | 4 agentes devuelven JSON válido en staging | ✅ tests `ads.test.ts` |
| 2 | OAuth connect Google + Meta funcional | ⚠️ verificar prod |
| 3 | Mock claramente identificado en UI | ❌ pendiente |
| 4 | Launch bloqueado sin tracking | 📋 SOP only |
| 5 | QA humano pre-launch documentado | ✅ SOPs |
| 6 | Funnel ZIP + ads destino alineados | ⚠️ piloto pendiente |

**Go condicionado:** Fases A + B completas antes de primer cliente con spend real.

---

## 11. Referencias código

| Archivo | Rol |
|---------|-----|
| `backend/os-agents/sectors/ads/shared.ts` | Prompts + `AdsInput`/`AdsOutput` |
| `backend/services/google_ads_service.py` | API Google |
| `backend/services/meta_ads_service.py` | API Meta |
| `backend/services/ads_agent_service.py` | Launch cross-platform |
| `backend/oauth/OAuthService.ts` | Tokens cifrados por usuario |
| `backend/os-agents/agents/FunnelPremiumAgent.ts` | Pipeline funnel |
| `docs/services/GOOGLE_ADS_SOP.md` | QA operativo |
| `docs/services/META_ADS_SOP.md` | QA operativo |
