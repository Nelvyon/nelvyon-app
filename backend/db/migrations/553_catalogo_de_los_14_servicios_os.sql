-- Los 14 servicios de NELVYON OS, catalogados por lo que HACEN.
--
-- COMO SE CLASIFICO CADA UNO
-- --------------------------
-- No por su nombre. Se inspeccionaron los verbos HTTP de cada router y las tablas
-- que toca, y la clasificacion sale de ahi:
--
--   os_observability, os_excellence, os_global   solo GET
--   os_cashflow, os_expenses, os_deals           GET + POST/PUT/DELETE
--   os_clients, os_projects, os_tasks            GET + POST/PATCH/DELETE
--   os_tasks_rest, os_deliverables_rest          idem, mas operaciones de revision
--   os_store_builder, os_web_builder             9 GET + 7-8 POST: PUBLICAN
--   os_autonomous                                lanza ejecuciones autonomas
--
-- LA REGLA QUE SE APLICO
-- ----------------------
-- Una capacidad de Autopilot NO es el CRUD que el router expone. El CRUD existe
-- para las personas. Autopilot hace trabajo RECURRENTE: resumenes, deteccion y
-- borradores. Por eso casi todas las capacidades son de lectura aunque su servicio
-- sepa escribir: automatizar el alta de un gasto no aporta nada y anade riesgo;
-- detectar que hay gastos sin pagar desde hace 60 dias, si.
--
-- AUTOMATIC_SAFE        solo lee y compone. El unico efecto es la fila de
--                       `autopilot_jobs`. Deshacerlo es borrar esa fila.
-- AUTOMATIC_WITH_LIMITS escribe, pero acotado y reversible, con el limite
--                       declarado en `limites` y comprobado por el handler.
-- HUMAN_APPROVAL        publica hacia fuera o lanza trabajo irreversible. El
--                       planificador las deja en `awaiting_approval` y el
--                       executor NUNCA las recoge: solo toma `scheduled`.
--
-- POR QUE LOS BUILDERS NO SON AUTOMATICOS
-- ---------------------------------------
-- `os_store_builder` y `os_web_builder` publican tiendas y sitios a un dominio.
-- Una publicacion no se deshace: queda indexada, cacheada y vista. `os_autonomous`
-- lanza ejecuciones que consumen credito de modelos. Las tres se marcan
-- `reversible = false`, y el CHECK de la 551 impide entonces declararlas
-- automaticas aunque alguien lo intente.
--
-- Autopilot si puede prepararles el terreno: analizar, componer un borrador y
-- dejarlo en cola de aprobacion. Eso es reversible y util.
--
-- LIMITES EXPLICITOS
-- ------------------
-- Se anade `limites JSONB`. Una capacidad AUTOMATIC_WITH_LIMITS sin limite
-- declarado no puede existir: hay un CHECK que lo impide. Fail-closed.
--
-- ADITIVA E IDEMPOTENTE
-- ---------------------
-- `ADD COLUMN IF NOT EXISTS` y `ON CONFLICT DO NOTHING`. Reaplicarla no cambia
-- nada ni pisa una capacidad que alguien haya ajustado.

ALTER TABLE public.autopilot_capabilities
    ADD COLUMN IF NOT EXISTS limites JSONB NOT NULL DEFAULT '{}'::jsonb;

DO $bloque_553_check$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'ck_autopilot_limites_declarados'
          AND conrelid = 'public.autopilot_capabilities'::regclass
    ) THEN
        ALTER TABLE public.autopilot_capabilities
            ADD CONSTRAINT ck_autopilot_limites_declarados CHECK (
                modo_ejecucion <> 'AUTOMATIC_WITH_LIMITS'
                OR limites <> '{}'::jsonb);
    END IF;
END
$bloque_553_check$;

-- ─────────────────────────────────────────── AUTOMATIC_SAFE (solo lectura)

INSERT INTO public.autopilot_capabilities
    (clave, servicio_os, descripcion, modo_ejecucion, reversible, plan_minimo,
     cadencia, tiempo_limite_s, max_intentos)
