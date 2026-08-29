# Matriz de servicios

> Generado por `scripts/matriz-de-servicios.mjs` el 2026-08-29.
> No se edita a mano: se regenera.

Una fila por servicio vendido, una columna por eslabón del ciclo.

**Ninguna celda se marca PASS porque exista un fichero.** Cada columna se deriva
del árbol o de una medición ya ejecutada; `BUSINESS_BRAIN` en concreto sale de
**ejecutar cada agente con cinco clientes distintos**, no de leer su código.

| Símbolo | Estado |
|---|---|
| ✅ | PASS |
| 🟡 | PARTIAL |
| ❌ | FAIL |
| — | NOT_MEASURED |

`NOT_MEASURED` no es un suspenso ni un aprobado: es la ausencia de medición.

## Resumen

| Estado | Servicios |
|---|---:|
| LOCAL_CERTIFIED | 6 |
| PARTIAL | 19 |
| FAIL | 0 |
| **Total** | **25** |

Y **los 25** están en `PRODUCTION_UNVERIFIED`: nada se ha desplegado.

## La matriz

| Servicio | business outcome | icp | domain depth | intake | business brain | specialist agents | tools | execution | qa | approval | measurement | optimization | recovery | e2e | production verified | Estado |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `web_premium` | ✅ | ✅ | 🟡 | 🟡 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | ✅ | ✅ | — | PARTIAL |
| `ecommerce_premium` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | ✅ | 🟡 | ✅ | ✅ | 🟡 | ✅ | ✅ | — | PARTIAL |
| `seo_premium` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | ✅ | ✅ | — | LOCAL_CERTIFIED |
| `ads_premium` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | ✅ | ✅ | — | LOCAL_CERTIFIED |
| `branding_premium` | 🟡 | ✅ | 🟡 | 🟡 | ✅ | ✅ | 🟡 | ✅ | 🟡 | ✅ | 🟡 | 🟡 | ✅ | ✅ | — | PARTIAL |
| `voz_premium` | 🟡 | ✅ | 🟡 | 🟡 | ✅ | ✅ | 🟡 | ✅ | 🟡 | ✅ | 🟡 | 🟡 | ✅ | ✅ | — | PARTIAL |
| `bots_premium` | 🟡 | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | ✅ | 🟡 | ✅ | 🟡 | 🟡 | ✅ | ✅ | — | PARTIAL |
| `personal_digital_premium` | 🟡 | ✅ | 🟡 | ✅ | ✅ | ✅ | 🟡 | ✅ | 🟡 | ✅ | 🟡 | 🟡 | ✅ | ✅ | — | PARTIAL |
| `advisor_empresarial_premium` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | ✅ | ✅ | ✅ | ✅ | 🟡 | ✅ | ✅ | — | LOCAL_CERTIFIED |
| `canales_comunicaciones_premium` | 🟡 | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | ✅ | 🟡 | ✅ | 🟡 | 🟡 | ✅ | ✅ | — | PARTIAL |
| `social_media_premium` | 🟡 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | 🟡 | ✅ | ✅ | — | LOCAL_CERTIFIED |
| `email_marketing_premium` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | ✅ | ✅ | — | LOCAL_CERTIFIED |
| `contenido_copywriting_premium` | 🟡 | ✅ | ✅ | 🟡 | ✅ | ✅ | ✅ | ✅ | 🟡 | ✅ | 🟡 | 🟡 | ✅ | ✅ | — | PARTIAL |
| `video_multimedia_premium` | 🟡 | ✅ | 🟡 | 🟡 | ✅ | ✅ | 🟡 | ✅ | 🟡 | ✅ | 🟡 | 🟡 | ✅ | ✅ | — | PARTIAL |
| `3d_contenido_inmersivo_premium` | 🟡 | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | ✅ | 🟡 | ✅ | 🟡 | 🟡 | ✅ | ✅ | — | PARTIAL |
| `fotografia_producto_premium` | 🟡 | ✅ | 🟡 | ✅ | ✅ | ✅ | 🟡 | ✅ | 🟡 | ✅ | 🟡 | 🟡 | ✅ | ✅ | — | PARTIAL |
| `diseno_grafico_creatividades_premium` | 🟡 | ✅ | 🟡 | 🟡 | ✅ | ✅ | 🟡 | ✅ | 🟡 | ✅ | 🟡 | 🟡 | ✅ | ✅ | — | PARTIAL |
| `consultoria_automatizacion_premium` | 🟡 | ✅ | 🟡 | ✅ | ✅ | ✅ | 🟡 | ✅ | ✅ | ✅ | 🟡 | 🟡 | ✅ | ✅ | — | PARTIAL |
| `integraciones_apis_premium` | 🟡 | ✅ | 🟡 | 🟡 | ✅ | ✅ | 🟡 | ✅ | ✅ | ✅ | 🟡 | 🟡 | ✅ | ✅ | — | PARTIAL |
| `mantenimiento_web_premium` | 🟡 | ✅ | 🟡 | ✅ | ✅ | ✅ | 🟡 | ✅ | ✅ | ✅ | 🟡 | 🟡 | ✅ | ✅ | — | PARTIAL |
| `reputacion_online_orm_premium` | 🟡 | ✅ | 🟡 | 🟡 | ✅ | ✅ | 🟡 | ✅ | ✅ | ✅ | 🟡 | 🟡 | ✅ | ✅ | — | PARTIAL |
| `formacion_capacitacion_digital_premium` | 🟡 | ✅ | 🟡 | ✅ | ✅ | ✅ | 🟡 | ✅ | 🟡 | ✅ | 🟡 | 🟡 | ✅ | ✅ | — | PARTIAL |
| `influencer_marketing_premium` | 🟡 | ✅ | 🟡 | ✅ | ✅ | ✅ | 🟡 | ✅ | ✅ | ✅ | 🟡 | 🟡 | ✅ | ✅ | — | PARTIAL |
| `landing_premium` | ✅ | ✅ | 🟡 | 🟡 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | ✅ | ✅ | — | PARTIAL |
| `funnel_premium` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | ✅ | ✅ | — | LOCAL_CERTIFIED |

