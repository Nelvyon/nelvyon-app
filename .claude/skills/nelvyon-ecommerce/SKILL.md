---
name: nelvyon-ecommerce
description: Estandar NELVYON de ecommerce: ficha de producto, carrito, recuperacion y retencion. El dinero se toca con cuidado.
---
# nelvyon-ecommerce

En ecommerce cada friccion tiene precio y se puede medir. Eso lo hace la
disciplina mas honesta del marketing, y la que menos tolera adivinar.

## Ficha de producto

Lo que decide la compra, por orden:

1. **Fotos** que respondan a lo que la persona necesita ver. Para ropa, como
   cae; para muebles, la escala; para comida, el tamano real de la racion.
2. **Precio y disponibilidad** visibles sin desplazarse.
3. **Envio**: cuanto cuesta y cuando llega. La sorpresa en el ultimo paso es la
   causa numero uno de carrito abandonado.
4. **Devoluciones**: en cuanto tiempo y quien paga.
5. **Resenas** del producto concreto, no de la tienda.

## Carrito y pago

- Cada campo que se quita sube la conversion. Cada campo que se anade la baja.
  No hay excepciones interesantes.
- Compra sin registro, siempre.
- El coste total aparece **antes** de pedir datos personales.
- Los errores de pago se explican en cristiano: "la tarjeta ha sido rechazada por
  tu banco" y no "error 402".

## Dinero

Los importes se calculan una vez y se guardan. Todo total que se muestra tiene
que poder recalcularse desde sus lineas y dar lo mismo. Un valor no finito en una
columna de importe se guarda sin error en PostgreSQL y corrompe la factura en
silencio: se rechaza en el calculo, no en la base.

## Recuperacion de carrito

Tres correos como maximo: recordar, resolver la duda, y solo entonces incentivar.
Empezar por el descuento ensena a la gente a abandonar el carrito.

## Retencion

Cuesta menos que captar y casi nadie lo trabaja. El segundo pedido se gana con la
experiencia del primero: seguimiento del envio, uso del producto, y recompra en
el momento en que se acaba.

## Lo que nunca se hace

- Inventar existencias, plazos de entrega o valoraciones.
- Mostrar un descuento sobre un precio que nunca se cobro.
- Dar un pedido por confirmado sin identificador de la pasarela.

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
