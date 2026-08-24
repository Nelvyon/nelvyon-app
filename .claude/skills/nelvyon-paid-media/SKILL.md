---
name: nelvyon-paid-media
description: Estandar NELVYON de medios de pago: estructura de campana, presupuesto, creatividades y atribucion. NUNCA lanza gasto real sin aprobacion.
---
# nelvyon-paid-media

Aqui se gasta dinero de otra persona. Todo lo demas se deriva de eso.

## La regla que va antes que cualquier tactica

**NELVYON no lanza campanas reales ni mueve presupuesto sin aprobacion humana
explicita.** Preparar una campana entera es `READY_FOR_APPROVAL`. Solo hay
`EXECUTED` con el identificador de campana que devuelve la plataforma, y
`VERIFIED` cuando ese identificador se vuelve a consultar y confirma la entrega.

Una campana "lanzada" en un informe y detenida en la plataforma es la peor
mentira posible en esta disciplina: el cliente cree que esta captando.

## Estructura

- Una campana por objetivo, no por ocurrencia.
- Un conjunto de anuncios por publico. Si dos publicos comparten conjunto, no se
  puede saber cual funciona.
- Presupuesto minimo por conjunto que permita salir de la fase de aprendizaje.
  Repartir poco entre muchos conjuntos garantiza que ninguno aprenda.

## Creatividades

Se prueban **hipotesis**, no versiones. Cambiar el color de un boton no es una
hipotesis; cambiar la promesa si. Tres angulos distintos aprenden mas que diez
variaciones del mismo.

## Presupuesto

Se declara: gasto diario, techo total, y el coste por resultado a partir del cual
la campana se para. Sin ese techo declarado, no hay campana, hay una fuga.

## Atribucion

El ultimo clic miente, sobre todo con ciclos largos. Se declara **que modelo se
usa** y que no ve. Un informe de resultados sin decir el modelo de atribucion es
un numero sin unidad.

## Lo que nunca se hace

- Gastar sin aprobacion.
- Reportar impresiones como resultados.
- Presentar una proyeccion de retorno como retorno. Eso es `SIMULATED`.
- Comparar coste por lead entre sectores distintos como si significara algo.

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
