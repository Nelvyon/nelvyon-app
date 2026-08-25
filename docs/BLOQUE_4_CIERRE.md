# BLOQUE 4 — cierre

**Operación real.** SHA certificado: `cf43aeda`, rama `bloque4-webhooks`.

El Bloque 4 es lo que pasa cuando el producto está **en marcha y alguien de fuera
le habla**: un webhook que llega, un trabajo que se encola, una integración que
responde tarde, un pago que se confirma dos veces. Es la superficie donde el
sistema **no controla el ritmo ni el orden** de lo que le llega.

Eso explica el resultado: de 13 capacidades, **8 tenían un defecto**. En los
bloques anteriores la proporción fue mucho menor. Aquí no es que el código
estuviera peor escrito — es que casi todo lo que falla en esta superficie solo
falla cuando hay dos instancias, o cuando el proveedor reintenta, o cuando dos
cosas ocurren a la vez. Nada de eso se ve leyendo el código.

---

## Los defectos

### 1 · La base cambiaba una vez, el efecto externo ocurría dos

La guarda de recencia de Stripe (`last_stripe_event_at < $2`) protegía la fila —un
evento repetido tiene el mismo `created`, así que no reescribe— pero el resultado
del `UPDATE` **se descartaba** y `downgradeSaasTenantPlan` y `sendEmail` corrían
igual. El cliente recibía un **segundo correo** diciéndole que su suscripción se
ha cancelado.

Stripe reintenta ante cualquier respuesta que no sea 2xx y además puede entregar
duplicados: «llega dos veces» es el funcionamiento normal del proveedor, no un
caso raro.

**Que la fila quede bien no basta cuando el efecto sale hacia fuera.**

### 2 · Idempotencia que solo valía dentro de un proceso

La deduplicación de webhooks era un `Map` en memoria. Con dos instancias —o una
que se reinicia entre dos entregas— deja de deduplicar y `dispatchWebhookIn`
vuelve a lanzar los workflows del inquilino, con sus correos y sus llamadas.

**«Idempotente dentro de un proceso» no es idempotente**: el proveedor reintenta
contra el balanceador, no contra un proceso concreto.

Cerrado **sin migración**: `erp_idempotency_keys` ya existía con la clave única
correcta y **nadie la usaba** desde TypeScript. Su nombre dice `erp` por su
origen, pero su forma es genérica. Crear otra tabla igual habría sido tocar
producción para duplicar algo que ya estaba.

### 3 · La recuperación mataba trabajo vivo de otra instancia

`recoverStaleJobs` fallaba **todos** los trabajos en curso al arrancar. Con una
instancia es correcto —si está arrancando, nadie estaba trabajando—. Con dos,
desplegar la instancia B mataba el trabajo en vuelo de la A, y el cliente veía
«interrumpido por reinicio» en un trabajo que iba perfectamente.

Acotado por último latido, otra vez **sin columna nueva**: `os_jobs.updated_at`
ya avanza en cada paso del agente. La señal estaba ahí.

### 4 · La tabla de precios se podía reescribir en caliente

`PLAN_PRICES` era un objeto exportado y **mutable**. Lo descubrió la propia
prueba, que lo cambió de verdad y falló por su propia mutación — la demostración
más directa posible de que se podía. Congelado, junto con la tabla que decide de
qué precio de Stripe se cobra.

### 5 · SSRF en los webhooks salientes

`isSafeWebhookUrl` solo comprobaba `https:` y que hubiera host. Dejaba pasar
`169.254.169.254` —el endpoint de metadatos de la nube—, `127.0.0.1` y cualquier
dirección interna. La URL **la configura el inquilino** y NELVYON hace el POST
**desde dentro de su propia infraestructura**.

Había **tres copias** del mismo control en el árbol: la canónica
(`assertSafeEgressUrl`, con bloqueo IPv4/IPv6 y metadatos), los rangos del modo
privado, y esta. Tres copias de un control es garantía de que dos se queden
atrás, y la débil era justo la que se usaba. Ahora todas delegan en una, y hay
una prueba que compara las dos rutas sobre los mismos casos.

### 6 · El correo no tenía interruptor

NELVYON tenía `NELVYON_AI_ENABLED` para la IA y **nada** para el correo. Con
credenciales de SES en el entorno, cualquier ejecución —una suite, un script, una
certificación— podía mandar correos **reales** a las direcciones de las fixtures.
Un correo enviado no se devuelve.

