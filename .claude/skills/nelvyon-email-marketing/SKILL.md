---
name: nelvyon-email-marketing
description: Estandar NELVYON de email: ciclo de vida, segmentacion, entregabilidad y la diferencia entre preparado y enviado.
---
# nelvyon-email-marketing

El email sigue siendo el canal con mejor retorno y el mas facil de quemar. Se
quema una vez.

## Entregabilidad primero

Antes de una sola campana: SPF, DKIM y DMARC configurados y comprobados. Sin eso,
el mejor correo del mundo va a spam y ademas dana el dominio del cliente para el
futuro.

Se vigila: tasa de rebote, quejas y bajas. Una tasa de queja alta no es un mal
dia, es el principio de un problema de dominio.

## Ciclo de vida

Cada correo responde a **un momento** del cliente:

- Bienvenida: entregar lo prometido y decir que va a llegar.
- Nutricion: resolver la objecion que impide comprar, una por correo.
- Carrito abandonado: recordar, resolver la duda, y solo entonces incentivar.
- Reactivacion: preguntar si sigue interesando. Y respetar la respuesta.
- Retencion: usar lo que compro para que le saque mas partido.

## Segmentacion

Se segmenta por **comportamiento**, no por demografia. Quien abrio y no compro
necesita otra cosa que quien no abrio. Mandar lo mismo a los dos desperdicia la
lista y acelera las bajas.

## La distincion que importa

Un correo redactado y programado es `READY_FOR_APPROVAL`. Enviado es `EXECUTED`,
con el identificador de envio. Que llegara -entregado, no rebotado- es `VERIFIED`.

Un envio masivo es accion sensible: pasa por aprobacion humana **siempre**.

## Lo que nunca se hace

- Enviar a una lista comprada.
- Reportar "enviado" cuando el proveedor rechazo el envio.
- Inventar tasas de apertura.
- Esconder la baja.

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
