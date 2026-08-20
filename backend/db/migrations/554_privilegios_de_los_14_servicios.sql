-- Lo que `nelvyon_jobs` necesita para ejecutar los 14 servicios de OS. Ni una fila mas.
--
-- POR QUE HACIA FALTA
-- -------------------
-- El executor de Autopilot corre como `nelvyon_jobs`, no como la aplicacion.
-- Ese rol tenia SELECT sobre `os_clients`, `os_projects` y `os_deliverables`,
-- pero NADA sobre `os_tasks`, `os_cashflow`, `os_expenses`, `os_deals`,
-- `os_store_projects` ni `os_website_projects`. Seis de las quince capacidades
-- habrian devuelto 42501 en la primera ejecucion real.
--
-- COMO SE DECIDIO CADA PRIVILEGIO
-- -------------------------------
-- No por tabla ni por prefijo. Se extrajeron mecanicamente los verbos SQL de
-- `core/autopilot_capacidades.py`: catorce handlers solo LEEN, y uno solo
-- —`marcar_vencidas`— escribe. De ahi sale exactamente esta lista.
--
-- EL UPDATE ES DE UNA COLUMNA, NO DE UNA TABLA
-- --------------------------------------------
-- `marcar_vencidas` escribe unicamente `os_tasks.metadata`. PostgreSQL permite
-- otorgar UPDATE por columna, asi que eso es lo que se otorga. Si manana alguien
-- cambiase ese handler para tocar `status`, `due_date` o `completed_at`, la base
-- lo rechazaria: el limite deja de depender de que nadie se equivoque al
-- revisar el codigo.
--
-- NADA DE DELETE, NADA DE INSERT
-- ------------------------------
-- Ninguna capacidad crea ni borra filas de OS. Concederlo «por si acaso» seria
-- justo lo contrario del minimo privilegio.
--
-- SOBRE RLS
-- ---------
-- `nelvyon_jobs` tiene BYPASSRLS, asi que las politicas de os_* no lo frenan.
-- Su aislamiento entre inquilinos NO lo da RLS: lo da el `WHERE workspace_id`
-- que llevan las quince consultas, y lo demuestra el test A<->B de
-- `test_autopilot_14_servicios.py`, que llena un workspace vecino con treinta
-- filas y comprueba que no aparece ni una.

DO $bloque_554$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'nelvyon_jobs') THEN
        RAISE NOTICE '554: no existe nelvyon_jobs; nada que otorgar';
        RETURN;
    END IF;

    -- Lectura: los catorce handlers que solo componen resumenes.
    GRANT SELECT ON public.os_tasks             TO nelvyon_jobs;
    GRANT SELECT ON public.os_cashflow          TO nelvyon_jobs;
    GRANT SELECT ON public.os_expenses          TO nelvyon_jobs;
    GRANT SELECT ON public.os_deals             TO nelvyon_jobs;
    GRANT SELECT ON public.os_store_projects    TO nelvyon_jobs;
    GRANT SELECT ON public.os_website_projects  TO nelvyon_jobs;

    -- Escritura: una capacidad, una tabla, UNA COLUMNA.
    GRANT UPDATE (metadata) ON public.os_tasks  TO nelvyon_jobs;
END
$bloque_554$;
