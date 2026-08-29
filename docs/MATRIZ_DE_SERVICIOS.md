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
| LOCAL_CERTIFIED | 25 |
| PARTIAL | 0 |
| FAIL | 0 |
| **Total** | **25** |

Y **los 25** están en `PRODUCTION_UNVERIFIED`: nada se ha desplegado.

## La matriz

| Servicio | business outcome | icp | domain depth | intake | business brain | specialist agents | tools | execution | qa | approval | measurement | optimization | recovery | e2e | production verified | Estado |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `web_premium` | ✅ | ✅ | ✅ | 🟡 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | LOCAL_CERTIFIED |
| `ecommerce_premium` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | LOCAL_CERTIFIED |
| `seo_premium` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | LOCAL_CERTIFIED |
| `ads_premium` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | LOCAL_CERTIFIED |
| `branding_premium` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | LOCAL_CERTIFIED |
| `voz_premium` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | LOCAL_CERTIFIED |
| `bots_premium` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | LOCAL_CERTIFIED |
| `personal_digital_premium` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | LOCAL_CERTIFIED |
| `advisor_empresarial_premium` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | LOCAL_CERTIFIED |
| `canales_comunicaciones_premium` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | LOCAL_CERTIFIED |
| `social_media_premium` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | LOCAL_CERTIFIED |
| `email_marketing_premium` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | LOCAL_CERTIFIED |
| `contenido_copywriting_premium` | ✅ | ✅ | ✅ | 🟡 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | LOCAL_CERTIFIED |
| `video_multimedia_premium` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | LOCAL_CERTIFIED |
| `3d_contenido_inmersivo_premium` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | LOCAL_CERTIFIED |
| `fotografia_producto_premium` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | LOCAL_CERTIFIED |
| `diseno_grafico_creatividades_premium` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | LOCAL_CERTIFIED |
| `consultoria_automatizacion_premium` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | LOCAL_CERTIFIED |
| `integraciones_apis_premium` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | LOCAL_CERTIFIED |
| `mantenimiento_web_premium` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | LOCAL_CERTIFIED |
| `reputacion_online_orm_premium` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | LOCAL_CERTIFIED |
| `formacion_capacitacion_digital_premium` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | LOCAL_CERTIFIED |
| `influencer_marketing_premium` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | LOCAL_CERTIFIED |
| `landing_premium` | ✅ | ✅ | ✅ | 🟡 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | LOCAL_CERTIFIED |
| `funnel_premium` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | LOCAL_CERTIFIED |

## Qué le falta exactamente a cada uno

### `web_premium` — LOCAL_CERTIFIED

Web Premium.

Personalización medida: **PERSONALIZA** (cobertura 1, separación 0.342).

**A medias:** INTAKE.

**Sin medir:** PRODUCTION_VERIFIED.

### `ecommerce_premium` — LOCAL_CERTIFIED

Ecommerce Premium.

Personalización medida: **PERSONALIZA** (cobertura 1, separación 0.358).

**Sin medir:** PRODUCTION_VERIFIED.

### `seo_premium` — LOCAL_CERTIFIED

SEO Premium.

Personalización medida: **PERSONALIZA** (cobertura 1, separación 0.389).

**Sin medir:** PRODUCTION_VERIFIED.

### `ads_premium` — LOCAL_CERTIFIED

Ads Premium.

Personalización medida: **PERSONALIZA** (cobertura 1, separación 0.394).

**Sin medir:** PRODUCTION_VERIFIED.

### `branding_premium` — LOCAL_CERTIFIED

Branding Premium.

Personalización medida: **PERSONALIZA** (cobertura 1, separación 0.397).

**Sin medir:** PRODUCTION_VERIFIED.

### `voz_premium` — LOCAL_CERTIFIED

Voz Premium.

Personalización medida: **PERSONALIZA** (cobertura 1, separación 0.431).

**Sin medir:** PRODUCTION_VERIFIED.

### `bots_premium` — LOCAL_CERTIFIED

Bots Premium.

Personalización medida: **PERSONALIZA** (cobertura 1, separación 0.443).

**Sin medir:** PRODUCTION_VERIFIED.

### `personal_digital_premium` — LOCAL_CERTIFIED

Personal Digital Premium.

Personalización medida: **PERSONALIZA** (cobertura 1, separación 0.445).

**Sin medir:** PRODUCTION_VERIFIED.

### `advisor_empresarial_premium` — LOCAL_CERTIFIED

Advisor Empresarial Premium.

Personalización medida: **PERSONALIZA** (cobertura 1, separación 0.436).

