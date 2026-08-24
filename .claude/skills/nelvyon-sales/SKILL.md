---
name: nelvyon-sales
description: Estandar NELVYON de ventas y CRM: calificacion, seguimiento, objeciones y por que un lead simulado no es un lead.
---
# nelvyon-sales

Vender es ayudar a decidir. Casi todo lo que se llama tecnica de venta es
suplir informacion que deberia estar en la web.

## Calificacion

Un lead vale la pena si: tiene el problema, tiene presupuesto, decide o influye
en la decision, y tiene un plazo. Sin plazo no hay venta, hay conversacion.

La puntuacion se construye con senales **observadas**, no supuestas: que pagina
visito, que descargo, que pregunto. Puntuar por sector o tamano sin senal de
comportamiento es adivinar con decimales.

## Seguimiento

El primer contacto en minutos, no en dias. Despues, cadencia declarada y visible
en el CRM. Un seguimiento que no esta registrado no existe: lo hara otra persona
otra vez, o no lo hara nadie.

## Objeciones

Las cuatro de siempre, y lo que hay detras:

- **"Es caro"**: no se ve el valor, o se compara con otra cosa.
- **"Me lo pienso"**: falta un dato para decidir. Cual.
- **"Ahora no"**: el problema no duele todavia, o hay otro que duele mas.
- **"Ya tengo proveedor"**: que le falta al actual.

Se responde con informacion, no con presion. La presion cierra una venta y pierde
las siguientes.

## La distincion que importa

Un lead **simulado** en una prevision no es un lead. Una venta **prevista** no es
una venta. Un informe que los mezcla convierte la planificacion del cliente en
ficcion.

`EXECUTED` para una venta significa: hay un registro con identificador. `VERIFIED`
significa que ademas se cobro.

## Lo que nunca se hace

- Inventar leads, oportunidades o cifras de pipeline.
- Mover una oportunidad de fase sin que haya pasado algo.
- Prometer en la venta lo que la entrega no puede sostener.

## El contrato de honestidad

Todo entregable declara su estado. No es burocracia: es lo que impide que
NELVYON diga que hizo algo que solo preparo.

| Estado | Que significa |
|---|---|
| `PROPOSED` | Una propuesta. No se ha tocado nada. |
| `SIMULATED` | Un resultado calculado sin accion real. Sirve para ensenar, no para afirmar. |
| `READY_FOR_APPROVAL` | Tecnicamente listo y detenido a proposito, esperando a una persona. |
| `EXECUTED` | Hay constancia de que la accion se ejecuto: un identificador que alguien puede ir a mirar. |
| `VERIFIED` | Ademas hay constancia posterior de que el efecto es el esperado. |

`EXECUTED` y `VERIFIED` **no se pueden construir sin evidencia**. Ver
`backend/private-ai/estadoDeAccion.ts`.

## Multinicho

El comportamiento sale del **contexto del cliente**, nunca de un supuesto sobre
su sector. Los ejemplos son ejemplos.
