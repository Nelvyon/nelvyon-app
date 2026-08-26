# Cómo se ejecutan las puertas de certificación

Sin estas variables, muchas suites **se saltan**. Un salto no es un aprobado, y
esta página existe para que nadie confunda las dos cosas.

Todo apunta al PostgreSQL local en Docker (`nelvyon-local-ai-postgres`, puerto
5434). **Ninguna toca producción.**

## Las variables

```
NELVYON_PG_CERT_DSN=postgresql://nelvyon_local:nelvyon_local_dev@localhost:5434/nelvyon_cert545
NELVYON_WEB_CERT_DSN=postgresql://nelvyon_local:nelvyon_local_dev@localhost:5434/nelvyon_web_cert
NELVYON_WEB_APP_CERT_DSN=postgresql://nelvyon_web_app:cert_local_b8@localhost:5434/nelvyon_web_cert
NELVYON_B2_DSN=postgresql://nelvyon_local:nelvyon_local_dev@localhost:5434/nelvyon_b2_cert
NELVYON_B3_DSN=postgresql://nelvyon_local:nelvyon_local_dev@localhost:5434/nelvyon_b2_cert
NELVYON_B4_DSN=postgresql://nelvyon_local:nelvyon_local_dev@localhost:5434/nelvyon_b2_cert
```

Con `NELVYON_B3_DSN` y `NELVYON_B4_DSN` puestas se ejecutan **54 pruebas más** que
antes se saltaban: memoria y RAG, idempotencia distribuida, derechos del titular
(GDPR), tareas programadas y la espina de agentes.

`NELVYON_WEB_APP_CERT_DSN` usa el rol **`nelvyon_web_app`**, que es el que SÍ está
sujeto a las políticas RLS. Es lo que hace que la suite de aislamiento efectivo
mida la frontera de verdad y no la del superusuario.

> La contraseña del rol local se fijó en el Bloque 8 (`cert_local_b8`) porque
> dentro del contenedor `psql` usa socket con `trust` y por TCP hacía falta una.
> Es una base local desechable en Docker. **No es una credencial de producción.**
> Sin ella, treinta pruebas de RLS se saltaban en silencio.

## Lo que sigue saltándose, y por qué

| Suite | Se salta si falta | Clase |
|---|---|---|
| `migration523.pg.test.ts` | `MIG523_TEST_DATABASE_URL` | base desechable con migraciones aplicadas |
| `rls.test.ts` (2 casos) | `RUN_SUPABASE_RLS=1` | **EXTERNAL_VERIFICATION_REQUIRED** — exige Supabase en vivo |

Los dos casos de `rls.test.ts` no se pueden ejecutar en local por definición:
comprueban la RLS del Supabase gestionado. Quedan clasificados como verificación
externa, no como cobertura pendiente.

## La suite de recuperación corre A SOLAS

`perderPostgresYVolver.pg.test.ts` **para y arranca el contenedor de PostgreSQL**.
Se ejecuta solo con:

```
NELVYON_PERMITIR_REINICIO_PG=1 CERT_PG_CONTAINER=nelvyon-local-ai-postgres   npx vitest run ../../backend/db/__tests__/perderPostgresYVolver.pg.test.ts
```

**Nunca junto al resto.** Se comprobó: lanzándola con el directorio entero, el
reinicio tumbó **84 pruebas** de otras suites que estaban a mitad de una consulta.
Aquellos 84 rojos no eran del producto — eran de haber lanzado a la vez dos cosas
que compiten por el mismo PostgreSQL.

Sin la variable, la suite se salta entera. Esa es la salvaguarda.

## Las dos bases que hay que preparar (y que antes se saltaban 34 pruebas)

### `migration523.pg.test.ts` — 18 pruebas

Necesita una base **desechable con las migraciones aplicadas**:

```
docker exec nelvyon-local-ai-postgres psql -U nelvyon_local -d postgres \
  -c "CREATE DATABASE nelvyon_recon_b9"
DATABASE_URL=postgresql://nelvyon_local:nelvyon_local_dev@localhost:5434/nelvyon_recon_b9 \
  node scripts/migrate-pg.mjs
MIG523_TEST_DATABASE_URL=postgresql://nelvyon_local:nelvyon_local_dev@localhost:5434/nelvyon_recon_b9 \
  npx vitest run ../../backend/db/__tests__/migration523.pg.test.ts
```

