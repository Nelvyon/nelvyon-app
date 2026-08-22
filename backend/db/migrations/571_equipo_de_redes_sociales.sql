-- El equipo de agentes de redes sociales.
--
-- QUE FALTABA
-- -----------
-- El catalogo tiene 12 agentes en 9 departamentos: direccion, operaciones,
-- captacion, ventas, soporte, customer success, finanzas, QA, seguridad, SRE y
-- onboarding. No habia ninguno de redes sociales, que es una de las areas donde
-- una agencia pasa mas horas.
--
-- QUE PUEDEN HACER, Y QUE NO
-- ---------------------------
-- `redes.publicar` esta en JAMAS_AUTOMATICO desde el primer dia: ningun agente
-- publica, ni siquiera con aprobacion humana por la via automatica. Estos tres
-- MIRAN y REDACTAN; publicar sigue siendo un acto humano.
--
--     redes.parte_de_publicacion   que salio, que rindio y que se atasco
--     redes.revisar_cola           lo programado que ya deberia haber salido
--     redes.redactar_borrador      un texto propuesto, que nadie envia
--
-- Los dos primeros no gastan modelo (`nivel_modelo = ninguno`): componen a
-- partir de hechos de la base. El tercero si, y por eso lleva coste maximo y
-- exige APROBACION HUMANA: un borrador que se publicara con la marca del cliente
-- no es una decision de un agente.
--
-- LAS HERRAMIENTAS EXISTEN Y SE EJECUTAN
-- --------------------------------------
-- `redes.publicaciones`, `redes.cola` y `redes.ajustes` estan registradas en
-- `core/agentes/herramientas.py`, son de SOLO LECTURA y acotan por
-- `workspace_id` explicito como el resto del catalogo. Se ejecutaron contra
-- PostgreSQL real antes de escribir esta migracion — no se declara una capacidad
-- cuya herramienta no se haya probado.
--
-- `redes.ajustes` existe por un motivo concreto: permite distinguir «no hay nada
-- configurado» de «no hay nada que publicar». Son dos diagnosticos distintos y
-- solo uno es accionable.
--
-- ADITIVA. Tres filas en `agent_catalog` y tres en `agent_policies`. No toca
-- ninguna tabla de cliente.
--
-- ROLLBACK
--   DELETE FROM public.agent_policies WHERE agente LIKE 'redes.%';
--   DELETE FROM public.agent_catalog  WHERE clave  LIKE 'redes.%';

INSERT INTO public.agent_catalog
    (clave, departamento, descripcion, nivel_modelo, herramientas,
     confianza_minima, coste_max_centimos, profundidad_max)
VALUES
    ('redes.parte_de_publicacion', 'redes_sociales',
     'Que se publico, que rindio y que se quedo atascado. No publica nada.',
     'ninguno',
     '["redes.publicaciones","redes.ajustes"]'::jsonb,
     0.70, 0, 1),

    ('redes.revisar_cola', 'redes_sociales',
     'Lo programado que ya deberia haber salido y sigue en cola.',
     'ninguno',
     '["redes.cola","redes.ajustes"]'::jsonb,
     0.70, 0, 1),

    ('redes.redactar_borrador', 'redes_sociales',
     'Redacta un borrador de publicacion. NO lo publica ni lo programa.',
     'rapido',
     '["redes.publicaciones","redes.ajustes","clientes.listar"]'::jsonb,
     0.80, 20, 1)
ON CONFLICT (clave) DO NOTHING;

-- ═══════════════════════════════════════════ politicas
--
-- Deny por defecto: lo que no este aqui no se puede hacer.

INSERT INTO public.agent_policies (agente, accion, modo, limites, motivo)
VALUES
    ('redes.parte_de_publicacion', 'informe.componer', 'AUTOMATIC_SAFE', '{}'::jsonb,
     'Lee publicaciones y ajustes y compone un parte. El unico efecto es la fila de auditoria.'),

    ('redes.revisar_cola', 'informe.componer', 'AUTOMATIC_SAFE', '{}'::jsonb,
     'Detecta lo programado que no salio. No reencola, no cancela y no publica.'),

    ('redes.redactar_borrador', 'contenido.redactar', 'HUMAN_APPROVAL_REQUIRED',
     '{"max_borradores": 5, "sin_precios": true, "sin_compromisos": true}'::jsonb,
     'Un texto que se publicaria con la marca del cliente no es decision de un agente. Redacta y espera; publicar sigue siendo humano. Los limites impiden que invente precios o compromisos, que es lo que JAMAS_AUTOMATICO ya prohibe por otra via.')
ON CONFLICT (agente, accion) DO NOTHING;
