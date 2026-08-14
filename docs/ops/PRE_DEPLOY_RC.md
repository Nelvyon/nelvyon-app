# NELVYON — Pre-deploy del Release Candidate

```text
RC commit    b7bd2b9d   (bc1202e0 + arreglos de despliegue + healthcheck readiness)
rama         audit/2026-08-08-full-hardening
árbol        limpio
push/PR      ninguno
```

Este documento no vuelve a auditar el producto. Describe **cómo se despliega**,
qué entra, qué puede salir mal y cómo se vuelve atrás.

---

## 1. Orden real de despliegue

Railway ejecuta **dos servicios independientes sobre la misma base de datos**.

### Servicio web (`railway.toml`, raíz)

```
1. build            Dockerfile de la raíz  →  apps/web (Next.js)
2. preDeployCommand pnpm -C apps/web migrate:prod
3. healthcheck      GET /api/health/live        (timeout 300 s)
4. tráfico          sólo si 2 y 3 pasan
```

`preDeployCommand` corre **después del build y antes de recibir tráfico**. Si
falla, Railway aborta la promoción y el tráfico sigue en la versión anterior.

### Servicio API (`railway.backend.json`, rootDirectory `backend`)

```
1. build            backend/Dockerfile
2. start            uvicorn main:app --host 0.0.0.0 --port 8000
3. healthcheck      GET /health                 (timeout 120 s)
```

**No tiene `preDeployCommand`: este servicio NO migra.** Al arrancar ejecuta
`assert_production_ready()` —aborta sin `JWT_SECRET` o `DATABASE_URL`— y después
`Base.metadata.create_all`, que crea las 44 tablas que ninguna migración crea.

### La consecuencia que hay que respetar

`create_all` usa `checkfirst`: **no toca una tabla que ya existe**. Si el
servicio API arranca antes de que el web haya migrado, puede crear con la forma
del ORM una tabla que la migración habría creado con otra. Es el mecanismo que
produjo las colisiones de esquema ya cerradas.

**Orden obligatorio: primero el web (que migra), después el API.**

### Qué pasa si una migración falla

`backend/db/migrate.ts` aplica los ficheros ordenados por nombre y registra cada
uno en `_migrations` **sólo después de que se aplique**. Un error propaga,
`process.exit(1)`, el `preDeployCommand` falla y **no hay promoción**.

Una migración a medias no queda registrada, así que se reintenta en el siguiente
despliegue. Las 11 que entran son idempotentes (`IF NOT EXISTS`, `DO $$` con
comprobación previa), de modo que reintentar es seguro.

---

## 2. El gate de migración de producción (ADR-064)

`apps/web/scripts/migrate-prod.ts`:

| entorno | comportamiento |
|---|---|
| dev / staging | aplica automáticamente |
| **producción** | aplica **sólo** con `NELVYON_PROD_MIGRATE_APPROVED=1` y `NELVYON_PROD_MIGRATE_APPROVED_BY=<nombre>` |
| producción sin aprobación | no-op si no hay pendientes; **falla el deploy si hay pendientes** |

**Este RC trae 11 migraciones pendientes.** Sin las dos variables de aprobación,
el despliegue a producción **fallará por diseño**. No es un defecto: es el gate
haciendo su trabajo. Hay que ponerlas conscientemente.

---

## 3. Migraciones que entran (523 → 533)

| # | operaciones | riesgo |
|---|---|---|
| 523 | ADD COLUMN | ninguno |
| 524 | ADD COLUMN, CREATE INDEX | bloqueo breve por índice |
| 525 | ADD COLUMN, CREATE INDEX | bloqueo breve por índice |
| 526 | DROP NOT NULL | ACCESS EXCLUSIVE instantáneo |
| 527 | CREATE INDEX | bloqueo breve |
| 528 | DROP NOT NULL, **ADD PRIMARY KEY** | **el más caro**: construye índice único sobre `intent_scores` con ACCESS EXCLUSIVE |
| 529 | ADD COLUMN, CREATE INDEX, BACKFILL | `UPDATE` sobre `oauth_connections` e `integration_whatsapp` |
| 530 | DROP INDEX | instantáneo |
| 531 | CREATE INDEX × 21 | 21 bloqueos breves, uno por tabla |
| 532 | ADD COLUMN, BACKFILL, RENAME **sólo si la tabla está vacía** | rehúsa y avisa si hay filas |
| 533 | ADD COLUMN × 9, BACKFILL, CREATE INDEX × 9 | `UPDATE` derivado del puente `saas_tenants` |

