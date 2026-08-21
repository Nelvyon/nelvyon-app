# Handoff — cierre del aislamiento multiinquilino

Documento vivo. Se actualiza al cerrar cada lote, para que otra sesión continúe
sin rehacer nada.

## Punto de partida

- SHA producción certificado: `a86c1167`
- 460 migraciones aplicadas en producción, pending 0
- 560/561/562 **certificadas en local, NO en producción** (esperan ADR-064)

## Los tres problemas

| # | Sev | Problema | Estado |
|---|-----|----------|--------|
| 1 | HIGH | Tablas de inquilino sin RLS | **111 → 81**, 3 lotes cerrados |
| 2 | HIGH | Dos espacios de identidad: `workspace_id` INT vs `tenant_id` UUID | demostrado y acotado, **sin resolver** |
| 3 | MEDIUM | Tablas sin RLS alcanzables por DML de `nelvyon_app` | 6 de gobierno cerradas (559); el resto abierto |

## Lo que ya está cerrado

| Migración | Qué | Deuda | Evidencia |
|-----------|-----|-------|-----------|
| 559 | 6 tablas de gobierno → solo lectura para la app | — | 6 intentos reales de escritura bloqueados **en producción** |
| 560 | 20 tablas sin ningún consumidor | 111 → 91 | Sin RLS el vecino veía, borraba y se apropiaba; con RLS, los 4 verbos bloqueados |
| 561 | `workspaces` + `workspace_members` | 91 → 90 | 15 pruebas; el selector sigue funcionando sin workspace seleccionado |
| 562 | 9 tablas con escritores autenticados | 90 → 81 | misma batería adversarial, ampliada a 29 tablas |

## Las 81 que quedan, clasificadas

Medido por `scripts/auditar_aislamiento.py` + `scripts/clasificar_escritores.py`.

| Grupo | Nº | Por qué no se cierra igual |
|-------|----|----|
| **Escritas por webhooks / rutas públicas** | 26 | Un webhook **conoce el inquilino pero no tiene usuario**. `nelvyon_user_in_workspace()` devuelve false y la política deniega. Verificado ejecutando. |
| **Escritas por servicios** | 50 | El contexto depende de quién los llame. Hay que leerlas una a una. |
| Resto | 5 | Con datos: `helpdesk_tickets`, `os_cashflow`, `os_deals`, `os_expenses`, `onboarding_workspace_steps` |

### Diseño para las 26 de webhook

El patrón correcto **ya existe y está certificado**: es lo que hace Autopilot.

- **Escrituras** → por `nelvyon_jobs` (BYPASSRLS) con `WHERE workspace_id`
  explícito. El aislamiento lo da la consulta, no RLS.
- **Lecturas** → siguen siendo del usuario autenticado, bajo RLS normal.
- Requiere: cambiar cada manejador a `sesion_de_barrido()` y conceder a
  `nelvyon_jobs` los privilegios mínimos **por tabla y por columna**.

No se hizo aquí porque son 26 caminos de escritura: es un bloque de trabajo
propio, no una migración.

## Dos hallazgos que casi rompen producción

Los dos aparecieron al probar, no al leer, y ambos tienen guard permanente.

### 1. La política estándar habría vaciado el selector de workspaces

`GET /workspaces/list` se consulta **antes** de que haya workspace elegido. La
política estándar exige `workspace_id = workspace_actual`, así que habría
devuelto cero y el usuario leería «no tienes ningún workspace».

→ `workspaces` y `workspace_members` usan política basada en **usuario**.

### 2. `INSERT ... RETURNING` falla si la política de SELECT usa una subconsulta

Una fila devuelta por `RETURNING` debe pasar también la política de `SELECT`. Si
esa política llama a una función `SECURITY DEFINER`, la función consulta con
snapshot nuevo y **la fila recién insertada aún no existe**. SQLAlchemy emite
`INSERT ... RETURNING id` en cada `flush()`.

→ La política compara la columna **directamente** sobre la fila devuelta.
→ Guard: `test_ninguna_politica_de_select_de_estas_dos_depende_solo_de_una_funcion`.

**Regla para cualquier tabla futura:** si la política de SELECT depende de una
subconsulta, el `RETURNING` se rompe.

## Invariantes que NO se pueden romper

1. Ninguna tabla con RLS sin política de `SELECT`: sería invisible para su dueño.
2. Ninguna tabla con RLS sin ninguna política: cero filas para todos. Ya vació
   el producto una vez.
3. `nelvyon_jobs` tiene BYPASSRLS: su aislamiento es el `WHERE workspace_id`.
4. Los guards de gobierno (559) no pueden reabrirse.
5. El trinquete de RLS solo aprieta: si la deuda baja hay que registrarlo.

## Herramientas

- `scripts/auditar_aislamiento.py` — clasifica por dueño, consumidores, riesgo
- `scripts/clasificar_escritores.py` — clasifica escritores por vía de entrada
- `backend/tests/test_rls_trinquete_de_cobertura.py` — la deuda no crece
- `backend/tests/test_rls_lote_560_cross_tenant.py` — adversarial, 29 tablas
- `backend/tests/test_rls_pertenencia_561.py` — las dos fundacionales
- `backend/tests/test_dos_espacios_de_inquilino.py` — problema 2
- `backend/tests/test_gobierno_no_puede_reabrirse.py` — problema 3

## Bitácora

| Fecha | Lote | Resultado |
|-------|------|-----------|
| 2026-08-21 | Medición inicial | 111 sin RLS, 159/167 columnas divergentes, 383 con DML |
| 2026-08-21 | 559 gobierno | 6 tablas cerradas, verificado en producción |
| 2026-08-21 | 560 sin consumidores | 111 → 91 |
| 2026-08-21 | 561 fundacionales | 91 → 90, dos hallazgos críticos |
| 2026-08-21 | 562 autenticadas | 90 → 81 |

## Siguiente paso

1. ADR-064 para 560/561/562 (candidato pendiente de autorización).
2. Bloque de webhooks: 26 tablas, escrituras por `nelvyon_jobs`.
3. Revisión individual de las 50 de servicios.
4. Decisión de producto sobre el espacio de identidad canónico (problema 2).
