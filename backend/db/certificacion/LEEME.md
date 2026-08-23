# Certificación del rol `nelvyon_web_app`

Cómo reproducir, de cero, la base contra la que se certifica que retirar
`postgres` del servicio web funciona.

## Por qué existe esta carpeta

La certificación no vale si no se puede repetir. Y no vale si las funciones que
deciden son una aproximación mía: se extraen del catálogo **en vivo** con
`pg_get_functiondef` y se instalan tal cual, para certificar la lógica que va a
decidir de verdad y no una versión equivalente escrita a mano.

## Pasos

1. Base limpia en el PostgreSQL local:

       docker exec nelvyon-local-ai-postgres psql -U nelvyon_local -d postgres \
         -c "DROP DATABASE IF EXISTS nelvyon_web_cert" \
         -c "CREATE DATABASE nelvyon_web_cert"

2. Tablas OS de la certificación (DDL real de producción) y sus dependencias.

3. Funciones de contexto y política, extraídas de producción. **Se instalan en
   varias pasadas**: se referencian entre sí y `pg_get_functiondef` las devuelve
   en orden alfabético, así que la primera pasada deja dependencias sueltas.

4. El esquema `auth` de Supabase no viaja en las migraciones. Se replica
   `auth.uid()` leyendo el mismo claim que ya se fija por transacción.

5. `roles_web.sql` — los dos roles y sus privilegios.

6. Pertenencia: A dueño del workspace 101, B del 202. **Sin esto la política
   deniega a todo el mundo y la certificación pasaría sin aislar nada.**

## Qué NO se replica, y por qué

`workspaces` y `workspace_members` se crean mínimas: las funciones sólo leen
`id`, `user_id`, `workspace_id`, `status` y `role`. Copiar su DDL completo sólo
añadía restricciones `NOT NULL` que no participan en ninguna decisión de
aislamiento.

Se descubrió recortando de más: la primera versión omitió `wm.role` y cayeron las
cinco pruebas de escritura. La política de mutación exige rol
`owner|admin|operator`, así que **leer y escribir se separan en la propia base**.

## Ejecutar

    NELVYON_WEB_CERT_DSN=postgresql://nelvyon_local:...@localhost:5434/nelvyon_web_cert \
    NELVYON_WEB_APP_CERT_DSN=postgresql://nelvyon_web_app:...@localhost:5434/nelvyon_web_cert \
    vitest run backend/db/__tests__/rlsEfectivaWebApp.pg.test.ts

## Mutación obligatoria

    ALTER ROLE nelvyon_web_app BYPASSRLS;

Tienen que caer **14** pruebas. Si no caen, la certificación está midiendo otra
cosa y no sirve.

---

# La puerta del BLOQUE 2

Tres tandas. Se separan porque **no admiten el mismo modo de ejecución**, no por
gusto.

## 1 · Suites de certificación de capacidades (16 ficheros, 242 pruebas)

    NELVYON_B2_DSN=postgresql://nelvyon_local:...@localhost:5434/nelvyon_b2_cert \
    npx vitest run backend/saas/__tests__/flujo

Cada fichero usa **su propio par de inquilinos**, con un sufijo de dos dígitos
(`...aaaaaaaaaa01` … `...aaaaaaaaaa16`). No es decorativo: los 16 compartían
`aaaa…`/`bbbb…`, vitest corre los ficheros en paralelo contra la misma base, y el
`beforeEach` de uno borraba lo que otro acababa de sembrar. Por separado pasaban
los 16; juntos caían tres. Con otra combinación de tiempos habría sido un falso
verde en vez de un falso rojo.

`laPuertaDelBloque2NoPuedeSaltarse.pg.test.ts` vigila justo eso: declarar
`NELVYON_B2_PUERTA=1` sin `NELVYON_B2_DSN` **falla**, porque una puerta sin base
se saltaría las 242 pruebas y reportaría verde.

