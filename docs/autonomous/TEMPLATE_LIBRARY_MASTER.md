# NELVYON — Template Library Master

**Versión:** 1.0  
**Fecha:** 2026-06-07  
**Estado:** Planificación ejecutable — **sin código**  
**Congelado:** Nuevas fases OS · SaaS · Portal — solo biblioteca de plantillas y calidad de servicios

---

## 1. Objetivo

Construir la **biblioteca maestra de plantillas** que alimenta producción autónoma y entregas freelancer con calidad homogénea. Cada plantilla debe ser seleccionable por sector, auditable por QA y puntuada antes de publicar en OS.

**Regla de oro:** Ningún entregable sale a cliente sin plantilla registrada + score ≥ 85 (`AUTONOMOUS_QA_RUBRICS.md`).

---

## 2. Taxonomía de categorías

| # | Categoría | ID interno | Descripción | Repo actual |
|---|-----------|------------|-------------|-------------|
| 1 | Landing templates | `landing` | Páginas CRO 1 objetivo, form + thank-you | Phase H staging + `landing_builder_service` schema |
| 2 | Website templates | `website` | Shells multi-página corporativos | 4 zips (`proactiv`, `foxtrot`, `productized`, `simplistic`) + `web-premium` OS |
| 3 | Ecommerce templates | `ecommerce` | PLP, PDP, checkout shell | `ecommerce-premium` OS template |
| 4 | Chatbot templates | `chatbot` | Flujos FAQ + lead capture | `bots-premium` + `flow_template_id` en JSON contracts |
| 5 | SEO templates | `seo` | Informes, checklists, brief artículo | `seo-premium` checklist + informe HTML pendiente |
| 6 | Google Ads templates | `google_ads` | Estructura cuenta, RSA, negativas | `ads-premium` + `AdsGoogleAgent` (LLM) |
| 7 | Meta Ads templates | `meta_ads` | Advantage+, creatividades, audiencias | `ads-premium` + `AdsMetaAgent` (LLM) |
| 8 | Branding kits | `branding` | Brand book, paleta, social kit | `branding-premium` OS template |
| 9 | Logo systems | `logo` | Monograma, wordmark, combination | `LOGO_SOP.md` — scaffolds SVG pendientes |
| 10 | Automation templates | `automation` | Playbooks JSON, diagramas TO-BE | `consultoria-automatizacion-premium` + `AUTOMATION_SOP.md` |

---

## 3. Clasificación por sectores

Sectores activos en agentes autónomos (`docs/autonomous/sectors/`):

| Sector ID | Agente sector | Prioridad comercial | Plantillas mínimas por categoría |
|-----------|---------------|---------------------|----------------------------------|
| `dental` | `DENTAL_AGENT.md` | P0 | Landing 2 · Web 1 · Ads 2 · Chatbot 1 |
| `legal` | `LEGAL_AGENT.md` | P0 | Landing 2 · Web 1 · SEO 1 · Ads 2 |
| `fitness` | `FITNESS_AGENT.md` | P1 | Landing 2 · Web 1 · Meta 2 · Chatbot 1 |
| `beauty` | `BEAUTY_AGENT.md` | P1 | Landing 2 · Meta 2 · Branding 1 |
| `restaurant` | `RESTAURANT_AGENT.md` | P0 (piloto Phase H) | Landing 2 · Google 1 · Meta 1 |
| `real_estate` | `REAL_ESTATE_AGENT.md` | P1 | Landing 2 · Web 1 · Ads 2 |
| `ecommerce` | `ECOMMERCE_AGENT.md` | P0 | Ecom 2 · Meta 2 · Google 1 |
| `solar` | `SOLAR_AGENT.md` | P1 | Landing 2 · Google 2 · SEO 1 |
| `coaching` | `COACHING_AGENT.md` | P1 | Landing 2 · Funnel 1 · Meta 1 |
| `saas_b2b` | `SAAS_B2B_AGENT.md` | P1 | Web 2 · Landing 1 · Google 1 |

---

## 4. Matriz maestra por categoría

### 4.1 Landing templates

| Campo | Valor |
|-------|-------|
| **Volumen objetivo** | 12 layouts base × 10 sectores = **120 variantes parametrizadas** (fase 1: 24 live) |
| **Prioridad** | **P0** |
| **Origen** | 6 **creadas** (CRO layouts internos) + 6 **compradas** (Aceternity UI Pro) |
| **QA requerido** | Rubric landing `AUTONOMOUS_QA_RUBRICS` §2 + Playwright PW-* (Phase H) |
| **Scoring** | Umbral **≥ 85/100**; bloqueo si L-SOP-01, L-SOP-02, L-TEC-01, L-TEC-02 fallan |

