# Revisión de los servicios

> Generado por `scripts/revision-de-servicios.mjs` el 2026-08-29.
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
| MANTENER | 11 | definido, con lo que necesita y con dueño |
| MEJORAR | 14 | se puede prestar, pero está definido a medias |
| COMPLETAR | 0 | declarado y casi vacío: prometerlo hoy es arriesgado |
| REVISAR | 0 | algo no cuadra; que lo mire una persona |

**Ningún veredicto es ELIMINAR.** Quitar un servicio afecta a clientes que quizá
lo tengan contratado, y este análisis no tiene ni de lejos la información para
esa decisión. Sólo dice cuáles están flojos.

---

## Servicio a servicio

| Servicio | Dimensiones propias | Las aporta el cliente | Departamento | Veredicto |
|---|---:|---:|---|---|
| `ads_premium` | 14 | 8 | paid_media | **MANTENER** |
| `funnel_premium` | 7 | 4 | funnels, cro | **MANTENER** |
| `seo_premium` | 6 | 4 | seo, seo_tecnico, seo_local | **MANTENER** |
| `social_media_premium` | 6 | 5 | social | **MANTENER** |
| `email_marketing_premium` | 6 | 3 | email_lifecycle, crm | **MANTENER** |
| `ecommerce_premium` | 5 | 4 | ecommerce | **MANTENER** |
| `bots_premium` | 5 | 5 | **ninguno** | **MANTENER** |
| `advisor_empresarial_premium` | 4 | 3 | estrategia | **MANTENER** |
| `canales_comunicaciones_premium` | 4 | 4 | **ninguno** | **MANTENER** |
| `contenido_copywriting_premium` | 4 | 2 | contenido, copy | **MANTENER** |
| `3d_contenido_inmersivo_premium` | 4 | 4 | **ninguno** | **MANTENER** |
| `web_premium` | 3 | 2 | **ninguno** | **MEJORAR** |
| `personal_digital_premium` | 3 | 3 | **ninguno** | **MEJORAR** |
| `fotografia_producto_premium` | 3 | 3 | **ninguno** | **MEJORAR** |
| `diseno_grafico_creatividades_premium` | 3 | 2 | creatividad | **MEJORAR** |
| `consultoria_automatizacion_premium` | 3 | 3 | **ninguno** | **MEJORAR** |
| `mantenimiento_web_premium` | 3 | 3 | **ninguno** | **MEJORAR** |
| `formacion_capacitacion_digital_premium` | 3 | 3 | **ninguno** | **MEJORAR** |
| `influencer_marketing_premium` | 3 | 3 | **ninguno** | **MEJORAR** |
| `landing_premium` | 3 | 2 | **ninguno** | **MEJORAR** |
| `branding_premium` | 2 | 2 | marca | **MEJORAR** |
| `voz_premium` | 2 | 2 | **ninguno** | **MEJORAR** |
| `video_multimedia_premium` | 2 | 2 | **ninguno** | **MEJORAR** |
| `integraciones_apis_premium` | 2 | 2 | **ninguno** | **MEJORAR** |
| `reputacion_online_orm_premium` | 2 | 2 | **ninguno** | **MEJORAR** |

---

## El detalle, y qué haría falta

### `ads_premium` — MANTENER

14 dimensiones propias, 8 del cliente, ejecutado por AdsPremiumAgent, departamento paid_media, personalización medida PERSONALIZA (cobertura 1).

### `funnel_premium` — MANTENER

7 dimensiones propias, 4 del cliente, ejecutado por FunnelPremiumAgent, departamento funnels, cro, personalización medida PERSONALIZA (cobertura 1).

### `seo_premium` — MANTENER

6 dimensiones propias, 4 del cliente, ejecutado por SeoPremiumAgent, departamento seo, seo_tecnico, seo_local, personalización medida PERSONALIZA (cobertura 1).

### `social_media_premium` — MANTENER

6 dimensiones propias, 5 del cliente, ejecutado por SocialMediaPremiumAgent, departamento social, personalización medida PERSONALIZA (cobertura 1).

### `email_marketing_premium` — MANTENER

6 dimensiones propias, 3 del cliente, ejecutado por EmailMarketingPremiumAgent, departamento email_lifecycle, crm, personalización medida PERSONALIZA (cobertura 1).

### `ecommerce_premium` — MANTENER

5 dimensiones propias, 4 del cliente, ejecutado por EcommercePremiumAgent, departamento ecommerce, personalización medida PERSONALIZA (cobertura 1).

### `bots_premium` — MANTENER

5 dimensiones propias, 5 del cliente, ejecutado por BotsPremiumAgent, personalización medida PERSONALIZA (cobertura 1).

### `advisor_empresarial_premium` — MANTENER

4 dimensiones propias, 3 del cliente, ejecutado por AdvisorEmpresarialPremiumAgent, departamento estrategia, personalización medida PERSONALIZA (cobertura 1).

### `canales_comunicaciones_premium` — MANTENER

4 dimensiones propias, 4 del cliente, ejecutado por ComunicacionesPremiumAgent, personalización medida PERSONALIZA (cobertura 1).

### `contenido_copywriting_premium` — MANTENER

4 dimensiones propias, 2 del cliente, ejecutado por ContenidoCopywritingPremiumAgent, departamento contenido, copy, personalización medida PERSONALIZA (cobertura 1).

### `3d_contenido_inmersivo_premium` — MANTENER

4 dimensiones propias, 4 del cliente, ejecutado por TresDInmersivoPremiumAgent, personalización medida PERSONALIZA (cobertura 1).

### `web_premium` — MEJORAR

3 dimensiones propias y 2 que aporta el cliente. Se puede prestar, pero está definido a medias.

### `personal_digital_premium` — MEJORAR

3 dimensiones propias y 3 que aporta el cliente. Se puede prestar, pero está definido a medias.

### `fotografia_producto_premium` — MEJORAR

3 dimensiones propias y 3 que aporta el cliente. Se puede prestar, pero está definido a medias.

### `diseno_grafico_creatividades_premium` — MEJORAR

3 dimensiones propias y 2 que aporta el cliente. Se puede prestar, pero está definido a medias.

### `consultoria_automatizacion_premium` — MEJORAR

3 dimensiones propias y 3 que aporta el cliente. Se puede prestar, pero está definido a medias.

### `mantenimiento_web_premium` — MEJORAR

3 dimensiones propias y 3 que aporta el cliente. Se puede prestar, pero está definido a medias.

### `formacion_capacitacion_digital_premium` — MEJORAR

3 dimensiones propias y 3 que aporta el cliente. Se puede prestar, pero está definido a medias.

### `influencer_marketing_premium` — MEJORAR

3 dimensiones propias y 3 que aporta el cliente. Se puede prestar, pero está definido a medias.

### `landing_premium` — MEJORAR

3 dimensiones propias y 2 que aporta el cliente. Se puede prestar, pero está definido a medias.

### `branding_premium` — MEJORAR

2 dimensiones propias y 2 que aporta el cliente. Se puede prestar, pero está definido a medias.

### `voz_premium` — MEJORAR

2 dimensiones propias y 2 que aporta el cliente. Se puede prestar, pero está definido a medias.

### `video_multimedia_premium` — MEJORAR

2 dimensiones propias y 2 que aporta el cliente. Se puede prestar, pero está definido a medias.

### `integraciones_apis_premium` — MEJORAR

2 dimensiones propias y 2 que aporta el cliente. Se puede prestar, pero está definido a medias.

### `reputacion_online_orm_premium` — MEJORAR

2 dimensiones propias y 2 que aporta el cliente. Se puede prestar, pero está definido a medias.


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
