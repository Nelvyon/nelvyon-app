# Handoff — cierre del aislamiento multiinquilino

Documento vivo. Se actualiza al cerrar cada lote, para que otra sesión continúe
sin rehacer nada.

## SSRF — el SSO permitía apuntar a la red interna, y devolvía la respuesta

`saas_sso_configs.issuer` y `metadata_url` **los elige el inquilino**, y el
servidor hace peticiones a los dos durante el login: un `POST` al endpoint de
token y la descarga del JWKS.

La única validación era `if (!input.issuer.trim())` — **que no estuviera vacío**.

Con `issuer = http://169.254.169.254`, el callback hacía un `POST` al endpoint de
metadatos de la nube. Y devolvía **200 caracteres del cuerpo** en su 502: no era
solo provocar la petición, era **leer el resultado**. Misma clase que la SSRF de
lectura de `webhook_deliveries.response_body`.

**El guardia ya existía** — `safeEgressUrl.ts`, con HTTPS obligatorio, sin
credenciales, RFC1918, link-local, CGNAT, metadata y IPv6 ULA. Lo usaba **un solo
servicio**. El defecto no era falta de herramienta: era no haberla aplicado.

**Corregido**: se valida al guardar **y otra vez justo antes de conectar** —entre
las dos cosas pueden pasar semanas y repuntar el DNS es el ataque clásico contra
un guard que solo valida al registrar— y el cuerpo de la respuesta deja de
devolverse: va al log del servidor.

**21/21**, con 17 destinos prohibidos comprobados y control positivo (Microsoft,
Google, Okta **sí** pasan — «nadie puede salir» no es protección, es una avería).

### Y mis dos pruebas negativas eran falsos verdes

Usaban `.rejects.toThrow()`. **Sin el guardia, `upsertConfig` llega a la conexión
y también lanza**, así que pasaban igual con la validación quitada: la mutación no
las tumbaba. Lo que distingue «lo rechazó el guardia» de «se rompió más adelante»
es el **código** del error, no que haya error. Afiladas a `code === "VALIDATION"`,
las dos mutaciones tumban 2 pruebas cada una.

## GDPR — la supresión de datos no podía completarse, y cancelaba Stripe primero

`deleteUserData` hacía, **en este orden**: (1) cancelar la suscripción de Stripe
—irreversible, en un tercero— y (2) `DELETE FROM user_provider_api_keys`, **una
tabla que no existe en producción**.

Resultado: **la suscripción cancelada y los datos del interesado intactos**. Es el
peor orden posible: la acción externa irreversible primero, y la que de verdad
pide la ley después, donde ya no llega. La exportación tenía el mismo problema y
**no devolvía nada**.

**Corregido**: la acción externa va al final, y `tryQuery`/`tryExec` dejan de
tragarse **cualquier** error — toleran solo «objeto ausente» **con traza** y
propagan el resto. 6/6, mutación en las dos direcciones.

**Y una prueba mía nació inerte**: remataba con `if (iStripe >= 0) expect(...)`, y
esa condición nunca se cumplía sin `STRIPE_SECRET_KEY`. Pasaba sin comprobar nada.
La cazó la mutación.

## Migración 575 — repara lo que la 507 y la 406 no llegaron a crear

**Certificada, NO aplicada.** `BLOCKED_ON_FOUNDER: ADR-064`
SHA256 `355c543758c7025e2373864857f4d6f1d2bcea6776c8a24de969a226ef862c15`

`workflows.edges_json` · `workflow_nodes` · `visual_workflow_executions` ·
`workflow_trigger_registry` (507) · `user_provider_api_keys` (406).

**Causa medida**: `workflows` la crea `create_all` al **arrancar**, pero
`migrate:prod` corre como `preDeployCommand` — **antes**. Las cuatro sentencias
fallaron con `42P01`, se toleraron, y la 507 quedó registrada como aplicada.
Comprobado replicando: con `workflows` presente funcionan.

**No es una decisión de alcance** — se aplica lo que la 507 ya declara.
**Desbloquea el editor visual de workflows.**

Certificación: 4 objetos creados · idempotente · RLS con la familia OS (4+4) y
`workflow_nodes` acotada **por su workflow padre** · aislamiento **funcional** con
el rol real: A ve 1, B ve 1, **sin contexto 0**.

## Límite de peticiones — la clave del cubo la elegía el cliente

`getClientIp` (Next) y los dos limitadores montados en FastAPI
—`middlewares/rate_limiter.py` y `middleware/anti_scraping.py`— leían
`x-forwarded-for.split(",")[0]`, que es el extremo del **cliente**. Detrás de un
proxy que añade al final:

    manda el atacante : X-Forwarded-For: 9.9.9.9
    reenvía el proxy  : X-Forwarded-For: 9.9.9.9, <ip real>
    se leía           : 9.9.9.9

Como la IP es la **clave del cubo**, cambiarla en cada petición estrenaba cubo y
el límite dejaba de existir. En el otro sentido también estaba roto: dos clientes
que mandaran el mismo valor caían en el mismo cubo.

En `anti_scraping` era peor: ahí la clave además **bloquea una hora**, así que se
podía mandar la IP de un tercero, gastarle el cupo y dejarlo fuera sin que
hubiera hecho nada.

El criterio correcto ya existía en la casa —`identidad_peticion.ip_del_cliente`,
de derecha a izquierda con `TRUSTED_PROXY_HOPS`— y solo lo usaba uno de los tres.

**Cerrado.** 18 pruebas Python (las tres implementaciones contra la misma
batería) + 9 vitest. Tres mutaciones tumban pruebas en cada lado.

### Lo demás del mismo bloque

| Hallazgo | Estado |
|---|---|
| 4 rutas sensibles con `getRateLimitRule() === null`: `verify-email`, los tres de SSO, `auth/token`, `billing/checkout` | cerrado, con regla y techo |
| `INCR` + `EXPIRE` en dos peticiones; si fallaba la segunda la clave quedaba sin caducidad y esa IP recibía 429 **para siempre** | cerrado: una sola llamada, `EXPIRE NX` |
| `_ip_hits` no soltaba nunca sus entradas | cerrado: barrido amortizado |
| Exención de `/api/health/` — prefijo abierto | guardia puesto; hoy las 4 rutas son legítimas y `/health` sigue usable por la infraestructura |
| Autenticación de cron (16 rutas) | correcta y **falla cerrada** sin secreto; no tenía ninguna prueba — ahora 16 + guardia |

## Membresías — una baja resucitaba con un reintento de Stripe

`updateMemberStatus` asignaba el estado a pelo y `checkAccess` abre el material
de pago con `m.status='active'`. Stripe **no garantiza el orden** y reintenta
durante días: un `customer.subscription.created` entregado después del `deleted`
ya procesado devolvía la fila a `active`, y con ella el acceso de quien se dio de
baja. No hace falta ataque; basta con que Stripe reintente.

**Cerrado**: `active` ya no pisa un estado terminal. 8 pruebas contra PostgreSQL
real, incluido el control que demuestra que la forma anterior **sí** resucitaba.

