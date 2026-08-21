-- Los agentes automaticos, dados de alta como capacidades de Autopilot.
--
-- QUE HACE ESTO
-- -------------
-- Convierte diez agentes de «funciones que alguien puede invocar» en trabajo que
-- el planner programa y el executor ejecuta cada quince minutos sin que nadie
-- pida nada. Es la linea que separa una libreria de una empresa que trabaja
-- sola.
--
-- POR QUE TODAS SON `AUTOMATIC_SAFE`
-- ----------------------------------
-- Porque los diez solo LEEN y componen. El unico efecto de cada una es una fila
-- en `autopilot_jobs` y otra en `agent_runs`. Deshacerlo es borrar dos filas.
--
-- Los agentes que redactan hacia un cliente —propuesta, respuesta de soporte— NO
-- estan aqui a proposito. Su politica exige aprobacion humana, asi que
-- programarlos solo llenaria la cola de trabajos que nadie puede ejecutar, y una
-- cola llena de trabajo inejecutable es una forma silenciosa de atascar la
-- empresa. Se lanzan cuando una persona los pide.
--
-- LA DOBLE PUERTA SIGUE EN PIE
-- ----------------------------
-- Que la capacidad sea AUTOMATIC_SAFE dice CUANDO se ejecuta el trabajo. Lo que
-- el agente puede hacer MIENTRAS se ejecuta lo sigue gobernando `agent_policies`,
-- que es donde estan las prohibiciones de precio, cobro, permisos y envio.
--
-- CADENCIAS
-- ---------
-- Diaria lo que cambia a diario y hay que mirar cada dia; semanal lo que solo
-- tiene sentido en bloque. Nada es horario: nada de esto mejora por mirarse mas
-- veces, y cada ejecucion consume presupuesto de ejecuciones.
--
-- ADITIVA E IDEMPOTENTE.

INSERT INTO public.autopilot_capabilities
    (clave, servicio_os, descripcion, modo_ejecucion, reversible, plan_minimo,
     cadencia, tiempo_limite_s, max_intentos)
VALUES
    ('agente.coo.parte_diario', 'agentes',
     'DIRECCION — el parte de la empresa: que se movio y que hay que mirar.',
     'AUTOMATIC_SAFE', true, 'starter', 'daily', 120, 3),

    ('agente.operaciones.plan_semanal', 'agentes',
     'OPERACIONES — que hay que hacer esta semana y en que orden.',
     'AUTOMATIC_SAFE', true, 'starter', 'weekly', 120, 3),

    ('agente.sdr.calificar', 'agentes',
     'CAPTACION — califica el pipeline con un umbral explicito. No contacta.',
     'AUTOMATIC_SAFE', true, 'starter', 'weekly', 120, 3),

    ('agente.onboarding.siguiente_paso', 'agentes',
     'ONBOARDING — que le falta al cliente para empezar a recibir valor.',
     'AUTOMATIC_SAFE', true, 'starter', 'weekly', 120, 3),

    ('agente.qa.revisar_entregables', 'agentes',
     'QA — entregables que no deberian haberse entregado.',
     'AUTOMATIC_SAFE', true, 'starter', 'daily', 120, 3),

    ('agente.soporte.priorizar', 'agentes',
     'SOPORTE — orden de atencion de los tickets. No responde a nadie.',
     'AUTOMATIC_SAFE', true, 'starter', 'daily', 120, 3),

    ('agente.cs.salud_cuenta', 'agentes',
     'CUSTOMER SUCCESS — salud de la cuenta a partir de hechos comprobables.',
     'AUTOMATIC_SAFE', true, 'starter', 'weekly', 120, 3),

    ('agente.finanzas.parte_de_caja', 'agentes',
     'FINANZAS — entradas, salidas y gastos sin pagar. No mueve un euro.',
     'AUTOMATIC_SAFE', true, 'starter', 'weekly', 120, 3),

    ('agente.sre.parte_de_ejecucion', 'agentes',
     'SRE — que ha hecho el motor y que se ha atascado.',
     'AUTOMATIC_SAFE', true, 'starter', 'daily', 120, 3),

    ('agente.seguridad.revision_de_datos', 'agentes',
     'SEGURIDAD — inventario de lo que se guarda. No cambia ni un permiso.',
     'AUTOMATIC_SAFE', true, 'pro', 'weekly', 180, 3)
ON CONFLICT (clave) DO NOTHING;