## 2 · Suite web completa

    NELVYON_B2_DSN=... npx vitest run

## 3 · Aislamiento y RLS — **en serie, obligatoriamente**

    NELVYON_WEB_CERT_DSN=postgresql://nelvyon_local:...@localhost:5434/nelvyon_web_cert \
    MIG523_TEST_DATABASE_URL=postgresql://nelvyon_local:...@localhost:5434/nelvyon_mig_cert \
    DATABASE_URL=postgresql://nelvyon_local:...@localhost:5434/nelvyon_b2_cert \
    npx vitest run --no-file-parallelism \
      aislamiento_os_lado_web migration523 reclamoDeEvento contextoDeInquilino \
      laBajaNoResucita colasNoDuplicanTrabajo ErpDomainSnapshotStore ErpPersistenceRoundtrip

**`--no-file-parallelism` no es una rebaja.** Estas suites comparten una única
base de certificación y manipulan roles, contexto de sesión y políticas de forma
global: en paralelo se pisan entre ficheros y caen 68 pruebas que en serie pasan.
Quitar la bandera no las hace más estrictas, las hace mentir.

## 4 · Python

    NELVYON_AI_ENABLED=0 \
    NELVYON_PG_CERT_DSN=postgresql://nelvyon_local:...@127.0.0.1:5434/nelvyon_cert545 \
    python -m pytest backend/tests -q -p no:randomly

Sin `NELVYON_PG_CERT_DSN` se saltan **cientos** de pruebas contra PostgreSQL real
y la suite sigue diciendo "passed". Ese es el modo de andar por casa, no la
puerta.

## Lo que NO corre, y por qué

| Pruebas | Qué exige | Estado |
|---|---|---|
| 68 (`rlsFamiliasSaas`, `rlsEfectivaWebApp`) | credencial del rol `nelvyon_web_app` | `WEB_DB_ROLE_CUTOVER` = BLOQUEADO POR EL FUNDADOR |
| 16 (`rlsIsolation`) | un rol **sin** privilegios | misma familia: la suite se niega si el DSN es superusuario, y hace bien |
| 6 (`rls`, `localAiPhase2`, `phase2EliteLive`, `workforceLive`) | proveedor de IA **en vivo** | apagadas por la regla de no abrir Canary IA ni proveedores de pago |

Las 16 de `rlsIsolation` merecen una nota: apuntadas a un DSN de superusuario
**fallan**, y el mensaje es "el rol de test NO puede ser superusuario". No es un
defecto del producto — RLS no se aplica a superusuarios, así que la prueba estaría
midiendo el vacío. La suite lo detecta y se planta. Es el comportamiento correcto.

## La puerta se ejecuta SOLA

Las tandas no se solapan entre sí ni con nada más en la máquina.

Se aprendió lanzando la suite web completa y la de Python a la vez: cayeron tres
pruebas con `Test timed out in 5000ms` —ninguna aserción, solo tiempo— y las tres
pasaban aisladas. El indicador estaba a la vista en el propio resumen:
`environment 1063s` para 152s de reloj.

Ese resultado no dice nada del producto: dice que la máquina estaba saturada. La
tentación es subir el timeout, y sería rebajar la guardia para tapar una medición
mal hecha. Se repite la corrida sola.

## Base de referencia del trinquete de huecos

`NELVYON_VIRGEN_DSN` no vale cualquier base: tiene que ser una **reconstruida solo
con migraciones**.

- `nelvyon_rec_final` — con la 576 aplicada → el trinquete da verde.
- `nelvyon_cert545` — sin la 576 → reporta los 8 huecos que la 576 cierra.

Las dos lecturas son correctas y juntas son la medición. Apuntarlo a una base
cualquiera —una con shims, o una a medio migrar— da un número que no significa
nada. Ya pasó: apuntado a `nelvyon_virgen` el test ni siquiera encontró
`_migrations`.
