# Bloque 1 — clasificación de cierre

Una pasada por el inventario completo. Cada categoría acaba en **exactamente uno**
de cuatro estados, con la evidencia que lo sostiene o el motivo por el que no se
puede cerrar aquí.

- `PASS_CERTIFIED` — medido, con control positivo y mutación que lo tumba.
- `BLOCKED_ON_FOUNDER` — hace falta una decisión que no me corresponde.
- `BLOCKED_EXTERNALLY` — depende de algo fuera del árbol (infraestructura, proveedor).
- `RESIDUAL_RISK_DOCUMENTED` — conocido, medido, y se deja por escrito en vez de taparlo.

Lo que **no** aparece aquí es lo que no he medido. Ausencia de evidencia no es
evidencia de ausencia.

---

## 1. Auth / sesión — `PASS_CERTIFIED`

`verifyToken` entra en el contexto de inquilino **después** de verificar, nunca
antes. Las 854 rutas web fijan el inquilino por transacción
(`test_las_rutas_web_fijan_el_inquilino.py`). Login, registro, reset y el portal
tienen cupo con almacén compartido obligatorio en producción; `verify-email`,
`auth/token` y los tres endpoints de SSO no lo tenían y ahora sí.

El bloqueo de `verify-email` importa más de lo que parece: es una superficie de
**adivinación de token** sin sesión.

## 2. RBAC / escalada de privilegios — `PASS_CERTIFIED`

`test_workspace_mutation_authz_guard.py` (626 casos) exige que ningún endpoint de
plataforma se conforme con autoridad de workspace, que los *ads* de cliente no
usen mera pertenencia y que ninguna lectura justificada sea además sensible.

## 3. Aislamiento de inquilino / RLS / IDOR — `PASS_CERTIFIED`

- 46 familias de política; las cuatro que cubren el 91 % están certificadas con
  matriz completa SELECT/INSERT/UPDATE/DELETE (`rlsFamiliasSaas.pg.test.ts`).
- Aislamiento OS por el lado web: 33 casos (`aislamiento_os_lado_web.pg.test.ts`).
- Contexto por transacción, incluida la prueba afilada: **si B fija menos
  variables que A, no hereda las que A dejó** (`contextoDeInquilino.pg.test.ts`).
- Sobre la base virgen: **0 tablas con RLS activo y sin política** (rechazarían a
  todo el mundo) y **0 con política y sin RLS activo** (no protegerían a nadie).

Los controles positivos son obligatorios en todos: una implementación que
devuelva cero filas a todo el mundo no cuenta como aislamiento.

## 4. Roles de BD / grants / contexto — `BLOCKED_ON_FOUNDER`

`nelvyon_web_app` está construido y certificado 68/68 con privilegios mínimos
medidos del uso real, no inventados. Pero el servicio web sigue conectando como
`postgres` (SUPERUSER), y con eso **RLS es inerte para ese lado**.

`WEB_DB_ROLE_CUTOVER = BLOCKED_ON_FOUNDER`. El rol está listo; cambiarlo no me
corresponde.

## 5. SSRF / salida de red — `PASS_CERTIFIED`

El SSO permitía apuntar `issuer` y `metadataUrl` a la red interna **y devolvía
200 caracteres del cuerpo**, así que no era solo provocar la petición: era leer
el resultado. Cerrado, con revalidación antes de conectar —no solo al guardar,
porque repuntar el DNS es el ataque clásico contra eso— y sin devolver la
respuesta. 21 destinos prohibidos + control de que un proveedor legítimo sí pasa.

Los proxies comodín no eran SSRF (el host es fijo por concatenación) pero sí
permitían **recorrido de ruta**; cerrado con `subrutaDeProxy`, que rechaza en vez
de sanear.

## 6. Límite de peticiones / abuso / tamaño de cuerpo — `PASS_CERTIFIED`

El defecto de fondo: **la clave del cubo la elegía quien era limitado**. Los tres
limitadores montados leían el extremo del cliente de `x-forwarded-for`. Cambiando
esa cabecera se estrenaba cubo en cada petición; y dos clientes distintos que
mandaran el mismo valor caían en el mismo. En `anti_scraping` era peor: esa clave
**bloquea una hora**, así que se podía dejar fuera a un tercero.

