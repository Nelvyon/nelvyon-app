-- 000 — Lo que la cadena de migraciones da por hecho y ningun fichero crea.
--
-- EL FALLO QUE CIERRA
-- -------------------
-- Sobre un PostgreSQL virgen —el que Railway acaba de aprovisionar para
-- staging— la cadena muere en la migracion 023:
--
--     [migrate] run: 023_support_tickets.sql
--     [migrate] FATAL: schema "auth" does not exist   (SQLSTATE 3F000)
--
-- Y no es un caso aislado. Reproducido en local sobre una base vacia, con un
-- ejecutor que continua tras cada error para verlos todos de una vez, salen
-- DIECISIETE fallos. Nueve de ellos son el mismo, en cascada:
--
--     023, 024, 026, 027, 279   ->  schema "auth" does not exist
--     311, 322                  ->  la 279, que crea `nelvyon_jwt_user_id()`,
--                                   no llego a aplicarse
--     313, 515                  ->  la 311, que crea
--                                   `nelvyon_current_saas_tenant_uuid()`,
--                                   tampoco
--
-- Los otros dos independientes:
--
--     452   ->  gen_random_bytes(): falta la extension `pgcrypto`
--     518   ->  ALTER sobre `workflows`, tabla que crea SQLAlchemy y no el SQL
--
-- El resto (507 y las que dependen de sus tablas) caen por arrastre.
--
-- POR QUE ESTABA OCULTO
-- ---------------------
-- `scripts/pg-cert-db.mjs` aplica cuatro shims ANTES de migrar, y entre ellos
-- crea el schema `auth`. Toda la certificacion «desde cero» corria sobre una
-- base que ya tenia lo que faltaba. El camino real de un PostgreSQL virgen
-- nunca se probo. Esos shims dejan de ser necesarios con este fichero: pasan a
-- estar en la cadena, que es donde el despliegue los busca.
--
-- POR QUE `auth` NO ES UN SCHEMA VACIO DE ADORNO
-- ----------------------------------------------
-- `auth.uid()` NO es un resto que se pueda ignorar: `nelvyon_jwt_user_id()`,
-- la funcion de identidad propia de NELVYON (migracion 279), LA ENVUELVE:
--
--     SELECT COALESCE(auth.uid(),
--                     NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid)
--
-- Es decir, la identidad de NELVYON se define sobre ella. Crearla no falsea el
-- modelo: lo completa donde Supabase la traia de serie y PostgreSQL puro no.
--
-- Por eso NO se define como `SELECT NULL`, que seria el adorno que el modelo no
-- admite, sino con la semantica REAL de Supabase: leer el `sub` del JWT de la
-- sesion. Sobre PostgreSQL puro se comporta como se comportaba, y no introduce
-- una segunda fuente de identidad: es la misma que ya usa el `COALESCE`.
--
-- POR QUE ES SEGURO EN PRODUCCION
-- -------------------------------
-- Todo es `IF NOT EXISTS` o `CREATE OR REPLACE`. Ordena el primero, asi que en
-- una base nueva corre antes que nada; en una base existente —donde estos
-- objetos ya estan— no cambia nada. Ni DROP, ni DELETE, ni datos tocados.
--
-- `CREATE OR REPLACE FUNCTION auth.uid()` sobre una instalacion que ya la tenga
-- la reescribe con la misma semantica. Si algun dia se despliega sobre Supabase
-- de verdad, el schema `auth` ya existe y la funcion nativa se sustituye por una
-- equivalente: mismo origen del dato, mismo tipo de retorno.

-- ─────────────────────────── identidad heredada de Supabase

CREATE SCHEMA IF NOT EXISTS auth;

CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  -- La semantica de Supabase: el `sub` del JWT de la peticion en curso.
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

-- Los `GRANT ... TO authenticated` y `TO anon` de la cadena fallan si el rol no
-- existe. Se crean sin login: no son credenciales, son destinatarios de permisos.
DO $$
BEGIN
  CREATE ROLE authenticated NOLOGIN;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE ROLE anon NOLOGIN;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE ROLE service_role NOLOGIN;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─────────────────────────── extensiones que la cadena usa

-- `452_saas_cpq_enterprise.sql` llama a `gen_random_bytes()`, que vive aqui.
-- Ninguna migracion declaraba la extension: funcionaba porque el entorno
-- anterior ya la traia.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─────────────────────────── `workflows`, que crea el ORM y no el SQL

-- La declara `backend/models/workflows.py` y la crea `Base.metadata.create_all`
-- al arrancar la aplicacion. Pero `518_workflows_list_columns.sql` hace ALTER
-- sobre ella, y en un despliegue nuevo las migraciones corren ANTES de que la
-- aplicacion arranque: la tabla aun no existe y el ALTER revienta.
--
-- Se crea aqui con la MISMA forma que el modelo. `create_all` usa `checkfirst`,
-- asi que al arrancar la encuentra y no la toca. Que las dos definiciones no se
-- separen lo vigila `test_pg_orm_catalog_parity`.
CREATE TABLE IF NOT EXISTS workflows (
  id            SERIAL PRIMARY KEY,
  user_id       VARCHAR NOT NULL,
  workspace_id  INTEGER NOT NULL,
  name          VARCHAR NOT NULL,
  description   VARCHAR,
  trigger_type  VARCHAR NOT NULL,
  nodes_json    VARCHAR,
  status        VARCHAR,
  runs_count    INTEGER,
  last_run_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ
);

COMMENT ON SCHEMA auth IS
  'Compatibilidad con la identidad heredada de Supabase. `auth.uid()` devuelve el `sub` del JWT de la sesion; `public.nelvyon_jwt_user_id()` la envuelve.';