**Ninguna contiene `DROP TABLE`, `DROP COLUMN`, `DELETE` ni `TRUNCATE`.**
Verificado por barrido, no por lectura.

### Las dos a vigilar

- **528** añade una PRIMARY KEY. Si `intent_scores` es grande en producción, ese
  paso bloquea escrituras mientras construye el índice. Es el único con coste
  proporcional al volumen.
- **531** crea 21 índices sin `CONCURRENTLY` — no puede usarlo, porque el
  ejecutor envuelve cada fichero y `CONCURRENTLY` no admite transacción. Son
  tablas que hoy **no tienen** ese índice, es decir las menos consultadas.

**Antes de aplicar, mide en producción (sólo lectura):**

```sql
SELECT relname, n_live_tup
  FROM pg_stat_user_tables
 WHERE relname IN ('intent_scores','campaigns','activities','contracts',
                   'linkedin_inbox','loyalty_points','text2pay_payments')
 ORDER BY n_live_tup DESC;
```

Con `intent_scores` por debajo de ~1 M filas, 528 es cuestión de segundos. Por
encima, conviene ventana de mantenimiento.

### Camino de actualización, verificado

No se probó sólo «desde cero». Se reprodujo el **camino real**:

```
base de producción esperada (422 migraciones)  →  aplicar 523-533
    422 aplicadas · 0 fallos
     11 aplicadas · 422 saltadas · 0 fallos
```

Y el esquema resultante se comparó con el construido desde cero: **idénticos**
salvo restos de drills y la tabla `_migrations` del simulador. Ninguna migración
tardó más de 300 ms sobre base vacía.

---

## 4. Variables de entorno

505 variables se referencian en el código. Sólo estas deciden el despliegue.

### REQUIRED — el proceso no arranca sin ellas

| variable | servicio | efecto si falta |
|---|---|---|
| `DATABASE_URL` | web + API | `assert_production_ready()` aborta el arranque |
| `JWT_SECRET` (o `JWT_SECRET_KEY`) | API | aborta el arranque |

Son deliberadamente sólo dos: lo demás falla cerrado donde se usa, y abortar el
arranque por una integración concreta dejaría el producto entero caído.

### REQUIRED para el gate de migración

| variable | valor |
|---|---|
| `NELVYON_PROD_MIGRATE_APPROVED` | `1` |
| `NELVYON_PROD_MIGRATE_APPROVED_BY` | nombre de quien aprueba |

Sin ellas el deploy falla, porque hay 11 pendientes.

### NUEVAS en este RC — sin ellas, esos webhooks devuelven 503

Es fail-closed y correcto, pero hay que configurarlas **antes** o esas
integraciones dejan de recibir:

| variable | webhook afectado |
|---|---|
| `META_WA_APP_SECRET` | WhatsApp entrante y tickets de WhatsApp |
| `TWILIO_AUTH_TOKEN` | SMS y llamadas entrantes *(ya existía, 18 usos)* |
| `ZOOM_WEBHOOK_SECRET_TOKEN` | eventos de reunión |
| `TIKTOK_WEBHOOK_SECRET` | DMs de TikTok |
| `SIGNATURIT_WEBHOOK_SECRET` | eventos de firma |
| `STRIPE_STORE_WEBHOOK_SECRET` o `STRIPE_WEBHOOK_SECRET` | **pagos de tiendas** |

### OPCIONALES con efecto conocido

| variable | efecto |
|---|---|
| `AWS_SNS_TOPIC_ARNS` | si se define, sólo se aceptan esos temas SNS |
| `TWILIO_WEBHOOK_BASE_URL` | fija la URL pública si el proxy no propaga `X-Forwarded-*` |
| `JWT_ALGORITHM` | **no puede ser ES256/ES384/ES512**: el arranque de firma los rechaza (PYSEC-2026-1325) |