También: `INCR`/`EXPIRE` en dos peticiones dejaba claves **sin caducidad** —429
permanente para esa IP— y `_ip_hits` no soltaba nunca sus entradas.

El lado web no tenía tope de cuerpo (App Router no lo trae y el de FastAPI no lo
cubre). Cerrado sin fiarse de `Content-Length`, que es una declaración.

`/health` sigue exento y usable por la infraestructura, con guardia para que ese
prefijo no se ensanche.

## 7. SQL / deriva de esquema — `RESIDUAL_RISK_DOCUMENTED` + `BLOCKED_ON_FOUNDER`

Once huecos entre lo que el código escribe y lo que las migraciones crean. No son
lo mismo y por eso no se tratan igual:

| Caso | Estado |
|---|---|
| `security_events.message/metadata` | producción sí las tiene (rama antigua de alembic), la cadena SQL no → **hueco de recuperación** |
| `campaigns.from_email/from_name`, `affiliate_clicks.affiliate_id`, `saas_conversations.metadata`, `retail_results.output/sector` | no están en ninguna parte: el INSERT falla **hoy**, y los cinco son alcanzables desde una ruta |
| `invoices`, `ab_tests` | el servicio escribe una forma y la tabla tiene otra. **Tres** migraciones crean `invoices` (054, 415, 507) y gana la primera por `IF NOT EXISTS` — quedan `invoices_pkey` e `invoices_pkey1`; existe además `saas_invoices` |
| `chatbot_conversations.workspace_id` | en una tabla de inquilino no es un campo más: decide el aislamiento y arrastra política de RLS |

**Cinco de los once los cierra la migración 576**, escrita y certificada aquí:
solo `ADD COLUMN IF NOT EXISTS`, sin borrar, sin renombrar, sin backfill y sin
ninguna columna `NOT NULL`. Probada idempotente aplicándola tres veces seguidas.
Reconstrucción virgen con ella: 475 migraciones, 0 fallos duros, y los huecos
bajan de **11 a 4** — exactamente los que dejé fuera a propósito.

`SHA256 = f570a0b0700ba210c7b6f2984f42b885ba8f926e6f85ebfb0d6cb93bc1d66b92`

**No está aplicada.** `ADR-064 = BLOCKED_ON_FOUNDER`. Mientras no se aplique,
esos cinco INSERT siguen fallando en producción.

Los cuatro que quedan **no** son «falta una columna», son una decisión: a qué
tabla pertenece cada servicio, y qué semántica de tenencia tiene un
`workspace_id`. **Alcance de producto: `BLOCKED_ON_FOUNDER`.** No invento columnas
ni tenencia.

Hay un **trinquete** que falla si aparece un hueco nuevo y también si uno deja de
reproducir y sigue en la lista — para que el inventario no se convierta en algo
que nadie lee.

## 8. Migraciones / recuperación — `PASS_CERTIFIED` (con deuda documentada)

Con la semántica **real** del ejecutor: PostgreSQL virgen → 474 migraciones →
**0 fallos duros** → 709 tablas.

El único «fallo duro» anterior era mío: `280_rls_service_role.sql` son 2207 bytes
de solo comentarios y mi ejecutor intentaba ejecutarlos.

Catálogo **semántico**, no recuentos: 6560 columnas · 1331 restricciones · 2299
índices · 175 funciones · 586 tablas con RLS · 535 con FORCE. Comparar recuentos
de tablas no certifica nada: dos bases con las mismas 712 tablas se comportan
distinto si a una le falta un FORCE o una política.

Deuda de la 507: **94 sentencias toleradas** (39 `42703`, 40 `42883`, 15
`42P01`) que se dan por aplicadas sin haberlo sido. Detectada y contada; no se
puede corregir sin tocar el árbol desplegable.

`ADR-064 = 568/569/570/572/573/574/575 = BLOCKED_ON_FOUNDER`. `571 = APARTADA`,
con guardia que impide que vuelva al árbol.

## 9. GDPR — `PASS_CERTIFIED`

La supresión no podía completarse y además cancelaba Stripe **primero**, así que
un fallo posterior dejaba a la persona sin suscripción y con sus datos. Ahora la
cancelación va al final y los `catch` que se tragaban todo solo toleran `42P01` y
`42703`, con aviso, propagando lo demás.

## 10. Stripe / facturación — `PASS_CERTIFIED` + `BLOCKED_ON_FOUNDER`

