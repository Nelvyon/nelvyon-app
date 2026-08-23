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

> Actualizado tras cerrar el bloque de seguridad. Lee esto primero.

## Estado de producción

`_migrations` **467** (564, 565, 566, 567 aplicadas) · SHA backend `9e420a95`

### Puerta verde — 2026-08-22

`3366 passed · 4 skipped · 0 failed` en 40:51 sobre SHA **`77e2ecf4`**, con
certificación PostgreSQL **incluida** (`NELVYON_PG_CERT_DSN` exportado).

Los 4 saltos, con motivo cada uno: 2 leen el fichero de la 571 (apartada del
árbol), 1 exige una PostgreSQL virgen (`NELVYON_PG_VIRGEN_DSN`), 1 por una tabla
ausente en este entorno. Ninguno es un salto silencioso.

Una corrida anterior sobre el mismo árbol dio 588 saltos y **no valía**: se lanzó
sin el DSN de certificación y se saltaba entera la batería de PostgreSQL. Un
verde con 588 saltos y uno con 4 no son el mismo verde.
RLS **498** · FORCE **447** · políticas **1.763** · 1.101 clientes · 22 tenants
`ready` · `workers` 3/3 · `business` ok · 0 5xx · 0 permission denied · 0 secretos

## BLOQUEADO — necesita ADR-064 del fundador

| Mig | Qué | Certificada |
|---|---|---|
| 568 | 52 tablas OS vacías (sustituye a 563) | 51 aplicadas, 1 omitida |
| 569 | 12 OS con datos → 10 aplica, 2 omite | guardas 5ª y 6ª |
| 570 | 15 SaaS `tenant_id` no-uuid | 15 aplicadas |
| 572 | 11 SaaS uuid con datos → 9 aplica, 2 omite | 7ª guarda **probada disparando** |
| 573 | Índices de inquilino en tablas sociales | idempotente |

**571 (equipo de redes) APARTADA** por decisión del fundador hasta diseñar la
arquitectura completa de agentes.

### Y por qué apartarla no bastaba con no pedir su autorización

La puerta ADR-064 es **binaria**: `NELVYON_PROD_MIGRATE_APPROVED=1` habilita
`migrate:prod`, y `migrate:prod` aplica **todas** las migraciones pendientes del
commit desplegado. No sabe distinguir «estas cinco sí, esa no».

Con la 571 dentro del árbol, la ventana abierta para 568/569/570/572/573 la habría
aplicado también — una migración apartada explícitamente, dentro de una ventana
que el propio fundador abrió, con el deploy en verde y sin un error en el log.

Los commits de 567 y 572 llevan «NO MERGEAR» en el asunto. Un mensaje de commit no
ejecuta nada. Lo que protege de verdad:

- la 571 **no está** en el árbol desplegable (`git rm`, commit `6065607a`);
- `backend/db/migrations/APARTADAS.md` guarda motivo, SHA256 y el comando de vuelta
  (`git show d4126605:…`);
- `test_las_migraciones_apartadas_no_estan_en_el_arbol` falla si alguna vuelve;
- las 2 pruebas que leían ese fichero se saltan mientras no esté, con el motivo
  escrito, y se reactivan solas cuando vuelva.

**Verificado contra producción** (no contra la memoria de la sesión): 90 tablas
tienen columna de inquilino y RLS apagada; cada una de las 90 está nombrada en
**exactamente una** de las cuatro migraciones RLS; 0 huérfanas, 0 duplicadas.
52 + 12 + 15 + 11 = 90.

## HALLAZGO ABIERTO — el lado web no está cubierto por RLS

**Verificado contra producción el 2026-08-22, no supuesto.**

| Servicio | Rol | super | bypassrls | ¿RLS evalúa? |
|---|---|---|---|---|
| `nelvyon-app` (FastAPI) | `nelvyon_app` | No | No | **Sí** |
| `nelvyon-app` (jobs) | `nelvyon_jobs` | No | Sí | No — aísla por `WHERE` explícito |
| `@nelvyon/web` (Next.js) | **`postgres`** | **Sí** | **Sí** | **No** |

Un superusuario salta RLS incondicionalmente, y `FORCE ROW LEVEL SECURITY` tampoco
le aplica (FORCE somete al *dueño* de la tabla, no al superusuario). Las **498**
tablas con RLS y las **1.763** políticas son por tanto **inertes** para el servicio
que sirve el panel, el SaaS y el OS.

Además `backend/db/DbClient.ts` no fija contexto de inquilino de ninguna clase
—ni `set_config`, ni `SET LOCAL`— así que aunque el rol dejara de saltarse RLS no
habría valor contra el que evaluar las políticas. Solo dos módulos TS lo fijan:
`agency/erp/ErpDomainSnapshotStore.ts` y `local-ai/db.ts`.

### Qué era ya sabido y qué es nuevo

`core/contexto_rls.py` **ya anticipaba** el problema del rol superusuario y por eso
fija el contexto en cada transacción, declarándose «inocuo hoy». Lo que cambió es
que la rotación de credencial movió **FastAPI** a `nelvyon_app` y cerró ese lado.
**El lado web no se movió.** Eso es lo nuevo.

### Consecuencia para 568/569/570/572

Cierran la deuda de aislamiento **del lado Python**. **No** la cierran para el lado
web. Presentarlas como «aislamiento cerrado» sería falso.

### Estado

`test_el_lado_web_no_esta_cubierto_por_rls` — 2 `xfail` **estrictos**: se ponen en
rojo en cuanto se arregle, obligando a retirar la marca. La deuda no puede cerrarse
en silencio ni quedarse olvidada en verde.

**BLOCKED_ON_FOUNDER**: retirar el superusuario al servicio web es un cambio de
producción con riesgo real (los crons y el mirror ERP escriben entre inquilinos a
propósito). Necesita ventana propia y su propia certificación.

## CLASE ABIERTA — servicios OS tras `requirePlatformClaims`

`requirePlatformClaims` **autentica, no autoriza** (lo dice su propio comentario).
Las rutas que lo usan admiten a cualquier usuario con sesión válida, de cualquier
inquilino. Si además el servicio detrás no filtra, es lectura cruzada — y la RLS
no lo tapa, porque el lado web es superusuario.

