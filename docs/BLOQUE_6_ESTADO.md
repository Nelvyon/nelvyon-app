# BLOQUE 6 — estado por categoría operacional

Generado desde `capacidades_operacionales_estado.json`, que tiene guardián.
No se edita a mano.

| Categoría | Módulos | Estado |
|---|---:|---|
| `colas_y_reclamo` | 9 | `FIXED_CERTIFIED` |
| `egreso_controlado` | 2 | `PASS_CERTIFIED` |
| `idempotencia` | 2 | `FIXED_CERTIFIED` |
| `nucleo_de_agentes` | 42 | `FIXED_CERTIFIED` |
| `orquestacion` | 7 | `FIXED_CERTIFIED` |
| `politica_y_permisos` | 8 | `FIXED_CERTIFIED` |
| `resiliencia_y_limites` | 5 | `FIXED_CERTIFIED` |
| `transporte_mcp` | 8 | `PASS_CERTIFIED` |

**Contador: 8 + 0 + 0 = 8**

## Evidencia e inyección de fallo por categoría

### `colas_y_reclamo` — `FIXED_CERTIFIED`

**Qué se encontró.** Media pieza del patron fiable de Redis: 'os:async:processing' se llenaba con lmove y se vaciaba con lrem, pero NADIE miraba nunca esa lista. Un worker que muriera entre ambas dejaba el trabajo varado para siempre con su estado congelado en 'processing' y el cliente esperando un resultado que no llegaba.

**Cómo se midió.** 9 modulos. elTrabajoVaradoVuelveALaCola.test.ts 5/5 + queue.test.ts previas: 20/20. Muerte del worker tras el lmove; trabajo largo que late frente a trabajo mudo; trabajo ya completado que no debe reencolarse; y que el rescate tenga llamante.

**Qué se rompió a propósito.** 3 mutaciones, las 3 caen: (1) rescate que devuelve 0 -> 'nadie rescato el trabajo del worker muerto'; (2) medir DURACION en vez de silencio -> 'mato el trabajo en vuelo de otra instancia' y 'el latido no impidio que lo dieran por muerto'; (3) borrar el llamante del barrido -> 'el rescate no tiene llamante'.

### `egreso_controlado` — `PASS_CERTIFIED`

**Qué se encontró.** Sin defecto de producto. El adaptador ya exigia CUATRO puertas independientes para que saliera una peticion a un proveedor de pago: clave, opt-in explicito, interruptor maestro y modo privado desactivado; y las dos ultimas vienen en su posicion segura de fabrica, asi que un despliegue nuevo sin configurar no puede gastar por accidente. Los reintentos ya estaban acotados a un pase de reparacion. safeEgressUrl quedo certificado en el Bloque 4.

**Cómo se midió.** 2 modulos. elFalloDeProveedorNoCuestaDinero.test.ts 9/9. Inyeccion de fallo: proveedor local caido con clave de OpenAI presente; proveedor que solo devuelve basura (llamadas acotadas); cada puerta aislada abriendo las otras tres.

**Qué se rompió a propósito.** 3 mutaciones sobre las tres puertas, las 3 caen: (1) quitar el opt-in -> 'sin opt-in explicito se autorizo un proveedor de pago'; (2) quitar el interruptor maestro -> 'se salto el interruptor maestro'; (3) quitar el modo privado -> 'el modo privado no bloqueo la salida'. La mutacion 1 NO cayo al primer intento: la prueba original pasaba por el motivo equivocado porque las otras dos puertas ya bloqueaban. Hubo que anadir una prueba que abriera las otras tres para aislar la del opt-in.

### `idempotencia` — `FIXED_CERTIFIED`

**Qué se encontró.** La idempotencia del MCP era un Map en memoria —su propia cabecera lo admitia: 'survives within process'—, o sea el mismo defecto que el Bloque 4 corrigio en los webhooks: con dos instancias cada una tiene el suyo y un reinicio lo vacia, asi que el reintento del cliente ejecuta la herramienta por segunda vez. Ademas, al enchufar la garantia aparecio un segundo defecto: una denegacion previa (herramienta desconocida, limite, circuito, politica) quemaba la clave y el cliente no podia reintentar nunca.

