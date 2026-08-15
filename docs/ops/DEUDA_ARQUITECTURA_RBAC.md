# Deuda arquitectónica — `operator` y `member` están colapsados

**Estado**: registrada, **no** resuelta. Decisión explícita de aplazarla al cierre
pre-producción; no bloquea el release porque la autoridad real está certificada
en el upstream.

## El problema

NELVYON tiene **cinco** roles de workspace, definidos en `backend/core/rbac.py`:

```
owner · admin · operator · member · viewer

WORKSPACE_MUTATION_ROLES      = {owner, admin, operator}
WORKSPACE_COLLABORATION_ROLES = {owner, admin, operator, member}
```

Pero la capa de capabilities del BFF solo conoce **cuatro**, y colapsa dos de
ellos. En `backend/saas/saasRbac.ts`:

```ts
export type SaasRole = "owner" | "admin" | "member" | "viewer";

export function mapWorkspaceRoleToSaas(workspaceRole: string): SaasRole {
  ...
  if (r === "operator" || r === "member") return "member";   // <-- aquí
  ...
}
```

`apps/web/src/lib/platformRbac.ts` tiene el mismo modelo de cuatro roles
(`PlatformRole`) y tampoco incluye `operator`.

## Qué impide

No se pueden declarar capabilities nominales del tipo `platform.automations.*`
o `platform.ecommerce.*` de forma **fiel**, porque el modelo no distingue
`operator` de `member`. Cualquiera de las dos opciones incumple la política:

| conceder `platform.automations.write` a… | consecuencia |
|---|---|
| `member` | los `member` reales también la reciben → **amplía privilegios** |
| solo `admin`/`owner` | los `operator` reales la pierden → **regresión funcional**, y contradice `roleMatrix.ts` |

## Por qué no bloquea el release

La autoridad real no está en el BFF: está en las dependencias de FastAPI, que
**sí** distinguen los cinco roles. Automations mantiene
`require_workspace_operator` = `{owner, admin, operator}` en todas sus
mutaciones, que es exactamente lo que `roleMatrix.ts` exige
(`automations.create`/`edit` = `operator`) y lo que excluye a `member` y
`viewer`.

Está certificado endpoint por endpoint en
`backend/tests/test_autorizacion_matriz_producto.py`.

## Qué habría que hacer

1. Añadir `operator` a `SaasRole` y a `PlatformRole`, con su fila propia en
   `ROLE_PERMISSIONS` y `ROLE_CAPABILITIES`.
2. Dejar de colapsarlo en `mapWorkspaceRoleToSaas`.
3. Auditar los ficheros afectados: **7** usan `SaasRole` /
   `mapWorkspaceRoleToSaas`, **16** usan `PlatformRole` /
   `requirePlatformContext`.
4. **Antes de tocar el mapeo**, consultar en lectura qué valores de `role`
   existen realmente en `workspace_members` de producción. La columna es
   `VARCHAR NOT NULL` **sin CHECK** (migración `479_platform_workspaces.sql`),
   así que puede contener cualquier cosa y no hay garantía de que solo estén los
   cinco roles documentados.
5. Solo entonces declarar las capabilities nominales.

El paso 4 es el que hace que esto no sea un refactor mecánico: cambiar el mapeo
altera el significado del rol `member` en toda la superficie de permisos SaaS, y
sin saber qué hay en producción no se puede acotar a cuántos usuarios afecta.

## Contexto adicional

`workspace_members.role` sin restricción de valores es deuda por sí misma: un
rol mal escrito cae en el `else` de `mapWorkspaceRoleToSaas` y se convierte en
`viewer` — fail-closed, que es lo correcto, pero silencioso. Merece un CHECK
cuando se aborde el punto 4.