### ⚠️ DECISIÓN DEL FUNDADOR — el camino de vuelta no existe

Al arreglar lo anterior quedó a la vista un hueco que **no toco porque es
alcance de producto**, y `ALCANCE_DE_PRODUCTO = BLOCKED_ON_FOUNDER`:

`updateMemberStatus` tiene **un solo llamante**, la ruta
`/api/webhooks/stripe-membership`, y el único evento que lleva a `active` es
`customer.subscription.created`. Entonces:

> Un cliente cuyo pago falla pasa a `expired` y **no vuelve a `active` nunca**,
> aunque arregle su tarjeta y pague. Stripe emite `invoice.paid` y
> `customer.subscription.updated`, y esa ruta no trata ninguno de los dos.

Es un cliente que paga y se queda sin el material que ha comprado. Antes de mi
arreglo existía una recuperación **accidental** —un `created` fuera de orden
podía devolverlo a activo—, pero eso era la coincidencia, no un camino: dependía
de que Stripe entregara desordenado, y era exactamente el agujero de seguridad.

Lo que hace falta decidir: si `invoice.paid` debe reactivar, y con qué condición.
No lo doy por supuesto ni lo implemento sin que lo digas.

## Tope de peticion — el lado web no tenia ninguno

En el App Router de Next las rutas **no tienen limite de cuerpo**: el de 1 MB de
las API de `pages/` no existe aqui, y el `MAX_BODY_SIZE` de FastAPI solo cubre el
backend de Python. `await req.json()` y `await req.formData()` en
`/api/forms/[formId]/submit` —que es **anonima**— bufferizaban lo que hiciera
falta. El limite por IP no ayuda: son 20 peticiones por minuto, pero cada una
podia traer cientos de megas.

Mismo defecto que ya se cerro en `middlewares/security.py`, con la misma leccion:
`Content-Length` es una **declaracion** y no siempre viaja. Aqui se cree para
**rechazar**, nunca para aceptar.

**Cerrado**: `cuerpoConTope.ts`, aplicado a formularios publicos, SAML ACS e
importacion de contactos. 14 vitest; tres mutaciones tumban 6, 1 y 7.

### Dos cosas que salieron al probarlo

1. **Cancelar el flujo habria sido peor que el defecto.** Al pasarse del tope, lo
   natural es cancelar. En Node eso deja un rechazo **suelto** —undici sigue
   encolando despues de cancelar— y un rechazo no capturado **tumba el proceso**:
   la proteccion contra la caida habria sido la caida. Medidas las tres
   variantes; solo no cancelar queda limpio. Se sigue sin acumular mas del tope
   en memoria, que es el vector real; no se ahorra ancho de banda. Hay guardia,
   porque vitest **avisa** de los rechazos sueltos pero no falla por ellos.

2. **La prueba medía otra cosa.** Corria en el entorno de navegador de la suite y
   el multipart fallaba con «no boundary found»: la implementacion de jsdom no es
   la que ejecuta esto en produccion. Fijada al entorno de servidor.

## Coste de IA — la garantia era una casualidad

`isNelvyonAiEnabled()` se documenta como *master switch — when false, no external
LLM calls* y por defecto vale `0`. `/api/nelvyon-site/chat` llamaba a
`api.openai.com` **sin consultarlo**: lo unico que evitaba el gasto era que no
hubiera clave en el entorno.

Hoy no cambia el comportamiento. Cambia **de que depende** que no cambie: el dia
que alguien defina `OPENAI_API_KEY` para otra cosa, una ruta que atiende al
publico empezaba a gastar por mensaje, con limite por IP y por tanto sin techo.

**Cerrado**, con guardia de codigo. Mi propio barrido dio antes tres falsos
positivos por leer comentarios que explican que `saas/chat` y
`saas/agentes/execute` **antes** llamaban a OpenAI y ya no.

## Proxies comodin — recorrido de ruta

Las rutas `[[...path]]` reciben los segmentos ya decodificados, los unen y los
pegan tras una base fija. El host no se puede cambiar —no hay SSRF—, pero un
`%2e%2e` llega como `..`, sobrevive al `fetch`, que normaliza, y la llamada acaba
en otra familia de endpoints con la cabecera `X-Workspace-Id` que el propio proxy
firma. **Cerrado** con `subrutaDeProxy` (rechaza, no sanea) + guardia.

## Higiene de la suite — tres fuentes de falsos rojos

| Qué | Efecto |
|---|---|
| Tres pruebas leian `Path("main.py")` **relativa** | su veredicto dependia del directorio desde el que se lanzara pytest |
| El plan del workspace 1 era **estado global** | varias pruebas insertaban una suscripcion activa y la dejaban puesta; despues, pruebas sin relacion con planes recibian 403 «Tu plan no incluye…». Aislado por fichero |
| `reads first x-forwarded-for hop` | **defendia el defecto**: afirmaba el comportamiento vulnerable, asi que arreglarlo se veia como romper una prueba |

Y un doble de Upstash se quedo obsoleto al cambiar el contador a `pipeline`:
respondia `{result:1}` a todo y su prueba dejo de medir lo que dice medir.

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

---

# BLOQUE WEBHOOKS — atribución de inquilino en escrituras sin usuario

## Lo que se encontró

Verificar la firma y saber **de quién es** el mensaje son dos preguntas distintas.
Las firmas ya estaban resueltas de un bloque anterior. La atribución no: se
respondía de tres formas que no son respuestas.

| Severidad | Ruta | De dónde salía el inquilino |
|---|---|---|
| **HIGH** | `POST /api/helpdesk/inbound/email` | `?workspace_id=` de la query string |
| **HIGH** | `POST /api/helpdesk/inbound/whatsapp` | `?workspace_id=` de la query string |
| **HIGH** | `POST /api/v1/bookings/webhook/zoom` | `?workspace_id=` de la query string |
| **HIGH** | `POST /api/v1/dialer/webhook/twilio` | `?workspace_id=` con `or 1` de reserva |
| **HIGH** | `POST /api/instagram-dm/webhook` | literal `1` |
| **HIGH** | `POST /api/messenger/webhook` | literal `1` |
| **HIGH** | `POST /api/tiktok-dm/webhook` | literal `1` |
| **HIGH** | `POST /api/text2pay/webhook` | literal `1` |
| **MEDIUM** | `POST /api/v1/whatsapp/webhook` | `HELPDESK_DEFAULT_WORKSPACE_ID` |
| **MEDIUM** | `GET /api/cpq/quotes/{id}/viewed` | literal `1`, **e ignorado**: el `UPDATE` no filtraba por workspace |
| **MEDIUM** | `POST /api/text2pay/webhook` | el `UPDATE` no filtraba por workspace |

Las dos MEDIUM marcadas «e ignorado» son **escrituras cruzadas reales**, no solo
un destino equivocado: `UPDATE cpq_quotes SET status='viewed' WHERE id = :id` y
`UPDATE text2pay_payments SET status = :st WHERE id = :id`, sin `workspace_id`.
El número que recibía el servicio no se usaba en esas sentencias.

