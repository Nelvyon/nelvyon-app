# Revisión de los servicios

> Generado por `scripts/revision-de-servicios.mjs` el 2026-08-30.
> No se edita a mano: se regenera.

Un servicio de NELVYON no es una línea en una lista de precios: es la promesa de
que alguien va a hacer un trabajo. Para poder cumplirla hacen falta tres cosas,
y las tres se pueden **contar**:

1. **saber qué necesita** — cuántas dimensiones del cerebro declara usar;
2. **saber qué pedirle al cliente** — cuántas las aporta él;
3. **tener quien lo haga** — algún departamento operativo que lo cubra.

De ahí sale el veredicto. **No es un juicio sobre si el servicio merece la
pena** —eso es una decisión de negocio— sino sobre si **hoy está en condiciones
de prometerse**.

| Veredicto | Cuántos | Qué significa |
|---|---|---|
| MANTENER | 29 | definido, con lo que necesita y con dueño |
| MEJORAR | 0 | se puede prestar, pero está definido a medias |
| COMPLETAR | 0 | declarado y casi vacío: prometerlo hoy es arriesgado |
| REVISAR | 0 | algo no cuadra; que lo mire una persona |

**Ningún veredicto es ELIMINAR.** Quitar un servicio afecta a clientes que quizá
lo tengan contratado, y este análisis no tiene ni de lejos la información para
esa decisión. Sólo dice cuáles están flojos.

---

## Servicio a servicio

| Servicio | Dimensiones propias | Las aporta el cliente | Departamento | Veredicto |
|---|---:|---:|---|---|
| `ads_premium` | 15 | 8 | paid_media | **MANTENER** |
| `funnel_premium` | 10 | 5 | funnels, cro | **MANTENER** |
| `ecommerce_premium` | 7 | 4 | ecommerce | **MANTENER** |
| `seo_premium` | 7 | 4 | seo, seo_tecnico, seo_local | **MANTENER** |
| `bots_premium` | 7 | 6 | **ninguno** | **MANTENER** |
| `canales_comunicaciones_premium` | 7 | 6 | **ninguno** | **MANTENER** |
| `social_media_premium` | 7 | 5 | social | **MANTENER** |
| `email_marketing_premium` | 7 | 3 | email_lifecycle, crm | **MANTENER** |
| `advisor_empresarial_premium` | 6 | 4 | estrategia | **MANTENER** |
| `contenido_copywriting_premium` | 6 | 3 | contenido, copy | **MANTENER** |
| `reputacion_online_orm_premium` | 6 | 5 | **ninguno** | **MANTENER** |
| `crm_captacion_premium` | 6 | 5 | **ninguno** | **MANTENER** |
| `branding_premium` | 5 | 4 | marca | **MANTENER** |
| `voz_premium` | 5 | 4 | **ninguno** | **MANTENER** |
| `video_multimedia_premium` | 5 | 4 | **ninguno** | **MANTENER** |
| `3d_contenido_inmersivo_premium` | 5 | 4 | **ninguno** | **MANTENER** |
| `fotografia_producto_premium` | 5 | 4 | **ninguno** | **MANTENER** |
| `diseno_grafico_creatividades_premium` | 5 | 3 | creatividad | **MANTENER** |
| `consultoria_automatizacion_premium` | 5 | 4 | **ninguno** | **MANTENER** |
| `integraciones_apis_premium` | 5 | 4 | **ninguno** | **MANTENER** |
| `influencer_marketing_premium` | 5 | 3 | **ninguno** | **MANTENER** |
| `geo_ai_search_premium` | 5 | 3 | **ninguno** | **MANTENER** |
| `web_premium` | 4 | 2 | **ninguno** | **MANTENER** |
| `personal_digital_premium` | 4 | 3 | **ninguno** | **MANTENER** |
| `mantenimiento_web_premium` | 4 | 3 | **ninguno** | **MANTENER** |
| `formacion_capacitacion_digital_premium` | 4 | 3 | **ninguno** | **MANTENER** |
| `landing_premium` | 4 | 2 | **ninguno** | **MANTENER** |
| `analitica_atribucion_premium` | 4 | 3 | **ninguno** | **MANTENER** |
| `inteligencia_mercado_premium` | 4 | 3 | **ninguno** | **MANTENER** |

---

## El detalle, y qué haría falta

### `ads_premium` — MANTENER

15 dimensiones propias, 8 del cliente, ejecutado por AdsPremiumAgent, departamento paid_media, personalización medida PERSONALIZA (cobertura 1).

### `funnel_premium` — MANTENER

10 dimensiones propias, 5 del cliente, ejecutado por FunnelPremiumAgent, departamento funnels, cro, personalización medida PERSONALIZA (cobertura 1).

### `ecommerce_premium` — MANTENER

7 dimensiones propias, 4 del cliente, ejecutado por EcommercePremiumAgent, departamento ecommerce, personalización medida PERSONALIZA (cobertura 1).

### `seo_premium` — MANTENER

7 dimensiones propias, 4 del cliente, ejecutado por SeoPremiumAgent, departamento seo, seo_tecnico, seo_local, personalización medida PERSONALIZA (cobertura 1).

### `bots_premium` — MANTENER

7 dimensiones propias, 6 del cliente, ejecutado por BotsPremiumAgent, personalización medida PERSONALIZA (cobertura 1).

### `canales_comunicaciones_premium` — MANTENER

7 dimensiones propias, 6 del cliente, ejecutado por ComunicacionesPremiumAgent, personalización medida PERSONALIZA (cobertura 1).

