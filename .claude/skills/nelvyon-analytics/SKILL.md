---
name: nelvyon-analytics
description: Estandar NELVYON de analitica: que se mide, que no significa nada, y como se detecta que un dato esta roto antes de reportarlo.
---
# nelvyon-analytics

Medir mal es peor que no medir: da confianza sin informacion, y las decisiones se
toman igual.

## Antes de medir: que decision depende de esto

Una metrica que no cambia ninguna decision no se reporta. Los paneles llenos de
numeros que nadie mira son el sintoma mas comun de analitica sin proposito.

## Metricas que casi nunca significan nada solas

- **Visitas**: sin origen ni intencion, es ruido.
- **Impresiones**: mide lo que se compro, no lo que paso.
- **Seguidores**: no correlaciona con ingresos en casi ningun negocio pequeno.
- **Tasa de rebote**: mal definida en la mayoria de implementaciones.
- **Tiempo en pagina**: lo infla la pestana olvidada.

## Metricas que si

Las que se pueden atar a dinero o a una decision: coste por cliente captado,
valor a lo largo de la vida, conversion por escalon del embudo, y repeticion.

## Antes de reportar: comprobar que el dato no esta roto

Se mira, siempre:

- **Saltos imposibles**: un dia a cero o un pico de 10x suele ser medicion, no
  negocio.
- **Duplicacion de etiquetas**: infla conversiones y nadie lo nota durante meses.
- **Trafico interno** sin excluir.
- **Bots** en formularios.
- **Periodos incompletos** comparados con periodos completos.

Reportar un pico sin comprobar la instrumentacion es como se construyen las
decisiones caras equivocadas.

## Atribucion

Se declara **el modelo** y lo que no ve. Ultimo clic con ciclo de compra largo
atribuye a la marca lo que consiguio el contenido. Un informe sin decir el modelo
es un numero sin unidad.

## Anomalias

Una anomalia se **investiga** antes de explicarse. La explicacion que suena bien
llega antes que la verdadera casi siempre.

## Lo que nunca se hace

- Inventar cifras, tendencias o comparativas de sector.
- Presentar una proyeccion como un dato historico.
- Reportar una metrica cuya instrumentacion no se ha comprobado. Eso es
  `SIMULATED`, no `VERIFIED`.

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