**Por qué no era explotable hoy.** `verificar_firma_meta` falla cerrado (503) y
en producción no están configurados `META_APP_SECRET` ni los equivalentes, así
que esas rutas devuelven 503 antes de escribir. El defecto estaba **latente**: se
activaba en cuanto alguien conectara la integración.

## Lo que se hizo

`core/inquilino_de_webhook.py`. El inquilino solo puede salir de un
identificador que cumpla las dos cosas: **viene dentro del cuerpo que la firma
cubre** y **NELVYON ya lo tiene asociado a un workspace** porque un usuario
autenticado conectó esa cuenta desde dentro del producto.

| Fuente | Qué la hace procedencia |
|---|---|
| `oauth_tokens (provider, account_id)` | la fila la escribió un usuario identificado, no el webhook |
| la fila del propio registro (`text2pay_payments`, `cpq_quotes`, `dialer_calls`) | NELVYON la creó y el identificador volvió firmado |
| `whitelabel_configs` con `ses_domain_verified` | Amazon comprobó el dominio contra un registro DNS que solo controla su dueño |

Dos ambigüedades que también son un no: **cuenta desconocida** (nadie la conectó)
y **cuenta duplicada** (dos workspaces la reclaman — es exactamente como se
robaría el tráfico de otro, y elegir uno sería elegir a quién se lo entregamos).
Ambas responden `202` con `atribuido: false` y **no escriben nada**. Es 202 y no
4xx porque los proveedores reintentan ante un error y acaban desactivando el
endpoint, y no hay nada que el proveedor pueda corregir.

## Dos defectos de lo que yo mismo escribí

**1. La resolución consultaba con el rol de la aplicación.** `oauth_tokens` y
`dialer_calls` tienen RLS activo y el webhook no tiene usuario: la consulta
habría devuelto **cero filas sin dar ningún error**, y todo webhook legítimo
habría quedado «no atribuible». Un aislamiento que se cae hacia «no sé de quién
es» también deja de funcionar, solo que en silencio. Corregido: resolver y
escribir ocurren en la **misma** sesión de `nelvyon_jobs`.

**2. `nelvyon_jobs` no tiene ni un privilegio en 16 de las tablas implicadas.**
Desplegar la conversión sin la migración de grants habría hecho fallar *todas*
las escrituras de webhook con `permission denied`. Medido contra producción, no
supuesto.

## Evidencia discriminante

`tests/test_webhooks_atribucion_de_inquilino.py`, 8 casos contra la **ruta HTTP
real** con firma válida — no contra el servicio, porque el servicio ya hacía su
parte bien: `instagram_dm_service` acotaba por `self.workspace_id` en todas sus
consultas. Una prueba del servicio habría pasado en verde con el `1` todavía puesto.

El caso que más importa: cuerpo firmado que nombra la cuenta de A **y
`?workspace_id=<B>` en la URL**. Acaba en A. Es la versión ejecutable de «no
confiar en el `workspace_id` que aporta quien llama».

**Comprobación por mutación:** reintroducido el `1` fijo, **7 de los 8 fallan**;
restaurado, los 8 pasan. Regresión en todo lo tocado: **466 pruebas verdes**.

## Deuda que queda de este bloque

- **Migración 564 pendiente de autorización ADR-064** (grants). Sin ella la
  conversión no puede desplegarse.
- **TikTok no es atribuible** con el formato que procesa el servicio: `open_id`,
  `from_user_id` y `sender_id` son el **remitente**, y atribuir por remitente
  significaría que quien escribe elige el inquilino. Se aceptan `to_user_id`,
  `receiver_id`, `account_id` o `shop_id` si vienen; si no, no se atribuye. Los
  DM de TikTok dejan de procesarse hasta que la integración guarde la cuenta.
- **`oauth_tokens` permite que dos workspaces declaren la misma cuenta externa**:
  su clave única es `(workspace_id, user_id, provider)` y no incluye
  `account_id`. El resolutor se niega ante la ambigüedad, pero cerrarlo en el
  origen pide un índice único, es decir otra migración.
- **`ticket_messages` no tiene `workspace_id`**: su aislamiento cuelga del ticket
  padre. Es la única de las 16 que no se puede acotar por sí misma.
- **`signaturit` escribe en un diccionario en memoria** (`_mock_store`), no en la
  base. No es un problema de aislamiento, pero es un mock presentado como
  capacidad.

---

## Una ruta más, encontrada al verificar el despliegue: `sms.py`

El bloque de webhooks se dio por cerrado con 10 rutas convertidas y 8 pruebas en
verde. Al comprobar los invariantes **sobre el código que iba a desplegarse**
apareció una undécima que nadie había auditado:

```
POST /api/sms/webhook/twilio     ws_id = workspace_id            (query string)
                                 or TWILIO_DEFAULT_WORKSPACE_ID  (entorno)
```

Las dos fuentes prohibidas, en la misma ruta. Mi inventario AST no la marcó
porque su detección de escritura no casaba con `handle_reply`.

**Procedencia legítima.** Un SMS entrante es una **respuesta**: llega desde un
número al que un workspace escribió antes, y esa fila de `sms_messages` la creó
una acción autenticada. No vale el número por sí mismo —cualquiera escribe desde
cualquier número— sino el hecho de que ese número esté entre los destinatarios a
los que un workspace ya envió. Dos workspaces que escribieron al mismo número:
ambiguo, se rechaza igual que una cuenta externa disputada.

## El guard de invariantes estuvo inerte dos veces seguidas

El chequeo estructural que debía impedir esto **no se disparaba**, y las dos
veces el síntoma fue idéntico: verde con el defecto reintroducido.

1. `solo_codigo` borraba la **línea entera** de cada token de cadena. Como todos
   los patrones prohibidos llevan una cadena dentro
   —`query_params.get("workspace_id")`— la línea desaparecía antes de buscarla.
   Solo cazaba la forma `Query(...)`, que no lleva cadena. Por eso encontró
   `sms.py` y no habría encontrado la otra variante.
2. Borrar solo el **tramo** de la cadena tampoco servía: lo que se busca *es* el
   contenido de la cadena. Quitarla deja `query_params.get(      )`.

Lo que había que quitar no eran las cadenas sino los **comentarios y
docstrings**, que es donde vive la prosa que explica el defecto corregido y
genera los falsos positivos. Una cadena dentro de una expresión es código.

**Cómo se vio.** Mutando la ruta de SMS a propósito: reintroducir el query string
y comprobar que el guard falla. Sin esa mutación las dos versiones inertes
habrían pasado por buenas — igual que pasó con el guard de roles.

Los dos ayudantes `solo_codigo` estaban **duplicados** en dos pruebas y solo una
copia se corrigió en el primer intento. Ahora hay uno solo.

**Estado del bloque:** 11 rutas, `test_webhooks_atribucion_de_inquilino.py` con
13 casos. Mutación: reintroducido el defecto, **5 fallan** (3 de conducta + los 2
guards estructurales); restaurado, 13 pasan.

---

# BLOQUE A — 23 tablas de aislamiento + webhooks inalcanzables

## Baseline de partida (verificado)

