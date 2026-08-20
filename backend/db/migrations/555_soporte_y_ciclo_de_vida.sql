-- Soporte autonomo y ciclo de vida del cliente, sobre lo que YA existe.
--
-- QUE NO SE CONSTRUYE AQUI
-- ------------------------
-- Ningun sistema de tickets nuevo. `helpdesk_tickets` ya existe con 23 columnas,
-- modelo, contrato canonico de estados y prioridades (`core/helpdesk_contract.py`)
-- y objetivos de SLA (`services/helpdesk_notifications.py`). Hay ademas cuatro
-- tablas de tickets mas, tres de ellas sin una sola linea de codigo detras; no se
-- tocan ni se borran, simplemente no se construye encima de ellas.
--
-- LO QUE FALTABA NO ERA EL BUZON, ERA QUIEN LO ATIENDE
-- ----------------------------------------------------
-- Los tickets entran por el router, como siempre: Autopilot no inventa la
-- entrada. Lo que no existia es alguien que los clasifique, que note que un SLA
-- se esta venciendo y que avise. Eso son capacidades, no un modulo nuevo.
--
-- DONDE SE PONE LA FRONTERA Y POR QUE
-- -----------------------------------
--   triage_entrante      escribe `category` y SOLO cuando esta vacia. Acotado,
--                        reversible y sin efectos fuera de la base.
--   sla_en_riesgo        solo mide. El aviso lo da el vigilante.
--   respuesta_sugerida   compone un borrador desde `support_templates` y espera.
--                        Responder a un cliente sale de NELVYON y no se deshace:
--                        un correo enviado por error ya lo ha leido alguien.
--   onboarding_estancado solo mide.
--   senales_de_churn     solo mide.
--   campana_de_retencion contactar clientes es publicar hacia fuera. Espera.
--
-- POR QUE `triage` NO TOCA `priority`
-- -----------------------------------
-- La prioridad determina el SLA. Cambiarla no es etiquetar: es alterar el
-- compromiso con el cliente y el reloj que lo mide. Eso lo decide una persona.
--
-- EL VOCABULARIO NO ESTA INVENTADO
-- --------------------------------
-- Las categorias son las que ya usa `support_templates`: billing, technical,
-- feature_request, other. El handler las lee de esa tabla, no de una lista
-- escrita a mano que se desincronizaria en cuanto alguien anada una plantilla.

INSERT INTO public.autopilot_capabilities
    (clave, servicio_os, descripcion, modo_ejecucion, reversible, plan_minimo,
     cadencia, tiempo_limite_s, max_intentos)
VALUES
    ('os_helpdesk.sla_en_riesgo', 'os_helpdesk',
     'Tickets que han pasado su objetivo de primera respuesta o de resolucion, '
     'y los que llevan demasiado sin asignar.',
     'AUTOMATIC_SAFE', true, 'starter', 'daily', 120, 3),

    ('os_lifecycle.onboarding_estancado', 'os_lifecycle',
     'Onboarding empezado y sin avanzar: cuantos pasos faltan y desde cuando.',
     'AUTOMATIC_SAFE', true, 'starter', 'weekly', 120, 3),

    ('os_lifecycle.senales_de_churn', 'os_lifecycle',
     'Senales de abandono: sin entregables, sin tareas cerradas, suscripcion '
     'proxima a expirar o marcada para cancelar.',
     'AUTOMATIC_SAFE', true, 'pro', 'weekly', 180, 3)
ON CONFLICT (clave) DO NOTHING;

INSERT INTO public.autopilot_capabilities
    (clave, servicio_os, descripcion, modo_ejecucion, reversible, plan_minimo,
     cadencia, tiempo_limite_s, max_intentos, limites)
VALUES
    ('os_helpdesk.triage_entrante', 'os_helpdesk',
     'Clasifica tickets sin categoria segun las plantillas de soporte. No toca '
     'la prioridad: eso cambiaria el SLA comprometido con el cliente.',
     'AUTOMATIC_WITH_LIMITS', true, 'starter', 'daily', 180, 3,
     '{"max_filas_por_ejecucion": 50, "solo_sin_categoria": true}'::jsonb)
ON CONFLICT (clave) DO NOTHING;

INSERT INTO public.autopilot_capabilities
    (clave, servicio_os, descripcion, modo_ejecucion, reversible, plan_minimo,
     cadencia, tiempo_limite_s, max_intentos)
VALUES
    ('os_helpdesk.respuesta_sugerida', 'os_helpdesk',
     'Compone un borrador de respuesta desde las plantillas. NO lo envia: un '
     'correo enviado no se deshace.',
     'HUMAN_APPROVAL', false, 'starter', 'daily', 300, 2),

    ('os_lifecycle.campana_de_retencion', 'os_lifecycle',
     'Propone a quien contactar y con que mensaje. NO contacta a nadie.',
     'HUMAN_APPROVAL', false, 'pro', 'monthly', 300, 2)
ON CONFLICT (clave) DO NOTHING;

-- ─────────────────────────────────────────── privilegios, otra vez al minimo

DO $bloque_555$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'nelvyon_jobs') THEN
        RAISE NOTICE '555: no existe nelvyon_jobs; nada que otorgar';
        RETURN;
    END IF;

    GRANT SELECT ON public.helpdesk_tickets            TO nelvyon_jobs;
    GRANT SELECT ON public.support_templates           TO nelvyon_jobs;
    GRANT SELECT ON public.onboarding_workspace_steps  TO nelvyon_jobs;

    -- Una capacidad escribe, y escribe UNA columna.
    GRANT UPDATE (category) ON public.helpdesk_tickets TO nelvyon_jobs;
END
$bloque_555$;

-- ─────────────────────────────────────────── y uno que se RETIRA
--
-- `support_tickets` es una de las cinco tablas de tickets de la base y esta
-- muerta: cero filas, sin `workspace_id` y sin una sola linea de codigo que
-- escriba en ella. `nelvyon_jobs` tenia SELECT porque el vigilante la consultaba
-- para «tickets sin respuesta» — preguntandole a la tabla equivocada, asi que esa
-- comprobacion devolvia cero para siempre y un ticket pudriendose una semana no
-- levantaba nada.
--
-- Arreglada la comprobacion para que mire `helpdesk_tickets`, este privilegio ya
-- no lo usa nadie. Se retira: cada GRANT de este rol se salta RLS, asi que uno
-- que sobra es una via cross-tenant abierta sin que nadie la pidiera.
--
-- Es la UNICA sentencia de esta migracion que quita algo, y lo que quita es un
-- permiso, no un dato. La tabla y sus filas quedan intactas.

DO $bloque_555_revoke$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'nelvyon_jobs') THEN
        REVOKE ALL ON public.support_tickets FROM nelvyon_jobs;
    END IF;
END
$bloque_555_revoke$;
