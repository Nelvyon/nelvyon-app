# RLS — Activación parcial: runbook de reparto, activación y rollback

> **Estado a fecha de este documento: no queda ningún bloqueador conocido para
> activar RLS en la superficie FastAPI.** Los tres fallos silenciosos están
> corregidos por la migración
> `backend/db/migrations/543_rls_politicas_por_workspace.sql`, y el webhook de
> Stripe —el último actor de sistema pendiente— ya escribe por el rol
> `nelvyon_jobs`, con la credencial acotada a esa única escritura y detrás de la
> verificación de firma. Todo certificado contra `nelvyon_app` real. Lo que
> queda es operación, no ingeniería: seguir la sección 7.

---

## 1. El reparto, con la literalidad que evita una garantía falsa

```
FastAPI:          RLS ENFORCED
BFF TypeScript:   APPLICATION-LEVEL ISOLATION, RLS BYPASSED
```

Esa distinción no es un matiz de redacción. Significa que **la mitad del
tráfico de NELVYON no está protegida por PostgreSQL**, y quien lea un informe
que diga «NELVYON tiene RLS» sin este par de líneas se llevará una impresión
falsa de dónde está la frontera.

| Superficie | Rol de conexión | Atributos | Qué la aísla |
|---|---|---|---|
| FastAPI / API | `nelvyon_app` | `NOSUPERUSER NOBYPASSRLS` | Políticas RLS evaluadas por PostgreSQL |
| Web / BFF (Next.js, `backend/db/DbClient.ts`) | credencial actual (service_role) | bypassa RLS | Filtrado por `workspace_id` en el código de aplicación |
| Migraciones | `postgres` | superusuario | — (DDL) |
| Barridos de fondo cross-tenant | `nelvyon_jobs` | `BYPASSRLS` (migración 540) | Acotado a tres bucles declarados |

### Por qué el BFF queda fuera

`backend/db/DbClient.ts` es un *pool* singleton de `pg` con **492 consumidores**.
Ninguno fija contexto de inquilino: no ejecuta `set_config('app.tenant_id', …)`
ni `set_config('request.jwt.claim.sub', …)` en ninguna transacción. Bajo un rol
sin `BYPASSRLS`, esas 492 rutas no darían error — devolverían **listas vacías**.

Y ese es exactamente el modo de fallo que hay que evitar: un error se ve en
Sentry el primer minuto; una lista vacía se ve semanas después, cuando un
cliente pregunta por qué «desaparecieron» sus datos.

Convertir el BFF costaría refactorizar los 492 consumidores para que abran
transacción explícita y fijen contexto. Está medido y **decidido que no se
hace ahora**. El BFF conserva su credencial y su aislamiento sigue siendo el
filtrado por `workspace_id` en el código, que es lo que ya tenía.

---

## 2. El rol `nelvyon_app`: permisos exactos

```sql
-- Creación. Sin BYPASSRLS y sin SUPERUSER: son la razón de ser del rol.
CREATE ROLE nelvyon_app LOGIN PASSWORD '<secreto>'
  NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION INHERIT;

GRANT CONNECT ON DATABASE <base> TO nelvyon_app;

-- Esquemas
GRANT USAGE ON SCHEMA public TO nelvyon_app;
GRANT USAGE ON SCHEMA auth   TO nelvyon_app;

-- Datos
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES    IN SCHEMA public TO nelvyon_app;
GRANT USAGE, SELECT                  ON ALL SEQUENCES IN SCHEMA public TO nelvyon_app;

-- Tablas y secuencias que creen las migraciones futuras
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO nelvyon_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO nelvyon_app;

-- El DDL es de las migraciones, que corren como `postgres`.
REVOKE CREATE ON SCHEMA public FROM nelvyon_app;
```

### Por qué cada línea

- **`USAGE` en `public`** — todo el esquema de aplicación vive ahí (697 tablas,
  70 secuencias, 2 vistas).
- **`USAGE` en `auth`** — no da acceso a ningún dato: el esquema `auth` no tiene
  **ninguna tabla**, solo la función `auth.uid()`. Pero 1030 de las 1058
  políticas la leen a través de `nelvyon_jwt_user_id()`, y sin `USAGE` sobre el
  esquema ni siquiera se puede invocar. Sin este `GRANT` el síntoma no sería
  «no ve nada», sería `permission denied for schema auth` en casi toda la API.