VALUES
    ('os_observability.salud_semanal', 'os_observability',
     'Senales de salud del workspace: 5xx, latencia, jobs fallidos y cola.',
     'AUTOMATIC_SAFE', true, 'starter', 'weekly', 120, 3),

    ('os_excellence.checklist_qa', 'os_excellence',
     'Estado del checklist de calidad del workspace.',
     'AUTOMATIC_SAFE', true, 'starter', 'weekly', 120, 3),

    ('os_global.riesgo_semanal', 'os_global',
     'Posicion de riesgo del PROPIO workspace. No cruza inquilinos.',
     'AUTOMATIC_SAFE', true, 'pro', 'weekly', 120, 3),

    ('os_cashflow.resumen_mensual', 'os_cashflow',
     'Entradas, salidas y saldo del mes por categoria.',
     'AUTOMATIC_SAFE', true, 'starter', 'monthly', 180, 3),

    ('os_expenses.resumen_mensual', 'os_expenses',
     'Gastos del mes, pendientes de pago y vencidos.',
     'AUTOMATIC_SAFE', true, 'starter', 'monthly', 180, 3),

    ('os_deals.pipeline_semanal', 'os_deals',
     'Estado del pipeline: valor por etapa y oportunidades sin mover.',
     'AUTOMATIC_SAFE', true, 'starter', 'weekly', 120, 3),

    ('os_clients.cartera_semanal', 'os_clients',
     'Cartera de clientes: altas, activos y sin actividad reciente.',
     'AUTOMATIC_SAFE', true, 'starter', 'weekly', 120, 3),

    ('os_projects.estado_semanal', 'os_projects',
     'Proyectos por estado, con retrasos respecto a su fecha limite.',
     'AUTOMATIC_SAFE', true, 'starter', 'weekly', 120, 3),

    ('os_tasks.carga_semanal', 'os_tasks',
     'Carga de trabajo: tareas abiertas, vencidas y sin responsable.',
     'AUTOMATIC_SAFE', true, 'starter', 'weekly', 120, 3),

    ('os_deliverables_rest.pendientes_revision', 'os_deliverables_rest',
     'Entregables esperando revision del cliente desde hace demasiado.',
     'AUTOMATIC_SAFE', true, 'starter', 'weekly', 120, 3)
ON CONFLICT (clave) DO NOTHING;

-- ─────────────────────────────────────────── AUTOMATIC_WITH_LIMITS
--
-- Escribe, pero solo un campo de `metadata`, solo sobre tareas ya vencidas y
-- como maximo las que diga el limite. No cambia estado, no borra, no notifica.
-- Deshacerlo es quitar la marca.

INSERT INTO public.autopilot_capabilities
    (clave, servicio_os, descripcion, modo_ejecucion, reversible, plan_minimo,
     cadencia, tiempo_limite_s, max_intentos, limites)
VALUES
    ('os_tasks_rest.marcar_vencidas', 'os_tasks_rest',
     'Marca en metadata las tareas vencidas para que la interfaz las destaque. '
     'No cambia su estado ni avisa a nadie.',
     'AUTOMATIC_WITH_LIMITS', true, 'starter', 'daily', 180, 3,
     '{"max_filas_por_ejecucion": 200, "antiguedad_min_dias": 1}'::jsonb)
ON CONFLICT (clave) DO NOTHING;

-- ─────────────────────────────────────────── HUMAN_APPROVAL_REQUIRED
--
-- `reversible = false` a proposito: publicar no se deshace. El CHECK de la 551
-- impide que alguien las pase a automaticas sin cambiar antes esa declaracion,
-- que es justo la conversacion que debe ocurrir.

INSERT INTO public.autopilot_capabilities
    (clave, servicio_os, descripcion, modo_ejecucion, reversible, plan_minimo,
     cadencia, tiempo_limite_s, max_intentos)
VALUES
    ('os_store_builder.preparar_borrador', 'os_store_builder',
     'Analiza la tienda y compone un borrador de mejoras. NO publica: queda a la '
     'espera de aprobacion porque una publicacion no se deshace.',
     'HUMAN_APPROVAL', false, 'pro', 'monthly', 300, 2),

    ('os_web_builder.preparar_borrador', 'os_web_builder',
     'Analiza el sitio y compone un borrador. NO publica ni toca dominios.',
     'HUMAN_APPROVAL', false, 'pro', 'monthly', 300, 2),

    ('os_autonomous.proponer_plan', 'os_autonomous',
     'Propone un plan de ejecucion autonoma. NO lo lanza: consumiria credito de '
     'modelos y produciria efectos externos.',
     'HUMAN_APPROVAL', false, 'enterprise', 'monthly', 300, 2)
ON CONFLICT (clave) DO NOTHING;

COMMENT ON COLUMN public.autopilot_capabilities.limites IS
    'Limites explicitos de una capacidad AUTOMATIC_WITH_LIMITS. El CHECK impide '
    'declarar una sin ellos: una accion automatica sin tope es una accion sin '
    'frontera.';
