# Ledger de construcción

Estado persistente del trabajo. **Se lee antes de continuar y se actualiza al
cerrar cada hito.** Existe para que una compactación de contexto o un reinicio
de sesión no obliguen a reiniciar el proyecto mentalmente: aquí está dónde se
estaba, qué se decidió y qué venía después.

No es documentación de producto. Es el cuaderno de obra.

---

## Punto de partida

| | |
|---|---|
| SHA de arranque de esta fase | `931775e8` |
| Árbol | limpio |
| Desplegado | nada |
| Coste externo acumulado | 0 € |
| Base local de trabajo | `nelvyon_desdecero` en `127.0.0.1:5433` (contenedor `nelvyon-test-postgres`) |

### Cómo levantar el entorno local

```bash
docker start nelvyon-test-postgres
# esquema desde cero, si hiciera falta:
#   psql -c "CREATE DATABASE nelvyon_desdecero"
#   DATABASE_URL=postgres://nelvyon:nelvyon@127.0.0.1:5433/nelvyon_desdecero \
#     npx tsx backend/db/migrate.ts

# el doble de Upstash es OBLIGATORIO para probar el build de producción:
node scripts/upstash-local-para-pruebas.mjs &

# la puerta completa (estructurales + next build de verdad)
node scripts/puerta-de-build.mjs

# el recorrido de las 153 rutas con inquilino nuevo
DATABASE_URL=... JWT_SECRET=... CRON_SECRET=... \
  node scripts/humo-sobre-build-de-produccion.mjs

# las suites contra PostgreSQL real
NELVYON_COLA_CERT_DSN=postgres://nelvyon:nelvyon@127.0.0.1:5433/nelvyon_desdecero \
  npx vitest run
```

---

## Estado por fase

Estados posibles:
`PENDIENTE` · `EN CURSO` · `LOCAL_CERTIFIED` · `PRODUCTION_UNVERIFIED` · `BLOQUEADO_DANIEL`

Nada se marca `DONE`: una fase cuya prueba final exige producción es
`LOCAL_CERTIFIED` + `PRODUCTION_UNVERIFIED`, nunca `DONE`.