## Qué le falta exactamente a cada uno

### `web_premium` — PARTIAL

Web Premium.

Personalización medida: **PERSONALIZA** (cobertura 1, separación 0.342).

**A medias:** DOMAIN_DEPTH, INTAKE, OPTIMIZATION.

**Sin medir:** PRODUCTION_VERIFIED.

### `ecommerce_premium` — PARTIAL

Ecommerce Premium.

Personalización medida: **PERSONALIZA** (cobertura 1, separación 0.358).

**A medias:** TOOLS, QA, OPTIMIZATION.

**Sin medir:** PRODUCTION_VERIFIED.

### `seo_premium` — LOCAL_CERTIFIED

SEO Premium.

Personalización medida: **PERSONALIZA** (cobertura 1, separación 0.389).

**A medias:** OPTIMIZATION.

**Sin medir:** PRODUCTION_VERIFIED.

### `ads_premium` — LOCAL_CERTIFIED

Ads Premium.

Personalización medida: **PERSONALIZA** (cobertura 1, separación 0.394).

**A medias:** OPTIMIZATION.

**Sin medir:** PRODUCTION_VERIFIED.

### `branding_premium` — PARTIAL

Branding Premium.

Personalización medida: **PERSONALIZA** (cobertura 1, separación 0.397).

**A medias:** BUSINESS_OUTCOME, DOMAIN_DEPTH, INTAKE, TOOLS, QA, MEASUREMENT, OPTIMIZATION.

**Sin medir:** PRODUCTION_VERIFIED.

### `voz_premium` — PARTIAL

Voz Premium.

Personalización medida: **PERSONALIZA** (cobertura 1, separación 0.431).

**A medias:** BUSINESS_OUTCOME, DOMAIN_DEPTH, INTAKE, TOOLS, QA, MEASUREMENT, OPTIMIZATION.

**Sin medir:** PRODUCTION_VERIFIED.

### `bots_premium` — PARTIAL

Bots Premium.

Personalización medida: **PERSONALIZA** (cobertura 1, separación 0.443).

**A medias:** BUSINESS_OUTCOME, TOOLS, QA, MEASUREMENT, OPTIMIZATION.

**Sin medir:** PRODUCTION_VERIFIED.

### `personal_digital_premium` — PARTIAL

Personal Digital Premium.

Personalización medida: **PERSONALIZA** (cobertura 1, separación 0.445).

**A medias:** BUSINESS_OUTCOME, DOMAIN_DEPTH, TOOLS, QA, MEASUREMENT, OPTIMIZATION.

**Sin medir:** PRODUCTION_VERIFIED.

### `advisor_empresarial_premium` — LOCAL_CERTIFIED

Advisor Empresarial Premium.

Personalización medida: **PERSONALIZA** (cobertura 1, separación 0.436).

**A medias:** TOOLS, OPTIMIZATION.

**Sin medir:** PRODUCTION_VERIFIED.

### `canales_comunicaciones_premium` — PARTIAL

Canales y Comunicaciones Premium.

Personalización medida: **PERSONALIZA** (cobertura 1, separación 0.443).

**A medias:** BUSINESS_OUTCOME, TOOLS, QA, MEASUREMENT, OPTIMIZATION.

**Sin medir:** PRODUCTION_VERIFIED.

### `social_media_premium` — LOCAL_CERTIFIED

Social Media Premium.

Personalización medida: **PERSONALIZA** (cobertura 1, separación 0.38).

**A medias:** BUSINESS_OUTCOME, MEASUREMENT, OPTIMIZATION.

**Sin medir:** PRODUCTION_VERIFIED.

### `email_marketing_premium` — LOCAL_CERTIFIED

Email Marketing Premium.

Personalización medida: **PERSONALIZA** (cobertura 1, separación 0.412).

**A medias:** OPTIMIZATION.

**Sin medir:** PRODUCTION_VERIFIED.

### `contenido_copywriting_premium` — PARTIAL

Contenido y Copywriting Premium.

Personalización medida: **PERSONALIZA** (cobertura 1, separación 0.41).