| Servicio | Tabla | Estado |
|---|---|---|
| `OsRegulatedSectorShieldService` | `os_sector_shield_audits` | **CERRADO** (`ae951907`) |
| `OsTruthGuardService` | `os_truth_guard_audits` | pendiente |
| `OsAgentAuditTrailService` | `os_agent_audit_events` | pendiente · 1 `catch` vacío |
| `OsDeliveryCertificateService` | `os_delivery_certificates` | pendiente · 2 `catch` vacíos |
| `OsAgentDataService` | `os_agent_data_cache` | pendiente · 5 `catch` vacíos |

Patrón de cierre, ya validado en el primero:

1. el escritor **atribuye** (`AlcanceDeAuditoria` sobre los dos espacios de identidad);
2. los lectores **acotan**, y lo global exige escribir `TODOS_LOS_INQUILINOS`;
3. los `catch` vacíos dejan de devolver éxito;
4. pruebas sobre el **SQL que sale**, no sobre lo que el servicio dice hacer;
5. mutación: neutralizar el filtro tiene que tumbar pruebas.

Queda por decidir si estas rutas deben pasar de `requirePlatformClaims` a
`requirePlatformContext(req, action)`, que sí autoriza. Es un cambio de contrato
de API y necesita revisión aparte.

## INVENTARIO EFECTIVO DE CONEXIONES — todos los servicios de producción

Medido servicio por servicio, leyendo el rol de cada cadena de conexión y sus
privilegios reales en el catálogo. No se dedujo del catálogo de tablas: el
hallazgo del web demuestra que el catálogo no basta.

| Servicio | Variable | Rol | super | bypassrls | Contexto tenant | RLS efectiva |
|---|---|---|---|---|---|---|
| `nelvyon-app` | `DATABASE_URL` | `nelvyon_app` | No | No | sí, por transacción | **Sí** |
| `nelvyon-app` | `NELVYON_JOBS_DATABASE_URL` | `nelvyon_jobs` | No | Sí | n/a | No — aísla por `WHERE` |
| `@nelvyon/web` | `DATABASE_URL` | **`postgres`** | **Sí** | **Sí** | **ninguno** | **No** |
| `@nelvyon/web` | `LOCAL_AI_DATABASE_URL` | `nelvyon_local_ai_app` | No | No | sí (`app.tenant_id`) | **Sí** |
| `ideal-victory` | — | — | — | — | — | sin base de datos |
| `comfortable-empathy` | — | — | — | — | — | sin base de datos |
| `shadcnui` | — | — | — | — | — | sin base de datos |
| `Postgres-w2aK` | — | — | — | — | — | sin base de datos |

**No hay ninguna otra conexión privilegiada escondida.** Las únicas cuatro
cadenas de conexión de todo el entorno de producción están en esta tabla.

### El precedente que hace tratable la remediación

`nelvyon_local_ai_app` es del **propio servicio web**, va contra la **misma base**,
y es un rol mínimo de verdad: **6 tablas** con grants explícitos, **sin herencia de
roles**, sin superusuario, sin BYPASSRLS. Y `local-ai/db.ts` fija `app.tenant_id`
en cada consulta.

Es decir: el patrón que hace falta ya funciona en producción, en el mismo
servicio, contra la misma base. No hay que inventarlo, hay que extenderlo.

## PLAN — retirar `postgres` del servicio web

**No ejecutado. BLOCKED_ON_FOUNDER.**

### Clasificación de los 520 ficheros que tocan la conexión privilegiada

| Consumidores | Clase | Necesita cross-tenant |
|---:|---|---|
| 240 | rutas de API | **TENANT_SCOPED** — no |
| 246 | servicios de dominio | hereda de quien llama — no |
| 17 | librerías de packs/partners | TENANT_SCOPED por parámetro — no |
| 6 | crons (`/api/cron/*`) | **CROSS_TENANT_INTERNAL** — sí |
| 5 | plano `platform/*` | **CROSS_TENANT_INTERNAL** — sí |
| 6 | `db/migrate.ts`, seeds, admin | **MIGRATION_ADMIN** — sí |

**503 de 520 no necesitan privilegio alguno sobre otros inquilinos.** El
superusuario está ahí por 17.

### Destino

| Rol nuevo | Para | super | bypassrls | Contexto |
|---|---|---|---|---|
| `nelvyon_web_app` | rutas + servicios de dominio | No | **No** | `set_config` por petición |
| `nelvyon_web_jobs` | crons y plano platform | No | Sí | aísla por `WHERE` explícito |
| credencial de migración | solo `migrate:prod` | — | — | fuera del runtime |

No se sustituye `postgres` por otro rol con privilegio de sobra: eso movería el
problema y lo haría más difícil de ver la próxima vez.

### Paso 1 — HECHO y certificado (sin tocar producción)

`backend/db/contextoDeInquilino.ts` + `DbClient` fijan el inquilino de la petición
en cada consulta, con **ámbito de transacción**. Inocuo mientras el rol siga siendo
superusuario, exactamente como lo fue `contexto_rls.py` en el lado Python.

**Cobertura medida, no supuesta** — 922 ficheros de ruta:

| | |
|---:|---|
| **679** → **854** | fijan contexto |
| 175 | no tocan la base |
| **0** | tocan la base sin fijar contexto ni estar declaradas |

Cinco fronteras lo fijan, y con eso quedan cubiertas las 854 sin tocar ni una ruta:

| Frontera | Rutas | Qué fija |
|---|---:|---|
| `verifyToken` (`getAuthService` / `authenticate`) | 281 | tenant + usuario del JWT firmado |
| `requireSaasContext` | 237 | tenant + usuario, tras resolver acceso |
| `requirePlatformClaims` / `Admin` | 83 | vía `verifyToken` |
| `requireOsWorkspaceAccess` | 13 | workspace **verificado** |
| `requirePlatformContext` | 12 | workspace verificado |
| `requirePublicApiContext` | 10 | tenant de la clave de API |

Las 68 restantes se declaran **una a una con su motivo** (crons, webhooks firmados,
superficie pública, `auth/*` que es *anterior* a saber quién es).

**Decisiones que importan y por qué:**

- **Ámbito de transacción, no de sesión.** `set_config(..., false)` duraría toda la
  sesión, y las sesiones son conexiones de un pool: la petición siguiente, de otro
  cliente, heredaría el inquilino. La fuga la causaría el propio mecanismo.
- **El contexto se fija DESPUÉS de verificar, no antes.** Fijarlo con la cabecera
  `X-Workspace-Id` recibida sería fijarlo con lo que el cliente *dice* ser.
