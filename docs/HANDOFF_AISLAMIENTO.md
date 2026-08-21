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

---

## Incidente: el rol de la aplicación quedó sin LOGIN (2026-08-21)

**Qué pasó.** Un script de verificación de la migración 559 se ejecutó contra
**producción** haciendo `ALTER ROLE nelvyon_app LOGIN PASSWORD '<aleatoria>'`,
sus comprobaciones, y `ALTER ROLE nelvyon_app NOLOGIN` al terminar.

El patrón es correcto en certificación —es la única forma de comprobar
privilegios *con el rol real* en vez de leer el catálogo y creérselo—. Pero
`nelvyon_app` es el rol con el que se conecta la aplicación. Quedó sin LOGIN y
con una contraseña que nadie conservó: `/health/ready` pasó a 503 con
`database: error`.

**Impacto.** Ninguno en clientes: todavía no hay ninguno real. Con clientes
habría sido una caída completa del producto.

**Causa raíz.** No fue un descuido al teclear. Fue una **suposición equivocada**
—que `nelvyon_app` era un rol de pruebas y no el de la aplicación—. Las
suposiciones no se arreglan prometiendo revisarlas.

**Recuperación** (autorizada, opción A): contraseña nueva aleatoria, `LOGIN`
restaurado, sin tocar grants, RLS, BYPASSRLS ni ningún otro atributo;
`DATABASE_URL` actualizada solo en el servicio `nelvyon-app`; redeploy de ese
servicio. La contraseña no se imprimió, no se guardó en ningún fichero y el
script de rotación se borró al terminar.

**El guard permanente** — `backend/tests/_guardia_de_roles.py`

`comprobar(sql, dsn)` se llama **antes** de ejecutar y lanza
`RolDeProduccionIntocable` si el SQL cambia `LOGIN`, `NOLOGIN`, `PASSWORD`,
`BYPASSRLS`, `SUPERUSER`, `CREATEROLE`, `CREATEDB`, `REPLICATION` (y sus
negativos) y el destino no es de certificación.

Reconoce certificación **por el host**: solo `localhost`, `127.0.0.1`, `[::1]`.
La primera versión aceptaba además bases llamadas `*cert*`/`*test*`; se
descartó porque el nombre de una base es una intención y el host es un hecho —
bastaría una base remota llamada `nelvyon_cert` para que el guard se apartara
justo cuando hace falta. Sin DSN se asume producción.

**La prueba discriminante** — `backend/tests/test_guardia_de_roles.py`, 25 casos.
No comprueba que el guard exista: reproduce el **SQL exacto** del script culpable
y exige las dos mitades.

| SQL del incidente | destino | resultado exigido |
|---|---|---|
| `ALTER ROLE nelvyon_app LOGIN PASSWORD '…'` | producción (host interno) | bloqueado antes de ejecutarse |
| lo mismo | producción (proxy público) | bloqueado |
| lo mismo | `localhost:5434` (certificación) | **permitido** |
| `ALTER ROLE … SET search_path` | producción | permitido (control negativo) |
| `ALTER USER … NOLOGIN` | producción | bloqueado (sinónimo) |
| sin DSN | — | bloqueado (fail-closed) |

La segunda fila es la que importa tanto como la primera: si el guard bloqueara
siempre, rompería las baterías legítimas de RLS —que necesitan ese `ALTER ROLE`
para conectarse como `nelvyon_app` y comprobar el aislamiento de verdad— y
alguien acabaría desactivándolo.

**Dos inventarios vivos** en la misma batería, para que el guard no se quede
atrás cuando aparezca la siguiente batería:

- toda batería que contenga `ALTER ROLE … LOGIN|PASSWORD|BYPASSRLS` tiene que
  estar declarada en una lista explícita;
- ninguna de ellas puede leer `DATABASE_PUBLIC_URL` ni `os.environ["DATABASE_URL"]`
  — estaría a un `export` de repetir el incidente. Todas usan
  `NELVYON_PG_CERT_DSN`, que es de certificación por definición.

**Lección operativa aparte del guard.** El CLI de Railway quedó apuntando a
`staging` en mitad de la sesión. Cualquier `railway run -s Postgres` sin `-e
production` va a otra base. Usar **siempre** `-e production` explícito, y
verificar `current_database()` antes de creer una medición.

### Tres defectos en el propio guard, encontrados al verificarlo

El guard pasó sus 25 pruebas desde el primer momento. No servía para nada. Lo
que lo demostró no fue una prueba: fue ir a mirar si alguien lo llamaba.