- **`SELECT/INSERT/UPDATE/DELETE`** — el CRUD. Deliberadamente **sin
  `TRUNCATE`, sin `REFERENCES`, sin `TRIGGER`**.
- **`USAGE, SELECT` en secuencias** — 70 tablas usan `nextval`. Sin esto,
  cualquier `INSERT` en ellas falla.
- **`ALTER DEFAULT PRIVILEGES`** — para que una tabla nueva de una migración
  futura nazca accesible, en vez de romper la API el día del despliegue porque
  alguien olvidó un `GRANT`.

> Un `GRANT` **de menos** se manifiesta como `permission denied`: ruidoso,
> inmediato, fácil de diagnosticar. Un `GRANT` **de más** puede ser una fuga
> silenciosa. Por eso la lista de arriba es exhaustiva y está verificada en
> `backend/tests/test_rls_activacion_parcial.py`, que comprueba los atributos
> del rol antes de ejercitar nada.

### Rol de barridos: `nelvyon_jobs`

Ya existe desde la migración 540 (`NOLOGIN`, `BYPASSRLS`). Para usarlo hay que
darle credenciales explícitamente y ampliarle los `GRANT` a las tablas que los
tres bucles necesitan:

```sql
ALTER ROLE nelvyon_jobs LOGIN PASSWORD '<secreto>';
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO nelvyon_jobs;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO nelvyon_jobs;
```

Se consume con `NELVYON_JOBS_DATABASE_URL`. **Mientras esa variable no exista,
`core.database.sesion_de_barrido()` devuelve la sesión normal y la conducta es
idéntica a la de hoy.**

---

## 3. Qué garantiza RLS en la superficie FastAPI, y qué no

El esquema tiene **tres familias de políticas** que no ofrecen lo mismo. Decir
que las tres «aíslan» sería crear una garantía falsa.

### Familia A — `os_*` (frontera real)

`os_projects`, `os_tasks`, `os_clients`, `os_deliverables`, `os_jobs`… deciden
con `nelvyon_os_workspace_select(workspace_id)` /
`nelvyon_os_workspace_mutate(workspace_id)`, que **consultan la pertenencia
dentro de la base** (`workspaces.user_id`, `workspace_members.role/status`) en
lugar de creérsela. Consecuencias verificadas:

- Los cinco roles (`owner`, `admin`, `operator`, `member`, `viewer`) leen su
  workspace y **solo** el suyo.
- `owner`/`admin`/`operator` escriben; `member`/`viewer` no (INSERT lanza,
  UPDATE/DELETE afectan 0 filas).
- Manipular `X-Workspace-Id` para apuntar a un workspace ajeno **no concede
  nada**.
- Sin contexto, o con sujeto inventado: cierra.

Esta familia sí es una frontera independiente de la aplicación.

### Familia B — `workspace_id = current_tenant_id()` (no es frontera independiente)

`landing_pages`, `forms`, `funnels`, `chat_conversations`, `social_posts`,
`os_website_projects`, `os_store_projects`, `loyalty_*`, `lms_*`, `webinars`…
comparan la fila con el valor que la propia aplicación acaba de fijar — y ese
valor sale del header `X-Workspace-Id`. **La política repite lo que dice el
cliente en vez de comprobarlo.**

Quien consiga fijar un tenant ajeno, pasa. Lo que impide fijarlo es la
comprobación de pertenencia de `dependencies/workspace.py`
(`get_workspace_context` → 403), que es **código de aplicación, no PostgreSQL**.

Está fijado por escrito en el test
`test_la_familia_solo_tenant_no_es_frontera_independiente`, precisamente para
que un cambio silencioso en `dependencies/workspace.py` no deje esa mitad sin
red sin que nadie se entere.

### Familia C — pertenencia por workspace (migración 543, frontera real)

