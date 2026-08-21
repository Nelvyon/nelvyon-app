-- El organigrama de NELVYON, declarado.
--
-- COMO SE DECIDIO CADA LINEA
-- --------------------------
-- Las herramientas de cada agente son EXACTAMENTE las que su implementacion
-- invoca en `core/agentes/plantilla.py`. Ni una de mas. Hay una prueba que
-- compara ambas listas: si un agente pide algo que no tiene, se le deniega y
-- queda registrado; si tiene algo que no usa, la prueba lo dice para retirarlo.
--
-- POR QUE CASI TODOS SON `ninguno` DE NIVEL DE MODELO
-- ---------------------------------------------------
-- Porque el trabajo de operar una empresa cuando no hay nadie delante es, sobre
-- todo, MIRAR: quien no ha contestado, que se paso de fecha, que factura no se
-- cobro. Eso es una consulta y un umbral acordado, no un modelo de lenguaje.
-- Meter un modelo ahi añade coste, latencia, dependencia de un proveedor y una
-- fuente de errores que no se puede reproducir.
--
-- Los dos que si declaran modelo son los que REDACTAN hacia un cliente. Hoy
-- quedan NOT_CONFIGURED porque no hay endpoint, y el runtime los detiene con
-- estado `sin_modelo` en vez de degradarlos a una plantilla fija que finja ser
-- redaccion.
--
-- LA CONFIANZA MINIMA NO ES UN NUMERO REDONDO POR CASUALIDAD
-- ----------------------------------------------------------
-- Los agentes calculan su confianza a partir de CUANTA EVIDENCIA pudieron
-- mirar: 0.30 sin datos, 0.60 con pocos, 0.95 con suficientes. Un umbral de
-- 0.70 significa por tanto «no entregues si no miraste nada». Para QA se sube a
-- 0.80: decir que la calidad esta bien sin haber mirado apenas es peor que
-- callarse.
--
-- ADITIVA E IDEMPOTENTE. No toca ni una fila existente.

INSERT INTO public.agent_catalog
    (clave, departamento, descripcion, nivel_modelo, herramientas,
     confianza_minima, coste_max_centimos, profundidad_max)
VALUES
    ('coo.parte_diario', 'direccion',
     'El parte de la empresa: que se movio y que hay que mirar.',
     'ninguno',
     '["proyectos.listar","tareas.pendientes","tickets.abiertos","entregables.listar"]'::jsonb,
     0.70, 0, 1),

    ('operaciones.plan_semanal', 'operaciones',
     'Que hay que hacer esta semana y en que orden.',
     'ninguno', '["tareas.pendientes","proyectos.listar"]'::jsonb, 0.70, 0, 1),

    ('sdr.calificar', 'captacion',
     'Califica el pipeline segun un umbral explicito. NO contacta a nadie.',
     'ninguno', '["oportunidades.listar"]'::jsonb, 0.70, 0, 1),

    ('onboarding.siguiente_paso', 'onboarding',
     'Que le falta a un cliente para empezar a recibir valor.',
     'ninguno',
     '["clientes.listar","proyectos.listar","entregables.listar"]'::jsonb,
     0.70, 0, 1),

    ('qa.revisar_entregables', 'qa',
     'Entregables que no deberian haberse entregado.',
     'ninguno', '["entregables.listar"]'::jsonb, 0.80, 0, 1),

    ('soporte.priorizar', 'soporte',
     'Orden de atencion de los tickets. No responde a nadie.',
     'ninguno', '["tickets.abiertos"]'::jsonb, 0.70, 0, 1),

    ('cs.salud_cuenta', 'customer_success',
     'Salud de la cuenta a partir de hechos comprobables.',
     'ninguno',
     '["entregables.listar","tickets.abiertos","suscripcion.estado"]'::jsonb,
     0.70, 0, 1),

    ('finanzas.parte_de_caja', 'finanzas',
     'Entradas, salidas y gastos sin pagar. No mueve un euro.',
     'ninguno', '["finanzas.resumen"]'::jsonb, 0.70, 0, 1),

    ('sre.parte_de_ejecucion', 'sre',
     'Que ha hecho el motor y que se ha atascado.',
     'ninguno', '["autopilot.historial"]'::jsonb, 0.70, 0, 1),

    ('seguridad.revision_de_datos', 'seguridad',
     'Revision de lo que guarda el workspace. No cambia ni un permiso.',
     'ninguno', '["clientes.listar","memoria.leer"]'::jsonb, 0.70, 0, 1)
ON CONFLICT (clave) DO NOTHING;

-- Los que redactan hacia un cliente. Declaran modelo y presupuesto.
INSERT INTO public.agent_catalog
    (clave, departamento, descripcion, nivel_modelo, herramientas,
     confianza_minima, coste_max_centimos, profundidad_max)
VALUES
    ('ventas.redactar_propuesta', 'ventas',
     'Redacta una propuesta a partir de un precio DADO. Nunca lo inventa.',
     'estandar', '["oportunidades.listar"]'::jsonb, 0.80, 50, 1),

    ('soporte.redactar_respuesta', 'soporte',
     'Redacta una respuesta de soporte. No la envia.',
     'rapido', '["tickets.abiertos"]'::jsonb, 0.75, 10, 1)
ON CONFLICT (clave) DO NOTHING;

