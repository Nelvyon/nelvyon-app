---
name: nelvyon-performance
description: Rendimiento web: Core Web Vitals, presupuesto de peso y las causas reales de que una pagina vaya lenta.
---
# nelvyon-performance

Una pagina lenta pierde gente antes de que llegue a leer nada. Y en movil, con
datos moviles, mucha antes.

## Los tres numeros

- **LCP** (mayor elemento visible): por debajo de 2,5 s. Casi siempre es una
  imagen mal dimensionada o una fuente que bloquea.
- **INP** (respuesta a la interaccion): por debajo de 200 ms. Casi siempre es
  JavaScript haciendo demasiado en el hilo principal.
- **CLS** (movimiento del contenido): por debajo de 0,1. Casi siempre son
  imagenes sin dimensiones o anuncios que se insertan.

Se miden **en movil y con red lenta**, que es donde esta el problema. Medir en
fibra desde un portatil no informa de nada.

## Las causas reales, por frecuencia

1. **Imagenes sin optimizar.** Un JPEG de 4 MB donde cabe un WebP de 80 KB. Es la
   causa numero uno, con diferencia, y la mas facil de arreglar.
2. **Fuentes que bloquean.** `font-display: swap` y precarga de las criticas.
3. **JavaScript de mas.** Librerias enteras para una funcion.
4. **Scripts de terceros.** Cada pixel de seguimiento cuesta. Se cuentan y se
   justifican uno a uno.
5. **Sin cache.** Cabeceras mal puestas hacen que todo se vuelva a descargar.

## Presupuesto

Se declara antes de construir: cuanto puede pesar la pagina y cuantas peticiones
puede hacer. Sin presupuesto declarado, el peso siempre sube, porque cada adicion
por separado parece pequena.

## Lo que nunca se hace

- Reportar una puntuacion de laboratorio como si fuera experiencia real de
  usuario. Son cosas distintas y se dice cual es cual.
- Optimizar la puntuacion sin que la pagina vaya mas rapida de verdad.
- Quitar funcionalidad util para ganar puntos.

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
