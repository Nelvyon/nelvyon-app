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
| MANTENER | 3 | definido, con lo que necesita y con dueño |
| MEJORAR | 3 | se puede prestar, pero está definido a medias |
| COMPLETAR | 19 | declarado y casi vacío: prometerlo hoy es arriesgado |
| REVISAR | 0 | algo no cuadra; que lo mire una persona |

**Ningún veredicto es ELIMINAR.** Quitar un servicio afecta a clientes que quizá
lo tengan contratado, y este análisis no tiene ni de lejos la información para
esa decisión. Sólo dice cuáles están flojos.

---

## Servicio a servicio

| Servicio | Dimensiones propias | Las aporta el cliente | Departamento | Veredicto |
|---|---:|---:|---|---|
| `ads_premium` | 13 | 7 | paid_media | **MANTENER** |
| `seo_premium` | 6 | 4 | seo, seo_tecnico, seo_local | **MANTENER** |
| `social_media_premium` | 4 | 3 | social | **MANTENER** |
| `email_marketing_premium` | 3 | 1 | email_lifecycle, crm | **MEJORAR** |
| `contenido_copywriting_premium` | 3 | 1 | contenido, copy | **MEJORAR** |
| `funnel_premium` | 3 | 1 | funnels, cro | **MEJORAR** |
| `ecommerce_premium` | 1 | 1 | ecommerce | **COMPLETAR** |
| `branding_premium` | 1 | 1 | marca | **COMPLETAR** |
| `bots_premium` | 1 | 1 | **ninguno** | **COMPLETAR** |
| `advisor_empresarial_premium` | 1 | 0 | estrategia | **COMPLETAR** |
| `canales_comunicaciones_premium` | 1 | 1 | **ninguno** | **COMPLETAR** |
| `diseno_grafico_creatividades_premium` | 1 | 0 | creatividad | **COMPLETAR** |
| `influencer_marketing_premium` | 1 | 1 | **ninguno** | **COMPLETAR** |
| `web_premium` | 0 | 0 | **ninguno** | **COMPLETAR** |
| `voz_premium` | 0 | 0 | **ninguno** | **COMPLETAR** |
| `personal_digital_premium` | 0 | 0 | **ninguno** | **COMPLETAR** |
| `video_multimedia_premium` | 0 | 0 | **ninguno** | **COMPLETAR** |
| `3d_contenido_inmersivo_premium` | 0 | 0 | **ninguno** | **COMPLETAR** |
| `fotografia_producto_premium` | 0 | 0 | **ninguno** | **COMPLETAR** |
| `consultoria_automatizacion_premium` | 0 | 0 | **ninguno** | **COMPLETAR** |
| `integraciones_apis_premium` | 0 | 0 | **ninguno** | **COMPLETAR** |
| `mantenimiento_web_premium` | 0 | 0 | **ninguno** | **COMPLETAR** |
| `reputacion_online_orm_premium` | 0 | 0 | **ninguno** | **COMPLETAR** |
| `formacion_capacitacion_digital_premium` | 0 | 0 | **ninguno** | **COMPLETAR** |
| `landing_premium` | 0 | 0 | **ninguno** | **COMPLETAR** |

---

## El detalle, y qué haría falta

### `ads_premium` — MANTENER

13 dimensiones propias, 7 del cliente, ejecutado por AdsPremiumAgent, departamento paid_media, personalización medida PERSONALIZA (cobertura 0.85).

### `seo_premium` — MANTENER

6 dimensiones propias, 4 del cliente, ejecutado por SeoPremiumAgent, departamento seo, seo_tecnico, seo_local, personalización medida PERSONALIZA (cobertura 1).

### `social_media_premium` — MANTENER

4 dimensiones propias, 3 del cliente, ejecutado por SocialMediaPremiumAgent, departamento social, personalización medida PERSONALIZA (cobertura 0.85).

### `email_marketing_premium` — MEJORAR

3 dimensiones propias y 1 que aporta el cliente. Se puede prestar, pero está definido a medias.

### `contenido_copywriting_premium` — MEJORAR

3 dimensiones propias y 1 que aporta el cliente. Se puede prestar, pero está definido a medias.