| Fase | Estado | SHA | Nota |
|---|---|---|---|
| P0 · despliegue recuperado | LOCAL_CERTIFIED | `3ec15d66` `c9c954cf` | build EXIT=0, 153 rutas sin 5xx |
| P1 · procedencia LLM | LOCAL_CERTIFIED | `1456214f` | 51 pruebas; falta modelo real → Daniel |
| esquema desde cero | LOCAL_CERTIFIED | `6afa77f4` | 477 migraciones, 712 tablas |
| P3 · cola de trabajos | LOCAL_CERTIFIED | `3b3783d2` | 25 pruebas contra PG real |
| P4 · guarda de gasto | LOCAL_CERTIFIED | `52b2cae0` | 30 pruebas contra PG real |
| P5 · equivalencia medida | LOCAL_CERTIFIED | `931775e8` | 648 formas; 545 únicas |
| **Fase 3 · Business Brain** | LOCAL_CERTIFIED | `338bdd41` | 28 dimensiones, 27 pruebas PG |
| **Fase 2 · journey cliente** | LOCAL_CERTIFIED | `b041713e` | 4 rutas de portal, 26 pruebas PG |
| Fase 4 · departamentos | LOCAL_CERTIFIED | `b097e865` | 24 departamentos, 0 vacíos |
| Fase 5 · contrato de agente | LOCAL_CERTIFIED | `d8fb838f` | 23 contratos, 27 pruebas |
| Fase 6 · caracterización sectorial | LOCAL_CERTIFIED | `35110e19` | 1.605 al 100 %, 3 familias, 0 rebeldes |
| **Fase 6b · equivalencia por SALIDA** | LOCAL_CERTIFIED | `9eddce4c` | 1.521/1.605 medidos · **1.521 instrucciones distintas · 0 redundantes** |
| Fase 19 · autonomía L0–L5 | LOCAL_CERTIFIED | `d8fb838f` | suelo por consecuencia |
| Fase 11 · puente agente→ejecutor | LOCAL_CERTIFIED | `7487229b` | 30 pruebas PG, **7 puertas** |
| Fase 16 · motor de resultados | LOCAL_CERTIFIED | `bb050ab0` | 19 pruebas PG, 4 mutaciones |
| Fase 23 · customer success | LOCAL_CERTIFIED | `e339e73f` | 19 pruebas PG, 6 tipos de señal |
| **Fase 17 · inteligencia entre deptos.** | LOCAL_CERTIFIED | `385fc8cb` | 29 pruebas PG, 6 mutaciones |
| **contexto de cliente consolidado** | LOCAL_CERTIFIED | `385fc8cb` | 18 pruebas, 3 fuentes → 1 canónica |
| **Fase 18 · motor de calidad** | LOCAL_CERTIFIED | `9eddce4c` | 39 pruebas, 6 mutaciones, puerta 3 del puente |
| **Fase 29 · las 55 sentencias** | LOCAL_CERTIFIED | `9eddce4c` | 55/55 clasificadas · **5 defectos reales confirmados** |
| **Fase 33 · rendimiento** | LOCAL_CERTIFIED | `3ffc6dc2` | 34 tablas con RLS sin índice por inquilino · **9,88 ms → 0,14 ms (73x)** |
| **maquinaria comercial de NELVYON** | LOCAL_CERTIFIED | `b097e865` | 21 pruebas PG, 8 mutaciones · **envío imposible por diseño** |
| **departamentos: ventas, comunidad, growth** | LOCAL_CERTIFIED | `b097e865` | 25 operativos, 5 planeados con motivo |
| **Fase 24 · portal: el ciclo se ve** | LOCAL_CERTIFIED | `949f9fa2` | 9 pruebas de interfaz, 6 mutaciones |
| **Fase 25 · sala de máquinas** | LOCAL_CERTIFIED | `949f9fa2` | 13 pruebas PG + 4 de ruta · 9 mutaciones |
| **E2E multiservicio** | LOCAL_SIMULATED_EXTERNAL | `949f9fa2` | **13/13 servicios recorren el cableado entero** |
| **invariante de negocio** | LOCAL_CERTIFIED | `c4e357b7` | 3 contradicciones «sin agencia» corregidas · prueba que impide la deriva |
| **honestidad de afirmaciones** | LOCAL_CERTIFIED | `c4e357b7` | capacidad ≠ resultado · 4 de 5 resultados NO_MEDIDO |
| **pasada adversarial** | LOCAL_CERTIFIED | `7487229b` | 7 vías de ataque · **1 agujero real encontrado y cerrado** |
| **humo sobre build de producción** | LOCAL_CERTIFIED | `7487229b` | **153 rutas, 0 respuestas 5xx** · el script no podía ejecutarse y ahora sí |
| **los 5 defectos de esquema** | LOCAL_CERTIFIED | pendiente | 587/588 · **2 arreglados sin tocar el esquema** |
| **personalizacion por servicio** | LOCAL_CERTIFIED | pendiente | **cobertura 0,40 → 1,00 · 25/25 PERSONALIZA** |
| **profundidad por disciplina** | LOCAL_CERTIFIED | pendiente | 54 dimensiones · 60 comprobaciones de calidad en 16 disciplinas |
| **matriz de los 25 servicios** | LOCAL_CERTIFIED | pendiente | 6 LOCAL_CERTIFIED · 19 PARTIAL · 0 FAIL |
| **entregable universal** | LOCAL_CERTIFIED | pendiente | los 17 que solo daban texto ahora dan un fichero |
| **cadena comercial completa** | LOCAL_CERTIFIED | pendiente | prospecto → respuesta → oportunidad → cliente |
| **E2E por familia** | LOCAL_SIMULATED_EXTERNAL | pendiente | 8 familias con clientes reales distintos |
| **QA adversarial de servicio** | LOCAL_CERTIFIED | pendiente | 10 intentos · **1 agujero real** · 5 limites escritos |
| **limites artificiales** | LOCAL_CERTIFIED | pendiente | 10 propiedades estructurales, sin afirmar capacidad |
| Fase 31 · E2E agencia completa | LOCAL_CERTIFIED | `9eddce4c` | 13 pasos, 3 pruebas PG |