**Cómo se midió.** 2 modulos. laIdempotenciaSobreviveAlProceso.pg.test.ts 10/10 contra PostgreSQL REAL (nelvyon_cert545), no contra un doble: la propiedad la sostiene la restriccion de unicidad. Carrera de 12 reclamaciones concurrentes de la misma clave -> 1 concesion y 1 fila; supervivencia a reinicio; aislamiento por inquilino y por herramienta; y que el servidor MCP la USE, no solo que exista.

**Qué se rompió a propósito.** 5 mutaciones, las 5 caen: (1) reclamar devolviendo siempre true -> 'la misma clave se ejecuto dos veces' y '12 instancias creyeron que les tocaba'; (2) clave sin inquilino -> 'la clave de un inquilino bloqueo la de otro'; (3) servidor fiandose solo del Map -> 'la segunda llamada no se rechazo'; (4) no soltar tras denegacion previa -> 'la clave quedo quemada'; (5) soltar tambien tras fallo de ejecucion -> 'el reintento podria duplicar el efecto'. Las mutaciones 3 y 5 fueron INFIELES al primer intento (insertaban en el punto equivocado) y hubo que rehacerlas; la 5 destapo ademas que la mitad conservadora de la regla no estaba protegida por ninguna prueba.

### `nucleo_de_agentes` — `FIXED_CERTIFIED`

**Qué se encontró.** Escalada de privilegio dentro de las propias herramientas: memory_read y memory_write fabricaban el contexto de seguridad que pasaban a la memoria compartida. Si al llamante le faltaba el ambito, se lo ANADIAN ('scopes.includes(x) ? scopes : [...scopes, x]'), y memory_write ademas ascendia a 'owner' un contexto sin roles. Cualquier control del servicio sobre esos campos quedaba anulado desde arriba. El evaluador de calidad, en cambio, ya era independiente: no se toco.

**Cómo se midió.** 42 modulos. lasHerramientasNoSeAutoConcedenPermisos.test.ts 4/4 y elEvaluadorEsIndependiente.test.ts 5/5, mas toda la superficie MCP 22/22. Se comprueba el contexto REAL que llega a la memoria compartida espiando el servicio; que el ambito legitimo si llegue traducido (memory:read -> memory.read); que el inquilino salga del contexto y no de los argumentos; y que la nota del evaluador no dependa de quien firme el artefacto ni de su autoevaluacion.

**Qué se rompió a propósito.** 4 mutaciones, las 4 caen: (1) volver a autoconcederse memory.read -> 'la herramienta se autoconcedio'; (2) volver a ascender a owner -> 'un contexto sin roles se convirtio en dueno del inquilino'; (3) traduccion que borra todos los ambitos -> 'el ambito legitimo no llego traducido'; (4) evaluador que respeta artifacts.qaPassed -> 'un artefacto vacio aprobo porque su autor dijo que estaba bien'.

### `orquestacion` — `FIXED_CERTIFIED`

**Qué se encontró.** 4 defectos de autonomia: un reinicio ejecutaba lo que esperaba aprobacion humana; el lease se escribia y no se leia nunca; dos ticks solapados ejecutaban el mismo trabajo; y la senal de vida no podia ser falsa.

**Cómo se midió.** 7 modulos. elDemonioNoSeSaltaNiDuplica.test.ts: 8/8. Reinicio con waiting_approval, waiting_tool y running; lease vencido frente a lease vivo de otra instancia; dos y tres ticks concurrentes sobre 4 trabajos; liveness con reloj falso a +300s.

**Qué se rompió a propósito.** 4 mutaciones, las 4 caen: (1) volver a reencolar waiting_approval -> 'expected queued to be waiting_approval'; (2) no comprobar el lease -> 'nadie recupero un trabajo con el lease vencido'; (3) reclamo no atomico marcando dentro del bucle -> 'dos ticks procesaron 7 de 4 trabajos' y 'k1:2, k2:3, k3:3'; (4) live = lastTickAt !== null -> 'sigue vivo cinco minutos despues'. La mutacion 3 fue INFIEL al primer intento (marcaba en sincrono y serializaba sin querer) y hubo que rehacerla.

