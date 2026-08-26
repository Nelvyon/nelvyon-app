# BLOQUE 6 — cierre

**Autonomía bajo adversidad.** Rama `bloque4-webhooks`.

Los cinco bloques anteriores midieron el sistema **funcionando**: esquema,
aislamiento, agentes, operación real, producto. Este mide qué pasa cuando algo
se rompe mientras nadie mira: un proceso que muere a mitad, dos instancias que
coinciden, un tick que tarda más que su intervalo, un proveedor que se cae, un
reinicio en el peor momento.

La diferencia con los anteriores es el método. Aquí **ninguna propiedad se da
por buena leyendo el código**: se induce el fallo y se mira qué hace. De los
diecisiete defectos encontrados, todos salieron al romper algo a propósito.

---

## El denominador

**83 módulos operacionales → 8 categorías → 0 huérfanos.**

La unidad es el **módulo operacional**: el que implementa maquinaria de
ejecución autónoma —orquestar, encolar, reclamar, reintentar, limitar,
recuperar, escalar—. No entra «cualquier fichero que mencione la palabra
retry»: eso daba 222 ficheros de los que la mayoría solo nombraban el concepto
en prosa. Tampoco entran los agentes de sector: el Bloque 3 ya cerró 55
capacidades de IA sobre 2224 módulos, y contarlos otra vez sería medir dos veces
lo mismo con otro nombre.

| Categoría | Módulos | Estado |
|---|---:|---|
| `orquestacion` | 7 | `FIXED_CERTIFIED` |
| `colas_y_reclamo` | 9 | `FIXED_CERTIFIED` |
| `idempotencia` | 2 | `FIXED_CERTIFIED` |
| `resiliencia_y_limites` | 5 | `FIXED_CERTIFIED` |
| `politica_y_permisos` | 8 | `FIXED_CERTIFIED` |
| `nucleo_de_agentes` | 42 | `FIXED_CERTIFIED` |
| `transporte_mcp` | 8 | `PASS_CERTIFIED` |
| `egreso_controlado` | 2 | `PASS_CERTIFIED` |

El guardián de este bloque vigila algo que los cuatro anteriores no
necesitaban: **una capacidad certificada tiene que declarar qué fallo se le
indujo**. En un bloque sobre resiliencia, un verde que nunca se ha puesto rojo a
propósito no certifica ninguna defensa.

---

## Los defectos

### 1 · Un reinicio ejecutaba lo que esperaba a un humano

`recoverJobsAfterRestart` devolvía a la cola todo lo interrumpido, y en esa
lista estaba `waiting_approval` junto a `running` y `waiting_tool`.

`waiting_approval` lleva un `approvalId`: es una puerta humana de verdad, la que
decide si una acción sensible se ejecuta. Reencolarla no es recuperar — es
decidir en nombre de quien todavía no ha dicho nada. Cualquier reinicio —un
despliegue, un contenedor que se recicla— convertía «esperando a que alguien
autorice» en «hazlo», y sin dejar rastro de que se hubiera saltado nada.

Los tres estados no son matices del mismo: `running` y `waiting_tool` se
cortaron sin que nadie decidiera; `waiting_approval` está esperando a una
persona. **Una recuperación nunca puede completar una decisión que no ha tomado
nadie.**

### 2 · Un lease que nadie leía

El demonio escribía `leaseOwner`, `leaseUntil` y `heartbeatAt` en cada trabajo.
**Nadie los leía jamás.** Si el proceso moría a mitad, el trabajo se quedaba en
`running` para siempre: ninguna otra instancia lo recogía y solo lo desbloqueaba
un reinicio completo.

Un lease que nadie comprueba no es un lease: es un comentario.

### 3 · Dos ticks solapados ejecutaban el mismo trabajo

`setInterval` dispara cada 2 s **sin esperar** al tick anterior. Y
`drainQueuedJobs` no reclamaba: devolvía trabajos todavía en `queued` y era el
llamante quien los marcaba después, con un `await` por medio.

Medido con dos ticks concurrentes sobre cuatro trabajos: **se procesaron siete**.
Tres salieron dos veces.

### 4 · Una señal de vida que no podía ser falsa

`live` era `running && lastTickAt !== null`, y `lastTickAt` no se borra nunca. En
cuanto había un tick, `live` se quedaba en verdadero para siempre —aunque el
bucle estuviera parado o el proceso congelado—. Y se publica en
`/api/saas/ai-agents`, así que quien la mirase creería que hay un demonio
trabajando llevara el rato que llevara sin moverse.