---

## Decisiones tomadas (técnicas, reversibles)

1. **La cola reclama por lista blanca**, nunca por lista negra. Motivo:
   `waiting_approval` no puede ejecutarse solo tras un reinicio.
2. **El intento se cuenta al reclamar**, no al terminar. Motivo: un trabajo que
   mata al proceso se reintentaría eternamente.
3. **Gasto externo denegado por defecto**, con el `UNIQUE` de idempotencia en el
   esquema y no en el código.
4. **`RULE_ENGINE` es publicable; `MOCK` y `FALLBACK` no.** Un generador
   determinista por diseño no es una degradación.
5. **La deuda de la 507 se escribe y se fija** en `omisiones_conocidas_507.json`.
   Un fallo no listado rompe la migración. Y desde la Fase 29, cada una de las 55
   lleva clase y evidencia en `clasificacion_507.json`; los defectos reales se
   confirman A MANO en `verificacion_manual_507.json`, porque el clasificador
   automático se equivocó de cuatro formas distintas antes de estabilizarse.
7. **Nadie evalúa su propio trabajo.** El motor de calidad lanza si el evaluador
   coincide con el autor, y el puente convierte eso en denegación. Sin motor o
   sin pieza adjunta, lo que sale hacia fuera se DENIEGA: un revisor que se
   esquiva no adjuntando nada no es un revisor.
8. **Una evaluación de reglas nunca se presenta como de modelo.** `REAL` exige
   proveedor configurado, no una variable de entorno.
17. **Las restricciones legales del cliente llegan a TODOS los agentes.** Se
    midió cuánto de lo que distingue a un cliente llegaba a su instrucción: el
    40 %. El otro 60 % incluía lo que ese cliente tiene PROHIBIDO decir. Para un
    sector regulado eso no es un matiz: es una sanción con el nombre de NELVYON.
18. **«No aplica» no es «no se pudo comprobar».** Una bloqueante sin comprobar
    manda una acción de alto riesgo a revisión humana; marcar así lo que
    simplemente no aplica llenaría la bandeja de ruido, y una bandeja con ruido
    se deja de mirar.
19. **Dos subsistemas distintos no comparten tabla.** El chatbot legado y el de
    inquilino compartían `chatbot_conversations` con formas incompatibles, y la
    clave ajena hacía imposible arreglarlo añadiendo columnas.
16. **Un guardián que aborta siempre no protege: lo parece.** El humo sobre el
    build de producción llevaba sin poder ejecutarse porque arrancaba un
    servidor de producción sin `JWT_SECRET`: se quedaba en «falta algo para
    poder medir». Ahora usa secretos desechables locales y recorre las 153
    rutas de verdad.
15. **Una acción no puede contradecirse a sí misma.** Las consecuencias las
    declara quien llama, así que quien llama puede mentir: `importeCents: 5000`
    con `consecuencias: []` esquivaba a la vez la puerta de calidad y la de
    gasto. No se puede comprobar si una declaración es honesta sin ejecutarla,
    pero sí si es COHERENTE. Lo encontró la pasada adversarial, no una prueba
    normal.
13. **NELVYON ES la agencia, y eso lo vigila una prueba.** «Sin agencia»
    posiciona a NELVYON como sustituto de una agencia cuando NELVYON *es* la
    agencia. Había tres, una de ellas en las instrucciones que recibe el agente
    de Ads — el peor sitio posible. Corregidas, y con prueba que impide que
    vuelvan.
14. **Capacidad y resultado se cuentan por separado.** Tener una capacidad no
    es producir un resultado: producción tiene 14.178 eventos que decían `ok:
    true` sobre trabajo que ninguna IA hizo. `docs/LO_QUE_SE_PUEDE_AFIRMAR.md`
    se genera, no se escribe, y deja `NO_MEDIDO` donde toca.
11. **Una baja comercial es de NELVYON entera.** `comercial_bajas` no tiene
    `workspace_id` ni RLS, y es la única tabla del sistema que se salta el
    aislamiento a propósito: aislar las bajas por inquilino convertiría cada
    workspace nuevo en una segunda oportunidad para molestar a quien ya dijo
    que no. La migración lo comprueba y falla si alguien le pone RLS.