### `social_media_premium` — MANTENER

7 dimensiones propias, 5 del cliente, ejecutado por SocialMediaPremiumAgent, departamento social, personalización medida PERSONALIZA (cobertura 1).

### `email_marketing_premium` — MANTENER

7 dimensiones propias, 3 del cliente, ejecutado por EmailMarketingPremiumAgent, departamento email_lifecycle, crm, personalización medida PERSONALIZA (cobertura 1).

### `advisor_empresarial_premium` — MANTENER

6 dimensiones propias, 4 del cliente, ejecutado por AdvisorEmpresarialPremiumAgent, departamento estrategia, personalización medida PERSONALIZA (cobertura 1).

### `contenido_copywriting_premium` — MANTENER

6 dimensiones propias, 3 del cliente, ejecutado por ContenidoCopywritingPremiumAgent, departamento contenido, copy, personalización medida PERSONALIZA (cobertura 1).

### `reputacion_online_orm_premium` — MANTENER

6 dimensiones propias, 5 del cliente, ejecutado por ReputacionOrmPremiumAgent, personalización medida PERSONALIZA (cobertura 1).

### `crm_captacion_premium` — MANTENER

6 dimensiones propias, 5 del cliente, ejecutado por CrmCaptacionPremiumAgent, personalización medida PERSONALIZA (cobertura 1).

### `branding_premium` — MANTENER

5 dimensiones propias, 4 del cliente, ejecutado por BrandingPremiumAgent, departamento marca, personalización medida PERSONALIZA (cobertura 1).

### `voz_premium` — MANTENER

5 dimensiones propias, 4 del cliente, ejecutado por VozPremiumAgent, personalización medida PERSONALIZA (cobertura 1).

### `video_multimedia_premium` — MANTENER

5 dimensiones propias, 4 del cliente, ejecutado por VideoMultimediaPremiumAgent, personalización medida PERSONALIZA (cobertura 1).

### `3d_contenido_inmersivo_premium` — MANTENER

5 dimensiones propias, 4 del cliente, ejecutado por TresDInmersivoPremiumAgent, personalización medida PERSONALIZA (cobertura 1).

### `fotografia_producto_premium` — MANTENER

5 dimensiones propias, 4 del cliente, ejecutado por FotografiaProductoPremiumAgent, personalización medida PERSONALIZA (cobertura 1).

### `diseno_grafico_creatividades_premium` — MANTENER

5 dimensiones propias, 3 del cliente, ejecutado por DisenoGraficoPremiumAgent, departamento creatividad, personalización medida PERSONALIZA (cobertura 1).

### `consultoria_automatizacion_premium` — MANTENER

5 dimensiones propias, 4 del cliente, ejecutado por ConsultoriaAutomatizacionPremiumAgent, personalización medida PERSONALIZA (cobertura 1).

### `integraciones_apis_premium` — MANTENER

5 dimensiones propias, 4 del cliente, ejecutado por IntegracionesApisPremiumAgent, personalización medida PERSONALIZA (cobertura 1).

### `influencer_marketing_premium` — MANTENER

5 dimensiones propias, 3 del cliente, ejecutado por InfluencerMarketingPremiumAgent, personalización medida PERSONALIZA (cobertura 1).

### `geo_ai_search_premium` — MANTENER

5 dimensiones propias, 3 del cliente, ejecutado por GeoAiSearchPremiumAgent, personalización medida PERSONALIZA (cobertura 1).

### `web_premium` — MANTENER

4 dimensiones propias, 2 del cliente, ejecutado por WebPremiumAgent, personalización medida PERSONALIZA (cobertura 1).

### `personal_digital_premium` — MANTENER

4 dimensiones propias, 3 del cliente, ejecutado por PersonalDigitalPremiumAgent, personalización medida PERSONALIZA (cobertura 1).

### `mantenimiento_web_premium` — MANTENER

4 dimensiones propias, 3 del cliente, ejecutado por MantenimientoWebPremiumAgent, personalización medida PERSONALIZA (cobertura 1).

### `formacion_capacitacion_digital_premium` — MANTENER

4 dimensiones propias, 3 del cliente, ejecutado por FormacionCapacitacionPremiumAgent, personalización medida PERSONALIZA (cobertura 1).

### `landing_premium` — MANTENER

4 dimensiones propias, 2 del cliente, ejecutado por LandingPremiumAgent, personalización medida PERSONALIZA (cobertura 1).

### `analitica_atribucion_premium` — MANTENER

4 dimensiones propias, 3 del cliente, ejecutado por AnaliticaAtribucionPremiumAgent, personalización medida PERSONALIZA (cobertura 1).

### `inteligencia_mercado_premium` — MANTENER

4 dimensiones propias, 3 del cliente, ejecutado por InteligenciaMercadoPremiumAgent, personalización medida PERSONALIZA (cobertura 1).


---

## Lo que este informe NO dice

- **No dice qué servicio vende más ni cuál es más rentable.** Eso no está medido
  y no se puede deducir del árbol.
- **No dice que los MANTENER sean buenos**, sólo que están definidos. Un
  servicio bien definido puede prestarse mal.
- **No compara con lo que ofrece nadie más.** Afirmar qué incluye el servicio de
  otro sin haberlo mirado es inventar.

La medida que falta —y la que de verdad decidiría esto— es qué resultado obtiene
un cliente con cada servicio. Hoy es `NO_MEDIDO`, y lo dice
`docs/LO_QUE_SE_PUEDE_AFIRMAR.md`.