| Layout ID | Origen | Sector seed | Estado |
|-----------|--------|-------------|--------|
| `landing-cro-v3` | creada | restaurant | ✅ Phase H piloto |
| `landing-hero-split` | creada | dental, legal | 🔲 |
| `landing-video-cta` | creada | fitness, coaching | 🔲 |
| `landing-form-long` | creada | solar, real_estate | 🔲 |
| `landing-catalog-bridge` | creada | ecommerce | 🔲 |
| `landing-saas-trial` | comprada | saas_b2b | 🔲 |
| `landing-aceternity-01..06` | comprada | transversal | 🔲 |

---

### 4.2 Website templates

| Campo | Valor |
|-------|-------|
| **Volumen objetivo** | **8 shells** (4 transversales + 4 sectoriales) |
| **Prioridad** | **P0** |
| **Origen** | 4 **compradas** (zips repo) + 4 **creadas** (adaptación sector) |
| **QA requerido** | `WEB_SOP.md` + checklist `web-premium/checklist.ts` + Lighthouse ≥ 85 mobile |
| **Scoring** | ≥ 85; bloqueo sin cookies RGPD si hay formularios |

| Template ID | Origen | Uso | Estado |
|-------------|--------|-----|--------|
| `proactiv-marketing` | comprada | servicios B2B | ✅ zip repo |
| `foxtrot-marketing` | comprada | blog/content | ✅ zip repo |
| `productized-agency` | comprada | agencia | ✅ zip repo |
| `simplistic-saas` | comprada | saas_b2b | ✅ zip repo |
| `web-dental-trust` | creada | dental, legal | 🔲 |
| `web-local-services` | creada | restaurant, beauty | 🔲 |
| `web-ecom-brand` | creada | ecommerce | 🔲 |
| `web-solar-leads` | creada | solar, real_estate | 🔲 |

---

### 4.3 Ecommerce templates

| Campo | Valor |
|-------|-------|
| **Volumen objetivo** | **4** (2 minimal catalog + 2 fashion/lifestyle) |
| **Prioridad** | **P1** |
| **Origen** | 2 **compradas** (ThemeForest/Shopify) + 2 **creadas** (fork `ecommerce-premium`) |
| **QA requerido** | Checkout test Stripe · PLP/PDP responsive · políticas legales |
| **Scoring** | ≥ 85; bloqueo sin PDP template o políticas devolución |

---

### 4.4 Chatbot templates

| Campo | Valor |
|-------|-------|
| **Volumen objetivo** | **10 flujos** (1 por sector + 5 transversales FAQ) |
| **Prioridad** | **P0** |
| **Origen** | **100% creadas** (JSON `flow_template_id`) |
| **QA requerido** | `CHATBOT_SOP.md` + gold set 50 preguntas sector |
| **Scoring** | ≥ 85; bloqueo sin disclaimer sector regulado (legal, dental) |

| Flow ID | Sector | Estado |
|---------|--------|--------|
| `faq-general` | transversal | ✅ contrato JSON |
| `faq-dental` | dental | 🔲 |
| `faq-legal-intake` | legal | 🔲 |
| `faq-restaurant-reservas` | restaurant | 🔲 |
| `lead-solar-calc` | solar | 🔲 |

---

### 4.5 SEO templates

| Campo | Valor |
|-------|-------|
| **Volumen objetivo** | **3** (informe 25pp HTML, checklist 40 ítems, brief artículo) |
| **Prioridad** | **P0** |
| **Origen** | **creadas** |
| **QA requerido** | `SEO_SOP.md` + waiver GSC si `gsc_oauth.connected=false` |
| **Scoring** | ≥ 85; bloqueo sin meta title/description en muestra |

---

### 4.6 Google Ads templates

| Campo | Valor |
|-------|-------|
| **Volumen objetivo** | **20** (10 sectores × 2: Search Starter + PMax Pro) |
| **Prioridad** | **P1** |
| **Origen** | **creadas** (estructura cuenta + RSA pools sectoriales) |
| **QA requerido** | `GOOGLE_ADS_SOP.md` + revisión humana pre-launch |
| **Scoring** | ≥ 85 doc; **no launch** sin tracking verificado (C5 `SERVICES_QA_MASTER`) |

---

### 4.7 Meta Ads templates

| Campo | Valor |
|-------|-------|
| **Volumen objetivo** | **24** (10 sectores × 2 formatos: 1080×1080 + 1080×1920) |
| **Prioridad** | **P1** |
| **Origen** | 12 **creadas** + 12 **compradas** (Creative Market packs base) |
| **QA requerido** | `META_ADS_SOP.md` + CAPI audit checklist |
| **Scoring** | ≥ 85; bloqueo sin pixel/CAPI documentado |

---

### 4.8 Branding kits

| Campo | Valor |
|-------|-------|
| **Volumen objetivo** | **8 kits** (4 comprados seed + 4 generativos sector) |
| **Prioridad** | **P1** |
| **Origen** | 4 **compradas** (Creative Market) + 4 **creadas** |
| **QA requerido** | `BRANDING_SOP.md` + brand book 18pp + tokens JSON |
| **Scoring** | ≥ 85; bloqueo sin paleta 5 colores + 2 tipografías |

---

### 4.9 Logo systems

