# Decisión pendiente · el workspace derivado del inquilino

**Estado:** `BLOCKED_HUMAN_DECISION: STABLE_WORKSPACE_ID_MIGRATION`
**No se ha cambiado nada.** Este documento es el estudio, no la migración.

---

## Qué pasa

`stableWorkspaceIdFromTenant(tenantId)` convierte el UUID de un inquilino en un
número, con un hash multiplicativo por 31 reducido a `% 900_000`. Ese número
viaja en la cabecera `X-Workspace-Id` a FastAPI, que lo usa como unidad de
aislamiento.

Novecientas mil casillas suenan a muchas. No lo son: el límite del cumpleaños
dice que dos inquilinos empiezan a compartir casilla mucho antes de llegar a
novecientos mil clientes.

## Cuánto, medido

Medido con identificadores deterministas en
`elEstudioDeLaColisionDeWorkspace.test.ts`, no con la fórmula:

| Inquilinos | Colisiones | Probabilidad de tener **al menos una** |
|-----------:|-----------:|---------------------------------------:|
| 100 | 0 | 0,5 % |
| 300 | 0 | 4,9 % |
| 500 | 0 | **12,9 %** |
| 1 000 | 0 | **42,6 %** |
| 2 000 | 1 | **89,2 %** |
| 5 000 | 10 | ~100 % |
| 10 000 | 46 | ~100 % |

**Una colisión significa dos inquilinos mandando el mismo `X-Workspace-Id` aguas
arriba.** No es un ataque: es aritmética, y llega sola con el crecimiento.

## Lo primero, y no requiere ninguna decisión

**Averiguar si ya ha pasado.** Se puede saber hoy, sin cambiar nada:

1. `SELECT id FROM saas_tenants ORDER BY created_at;`
2. Agrupar por `stableWorkspaceIdFromTenant(id)`.
3. Cualquier grupo con más de un inquilino es una colisión **activa**.

La detección está escrita y con control positivo en
`elEstudioDeLaColisionDeWorkspace.test.ts` (§3). Si el resultado es cero, hay
tiempo. Si no es cero, hay dos clientes compartiendo datos aguas arriba y eso
deja de ser una decisión de arquitectura para ser un incidente.

## Por qué no se ha corregido

Cambiar la derivación **cambia el identificador de todos los inquilinos que ya lo
usan**. Todo lo que FastAPI tenga guardado bajo el identificador viejo queda
huérfano: no se pierde, deja de encontrarse. Eso no es un parche, es una
migración de identidad, y no se hace desde una sesión de certificación mientras
el dueño duerme.

## Qué forma tendría una migración segura

Lo que la hace viable: **la derivación es pura y determinista**. No consulta
nada, así que durante la transición se puede calcular el identificador viejo *y*
el nuevo para el mismo inquilino. Sin eso, la migración tendría que ser un corte.

1. **Detectar.** ~~Ejecutar la detección de arriba.~~ **HECHO**: ahora es un
   comando, `node scripts/detectar-colision-de-workspace.mjs`. Sólo lee, en
   transacción de sólo lectura, y distingue tres respuestas —sin colisiones (0),
   con colisiones (1) y **no se ha podido comprobar** (2)—, porque «no lo sé» no
   puede parecerse a «no hay problema». Falta ejecutarlo contra producción.
2. ~~**Elegir la fuente correcta.**~~ **HECHO.** No era «un hash mejor»: era
   **dejar de derivar**. `saas_tenants.workspace_id` ya existía, ya era único por
   índice parcial y ya era el workspace de verdad del inquilino.

   Y al mirarlo apareció algo peor que la colisión futura: los tres sitios que
   mandaban `X-Workspace-Id` **no resolvían igual**. `saas/oauth/callback` hacía
   `tenant?.workspaceId ?? derivado` mientras `saas/oauth/connect` —la otra mitad
   del **mismo flujo**— derivaba siempre. Con la columna poblada, la autorización
   salía hacia un workspace y la conexión resultante se guardaba en otro. No es
   un riesgo futuro: pasa en cuanto la 310 rellena la columna.

   Los tres usan ahora `workspaceParaAguasArriba`, que prefiere el puente y sólo
   deriva si está a `NULL`. Para un inquilino sin puente el valor es **idéntico**
   al de antes, así que esto no migra ninguna identidad — sólo deja de depender
   del hash cuando hay algo mejor. Vigilado por
   `test_el_workspace_sale_del_puente.py`, que prohíbe volver a derivar desde una
   ruta y comprueba que la derivación **no ha cambiado de forma**.
3. **Doble lectura.** Durante la transición, leer del identificador nuevo y, si
   no hay nada, del viejo. Escribir siempre en el nuevo.
4. **Copiar.** Mover los datos de FastAPI del identificador viejo al nuevo,
   inquilino por inquilino, con la doble lectura activa. Un inquilino a medio
   copiar sigue funcionando.
5. **Verificar por inquilino**, no en bloque: comparar recuentos antes y después.
6. **Cortar** la lectura del viejo cuando todos estén verificados.
7. **Borrar** lo viejo solo después de un periodo de gracia.

## Cómo se vuelve atrás

En cada fase, y esa es la razón de hacerlo por fases:

- Fases 1–3: no se ha movido nada. Volver atrás es quitar el código nuevo.
- Fase 4: la doble lectura sigue encontrando lo viejo. Volver atrás es dejar de
  escribir en el nuevo.
- Fase 6: reactivar la doble lectura. Los datos viejos siguen ahí.
- Fase 7: **irreversible**. Es la única, y por eso va la última y con espera.

## Cómo se impide que vuelva a pasar

No con un hash de más bits. Con **no derivar**: usar el `workspace_id` que ya
existe y cuya unicidad garantiza un índice de PostgreSQL, no la suerte.

Mientras tanto, `test_los_bloqueos_no_se_disuelven_solos.py` comprueba que la
derivación **no ha cambiado**. Si alguien la toca sin migrar, se pone rojo.

---

## Lo que hace falta de ti

Menos que antes. Los pasos 1 y 2 están hechos, y con el 2 hecho la urgencia baja:
un inquilino con `workspace_id` poblado ya no se deriva, así que **no puede
colisionar**.

1. **Ejecutar la detección contra producción.** Un comando, sólo lectura:

   ```bash
   DATABASE_URL="<produccion>" node scripts/detectar-colision-de-workspace.mjs
   ```

   Si sale **0**, no ha pasado todavía y hay tiempo. Si sale **1**, hay clientes
   compartiendo espacio y deja de ser una decisión de arquitectura para ser un
   incidente. Si sale **2**, no se ha comprobado nada — hay que repetirlo.

2. **Decidir si se migran los identificadores ya emitidos.** Eso sigue siendo
   tuyo: es una operación de identidad sobre datos reales, y todo lo que FastAPI
   tenga guardado bajo el viejo dejaría de encontrarse.

Y hay una tercera vía que no exige decidir nada y que corta el problema de raíz
para los nuevos: **poblar `saas_tenants.workspace_id`** en los inquilinos que lo
tengan a `NULL`. En cuanto lo tienen, dejan de derivarse, y el índice único
parcial impide que dos reciban el mismo. Está demostrado con un control negativo
en la propia detección.
