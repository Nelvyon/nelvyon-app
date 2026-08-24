---
name: nelvyon-local-business
description: Estandar NELVYON para negocio local: captacion de proximidad, ficha, presencia en el mapa y lo que de verdad mueve la aguja con presupuesto pequeno.
---
# nelvyon-local-business

Un negocio local no es una empresa pequena con menos presupuesto. Es otro juego:
el publico es finito, la competencia es geografica y la recomendacion pesa mas
que cualquier canal.

## Lo que de verdad mueve la aguja

Por orden de retorno para un presupuesto pequeno:

1. **Ficha de negocio completa y activa.** Es gratis y es donde busca la gente.
2. **Resenas reales y respondidas.** Ver `nelvyon-reputation`.
3. **Que el telefono y el horario sean correctos.** Suena obvio; es la causa mas
   comun de clientes perdidos.
4. **Una pagina que cargue rapido en movil** con la direccion y un boton de
   llamar.
5. Y solo despues: contenido, redes o publicidad.

Invertir el orden -empezar por redes con la ficha a medias- es la forma habitual
de gastar sin resultado.

## Proximidad

El radio real de captacion casi nunca coincide con el que cree el dueno. Se
delimita con datos: de donde vienen los clientes actuales. Anunciarse a 30 km de
un negocio al que la gente va andando es tirar el presupuesto.

## Estacionalidad

Muchos negocios locales tienen picos claros. El trabajo se planifica **contra el
pico**, con antelacion suficiente para que llegue. Un plan anual uniforme ignora
el unico patron fiable que tiene el negocio.

## Presupuesto pequeno

Con 150 EUR al mes no se hace de todo mal: se hace **una** cosa bien. Elegirla es
la decision principal, y se elige por el escalon del embudo que mas gente pierde.

## Lo que nunca se hace

- Recomendar canales que el cliente no puede sostener en el tiempo.
- Prometer resultados de un presupuesto que no da para salir de aprendizaje.
- Copiar la estrategia de una cadena a un negocio de un solo local.

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