### 5 · Media pieza del patrón fiable

La cola usa el patrón correcto de Redis: `lmove` mueve el trabajo a
`os:async:processing` de forma atómica y `lrem` lo saca al terminar. Pero
**nadie miraba nunca esa lista**. Un worker que muriera entre las dos
operaciones dejaba el trabajo varado ahí para siempre, con su estado congelado
en `processing` y el cliente esperando un resultado que no iba a llegar.

Media pieza del patrón fiable no es un patrón fiable: es una lista que crece.

El rescate mide **silencio**, no duración, y para eso hizo falta añadir un
latido. Confundir «tarda» con «murió» es el defecto que el Bloque 4 corrigió en
`OsQueueWorker`.

### 6 · Idempotencia que solo valía dentro de un proceso

`IdempotencyStore` era un `Map` en memoria y su propia cabecera lo admitía:
«survives within process». Con dos instancias cada una tiene el suyo; con un
reinicio se vacía. El reintento del cliente ante un timeout —lo normal— ejecuta
la herramienta por segunda vez.

Es literalmente el defecto que el Bloque 4 corrigió en los webhooks entrantes.
Se resolvió igual: `erp_idempotency_keys`, que ya existe y cuya forma es
genérica, con `INSERT ... ON CONFLICT DO NOTHING RETURNING`. **Sin migración
nueva.**

Al enchufarla apareció un segundo defecto: una denegación previa —herramienta
desconocida, límite, circuito, política— **quemaba la clave** y el cliente no
podía reintentar nunca. La regla que los separa es si pudo haber efecto: lo que
se denegó antes de ejecutar se suelta; lo que falló durante la ejecución, no.
Ante la duda, no soltar.

### 7 · Un cortacircuitos que se abría al mirarlo

`getState()` llamaba a `isOpen()`, e `isOpen()` **muta**. Un panel de
observabilidad sondeando el estado movía el circuito de `open` a `half_open` por
su cuenta: el observador cambiaba lo observado, y la siguiente petición real se
colaba por una puerta que no había abierto ella.

### 8 · Medio abierto era barra libre

`isOpen()` devolvía `false` en **todas** las llamadas desde que entraba en
`half_open`. Al cumplirse el reposo, la cola entera de peticiones acumuladas
entraba a la vez contra la dependencia que acababa de caerse. Eso no es
recuperarse: es rematarla, y es como una caída breve se convierte en larga.

### 9 · Un limitador que superaba su propio límite

`releaseSlot()` decrementaba `active` **antes** de despertar al esperador, cuya
continuación va en una microtarea posterior. En esa ventana el contador estaba
por debajo de lo real, y quien llegase justo entonces veía sitio libre y entraba.
Con límite 1 había dos ejecutándose.

Un limitador que puede superar su propio límite no limita: retrasa.

### 10 · Un abortado que dejaba a otro colgado

Al abortar, el esperador rechazaba su promesa **pero se quedaba en la cola**. Al
liberarse un hueco, `releaseSlot()` sacaba a ese muerto y le llamaba a
`resolve()`, que ya no hacía nada. La señal de «te toca» se gastaba en alguien
que ya no estaba, y el siguiente vivo esperaba otra liberación que podía no
llegar nunca. Un trabajo colgado indefinidamente, sin error y sin nada que lo
delate.

### 11 · Mínimo privilegio que no existía para lectura

El motor de política comprobaba suplantación de inquilino, secretos, inyección
de prompt y SQL destructivo — y se dejaba lo más básico. **El único control de
ámbito vivía dentro de `if (!tool.readOnly)`.** Cualquier contexto autenticado
podía llamar a `postgres_query`, `memory_read`, `logs_tail` o `filesystem_read`
sin declarar nada: un agente que solo necesita leer documentación tenía acceso a
la base de datos y a la memoria del inquilino.

La causa de fondo no era una condición mal puesta: **el contrato de herramienta
no permitía declarar lo que hace falta para usarla**. Sin un sitio donde
decirlo, el motor no tenía nada que comprobar.

Se añadió `requiredScopes`, se declaró en las 22 herramientas derivando el
ámbito de su categoría, y la política **cierra por defecto**: sin declaración,
denegado. Los ámbitos amplios que ya existían (`mcp.read`, `mcp.write`,
`workflows.execute`, reales en las claves de API) se preservan a propósito —
sustituirlos habría roto en silencio a todo el que tuviera una clave emitida.

### 12 · Herramientas que se concedían su propio permiso

`memory_read` y `memory_write` fabricaban el contexto de seguridad que pasaban a
la memoria compartida:

```
scopes: ctx.scopes.includes("memory.read") ? ctx.scopes : [...ctx.scopes, "memory.read"]
roles:  ctx.roles.length ? ctx.roles : ["owner"]
```

Si al llamante le faltaba el ámbito, **se lo añadían**. Y `memory_write` trataba
un contexto sin roles como **dueño del inquilino**. Cualquier control que el
servicio de memoria hiciera sobre esos campos quedaba anulado desde arriba.

Un permiso que el propio consumidor se autoconcede no es un permiso: es una
variable con nombre de permiso. Y detrás está la memoria del inquilino, que es
justo donde se mezcla información entre clientes cuando algo falla.

El origen era real: MCP nombra con dos puntos (`memory:read`) y la memoria
compartida con punto (`memory.read`). Hacía falta traducir. Pero **traducir es
convertir lo que hay, no rellenar lo que falta**.

---

## Lo que ya estaba bien

No todo eran defectos, y decirlo importa tanto como lo demás:

- **El evaluador de calidad ya era independiente.** La nota sale del artefacto
  por reglas deterministas, no de quién lo firma ni de su autoevaluación.
  Certificado `PASS`, sin tocar una línea.
- **El egreso a proveedores de pago ya exigía cuatro puertas independientes**:
  clave, opt-in explícito, interruptor maestro e inhibición del modo privado. Y
  las dos últimas vienen en su posición segura **de fábrica**, así que un
  despliegue nuevo sin configurar no puede gastar por accidente.
- **`nextRetryAt` sí se respetaba.** Lo di por decorativo al leerlo y me
  equivoqué: `drainQueuedJobs` lo comprueba.

---

## Cuatro lecciones de método

**Una mutación infiel no prueba nada, y es fácil escribirla.** Pasó **tres
veces**. Al reintroducir el reclamo no atómico marqué los cuatro trabajos de
golpe en síncrono y los serialicé sin querer: «arreglé» el defecto al intentar
reproducirlo, y la prueba siguió verde. Lo mismo con dos mutaciones del servidor
MCP, insertadas en un `return base({` que no era el del camino de fallo. Una
mutación que no cae obliga a preguntarse cuál de las dos cosas está mal: la
prueba o la mutación.

**Un negativo verde no certifica una defensa si la ejecución nunca la alcanza.**
La prueba de «sin opt-in no se llama a OpenAI» pasaba... porque el interruptor
maestro y el modo privado ya bloqueaban antes. Quitar la comprobación del opt-in
**no tumbaba nada**. Hubo que abrir las otras tres puertas a propósito para que
la única que pudiera decir que no fuera la que se estaba midiendo.

**Una aserción puede ser verdadera y no discriminar.** «Ningún trabajo acumula
más intentos de los que se ejecutaron» salía verde con el defecto puesto cuando
había un solo trabajo: el primer tick lo pasaba a `running` y los otros ya no lo
veían. Con cuatro trabajos, la misma aserción devuelve `k1:2, k2:3, k3:3`.

**Maquinaria sin llamante es maquinaria que no existe.** El `leaseUntil` del
orquestador se escribía y no lo leía nadie. Al construir el rescate de la cola
podía haber repetido exactamente eso, así que hay una prueba que comprueba que
**arrancar el worker barre la lista** — y cae si alguien borra la llamada.

---

## Producción y coste

- **Producción: NO TOCADA.** Todo contra `nelvyon_cert545` local.
- **Ninguna migración aplicada.** La idempotencia persistente reutiliza
  `erp_idempotency_keys`, que ya existía.
- Sin pagos, correos, webhooks ni OAuth reales. Sin dependencias nuevas.
- **Coste externo generado: 0 €.**

## Bloqueos que siguen esperando decisión

`WEB_DB_ROLE_CUTOVER` · ADR-064 (`568/569/570/572/573/574/575/576`; `571`
apartada) · `STRIPE_MEMBERSHIP_REACTIVATION` · `InvoicingService` /
`ABTestingService` · validación de email en CRM.

Todos **BLOCKED_HUMAN_DECISION**. Ninguno bloqueó nada de este bloque: se
aislaron y el resto se certificó.

---

# BLOQUE_6_EXECUTABLE = CLOSED

**8/8 categorías · 6 `FIXED_CERTIFIED` + 2 `PASS_CERTIFIED` · 0 bloqueadas ·
0 pendientes.** Contador: **8 + 0 + 0 = 8**.

**83 módulos · 0 huérfanos · 12 defectos corregidos en la causa · 21 mutaciones,
todas caen.**
