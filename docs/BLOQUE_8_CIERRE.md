# BLOQUE 8 — RENDIMIENTO, CARGA, CONCURRENCIA Y ESCALABILIDAD

**La pregunta:** ¿qué ocurre cuando NELVYON deja de recibir una operación y
empieza a recibir muchas simultáneamente?

**La respuesta corta:** aguanta, con dos agujeros que ya no están y una cuenta
pendiente que no me toca a mí cerrar.

Nada de esto se hizo «hasta quemar la máquina». Las cargas son pequeñas,
reproducibles y elegidas para **aislar una variable**: pool a dos conexiones,
cinco mil filas, treinta reclamaciones simultáneas. Un banco de pruebas que solo
sabe decir «tarda» no sirve para arreglar nada.

---

## 1. La unidad: el punto de escalado

El inventario de este bloque **no** cuenta módulos ni rutas. Cuenta **puntos de
escalado**: sitios concretos cuyo coste o cuya corrección dependen de N.

Las otras dos unidades mienten aquí. Un módulo puede tener diez consultas
perfectas y una que recorre la tabla entera; una ruta puede ser irrelevante con
un inquilino y ser la que tumba el pool con cien.

**1 367 puntos en 385 ficheros, 7 clases, 0 huérfanos**, sobre 4 184 ficheros de
producción.

| Clase | Puntos | Qué rompe |
|---|---:|---|
| `limites_y_backpressure` | 682 | cuándo decir que no |
| `lecturas_sin_cota` | 443 | lo que crece con los datos del cliente |
| `trabajo_en_serie` | 123 | lo que tarda N veces lo que debería |
| `estado_en_proceso` | 73 | correcto con una instancia, falso con dos |
| `temporizadores` | 27 | lo que se solapa consigo mismo |
| `pool_y_transacciones` | 13 | lo que retiene una conexión |
| `abanico_sin_cota` | 6 | lo que dispara N peticiones a la vez |

Y **no** se contaron aquí los módulos ya certificados en bloques anteriores por
sus otras propiedades. Repetirlos habría dado un número más grande y una
certificación más pobre.

> El detector de huérfanos se ganó el sueldo: encontró tres `export const … = new
> Map()` que **mi propia clase** no reconocía, porque el patrón solo miraba
> `const` y `let` al principio de línea. Un detector que solo confirma lo que ya
> sabías no sirve para nada.

---

## 2. Los dos agujeros que ya no están

### 2.1 · El pool no tenía plazo para la consulta que ya tiene la conexión

**Medido:** con el pool a dos y dos consultas de dos segundos ocupándolo, una
consulta trivial **esperó 1 803 ms**.

Ese es el mecanismo por el que un problema pequeño se convierte en una caída
general, y no hace falta un ataque para provocarlo: basta un informe grande, un
índice que falta o una tabla que ha crecido más de lo previsto.

El pool tenía `connectionTimeoutMillis`, que acota **cuánto espera** una petición
por una conexión libre. No tenía nada que acotara **cuánto retiene** una conexión
la consulta que ya la tiene. Son dos plazos distintos, y el primero solo decide
con qué mensaje mueres.

Faltaba un tercero, más silencioso: **una transacción abierta que nadie cierra**.
`DbClient.query` con contexto de inquilino hace `BEGIN`, la consulta y `COMMIT`;
si el proceso muere entremedias —un despliegue, un OOM— la conexión se queda
«idle in transaction» reteniendo sus bloqueos. No consume CPU, no sale en ninguna
gráfica de consultas lentas, y deja colgado el `ALTER TABLE` de la siguiente
migración.

**Corregido:** `statement_timeout` = 30 s e `idle_in_transaction_session_timeout`
= 60 s, los dos configurables. **Generosos a propósito**: un plazo corto de más es
peor que no tener plazo, porque rompe informes legítimos de forma intermitente,
que es la avería más cara de diagnosticar.

**Medido después:** consulta de diez segundos cortada en **409 ms**, la conexión
vuelve al pool **usable**, y la transacción olvidada la termina el servidor.

### 2.2 · Un listado sin cota crece con el cliente