**1. No lo invocaba nadie.** El módulo existía, sus pruebas pasaban en verde, y
las **13** sentencias `ALTER ROLE` de las baterías seguían ejecutándose
directamente contra la conexión. Un guard que hay que acordarse de llamar es una
convención, y el incidente ocurrió justamente porque nadie se acordó.
Corregido: todas las sentencias de rol pasan por `alterar_rol(conexión, sql, dsn)`
o `alterar_rol_sync(cursor, sql, dsn)`, que comprueban antes de ejecutar. Dos
pruebas nuevas lo exigen — una prohíbe `conexión.execute("ALTER ROLE …")` a pelo,
otra obliga a importar el guard.

**2. El inventario tenía un punto ciego.** Buscaba `ALTER ROLE` y nada más. No
veía `CREATE ROLE` ni `DROP ROLE`, así que declaraba **ocho baterías menos** de
las que realmente tocan roles. `DROP ROLE nelvyon_app` contra producción produce
exactamente la misma caída que el incidente, y no menciona ningún atributo
prohibido: el guard lo dejaba pasar. Total real: **34 sentencias en 14 ficheros**,
no 13 en 7.

**3. Un byte invisible desactivó el guard entero.** Una frontera de palabra de
regex escrita en una cadena sin `r` delante se convierte en un **BACKSPACE real
(0x08)**. El patrón acabó compilado como `\x08(?:ALTER|CREATE|DROP)…` y dejó de
reconocer ni una sola sentencia. El módulo seguía importándose, sus otras pruebas
seguían pasando, y no bloqueaba nada.

El mismo byte estaba en `test_tests_no_capturan_env_al_cargar`, debilitando otra
aserción, y volvió a colarse dos veces más mientras se reparaba — incluida una
vez dentro del patrón del propio inventario, que pasó a no encontrar nada y por
tanto a pasar siempre.

Un regex que no coincide nunca es indistinguible de «no hay problemas». Hay una
prueba que barre todo `backend/**/*.py` buscando el byte.

**Lo que esto dice sobre el método.** Las tres las encontró ir a comprobar si el
guard hacía su trabajo, no ejecutar su batería. Verde no es evidencia de
funcionamiento: es evidencia de que lo que se comprobó salió como se esperaba.

---

## Residuo de certificación envenenando la vista global (2026-08-21)

La suite completa dio **2 fallos** que no tenían que ver con el guard de roles:

```
test_fundador_ausente_e2e::test_si_el_motor_no_corre_el_panel_no_dice_que_todo_va_bien
    con el motor parado el panel dijo: «112 trabajos confirmados en 24 h,
    nada roto, nada esperando decision»
test_vigilante_de_autopilot::test_la_produccion_caida_a_cero_se_ve
    hallazgos = {}
```

**Causa.** Una certificación progresiva anterior se interrumpió a mitad —se paró
el Docker que sostenía la base de certificación— y su `finally` nunca corrió.
Quedaron **140 workspaces `CERTIFICATION-*` y 112 trabajos confirmados**.

`centro_de_control.componer(ambito="todo")` y `salud_negocio.revisar()` miran
**toda** la base: es su trabajo, son la vista del fundador sobre su empresa
entera. Las dos pruebas crean su propio workspace, pero lo que miden incluye lo
que haya dejado cualquier otra ejecución. Con 112 confirmados delante, el panel
contó trabajo ajeno; y al borrar los 4 confirmados de la prueba el acumulado bajó
de 116 a 112, que no es cero, así que el vigilante no vio nada que avisar.

No es un defecto del producto ni del teardown: el teardown está bien escrito,
simplemente no llegó a ejecutarse.

**Lo que sí era un defecto: el residuo empuja siempre hacia el mismo lado.**
Hace que las métricas parezcan sanas. Aquí las pruebas fallaron y se vio. En el
caso simétrico —una comprobación que exige que algo sea mayor que cero— el
residuo la habría puesto en **verde sin que nadie ejecutara nada**.

**Corrección.** `backend/tests/_vista_global_limpia.py`: las tres baterías que
miden la vista global comprueban **antes de medir** que no arrastran trabajo
entregado/confirmado ni workspaces `CERTIFICATION-*` de otra ejecución. Si lo
hay, la batería dice que no puede medir y explica cómo limpiarlo. Un «no puedo
medir» es información; un verde sobre datos ajenos, no.

`test_vista_global_limpia.py` (5 casos) demuestra que distingue base limpia de
base con residuo, que el mensaje incluye los recuentos y cómo limpiarlo, y que
el umbral configurable nunca tolera workspaces residuales.

Base de certificación limpiada: 140 workspaces, 140 usuarios y 1.532 filas
dependientes. No se tocó producción.

**Detalle que costó una iteración.** `pytest.fail` no lanza un `Exception`:
lanza `Failed`, que cuelga de `BaseException`. Un `pytest.raises(Exception)` no
lo atrapa, así que la prueba que debía comprobar el rechazo se caía en vez de
comprobarlo.