`subscriptions` y `oauth_connections` decidían **por sujeto del JWT**
(`user_id = nelvyon_jwt_user_id()`), porque esas políticas se escribieron para
el modelo **centrado en usuario del BFF**. FastAPI lee las mismas tablas
**centrado en workspace**. Ese desajuste era el fallo B2/B3 (sección 4).

La 543 añade políticas PERMISSIVE que consultan la pertenencia real:

| Tabla | SELECT | INSERT / UPDATE / DELETE |
|---|---|---|
| `subscriptions` | `nelvyon_user_in_workspace(workspace_id)` | `nelvyon_workspace_can_mutate(workspace_id)` |
| `oauth_connections` | `nelvyon_user_in_workspace(workspace_id)` | **no se añade** (FastAPI solo lee; es una tabla de credenciales) |

Ambas exigen `workspace_id IS NOT NULL`: la columna es *nullable*, y una fila
histórica sin workspace no se abre a nadie por esta vía.

> **Esto AMPLÍA el alcance, y conviene decirlo con todas las letras.**
> Antes, esas filas las veía **solo su titular** (`user_id`). Ahora las ven
> también **los miembros activos del workspace**.
>
> Es correcto porque coincide con lo que la aplicación **ya hace hoy**: con
> `BYPASSRLS`, `get_active_plan_id_for_workspace` y `core/ads_integration.py`
> sirven esas filas a cualquier miembro del workspace sin mirar quién es el
> titular. La migración no abre nada nuevo — alinea la política con la conducta
> vigente y la deja escrita en la base en vez de depender de que RLS no se
> evalúe.
>
> Lo que **no** se amplía, comprobado en la campaña: un usuario de **otro**
> workspace no ve nada; sin contexto no ve nada; y declarar un `X-Workspace-Id`
> ajeno tampoco concede — la pertenencia se **consulta**, no se declara.

### Carve-out declarado: lectura pública

`os_website_projects_public_read`, `landing_pages_public_read`,
`forms_public_read`, `loyalty_programs_public_read` y equivalentes son
**PERMISSIVE** y solo miran `status = 'published'` (o `is_active`). Una fila
publicada es visible para cualquiera, **incluso sin contexto**. Es intencionado
—una landing publicada es pública por definición— y se documenta aquí para que
nadie lo lea como una fuga.

### Tablas sin RLS

Las tablas centrales del CRM/SaaS de FastAPI (`crm_contacts`, `campaigns`,
`workspaces`, `workspace_members`, `webhook_endpoints`, `client_memory`,
`api_keys`, `users`, `audit_events`…) **no tienen RLS activado**. Su aislamiento
es, y seguirá siendo, el filtrado por `workspace_id` de la aplicación. De las
697 tablas de `public`, 317 tienen RLS.

---

## 4. Los tres fallos silenciosos, y cómo se corrigieron

Los tres se detectaron certificando `nelvyon_app` real contra la base de
certificación, y los tres eran **fallos silenciosos**: cero filas donde debía
haber datos, sin lanzar error. Los tres están corregidos por la migración
`543_rls_politicas_por_workspace.sql`.

### B2 — `subscriptions`: todo el equipo caía a plan `starter`  ✅ CORREGIDO

`services/plan_quota.get_active_plan_id_for_workspace` consulta **por
`workspace_id`**; la política decidía **por sujeto del JWT**
(`user_id = nelvyon_jwt_user_id()`, con `FORCE ROW LEVEL SECURITY`).

Medido antes de la 543:

| Sujeto en `request.jwt.claim.sub` | `subscriptions` devolvía |
|---|---|
| el `user_id` de la fila | `agency` |
| otro admin del mismo workspace | `None` |
| sin sujeto | `None` |

Y la función cae a `'starter'` **sin registrar nada** por su rama legítima: todo
workspace de pago degradado al plan más barato para todo el equipo salvo una
persona, en silencio, arrastrando cuotas y *gating* de módulos.

**Corrección:** políticas por pertenencia real —`nelvyon_user_in_workspace` para
leer, `nelvyon_workspace_can_mutate` para escribir—. El escalón de escritura es
el mismo que ya exige `routers/subscriptions.py` con `require_workspace_operator`,
y ese router sigue rechazando la autoconcesión de planes activos
(`_rechaza_autoconcesion`), así que la política no abre un camino de pago
gratuito: solo deja de bloquear la ruta que ya existía.

