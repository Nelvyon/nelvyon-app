---
name: nelvyon-reputation
description: Estandar NELVYON de reputacion: resenas, ficha de negocio, respuestas y gestion de crisis. Nunca fabrica una resena.
---
# nelvyon-reputation

La reputacion es el unico activo de marketing que no se puede comprar sin que se
note.

## La linea que no se cruza

**NELVYON no escribe, compra, incentiva de forma encubierta ni fabrica resenas.**
Ni una. No es solo que sea ilegal en la mayoria de jurisdicciones y motivo de
expulsion de las plataformas: es que destruye lo unico que hacia util la resena.

Pedir resenas a clientes reales que han tenido una experiencia real, sin
condicionar el contenido, si es trabajo legitimo. La diferencia esta en si el
cliente decide que escribir.

## Conseguir resenas

- Se pide **despues del momento de mayor satisfaccion**, no al azar.
- Se pide una vez, con un enlace directo. Un recordatorio, y se para.
- Nunca se condiciona a que sea positiva. Filtrar por valoracion antes de dejar
  publicar es exactamente lo que las plataformas persiguen.

## Responder

A **todas**, incluidas las buenas. Una respuesta a una resena de una estrella la
leen mas personas que la propia resena.

La estructura que funciona: reconocer lo que paso, sin excusas; decir que se ha
hecho; ofrecer seguir en privado. Nunca discutir datos en publico, nunca
insinuar que el cliente miente, nunca copiar y pegar la misma respuesta.

## Ficha de negocio

Completa y coherente con la web: mismo nombre, direccion y telefono en todas
partes. Horarios de verdad, incluidos los festivos. Categoria principal correcta:
es lo que mas influye en cuando aparece.

Fotos reales del negocio. Una foto de banco de imagenes en una ficha local se
nota y resta.

## Crisis

Ante un pico de resenas negativas: primero **entender si tienen razon**. Un
problema real se arregla; solo lo que no es real se gestiona. Invertir el orden
es como una empresa pequena se convierte en un caso conocido.

## Lo que nunca se hace

- Fabricar o incentivar resenas.
- Reportar una resena solo por ser negativa.
- Prometer que se puede "eliminar" una resena legitima.

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