**Sin medir:** PRODUCTION_VERIFIED.

### `canales_comunicaciones_premium` — LOCAL_CERTIFIED

Canales y Comunicaciones Premium.

Personalización medida: **PERSONALIZA** (cobertura 1, separación 0.443).

**Sin medir:** PRODUCTION_VERIFIED.

### `social_media_premium` — LOCAL_CERTIFIED

Social Media Premium.

Personalización medida: **PERSONALIZA** (cobertura 1, separación 0.38).

**Sin medir:** PRODUCTION_VERIFIED.

### `email_marketing_premium` — LOCAL_CERTIFIED

Email Marketing Premium.

Personalización medida: **PERSONALIZA** (cobertura 1, separación 0.412).

**Sin medir:** PRODUCTION_VERIFIED.

### `contenido_copywriting_premium` — LOCAL_CERTIFIED

Contenido y Copywriting Premium.

Personalización medida: **PERSONALIZA** (cobertura 1, separación 0.41).

**A medias:** INTAKE.

**Sin medir:** PRODUCTION_VERIFIED.

### `video_multimedia_premium` — LOCAL_CERTIFIED

Video y Multimedia Premium.

Personalización medida: **PERSONALIZA** (cobertura 1, separación 0.429).

**Sin medir:** PRODUCTION_VERIFIED.

### `3d_contenido_inmersivo_premium` — LOCAL_CERTIFIED

3D e Inmersivo Premium.

Personalización medida: **PERSONALIZA** (cobertura 1, separación 0.436).

**Sin medir:** PRODUCTION_VERIFIED.

### `fotografia_producto_premium` — LOCAL_CERTIFIED

Fotografía de Producto Premium.

Personalización medida: **PERSONALIZA** (cobertura 1, separación 0.409).

**Sin medir:** PRODUCTION_VERIFIED.

### `diseno_grafico_creatividades_premium` — LOCAL_CERTIFIED

Diseño Gráfico Premium.

Personalización medida: **PERSONALIZA** (cobertura 1, separación 0.411).

**Sin medir:** PRODUCTION_VERIFIED.

### `consultoria_automatizacion_premium` — LOCAL_CERTIFIED

Consultoría y Automatización Premium.

Personalización medida: **PERSONALIZA** (cobertura 1, separación 0.481).

**Sin medir:** PRODUCTION_VERIFIED.

### `integraciones_apis_premium` — LOCAL_CERTIFIED

Integraciones y APIs Premium.

Personalización medida: **PERSONALIZA** (cobertura 1, separación 0.436).

**Sin medir:** PRODUCTION_VERIFIED.

### `mantenimiento_web_premium` — LOCAL_CERTIFIED

Mantenimiento Web Premium.

Personalización medida: **PERSONALIZA** (cobertura 1, separación 0.425).

**Sin medir:** PRODUCTION_VERIFIED.

### `reputacion_online_orm_premium` — LOCAL_CERTIFIED

Reputación y ORM Premium.

Personalización medida: **PERSONALIZA** (cobertura 1, separación 0.431).

**Sin medir:** PRODUCTION_VERIFIED.

### `formacion_capacitacion_digital_premium` — LOCAL_CERTIFIED

Formación Digital Premium.

Personalización medida: **PERSONALIZA** (cobertura 1, separación 0.431).

**Sin medir:** PRODUCTION_VERIFIED.

### `influencer_marketing_premium` — LOCAL_CERTIFIED

Influencer Marketing Premium.

Personalización medida: **PERSONALIZA** (cobertura 1, separación 0.437).

**Sin medir:** PRODUCTION_VERIFIED.

### `landing_premium` — LOCAL_CERTIFIED

Landing Page Premium.

Personalización medida: **PERSONALIZA** (cobertura 1, separación 0.342).

**A medias:** INTAKE.

**Sin medir:** PRODUCTION_VERIFIED.

### `funnel_premium` — LOCAL_CERTIFIED

Funnel Multi-paso Premium.

Personalización medida: **PERSONALIZA** (cobertura 1, separación 0.358).

**Sin medir:** PRODUCTION_VERIFIED.


---

## Lo que esta matriz NO dice

- **No dice que un PASS sea bueno**, sólo que el eslabón existe y se ha
  comprobado. Un servicio bien montado puede prestarse mal.
- **No dice nada del resultado real para un cliente.** Eso está en
  `docs/LO_QUE_SE_PUEDE_AFIRMAR.md` y sigue en `NOT_MEASURED`.
- **No compara con nadie.** Afirmar qué incluye el servicio de otro sin haberlo
  mirado es inventar.
