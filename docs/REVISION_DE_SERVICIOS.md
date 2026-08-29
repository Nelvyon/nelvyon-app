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
| COMPLETAR | 4 | declarado y casi vacío: prometerlo hoy es arriesgado |
| REVISAR | 3 | algo no cuadra; que lo mire una persona |

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
| `influencer_marketing_premium` | 1 | 1 | **ninguno** | **REVISAR** |
| `canales_comunicaciones_premium` | 1 | 1 | **ninguno** | **REVISAR** |
| `diseno_grafico_creatividades_premium` | 1 | 0 | creatividad | **COMPLETAR** |
| `advisor_empresarial_premium` | 1 | 0 | estrategia | **COMPLETAR** |
| `bots_premium` | 1 | 1 | **ninguno** | **REVISAR** |

---

## El detalle, y qué haría falta

### `ads_premium` — MANTENER

13 dimensiones propias, 7 del cliente, cubierto por paid_media.

### `seo_premium` — MANTENER

6 dimensiones propias, 4 del cliente, cubierto por seo, seo_tecnico, seo_local.

### `social_media_premium` — MANTENER

4 dimensiones propias, 3 del cliente, cubierto por social.

### `email_marketing_premium` — MEJORAR

declara 3 dimensiones propias y 1 que aporta el cliente. Se puede prestar, pero está definido a medias.

### `contenido_copywriting_premium` — MEJORAR

declara 3 dimensiones propias y 1 que aporta el cliente. Se puede prestar, pero está definido a medias.

### `funnel_premium` — MEJORAR

declara 3 dimensiones propias y 1 que aporta el cliente. Se puede prestar, pero está definido a medias.

### `ecommerce_premium` — COMPLETAR

declara 1 dimensión(es) propias. Recibirá las imprescindibles comunes y prácticamente nada específico suyo: trabajaría a ciegas sobre lo que hace distinto a este servicio.

### `branding_premium` — COMPLETAR

declara 1 dimensión(es) propias. Recibirá las imprescindibles comunes y prácticamente nada específico suyo: trabajaría a ciegas sobre lo que hace distinto a este servicio.

### `influencer_marketing_premium` — REVISAR

ningún departamento operativo lo cubre. Es una promesa sin dueño: si un cliente lo contrata hoy, no hay a quién asignárselo.

### `canales_comunicaciones_premium` — REVISAR

ningún departamento operativo lo cubre. Es una promesa sin dueño: si un cliente lo contrata hoy, no hay a quién asignárselo.

### `diseno_grafico_creatividades_premium` — COMPLETAR

declara 1 dimensión(es) propias. Recibirá las imprescindibles comunes y prácticamente nada específico suyo: trabajaría a ciegas sobre lo que hace distinto a este servicio.

### `advisor_empresarial_premium` — COMPLETAR

declara 1 dimensión(es) propias. Recibirá las imprescindibles comunes y prácticamente nada específico suyo: trabajaría a ciegas sobre lo que hace distinto a este servicio.

### `bots_premium` — REVISAR

ningún departamento operativo lo cubre. Es una promesa sin dueño: si un cliente lo contrata hoy, no hay a quién asignárselo.


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