### Regla de fail-closed, ya aplicada

Ninguna función sensible cae a una credencial global cuando falta la suya:
WhatsApp y SES resuelven por workspace y devuelven 503 si no hay integración; el
webhook de tiendas rehúsa sin secreto en vez de aceptar el cuerpo sin firmar.

---

## 5. Backup y rollback

### Principio

```
BACKUP VERIFICADO → MIGRACIÓN → DEPLOY → SMOKE → PROMOCIÓN
```

El backup se verifica **restaurándolo**, no comprobando que el fichero existe.
`scripts/run-postgres-restore-drill.mjs` hace exactamente eso y da 8/8; su paso
de copia exige un dump de más de 512 bytes desde que se descubrió que aprobaba
copias vacías.

### Qué es reversible y qué no

| migración | reversible sin pérdida |
|---|---|
| 523, 524, 525, 529, 531, 533 | sí — columnas e índices nuevos; revertir el código los deja sin usar |
| 526 | sí conceptualmente; volver a poner `NOT NULL` exige que no haya nulos |
| 527, 530 | sí — índices |
| 528 | **no automáticamente**: quitar una PRIMARY KEY es una decisión, no un rollback |
| 532 | reversible con `ALTER TABLE ... RENAME` inverso; sólo actúa sobre tablas vacías |

**No se escriben migraciones DOWN destructivas.** Un rollback de esquema se hace
restaurando el backup, no borrando columnas.

### Procedimientos por escenario

**A · Rollback de aplicación al commit anterior.** Redeploy del commit previo en
ambos servicios. Las 11 migraciones son aditivas: el código antiguo ignora las
columnas nuevas. *No requiere tocar la base.* Es el caso normal.

**B · Migración aplicada y aplicación revertida.** Igual que A: aditivas. La
única atención es 532, que puede haber apartado `deals`/`conversations` a
`*_saas_legacy` **si estaban vacías**; el código antiguo esperaba esas tablas.
Si ocurrió, deshacer con el `RENAME` inverso.

**C · Fallo durante migraciones.** No hay promoción; el tráfico sigue en la
versión anterior. Leer qué fichero falló en el log de `preDeploy`, corregir,
repetir. La base queda con las migraciones anteriores aplicadas y consistente.

**D · Backend nuevo incompatible.** Redeploy del servicio API al commit
anterior. El web puede quedarse en el nuevo: las migraciones son aditivas.

**E · Frontend nuevo incompatible.** Redeploy del servicio web al commit
anterior. **Ojo**: eso volvería a ejecutar `migrate:prod` del commit viejo, que
no tiene pendientes → no-op. Seguro.

**F · Healthcheck fallando.** Railway reintenta según `restartPolicyMaxRetries`
(10 en web, por defecto en API) y no promociona. Revisar arranque: lo más
probable es `assert_production_ready()` abortando por variable ausente.

**G · Pérdida de conexión a la base.** El API responde `/health` igual
—ver riesgo abajo— pero `/health/ready` da 503. Revisar `DATABASE_URL` y el pool.

**H · Worker defectuoso.** No hay servicio de workers separado: los jobs corren
en proceso (`core/job_queue`). Un job defectuoso no impide servir tráfico; se
mira `job_queue` en los logs.

---

## 6. Staging

**Existe**: `ideal-victory-staging.up.railway.app`, con
`RAILWAY_ENVIRONMENT_NAME=staging`, donde el gate de migración **aplica
automáticamente**. Hay flujos de CI dedicados (`staging-smoke-p0.yml`,
`staging-elite-gate.yml`).

### Procedimiento para desplegar el RC en staging

```bash
# 1. El commit exacto, sin merge
git rev-parse HEAD                    # 6c565e10…

# 2. Backup del staging ANTES (aunque sea staging: se verifica el drill)
CERT_PG_CONTAINER=<contenedor> CERT_PG_USER=<usuario> \
CERT_SOURCE_DB=<base> DATABASE_URL=<staging> \
  node scripts/run-postgres-restore-drill.mjs      # exige 8/8

# 3. Desplegar el servicio WEB primero (es el que migra)
#    Railway aplicará 523-533 automáticamente por ser staging.

# 4. Verificar que las 11 quedaron registradas
psql "$STAGING_DATABASE_URL" -c \
  "SELECT name FROM _migrations WHERE name >= '523' ORDER BY name;"

# 5. Sólo entonces, desplegar el servicio API
```