- **Fusiona, no sustituye.** Una petición OS pasa por dos fronteras; si la segunda
  reemplazara, perdería el `tenantId` que la primera estableció, y las 606 políticas
  que resuelven por `request.jwt.claim.sub` se quedarían sin sujeto → cero filas.

**Certificación** — `contextoDeInquilino.pg.test.ts`, PostgreSQL real con
`NELVYON_DB_POOL_MAX=1` para que las peticiones compartan conexión **física**:

- llega el contexto · sobrevive a `await` y `Promise.all` · está puesto desde la
  primera consulta de `withTransaction`
- **A → B → A** sin contaminación · **B fija menos variables que A y no hereda las
  suyas** (la afilada: A→B→A pasa incluso con ámbito de sesión, porque cada petición
  sobrescribe; solo se ve cuando B fija menos)
- sin petición no hereda · un error tampoco lo deja puesto · no escapa

**10/10.** Mutación a ámbito de sesión: caen **5**. Mutación quitando la llamada de
una frontera: el guard nombra esa frontera. Mutación añadiendo una ruta sin
frontera: el guard la nombra.

Suite vitest completa de `backend`: **5743 passed, 0 failed** (579 ficheros).

### Orden, y por qué ese orden

1. `DbClient` aprende a fijar contexto de inquilino por petición. **Inocuo**
   mientras el rol siga siendo superusuario — igual que lo fue `contexto_rls.py`
   en el lado Python— y por tanto certificable sin cambiar conducta.
2. Certificar con `nelvyon_web_app` contra la base de certificación: las cinco
   preguntas (A→A, A→B, B→B, B→A, sin contexto) por cada superficie.
3. Demostrar que **todas** las rutas pasan por el contexto. Las que no —crons,
   platform, mantenimiento— se declaran y se mueven a `nelvyon_web_jobs`.
4. Solo entonces, ventana de cambio de credencial en producción.

El paso 3 es el que decide. En el lado Python fue el que costó, y saltárselo aquí
convertiría un fallo de aislamiento en una caída: con RLS activa y sin contexto,
las consultas no dan error — devuelven **cero filas**.

## LATENTE — `saas_tenants.workspace_id` NULL en 20 de 22

Medido en producción, **no supuesto**, y la primera hipótesis era falsa:

```
inquilinos                         22
  con workspace_id                  2
  SIN workspace_id                 20

entregables                      5050
  alcanzables por el JOIN        5050
  INALCANZABLES                     0
```

`/api/saas/entregables/[id]/certificate/pdf` resuelve el pack con
`JOIN saas_tenants t ON t.workspace_id = d.workspace_id`. Supuse que estaría roto
para 20 de 22 inquilinos y **no lo está**: esos 20 no tienen ningún entregable,
así que los 5.050 existentes son todos alcanzables. Se registra el fallo de mi
hipótesis para que nadie lo herede como hecho.

**Pero es frágil por construcción**: en cuanto uno de esos 20 inquilinos genere su
primer entregable, esa ruta le devolverá 404 «No pack run linked to deliverable»
sin un solo error en el log — el síntoma será «mi certificado no se descarga».

Mitigación aplicada: la llamada posterior ya va acotada por `tenantId`, así que si
ese JOIN cambia no queda un camino abierto al certificado de otro.

**DATA_INTEGRITY_DECISION**: rellenar `saas_tenants.workspace_id` para los 20
requiere demostrar la correspondencia. No se inventa.

## BLOCKED_ON_FOUNDER: WEB_DB_ROLE_CUTOVER

Preparado y certificado hasta el límite seguro. **Nada aplicado en producción.**

### Roles

| Rol | super | bypassrls | createdb/role | Para |
|---|---|---|---|---|
| `nelvyon_web_app` | No | **No** | No | tráfico normal — las políticas deciden |
| `nelvyon_web_jobs` | No | **Sí** | No | crons y plano `platform` |
| credencial de migración | — | — | — | sólo `migrate:prod`, fuera del runtime |

`nelvyon_web_jobs` **sí** lleva BYPASSRLS y hay que decirlo claro: trabaja entre
inquilinos por necesidad, así que su aislamiento depende del `WHERE` explícito de
cada consulta — el mismo contrato que `nelvyon_jobs` en el lado Python. No es
«otro rol seguro».

### Grants — del uso real, no del catálogo

**485 tablas** de 710. Las 225 restantes el runtime no las toca y estos roles no
las ven. Verbos concedidos por tabla según lo medido: 464 INSERT, 292 SELECT,
148 UPDATE, 63 DELETE. Sin TRUNCATE, sin REFERENCES, sin TRIGGER, sin CREATE
sobre el esquema, sin pertenencia a ningún otro rol.

**La reducción de tablas es la parte pequeña, y conviene no venderla como el
logro.** Se intentó repartir tablas entre «peticiones» y «crons» por la ruta del
fichero y no separa nada: el SQL vive en los servicios de dominio y los crons
llaman a los mismos servicios. La ganancia real es que `nelvyon_web_app` deja de
saltarse RLS.

### Evidencia — 68/68 con el rol real (21 OS + 47 SaaS)

#### Las cinco familias de política, todas certificadas

Las 1.763 políticas se reducen a **46 formas**; cinco cubren el **91%**, y sus
semánticas **no son equivalentes** — certificar una «representativa» habría dejado
cuatro sin comprobar.

| Políticas | Tablas | Forma | El inquilino… |
|---:|---:|---|---|
| 804 | 201 | `user_id = nelvyon_jwt_user_id()` | **derivado** del JWT |
| 512 | 136 | `tenant_id = nelvyon_current_saas_tenant_uuid()` | **derivado** del usuario |
| 208 | 52 | `nelvyon_os_workspace_select/mutate(...)` | id **+ pertenencia** |
| 79 | 36 | `workspace_id = current_tenant_id()` | **directo** de la sesión |
| 33 | 33 | `tenant_id = nelvyon_erp_tenant_text()` | **directo** de la sesión |

#### La diferencia que hay que saber

Las familias **derivadas** y las **OS** niegan aunque el contexto viniera mal: el
inquilino no se lee de la sesión, o se comprueba pertenencia contra
`workspaces`/`workspace_members`.

Las dos **directas** —**69 tablas**— se fían de `app.tenant_id`. No es un agujero:
esa variable la fija el servidor tras verificar, y hay un guard que comprueba que
así sea en las 854 rutas. Pero significa que **en esas 69 tablas el aislamiento
descansa enteramente en la aplicación**, mientras que en las otras la base es una
segunda red.

