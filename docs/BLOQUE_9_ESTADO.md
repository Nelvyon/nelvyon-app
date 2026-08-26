# BLOQUE 9 — ESTADO POR FAMILIA DE CAPACIDAD DE OPERACIÓN

Derivado de `backend/db/certificacion/capacidades_de_operacion_estado.json`.

**656 capacidades · 8 familias · 0 comandos de runbook rotos**

| Familia | Capacidades | Estado |
|---|---:|---|
| `migraciones` | 475 | CERTIFIED_CON_HALLAZGO |
| `runbooks` | 72 | FIXED_CERTIFIED |
| `interruptores` | 35 | CERTIFIED |
| `correlacion` | 34 | CERTIFIED |
| `auditoria` | 29 | CERTIFIED |
| `respaldo_y_restauracion` | 6 | FIXED_CERTIFIED |
| `sondas` | 4 | CERTIFIED |
| `recuperacion` | 1 | CERTIFIED |

---

## `auditoria` — 29 · CERTIFIED

**Medido.** 29 ficheros escriben rastro de auditoria. El de MCP y el de memoria compartida guardan quien, que y cuando; en el Bloque 7 se corrigio que el identificador propagado a `logUsage` fuera el `id` de la clave y no una rebanada de la clave viva.

**Defecto.** Ninguno nuevo.

**Corrección.** N/A

**Mutaciones / inyecciones.** Heredadas del Bloque 7.

---

## `correlacion` — 34 · CERTIFIED

**Medido.** 34 ficheros propagan un identificador de peticion (`requestIdFrom`, `x-request-id`).

**Defecto.** Ninguno.

**Corrección.** N/A

**Mutaciones / inyecciones.** N/A

---

## `interruptores` — 35 · CERTIFIED

**Medido.** 35 banderas de entorno distintas que apagan o encienden algo sin desplegar, incluidas NELVYON_PRIVATE_AI_CANARY_KILL_SWITCH y NELVYON_PRIVATE_VECTOR_RAG_DISABLED.

**Defecto.** Ninguno nuevo. Las que gobiernan fronteras (AI, memoria compartida, MCP) ya estan certificadas en los bloques 3, 6 y 7 por su comportamiento en cerrado.

**Corrección.** N/A

**Mutaciones / inyecciones.** Heredadas.

---

## `migraciones` — 475 · CERTIFIED_CON_HALLAZGO

**Medido.** 475 migraciones aplicadas desde CERO sobre una base vacia en 7 segundos, 0 fallos. La reconstruccion tiene 712 tablas de producto, las mismas que la referencia.

**Defecto.** DERIVA DE ESQUEMA, encontrada por un detector nuevo. La base de certificacion tenia 21 diferencias con lo que las migraciones declaran: 8 columnas y 13 politicas RLS que faltaban. Aplicando las migraciones bajaron a 4 — y esas 4 no bajan nunca. La migracion 567 activa RLS SOLO sobre tablas VACIAS (guarda razonada: activar RLS sobre una tabla con datos puede ocultarselos a quien los estaba leyendo), asi que `saas_tenants` (10 filas) se quedo sin ellas PARA SIEMPRE por lo que habia dentro el dia que corrio. Una base reconstruida desde cero las tiene; una viva, no. Y LAS DOS CREEN ESTAR AL DIA, porque las dos han aplicado las 475 sin un solo error.

**Corrección.** `scripts/detectar-deriva-de-esquema.mjs`: reconstruye desde las migraciones en una base desechable y compara tablas, columnas, restricciones, indices y politicas. NO modifica lo que examina. El hallazgo de saas_tenants NO se ha corregido: es un cambio de visibilidad de datos y se cruza con WEB_DB_ROLE_CUTOVER, que ya esta bloqueado. Registrado como RLS_SAAS_TENANTS_SOBRE_TABLA_CON_DATOS.

**Mutaciones / inyecciones.** El propio detector es la prueba: encontro 21 diferencias reales en una base que llevaba anos pareciendo correcta.

---

## `recuperacion` — 1 · CERTIFIED