Producción `076728b5` · `_migrations` 465 · suite 3.199 PASS / 0 FAIL ·
`ready` healthy · workers 3/3 · business ok · 0 tracebacks, 0 permission denied,
0 errores RLS, 0 secretos · 564 y 565 aplicadas y certificadas.

## Hallazgo HIGH: seis webhooks entrantes devolvían 401

`middleware/tenant.py` decide qué es público comparando el path con cadenas
escritas a mano. Seis no estaban en la lista:

| Ruta | Proveedor | Estado en producción |
|---|---|---|
| `POST /api/whatsapp/webhook` | Meta | 401 |
| `GET /api/whatsapp/webhook` | Meta (validación de suscripción) | 401 |
| `POST /api/helpdesk/inbound/email` | Amazon SES/SNS | 401 |
| `POST /api/helpdesk/inbound/whatsapp` | Meta | 401 |
| `POST /api/bookings/webhook/zoom` | Zoom | 401 |
| `POST /api/contracts/webhook` | Signaturit | 401 |
| `POST /api/monitoring/ses/bounce-webhook` | Amazon SES | 401 |

Comparado con `dialer` y `sms`, que **sí** estaban declarados y devuelven
`400 Missing X-Twilio-Signature` — la respuesta correcta.

WhatsApp Business, el correo entrante de soporte, las citas de Zoom y las firmas
de contrato llevaban sin poder entrar. **El síntoma de un webhook inalcanzable
es indistinguible del de uno al que nadie escribe**: cero filas y ningún error.

**Corregido.** Es seguro abrirlos porque su frontera no es el middleware sino la
firma del proveedor, verificada antes de tocar nada, seguida de la atribución de
inquilino desde procedencia verificada. Hay prueba: cuatro casos mandan un cuerpo
**sin firma** a cada ruta abierta y exigen 4xx; si alguna respondiera 2xx,
abrirla la habría dejado indefensa.

**Mutación:** revertida la apertura → 12 pruebas fallan; restaurada → 32 pasan.

## Cómo se encontró, y el guard que también estuvo inerte

Sondeando producción escribí `/api/v1/dialer/webhook/twilio` en vez de
`/api/dialer/webhook/twilio`, recibí 401 y lo reporté como defecto del dialer.
**No lo era: mi path estaba mal.** Pero demostró que un 401 del middleware y una
ruta inexistente son indistinguibles desde fuera, así que escribí un guard para
esa clase de defecto — y encontró los seis reales.

Ese guard también nació inerte: leía `app.routes`, que en esta versión de FastAPI
devuelve envoltorios `_IncludedRouter` con `.path = None` (207 entradas casi
todas vacías). Declaraba inexistentes rutas que responden en producción. Ahora
lee el esquema OpenAPI que genera la propia aplicación —885 paths con sus
prefijos— y exige revisar un mínimo antes de emitir veredicto.

## Migración 566 — las 23 tablas (CERTIFICADA, pendiente de ADR-064)

Las 74 tablas OS vacías en producción menos las 51 de la 563. La 563 las excluyó
porque las escribían caminos públicos sin usuario; **ese motivo desapareció** al
convertirlos al rol `nelvyon_jobs` con `workspace_id` de procedencia verificada,
y la 564 les dio los privilegios.

Aplicada en certificación: **RLS 402 → 425, políticas 1.388 → 1.480, 23 tablas,
0 omitidas**. Baterías PostgreSQL: **277 pasan**, 1 skip.

Trinquete de cobertura: **35 → 12**. Las 12 restantes tienen datos en producción
—`contacts`, `helpdesk_tickets`, `nelvyon_campaigns`, `nelvyon_clients`,
`onboarding_workspace_steps`, `os_cashflow`, `os_deals`, `os_expenses`,
`saas_tenants`, `visual_workflow_executions`, `workflow_trigger_registry`— y
activar RLS sobre filas existentes puede ocultárselas a quien hoy las ve. Cada
una necesita saber quién la lee antes de protegerla.

**No se usó el clasificador por rutas como evidencia**: dio falsos positivos
demostrables (atribuyó `text2pay_payments` al webhook de Instagram).

## Siguiente acción exacta

1. Pedir ADR-064 para 566.
2. Las 12 tablas con datos: determinar lectores reales antes de proponer política.
3. Bloque B: auditar las 147 tablas del espacio SaaS.

---

# BLOQUE B — espacio SaaS

## Una cifra que venía mal, corregida

No son 147 tablas sino **220 con `tenant_id`**. Medido contra producción:

| | |
|---|---|
| con RLS | 62 |
| sin RLS | 158 → de ellas **141 vacías**, 17 con datos |
| tipos | uuid 163 · text 39 · varchar 12 · integer 6 |

Los tipos no-uuid **no pueden usar la política estándar**: es un problema de
tipado equivalente al que tenía `client_memory`, y necesita decisión propia.

## El patrón que asumí era el minoritario

Iba a usar `nelvyon_apply_rls_tenant_id`, que encontré buscando funciones por
nombre. Al medir las políticas **reales** resultó que lo usa **una tabla**.
Conviven tres:

| Patrón | Expresión | Políticas |
|---|---|---|
| `_os_select` / `_os_mutate` | `nelvyon_os_workspace_*(workspace_id)` | 44 — son tablas OS que además tienen `tenant_id` |
| **`_saas_tenant*`** | `tenant_id = nelvyon_current_saas_tenant_uuid()` | **12 — el dominante** |
| `_select_own` | `nelvyon_current_tenant_id()` | 4 (1 tabla) |

`nelvyon_current_saas_tenant_uuid()` resuelve el inquilino SaaS desde el
workspace de la sesión: es el puente que ya existe entre los dos espacios de
identidad.

**Sin esa medición habría certificado fielmente la ejecución de una lista con el
patrón equivocado** — exactamente lo que pasó con `helpdesk_tickets` en la 564.

## Migración 567 (CERTIFICADA en local, pendiente de ADR-064)

Políticas creadas **en línea**: no añade funciones. Aplicada en certificación:

```
567: RLS aplicado a 125 tablas SaaS, 2 omitidas
     (local_ai_audit y local_ai_ingest_jobs no existen en esta base)
RLS 425 -> 548   políticas 1480 -> 1980
tablas 712 -> 712   funciones 175 -> 175      <- solo RLS y políticas
```

## Batería adversaria SaaS — no existía

El espacio OS tenía la suya desde el lote 560. El SaaS **no tenía ninguna**: se
comprobaba que las políticas existieran en el catálogo, que es justo el tipo de
evidencia que esta sesión ha demostrado insuficiente.

`test_rls_saas_cross_tenant.py`, autodescubridora por nombre de política, con los
cuatro verbos y un control positivo —que A **sí** vea lo suyo, porque una
política rota que denegara a todos pasaría las tres pruebas de aislamiento en
verde con el producto muerto.

**Su primera versión sembraba solo `(tenant_id)` y cubría 13 de 126 tablas.** Una
batería que prueba el 10% de lo que dice cubrir es peor que ninguna, porque
informa de una cobertura que no tiene. Ahora introspecciona las columnas
obligatorias y las rellena por tipo.

