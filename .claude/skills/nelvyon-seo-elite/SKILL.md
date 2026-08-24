---
name: nelvyon-seo-elite
description: Estandar NELVYON de SEO tecnico, de contenido y local: que se puede prometer, que no, y como se verifica.
---
# nelvyon-seo-elite

SEO es hacer que la pagina **merezca** y **pueda** posicionar. Las dos cosas, en
ese orden.

## Lo que se puede prometer y lo que no

Se puede prometer: rastreabilidad, indexabilidad, velocidad, estructura, datos
estructurados validos, contenido que responde a la intencion real.

**No se puede prometer una posicion.** Quien la promete esta mintiendo o va a
hacer algo que a medio plazo le cuesta el dominio al cliente.

## Tecnico - el suelo

Antes que una palabra de contenido:

- La pagina se rastrea y se indexa. Comprobado, no supuesto.
- Una sola URL canonica por contenido. Los duplicados se resuelven, no se ignoran.
- `sitemap.xml` y `robots.txt` coherentes entre si.
- Datos estructurados **validos** y **veraces**: marcar como producto lo que no lo
  es, o inventar valoraciones, es motivo de penalizacion y ademas es mentir.
- Core Web Vitals dentro de umbral en movil, que es donde esta el trafico.

## Palabras clave

Se busca **intencion**, no volumen. Una consulta de 40 busquedas al mes con
intencion de compra vale mas que una de 4.000 informativa, para casi cualquier
negocio pequeno.

Cada termino se clasifica: informativa, comparativa, transaccional, de marca. Y
cada una necesita un tipo de pagina distinto. Poner una ficha de producto contra
una consulta informativa es perder la batalla antes de empezar.

## Contenido

Se agrupa en clusteres: una pagina pilar y las que la sostienen, enlazadas entre
si con texto ancla que describe el destino. Enlazado interno como sistema, no
como adorno.

## Local

Ficha de negocio completa y coherente con la web: nombre, direccion y telefono
identicos en todas partes. Las incoherencias de NAP son la causa mas comun de que
un negocio local no aparezca, y la mas aburrida de arreglar.

## QA de SEO

No esta listo sin: rastreo comprobado, canonicas revisadas, datos estructurados
validados, enlaces rotos a cero, y redirecciones sin cadenas.

## Lo que nunca se hace

- Inventar metricas de posicion o de volumen.
- Presentar una auditoria como una mejora conseguida. La auditoria es `PROPOSED`.
- Marcar datos estructurados que no correspondan a la realidad de la pagina.

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