**Medido.** PostgreSQL PARADO Y ARRANCADO de verdad con el pool en marcha. Con la base parada la consulta FALLA ('Connection terminated unexpectedly') y NO devuelve datos de una cache que nadie ha declarado. Al arrancar, el pool vuelve a servir consultas SOLO, sin reiniciar el proceso, en 536 ms. La fila escrita ANTES del corte sobrevive. La sonda de disponibilidad vuelve a decir `ok`.

**Defecto.** Ninguno.

**Corrección.** N/A

**Mutaciones / inyecciones.** La propia inyeccion de fallo ES el experimento: no se lee el codigo, se para el contenedor. Con salvaguarda: solo se ejecuta con NELVYON_PERMITIR_REINICIO_PG=1, para que una ejecucion rutinaria de la bateria no tumbe la base a mitad de otra suite.

---

## `respaldo_y_restauracion` — 6 · FIXED_CERTIFIED

**Medido.** Restauracion certificada de extremo a extremo contra PostgreSQL real: inquilino con relaciones (usuario, workspace, inquilino, 250 contactos), suma md5 del CONTENIDO calculada en origen y recalculada en destino, y recuento de estructura. Vuelven 714 tablas, 1334 restricciones, 2302 indices y 2108 politicas. La clave foranea SIGUE RESTRINGIENDO —se intenta la escritura imposible y la rechaza— y la APLICACION se conecta a la base restaurada y ejecuta una consulta del producto con su JOIN. 16/16.

**Defecto.** El simulacro que ya existia sembraba UN MARCADOR DE UNA FILA y comprobaba que sobreviviera. Eso demuestra que la tuberia existe, no que vuelva el producto: un marcador sobrevive a casi cualquier restauracion rota. Lo que no sobrevive —y es lo que se echa de menos el dia que hace falta— son las restricciones, los indices y las politicas.

**Corrección.** `scripts/certificar-restauracion.mjs`. Ademas lleva inyeccion de fallo reproducible para poder comprobarse a si misma.

**Mutaciones / inyecciones.** 2 inyecciones de fallo, las 2 tumban la certificacion con firmas DISTINTAS. `--schema-only` (estructura sin datos) -> 2 fallos, los de contenido. `--data-only` (datos sin estructura) -> 6 fallos, contenido y estructura. Control sin inyeccion: 16/16.

---

## `runbooks` — 72 · FIXED_CERTIFIED

**Medido.** 72 documentos de operacion. La huerfana de este inventario no es un modulo sin categoria: es un runbook que manda teclear un comando que no existe.

**Defecto.** Una ruta rota (`./scripts/optimize-saas-shots.mjs`, que vive en `apps/web/scripts/`). Y un fallo de MI PROPIO detector, que resolvia todas las rutas contra `RAIZ/scripts/` y daba por rotas tres que existian en `backend/scripts/` y `apps/web/scripts/` — incluidas las del runbook de copia/restauracion y la de despliegue. Un detector que grita por rutas correctas se ignora entero, y con el se ignoran los gritos de verdad.

**Corrección.** Ruta corregida y detector afinado para respetar el prefijo. Ademas distingue «roto» de «declarado como Placeholder»: queda 1 pendiente declarado (scripts/erp-relational-backfill.mjs) que el runbook anuncia honestamente, contado aparte y no silenciado.

**Mutaciones / inyecciones.** Control positivo en el guardian: se le ponen delante las tres rutas con prefijo y se exige que las reconozca.

---

## `sondas` — 4 · CERTIFIED

**Medido.** Cuatro rutas de salud. Provocando el fallo DE VERDAD contra una base inexistente: la sonda de disponibilidad dice `down` en 6ms, sin filtrar el nombre de la base ni la contrasena, y respeta su plazo de 3s. La de vida responde 200 en menos de 1ms con la base inutilizable — porque no la toca.

**Defecto.** Ninguno. El reparto es el correcto y merece decirse: una sonda de VIDA que consultara PostgreSQL reiniciaria todo el parque durante un parpadeo de la base, convirtiendo un incidente de treinta segundos en uno de varios minutos con el arranque en frio de todo encima. La de DISPONIBILIDAD si la consulta y responde 503.

**Corrección.** N/A

**Mutaciones / inyecciones.** 2 fieles, las 2 caen. M1 la sonda devuelve `ok` en el catch -> 2 rojos; M2 la sonda de VIDA consulta la base -> 1 rojo.

---
