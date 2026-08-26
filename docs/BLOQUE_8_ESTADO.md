# BLOQUE 8 — ESTADO POR CLASE DE PUNTO DE ESCALADO

Derivado de `backend/db/certificacion/puntos_de_escalado_estado.json`, que se
compara con el inventario derivado del arbol. No se escribe a mano.

**1367 puntos de escalado · 7 clases · 0 huerfanos**

| Clase | Puntos | Ficheros | Estado |
|---|---:|---:|---|
| `limites_y_backpressure` | 682 | 150 | CERTIFIED |
| `lecturas_sin_cota` | 443 | 163 | FIXED_CERTIFIED |
| `trabajo_en_serie` | 123 | 93 | CERTIFIED_CON_OBSERVACION |
| `estado_en_proceso` | 73 | 65 | CERTIFIED |
| `temporizadores` | 27 | 17 | CERTIFIED |
| `pool_y_transacciones` | 13 | 8 | FIXED_CERTIFIED |
| `abanico_sin_cota` | 6 | 6 | CERTIFIED |

---

## `abanico_sin_cota` — 6 puntos en 6 ficheros · CERTIFIED

**Medido.** 6 puntos, todos sobre listas ya acotadas por su origen (resultado de una consulta con LIMIT o arrays de configuracion).

**Defecto.** Ninguno.

**Correccion.** N/A

**Mutaciones.** N/A

---

## `estado_en_proceso` — 73 puntos en 65 ficheros · CERTIFIED

**Medido.** De los 73 puntos, 11 tienen forma de correccion y no de constante; leidos uno a uno, 8 son conjuntos inmutables de configuracion y 3 son estado real. Limitador de uso medido bajo rafaga: 1000 llamadas -> exactamente 60 permitidas; 500 CONCURRENTES -> exactamente 60. Con 3 instancias el limite efectivo es 180/min.

**Defecto.** Ninguno nuevo. Los dos almacenes de idempotencia que importan ya tienen respaldo persistente: el de MCP (reclamarEjecucionMcp en PostgreSQL) y el de webhooks entrantes (reclamarEntregaPersistente). El tercero, SEEN_IDEMPOTENCY de OpenClawStagingCoordinator, esta documentado en su propio fichero como compromiso conocido y no es camino de peticion.

**Correccion.** N/A. Lo que si se hizo fue CUANTIFICAR el compromiso del limitador: exacto dentro de un proceso, aproximacion entre instancias, y falla en la direccion buena (nunca corta por debajo del limite; comprobado con limites de 1, 5, 60 y 1000).

**Mutaciones.** 2 aplicadas, 1 cae. M9 el minuto no se renueva -> 1 rojo. M8 (leer-incrementar-escribir) NO cae y es INFIEL POR CONSTRUCCION: sin un await entre la lectura y la escritura, la secuencia es atomica en un runtime de un solo hilo. La mutacion cambia la forma del codigo y no su comportamiento; introducir la carrera exigiria anadir una espera que nadie escribiria.

---

## `lecturas_sin_cota` — 443 puntos en 163 ficheros · FIXED_CERTIFIED

**Medido.** De las 444, la mayoria son agregados (COUNT/SUM), que devuelven una fila y cuestan tiempo pero no memoria. Filtradas a las que traen FILAS de una tabla que crece con el inquilino quedan 35. MEDIDO sobre la peor de camino de peticion: listEnrollments con 5000 inscripciones devolvia 5000 filas y 1821 KiB en 33ms. Con 50.000 serian dieciocho megabytes.

**Defecto.** Listado sin cota en camino de peticion. El aislamiento estaba bien (get(tenantId, sequenceId) valida antes) pero no habia limite.

**Correccion.** Cota aplicada EN SQL y DESPUES de ordenar. En SQL porque cortar en JavaScript no ahorra el trabajo caro: PostgreSQL ya ha leido, serializado y enviado las filas. Despues de ordenar porque LIMIT sin ORDER BY devuelve N cualesquiera en vez de las N mas recientes. Por defecto 500, configurable, techo 10.000. MEDIDO despues: 500 filas, 182 KiB, 15ms — una decima parte de la carga util y menos de la mitad del tiempo.

**Mutaciones.** 3 fieles, las 3 caen. M4 sin LIMIT -> 3 rojos; M6 cota de 1 -> 3 rojos (lo caza el control); M5 LIMIT sin ORDER BY -> NO CAYO al principio: la siembra usaba NOW()-row_number(), con lo que el orden temporal coincidia con el fisico y la prueba certificaba una coincidencia del almacenamiento. Se barajo la siembra con una permutacion determinista y entonces cayo.

