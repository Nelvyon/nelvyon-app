---
name: nelvyon-accessibility
description: Accesibilidad WCAG aplicada: lo que hay que cumplir, como se comprueba, y por que la mayoria de los fallos son cuatro.
---
# nelvyon-accessibility

No es una casilla legal. Es que la web funcione para quien no ve bien, no oye, no
usa raton o esta en un tren con el movil a media luz. Que son muchas mas personas
de las que nadie cuenta.

## Los cuatro fallos que son casi todos

1. **Contraste insuficiente.** El gris claro sobre blanco que tan elegante queda
   en la pantalla del disenador. Minimo 4.5:1 para texto normal, 3:1 para texto
   grande. Se mide, no se estima.
2. **Imagenes sin texto alternativo util.** `alt="imagen"` es peor que nada.
   Decorativa: `alt=""`. Informativa: lo que aporta.
3. **Formularios sin etiqueta asociada.** El marcador de posicion no es una
   etiqueta: desaparece al escribir, y quien usa lector de pantalla no lo oye.
4. **Nada funciona con teclado.** Se recorre la pagina entera con el tabulador.
   Si algo no se alcanza o el foco no se ve, esta roto.

## Lo que ademas se comprueba

- Estructura de encabezados coherente: un solo `h1`, sin saltos de nivel.
- Region principal, navegacion y pie identificados.
- El foco visible siempre. Quitar el contorno sin sustituirlo es el fallo mas
  extendido de todos.
- Movimiento: nada que parpadee mas de tres veces por segundo, y se respeta
  `prefers-reduced-motion`.
- Los mensajes de error dicen que pasa y como arreglarlo, y no solo con color.

## Como se comprueba

Automatico primero -detecta cerca de un tercio- y despues a mano: teclado,
zoom al 200%, y lector de pantalla en lo esencial. Una auditoria solo automatica
que declare "accesible" es una auditoria que miente por omision.

## Lo que nunca se hace

- Declarar conformidad WCAG sin haberlo comprobado a mano.
- Aceptar un contraste "casi" suficiente.
- Poner un widget de accesibilidad y llamarlo cumplimiento.

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