### `politica_y_permisos` — `FIXED_CERTIFIED`

**Qué se encontró.** Fallo de minimo privilegio: las herramientas de SOLO LECTURA no comprobaban ningun ambito. El unico control vivia dentro de 'if (!tool.readOnly)', asi que cualquier contexto autenticado podia llamar a postgres_query, memory_read, logs_tail o filesystem_read sin declarar nada. La causa de fondo era que el contrato de herramienta no permitia declarar lo que hace falta para usarla: sin sitio donde decirlo, el motor no tenia nada que comprobar.

**Cómo se midió.** 8 modulos. minimoPrivilegioDeHerramientas.test.ts 10/10 + toda la superficie MCP 18/18. Se anadio requiredScopes al contrato, se declararon en las 22 herramientas derivando el ambito de su categoria, y la politica cierra por defecto: sin declaracion, denegado. Los ambitos amplios que ya existian (mcp.read, mcp.write, workflows.execute, ambitos reales de las claves de API) se preservan a proposito: sustituirlos habria roto en silencio a todo el que tuviera una clave emitida.

**Qué se rompió a propósito.** 4 mutaciones, las 4 caen: (1) volver a saltarse el control en lectura -> 'un agente sin ambito consulto la base de datos'; (2) fail-open sin declaracion -> 'una herramienta sin ambitos declarados se dejo usar'; (3) quitar el ambito de una herramienta -> el barrido la delata por nombre; (4) aceptar mcp.read para escribir -> 'un ambito de solo lectura autorizo una escritura'.

### `resiliencia_y_limites` — `FIXED_CERTIFIED`

**Qué se encontró.** 4 defectos: consultar el estado del cortacircuitos lo MUTABA (un panel de observabilidad abria el paso por su cuenta); medio abierto dejaba pasar a TODOS en vez de una sonda, rematando la dependencia recien caida; el limitador podia superar su propio limite por la ventana entre soltar y despertar; y un esperador abortado se quedaba en la cola gastando la senal que debia despertar a otro, que se colgaba indefinidamente.

**Cómo se midió.** 5 modulos. losLimitesLimitanDeVerdad.test.ts 8/8 + suites de local-ai y mcp 78/78. Reloj falso para el reposo del circuito; tres peticiones simultaneas contra medio abierto; sonda que falla y sonda que acierta; ventana sincrona entre release y acquire; abort de un esperador con otro vivo detras.

**Qué se rompió a propósito.** 4 mutaciones, las 4 caen: (1) getState llamando a isOpen -> 'consultar el estado lo cambio solo'; (2) half_open devolviendo false siempre -> 'pasaron 3 peticiones'; (3) abort sin sacar de la cola -> 'el vivo se quedo colgado'; (4) decrementar active antes de despertar -> 'un tercero se colo en la ventana'. La M4 demostro que el exceso de limite era real: devolvia 'colado'.

### `transporte_mcp` — `PASS_CERTIFIED`

**Qué se encontró.** Sin defecto propio. El transporte quedo cubierto por las correcciones de las capas que lo rodean: la reclamacion persistente de idempotencia y la liberacion selectiva viven en el servidor (McpProductiveServer), y el minimo privilegio en el motor de politica que el transporte invoca. El cliente y el router no fabrican contexto de seguridad: eso lo hacian las herramientas de memoria, y se corrigio en su categoria.

**Cómo se midió.** 8 modulos. Cubiertos por laIdempotenciaSobreviveAlProceso.pg.test.ts 10/10 (el servidor rechaza el duplicado y libera tras denegacion previa) y minimoPrivilegioDeHerramientas.test.ts 10/10. Superficie MCP completa: 22/22.

**Qué se rompió a propósito.** Las mutaciones que lo atraviesan son las del servidor: fiarse solo del Map en memoria -> 'la segunda llamada no se rechazo'; no soltar tras denegacion previa -> 'la clave quedo quemada'; soltar tras fallo de ejecucion -> 'el reintento podria duplicar el efecto'. Las tres caen.

