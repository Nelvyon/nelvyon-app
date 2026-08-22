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