### `rlsIsolation.pg.test.ts` — 16 pruebas

Necesita una base de local-ai **con rol NO superusuario**, y ahí hay un detalle
que costó encontrar y conviene no volver a descubrir:

> El esquema de local-ai se aprovisiona con `apply-local-ai-schema.mjs`, **fuera
> de la cadena de migraciones**. Con solo ese script, `local_ai_audit`,
> `local_ai_config` y `local_ai_ingest_jobs` se quedan **sin RLS** — porque quien
> se la activa es la migración 567, que nunca corre contra esa base.
>
> Hay que aplicar **las dos cosas**: el script de esquema y después las
> migraciones.

```
docker exec ... -c "CREATE DATABASE nelvyon_localai_cert"
PGSSL=0 NELVYON_LOCAL_AI_USE_MAIN_DB=1 NELVYON_LOCAL_AI_SCHEMA_APPLY=1 \
  DATABASE_URL=postgresql://nelvyon_local:nelvyon_local_dev@localhost:5434/nelvyon_localai_cert \
  node scripts/apply-local-ai-schema.mjs
PGSSL=0 NELVYON_LOCAL_AI_USE_MAIN_DB=1 NELVYON_LOCAL_AI_RLS_ROLE_APPLY=1 \
  NELVYON_LOCAL_AI_APP_ROLE=nelvyon_local_app DATABASE_URL=...nelvyon_localai_cert \
  node scripts/apply-local-ai-rls-role.mjs
DATABASE_URL=...nelvyon_localai_cert node scripts/migrate-pg.mjs   # ← el paso que faltaba
docker exec ... -d nelvyon_localai_cert -c "GRANT USAGE ON SCHEMA public TO nelvyon_local_app; GRANT ALL ON ALL TABLES IN SCHEMA public TO nelvyon_local_app;"
LOCAL_AI_TEST_DATABASE_URL=postgresql://nelvyon_local_app:cert_local_b10@localhost:5434/nelvyon_localai_cert \
  npx vitest run ../../backend/local-ai/__tests__/rlsIsolation.pg.test.ts
```

**Importante:** el rol tiene que ser **no superusuario y sin BYPASSRLS**. Con un
superusuario, RLS no se aplica y la prueba certificaría el vacío. La propia suite
lo comprueba antes de nada, que es exactamente lo que debe hacer.

Con las dos bases preparadas, los saltos bajan de **44 a 10**.

## Las últimas cuatro variables (y por qué el ROL importa más que el DSN)

```
DATABASE_URL=postgresql://nelvyon_local:nelvyon_local_dev@localhost:5434/nelvyon_cert545
LOCAL_AI_DATABASE_URL=postgresql://nelvyon_local_app:cert_local_b10@localhost:5434/nelvyon_localai_cert
MIG523_TEST_DATABASE_URL=postgresql://nelvyon_local:nelvyon_local_dev@localhost:5434/nelvyon_recon_b9
LOCAL_AI_TEST_DATABASE_URL=postgresql://nelvyon_local_app:cert_local_b10@localhost:5434/nelvyon_localai_cert
```

> **`LOCAL_AI_DATABASE_URL` usa `nelvyon_local_app`, no `nelvyon_local`.**
> Con el superusuario, `localAiPhase2.test.ts` **falla** — y falla con razón: RLS
> no se aplica a un superusuario, así que el inquilino A sí ve la memoria del B.
> No es un fallo del producto: es la prueba diciendo que la estás ejecutando con
> el rol equivocado.
>
> Es el mismo error, cometido dos veces esta noche, en dos suites distintas. **El
> DSN correcto no basta: tiene que ser el ROL correcto.**

Con todo puesto, los saltos bajan a **9**, y los nueve están clasificados:

| Suite | Saltos | Clase |
|---|---:|---|
| `perderPostgresYVolver` | 3 | corre **a solas**, con `NELVYON_PERMITIR_REINICIO_PG=1` |
| `rls.test.ts` | 2 | **EXTERNAL_VERIFICATION_REQUIRED** — Supabase en vivo |
| `phase2EliteLive`, `workforceLive` | 2 | exigen modelo de *embeddings* real |
| resto | 2 | entornos externos |
