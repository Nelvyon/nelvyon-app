---
name: nelvyon-web-elite
description: Estandar NELVYON para web y producto: arquitectura de componentes, sistema de diseno, responsive, y el criterio de cuando una pagina esta terminada.
---
# nelvyon-web-elite

El estandar de NELVYON para construir web que **convierte y se puede mantener**,
no web que se ve bien en la primera captura.

## La pregunta que ordena todo

Antes de una sola linea: **que tiene que pasar en esta pagina para que el negocio
gane algo?** Si no hay respuesta en una frase, la pagina no esta lista para
disenarse, esta lista para una conversacion.

## Arquitectura de componentes

- Un componente hace **una** cosa. Si su nombre lleva "y", son dos.
- El estado vive lo mas cerca posible de donde se usa, y lo mas arriba posible de
  donde se comparte. Ese equilibrio se decide, no se hereda.
- Los datos bajan, los eventos suben. Un componente que va a buscar sus propios
  datos a mitad del arbol es un componente que nadie puede reutilizar ni probar.
- Nada de `any` para salir del paso: un tipo mal puesto es una mentira que el
  compilador repetira durante meses.

## Sistema de diseno

Tokens antes que valores. Un `#2b6cb0` suelto en un componente es una decision
que nadie podra revisar. Espaciado, tipografia, color y radios salen de la
escala; lo que no sale de la escala se justifica en el propio codigo.

## Responsive

- Unidades relativas, `max-width: 100%` en medios, y contenido ancho -tablas,
  diagramas, bloques de codigo- con su propio `overflow-x: auto`.
- **El cuerpo de la pagina nunca hace scroll horizontal.** Es el fallo que mas se
  ve en movil y el que menos se mira en el portatil de quien lo construyo.
- Se comprueba en el ancho real mas pequeno del publico del cliente, no en el
  breakpoint mas comodo.

## Cuando esta terminada

1. Cumple el objetivo de negocio declarado arriba.
2. Pasa `nelvyon-accessibility` y `nelvyon-performance`.
3. Funciona sin JavaScript para lo esencial, o degrada de forma honesta.
4. Los estados vacio, de carga y de error existen y estan disenados. Un error
   generico es una pagina a medio hacer.
5. Nada de texto de relleno. Ni un `lorem`, ni un "Titulo aqui".

## Lo que descalifica un entregable

- Enlaces a ninguna parte, botones que no hacen nada, formularios que no envian.
- Datos de ejemplo presentados como datos del cliente.
- Capturas de un diseno presentadas como una web publicada.

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
su sector. Si este documento nombrara un tipo de negocio concreto como caso por
defecto, estaria cableando un nicho. Los ejemplos son ejemplos.
