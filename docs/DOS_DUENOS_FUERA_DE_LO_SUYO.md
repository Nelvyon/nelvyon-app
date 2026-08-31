# Dos dueños no pueden entrar en su propio workspace

> Medido el 2026-08-31 en **solo lectura** contra producción.
> No se ha escrito nada. La corrección requiere autorización explícita.

## Qué pasa

```
workspaces en total          : 3
con el dueño SIN pertenencia : 2

  ws 2   estado=active  creado=2026-07-30  miembros=0
  ws 3   estado=active  creado=2026-08-15  miembros=0
```

Los dueños de los workspaces **2** y **3** no tienen fila en `workspace_members`.
`nelvyon_user_in_workspace()` consulta esa tabla, así que con RLS activo las
políticas les deniegan todo.

**Y no da error.** Devuelve **cero filas**. El cliente entra, y su producto le
aparece vacío. Es el síntoma más caro de diagnosticar que puede dar este
sistema, porque se parece exactamente a «todavía no he hecho nada».

## Qué NO es

**No es un defecto de código vivo.** Los dos caminos de creación están
arreglados, y se comprobó leyéndolos antes de escribir esto:

| Camino | Estado |
|---|---|
| `apps/web/src/lib/platformDbFallback.ts` | inserta la pertenencia tras crear el workspace ✓ |
| `backend/routers/workspace_management.py` | `_asegurar_pertenencia_owner` en la **misma transacción**, entre el `flush` y el `commit`, para que un fallo no deje un workspace huérfano ✓ |

Y las fechas lo confirman: el arreglo entró el **2026-08-20** (`7985ce37`, *«crear
un workspace registra a su dueño; sin eso no hay autoservicio»*). Los dos
workspaces afectados son del **30-jul** y el **15-ago** — anteriores.

**Son filas heredadas.** Un arreglo del camino de código no toca lo que ya
existía, y nadie volvió a mirar.

## Cuánto daño

Los dos workspaces están **vacíos**:

```
nelvyon_clients      ws1=1101   (ws2, ws3: nada)
nelvyon_campaigns    ws1=1319   (ws2, ws3: nada)
deals                vacía
helpdesk_tickets     vacía
```

No hay datos perdidos ni expuestos. Lo que hay es **dos personas que no pueden
usar lo que crearon**.

## Qué se ha hecho sin tocar producción

- `scripts/duenos-sin-su-workspace.mjs` — lo detecta en solo lectura, y aborta
  si su propia conexión pudiera escribir.
- `backend/seguridad/__tests__/laConsultaDeDuenosHuerfanos.test.ts` — fija la
  forma de la consulta, que es la parte que puede fallar callando: un `NOT IN`
  con un `NULL` devuelve cero filas siempre y sin dar error.
- `backend/os-agents/__tests__/` y `apps/web/src/lib/__tests__/` — hay ya una
  prueba de que el camino de creación **sí** escribe la pertenencia, con su
  mutación comprobada.

## Si se autoriza corregirlo

```
ACCIÓN        INSERT INTO workspace_members
                (workspace_id, user_id, email, role, status, joined_at, created_at)
              SELECT w.id, w.user_id, u.email, 'owner', 'active', NOW(), NOW()
                FROM workspaces w
                JOIN users u ON u.id = w.user_id
               WHERE NOT EXISTS (
                       SELECT 1 FROM workspace_members m
                        WHERE m.workspace_id = w.id AND m.user_id = w.user_id
                             AND m.status = 'active');

              Exactamente 2 filas. Idempotente: repetirlo no hace nada.

POR QUÉ       dos dueños ven su producto vacío y no hay error que lo explique

EVIDENCIA     este documento; el detector lo reproduce en solo lectura

RIESGO        BAJO. Sólo AÑADE pertenencias que faltan; no modifica ni borra
              ninguna fila existente. El `NOT EXISTS` impide duplicados.
              El riesgo real sería el contrario: dejarlo como está.

COSTE         0,00 €. Dos INSERT. No activa ningún recurso.

ROLLBACK      DELETE de esas dos filas por (workspace_id, user_id). Conviene
              apuntar los dos pares antes de insertar.

PRECONDICIÓN  volver a ejecutar el detector inmediatamente antes: si el número
              ya no es 2, parar y mirar por qué.

RESULTADO     el detector devuelve 0 afectados y los dos dueños ven lo suyo.
              Como los workspaces están vacíos, no aparecerá contenido nuevo:
              lo que cambia es que dejan de estar bloqueados.
```

**No lo ejecuto.** Escribir en producción no está autorizado.

## Un asunto colateral, medido y aún abierto

`workspace_members` se cuenta de **cuatro formas distintas**, y no coinciden:

| Implementación | ¿Filtra `status='active'`? |
|---|---|
| `backend/routers/billing_usage.py` — **gobierna los límites de plan** | **No** |
| `backend/routers/workspace_management.py` | **No** (y devuelve `0` si falla) |
| `backend/core/salud_negocio.py` | Sí |
| `apps/web/src/lib/platformDbFallback.ts` | Sí |

Es decir: **el número que ve el cliente y el que aplica facturación pueden
diferir.** Un workspace con 2 miembros activos y 3 invitaciones pendientes
mostraría «2» y consumiría 5 asientos del plan — el cliente chocaría con un
límite que no puede ver.

**Hoy no ocurre**: en producción hay 1 sola pertenencia y está activa. Pero
ocurrirá en cuanto se invite a alguien. Unificar el criterio es un cambio de
comportamiento de facturación y **no lo decido yo**.