Apagado, `sendEmail` **lanza** en vez de devolver en silencio: un envío que se da
por hecho sin salir deja al cliente creyendo que ha avisado a alguien. Y el error
lleva tipo propio para distinguir tres cosas que no son la misma: **desactivado**,
**falló el proveedor** y **enviado**.

### 7 y 8 · Dos de mi propia certificación

Un import del SDK de Stripe que se pagaba **dentro** del presupuesto de 5 s de la
primera prueba (2687 ms medidos), y una captura de `process.env` en el cuerpo de
un `describe` que violaba un trinquete escrito en el Bloque 1. Los dos aparecieron
en la puerta final, los dos se corrigieron en la causa.

---

## Dos lecciones de método

Ambas aparecieron **dos veces cada una**, en capacidades distintas. No son
anécdotas.

**Un negativo verde no certifica una defensa si la ejecución nunca la alcanzó.**
En OAuth, la suite usaba `NELVYON_HMAC_SECRET` y el módulo lee `JWT_SECRET`: todos
los negativos rechazaban por firma incorrecta, no por la propiedad que decían
medir. Lo destapó la única prueba que esperaba **éxito**. En GDPR, el error se
lanzaba en una sentencia que va por `tryQuery` y no por `tryExec`, así que mutar
`tryExec` no tumbaba nada.

**Un timeout no se arregla subiendo el timeout.** Dos pruebas fallaron con `Test
timed out in 5000ms` y pasaban aisladas. La tentación era achacarlo a saturación
—como ocurrió legítimamente en el Bloque 2—, pero el número concreto (2687 ms)
señalaba la causa: el import del SDK dentro del caso. De 2687 ms a 26 ms.

---

## Evidencia de la puerta

Toda sobre `cf43aeda`, ejecutada **en serie**, nunca solapando cargas.

| Tanda | Resultado |
|---|---|
| Web completa (830 ficheros) | **7663 pasadas · 0 fallos · 178 saltadas** · 133 s |
| Python completa, PostgreSQL real | **3616 pasadas · 0 fallos · 10 saltadas** · 8:54 |
| Aislamiento y RLS, en serie | **95 / 95** |
| Guardianes de inventario (4 bloques) | **38 / 38** |
| Guardianes web y trinquetes | **46 / 46** |
| Árbol antes y después | **limpio** (0 cambios) |

## Skips auditados

**Python — 10, uno a uno.** Dos por la migración `571` apartada; dos por listas de
deuda **vacías** con control positivo (estado deseado, no agujero); cinco por
conectores que no declaran ruta; y uno —`test_migrations_run_on_virgin_postgres`—
que exige una PostgreSQL vacía cuya construcción implicaría aplicar las
**568–576 bloqueadas por ADR-064**. No se fuerza.

Mención aparte: `workspace_members_invites no existe en este entorno` **lo dice y
se salta**, en vez de dar un verde silencioso.

**Web — 178.** 68 exigen la credencial del rol `nelvyon_web_app`
(`WEB_DB_ROLE_CUTOVER`); 16 exigen un rol **sin** privilegios y la suite se niega
ante un superusuario, que es correcto porque RLS no se aplica a superusuarios; 6
exigen un proveedor de IA en vivo. Las **88 restantes no se saltan de verdad**:
son las que se ejecutan aparte en serie y dan 95/95.

## Producción y coste

- **Producción: NO TOCADA.** Todo contra bases de certificación.
- **Ninguna migración bloqueada aplicada.**
- Sin pagos reales, sin correos reales, sin webhooks externos reales, sin
  proveedores OAuth reales.
- Sin cambios de credenciales ni de roles.
- **Coste externo generado: 0 €.**

## Gates que siguen esperando decisión

`WEB_DB_ROLE_CUTOVER` (bloquea 68 pruebas ya escritas) · ADR-064
(`568/569/570/572/573/574/575/576`; `571` apartada) ·
`STRIPE_MEMBERSHIP_REACTIVATION` · decisión sobre `InvoicingService` y
`ABTestingService` · validación de email en CRM · `chrome-devtools-mcp` pendiente
de revisión de permisos de red.

Todos **BLOCKED_ON_FOUNDER**. La ausencia del fundador no es autorización.

---

# BLOQUE_4_EXECUTABLE = CLOSED

**13/13 clasificadas · 8 `FIXED_CERTIFIED` + 5 `PASS_CERTIFIED` · 0 bloqueadas ·
0 pendientes.** Contador: **13 + 0 + 0 = 13**.

SHA certificado: **`cf43aeda`**.