El orden importa: si el API arranca antes, `create_all` puede fijar la forma de
una tabla que la migración iba a crear.

---

## 7. Smoke de staging

Representativo y sin efectos externos. Ninguna llamada genera coste.

| # | comprobación | espera |
|---|---|---|
| 1 | `GET /health` (API) | 200 |
| 2 | `GET /health/ready` (API) | 200 — **comprueba la base** |
| 3 | `GET /api/health/live` (web) | 200 |
| 4 | `GET /api/v1/workspace/list` sin token | **401** |
| 5 | login con usuario de staging | 200 + token |
| 6 | `GET /api/v1/workspace/list` con token | 200 |
| 7 | crear un contacto y leerlo | 201 y 200 |
| 8 | leer con el token de OTRO workspace | **404/403, nunca la fila** |
| 9 | `POST /api/tiktok-dm/webhook` sin secreto | **4xx y cero efectos** |
| 10 | `POST /api/v1/system-health/metrics/track` sin sesión | **401** |
| 11 | tracking de clic a destino ajeno a la campaña | **400, sin `Location`** |
| 12 | frontend: login → dashboard → navegación | sin errores de consola |
| 13 | `SELECT count(*) FROM _migrations` | 433 |

Los pasos 8, 9, 10 y 11 son los que cubren lo que se cerró en este RC:
aislamiento, webhooks fail-closed, escritura pública y open redirect.

**Prohibido en el smoke**: cobros reales, envíos de email/WhatsApp/SMS,
campañas, y llamadas a proveedores que facturen.

---

## 8. Observabilidad — qué mirar los primeros minutos

| señal | dónde | qué significa |
|---|---|---|
| `Refusing to start in production without:` | log de arranque del API | falta `JWT_SECRET` o `DATABASE_URL`. Aborta, no promociona |
| `[migrate] run:` / `[migrate] done:` | log de `preDeploy` | progreso migración a migración |
| `[migrate-prod]` | log de `preDeploy` | decisión del gate de aprobación |
| `audit.escritura_fallida` | ERROR | la traza de una acción crítica no se guardó |
| `audit.tenant_ausente` | ERROR | workspace sin fila en `saas_tenants` |
| `plan_quota.consulta_fallida` | ERROR | **todo cliente degradado a `starter`** |
| `*_webhook_secret_missing` | ERROR | webhook devolviendo 503 por secreto ausente |
| `*_webhook_signature_mismatch` | WARNING | firma inválida: o hay un atacante o el secreto no coincide |
| `os_store_stock_insuficiente_al_pagar` | WARNING | se cobró sin stock |
| 5xx en `/api/*` | métricas | regresión funcional |
| `/health/ready` en 503 | healthcheck | la base no responde |

Los tres primeros ERROR son nuevos de este RC y son exactamente las condiciones
que antes pasaban en silencio.

---

## 9. Checklist GO / NO-GO

| # | condición | cómo se comprueba |
|---|---|---|
| 1 | commit RC identificado | `git rev-parse HEAD` = `6c565e10…` |
| 2 | árbol limpio | `git status --porcelain` vacío |
| 3 | CI verde | flujo del PR |
| 4 | backup verificado **restaurando** | drill 8/8 |
| 5 | staging desplegado con el mismo commit | `_migrations` con 433 filas |
| 6 | smoke de staging verde | los 13 pasos |
| 7 | variables REQUIRED presentes | `DATABASE_URL`, `JWT_SECRET` |
| 8 | aprobación de migración puesta | `NELVYON_PROD_MIGRATE_APPROVED` + `_BY` |
| 9 | secretos de webhook configurados | los 6 de la tabla |
| 10 | `/health` y `/health/ready` verdes en staging | 200 y 200 |
| 11 | 0 CRITICAL, 0 HIGH | informe de RC |
| 12 | sin regresiones respecto al RC | suites completas |
| 13 | volumen de `intent_scores` medido | consulta de sólo lectura |

**Cualquier incumplimiento = NO-GO.**

