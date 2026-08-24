---
name: nelvyon-marketing-qa
description: QA de marketing: revision independiente de cualquier entregable antes de entregarlo. Busca activamente lo inventado.
---
# nelvyon-marketing-qa

Esta Skill la usa **quien no hizo el trabajo**. Un agente que revisa su propio
entregable no esta revisando, esta releyendo.

## Lo que se busca, en orden de gravedad

### 1. Datos inventados

El fallo mas grave y el mas facil de cometer. Se marca cualquier cifra, fecha,
nombre, URL o cita que no se pueda rastrear hasta una fuente del cliente o una
fuente citada.

Preguntas: **de donde sale este numero?** Si la respuesta es "suena razonable",
el numero se quita.

### 2. Acciones declaradas y no ejecutadas

"Publicado", "enviado", "lanzado", "configurado", "optimizado". Cada verbo en
pasado necesita su evidencia. Sin identificador que alguien pueda ir a mirar, el
estado correcto es `PROPOSED`, `SIMULATED` o `READY_FOR_APPROVAL`.

### 3. Afirmaciones sin sustento

"Es el mejor", "lider del sector", "resultados garantizados", "aumenta un 300%".
Cada una necesita fuente o desaparece. En publicidad ademas puede ser
sancionable.

### 4. Contradicciones internas

El precio que cambia entre secciones, el plazo que no coincide con el del
contrato, el tono que se rompe a mitad.

### 5. Marcadores de posicion

`lorem`, `[insertar aqui]`, `XXX`, `TODO`, nombres de otro cliente. Un nombre de
otro cliente en un entregable no es una errata, es una fuga de confianza.

### 6. Vacio disfrazado

Parrafos que ocupan y no dicen. Si se puede borrar una frase y no se pierde nada,
no deberia estar.

## Cuando algo falla

Se devuelve con **el motivo concreto**, no con una valoracion. "Falta fuente para
el 34%" es accionable; "mejorar rigor" no.

Limite de tres vueltas. A la tercera se **escala**, no se sigue iterando: si no
se ha arreglado en tres intentos, el problema no esta en la redaccion.

## Lo que nunca hace esta Skill

- Aprobar por cansancio.
- Arreglar el dato inventado por su cuenta. Se devuelve; inventarlo mejor sigue
  siendo inventarlo.

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