**Medido:** `listEnrollments` con 5 000 inscripciones devolvía **5 000 filas y
1 821 KiB** en una sola respuesta. Con 50 000 son dieciocho megabytes: memoria en
el proceso, un `JSON.stringify` que bloquea el bucle de eventos mientras dura, y
un navegador que no sabe qué hacer con ello.

Esto es exactamente lo que pregunta el bloque: algo correcto con una operación y
falso con muchas. No hace falta un atacante — hace falta un cliente que use el
producto.

**Corregido** con tres decisiones, y las tres importan:

1. **En SQL, no en JavaScript.** Cortar en el proceso significa que PostgreSQL ya
   ha leído, serializado y enviado las filas: el trabajo caro ya está hecho.
2. **Después de ordenar.** `ORDER BY … LIMIT` devuelve las N más recientes;
   `LIMIT` sin orden devuelve N cualesquiera. La diferencia entre acotar y
   estropear.
3. **Valor por defecto generoso** (500, configurable, techo 10 000).

**Medido después: 500 filas, 182 KiB, 15 ms.** Una décima parte de la carga útil y
menos de la mitad del tiempo.

---

## 3. Lo que se midió y estaba bien

- **El pool bajo presión no pierde ni mezcla.** 20 peticiones simultáneas sobre
  un pool de 2: p50 = 17 ms, ninguna perdida, y **ninguna recibió el resultado de
  otra**. Cuando el plazo se agota, el fallo es explícito en 315 ms con un
  mensaje legible — no un cuelgue, que sería peor porque el cliente reintenta y
  la avalancha se realimenta.

- **La saturación se recupera.** Ráfaga de 120 sobre un pool de 8: 24 ms, y la
  latencia p95 vuelve **exactamente** a la de antes.

- **El contexto de inquilino cuesta ×1,7** en p50 (2 ms frente a 1 ms). Hace
  cuatro viajes de ida y vuelta en vez de uno —`BEGIN`, `set_config`, la consulta,
  `COMMIT`— y es deliberado: es lo que impide que el contexto sobreviva al
  `COMMIT` y contamine la petición siguiente del pool. Ahora ese precio está
  medido en vez de temido.

- **La idempotencia aguanta concurrencia real.** 30 reclamaciones simultáneas de
  la misma clave contra PostgreSQL: **exactamente una gana**, en 31 ms. Y no se
  pisan entre inquilinos ni entre fuentes.

- **El límite de uso es exacto dentro del proceso.** 1 000 llamadas → 60
  permitidas. 500 **concurrentes** → 60. La cuota se renueva pasado el minuto
  (comprobado adelantando el reloj, no esperando un minuto: una prueba que tarda
  un minuto es una prueba que alguien acaba saltándose).

---

## 4. Las mutaciones, y las tres que enseñaron algo

**9 mutaciones aplicadas. 7 caen.**

### M7 — por qué la concurrencia se prueba concurrente

Sustituí el `INSERT … ON CONFLICT DO NOTHING RETURNING` atómico por el patrón
«consultar y luego escribir». Resultado: **24 ganadoras de 30**.

En serie, esa misma implementación rota habría dado una ganadora y habría pasado
la prueba. Es la demostración literal de que «llamo dos veces y la segunda dice
duplicado» no certifica nada.

### M5 — la prueba que certificaba una coincidencia del almacenamiento

Quitar el `ORDER BY` del listado acotado **no tumbaba** la prueba que decía
certificar «las veinte más recientes». La siembra usaba `NOW() - row_number()`,
con lo que el orden temporal coincidía con el físico y PostgreSQL devolvía las
mismas filas por casualidad.

Se barajó la siembra con una permutación determinista —`(i * 7919) % N`— y
entonces cayó. La prueba certificaba el orden del montón, no el `ORDER BY`.

### M8 — una mutación infiel por construcción

Convertir el contador del limitador en «leer, comprobar, escribir» **no cambia
nada**: sin un `await` entre la lectura y la escritura, la secuencia es atómica en
un runtime de un solo hilo. La mutación cambia la forma del código y no su
comportamiento.

Se registra como infiel en vez de esconderse, porque el hecho de que **no pueda**
introducir una carrera es precisamente la razón por la que la implementación
actual es correcta.

---

## 5. Lo que se midió y NO se ha corregido

### El envío de campañas es O(N) en serie