## Bloque C — Memory/RAG, diagnóstico corregido

**Mi afirmación anterior era falsa.** Dije que fallaba por un choque entero/uuid;
el servicio normaliza el entero a un uuid v5 determinista y escritura y lectura
coinciden. Mi prueba medía el SQL crudo, no el producto.

**Causa real**: `APP_AI_BASE_URL` no está en producción y `_openai_client()` la
exige, así que toda llamada a embeddings lanzaba `ValueError`.

**NELVYON ya tenía IA propia** en `backend/local-ai/` (Ollama, coste 0, malla
privada) y **ningún módulo Python la conocía**. `core/embeddings.py` es el puente:
Ollama propio → respaldo léxico determinista → OpenAI solo si se configura a
propósito. Cada vector guarda su modelo en `metadata` y las búsquedas filtran por
él, porque comparar entre espacios vectoriales distintos devuelve un número sin
significado.

18 pruebas verdes, E2E contra PostgreSQL con pgvector. Mutación: quitado el
filtro de workspace, 3 pruebas de aislamiento fallan.

**BLOCKED_EXTERNALLY: MESH_AUTHKEY** — no es un proveedor de pago.

## Siguiente acción exacta

1. Terminar la batería adversaria SaaS y presentar 567 para ADR-064.
2. Desplegar los 2 commits pendientes (webhooks inalcanzables + memoria).
3. Las 12 tablas OS con datos y las 16 SaaS uuid con datos.
4. Las 14 SaaS con `tenant_id` no-uuid.
5. Bloque E: RBAC.

---

# ESTADO TRAS 566, 567 Y EL BLOQUE DE CÓDIGO

## Producción certificada

| | |
|---|---|
| SHA backend | `eab087bd` · web `f62916af` |
| `_migrations` | **467** (564, 565, 566, 567 aplicadas) |
| RLS activo / FORCE / políticas | **498 / 447 / 1.763** |
| Suite | **3.259 pasan, 2 saltadas, 0 fallos** |
| Salud | `ready` · `workers` 3/3 · `business` ok |
| Datos | 1.101 clientes · 5.050 entregables · 22 tenants |

## Deuda de aislamiento

| Espacio | Inicio de sesión | Ahora |
|---|---|---|
| OS sin RLS | 109 | **63** (51 del lote 563 certificado sin autorizar + 12 con datos) |
| SaaS sin RLS | 158 | **31** (16 uuid con datos + 14 `tenant_id` no-uuid + 1) |

## Los seis webhooks, ya alcanzables

Verificado contra producción tras el despliegue: ninguno devuelve 401 y ninguno
2xx sin firma.

| Ruta | Antes | Ahora |
|---|---|---|
| `/api/whatsapp/webhook` | 401 | 503 (secreto no configurado — fail-closed) |
| `/api/helpdesk/inbound/email` | 401 | 422 (cuerpo inválido) |
| `/api/helpdesk/inbound/whatsapp` | 401 | 422 |
| `/api/bookings/webhook/zoom` | 401 | 503 |
| `/api/contracts/webhook` | 401 | 503 |
| `/api/monitoring/ses/bounce-webhook` | 401 | 400 «Missing SNS signature fields» |

## Un defecto que solo apareció al abrirlos

Las sondas produjeron **8 «tracebacks» en los logs**. No era una regresión:
**0 respuestas 5xx servidas**, y los 4 eventos estaban dentro de mi ventana de
sondeo, ninguno fuera.

Pero la etiqueta era falsa: `RequestValidationError` atravesaba el generador de
`get_db` y se registraba como **`db.session_error` a nivel ERROR con traza**. Un
cliente mandando un JSON incompleto generaba en los logs algo indistinguible de
una base de datos caída.

`StarletteHTTPException` ya estaba exenta —alguien vio el problema para los 404 y
401— pero faltaba el caso más frecuente. Mientras esas rutas devolvían 401 el
defecto era inalcanzable; abrirlas lo destapó.

**Por qué importa**: el ruido con la etiqueta equivocada es una pista falsa. Y al
revés, y peor: cuando la base falle de verdad, su error estará mezclado con los
de todos los clientes que mandaron un campo de menos.

Corregido, con un control que exige que un fallo REAL de base siga registrándose
—una exención demasiado ancha sería peor que el problema—. Mutación: 2 pruebas
fallan con el defecto, 4 pasan sin él.

## Siguiente acción exacta

1. Desplegar la corrección de observabilidad.
2. Las **12 tablas OS con datos**: determinar lectores reales.
3. Las **16 SaaS uuid con datos** y las **14 con `tenant_id` no-uuid**.
4. Bloque E completo: RBAC más allá del plano de entidades.
5. Memory/RAG: `BLOCKED_EXTERNALLY: MESH_AUTHKEY`, sin proveedor de pago.

---

# MODO ACELERACIÓN — bloque en curso

## Cuatro migraciones preparadas y certificándose

| Mig | Qué | Estado |
|---|---|---|
| **568** | 52 tablas OS vacías restantes (sustituye a la 563, remedida) | Aplicada en cert: **51 aplicadas, 1 omitida** (`client_memory`, `workspace_id` uuid — la guarda la **nombra**) |
| **569** | 12 tablas OS **con datos** | Escrita, con dos guardas nuevas |
| **570** | 14 SaaS con `tenant_id` no-uuid | Escrita, política por tipo |
| **571** | Equipo de agentes de **redes sociales** | Escrita + 3 herramientas ya ejecutadas contra PostgreSQL |

## 569 — las dos guardas que ningún lote anterior necesitaba

Todos los lotes previos tocaban tablas **vacías**, donde RLS no puede ocultar
nada. Aquí sí hay datos, y sobre datos existentes RLS puede hacer algo peor que
fallar: volverlos **invisibles sin dar error**.

**Quinta guarda — ninguna fila con `workspace_id` NULL.** Medido en producción:

| Tabla | Filas | `workspace_id` NULL |
|---|---|---|
| `os_sector_shield_audits` | 2.761 | **2.761** |
| `saas_tenants` | 22 | **20** |

Las dos quedan fuera. Protegerlas las escondería para siempre.

**Sexta guarda — el workspace dueño tiene quien lo vea.** La política concede por
**pertenencia**: un workspace sin miembros activos no la satisface para nadie.
Medido: las 10 tablas del lote tienen sus datos en el workspace 1, que existe,
está activo y tiene **1 miembro activo**. Los workspaces 2 y 3 tienen **cero**.

## Los cinco de doble espacio, resueltos

`os_agent_audit_events`, `os_qa_audit_runs`, `os_sector_shield_audits`,
`os_truth_guard_audits`, `os_delivery_certificates` tienen `workspace_id` **y**
`tenant_id`. **El `tenant_id` está al 100% NULL en las cinco**, así que manda
`workspace_id` y la ambigüedad no existe: es columna muerta.

## 571 — el equipo de redes, y por qué no publica

`redes.publicar` está en `JAMAS_AUTOMATICO` desde el primer día. Los tres agentes
**miran y redactan**; publicar sigue siendo humano. El de borradores exige
`HUMAN_APPROVAL_REQUIRED`.