`rlsFamiliasSaas.pg.test.ts` lo demuestra en las dos direcciones en vez de
afirmarlo: declarar el inquilino ajeno **no sirve** en las derivadas y **sí** en
las directas. Es un hecho conocido y comprobado, no una sorpresa futura.

#### El fallo que habría reventado el cutover

La certificación SaaS falló al primer intento con **`permission denied for schema
auth`** en 12 pruebas. `nelvyon_jwt_user_id()` y `nelvyon_jwt_sub_text()` **no son
`SECURITY DEFINER`**: se ejecutan como quien llama y necesitan alcanzar
`auth.uid()`. Son la base de la familia más usada — **804 políticas sobre 201
tablas**.

Sin `GRANT USAGE ON SCHEMA auth TO nelvyon_web_app`, el cutover no habría
degradado nada: **habría reventado** en cuanto la primera petición tocara
cualquiera de esas 201 tablas. Precedente comprobado: `nelvyon_app`, el rol del
lado Python que lleva meses con RLS efectiva, **sí** tiene ese privilegio.

Esto no sale del catálogo. Sale de ejecutar.

#### La matriz, por familia y por operación



`backend/db/__tests__/rlsEfectivaWebApp.pg.test.ts`. Las consultas se escriben
**a propósito sin ningún filtro de inquilino**: todo lo que separa a A de B son
las políticas.

| | A→A | A→B |
|---|---|---|
| SELECT | ve sus 2 filas | 0 filas de B |
| INSERT | escribe | **error** `row-level security`, no silencio |
| UPDATE | 2 filas | `UPDATE` sin `WHERE` no toca ni una de B |
| DELETE | 2 filas | `DELETE` sin `WHERE` no borra ni una de B |

Y además: sin contexto → 0 filas · sólo workspace → 0 · sólo usuario → 0 ·
**declarar el workspace de B sin pertenecer** → 0 · usuario inexistente → 0 ·
A→B→A sobre la **misma conexión física** (`max: 1`) → cada uno lo suyo ·
A→sin contexto→A → la del medio no hereda y la última sigue viendo ·
error dentro de la transacción no deja contexto · no puede crear objetos ·
`permission denied` en tabla no concedida · no puede `TRUNCATE`.

**RBAC en la propia base**: un miembro `viewer` **lee** lo de su workspace y
**no puede escribir** — `nelvyon_workspace_can_mutate` exige `owner|admin|operator`.
Una escalada en la capa de aplicación no bastaría para escribir.

Las funciones que deciden se extrajeron del catálogo **en vivo** con
`pg_get_functiondef` y se instalaron tal cual: escribir una versión «equivalente»
habría certificado la mía, no la que va a decidir.

**Mutación obligatoria** — `ALTER ROLE nelvyon_web_app BYPASSRLS` → caen **63 de 68**.
Si no caen, la certificación mide otra cosa.

### Que una ruta no alcance la conexión privilegiada

No es una convención: `DbClient` lee **únicamente** `DATABASE_URL`, y
`test_el_runtime_no_alcanza_la_conexion_privilegiada` comprueba además que ningún
fichero de runtime construya su propio pool ni lea la variable del rol
privilegiado. Los 5 pools que sí existen están declarados con su motivo.
Mutación: un fichero nuevo con `new Pool()` → las dos guardias lo nombran.

### Procedimiento de cutover

1. Crear los dos roles en producción con `backend/db/certificacion/roles_web.sql`
   y contraseñas nuevas (**no** las de certificación).
2. Ejecutar los `GRANT`. Aditivo: no toca a `postgres` ni a ningún rol existente.
3. `DbJobsClient` para la conexión cross-tenant + mover los crons y `platform/*`.
4. **Ventana de observación con `postgres` todavía puesto**: el contexto ya viaja
   (desplegado y no-op), así que se puede ver en logs que llega antes de depender
   de él.
5. Cambiar `DATABASE_URL` del servicio web a `nelvyon_web_app`.
6. Verificar `/api/health/live`, `/api/health/ready`, `/health/ia`, un panel SaaS
   real y un panel OS real, y **contar filas**: la señal de fallo no es un 500,
   son cero filas donde había datos.
7. Sólo después, revocar privilegios de `postgres` sobre el esquema.

### Rollback

Devolver `DATABASE_URL` a la credencial anterior. **Reversible en un cambio de
variable**, sin migración y sin tocar datos. Los roles nuevos pueden quedarse
creados: sin nadie que los use, no hacen nada.

### Riesgo residual

- **El modo de fallo es silencioso.** Con RLS activa y contexto ausente las
  consultas no dan error: devuelven **cero filas**. Por eso el paso 6 cuenta filas
  y no sólo mira códigos HTTP.
- Las 68 rutas sin contexto declarado son públicas, crons o webhooks. Si alguna
  resultara ser tenant-scoped, devolvería vacío tras el cutover.
- **Las cinco familias están certificadas** (68/68). Lo que no está certificado
  todavía es `nelvyon_web_jobs`: lleva BYPASSRLS, así que su aislamiento depende
  del `WHERE` de cada consulta y hay que auditarlo consulta a consulta. Es el
  siguiente trabajo.
- Las **69 tablas** de familia directa dependen de la aplicación para aislar.
  Está comprobado que la aplicación lo hace, pero no hay segunda red ahí.

## CERRADO — colas de trabajo que entregaban la misma fila dos veces

Auditando `nelvyon_web_jobs` (BYPASSRLS → aísla solo por `WHERE`) se recorrieron
los **2.491 módulos alcanzables** desde las 16 rutas de cron:

```
mutaciones alcanzables desde crons : 325
  sin columna de inquilino         :  81   → 42 acotadas por `id` que el propio
                                             job seleccionó (patrón correcto)
  SIN NINGUN WHERE                 :   0   ← no hay updates globales a ciegas
```

Pero apareció otra cosa. **4 colas de trabajo, ninguna con reclamación**:

| Tabla | Consecuencia de la carrera |
|---|---|
| `email_queue` | el cliente recibe el mismo correo dos veces |
| `saas_dunning_events` | **recordatorio de cobro duplicado** al cliente de un cliente |