### `funnel_premium` — MEJORAR

3 dimensiones propias y 1 que aporta el cliente. Se puede prestar, pero está definido a medias.

### `ecommerce_premium` — COMPLETAR

declara 1 dimensión propia. Está definido casi al mínimo.

### `branding_premium` — COMPLETAR

declara 1 dimensión propia. Está definido casi al mínimo.

### `bots_premium` — COMPLETAR

declara 1 dimensión propia. Está definido casi al mínimo.

### `advisor_empresarial_premium` — COMPLETAR

declara 1 dimensión propia. Está definido casi al mínimo.

### `canales_comunicaciones_premium` — COMPLETAR

declara 1 dimensión propia. Está definido casi al mínimo.

### `diseno_grafico_creatividades_premium` — COMPLETAR

declara 1 dimensión propia. Está definido casi al mínimo.

### `influencer_marketing_premium` — COMPLETAR

declara 1 dimensión propia. Está definido casi al mínimo.

### `web_premium` — COMPLETAR

ninguna dimensión del cerebro lo menciona. Recibe el contexto común del cliente y las imprescindibles, pero nada específico de esta disciplina: no hay intake propio que le pregunte al cliente lo que este servicio necesita.

### `voz_premium` — COMPLETAR

ninguna dimensión del cerebro lo menciona. Recibe el contexto común del cliente y las imprescindibles, pero nada específico de esta disciplina: no hay intake propio que le pregunte al cliente lo que este servicio necesita.

### `personal_digital_premium` — COMPLETAR

ninguna dimensión del cerebro lo menciona. Recibe el contexto común del cliente y las imprescindibles, pero nada específico de esta disciplina: no hay intake propio que le pregunte al cliente lo que este servicio necesita.

### `video_multimedia_premium` — COMPLETAR

ninguna dimensión del cerebro lo menciona. Recibe el contexto común del cliente y las imprescindibles, pero nada específico de esta disciplina: no hay intake propio que le pregunte al cliente lo que este servicio necesita.

### `3d_contenido_inmersivo_premium` — COMPLETAR

ninguna dimensión del cerebro lo menciona. Recibe el contexto común del cliente y las imprescindibles, pero nada específico de esta disciplina: no hay intake propio que le pregunte al cliente lo que este servicio necesita.

### `fotografia_producto_premium` — COMPLETAR

ninguna dimensión del cerebro lo menciona. Recibe el contexto común del cliente y las imprescindibles, pero nada específico de esta disciplina: no hay intake propio que le pregunte al cliente lo que este servicio necesita.

### `consultoria_automatizacion_premium` — COMPLETAR

ninguna dimensión del cerebro lo menciona. Recibe el contexto común del cliente y las imprescindibles, pero nada específico de esta disciplina: no hay intake propio que le pregunte al cliente lo que este servicio necesita.

### `integraciones_apis_premium` — COMPLETAR

ninguna dimensión del cerebro lo menciona. Recibe el contexto común del cliente y las imprescindibles, pero nada específico de esta disciplina: no hay intake propio que le pregunte al cliente lo que este servicio necesita.

### `mantenimiento_web_premium` — COMPLETAR

ninguna dimensión del cerebro lo menciona. Recibe el contexto común del cliente y las imprescindibles, pero nada específico de esta disciplina: no hay intake propio que le pregunte al cliente lo que este servicio necesita.

### `reputacion_online_orm_premium` — COMPLETAR

ninguna dimensión del cerebro lo menciona. Recibe el contexto común del cliente y las imprescindibles, pero nada específico de esta disciplina: no hay intake propio que le pregunte al cliente lo que este servicio necesita.

### `formacion_capacitacion_digital_premium` — COMPLETAR

ninguna dimensión del cerebro lo menciona. Recibe el contexto común del cliente y las imprescindibles, pero nada específico de esta disciplina: no hay intake propio que le pregunte al cliente lo que este servicio necesita.

### `landing_premium` — COMPLETAR

ninguna dimensión del cerebro lo menciona. Recibe el contexto común del cliente y las imprescindibles, pero nada específico de esta disciplina: no hay intake propio que le pregunte al cliente lo que este servicio necesita.


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