Tres herramientas nuevas, **solo lectura**, acotadas por `workspace_id`, y
**ejecutadas contra PostgreSQL antes de escribir la migración** — dos de las tres
consultas estaban inventadas (`social_auto_posts` tiene `caption`, no `content`;
`social_auto_settings` no tiene `platform`) y **solo se vio ejecutándolas**.

## Deuda proyectada

| Espacio | Ahora | Tras 568+569+570 |
|---|---|---|
| OS sin RLS | 63 | **2** (`os_sector_shield_audits`, `saas_tenants`) |
| SaaS sin RLS | 31 | **17** (16 uuid con datos + `saas_activation_checklist`) |

## Siguiente acción exacta

1. Certificar 569, 570, 571 y pedir ADR-064 de los cuatro juntos.
2. Las 16 SaaS uuid con datos.
3. Bloque F: seguridad sistemática.

---

# BLOQUE F — seguridad: dos clases que no estaban cubiertas

Inventariando la cobertura del bloque F contra las baterías existentes, dos
clases aparecían en **cero** ficheros de prueba. No estaban mal cubiertas: no
estaban cubiertas.

## SSRF — HIGH, y no era ciego

`webhook_service.register_webhook` aceptaba cualquier URL con `url.strip()` y
después hacía `POST` a ella. Un inquilino podía apuntarla a la base de datos
interna, al endpoint de metadatos de la nube o a la propia aplicación.

**Y la respuesta se guarda en `webhook_deliveries.response_body` —2000
caracteres— y se le devuelve al inquilino.** Podía *leer* el servicio interno.

Dos superficies más:
- `productive_job_handlers`: URL del payload **con `follow_redirects=True`** — un
  302 hacia `169.254.169.254` saltaba cualquier comprobación previa.
- `dalle_service._download_image`: comprobaba **solo el esquema**;
  `http://169.254.169.254/` empieza por `http://`.

**`core/salida_segura`**: esquema, puerto, y resolución DNS rechazando toda IP
privada/loopback/enlace-local/reservada/multicast, más sufijos internos. Se
comprueba **dos veces** —al registrar y justo antes de conectar— porque repuntar
el DNS después de registrar es el ataque clásico contra un guard que solo valida
al registrar. `follow_redirects=False` en los tres sitios.

La prueba que más importa: un dominio **público** que resuelve a `127.0.0.1`. Sin
la resolución, el guard sería cosmético.

## Escalada de privilegios — HIGH, tres vectores

`require_workspace_operator` admite owner, admin **y operator**, y las tres rutas
de gestión de miembros no miraban jerarquía:

| Ruta | Qué permitía a un *operator* |
|---|---|
| `POST /members/invite` | invitar con rol **`admin`** → aceptar → ser admin |
| `PUT /members/{id}/role` | **degradar a un admin** |
| `DELETE /members/{id}` | **expulsar al propietario** — no miraba ningún rol |

Ninguno necesitaba un fallo: era el comportamiento normal de la función.

`rbac_management` **sí** comprobaba jerarquía, pero para el esquema de
*plataforma*. El de *workspace* no tenía ninguna.

Mutación: neutralizados los tres guards, **10 pruebas fallan**; restaurados, 54
pasan.

## Cuatro migraciones certificadas, pendientes de ADR-064

| Mig | Resultado en certificación |
|---|---|
| **568** | 51 aplicadas, 1 omitida (`client_memory`, `workspace_id` uuid) |
| **569** | 11 aplicadas, 1 omitida (`saas_tenants`, 2 filas con `workspace_id` NULL) |
| **570** | 15 aplicadas, 0 omitidas |
| **571** | 3 agentes de redes + 3 políticas |

En las cuatro: `tablas 712 → 712`, `funciones 175 → 175`, **0 tablas con dos
familias de políticas**.

Deuda en certificación tras las cuatro: **OS 4 · SaaS 11**.

---

# BLOQUE F (cont.) — replay, IDOR y botones muertos

## Replay — solo Stripe tenía idempotencia

De los **doce** webhooks entrantes, solo el de Stripe comprobaba si un evento ya
se había procesado. Los otros once, nada.

**No es un escenario de ataque: es operación normal.** Los proveedores reintentan
cuando la respuesta tarda o falla; Meta reintenta durante horas. Un timeout de 15
segundos metía el mismo DM dos veces en la bandeja — y nadie lo vería como un
error, sino como que el cliente escribió dos veces.

`core/idempotencia_entrante` deduplica por el identificador de mensaje del
proveedor (`mid` de Meta, `MessageSid` de Twilio, `MessageId` de SNS), leyéndolo
del `jsonb` que los servicios **ya** guardan: **sin tabla nueva ni migración**.

Dos decisiones que se dicen en vez de esconderse:
- **No cierra la carrera** de dos entregas simultáneas. La ventana pasa de
  minutos a milisegundos; cerrarla del todo pide un índice único → migración,
  anotada como candidata.
- **Sin identificador no bloquea.** Deduplicar de más sería peor: se perderían
  mensajes reales de proveedores que no lo mandan.

Y el `workspace_id` va siempre en la comprobación: dos inquilinos pueden recibir
el mismo identificador si comparten una cuenta mal configurada, y deduplicar
entre ellos **perdería** el mensaje de uno.

## IDOR — limpio a escala

**455 rutas con parámetro de ruta, 0 IDOR real** de la clase «`WHERE id = :id`
sin acotar por inquilino». La única marcada era `cpq`, ya corregida.

## Botones muertos — y tres errores míos antes de acertar

| Intento | Huérfanas | Por qué estaba mal |
|---|---|---|
| 1º | **483** | contaba prefijos que el código concatena con una variable |
| 2º | **96** | miraba solo `app/api` e ignoraba `pages/api` (396 rutas más) |
| 3º | **3** | extraía «llamadas» de todo `src`, **incluidas las propias rutas** |

**El número grande daba miedo y era falso.** Un inventario mal construido produce
pánico primero y desconfianza después, cuando resulta que no era nada.

Findings reales, sobre 565 llamadas de cliente y 1.807 rutas servidas:

| Ruta | Qué pasa |
|---|---|
| `POST /api/v1/storage/upload` | El backend expone `upload-url` (URL prefirmada), **no** subida multipart. La subida desde el panel da 404 |
| `/api/integrations/google-analytics` | Declarado en `connectorRegistry` con `apiRoutePrefix` y **sin ninguna ruta detrás** |
| `/api/integrations/google-search-console` | Igual |

Los dos conectores son «capacidad anunciada en la interfaz que no puede
conectarse». De 11 conectores declarados, 9 tienen implementación.

Guard permanente con **doble control**: exige un mínimo de llamadas y de rutas
antes de emitir veredicto —un fallo de extracción daría cero huérfanas y
parecería bueno— y exige que las declaradas **sigan** sin ruta, para que la lista
no conserve deuda ya resuelta.

## Migración 572 preparada

Las 9 SaaS uuid con datos que se pueden proteger. **Séptima guarda**: ninguna fila
apuntando a un inquilino inexistente.