El patrón era `SELECT ... status='pending' LIMIT n` → enviar → `UPDATE ... SET
status='sent'`. **El estado se actualizaba después de enviar**, y la ventana la
abre precisamente la llamada al proveedor de correo, que es lenta. Dos
ejecuciones solapadas del cron —o un reintento sobre una lenta— mandan lo mismo
dos veces. Sin error, sin log, y lo ve solo el destinatario.

**Corregido** con `UPDATE ... WHERE id IN (SELECT ... FOR UPDATE SKIP LOCKED)
RETURNING`: reclama y devuelve en una sola sentencia, sin mantener bloqueos
abiertos durante la llamada de red.

Y con **recuperación de atascados**: lo que queda tomado por un proceso muerto
vuelve a la cola pasados 15/30 min. Sin eso, cambiar el duplicado por «el correo
no sale nunca» habría sido un mal negocio — **un mensaje repetido se ve; uno que
no llega, no**.

`colasNoDuplicanTrabajo.pg.test.ts` — 6/6 contra PostgreSQL real, con dos y con
diez reclamaciones **concurrentes de verdad**. Incluye el **control que reproduce
la forma anterior y comprueba que sí solapaba**: sin él, el verde podría venir de
una tabla vacía en vez del `SKIP LOCKED`. Y el control inverso: lo tomado hace un
momento **no** se recupera, porque una ventana mal puesta convertiría la
recuperación en la causa del duplicado.

## CERRADO — la función de códigos QR estaba entera caída

Encontrado auditando el 9% de familias RLS que quedaba, no buscándolo.

`qr_service.py` tenía **cinco** consultas rotas. Alguien reescribió el SQL para
acotar por `tenant_id = CAST(:inquilino AS uuid)` —los comentarios del fichero
explican incluso el esquema real de la migración 416— y **dejó los diccionarios
de parámetros con la clave anterior, `ws`**.

Crear un QR, actualizarlo, borrarlo, listarlos y ver sus estadísticas **lanzaban
una excepción siempre**.

SQLAlchemy no se queja al escribir la consulta: se queja al ejecutarla. Y ninguna
prueba pasaba por ahí, así que el fallo no salía en ningún informe — saldría en un
ticket de soporte semanas después, descrito como «los QR no funcionan». Misma
clase que los seis webhooks que devolvían 401: código que se creía funcionando
porque nada lo ejecutaba.

**Guard permanente**: `test_ninguna_consulta_pide_un_parametro_que_nadie_liga`
revisa las **687** llamadas `execute(text(...), {...})` del backend. Ahora **0**
sin ligar. Mutación: devolver el fallo → lo nombra.

Tuvo un falso positivo que hubo que quitar: `calendar_service` usa
`{**otro, "clave": v}` y las claves las aporta el spread. **Un extractor que da
falsos positivos se deja de mirar, y entonces tampoco se mira cuando acierta.**

## Las 46 familias RLS, clasificadas — el 9% restante

| Clase | Formas | Veredicto |
|---|---|---|
| Acotan por inquilino | 5 grandes + 12 menores | **certificadas** (68/68) |
| Catálogos públicos de NELVYON | 5 tablas (`changelog_entries`, plantillas, `roadmap_items`) | `USING (true)` **por diseño** |
| Tablero público de sugerencias | `feedback_items` | público con `upvotes`, **por diseño** |
| Contenido publicado | `status='published'`, `is_active`, y sus hijos por subconsulta | superficie pública, **por diseño** |
| Ingesta pública | `cdp_events`, `qr_scans` (`WITH CHECK (true)`) | ver abajo |

**Lo que un recuento de catálogo declara «protegido» y no lo está**: una política
`USING (true)` deja `relrowsecurity = true` y `policies > 0`. Un inventario que
cuente tablas con RLS las da por buenas. Son **8**, y hace falta mirar la
expresión, no el recuento.

`cdp_events` y `qr_scans` tienen `WITH CHECK (true)` en su INSERT público: la base
no valida el `workspace_id`. **No es una puerta abierta** — las escribe el lado
Python (`nelvyon_app`, RLS efectiva) y el workspace se **deriva** de la fila del QR
escaneado, no de lo que envía el cliente (verificado en `qr_service.py:260`). Es
defensa en profundidad ausente, no un agujero. Las dos tienen **0 filas**.

## CERRADO + DEUDA DECLARADA — el SQL y el esquema no hablaban la misma definición

### Los webhooks salientes no reintentaban nunca

`webhook_service.py` sufrió esta clase **dos veces**. Alguien arregló el `INSERT`
—que hablaba la migración 507 cuando la tabla real es la 405— y dejó un comentario
explicándolo. **No arregló el `UPDATE` ni la consulta de reintentos**: entre las
dos citaban cinco columnas inexistentes (`status`, `attempts`, `response_code`,
`last_attempt_at`, `next_retry_at`).

Consecuencia: ninguna entrega saliente se actualizaba nunca, y **los reintentos
lanzaban siempre**. Un corte de un minuto en el endpoint de un cliente perdía el
evento para siempre, en silencio.

Corregido contra el esquema real (`webhook_id`, `success`, `attempt`), con el
backoff **derivado** de `created_at + 2^attempt` — mismo resultado exponencial sin
columna nueva y **sin migración**. De paso: código muerto retirado (una transición
de estado imposible) y un docstring que decía «max 5 attempts» con la constante en 3.

Una hipótesis mía era falsa y conviene dejarlo escrito: creí que las entregas
agotadas se reintentarían para siempre. **No** — la consulta filtra por
`attempt < MAX`. Comprobarlo evitó reportar un defecto inexistente.

### La guardia, y las 20 que encontró

`test_ninguna_consulta_cita_una_columna_que_no_existe` compara los `INSERT INTO
t (cols)` y `UPDATE t SET col=` del backend contra una **instantánea del catálogo
real de producción** (712 tablas, 6.578 columnas, `_migrations` 467). Solo esos
dos sitios, donde tabla y columna son inequívocos: resolver `SELECT`/`WHERE`
exigiría analizar alias y produciría falsos positivos, y **un guard con falsos
positivos se deja de mirar**.

Encontró **20 columnas inexistentes en 8 servicios**:

| Servicio | Qué está roto |
|---|---|
| `ab_testing_service` | 6 columnas: hipótesis, métrica, reparto de tráfico, fin, recomendación IA |
| `affiliate_service` | `affiliate_id` — la tabla atribuye por `code` |
| `booking_service` | las dos URLs de Zoom: **la reserva no puede guardar la videollamada que dice crear** |
| `campaign_service` | remitente por campaña |
| `chatbot_service` | 4, incluida **`workspace_id`: la tabla no tiene columna de inquilino** |
| `invoice_service` | `pdf_path` y `sent_at` — explica que la descarga de facturas no funcione |
| `qr_service` | `content` → real `destination_url`; `scan_count` → real `scans` |
| `workflow_service` | `edges_json` — **las aristas del grafo no tienen dónde guardarse** |

**No se corrigen todas de golpe a propósito.** Tres tienen correspondencia
evidente (renombrados); el resto **no existe en ninguna forma**, y decidir entre
«guardarlo en otro sitio» y «falta migración» requiere saber si el producto lo usa
de verdad. Inventar la correspondencia para poner el número a cero sería peor que
dejarlo escrito.

Declaradas con su motivo, techo que **solo puede bajar**, y una prueba que exige
retirar de la lista lo que se arregle — una lista de deuda que conserva entradas
resueltas deja de creerse, y entonces tampoco se cree cuando señala algo real.

Y otra prueba exige que cada entrada explique **por qué** sigue ahí: cazó mis
propios «idem» al escribirla.

**DATA_INTEGRITY / MIGRACIÓN**: varias de estas necesitan columnas nuevas. No se
piden todavía — primero hay que saber cuáles usa el producto de verdad.

## BLOCKED_ON_FOUNDER — ALCANCE_DE_PRODUCTO: 8 funciones que el esquema no puede sostener

Las 20 derivas no son 20 columnas sueltas: son **8 funciones rotas por varios
sitios cada una**. Medido comparando lo que el esquema tiene contra lo que el
código pide.

| Función | El esquema tiene | El código pide y **no existe** |
|---|---|---|
| **QR** | nombre, `destination_url`, colores, `scans`, `last_scanned_at` | `short_code`, `qr_type`, `is_dynamic`, `image_base64` |
| **A/B testing** | nombre, `status`, `channel`, `winner_variant` | hipótesis, métrica, reparto de tráfico, fin, recomendación IA — y las tablas `ab_variants`/`ab_events` |
| **Reservas** | `booking_date`+`booking_time`, `duration` | `start_at`, `duration_minutes`, `service_name`, **3 columnas de Zoom** |
| **Campañas** | asunto, contenido, contadores | remitente por campaña, `campaign_recipients` |
| **Chatbot** | `captured_lead`, `messages`, `session_id` | **`workspace_id`**, `visitor_info`, `last_message_at`, `message_count` |
| **Facturas** | totales, impuestos, estado | `pdf_path`, `sent_at` |
| **Workflows** | `nodes_json` | `edges_json`, y las tablas `visual_workflow_executions`, `workflow_nodes`, `workflow_trigger_registry` |
| **Afiliados** | atribuye por `code` | `affiliate_id` |

**`short_code` es el caso más claro**: sin esa columna el redirect `/qr/{código}`
no puede existir, así que **el QR dinámico —el producto entero— no es
implementable contra este esquema.** No es un renombrado.

Y `chatbot_conversations` **no tiene columna de inquilino**: se acota
indirectamente por `chatbot_id`. Añadirla es una decisión de aislamiento, no una
migración cosmética.

### Lo que sí se corrigió (3, y por qué solo 3)

`content` no existía y sobraba · `scan_count` era `scans` · `lead_captured` era
`captured_lead`. Renombrados exactos, mismo significado.

**Las tres funciones siguen rotas** por las otras columnas. Lo digo porque bajar
el contador de 20 a 17 sin decir esto sería exactamente el «maquillaje de estado»
que no debo hacer: ninguna de las tres correcciones hace que su función funcione.

### La decisión que hace falta

Por cada función: **¿NELVYON la vende?** Si sí, hay que migrar el esquema al
producto real. Si no, hay que retirar el código en vez de mantener consultas que
lanzan.

No la tomo yo: inventar cuatro columnas para QR o tres tablas para el editor de
workflows sería construir infraestructura para algo que quizá no se vende.

**Contexto que importa para decidirlo**: las 8 tablas tienen **0 filas** y
662 de 710 tablas de producción están vacías. Ninguna de estas funciones se ha
ejecutado nunca.

## CERTIFICADO — el ciclo completo de un webhook saliente

`test_webhooks_salientes_reintentan_de_verdad` — **12/12** contra PostgreSQL real
con el esquema de producción (migración 405):

falla → **queda pendiente** · backoff respetado (recién fallada **no** sale;
pasada la espera **sí**) · éxito → **no vuelve a salir** · intentos agotados →
**deja de reintentarse** · endpoint desactivado → no recibe nada · **otro
inquilino no se lleva la entrega** · el cierre **persiste de verdad**.

**5 pruebas de mutación** ejecutan las consultas **anteriores** contra el mismo
esquema y comprueban que PostgreSQL las rechaza nombrando la columna concreta
(`endpoint_id`, `status`, `attempts`, `next_retry_at`, `last_attempt_at`). Sin
ellas, el verde no distinguiría «arreglado» de «esta prueba no toca ese camino».

Contra un doble de base de datos toda esta batería habría pasado con el código
roto: un doble acepta cualquier nombre de columna, y el fallo era exactamente
nombres que no existen.

## AUDITORÍA DE FUNCIONALIDAD FANTASMA — lo comprobado y limpio

Decirlo importa tanto como los hallazgos: **no fabrico defectos donde no los hay.**

| Comprobación | Resultado |
|---|---|
| `catch` que devuelven éxito en TypeScript | **0** |
| Fallback de IA (`PrivateAiRouter`) | **honesto**: cae en proveedor `unconfigured`, devuelve `fallbackReason`, y el estado dice «Ningún modelo conectado» |
| Agente de bandeja: ¿autoenvía texto simulado? | **no** — `if (suggested.mock) → autoReplied: false, reason: "llm_not_configured"`, tras una cadena de puertas: agente activo → escalado → autoReply → confianza → puerta de autonomía → mock |
| `platform/*` BFF | **correcto**: autentica, autoriza con `assertUserCanAccessWorkspace`, y reenvía el workspace **canónico**, no el crudo |

### La IA está APAGADA en producción, no degradada

Verificado en los dos servicios, sin imprimir ningún valor:

```
OPENAI_API_KEY, ANTHROPIC_API_KEY, OPENROUTER_API_KEY,
DEEPSEEK_API_KEY, GROQ_API_KEY, MISTRAL_API_KEY   →  todas AUSENTES
APP_AI_BASE_URL                                   →  ausente
NELVYON_AI_ENABLED = 0        OLLAMA_CONFIGURED = 0
```

**Cero proveedores de pago**: la restricción del fundador se respeta. Y encaja con
las 662 tablas vacías — la plataforma está construida, no operando.

## RESUELTO CON EVIDENCIA — las 2.761 auditorías sin dueño

Ya no es una decisión de integridad: **el dueño es determinista**.

Las tres tablas del mismo lote tienen **exactamente las mismas 2.761 filas**, el
mismo rango de fechas y **los mismos 1.077 `pack_run_id`**:

```
os_qa_audit_runs         2761   2026-06-29 .. 2026-07-22   1077 pack_runs
os_truth_guard_audits    2761   2026-06-29 .. 2026-07-22   1077 pack_runs
os_sector_shield_audits  2761   2026-06-29 .. 2026-07-22   1077 pack_runs

pack_run_id que estén en shield y NO en truth guard:  0
esos 1.077 pack_runs pertenecen a:                    workspace 1 (todos)
```

Y la cobertura del backfill:

```
filas totales                     2761
  sin pack_run_id (irresolubles)     0
  resolubles por pack_run_id      2761   →  100%
  pack_runs con workspace AMBIGUO    0
```

El dueño **no se infiere: se lee** de la fila del pack al que pertenece la
auditoría. No se inventa ningún propietario.

**Migración 574 preparada y certificada** (no aplicada):

- **Guarda 1** — si algo no se puede resolver leyendo su pack, **aborta entera**:
  atribuir unas sí y otras no dejaría un estado *peor*, porque parecería completo.
  Probada: con 1 fila irresoluble → `ERROR`.
- **Guarda 2** — si un pack apuntara a dos workspaces, aborta: el dueño dejaría de
  ser determinista.
- **Guarda 3** — después no puede quedar ninguna sin dueño.
- **Idempotente**: segunda ejecución → «no hay filas sin dueño».
- **Copia de seguridad** `os_sector_shield_audits_backfill_574` con qué se tocó, y
  **rollback probado**: devuelve exactamente esas filas a NULL.

No toca `tenant_id`: estas filas son del espacio OS. Rellenar el uuid exigiría un
mapeo que hoy no existe, y **eso sí sería inventar**.

## CLASIFICACIÓN DE DATOS — `REAL_PRODUCTION_DATA = 0`

| Clase | Tablas | Criterio |
|---|---:|---|
| VACÍA | 649 | sin filas |
| **CERTIFICATION_FIXTURE** | **24** | marcas `e2e`/`nelvyon.test`/`test`, o todas las filas en el workspace 1 |
| UNKNOWN | 33 | catálogos y config pequeños, sin columna de inquilino ni marcas legibles |
| SYSTEM_DATA | 4 | `_migrations`, `status_checks`, `changelog_entries`, `roadmap_items` |
| **REAL_PRODUCTION_DATA** | **0** | — |

Guardado en `db/certificacion/clasificacion_datos.json`. **Nada modificado ni
borrado**: es la base para una limpieza futura *si* la autorizas, con criterio
escrito en vez de juicio.

## FICHAS DE ALCANCE — `docs/FICHAS_ALCANCE_DE_PRODUCTO.md`

Las 8 funciones con deriva, con evidencia medida: rutas de API y páginas contadas
sobre el árbol, presencia en catálogo/precios buscada en marketing y packs.

**El matiz que cambia casi todas las recomendaciones**: en **6 de 8** el núcleo
funciona y lo roto es un **borde** —la videollamada de una reserva, el remitente
de una campaña, dónde se guardó un PDF—. Solo **2** son estructurales: QR (sin
`short_code` el redirect no puede existir) y Workflows (faltan `edges_json` y
**tres tablas**).

| Función | En la oferta | Superficie | Recomendación |
|---|---|---|---|
| **Workflows** | SÍ | 23 rutas · 99 comp. | **COMPLETAR — prioridad 1** |
| Campañas | SÍ | 20 · 142 | COMPLETAR (borde) |
| Facturas | SÍ | 7 · 49 | COMPLETAR (borde) |
| Reservas | SÍ | 2 · 80 | COMPLETAR (borde) |
| Chatbot | SÍ | 11 · 22 | COMPLETAR + **aislamiento** |
| A/B testing | SÍ | 7 · 34 | COMPLETAR (config) |
| Afiliados | no | 3 · 7 | FUSIONAR las 3 páginas duplicadas |
| QR | no | 2 · 3 | decidir: estático (ya sirve) vs dinámico (migración) |

**Ninguna se recomienda retirar.** Seis están en lo que NELVYON vende y las otras
dos tienen núcleo aprovechable. Retirar una función útil por estar incompleta
empobrecería la oferta, que es lo contrario del objetivo.

**Coste si se completan todas**: ~15 columnas y 3 tablas en 7 migraciones
independientes. **Ninguna toca datos existentes** —las 8 tablas están vacías—, así
que el riesgo es el mínimo posible: es el mejor momento, antes del primer cliente.

## RECOVERY — TERCERA medida, y la buena. La conclusión es la contraria

**Publiqué dos números equivocados. Los dos eran de mi herramienta, no del código.**

1. «113 tablas, 8 abortos» — medido con `psql -v ON_ERROR_STOP=1`, más estricto
   que el runner real.
2. «21 tablas» — con un cortador de SQL propio que **no saltaba comentarios de
   línea**, así que partía en el `;` de
   `-- Immutable audit trail (append-only; no updated_at)` y generaba fragmentos
   inválidos. Llegó a reportar **«1 error de sintaxis en la 507» que no existe**:
   era mi herramienta inventándolo.

Con un cortador equivalente al real y comparando los mismos tipos de objeto:

```
migraciones ejecutadas         473
fallos DUROS                     0
objetos creados                711   (producción tiene 712)
```

### La cadena SÍ reconstruye el esquema

Lo que falta se explica entero: `_migrations` (lo crea el runner) y 6 tablas
`local_ai_*` (otro subsistema). **Hueco genuino: cero.**

### El hallazgo real es el inverso

**Producción carece de SEIS objetos que una reconstrucción limpia sí crea:**

`visual_workflow_executions` · `workflow_nodes` · `workflow_trigger_registry` ·
`os_public_api_keys` · `saas_user_invoices_legacy` · `user_provider_api_keys`