---

## `limites_y_backpressure` — 682 puntos en 150 ficheros · CERTIFIED

**Medido.** Limitador: 1000 llamadas -> 60 permitidas; 500 concurrentes -> 60; la cuota se renueva pasado el minuto (comprobado adelantando el reloj, no esperando); el gasto de una clave no consume la de otra ni bajo rafaga. Idempotencia bajo concurrencia REAL: 30 reclamaciones simultaneas de la misma clave -> EXACTAMENTE 1 ganadora, en 31ms.

**Defecto.** Ninguno.

**Correccion.** N/A

**Mutaciones.** M7 sustituir el INSERT..ON CONFLICT atomico por consultar-y-luego-escribir -> 24 GANADORAS DE 30. Es la demostracion literal de por que la concurrencia se prueba concurrente: en serie, esa misma implementacion rota habria dado 1 ganadora y habria pasado.

---

## `pool_y_transacciones` — 13 puntos en 8 ficheros · FIXED_CERTIFIED

**Medido.** pool=2 con 20 peticiones simultaneas: p50=17ms, p95=19ms, total 26ms, ninguna perdida y ninguna recibio el resultado de otra. Con dos consultas de 2s ocupando el pool, una consulta trivial ESPERO 1803ms. Con connectionTimeoutMillis corto, el fallo es explicito en 315ms con mensaje legible. Rafaga de 120 sobre pool=8: 24ms, y la latencia p95 vuelve exactamente a la de antes.

**Defecto.** FALTABAN DOS PLAZOS. connectionTimeoutMillis acota cuanto ESPERA una peticion por una conexion libre, pero nada acotaba cuanto RETIENE una conexion la consulta que ya la tiene: sin statement_timeout, una consulta desbocada se queda con su conexion todo lo que tarde, y con el pool agotado eso es una caida general. No hace falta un ataque: basta un informe grande o un indice que falta. Y faltaba el plazo silencioso: una transaccion abierta que nadie cierra. query con contexto de inquilino hace BEGIN/COMMIT, y si el proceso muere entremedias la conexion retiene sus bloqueos sin consumir CPU ni salir en las graficas de consultas lentas, dejando colgado el ALTER TABLE de la siguiente migracion.

**Correccion.** statement_timeout=30s e idle_in_transaction_session_timeout=60s, los dos configurables y GENEROSOS a proposito: un plazo corto de mas es peor que no tener plazo, porque rompe informes legitimos de forma intermitente. MEDIDO tras la correccion: consulta de 10s cortada en 409ms, la conexion vuelve al pool USABLE, y la transaccion olvidada la termina el servidor.

**Mutaciones.** 3 fieles, las 3 caen. M1 sin statement_timeout -> 2 rojos; M2 sin idle_in_transaction -> 2 rojos; M3 plazo agresivo de 400ms -> 2 rojos, y lo caza el CONTROL positivo (una consulta de un segundo tiene que sobrevivir).

---

## `temporizadores` — 27 puntos en 17 ficheros · CERTIFIED

**Medido.** 27 puntos. Los disparadores reales son las 16 rutas de cron, certificadas en el Bloque 7 (secreto en tiempo constante, cierre en falso sin CRON_SECRET) y con idempotencia persistente por inquilino certificada en el Bloque 4.

**Defecto.** Ninguno nuevo.

**Correccion.** N/A

**Mutaciones.** Heredadas de los bloques 4 y 7.

---

## `trabajo_en_serie` — 123 puntos en 93 ficheros · CERTIFIED_CON_OBSERVACION

**Medido.** 16 bucles con consulta dentro. Leidos: los de SaasCampaniasService ya agrupan las LECTURAS con id = ANY($2::uuid[]) y solo hacen una escritura por destinatario, proporcional al trabajo real. Ninguno es el N+1 clasico de N consultas para traer lo que cabe en una.

**Defecto.** Ninguno de correccion. OBSERVACION: el envio de una campania es O(N) viajes SERIE tanto al proveedor de correo como a la base. Con 10.000 destinatarios son ~20s solo de base dentro de un unico trabajo. No se rediseña aqui: es una decision de arquitectura de colas, y hacerlo de noche sin medir el impacto en la entregabilidad seria imprudente.

**Correccion.** N/A

**Mutaciones.** N/A — no hay defensa que mutar donde no hay defecto.

---
