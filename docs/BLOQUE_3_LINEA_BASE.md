# BLOQUE 3 — línea base

> Se abre al cerrar el Bloque 2. El método es el mismo que funcionó allí: un
> inventario **derivado** del código, no escrito a mano, y cada elemento probado
> de punta a punta contra infraestructura real.

## Qué se certifica

"Empresa IA autónoma" no es una funcionalidad, es una promesa: **que NELVYON siga
operando cuando el fundador no está**. Eso se rompe de formas distintas a como se
rompe una pantalla de CRM, así que la pregunta de certificación también cambia.

En el Bloque 2 la pregunta era *¿la interfaz dice que sí y la base cambió?*.
Aquí es:

1. **¿Actúa de verdad, o solo lo registra?** Un autopilot que escribe "he
   respondido al cliente" en su bitácora y no envía nada es exactamente la clase
   de mentira funcional que el Bloque 2 persiguió, con más consecuencias.
2. **¿Se detiene cuando debe?** Un sistema autónomo sin freno no es autonomía, es
   una fuga. Interruptor de IA, límites de gasto, y la puerta de gobierno.
3. **¿Se recupera solo, o finge que se recuperó?** La autorrecuperación que marca
   el trabajo como resuelto sin resolverlo es peor que caerse.
4. **¿Escala su alcance sin permiso?** Un agente autónomo que amplía lo que puede
   tocar es una escalada de privilegios con otro nombre.

## Superficie existente

Ya hay mucho escrito. **Existir no es funcionar** — esa distinción es la que costó
el Bloque 2 entero.

- `backend/os-agents/` — 66 entradas: orquestador, bus de eventos, colas,
  almacén de trabajos (memoria y persistente), registro de agentes, calidad,
  certificación por sector, ROI de bucle cerrado.
- `backend/routers/os_autonomous.py`, `agents*.py`, `agent_actions.py`.
- Pruebas ya presentes: autopilot (núcleo, bucle, e2e, 14 servicios, ciclo de
  vida de soporte), fundador ausente (e2e y progresivo), autorrecuperación,
  gobierno (no escribible, no reabrible), centro de control, aprendizaje y
  publicación autónomos, vigilante de autopilot.

Casi todas están condicionadas a `NELVYON_PG_CERT_DSN`: **corren de verdad solo
cuando se les da base**, y sin ella la suite dice "passed" igual. Ese es el primer
sitio donde mirar.

## Restricciones que siguen vigentes

Las del fundador, sin caducidad y sin interpretación:
`WEB_DB_ROLE_CUTOVER`, ADR-064 (`568/569/570/572/573/574/575/576`; `571`
apartada), `STRIPE_MEMBERSHIP_REACTIVATION`, producción intocable, sin
operaciones destructivas, sin cambiar roles ni credenciales, **sin abrir Canary
IA ni activar proveedores de pago, coste externo nuevo = 0 €**.

Esa última pesa especialmente aquí: certificar una empresa autónoma de IA **sin
encender la IA de pago** obliga a separar en cada camino lo que es orquestación
—determinista, certificable— de lo que es inferencia. La orquestación es la parte
que puede mentir en silencio, y es la que se certifica.
