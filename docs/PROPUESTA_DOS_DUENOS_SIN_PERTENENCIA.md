# Los dos dueños sin pertenencia — auditoría del 2026-09-02

> Medido en producción en **solo lectura** con
> `scripts/auditar-integridad-de-pertenencia.mjs`. **No se ha insertado nada.**

## Lo que se encontró

```
workspaces: 3   ·   pertenencias: 1   ·   usuarios: 25
claves foraneas en `workspaces`: 0
claves foraneas en `workspace_members`: 0
```

| WS | Nombre | Estado | Plan | Dueño | ¿El dueño existe como usuario? | Pertenencias |
|---|---|---|---|---|---|---|
| 1 | Mi Workspace | active | starter | `35c17b24…` | **sí** | 1 (owner/active) |
| 2 | Mi Workspace | active | starter | `4c7c793f…` | **sí** | **0** |
| 3 | Mi Workspace | active | starter | `c758ba32…` | **NO** | **0** |

**Los dos casos NO son el mismo caso.** Tratarlos igual —que es lo que sugiere
llamarlos «los dos owners»— sería fabricar datos en uno de ellos.

## Por qué importa, y por qué ahora

`nelvyon_user_in_workspace`, el predicado del que cuelga toda la RLS por
workspace, exige una **fila de pertenencia activa**. No mira `workspaces.user_id`.

Hoy no duele porque la aplicación se conecta como `postgres`, que salta RLS. Pero
**el día del cutover a `nelvyon_web_app` los dueños de WS 2 y WS 3 se quedan
fuera de su propio espacio**, y el síntoma será «no veo nada», no un error.

Además `BILLABLE_SEATS` cuenta pertenencias activas: hoy esos dos workspaces
facturan **cero asientos** mientras existen.

## WS 2 — reparable. `READY_FOR_HUMAN_AUTHORIZATION`

El dueño es un usuario real. Falta su fila.

```sql
-- NO EJECUTADO. Requiere autorización explícita.
INSERT INTO public.workspace_members (workspace_id, user_id, email, role, status)
SELECT w.id,
       w.user_id,
       u.email,
       'owner',
       'active'
  FROM public.workspaces w
  JOIN public.nelvyon_users u ON u.user_id::text = w.user_id::text
 WHERE w.id = 2
ON CONFLICT DO NOTHING;
```

**Por qué esta forma exacta:**

- **`SELECT … FROM workspaces JOIN nelvyon_users`, no valores escritos a mano.**
  El `JOIN` es la comprobación: si el dueño no fuera un usuario, la sentencia
  inserta cero filas en vez de fabricar una pertenencia fantasma.
- **`ON CONFLICT DO NOTHING`** la hace idempotente. Existe
  `uq_workspace_members_ws_user` sobre `(workspace_id, user_id)` con `user_id`
  no vacío, así que ejecutarla dos veces no duplica.
- **`id` no se da**: tiene `nextval('workspace_members_id_seq')`.
- **`role = 'owner'`** cumple `workspace_members_role_valido`.
- **`status = 'active'`** cumple `workspace_members_status_ck`, el CHECK que
  introdujo la migración 590.

**Efecto medido:**

| | Antes | Después |
|---|---|---|
| Filas insertadas | — | **1** |
| Asientos facturables del WS 2 | 0 | **1** |
| Acceso del dueño tras el cutover | denegado | concedido |
| Reversible | — | sí: `DELETE … WHERE workspace_id=2 AND role='owner'` |

**Cambia facturación** (0 → 1 asiento en plan `starter`). Aunque casi con
seguridad esté dentro de lo incluido, es un cambio de facturación y por eso se
documenta en vez de aplicarse.

## WS 3 — NO insertar. `BUSINESS_DECISION_REQUIRED`

El dueño `c758ba32-…` **no existe en `nelvyon_users`** (25 usuarios) **ni en
`saas_tenants`**. El workspace se creó el 2026-08-15.

Insertarle una pertenencia no sería una reparación: sería **inventar un miembro
que apunta a nadie**. Y como no hay clave foránea, la base lo aceptaría sin
protestar — que es precisamente por lo que se llegó a este estado.

Antes de tocarlo hay que decidir qué es:

- ¿un registro que nunca se completó?
- ¿una cuenta borrada que dejó su workspace atrás?
- ¿un workspace de prueba?

Según la respuesta, lo correcto es **archivar el workspace**, **reasignarlo a un
dueño real**, o **borrarlo** — nunca darle un miembro inventado.

## El defecto de fondo

**Ninguna de las dos tablas tiene claves foráneas.** Por eso la base admite un
workspace cuyo dueño no existe, y por eso este estado pudo darse en silencio.

Añadirlas hoy exige decidir antes qué se hace con WS 3, porque una `FOREIGN KEY`
sobre `workspaces.user_id` **no validaría** con esa fila dentro. El orden
correcto es: decidir WS 3 → limpiar → añadir las claves foráneas.

`scripts/auditar-integridad-de-pertenencia.mjs` vigila las cuatro condiciones
mientras esas claves no existan.