12. **Enviar comunicaciones comerciales es imposible por diseño**, no por
    configuración. `enviar()` lanza siempre. No es un hueco pendiente de
    rellenar: es la puerta cerrada.
10. **RLS por inquilino ⟹ índice por inquilino.** No es rendimiento, es
    estructura: si la política obliga a filtrar por `workspace_id` en toda
    consulta, sin ese índice cada lectura recorre las filas de todos los
    clientes. Lo vigila una prueba cuyo inventario sale del catálogo de
    PostgreSQL, para que la tabla número 35 entre sola.
9. **NO se consolidan los agentes sectoriales.** Medido por salida: 1.521 agentes
   producen 1.521 instrucciones distintas y no hay ni una pareja equivalente. La
   sospecha de «un agente copiado 1.605 veces» es falsa, y fusionarlos perdería
   1.521 matices. La medición se repite sola en cada suite.
6. **Los `require()` perezosos de `DbClient` están prohibidos** y lo vigila la
   puerta de build: en el bundle de Next devuelven `undefined`.

## Bloqueos que NO son míos

| Bloqueo | Por qué |
|---|---|
| Dónde vive el modelo de IA | decisión empresarial con coste |
| Desplegar | acción productiva |
| Aplicar 578 / 579 / 580 en producción | migración productiva |
| `SES_SNS_TOPIC_ARN` | credencial de producción |
| Precios reales de los servicios | decisión comercial |
| Autorizar gasto de un agente | autorización financiera |
| Ejecutar los 12 trabajos en cola | trabajo real a clientes reales |

---

## Defectos propios encontrados por las pruebas

Se anotan porque son la clase de error que se repite si no se escribe.

1. `conContadorDeEjecucion` era síncrono y restauraba el contexto antes de que
   terminaran los `await`: el tope de gasto de IA no mordía. → `AsyncLocalStorage`.
2. La herramienta de equivalencia neutralizaba sólo el nombre de la carpeta y
   daba «65 % de ficheros únicos». La cifra real es 27,3 %.
3. `SenalesDeCliente` consultaba `pack_deliverables`, que **no existe**: la
   tabla es `os_deliverables`. Una consulta contra una tabla inexistente no
   falla en tiempo de compilación y devolvería cero siempre.
4. La misma consulta usaba los estados `pending_approval` / `awaiting_client`,
   que **tampoco existen**: los de `os_deliverables` son draft, in_review,
   delivered, approved, published, rejected, archived.
5. Las migraciones 581 y 582 declaraban `client_id TEXT` cuando `os_clients.id`
   es `uuid`. Corregidas en su sitio, no con una migración de parche.
6. Afirmé que ningún agente sectorial leía el contexto del cliente. **Falso**:
   253 de 1.605 lo leen con `ClientProfileService`, de `client_profiles` — otra
   tabla distinta de `os_clients`. Salía de haber buscado sólo `os_clients`.
   NELVYON tiene TRES almacenes de contexto a la vez, y el cerebro debe
   absorber los dos viejos, no ser el tercero.
7. La guarda de gasto comparaba la ventana con `Date.now()` contra fechas
   escritas por `NOW()` de PostgreSQL. Medido: PG va 1 ms por delante, así que
   una autorización aprobada en ese instante se rechazaba. Ahora la ventana la
   evalúa la base. **Y la primera prueba de regresión no lo detectaba**: dependía
   de una carrera de 1 ms y pasaba con el defecto dentro. Reescrita con desfase
   determinista.

## Siguiente acción

**Fase 24** — portal premium: las cuatro rutas existen y falta la interfaz que
las use. Después, **Fase 25** (consola interna) y **Fase 17** (inteligencia
entre departamentos, que ya tiene debajo el cerebro y el motor de resultados).

El paso que falta de la **Fase 6** está escrito en su propia prueba: caracterizar
la FUENTE no basta; hay que ejecutar cada familia contra un modelo doble y
comparar SALIDAS antes de migrar nada.
