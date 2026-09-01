# Los dos dueños sin fila de pertenencia — propuesta, sin ejecutar

> Medido en producción el 2026-09-01 en **solo lectura**, después de aplicar 590
> y 591. **No se ha insertado nada.** Requiere autorización aparte.

## Lo que hay

`workspaces` tiene filas cuyo `user_id` —el dueño— no tiene fila en
`workspace_members`. Son dos:

| workspace_id | name | slug | status | plan | user_id |
|---:|---|---|---|---|---|
| 2 | Mi Workspace | default | active | starter | `4c7c793f…` (36 car.) |
| 3 | Mi Workspace | default | active | starter | `c758ba32…` (36 car.) |

Toda la tabla `workspace_members` contiene **1 fila**: `owner` / `active`.

## Por qué importa

`nelvyon_user_in_workspace` acepta por dos vías unidas con `OR`:

```sql
w.user_id = jwt_sub                          -- es el dueño
wm.user_id = jwt_sub AND wm.status='active'  -- es miembro activo
```

Estos dos entran **por la primera**, así que hoy ven sus datos. Lo que no
ocurre es lo demás: no aparecen en el listado de miembros, no cuentan como
asiento, y cualquier consulta que parta de `workspace_members` los ignora.

## Precondición

```sql
-- Debe devolver exactamente 2 filas, con workspace_id 2 y 3.
SELECT w.id, w.user_id
  FROM workspaces w
 WHERE NOT EXISTS (
   SELECT 1 FROM workspace_members m
    WHERE m.workspace_id = w.id AND m.user_id = w.user_id
 );
```

Si devuelve otra cosa, **parar**: el estado ha cambiado desde esta medición.

## La sentencia

Es idempotente por dos vías independientes: el `WHERE NOT EXISTS` y el índice
único `uq_workspace_members_ws_user`. Ejecutarla dos veces no crea duplicados.

```sql
BEGIN;

INSERT INTO workspace_members
  (workspace_id, user_id, email, role, status, created_at)
SELECT w.id, w.user_id, NULL, 'owner', 'active', NOW()::text
  FROM workspaces w
 WHERE NOT EXISTS (
   SELECT 1 FROM workspace_members m
    WHERE m.workspace_id = w.id AND m.user_id = w.user_id
 );

-- Debe decir 2. Si dice otra cosa, ROLLBACK.
-- COMMIT;
```

**`role = 'owner'`** porque es lo que son y porque el `CHECK`
`workspace_members_role_valido` lo admite.
**`status = 'active'`** porque es el único valor que la migración 590 admite
para una pertenencia real, y porque `nelvyon_user_in_workspace` exige
exactamente ése.
**`email = NULL`** porque la columna lo permite y **no sé cuál es**: ponerlo
inventado sería peor que dejarlo vacío.

## Postcondición

```sql
-- 0 dueños sin pertenencia
SELECT count(*) FROM workspaces w
 WHERE NOT EXISTS (SELECT 1 FROM workspace_members m
                    WHERE m.workspace_id = w.id AND m.user_id = w.user_id);

-- 3 filas: la que había más las dos nuevas, todas owner/active
SELECT workspace_id, role, status FROM workspace_members ORDER BY workspace_id;
```

## Rollback

```sql
DELETE FROM workspace_members
 WHERE workspace_id IN (2, 3) AND role = 'owner' AND email IS NULL;
```

Devuelve exactamente al estado anterior: esas dos filas no existían y ninguna
otra cumple las tres condiciones a la vez.

## Impacto — y aquí está lo que hay que decidir

**Estos dos workspaces pasarían de consumir 0 asientos a consumir 1 cada uno.**

Un asiento lo consume una pertenencia `active`, y ahora mismo estos dueños no
tienen ninguna. Al insertarla:

- `billing_usage._count_workspace_members` pasaría de 0 a 1 para cada uno;
- el cliente vería «1 miembro» donde ahora ve «0».

**Hoy no cambia lo que se cobra**, porque el límite de asientos del plan se
calcula y se muestra pero no bloquea, y `starter` admite 3. Pero es un cambio en
un número que alimenta facturación, y por eso no lo hago por mi cuenta.

Lo demás no cambia: siguen viendo sus datos igual (ya entraban por ser dueños), y
ninguna política de RLS depende de esta fila para ellos.