### B3 — `oauth_connections`: las integraciones desaparecían  ✅ CORREGIDO

Mismo patrón: `core/ads_integration.py` resuelve la integración **por
`workspace_id`** (la 529 añadió la columna justamente para eso) y la política
decidía **por sujeto**. Medido: la integración solo existía para quien conectó
la cuenta; para el resto del equipo el resolvedor devolvía `None` y cortaba con
un 503 que parecía una caída del proveedor.

**Corrección:** política de **SELECT** por pertenencia, y solo SELECT. FastAPI
únicamente lee esta tabla; añadir escritura por pertenencia sobre credenciales
sin ninguna ruta que lo pida sería alcance regalado.

### B1 — WebSocket de LiveChat: 4004 para todos los visitantes  ✅ CORREGIDO

`TenantMiddleware` hereda de `BaseHTTPMiddleware`, que **solo procesa scope
`http`**: una conexión WebSocket nunca pasa por él. Y `/api/chat/ws/` está en
`_PUBLIC_PREFIXES`, así que tampoco hay JWT del que sacar el inquilino.

El handler buscaba la conversación **antes** de saber de quién era, sobre
`chat_conversations` (RLS `tenant_id = current_tenant_id()`). Medido: **0 filas
sin error** → `websocket.close(4004)` para todos los visitantes. Huevo y
gallina: para saber el inquilino habría que leer la fila que RLS protege.

**Corrección:** la 543 añade

```sql
public.nelvyon_livechat_tenant_de_conversacion(uuid) RETURNS integer
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
```

`routers/chat.py` la llama antes de consultar nada y fija el contexto para el
resto de la conexión (y para las sesiones que abre el bucle de mensajes). El
inquilino se lee **de la base**, no de ningún dato que envíe el cliente, y el
endpoint público no recibe ninguna credencial con `BYPASSRLS`. La función
devuelve un entero, nunca la fila. `SET search_path` fijado: una
`SECURITY DEFINER` sin él es una escalada esperando a que alguien coloque un
objeto homónimo en un esquema anterior del path.

Las rutas HTTP públicas del mismo widget
(`POST|GET /api/chat/conversations/{id}/messages`) usan el mismo resolvedor.
`POST /api/chat/conversations` fija el inquilino que el cliente declara en el
cuerpo, porque un widget público tiene que poder decir con quién quiere hablar:
es el mismo valor que ese handler ya usaba para crear la fila.

> **Lo que B1 NO arregla, dicho para no crear una garantía falsa.**
> Esto **no** convierte RLS en el control de acceso del WebSocket. El endpoint
> es público y **no lleva token**. La autorización efectiva es la **posesión del
> `conversation_id`**, que funciona como capacidad al portador:
>
> - No es adivinable: `chat_conversations.id` es `gen_random_uuid()` (UUID v4).
> - Pero es obtenible: `POST /api/chat/conversations` es público y devuelve el
>   id a quien lo pida, para su propia conversación.
> - Y si un id se filtra —URL, log, historial— quien lo tenga entra en **esa**
>   conversación.
>
> Lo que la 543 restaura es el **acotado por inquilino**, para que el camino
> público funcione bajo RLS y solo toque la conversación cuyo id presenta. Quién
> puede hablar en ella lo siguen decidiendo las comprobaciones de
> `routers/chat.py` (cookie de visitante, o Bearer + workspace para agentes).
> Endurecer esa autorización es un trabajo aparte que **ninguna política
> resuelve**.

### B4 — Webhook de Stripe: actor de sistema  ✅ CORREGIDO

`routers/stripe_webhook.py` (`POST /api/v1/stripe/webhook`, prefijo público)
escribe `subscriptions` como **actor de sistema**: sin JWT y sin usuario. Ni la
política por sujeto ni la nueva por pertenencia le conceden nada — y es correcto
que no se la concedan: inventarle una identidad sería abrir `subscriptions` a
quien no la tiene. Bajo `nelvyon_app` fallaría de forma **ruidosa** (500 y
reintento de Stripe), con la sincronización de cobros parada.

