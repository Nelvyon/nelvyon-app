-- 528 — PRIMARY KEY legacy de `intent_scores`.
--
-- 527 anadio el arbitro que el `ON CONFLICT` necesitaba, pero el INSERT seguia
-- fallando antes: `contact_id` es PRIMARY KEY y NOT NULL, y ningun writer
-- moderno la escribe. PostgreSQL respondia `null value in column "contact_id"`.
-- Es una segunda restriccion legacy, independiente del arbitro, por eso va en
-- migracion propia y 527 no se rehace.
--
-- EVIDENCIA DE LA DIRECCION:
--   * `lead_id` y el `ON CONFLICT(lead_id, workspace_id)` estan en el commit
--     INICIAL del servicio (2948690f, 2026-05-25);
--   * `contact_id` solo aparece en 507 (f24ffb93, 2026-07-04), seis semanas
--     despues;
--   * ningun codigo lee `contact_id` de esta tabla;
--   * cero foreign keys referencian la tabla.
--
-- `contact_id` NO se elimina ni se renombra, y no se hace backfill: conserva
-- tipo y datos historicos, solo deja de ser identidad.
--
-- PRECONDICIONES FAIL-CLOSED
-- --------------------------
-- Cambiar una PRIMARY KEY no es aditivo. La migracion se NIEGA a ejecutarse
-- sobre una base que no sea exactamente la esperada: adaptarse en silencio a un
-- estado imprevisto es como se corrompen datos. Cada `RAISE EXCEPTION` aborta la
-- transaccion entera y deja el esquema intacto.

DO $$
DECLARE
  pk_actual TEXT;
  n_null INTEGER;
  n_dup INTEGER;
  n_fk INTEGER;
BEGIN
  IF to_regclass('public.intent_scores') IS NULL THEN
    RAISE NOTICE '528: intent_scores no existe en esta base; nada que reparar';
    RETURN;
  END IF;

  -- 1. La PK debe ser exactamente la legacy conocida.
  SELECT string_agg(a.attname, ',' ORDER BY a.attname) INTO pk_actual
  FROM pg_constraint c
  JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
  WHERE c.conrelid = 'intent_scores'::regclass AND c.contype = 'p';

  IF pk_actual IS NULL THEN
    RAISE NOTICE '528: intent_scores no tiene PRIMARY KEY; se crea la moderna';
  ELSIF pk_actual = 'lead_id,workspace_id' THEN
    RAISE NOTICE '528: la PK ya es la moderna; nada que hacer';
    RETURN;
  ELSIF pk_actual <> 'contact_id' THEN
    RAISE EXCEPTION '528: PK inesperada (%). Se esperaba contact_id: revisar antes de migrar', pk_actual;
  END IF;

  -- 2. Las columnas de la identidad moderna deben existir.
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='intent_scores' AND column_name='lead_id')
     OR NOT EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_name='intent_scores' AND column_name='workspace_id') THEN
    RAISE EXCEPTION '528: faltan lead_id o workspace_id; aplicar 525 antes';
  END IF;

  -- 3. Ninguna fila puede tener NULL en la identidad nueva.
  EXECUTE 'SELECT count(*) FROM intent_scores WHERE lead_id IS NULL OR workspace_id IS NULL'
    INTO n_null;
  IF n_null > 0 THEN
    RAISE EXCEPTION '528: % filas con lead_id/workspace_id NULL. NO se inventa identidad '
                    'ni se mapea contact_id: requiere estrategia de datos previa', n_null;
  END IF;

  -- 4. Ni duplicados en la identidad nueva.
  EXECUTE 'SELECT count(*) FROM (SELECT 1 FROM intent_scores GROUP BY lead_id, workspace_id '
          'HAVING count(*) > 1) d' INTO n_dup;
  IF n_dup > 0 THEN
    RAISE EXCEPTION '528: % duplicados (lead_id, workspace_id). NO se deduplica '
                    'automaticamente: decidir que fila sobrevive es de dominio', n_dup;
  END IF;

  -- 5. Ninguna FK puede depender de la PK que se retira.
  SELECT count(*) INTO n_fk FROM pg_constraint WHERE confrelid = 'intent_scores'::regclass;
  IF n_fk > 0 THEN
    RAISE EXCEPTION '528: % foreign keys referencian intent_scores; retirar la PK las romperia', n_fk;
  END IF;

  -- Precondiciones cumplidas.
  IF pk_actual = 'contact_id' THEN
    EXECUTE 'ALTER TABLE intent_scores DROP CONSTRAINT ' || quote_ident(
      (SELECT conname FROM pg_constraint
       WHERE conrelid = 'intent_scores'::regclass AND contype = 'p')
    );
  END IF;

  EXECUTE 'ALTER TABLE intent_scores ALTER COLUMN contact_id DROP NOT NULL';
  EXECUTE 'ALTER TABLE intent_scores ADD PRIMARY KEY (lead_id, workspace_id)';
END $$;

COMMENT ON COLUMN intent_scores.contact_id IS
  'Legacy de 507: fue PRIMARY KEY pero ningun writer la escribe. La identidad real es (lead_id, workspace_id).';
