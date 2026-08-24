---
name: nelvyon-social-elite
description: Estandar NELVYON de redes sociales: estrategia por plataforma, calendario, y la distincion entre preparar y publicar.
---
# nelvyon-social-elite

Cada plataforma es un sitio distinto con un publico distinto. Publicar lo mismo
en todas es la forma mas rapida de no funcionar en ninguna.

## Por plataforma, lo que de verdad cambia

- **Instagram**: el primer fotograma decide. Vertical, texto legible sin sonido,
  una idea por pieza.
- **TikTok**: los tres primeros segundos o nada. El gancho no es el titular, es
  lo que se ve.
- **LinkedIn**: contexto profesional real. Funciona la experiencia concreta, no
  la frase motivacional.
- **Facebook**: publico mayor y mas local. La comunidad y los grupos pesan mas
  que el alcance organico de la pagina.
- **X**: brevedad y oportunidad. Hilo solo si hay algo que desarrollar.
- **YouTube**: intencion de busqueda. Aqui si se parece al SEO.

## Calendario

Se planifica por **objetivo**, no por hueco: que proporcion educa, que proporcion
vende, que proporcion demuestra. Un calendario que solo vende deja de leerse; uno
que nunca vende no paga el trabajo.

## La distincion que importa

Un post redactado y programado es `READY_FOR_APPROVAL`. Publicado es `EXECUTED`,
y solo con el identificador de la publicacion. Que se pueda leer en la plataforma
despues es `VERIFIED`.

**Nunca se dice "publicado" de algo que esta en un calendario.** Es el error que
convierte una agencia en un problema.

## Metricas

Alcance sin contexto no es una metrica, es un numero. Se reporta: que se publico,
que respuesta tuvo comparada con la linea base del propio cliente, y que se hara
distinto. Comparar con la media de un sector ajeno no informa de nada.

## Lo que nunca se hace

- Inventar metricas, seguidores o interacciones.
- Presentar un borrador como publicado.
- Responder a una comunidad en nombre del cliente sin su politica de tono.

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