**Corrección:** ese único camino usa el rol `nelvyon_jobs` vía
`core.database.sesion_de_barrido()`, con tres límites, cada uno con su test:

1. **Detrás de la firma.** La sesión privilegiada se abre *después* de
   `stripe.Webhook.construct_event`. Una petición con firma inválida no llega a
   abrir una conexión que evita RLS. La verificación no se tocó: sigue
   rechazando igual firma inválida, firma ausente y secreto sin configurar.
2. **Acotada a una sola escritura.** `process_stripe_event(db, event,
   db_suscripciones=…)` entrega la sesión privilegiada **solo** a
   `SubscriptionsService`. La idempotencia (`stripe_webhook_events`) y el sync
   de plan (`saas_tenants`) siguen con la sesión normal: comprobado que ninguna
   de las dos tablas tiene RLS, así que no necesitan privilegio.
3. **Inocua sin credencial.** `db_suscripciones` es *keyword-only* con default
   `None`, y sin `NELVYON_JOBS_DATABASE_URL` `sesion_de_barrido()` devuelve la
   sesión de siempre. Desplegar este código antes de repartir credenciales no
   cambia una sola respuesta.

**`routers/payments.py` NO recibe la sesión privilegiada.** Sus cuatro puntos de
escritura/lectura sobre `subscriptions` —`_get_or_create_stripe_customer`,
`create_payment_session` (`require_workspace_admin`), `verify_payment`
(`require_workspace_operator`) y `get_active_subscription` (`require_workspace`)—
llegan **con sujeto de JWT y workspace**, así que las políticas de la 543 ya les
conceden lo que necesitan. Darles además una credencial que evita RLS sería
privilegio regalado a rutas autenticadas. Hay un guard que lo impide.

### Lo que sigue sin arreglarse (y no bloquea)

**Tablas sin columna de workspace.** `usage_events` y `onboarding` tienen
políticas por sujeto y **solo tienen `user_id`**: no hay columna de workspace
que usar, y no se inventa. Si FastAPI llega a leerlas por workspace, hará falta
antes una migración con su columna y su *backfill*. Hoy FastAPI no las consulta
por workspace, así que no son un bloqueador.

---

## 5. Lo que sí quedó resuelto

| Módulo | Petición o fondo | Cómo quedó |
|---|---|---|
| `services/os_web_builder_worker.py` | `create_task` desde `routers/os_web_builder.py` | El inquilino se **lee dentro de la petición** y viaja como argumento a `_run_generation`. Ya no depende de la herencia implícita de `copy_context()`. |
| `services/os_store_builder_worker.py` | igual | igual |
| `core/productive_job_handlers.py` | **fondo** (cola de jobs) | El contexto lo fija `core/job_queue.py` en el punto de despacho, a partir de `workspace_id`/`actor_user_id` de la carga. |
| `core/nelvyon_job_handlers.py` | **fondo** (misma cola) | Cubierto por el mismo punto de despacho. |
| `services/agent_orchestrator.py` | petición (`routers/agents_v2.py`) | Correcto sin cambios. Además, las tablas que toca (`nelvyon_clients`, `campaigns`, CRM) **no tienen RLS**. |
| `services/ai_service.py` | petición (`routers/ai.py`) | Correcto sin cambios; mismas tablas sin RLS. |
| `services/memory_service.py` | petición (`routers/memory.py`, `routers/agents.py`) y tareas derivadas | Correcto sin cambios. `client_memory` **no tiene RLS**. |
| `services/webhook_service.py` | **fondo** — `schedule_webhook_event` puede acabar en un `threading.Thread` con `asyncio.run`, donde los ContextVar **no se heredan** | `emit_webhook_event` y `dispatch_webhook` fijan el inquilino explícitamente con el `workspace_id` que ya reciben. |

Y tres barridos **cross-tenant** que no estaban en el encargo inicial y sí eran
un fallo silencioso:

| Barrido | Qué escanea | Cómo quedó |
|---|---|---|
| `services/social_scheduler_worker.py` | `social_posts` (RLS, `tenant_id = current_tenant_id()`) sin filtro de inquilino, cada 60 s | `sesion_de_barrido()` |
| `services/reporting_worker.py` | todos los workspaces con miembros activos, cada 900 s | `sesion_de_barrido()` |
| `services/finetuning_worker.py` | N workspaces candidatos + `social_posts`, `chatbot_conversations`, `campaigns` | `sesion_de_barrido()` |

