"""La plantilla de agentes de NELVYON.

QUE ES UN AGENTE AQUI, Y QUE NO
-------------------------------
Un agente NO es un proceso que conversa con otros agentes. Un agente es QUIEN
EJECUTA UNA CAPACIDAD de Autopilot.

Esa sola decision es la que evita que esto se convierta en una red caotica:

    no hay canal directo agente<->agente   un agente que necesita que otro haga
                                           algo EMITE UN TRABAJO, y un trabajo
                                           lleva clave de idempotencia,
                                           profundidad maxima y evidencia
    no hay contexto ilimitado              el contexto se construye con topes de
                                           filas y de caracteres, y lo que se
                                           recorto queda registrado
    no hay coste sin control               el presupuesto se comprueba ANTES de
                                           llamar al modelo
    no hay juez y parte                    el evaluador nunca es el mismo agente
                                           que produjo el resultado
    no hay punto unico de fallo            el orquestador es la cola de
                                           PostgreSQL, que ya sobrevive a que se
                                           muera cualquier worker

LO QUE SE REUTILIZA, QUE ES CASI TODO
-------------------------------------
Autopilot ya trae catalogo, clasificacion de riesgo, cola con reparto seguro,
validadores independientes, evidencia obligatoria por CHECK, reintentos,
escalado, aislamiento por inquilino y un vigilante. Nada de eso se reescribe.
Esta capa anade lo que faltaba para que el ejecutor de una capacidad pueda ser un
agente: politicas por accion, herramientas con privilegio minimo, un enrutador de
modelos que no depende de un proveedor, memoria por workspace, presupuesto,
frenos de emergencia y una auditoria que responde siete preguntas concretas.

SIN PROVEEDOR DE MODELO NO SE INVENTA NADA
------------------------------------------
`core/ai_provider` resuelve el endpoint de forma fail-closed y sin fallback a
OpenAI. Un agente que necesite modelo y no lo tenga NO se degrada a adivinar:
queda como `sin_modelo` y escala. Los agentes deterministas —los que no llaman a
ningun modelo— funcionan igual sin credenciales, y son la mayoria de los que
hacen falta para operar.
"""
