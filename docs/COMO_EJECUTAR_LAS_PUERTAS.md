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