Firmas verificadas en los seis webhooks de dinero; Paddle es una lápida 410.
Slack con ventana de 300 s y comparación de tiempo constante.

Una baja de membresía **resucitaba** con un reintento: `active` pisaba un estado
terminal y `checkAccess` abre el material de pago con `status='active'`. Cerrado.

`STRIPE_MEMBERSHIP_REACTIVATION = BLOCKED_ON_FOUNDER`: el único evento que lleva
a `active` es `customer.subscription.created`, así que quien caduca por impago no
vuelve nunca aunque pague. Qué evento y con qué reglas debe reactivar es una
decisión de producto. **No uso el comportamiento accidental anterior como
recuperación**: dependía de que Stripe entregara desordenado, y era el agujero.

## 11. Webhooks / replay / idempotencia — `PASS_CERTIFIED`

El reclamo certificado contra PostgreSQL real: replay, duplicados simultáneos
(ocho entregas a la vez → exactamente un ganador), estado terminal que no caduca,
recuperación de un `processing` atascado a los 10 minutos, que uno reciente no se
roba, reintento de fallidos y aislamiento entre eventos.

Con **control del defecto**: la forma ingenua (SELECT y luego INSERT) reproduce y
sí deja pasar varios — sin eso, «exactamente un ganador» podría estar midiendo la
suerte del planificador. Y el SQL de la prueba se compara con el de la ruta, para
que no certifique una consulta que ya no existe.

Salientes: reintentos con retroceso derivado de `created_at + 2^intento`
(12 pruebas + 5 mutaciones).

## 12. Jobs / crons / colas / concurrencia — `PASS_CERTIFIED`

Las 16 rutas de cron verifican credencial y **fallan cerradas** sin secreto. No
tenían ninguna prueba: ahora 16, más guardia para que la 17 no nazca abierta. La
propiedad de tiempo constante se comprueba **sobre el código**, porque sustituir
`timingSafeEqual` por `===` no lo tumba ninguna prueba funcional.

Colas: reclamo con `FOR UPDATE SKIP LOCKED` y control que reproduce la forma
anterior y demuestra que **sí** se solapaba.

## 13. Subidas / recorrido de ruta / almacenamiento — `PASS_CERTIFIED`

Tres rutas bufferizan cuerpo y ninguna tenía tope; dos son anónimas. Cerrado.

Al arreglarlo apareció algo peor que el defecto: cancelar el flujo deja un rechazo
**suelto** en Node y un rechazo no capturado tumba el proceso. Medidas las tres
variantes; solo no cancelar queda limpio. Se sigue sin acumular más del tope en
memoria —el vector real—; no se ahorra ancho de banda. Hay guardia, porque vitest
avisa de los rechazos sueltos pero no falla por ellos.

## 14. Secretos / configuración — `PASS_CERTIFIED`

No hay secretos vivos en el árbol. Los DSN son locales; los JWT están en la
evidencia E2E, son de usuarios `@nelvyon.test` y caducaron hace 29 días.

Guardia puesto: lo que se guarde como evidencia tiene que estar **muerto**
—caducado **y** de un usuario de prueba—. Caducado no basta: sigue revelando
correo, inquilino y plan.

## 15. Interruptor de IA / Memory / RAG / voz — `PASS_CERTIFIED`

`NELVYON_AI_ENABLED` se documentaba como interruptor maestro y **no lo consultaba
casi nadie**: 26 servicios Python con su propia copia de `_openai_client()`, el
motor de agentes, los cuatro generadores (imagen, vídeo, 3D, voz), el adaptador
autónomo, la transcripción y hasta la sonda de salud.

Lo único que evitaba el gasto era que no hubiera clave. Eso es una casualidad, no
un interruptor. Ahora: un solo interruptor, dos implementaciones, mismo valor por
defecto —apagado—, y una prueba que lo comprueba; si discreparan, apagar uno
dejaría el otro encendido hasta la factura.

Degradación explícita con la forma que ya usaba cada sitio. Nunca un éxito
inventado.

**Coste externo generado: 0 €. Ningún proveedor activado.**

## 16. Observabilidad / health / readiness / registro — `PASS_CERTIFIED`

