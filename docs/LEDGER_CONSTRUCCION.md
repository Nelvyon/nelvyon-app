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
| Fase 4 · departamentos | LOCAL_CERTIFIED | pendiente | 24 departamentos, 0 vacíos |
| Fase 5 · contrato de agente | LOCAL_CERTIFIED | pendiente | 23 contratos, 27 pruebas |
| Fase 6 · 1 994 sectoriales | PENDIENTE | — | characterization tests primero |
| Fase 19 · autonomía L0–L5 | LOCAL_CERTIFIED | pendiente | suelo por consecuencia |
| Fase 11 · puente agente→ejecutor | PENDIENTE | — | sobre la guarda de gasto |
| Fase 16 · results engine | PENDIENTE | — | |
| Fase 23 · customer success | LOCAL_CERTIFIED | pendiente | 19 pruebas PG, 6 tipos de señal |
| Fase 24 · portal premium | PENDIENTE | — | |
| Fase 29 · las 55 sentencias | PENDIENTE | — | |
| Fase 31 · E2E agencia completa | PENDIENTE | — | prueba de que todo encaja |

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
   Un fallo no listado rompe la migración.
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

## Siguiente acción

**Fase 11 — el puente agente → ejecutor**, que ya tiene debajo todo lo que
necesita: la guarda de gasto (P4), los niveles de autonomía (Fase 19) y los
contratos con sus consecuencias declaradas (Fase 5).