Las tres primeras son **exactamente las que la función de Workflows necesita**.
**Producción es la anómala, no la cadena** — y no hay que inventar esas tablas,
hay que averiguar por qué su `CREATE` no prosperó allí.

### La causa: 94 sentencias toleradas

`migrate.ts` tolera ocho códigos en la 507 y **aun así la marca como aplicada**.
Sobre base virgen se tragan 94: `42883` función inexistente (40), `42703` columna
inexistente (39), `42P01` tabla inexistente (15).

> **La misma migración produce un esquema distinto según el estado de partida, y
> en los dos casos informa de éxito.**

**Alcance comprobado**: la tolerancia se limita a **una** migración por constante
nombrada. Las demás fallan duro.

## Lo que ya NO aplica de la versión anterior

**Medido ejecutando**, no leyendo: se aplicaron las 473 migraciones sobre una
PostgreSQL virgen, sin un solo apaño.

```
tablas creadas desde las migraciones     602
tablas que hay en produccion             712
─────────────────────────────────────────────
SOLO en produccion                       113

migraciones que ABORTAN sobre base virgen  8
```

**Producción funciona porque `core/database.py` ejecuta
`Base.metadata.create_all` incondicionalmente al arrancar.** Esas 113 tablas las
declara SQLAlchemy en `models/`, nunca el SQL.

Y ahí está el riesgo: `migrate:prod` corre como `preDeployCommand`, es decir
**antes** de que la aplicación arranque. En un entorno **nuevo** —recuperación de
desastre, réplica de staging, despliegue en otra región— esas 8 migraciones se
ejecutarían antes de que exista lo que necesitan y fallarían:

| Migración | Le falta |
|---|---|
| 507 | `workflows` (la crea `models/workflows.py`) |
| 524 / 525 / 528 | `intent_events`, `intent_scores` |
| 526 | `pr_releases` |
| 543 | `chat_conversations` |
| 554 | `os_store_projects` |
| 555 | `onboarding_workspace_steps` |

Las ocho fallan por lo **mismo** —dependen de tablas que crea SQLAlchemy y no el
SQL— así que se arreglan igual: declarándolas en una migración.

**No rompe nada hoy.** Es una propiedad de **recuperación**: si hubiera que
levantar NELVYON desde cero, el esquema no saldría solo de las migraciones.
`test_la_cadena_de_migraciones_no_reconstruye_la_base` mantiene el número
**decreciente** para que no sea una sorpresa el día que haga falta.

**Consecuencia para el plan de limpieza**: la alternativa «recrear la base desde
cero en vez de borrar selectivamente» **no es viable hoy**. Había que saberlo
antes de decidir, no durante.

## Otros bloqueos externos

- `MESH_AUTHKEY` — malla privada al Ollama propio. **No es un proveedor de pago.**
  Sin ella: memoria **degradada** (respaldo léxico) y voz **no disponible**.
- Despliegue de código: hay commits certificados sin desplegar (SSRF, escalada,
  replay, fail-closed, rate limiting, `/health/ia`).

## Deuda de aislamiento restante — 4 tablas, todas con motivo

| Tabla | Por qué no se puede proteger hoy |
|---|---|
| `client_memory` | `workspace_id` es UUID, no INTEGER: la política no compila |
| `os_sector_shield_audits` | 2.761 filas, **las 2.761** con `workspace_id` NULL |
| `saas_tenants` | 20 de 22 filas con `workspace_id` NULL |

Protegerlas hoy no las aseguraría: las volvería **invisibles**.

## Integridad de datos — hallazgo abierto

`saas_pack_entitlements` tiene **10 de 32 inquilinos huérfanos** y
`saas_autopilot_settings` **5 de 6**: filas que apuntan a `saas_tenants` que no
existen. **Las 9 tablas con clave ajena no tienen huérfanos; las 2 sin FK, sí.**
El arreglo de fondo es añadir la FK tras limpiar; hasta entonces la 7ª guarda las
excluye.

## Bloque de seguridad — cerrado

| Clase | Resultado |
|---|---|
| SSRF | **HIGH corregido** — 3 superficies; la respuesta se devolvía al inquilino |
| Escalada de privilegios | **HIGH corregido** — 3 vectores (invitar admin, degradar, expulsar) |
| Replay | 11 de 12 webhooks duplicaban; deduplicación sin migración |
| Rate limiting | 6 rutas públicas sin límite, una **crea pedidos** |
| Fail-open | 2 corregidos (condiciones ilegibles ⇒ coincidía con todo; push «ok» sin enviar) |
| IDOR | 455 rutas revisadas, **0** reales |
| Uploads / traversal | limpio en los 4 puntos |
| Botones muertos | 3 reales de 565 llamadas |
| Observabilidad IA | `/health/ia` nuevo: degradado ≠ ausente |

## SIGUIENTE BLOQUE — Agent Tool / MCP Layer

Registrado arriba con su punto de partida. **No iniciado.** Entra cuando se
cierre el despliegue de seguridad.

Después: auditoría Web + SaaS + OS completos → E2E empresarial → recovery →
Founder-Absent → auditoría nueva desde cero.

`FOUNDER_ABSENT` = **NO_GO**.

## Integridad — hallazgo abierto, decisión del fundador

| Tabla | Filas | Huérfanas | Inquilinos huérfanos |
|---|---|---|---|
| `saas_pack_entitlements` | 172 | **10** | 10 (una fila cada uno) |
| `saas_autopilot_settings` | 6 | **5** | 5 |

Filas que apuntan a `saas_tenants` que **no existen**. Casi con certeza restos de
los 22 inquilinos de prueba históricos.

**Por qué está bloqueado**: resolverlo modifica datos de producción, y hay dos
salidas legítimas que no puedo elegir yo —borrar las filas huérfanas, o recrear
los inquilinos que faltan—. Son decisiones de producto con consecuencias
distintas: la primera pierde el registro de un *entitlement* comprado; la segunda
resucita inquilinos que quizá se dieron de baja a propósito.

**Mientras tanto no hay riesgo**: la 7ª guarda de la 572 excluye esas dos tablas,
así que no se protegen y por tanto no se ocultan. La deuda es que siguen sin RLS.

**El arreglo de fondo** es la clave ajena: las **9 tablas que la tienen no tienen
ni un huérfano**, y las 2 que no la tienen concentran todos. Añadirla exige
limpiar antes, así que va después de tu decisión.