`/api/health/*` y `/api/os/health` exentos del middleware — tienen que serlo: un
429 al sondeo de Railway marca la instancia como caída y la reinicia. `os/health`
es `SELECT 1`; `health/deep` exige `CRON_SECRET`. Guardia para que nada caro ni
anónimo se cuelgue de ese prefijo, y para que el prefijo no se ensanche.

El SSO dejó de devolver el cuerpo de la respuesta ajena; queda en el registro del
servidor, donde sirve para diagnosticar sin filtrar.

## 17. Copia / restauración / recuperación ante desastre — `BLOCKED_EXTERNALLY` + `RESIDUAL_RISK_DOCUMENTED`

La reconstrucción **del esquema** desde migraciones está certificada (categoría 8)
y los huecos que impedirían que el código funcionara tras restaurar están
inventariados (categoría 7).

La copia y restauración **de datos** la gobierna Railway y no es verificable desde
el árbol sin tocar producción: `BLOCKED_EXTERNALLY`. No lo doy por bueno ni por
malo — no lo he medido.

## 18. Integraciones y acciones externas — `RESIDUAL_RISK_DOCUMENTED`

Firmas de entrada certificadas (categoría 10). El guardia de salida se aplica en
SSO y webhooks. Quedan integraciones (Meta, Google, TikTok, Snapchat, Twilio, SES)
cuyo comportamiento real solo se puede certificar contra el proveedor, y eso
generaría coste o requeriría credenciales que no tengo autorización para usar.

Lo que sí está cerrado: ninguna de ellas puede gastar en IA (categoría 15), y
ninguna acción irreversible es automática
(`test_autopilot_14_servicios.py::test_ninguna_capacidad_irreversible_es_automatica`).

---

## Lo que queda bloqueado, y por quién

| Punto | Estado |
|---|---|
| `WEB_DB_ROLE_CUTOVER` | BLOCKED_ON_FOUNDER |
| `ADR-064` = 568/569/570/572/573/574/575 | BLOCKED_ON_FOUNDER |
| `571` | APARTADA (guardia impide que vuelva al árbol) |
| `STRIPE_MEMBERSHIP_REACTIVATION` | BLOCKED_ON_FOUNDER |
| A qué tabla pertenecen `InvoicingService` y `ABTestingService` | BLOCKED_ON_FOUNDER (alcance de producto) |
| `chatbot_conversations.workspace_id` y su política | BLOCKED_ON_FOUNDER (semántica de tenencia) |
| Copia/restauración de datos | BLOCKED_EXTERNALLY (Railway) |
| Certificación contra proveedores externos reales | BLOCKED_EXTERNALLY (coste / credenciales) |

## Riesgos residuales, por escrito

1. **51 tablas con RLS y sin `FORCE`.** Medido sobre la base virgen, no supuesto:

   | quién consulta | FORCE | filas que ve (de 2, con política que deja 1) |
   |---|---|---|
   | dueño **no** superusuario | sin FORCE | **2** — se salta su propia política |
   | dueño **no** superusuario | con FORCE | 1 |
   | superusuario | con FORCE | **2** — se salta todo, FORCE es irrelevante |
   | rol que **no** es dueño | sin FORCE | 1 — la política se aplica igual |

   Es decir: la falta de `FORCE` solo importa si el rol que conecta **es dueño de
   la tabla y no es superusuario**. Hoy el servicio web conecta como `postgres`
   (superusuario), para el que RLS es inerte con FORCE o sin él — eso ya está
   recogido en `WEB_DB_ROLE_CUTOVER`. Y para `nelvyon_app`, que no es dueño, la
   política se aplica igual.

   Queda por saber quién es el dueño de esas 51 tablas en producción, y eso es
   **una consulta** el día que haya autorización para leer allí:

   ```sql
   SELECT c.relname, pg_get_userbyid(c.relowner)
     FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname='public' AND c.relrowsecurity AND NOT c.relforcerowsecurity;
   ```

   No lo doy por bueno ni por malo: está acotado y sé exactamente cómo cerrarlo.
2. **94 sentencias toleradas en la 507**, contadas por código de error. Mientras
   sigan ahí, esa migración puede volver a aplicarse a medias sin decirlo.
3. **Cinco caminos vivos escriben columnas que no existen** (categoría 7). No son
   una fuga: son funcionalidad rota que hoy falla en producción.
4. **Producción y una recuperación desde cero no producen el mismo esquema.**
   Medido y acotado; no cerrado.