Sin esto, el planificador social habría dejado de publicar sin un solo error.

---

## 6. `DATABASE_URL`: web y API pueden divergir sin efectos laterales

Verificado. Son **dos servicios Railway distintos**, con Dockerfile, healthcheck
y ámbito de variables propios:

- **Web** — `railway.toml` / `railway.json` en la raíz, healthcheck
  `/api/health/live`.
- **API** — `railway.backend.json`, `rootDirectory: backend`, healthcheck
  `/health/ready`.

Cada uno lee la variable en su propio proceso y no la comparte con el otro:

| Servicio | Quién la lee | Quién la consume |
|---|---|---|
| Web (Node) | `process.env.DATABASE_URL` en `backend/db/DbClient.ts` (`getInstance`) | el pool singleton de `pg` |
| API (Python) | `core/config.py` → `Field(validation_alias="DATABASE_URL")` | **solo** `core/database.py` |

No hay ningún punto de contacto: ni fichero compartido, ni proceso compartido,
ni import cruzado, ni `docker-compose` que propague un mismo valor a los dos.
Las únicas apariciones conjuntas son `\.env.example` (documentación) y los
`playwright.config.ts` de `apps/web` (arnés de test, solo web).

**Consecuencia operativa:** cambiar el `DATABASE_URL` del servicio API al DSN de
`nelvyon_app` no toca al BFF. Es lo que hace posible la activación parcial.

**Cuidado con las migraciones:** `backend/alembic/env.py` también lee
`DATABASE_URL`. Si se ejecutasen migraciones desde el contenedor de la API con
el rol ya cambiado, fallarían por falta de DDL. Las migraciones se ejecutan con
`postgres`, con su propia DSN.

---

## 7. Procedimiento de activación

**Prerrequisito: la migración 543 aplicada.** B1, B2, B3 y B4 están cerrados.

1. **Aplicar `543_rls_politicas_por_workspace.sql`** como `postgres`. Es
   idempotente y no activa RLS en ninguna tabla: solo añade políticas y una
   función. Sin ella, la activación produce los tres fallos silenciosos.
2. **Comprobar el esquema.** El arranque de FastAPI ejecuta
   `Base.metadata.create_all` (`services/database.initialize_database`). Con
   `nelvyon_app` **no hay `CREATE` sobre `public`**, así que si faltase alguna
   tabla del modelo el arranque fallaría. O el esquema está completo, o se
   arranca con `MGX_IGNORE_INIT_DB=1`.
3. **Comprobar los bootstraps de arranque.** `initialize_mock_data` y
   `initialize_admin_user` deben seguir desactivados en producción
   (`should_initialize_mock_data()` / `should_run_admin_bootstrap()`).
4. **Crear el rol** con el bloque SQL de la sección 2, como `postgres`.
5. **Certificar contra la base de certificación** (no contra producción):
   ```bash
   NELVYON_PG_CERT_DSN=postgresql://…/nelvyon_mig_cert \
     python -m pytest backend/tests/test_rls_activacion_parcial.py \
                      backend/tests/test_rls_conexiones_con_contexto.py \
                      backend/tests/test_rls_*.py -q
   ```
6. **Repartir la credencial de barridos**: `NELVYON_JOBS_DATABASE_URL` con
   `nelvyon_jobs` (la 540 lo crea `NOLOGIN`; darle `LOGIN PASSWORD` y los
   `GRANT` de la sección 2). Antes de tocar el rol de la API, no después: los
   tres bucles **y el webhook de Stripe** tienen que estar ya en su rol cuando
   la API pierda `BYPASSRLS`.
7. **Cambiar `DATABASE_URL` SOLO en el servicio API** de Railway.
   No tocar el del servicio web.
8. **Redesplegar solo la API.** Vigilar durante al menos un ciclo completo de
   los tres bucles (60 s / 900 s / 24 h).

### Qué vigilar después (el fallo es silencioso, no aparecerá solo)

