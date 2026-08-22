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