-- ═══════════════════════════════════════════ politicas
--
-- Deny por defecto: lo que no este aqui, no se puede hacer. Cada fila lleva un
-- motivo escrito porque una politica sin explicacion no se puede revisar, y hay
-- un CHECK que exige que el motivo tenga contenido.

INSERT INTO public.agent_policies (agente, accion, modo, limites, motivo)
VALUES
    ('coo.parte_diario', 'informe.componer', 'AUTOMATIC_SAFE', '{}'::jsonb,
     'Solo lee y compone. El unico efecto es la fila de auditoria.'),
    ('operaciones.plan_semanal', 'plan.componer', 'AUTOMATIC_SAFE', '{}'::jsonb,
     'Propone un orden de trabajo; no asigna ni cambia nada.'),
    ('onboarding.siguiente_paso', 'informe.componer', 'AUTOMATIC_SAFE', '{}'::jsonb,
     'Lista lo que falta. No crea ni modifica ningun recurso.'),
    ('qa.revisar_entregables', 'qa.revisar', 'AUTOMATIC_SAFE', '{}'::jsonb,
     'Detecta entregables defectuosos. No los toca ni los retira.'),
    ('soporte.priorizar', 'soporte.priorizar', 'AUTOMATIC_SAFE', '{}'::jsonb,
     'Ordena la cola de atencion. No responde ni reasigna.'),
    ('cs.salud_cuenta', 'informe.componer', 'AUTOMATIC_SAFE', '{}'::jsonb,
     'Señales de riesgo a partir de hechos. No contacta al cliente.'),
    ('finanzas.parte_de_caja', 'informe.componer', 'AUTOMATIC_SAFE', '{}'::jsonb,
     'Lee movimientos. No emite, cobra ni concilia nada.'),
    ('sre.parte_de_ejecucion', 'informe.componer', 'AUTOMATIC_SAFE', '{}'::jsonb,
     'Lee el historial del motor. No reencola ni cancela trabajos.'),
    ('seguridad.revision_de_datos', 'seguridad.revisar', 'AUTOMATIC_SAFE', '{}'::jsonb,
     'Inventario de lo que se guarda. No cambia permisos ni borra nada.')
ON CONFLICT (agente, accion) DO NOTHING;

-- Con limites: califica y escribe un umbral, pero acotado.
INSERT INTO public.agent_policies (agente, accion, modo, limites, motivo)
VALUES
    ('sdr.calificar', 'pipeline.calificar', 'AUTOMATIC_WITH_LIMITS',
     '{"valor_minimo": 500, "max_oportunidades": 50}'::jsonb,
     'Califica con un umbral explicito y acotado. No contacta a ningun lead: '
     'contactar sale de NELVYON y no se deshace.')
ON CONFLICT (agente, accion) DO NOTHING;

-- Aprobacion humana: todo lo que acaba delante de un cliente.
INSERT INTO public.agent_policies (agente, accion, modo, limites, motivo)
VALUES
    ('ventas.redactar_propuesta', 'propuesta.redactar', 'HUMAN_APPROVAL_REQUIRED',
     '{}'::jsonb,
     'Una propuesta compromete precio y condiciones. Aunque el borrador lo '
     'componga una maquina, quien lo asume es la empresa.'),
    ('soporte.redactar_respuesta', 'respuesta.redactar', 'HUMAN_APPROVAL_REQUIRED',
     '{}'::jsonb,
     'La respuesta va a un cliente. Un correo enviado ya lo ha leido alguien.')
ON CONFLICT (agente, accion) DO NOTHING;

-- Denegado explicitamente. Estan aqui para que el intento quede registrado con
-- un motivo, en vez de caer en el «no hay politica» generico: cuando alguien
-- pregunte por que NELVYON no cobra sola, la respuesta esta escrita.
INSERT INTO public.agent_policies (agente, accion, modo, limites, motivo)
VALUES
    ('ventas.redactar_propuesta', 'precio.fijar', 'DENY', '{}'::jsonb,
     'Un precio inventado por una maquina se convierte en una obligacion con un '
     'cliente. El precio entra como dato, no se genera.'),
    ('ventas.redactar_propuesta', 'descuento.conceder', 'DENY', '{}'::jsonb,
     'Un descuento es una decision comercial con efecto en el margen.'),
    ('ventas.redactar_propuesta', 'contrato.firmar', 'DENY', '{}'::jsonb,
     'Ningun agente tiene autoridad contractual.'),
    ('finanzas.parte_de_caja', 'pago.cobrar', 'DENY', '{}'::jsonb,
     'Mover dinero no se deshace.'),
    ('finanzas.parte_de_caja', 'pago.reembolsar', 'DENY', '{}'::jsonb,
     'Igual que cobrar, en el otro sentido.'),
    ('seguridad.revision_de_datos', 'permisos.cambiar', 'DENY', '{}'::jsonb,
     'Un cambio de permisos abre puertas que despues nadie mira.'),
    ('seguridad.revision_de_datos', 'datos.borrar', 'DENY', '{}'::jsonb,
     'Borrar no se deshace, y aqui la instruccion es explicita: ante la duda, '
     'no se borra.'),
    ('soporte.redactar_respuesta', 'correo.enviar', 'DENY', '{}'::jsonb,
     'Redactar y enviar son dos cosas distintas. Este agente hace la primera.')
ON CONFLICT (agente, accion) DO NOTHING;