Medido en producción: `saas_pack_entitlements` tiene **10 de 32 inquilinos
huérfanos** y `saas_autopilot_settings` **5 de 6**. Protegerlas las escondería
para siempre — y esos huérfanos son un hallazgo de integridad por sí mismos.

---

# BLOQUE PENDIENTE (añadido a la directiva) — CAPA MCP / EQUIPOS DE AGENTES

> **No iniciado.** Entra DESPUÉS de cerrar: RLS pendiente → tablas con datos →
> SaaS especial → RBAC → SSRF → escalada → replay → deuda desconocida.
> Se registra aquí para que sobreviva a un cambio de sesión.

## Qué se pide

Arquitectura agentic empresarial completa, no agentes sueltos:

```
ORQUESTADOR MAESTRO → jefe de departamento → especialista
   → herramientas/MCP/APIs/OS → QA independiente → supervisor
   → entrega → seguimiento/recovery/escalado
```

**Capa de herramientas propia.** Cada una con: alcance · permisos mínimos ·
workspace/tenant explícito · auditoría · idempotencia · límites · rate limiting ·
timeout · retry/backoff · validación de entrada y salida · fail-closed ·
protección cross-tenant · política de aprobación para lo sensible.

**Ocho departamentos**: dirección, ventas, marketing, servicios al cliente,
delivery, finanzas, tecnología, control.

**Especialización por nicho** — restaurante ≠ inmobiliaria ≠ clínica ≠ ecommerce
≠ B2B. Cargable sin reconstruir el núcleo: conocimiento, tono, objetivos,
métricas, regulación, funnel, oferta, canales, riesgos, benchmarks, plantillas.

**Calidad**: especialista → QA independiente → evaluator → política → supervisor.
Bajo umbral ⇒ RETRY / REPLAN / ESCALATE, nunca entregar.

**Mapa de servicios**: cada servicio vendido debe demostrar
`SERVICE → DEPARTMENT → SPECIALISTS → TOOLS → INPUTS → PLAN → EXECUTION → QA →
DELIVERY → KPI → SUPPORT/RENEWAL`. Sin flujo completo ⇒ **NOT_READY**, y el
catálogo no puede anunciarlo.

**Coste**: IA propia/local. Sin OpenAI ni proveedores de pago nuevos.

**GO** solo con: BUILT + CONNECTED + TOOLS + MEMORY + PERMISSIONS + TESTED +
ADVERSARIAL + QA + E2E + DEPLOYED + CERTIFIED.

## Punto de partida que ya existe

| Pieza | Estado |
|---|---|
| `core/agentes/politicas.py` | deny por defecto · `JAMAS_AUTOMATICO` (18 acciones) · `NUNCA_DESDE_UN_AGENTE` (9) · 4 modos |
| `core/agentes/herramientas.py` | **13 herramientas**, todas solo lectura y acotadas por `workspace_id` |
| `core/agentes/runtime.py` | 10 comprobaciones ordenadas |
| `core/agentes/router_modelos.py` | fail-closed, **sin fallback a OpenAI** |
| `core/agentes/presupuesto.py` | presupuesto + kill switches |
| `agent_catalog` / `agent_policies` | 12 agentes en 9 departamentos · 20 políticas · gobierno **de solo lectura** para la app (mig. 559) |
| `core/embeddings.py` | Ollama propio → respaldo léxico · coste 0 |

**Lo que falta**: orquestador maestro, jefes de departamento, QA independiente,
supervisor, capa de nicho, mapa de servicios, y ~igual de importante, herramientas
de ESCRITURA con las 13 propiedades exigidas (hoy todas son de lectura).

**571 (equipo de redes) queda apartada** por decisión del fundador hasta diseñar
la arquitectura global.

---

# BLOQUE F (cont.) — fail-open, rate limiting y subidas

## Dos fail-open que devolvían éxito

Recorriendo los `except` de seguridad/permisos/validación que devuelven `True` o
`{"ok": True}`. Tres candidatos; uno correcto, dos no.

| Dónde | Qué hacía |
|---|---|
| `workflow_engine._matches_conditions` | JSON de condiciones corrupto ⇒ `return True`: **la regla coincidía con TODO** y disparaba su acción en cada evento |
| `push_service._send` | Sin `pywebpush` ⇒ `{"ok": True}`: una notificación que **nunca salió** reportada como enviada |
| `regions._is_private_ip` | IP ilegible ⇒ `True` (privada) — **correcto**, fail-closed |

«No se pueden leer las condiciones» **no** es «no hay condiciones». El modo mock
*declarado* de push se conserva: ese `ok` sí es legítimo porque alguien lo pidió
— confundir «no puedo enviar» con «me pediste que no enviara» habría sido
corregir una mentira creando otra.

## Rate limiting — seis rutas públicas sin límite

El filtro era `not path.startswith("/api/")`, así que estas quedaban fuera:

`/p/{slug}` · `/qr/{short_code}` · `/site/{subdomain}` · `/site/{sub}/{page}` ·
`/store/{subdomain}` · **`/store/{subdomain}/checkout`**

La última **crea pedidos sin autenticación**. Sin límite, cualquiera podía
generar pedidos indefinidamente contra la tienda de un cliente.

Corregido por prefijo. Con control: `/health` sigue **sin** límite — limitarlo
haría que el orquestador de la nube reiniciara el servicio por creerlo caído.

**El limitador ya era fail-closed** ante fallo de Redis: correcto, sin cambios.

## Subidas y path traversal — limpio en los cuatro puntos

| Punto | Cómo se protege |
|---|---|
| `os_deliverables` | `sanitize_upload_filename`: quita ruta, rechaza `.`/`..`, regex, extensión permitida |
| `social` | Extensión **derivada del MIME validado**, ruta `{tenant}/{uuid}`. El traversal que escapaba al prefijo de otro tenant ya estaba corregido en un ciclo anterior |
| `contracts` | `Path().suffix` — no puede contener separador |
| `voice_commands` | Solo `BytesIO.name` para el multipart; sin escritura en disco |

## Hallazgo que conecta con Memory

`voice_commands_service.transcribe_command` usa `_openai_client()`, que exige
`APP_AI_BASE_URL`. **Los comandos de voz están tan inoperativos como la memoria**,
y por la misma causa. Se resuelven juntos con la IA propia.

---

# LO QUE HAY EN PRODUCCIÓN — medido, y cambia el encuadre de todo

**Medido el 2026-08-22 contra la base de producción. No es una impresión.**

```
tablas en `public`                       710
   VACÍAS                                662
```

Y la actividad que hay no es de clientes:

| Tabla | Filas | Qué son en realidad |
|---|---:|---|
| `os_deliverables` | 5.050 | **todos del `workspace_id = 1`**, entre el 29-jun y el 22-jul |
| `os_agent_audit_events` | 14.178 | del mismo workspace |
| `email_queue` | 723 | **todos a `@nelvyon.test`**, todos en estado `no_api_key` |
| `saas_tenants` | 22 | `PAI-A-*`, `PAI-B-*`, `CertCRM-A/B`, `Co-wfA/B`, `Co-seqSmoke`, `Emu Smoke Co`, `QA Audit Co` |
| `workspaces` | 3 | los tres llamados «Mi Workspace» |