- Volumen de respuestas 200 con listas **vacías** por endpoint, comparado con la
  línea base anterior. Es la señal, no los 5xx.
- `permission denied` en logs → falta un `GRANT` (ruidoso, fácil).
- Publicaciones de `social_scheduler_worker` por hora.
- Distribución de `plan_id` resuelto por `plan_quota` (si todo el mundo aparece
  como `starter`, B2 ha vuelto).
- Conexiones WebSocket de LiveChat cerradas con código 4004 (si se disparan,
  B1 ha vuelto: alguien quitó el resolvedor o la 543 no está aplicada).
- Reintentos de Stripe y filas `stripe_webhook_events` en estado `processing`
  sin `processed_at` (si crecen, la credencial de `nelvyon_jobs` no llegó).

---

## 8. Rollback

Es inmediato y sin pérdida de datos:

1. Devolver `DATABASE_URL` del servicio API a la credencial anterior.
2. Redesplegar la API.

**La migración 543 no se revierte, y no hace falta revertirla.** No activa RLS
en ninguna tabla ni retira ninguna política existente: solo añade políticas
permisivas y una función. Con un rol que bypassa RLS —el de antes— esas
políticas no se evalúan, así que no cambian una sola respuesta. Revertirla sería
trabajo sin efecto y volvería a dejar el esquema desalineado con lo que la
aplicación hace.

Efecto: las políticas dejan de evaluarse otra vez (el rol vuelve a tener
`BYPASSRLS`) y el comportamiento es el de antes de la activación. Las llamadas
`set_config(...)` que la aplicación sigue haciendo en cada transacción son
inocuas con un rol que bypassa RLS: no alteran ninguna respuesta.

No hace falta borrar el rol `nelvyon_app` ni revertir ningún `GRANT`. Un rol sin
sesiones no hace nada.

**Lo único que no se revierte solo:** si se dejó `NELVYON_JOBS_DATABASE_URL`
puesta, los tres barridos seguirán usando `nelvyon_jobs`. Es correcto y
deseable, pero conviene saberlo al leer los logs.

---

## 9. Red permanente

| Fichero | Qué sostiene |
|---|---|
| `backend/db/migrations/543_rls_politicas_por_workspace.sql` | Las políticas por pertenencia de `subscriptions`/`oauth_connections` y el resolvedor de LiveChat. Idempotente: reaplicarla es también la forma de restaurar tras una mutación. |
| `backend/tests/test_rls_activacion_parcial.py` | La campaña con `nelvyon_app` real: 5 roles, aislamiento en ambos sentidos, CRUD, fail-closed, contexto inventado, manipulación de `X-Workspace-Id`, ciclo commit/rollback/pool, camino de jobs, plan e integraciones por workspace con su límite hacia otro workspace, WebSocket resolviendo su inquilino, y **pruebas de mutación** que rompen a propósito la política, el contexto y el resolvedor para demostrar que los asserts tienen dientes. |
| `backend/tests/test_rls_conexiones_con_contexto.py` | Guard: ninguna creación de motor fuera de `core/database.py`; todo módulo de fondo declara su inquilino o su excepción escrita; los `*_worker.py` nuevos entran solos en el inventario; el WebSocket sigue resolviendo su inquilino; y la 543 sigue declarando su ampliación de alcance. |
| `backend/core/contexto_rls.py` | El enganche `after_begin` que fija el contexto en **cada** transacción. |
| `backend/core/tenant_context.py` | `contexto_de_inquilino(...)`: contexto explícito para caminos de fondo, con restauración por token. |
| `backend/core/database.py` | `sesion_de_barrido()`: la única puerta al rol `nelvyon_jobs`. Quién puede cruzarla está declarado, con motivo, en `CONSUMIDORES_DE_LA_SESION_PRIVILEGIADA` del guard. |
| `backend/tests/test_rls_webhook_stripe_sistema.py` | El webhook de Stripe como actor de sistema: firma inválida / ausente / sin secreto siguen rechazándose; la sesión privilegiada no se abre si la firma no verifica; solo la recibe `SubscriptionsService`; y sin `NELVYON_JOBS_DATABASE_URL` la conducta es la de siempre. |
