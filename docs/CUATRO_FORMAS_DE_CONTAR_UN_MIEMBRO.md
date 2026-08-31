# Cuatro formas de contar un miembro, y no coinciden

> Medido el 2026-08-31 en **solo lectura** contra producción y leyendo el código.
> **Nada se ha cambiado.** Unificar el criterio cambia facturación: es una
> decisión de Daniel, no un arreglo.

## Las cuatro implementaciones

| # | Implementación | Quién la usa | ¿Filtra `status='active'`? | ¿Qué hace si falla? |
|---|---|---|---|---|
| 1 | `backend/routers/billing_usage.py::_count_workspace_members` | **límites de plan y asientos** | **No** | propaga |
| 2 | `backend/routers/workspace_management.py::_count_workspace_members` | listado de workspaces (API) | **No** | **devuelve `0`** |
| 3 | `backend/core/salud_negocio.py` | métrica de salud (global, no por workspace) | Sí | propaga |
| 4 | `apps/web/src/lib/platformDbFallback.ts::countMembers` | **lo que ve el cliente** | Sí | propaga |

## Por qué pueden diferir: `status` no tiene restricción

Leído del catálogo de producción:

```
role    NOT NULL + CHECK (owner | admin | operator | member | …)
status  NOT NULL, SIN CHECK          <-- admite cualquier cadena
user_id NOT NULL
UNIQUE (workspace_id, user_id) WHERE user_id IS NOT NULL AND user_id <> ''
```

- **Un rol desconocido es imposible**: el `CHECK` lo impide.
- **Un duplicado es imposible**: el índice único lo impide (salvo `user_id` vacío,
  que ninguna ruta escribe).
- **Un `status` cualquiera SÍ es posible**: no hay `CHECK`. `pending`,
  `invited`, `inactive`, `removed` o cualquier otra cosa entran sin resistencia.

Ahí es donde las cuatro implementaciones se separan.

## La matriz

Filas: qué hay en la tabla. Columnas: qué cuenta cada implementación.

| Caso | 1 · billing | 2 · workspace_mgmt | 3 · salud | 4 · cliente |
|---|---:|---:|---:|---:|
| Dueño con pertenencia activa | 1 | 1 | 1 | 1 |
| Dueño **sin** fila de pertenencia | **0** | **0** | **0** | **0** |
| + miembro `active` | 2 | 2 | 2 | 2 |
| + miembro `pending` | **3** | **3** | 2 | 2 |
| + miembro `inactive` | **3** | **3** | 2 | 2 |
| + miembro `removed` (fila presente) | **3** | **3** | 2 | 2 |
| Duplicado (mismo usuario dos veces) | — imposible — | — imposible — | — imposible — | — imposible — |
| Rol desconocido | — imposible — | — imposible — | — imposible — | — imposible — |
| Workspace vacío | 0 | 0 | 0 | 0 |
| Error al consultar | propaga | **0** | propaga | propaga |

**Las celdas en negrita son las divergencias.** Todo lo demás coincide.

## Qué significa en la práctica

**1 · El cliente y la factura ven números distintos.** Un workspace con 2
miembros activos y 3 invitaciones pendientes muestra **2** en el producto y
consume **5** asientos del plan. El cliente choca con un límite que no puede ver
y no tiene forma de entender por qué.

**2 · `workspace_management` falla abierto.** Devuelve `0` si la consulta
revienta. Un recuento de asientos que da cero ante un error es exactamente al
revés de lo que conviene: cero asientos consumidos parece «todo bien».

**3 · La fila del dueño puede faltar.** No es hipotético: hay **2 workspaces en
producción** cuyo dueño no tiene pertenencia (ver
[DOS_DUENOS_FUERA_DE_LO_SUYO.md](DOS_DUENOS_FUERA_DE_LO_SUYO.md)). Las cuatro
implementaciones cuentan **0** para ellos, así que ni siquiera su dueño cuenta
como asiento.

## Hoy no está ocurriendo

```
workspace_members: 1 fila
estados presentes: active (1)
roles presentes  : owner (1)
divergencia real : 0
```

Con una sola pertenencia activa, las cuatro dan el mismo número. **La
divergencia es estructural, no actual** — aparecerá con la primera invitación.

## Cuál es el contrato canónico, según la evidencia

**El de `billing_usage.py`**, y no por ser mejor: por ser el que **decide**. Es
el que gobierna límites de plan y asientos, así que su recuento es el que tiene
consecuencias económicas. Cualquier unificación tiene que partir de ahí o
cambiar deliberadamente lo que se factura.

Pero su criterio —contar pendientes e inactivos— es discutible: cobrar un
asiento por una invitación que nadie ha aceptado es una decisión comercial, no
un detalle técnico.

## Las dos preguntas que sólo tú puedes responder

**A · ¿Una invitación pendiente consume asiento?**

- Si **sí**: hay que arreglar el lado del cliente (3 y 4) para que muestre el
  mismo número que se cobra. El cliente vería «5» y entendería el límite.
- Si **no**: hay que arreglar facturación (1 y 2) para que filtre por `active`.
  **Esto cambia lo que se cobra**, y por eso no lo toco.

**B · ¿`status` debería tener un `CHECK`?**

Hoy admite cualquier cadena. Un `activo` en castellano, un `Active` con
mayúscula o un `activated` de una integración quedarían fuera de todos los
filtros y contarían distinto en cada implementación. Cerrarlo es una migración
—escritura en producción— y necesita saber antes qué valores existen de verdad.

---

## Lo que sí se ha hecho, sin cambiar semántica

- **El `+1` del dueño** en `platformDbFallback.ts` estaba contándolo dos veces.
  Corregido, con pruebas y mutación: era una compensación que sobrevivió a su
  causa, no una diferencia de criterio.
- **Detector en solo lectura** de dueños sin pertenencia
  (`scripts/duenos-sin-su-workspace.mjs`).

**Ninguna de las dos cambia lo que se factura.**