**Vacías por completo**: `qr_codes`, `ab_experiments`, `bookings`, `campaigns`,
`invoices`, `chatbot_conversations`, `workflows`, `affiliate_clicks`,
`affiliate_profiles`, `saas_*` casi enteras.

## Qué significa

**NELVYON no tiene todavía clientes en producción.** Todo lo que hay es residuo de
corridas de certificación y humo.

Eso responde de paso la pregunta de integridad que quedaba abierta: los 20 de 22
`saas_tenants.workspace_id` a NULL **no son datos ambiguos de clientes**. Son
fixtures de certificación (`PAI-` = pruebas de aislamiento) que nunca llegaron a
crear un workspace. No hay propietario que reconstruir porque no hay propietario.

La instrucción original del fundador decía que los workspaces de certificación se
marcaran como CERTIFICATION y **se eliminaran al terminar**. No se hizo, y el
residuo ha pasado a ser el conjunto de datos entero.

## Corrección a mi propio lenguaje

He descrito varios defectos con su impacto en cliente: «el cliente recibe el mismo
correo dos veces», «recordatorio de cobro duplicado», «los QR no funcionan», «la
descarga de facturas falla».

Los defectos **son reales** —el código haría eso— pero **ningún cliente los ha
sufrido**, porque no hay clientes. Era impacto potencial y lo presenté como
observado. Se corrige aquí para que nadie herede la urgencia equivocada.

Los 723 correos de `email_queue` estaban en `no_api_key`: ni siquiera salieron.

## Y qué cambia en las prioridades

Las 20 derivas esquema↔código están en funciones que **nunca se han ejecutado**.
Arreglar `zoom_join_url` de una reserva que nadie ha hecho vale menos que
determinar **qué promete NELVYON y qué tiene que funcionar de verdad** el día que
entre el primer cliente.

Esa decisión es del fundador, no mía: **BLOCKED_ON_FOUNDER — ALCANCE_DE_PRODUCTO**.

Lo que sí se hace sin preguntar: cerrar las derivas de correspondencia inequívoca,
mantener el trinquete para que no crezcan, y seguir con seguridad y aislamiento,
que aplican igual el primer día que haya un cliente real.

## Y lo que esto NO cambia

- El aislamiento importa **antes** del primer cliente, no después. El día que
  entren dos, ya tiene que estar cerrado.
- `email_queue` con 723 filas demuestra que la carrera de la cola era real: la
  tabla se usa de verdad, aunque sea con datos de humo.
- La deriva de los webhooks salientes habría aparecido con el primer cliente que
  configurara uno.

# NEXT_SESSION_START_HERE

> Actualizado al cierre del Bloque 1. **Lee esto primero.** La clasificación
> completa de las 18 categorías está en `docs/BLOQUE_1_CIERRE.md`.

## Estado

`BLOQUE_1_EXECUTABLE = CLOSED`. No queda tarea conocida y segura del Bloque 1 que
se pueda hacer sin una decisión del fundador. Lo que sigue abierto está en la
tabla de bloqueos de `BLOQUE_1_CIERRE.md`, y **ninguno de esos puntos bloquea el
Bloque 2**.

En curso: **Bloque 2 — Web + SaaS + OS completos**.

## Lo que NO se puede tocar

| Punto | Motivo |
|---|---|
| `WEB_DB_ROLE_CUTOVER` | BLOCKED_ON_FOUNDER — el rol `nelvyon_web_app` está listo y certificado 68/68; cambiar la conexión no me corresponde |
| `ADR-064` = 568/569/570/572/573/574/575 | BLOCKED_ON_FOUNDER — escritas y certificadas, **no aplicadas** |
| `571` | APARTADA — hay guardia que impide que vuelva al árbol desplegable |
| `STRIPE_MEMBERSHIP_REACTIVATION` | BLOCKED_ON_FOUNDER — qué evento reactiva una membresía tras regularizar el pago |
| `InvoicingService` / `ABTestingService` → ¿qué tabla? | BLOCKED_ON_FOUNDER — alcance de producto |
| `chatbot_conversations.workspace_id` | BLOCKED_ON_FOUNDER — semántica de tenencia y su política de RLS |

Además, en pie: producción destructiva **no**; nuevos costes externos **0 €**;
ningún proveedor de IA activado.

## Dónde está el trabajo

Tres árboles de git sobre el mismo repositorio, para no contaminar certificaciones:

| Árbol | Rama | Para qué |
|---|---|---|
| `C:\Users\Daniel\nelvyon-app` | `desplegar-bloque2` | el original; **no se toca** |
| `C:\Users\Daniel\nelvyon-w2` | `bloque3-conectores` | segundo árbol, libre |
| `C:\Users\Daniel\nelvyon-w3` | `bloque4-webhooks` | **donde se trabaja ahora** |

`w2` y `w3` tienen `node_modules` enlazados por junction al árbol original.

## Entorno que hace falta

```
docker start nelvyon-local-ai-postgres        # se paró una vez; arrancarlo si falta
NELVYON_PG_CERT_DSN=postgresql://nelvyon_local:nelvyon_local_dev@localhost:5434/nelvyon_cert545
NELVYON_WEB_CERT_DSN=postgresql://nelvyon_local:nelvyon_local_dev@localhost:5434/nelvyon_web_cert
NELVYON_VIRGEN_DSN=postgresql://nelvyon_local:nelvyon_local_dev@localhost:5434/nelvyon_rec_final
```

**Sin esas variables la suite no falla: se SALTA.** Una ejecución sin ellas dio
588 saltos silenciosos frente a 4 con ellas, y parecía verde. Comprobar siempre
el recuento de saltos antes de creerse un resultado.

## Tres cosas que hay que saber antes de tocar nada

1. **No lances pytest en paralelo con la suite de puerta.** Comparten
   `backend/test.db` y se contaminan: una ejecución entera se llenó de ERROR por
   eso, y el `exit 0` de un proceso que maté a mano no significaba que pasara.
2. **Un guardia que quita comentarios borrando desde `//` se come `https://`.**
   Ya ha dado verde tres veces sobre código que sí llamaba fuera. Usar
   `(?<!:)//` y dejar el control puesto en las dos direcciones.
3. **Una prueba de servidor no se ejecuta en el entorno de navegador.** El
   troceado de multipart falla con «no boundary found» bajo jsdom: lo que corre
   en el servidor se prueba con `// @vitest-environment node`.

## Reconstruir la base virgen

```
docker exec nelvyon-local-ai-postgres psql -U nelvyon_local -d postgres \
  -c "DROP DATABASE IF EXISTS nelvyon_rec_final" -c "CREATE DATABASE nelvyon_rec_final"
cd backend/db/certificacion
python reconstruir_virgen.py nelvyon_rec_final      # 474 migraciones, 0 fallos duros
python catalogo_semantico.py nelvyon_rec_final catalogo_virgen_semantico.json
python huecos_de_recuperacion.py nelvyon_rec_final  # 11 huecos, todos inventariados
```