**A medias:** BUSINESS_OUTCOME, INTAKE, QA, MEASUREMENT, OPTIMIZATION.

**Sin medir:** PRODUCTION_VERIFIED.

### `video_multimedia_premium` — PARTIAL

Video y Multimedia Premium.

Personalización medida: **PERSONALIZA** (cobertura 1, separación 0.429).

**A medias:** BUSINESS_OUTCOME, DOMAIN_DEPTH, INTAKE, TOOLS, QA, MEASUREMENT, OPTIMIZATION.

**Sin medir:** PRODUCTION_VERIFIED.

### `3d_contenido_inmersivo_premium` — PARTIAL

3D e Inmersivo Premium.

Personalización medida: **PERSONALIZA** (cobertura 1, separación 0.436).

**A medias:** BUSINESS_OUTCOME, TOOLS, QA, MEASUREMENT, OPTIMIZATION.

**Sin medir:** PRODUCTION_VERIFIED.

### `fotografia_producto_premium` — PARTIAL

Fotografía de Producto Premium.

Personalización medida: **PERSONALIZA** (cobertura 1, separación 0.409).

**A medias:** BUSINESS_OUTCOME, DOMAIN_DEPTH, TOOLS, QA, MEASUREMENT, OPTIMIZATION.

**Sin medir:** PRODUCTION_VERIFIED.

### `diseno_grafico_creatividades_premium` — PARTIAL

Diseño Gráfico Premium.

Personalización medida: **PERSONALIZA** (cobertura 1, separación 0.411).

**A medias:** BUSINESS_OUTCOME, DOMAIN_DEPTH, INTAKE, TOOLS, QA, MEASUREMENT, OPTIMIZATION.

**Sin medir:** PRODUCTION_VERIFIED.

### `consultoria_automatizacion_premium` — PARTIAL

Consultoría y Automatización Premium.

Personalización medida: **PERSONALIZA** (cobertura 1, separación 0.481).

**A medias:** BUSINESS_OUTCOME, DOMAIN_DEPTH, TOOLS, MEASUREMENT, OPTIMIZATION.

**Sin medir:** PRODUCTION_VERIFIED.

### `integraciones_apis_premium` — PARTIAL

Integraciones y APIs Premium.

Personalización medida: **PERSONALIZA** (cobertura 1, separación 0.436).

**A medias:** BUSINESS_OUTCOME, DOMAIN_DEPTH, INTAKE, TOOLS, MEASUREMENT, OPTIMIZATION.

**Sin medir:** PRODUCTION_VERIFIED.

### `mantenimiento_web_premium` — PARTIAL

Mantenimiento Web Premium.

Personalización medida: **PERSONALIZA** (cobertura 1, separación 0.425).

**A medias:** BUSINESS_OUTCOME, DOMAIN_DEPTH, TOOLS, MEASUREMENT, OPTIMIZATION.

**Sin medir:** PRODUCTION_VERIFIED.

### `reputacion_online_orm_premium` — PARTIAL

Reputación y ORM Premium.

Personalización medida: **PERSONALIZA** (cobertura 1, separación 0.431).

**A medias:** BUSINESS_OUTCOME, DOMAIN_DEPTH, INTAKE, TOOLS, MEASUREMENT, OPTIMIZATION.

**Sin medir:** PRODUCTION_VERIFIED.

### `formacion_capacitacion_digital_premium` — PARTIAL

Formación Digital Premium.

Personalización medida: **PERSONALIZA** (cobertura 1, separación 0.431).

**A medias:** BUSINESS_OUTCOME, DOMAIN_DEPTH, TOOLS, QA, MEASUREMENT, OPTIMIZATION.

**Sin medir:** PRODUCTION_VERIFIED.

### `influencer_marketing_premium` — PARTIAL

Influencer Marketing Premium.

Personalización medida: **PERSONALIZA** (cobertura 1, separación 0.437).

**A medias:** BUSINESS_OUTCOME, DOMAIN_DEPTH, TOOLS, MEASUREMENT, OPTIMIZATION.

**Sin medir:** PRODUCTION_VERIFIED.

### `landing_premium` — PARTIAL

Landing Page Premium.

Personalización medida: **PERSONALIZA** (cobertura 1, separación 0.342).

**A medias:** DOMAIN_DEPTH, INTAKE, OPTIMIZATION.

**Sin medir:** PRODUCTION_VERIFIED.

### `funnel_premium` — LOCAL_CERTIFIED

Funnel Multi-paso Premium.

Personalización medida: **PERSONALIZA** (cobertura 1, separación 0.358).

**A medias:** OPTIMIZATION.

**Sin medir:** PRODUCTION_VERIFIED.


---

## Lo que esta matriz NO dice

- **No dice que un PASS sea bueno**, sólo que el eslabón existe y se ha
  comprobado. Un servicio bien montado puede prestarse mal.
- **No dice nada del resultado real para un cliente.** Eso está en
  `docs/LO_QUE_SE_PUEDE_AFIRMAR.md` y sigue en `NOT_MEASURED`.
- **No compara con nadie.** Afirmar qué incluye el servicio de otro sin haberlo
  mirado es inventar.
