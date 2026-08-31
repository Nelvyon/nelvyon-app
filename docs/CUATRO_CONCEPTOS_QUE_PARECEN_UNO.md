# Cuatro conceptos de «cuántos miembros», y no son el mismo

> Auditado el 2026-08-31 recorriendo el árbol entero. Actualiza y cierra
> [CUATRO_FORMAS_DE_CONTAR_UN_MIEMBRO.md](CUATRO_FORMAS_DE_CONTAR_UN_MIEMBRO.md),
> que describía la divergencia **antes** de que se decidiera la política.

## La política, ya decidida

**Una invitación pendiente NO consume asiento. Una pertenencia activa SÍ.**

## Los cuatro conceptos

| Concepto | Qué cuenta | Dónde vive | Qué decide |
|---|---|---|---|
| **BILLABLE_SEATS** | `status = 'active'`, por workspace | `billing_usage._count_workspace_members` | plan y facturación |
| **ACTIVE_MEMBERS** | idem | `workspace_management._count_workspace_members`, `platformDbFallback.countMembers` | lo que ve el cliente |
| **INVITE_CAP** | **todas** las filas, invitaciones incluidas | `core/tope_de_miembros` | tope anti-abuso (50) |
| **TOTAL_MEMBERSHIP_ROWS** | todas, **sin** workspace | `core/salud_negocio.py`, `scripts/prepare_staging.py` | métrica interna, no decide nada |

**BILLABLE_SEATS y ACTIVE_MEMBERS dan el mismo número a propósito**: el cliente
tiene que ver exactamente lo que se le cobra. Que fueran distintos era el defecto
original — el cliente veía 2 y el plan le cobraba 5.

**INVITE_CAP es deliberadamente distinto.** Si filtrara por activos se podrían
mandar invitaciones sin fin, porque ninguna contaría hasta ser aceptada. Se
cuenta por filas justamente para que no dependa de lo que se cobra.

## El defecto que se encontró: el tope tenía tres puertas y vigilaba una

`MAX_MIEMBROS_POR_WORKSPACE = 50` se aplicaba **sólo** en la ruta de invitación,
y allí muy bien: `FOR UPDATE` sobre el workspace e `INSERT ... SELECT ... WHERE
count < tope`, atómico.

Pero `backend/routers/workspace_members.py` —el CRUD genérico, que `main.py`
monta por descubrimiento automático igual que todos— expone:

```
POST /api/v1/entities/workspace_members          ← sin tope
POST /api/v1/entities/workspace_members/batch    ← sin tope
```

Un operador del workspace podía crear pertenencias sin límite. Por el batch,
tantas como cupieran en una petición.

**Corregido**: el tope y su guardián viven en `core/tope_de_miembros.py` y se
aplican por las tres puertas. El batch reserva sitio para todas de una vez —
comprobar de una en una dejaría pasar una petición de treinta con diez huecos
libres, escribiría diez y fallaría a mitad.

**No cambia nada de facturación**: el tope cuenta filas, no asientos.

## Lo que sigue siendo decisión de Daniel

**El límite de asientos del plan (`workspace_users`) se calcula y se muestra,
pero no bloquea.** `billing_usage` lo reporta; ninguna ruta impide superarlo.

No lo cambio: convertir un límite informativo en un límite que bloquea es una
decisión comercial, no un arreglo. Queda medido y dicho.

**`workspaces.max_users`** es una columna que `tenant_management` devuelve con
un `COALESCE(max_users, 10)` y que **nadie comprueba en ninguna parte**. Es un
límite que no limita. Borrarla o aplicarla son las dos opciones, y las dos son
decisión de producto.