---

## 10. Healthcheck del API — RESUELTO

`railway.backend.json` y `backend/railway.json` apuntaban a `/health`, que
devuelve `healthy` sin mirar la base. Ya apuntan a `/health/ready`, que ejecuta
`SELECT 1` y devuelve 503 cuando la base no responde: un despliegue con la base
inalcanzable ya no se promociona.

`/health` se conserva como liveness. Siete tests fijan la diferencia, incluido el
control negativo de que liveness NO debe depender de la base — si dependiera, un
corte transitorio reiniciaría el proceso en vez de sacarlo del balanceo.

---

## 11. Estado real de la infraestructura (medido, 2026-08-14)

Consultado con el CLI de Railway en modo lectura. **No se ejecutó ningún
comando de despliegue.**

### Proyecto

```
truthful-respect · f6cf47db-4302-4f19-90c2-4c3d6f3c1d66
entornos: production, staging
```

### production

| recurso | estado |
|---|---|
| `nelvyon-app` (API) | ● Online |
| `@nelvyon/web` | ● Online · **Deploy failed hace 5 días** |
| Postgres | ● Online · volumen 1,1 GB |

El último `migrate-prod` registrado (2026-08-02) dice
`deploy_env=production(explicit) isProduction=true` y `pending_count=0`. Es
anterior a las 11 migraciones de este RC.

### staging — NO PROVISIONADO

| recurso | estado |
|---|---|
| `comfortable-empathy` | ● Online |
| `ideal-victory` | ● **Crashed · Deploy failed hace 5 días** |
| base de datos | **no existe** |

Las variables del entorno son 9, y las 9 son inyectadas por Railway
(`RAILWAY_*`). **No hay `DATABASE_URL` ni `JWT_SECRET`.**

Eso explica el fallo: el build termina bien y el healthcheck nunca pasa, porque
`preDeployCommand` ejecuta `migrate:prod`, que sale con error sin
`DATABASE_URL`. `ideal-victory-staging.up.railway.app` responde 502.

**Consecuencia: staging no puede certificar nada.** Sin base de datos no hay
migraciones que aplicar, ni readiness que ponerse verde, ni smoke que ejecutar.

### Secretos, por nombre (nunca por valor)

| variable | production `@nelvyon/web` | production `nelvyon-app` | staging |
|---|---|---|---|
| `DATABASE_URL` | ✅ | ✅ | ❌ |
| `JWT_SECRET` | ✅ | ✅ | ❌ |
| `STRIPE_WEBHOOK_SECRET` | ✅ | — | ❌ |
| `TWILIO_AUTH_TOKEN` | — | ✅ | ❌ |
| `META_WA_APP_SECRET` | ❌ | ❌ | ❌ |
| `ZOOM_WEBHOOK_SECRET_TOKEN` | ❌ | ❌ | ❌ |
| `TIKTOK_WEBHOOK_SECRET` | ❌ | ❌ | ❌ |
| `SIGNATURIT_WEBHOOK_SECRET` | ❌ | ❌ | ❌ |
| `STRIPE_STORE_WEBHOOK_SECRET` | ❌ | ❌ | ❌ |
| `NELVYON_PROD_MIGRATE_APPROVED` | ❌ | ❌ | ❌ |

Las dos REQUIRED están presentes en producción. **Cinco secretos de webhook
faltan en los dos entornos**: al desplegar, esas cinco integraciones devolverán
503 hasta que se configuren. Es el comportamiento correcto — antes aceptaban
cualquier cuerpo — pero hay que decidirlo, no descubrirlo.

No se han creado ni modificado variables: inventar un secreto sería peor que no
tenerlo, y reutilizar uno de producción en staging convertiría staging en un
riesgo de producción.

### Migración 528 — sin medir

Requiere contar filas de `intent_scores`. Staging no tiene base y producción no
se toca. **Queda como acción del operador**, con esta consulta de sólo lectura:

```sql
SELECT relname, n_live_tup,
       pg_size_pretty(pg_total_relation_size(relid)) AS tamano
  FROM pg_stat_user_tables
 WHERE relname = 'intent_scores';
```

Por debajo de ~1 M filas, 528 es cuestión de segundos.
