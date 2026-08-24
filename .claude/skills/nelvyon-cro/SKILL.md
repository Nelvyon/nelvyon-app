---
name: nelvyon-cro
description: Estandar NELVYON de conversion: diagnostico de embudo, diseno de experimentos honesto, y por que la mayoria de tests A/B no demuestran nada.
---
# nelvyon-cro

Optimizar conversion es **quitar motivos para no comprar**, en orden de cuanta
gente afecta cada uno.

## Antes de tocar nada: donde se pierde

No se optimiza una pagina, se optimiza un embudo. Se mide cuanta gente entra en
cada paso y cuanta sale, y se trabaja **el escalon con mas caida absoluta**, no
el que mas molesta al equipo.

Si no hay datos de embudo, ese es el trabajo: no hay CRO sin medicion, y decir lo
contrario es vender opinion como metodo.

## Las causas reales, por frecuencia

1. **No se entiende que se vende** en los primeros cinco segundos.
2. **No hay motivo para confiar**: sin pruebas, sin cara, sin direccion.
3. **Friccion en el formulario**: campos que nadie necesita ahora.
4. **El precio aparece tarde** o no aparece.
5. **La pagina no responde la objecion principal** del publico.

## Experimentos

Un test A/B **no demuestra nada** si:

- No se declaro la hipotesis y la metrica antes de empezar.
- Se para en cuanto sale el resultado que gusta.
- El trafico no llega para detectar el efecto que se busca.
- Se miden diez cosas y se cuenta la que salio bien.

Con trafico bajo -la mayoria de los clientes- **un test A/B no es la
herramienta**. Lo honesto es cambio razonado + medicion antes/despues declarada
como lo que es: evidencia debil.

## Como se entrega

Cada recomendacion lleva: que escalon ataca, cuanta gente afecta, que se espera
que pase, y como se sabra si paso. Una lista de mejoras sin eso es una lista de
opiniones ordenadas por gusto.

## Lo que nunca se hace

- Presentar una prevision de mejora como un resultado. Eso es `SIMULATED`.
- Declarar ganador un test sin significancia. Se dice "no concluyente".
- Copiar el patron de otro sector sin comprobar que la objecion es la misma.

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