| Campo | Valor |
|-------|-------|
| **Volumen objetivo** | **24 scaffolds** (8 layouts × 3 variantes: mono, wordmark, combo) |
| **Prioridad** | **P1** |
| **Origen** | **creadas** (pipeline SVG template) |
| **QA requerido** | `LOGO_SOP.md` + contraste WCAG + export SVG/PNG |
| **Scoring** | ≥ 85; bloqueo sin master blanco/negro |

---

### 4.10 Automation templates

| Campo | Valor |
|-------|-------|
| **Volumen objetivo** | **8 playbooks** JSON (CRM sync, lead routing, reporting, onboarding) |
| **Prioridad** | **P1** |
| **Origen** | **creadas** |
| **QA requerido** | `AUTOMATION_SOP.md` + diagrama TO-BE + ROI horas |
| **Scoring** | ≥ 85; bloqueo sin trigger/acción documentados |

---

## 5. Scoring unificado (todas las categorías)

Referencia: `docs/autonomous/AUTONOMOUS_QA_RUBRICS.md` + `docs/services/SERVICES_QA_MASTER.md`.

| Dimensión | Peso landing | Peso ads/SEO | Peso branding |
|-----------|--------------|--------------|---------------|
| SOP compliance | 25% | 25% | 25% |
| Técnico | 25% | 20% | 15% |
| Contenido | 20% | 25% | 30% |
| Conversión / intent | 15% | 20% | 10% |
| SEO / tracking | 15% | 10% | 20% |

| Umbral | Acción |
|--------|--------|
| **≥ 85** | `QA_APPROVED` — elegible OS publish |
| **70–84** | `QA_RETRY` — máx. 3 reintentos agente |
| **< 70** | `QA_BLOCKED` — escalación operador |
| Ítem BLOQUEANTE | Cap score 84 aunque suma mayor |

---

## 6. Origen: comprada vs creada — presupuesto año 1

| Fuente | Categorías | Budget orientativo |
|--------|------------|-------------------|
| Aceternity UI Pro | Landing, Web | €200–400 |
| ThemeForest / Shopify | Ecommerce | €120–160 |
| Creative Market | Branding, Meta static | €80–120 |
| Envato Elements | Stock transversal | €200/año |
| Interno (creada) | Chatbot, SEO, Automation, Logo | Coste cómputo LLM |

**Total adquisición:** €700–1.200 (alineado `AUTONOMOUS_SERVICES_MODE.md` §5.3).

---

## 7. Estructura de carpetas objetivo (repo)

```
templates/
├── registry.json              # Catálogo maestro ID → metadata
├── sectors/
│   ├── dental/
│   ├── legal/
│   ├── fitness/
│   ├── beauty/
│   ├── restaurant/
│   ├── real_estate/
│   ├── ecommerce/
│   ├── solar/
│   ├── coaching/
│   └── saas_b2b/
├── landing/
├── website/
├── ecommerce/
├── chatbot/
├── seo/
├── google-ads/
├── meta-ads/
├── branding/
├── logo/
└── automation/
```

Cada entrada en `registry.json`:

```json
{
  "id": "landing-cro-v3",
  "category": "landing",
  "sectors": ["restaurant", "local_services"],
  "origin": "creada",
  "priority": "P0",
  "qa_rubric": "NELVYON-LANDING",
  "score_min": 85,
  "version": "1.0.0",
  "path": "templates/landing/landing-cro-v3/"
}
```

---

## 8. Plan de ejecución (sin tocar OS/SaaS/Portal)

| Semana | Entregable | Responsable |
|--------|------------|-------------|
| S1 | `registry.json` + 24 landings P0 sectoriales | Ops + diseño |
| S2 | 4 webs sectoriales + informe SEO HTML | Ops |
| S3 | 10 chatbot flows + 8 logo scaffolds | IA + ops |
| S4 | 20 Google + 24 Meta templates + QA batch | Ads lead |
| S5 | 8 branding kits + 8 automation playbooks | Brand + ops |

**Criterio de cierre fase 1:** 24 plantillas live con score ≥ 85 en piloto restaurant + dental + legal.

---

## 9. Dependencias y bloqueos

| Dependencia | Impacto |
|-------------|---------|
| Phase H preview staging | Landing QA Playwright offline |
| `AUTONOMOUS_PREVIEWS_BUCKET` | Preview CDN interna |
| OAuth cliente Google/Meta | Ads templates no se lanzan sin tokens |
| Congelación OS/SaaS/Portal | Solo docs + assets; no nuevas rutas `/os` ni SaaS |

---

## 10. Referencias

- `docs/AUTONOMOUS_SERVICES_MODE.md` §5 Plantillas
- `docs/autonomous/AUTONOMOUS_QA_RUBRICS.md`
- `docs/services/SERVICES_QA_MASTER.md`
- `docs/autonomous/AUTONOMOUS_JSON_CONTRACTS.md`
- `docs/commercial/NELVYON_PORTFOLIO_STRUCTURE.md`
