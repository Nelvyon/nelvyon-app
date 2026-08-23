-- Atribuye las 2.761 auditorias de shield que quedaron sin dueño.
--
-- POR QUE ESTAS FILAS NO TIENEN DUEÑO
-- ------------------------------------
-- `OsRegulatedSectorShieldService.persistAudit` no escribia `tenant_id` ni
-- `workspace_id`. La causa exacta esta localizada: en `packOrchestrator`, la
-- llamada al shield NO pasaba `workspaceId`, y veinte lineas mas abajo la
-- llamada al truth guard SI lo pasaba — mismo objeto `params`, mismo valor.
-- Un descuido de una linea.
--
-- El escritor ya esta corregido (commit ae951907): las auditorias nuevas nacen
-- atribuidas. Esta migracion solo repara las historicas.
--
-- POR QUE EL DUEÑO ES DETERMINISTA Y NO UNA INFERENCIA
-- -----------------------------------------------------
-- Las tres tablas del mismo lote —`os_qa_audit_runs`, `os_truth_guard_audits` y
-- `os_sector_shield_audits`— tienen EXACTAMENTE las mismas 2.761 filas, el mismo
-- rango de fechas (2026-06-29 .. 2026-07-22) y los mismos 1.077 `pack_run_id`.
-- Ni un solo `pack_run_id` aparece en shield y no en truth guard.
--
-- Medido antes de escribir esto:
--
--     filas totales                     2761
--     sin pack_run_id (irresolubles)       0
--     resolubles por pack_run_id        2761   -> 100%
--     pack_runs con workspace AMBIGUO      0
--
-- Es decir: el dueño no se INFIERE, se LEE de la fila del pack al que pertenece
-- la auditoria. No se inventa ningun propietario.
--
-- QUE NO HACE
-- -----------
-- No toca `tenant_id` (uuid). Estas filas pertenecen al espacio OS, que numera
-- workspaces; rellenar el uuid exigiria un mapeo que hoy no existe —
-- `saas_tenants.workspace_id` esta a NULL en 20 de 22 filas— y eso SI seria
-- inventar.
--
-- No borra nada. No toca ninguna fila que ya tenga `workspace_id`.
--
-- ROLLBACK
--   UPDATE public.os_sector_shield_audits
--      SET workspace_id = NULL
--    WHERE id IN (SELECT id FROM public.os_sector_shield_audits_backfill_574);

DO $bloque_574$
DECLARE
    sin_dueno    bigint;
    irresolubles bigint;
    ambiguos     bigint;
    reparadas    bigint;
BEGIN
    IF to_regclass('public.os_sector_shield_audits') IS NULL
       OR to_regclass('public.nelvyon_pack_runs') IS NULL THEN
        RAISE NOTICE '574: faltan tablas; no se hace nada';
        RETURN;
    END IF;

    SELECT count(*) INTO sin_dueno
      FROM public.os_sector_shield_audits WHERE workspace_id IS NULL;

    IF sin_dueno = 0 THEN
        RAISE NOTICE '574: no hay filas sin dueño; nada que hacer';
        RETURN;
    END IF;

    -- GUARDA 1 — nada que no se pueda resolver leyendo el pack.
    SELECT count(*) INTO irresolubles
      FROM public.os_sector_shield_audits s
     WHERE s.workspace_id IS NULL
       AND (s.pack_run_id IS NULL
            OR NOT EXISTS (SELECT 1 FROM public.nelvyon_pack_runs p
                            WHERE p.id = s.pack_run_id AND p.workspace_id IS NOT NULL));
    IF irresolubles > 0 THEN
        RAISE EXCEPTION '574: % filas no se pueden atribuir leyendo su pack. '
                        'Se aborta ENTERA: atribuir unas si y otras no dejaria un '
                        'estado peor que el actual, porque pareceria completo.',
                        irresolubles;
    END IF;

    -- GUARDA 2 — ningun pack puede pertenecer a dos workspaces.
    SELECT count(*) INTO ambiguos FROM (
        SELECT s.pack_run_id
          FROM public.os_sector_shield_audits s
          JOIN public.nelvyon_pack_runs p ON p.id = s.pack_run_id
         WHERE s.workspace_id IS NULL
         GROUP BY s.pack_run_id
        HAVING count(DISTINCT p.workspace_id) > 1) q;
    IF ambiguos > 0 THEN
        RAISE EXCEPTION '574: % packs apuntan a mas de un workspace. El dueño '
                        'dejaria de ser determinista y esto pasaria a ser una '
                        'suposicion. Se aborta.', ambiguos;
    END IF;

    -- Copia de seguridad de QUE se toco, para poder revertirlo exactamente.
    CREATE TABLE IF NOT EXISTS public.os_sector_shield_audits_backfill_574 (
        id uuid PRIMARY KEY,
        workspace_asignado integer NOT NULL,
        aplicado_en timestamptz NOT NULL DEFAULT now());

    WITH resueltas AS (
        SELECT s.id, p.workspace_id
          FROM public.os_sector_shield_audits s
          JOIN public.nelvyon_pack_runs p ON p.id = s.pack_run_id
         WHERE s.workspace_id IS NULL AND p.workspace_id IS NOT NULL
    ), guardadas AS (
        INSERT INTO public.os_sector_shield_audits_backfill_574 (id, workspace_asignado)
        SELECT id, workspace_id FROM resueltas
        ON CONFLICT (id) DO NOTHING
        RETURNING id
    )
    UPDATE public.os_sector_shield_audits s
       SET workspace_id = r.workspace_id
      FROM resueltas r
     WHERE s.id = r.id;

    GET DIAGNOSTICS reparadas = ROW_COUNT;
    RAISE NOTICE '574: % auditorias atribuidas leyendo el workspace de su pack', reparadas;

    -- GUARDA 3 — despues no puede quedar ninguna sin dueño.
    SELECT count(*) INTO sin_dueno
      FROM public.os_sector_shield_audits WHERE workspace_id IS NULL;
    IF sin_dueno > 0 THEN
        RAISE EXCEPTION '574: quedan % filas sin dueño despues del backfill', sin_dueno;
    END IF;
END
$bloque_574$;