Los bucles de `SaasCampaniasService` ya agrupan las **lecturas** con
`id = ANY($2::uuid[])`; lo que queda es una escritura por destinatario, que es
proporcional al trabajo real. No es el N+1 clásico.

Pero con 10 000 destinatarios son ~20 s solo de base de datos dentro de un único
trabajo, más el tiempo del proveedor. Eso es una decisión de arquitectura de
colas, no una corrección de código, y rediseñarla de noche sin medir el impacto
en la entregabilidad sería imprudente. **Queda registrado como observación.**

### El límite de uso es por proceso

Con N instancias el límite efectivo es N × 60/min: medido, 3 instancias → 180
llamadas. Es una aproximación aceptable para **regular el ritmo**. No lo sería si
fuera la única defensa contra el abuso económico — para eso hacen falta
contadores persistentes.

---

## 6. La cuenta pendiente: el workspace derivado

`STABLE_WORKSPACE_ID_MIGRATION` sigue **bloqueado** y no se ha tocado. Lo que sí
se ha hecho es el estudio que se pidió, con números:

| Inquilinos | Probabilidad de tener **ya** una colisión |
|-----------:|------------------------------------------:|
| 300 | 4,9 % |
| 500 | **12,9 %** |
| 1 000 | **42,6 %** |
| 2 000 | **89,2 %** |

Impacto, volumen, detección previa, estrategia por fases, rollback fase a fase,
compatibilidad durante la transición y cómo impedir que vuelva a pasar: todo en
**`docs/DECISION_WORKSPACE_ID.md`**.

Lo único que hace falta de ti para desbloquearlo es ejecutar la detección y decir
si el resultado es cero. Con eso, el resto es trabajo mecánico.

---

## 7. Una regresión que la puerta del Bloque 7 no vio

`estadoDeOauthYSalida.test.ts` —una suite del **Bloque 4**— llamaba a
`createOAuthState`, que **desapareció** en el Bloque 7 al atar el flujo OAuth al
navegador con un nonce. Se eliminó a propósito, para que ninguna ruta pudiera
quedarse en la versión vulnerable. Y rompió la suite anterior.

Se cambió **la llamada** y nada más. Todo lo que la suite afirma —que el `state`
lleva su usuario, que reescribirlo invalida la firma, que otro secreto no vale,
que caduca— sigue comprobándose igual. La propiedad del Bloque 4 no se relajó:
sobrevivió a un cambio de API que la reforzó.

**Que esto apareciera aquí y no en la puerta del Bloque 7 es un fallo de aquella
puerta:** se corrió sobre las zonas tocadas, no sobre el árbol entero. Queda
anotado en la propia suite y corregido en el método: la puerta del Bloque 10 corre
el árbol completo.

---

## 8. SHA certificado

**`efb27997`** en la rama `bloque4-webhooks`.

| Puerta | Resultado |
|---|---|
| Inventario derivado | 1 367 puntos · 7 clases · **0 huérfanos** |
| Guardianes acumulados (Python, a solas) | **36/36** |
| Carga + PostgreSQL real + RLS efectiva | **166/166**, 20 saltadas y clasificadas |
| Regresión amplia (733 ficheros) | **7 538 verdes, 0 fallos** |
| Con `NELVYON_B3/B4_DSN` | **+54** que antes se saltaban en silencio |
| Tipos | 11 errores, **todos previos**, 0 en ficheros de este bloque |
| Árbol | limpio antes y después |

Saltadas y **clasificadas, no ignoradas**:

- `migration523.pg.test.ts` (18) — necesita una base desechable con las
  migraciones aplicadas. Se resuelve en el Bloque 9.
- `rls.test.ts` (2) — **EXTERNAL_VERIFICATION_REQUIRED**: comprueban la RLS del
  Supabase gestionado y no se pueden ejecutar en local por definición.
- `rlsIsolation.pg.test.ts` (16) — necesita una base **desechable**, no la de
  desarrollo. Ejecutarla contra `nelvyon_local_ai`, que tiene la base de
  conocimiento sembrada, daría un rojo falso. Se resuelve en el Bloque 9.

Cadena certificada: bloque 4 `cf43aeda`, 5 `9a3841bc`, 6 `5352db46`,
7 `c33b9939`, **8 `efb27997`**.
