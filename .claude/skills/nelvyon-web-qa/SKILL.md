---
name: nelvyon-web-qa
description: QA de web: revision funcional, responsive y de estados antes de entregar. Lo que se comprueba de verdad, no lo que se mira por encima.
---
# nelvyon-web-qa

Se revisa **la web publicada**, no la captura ni el codigo. Un entregable que
solo se ha visto en el editor no se ha visto.

## Funcional

- Cada enlace lleva a algun sitio. Los enlaces a `#` y a `about:blank` son bugs.
- Cada boton hace algo, o no es un boton.
- Cada formulario **envia y llega**. Comprobado del otro lado, no solo por el
  mensaje de exito: un formulario que dice "gracias" y no manda nada es
  exactamente la clase de mentira que este proyecto persigue.
- Los estados vacio, de carga y de error existen y estan disenados.

## Responsive

- Se prueba en el ancho real mas pequeno del publico, no en el breakpoint comodo.
- **Ningun scroll horizontal en el cuerpo.** Se comprueba, no se supone.
- Las tablas, los diagramas y los bloques de codigo tienen su propio contenedor
  con `overflow-x: auto`.
- Los objetivos tactiles se pueden pulsar con un pulgar.

## Contenido

- Sin texto de relleno. Ni uno.
- Las imagenes cargan y tienen texto alternativo con sentido.
- Los metadatos -titulo, descripcion, imagen social- existen y describen la
  pagina real.

## Rendimiento y accesibilidad

Se delega en `nelvyon-performance` y `nelvyon-accessibility`, y **sus resultados
son bloqueantes**: una web que no pasa esas dos no se entrega, se corrige.

## Navegadores

Uno basado en Chromium, uno Firefox, uno WebKit. WebKit es el que rompe, y es el
de los iPhone.

## Lo que nunca se hace

- Dar por buena una pagina por como se ve en el portatil de quien la hizo.
- Aceptar "en mi maquina funciona" como resultado de QA.
- Entregar con errores en la consola sin haberlos mirado.

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
