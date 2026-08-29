# Lo que se puede afirmar de NELVYON, y lo que no

> Generado por `scripts/lo-que-se-puede-afirmar.mjs` el 2026-08-29.
> No se edita a mano: se regenera.

Hay dos preguntas que suenan parecidas y no lo son. Mezclarlas es cómo un equipo
acaba creyéndose su propia presentación.

| | Pregunta | Cómo se contesta |
|---|---|---|
| **Capacidad** | ¿existe esto, y funciona? | mirando el árbol y ejecutándolo |
| **Resultado** | ¿le va mejor a un cliente? | con clientes, meses y comparación |

**Tener una capacidad no es producir un resultado.** Producción tiene 14.178
eventos de agente que decían `ok: true` sobre trabajo que ninguna IA había
hecho: la capacidad de registrar existía y funcionaba, y el resultado era cero.

---

## 1 · Capacidad — medido

### Agentes sectoriales distintos entre sí

**1521 de 1521 medidos**

ejecutados los 1.605 con la misma entrada y un modelo que sólo escucha; 0 parejas equivalentes

### Departamentos con responsabilidad y dueño

**sí**

backend/agentes/departamentos.ts, con estado operativo/planeado y motivo

### Migraciones aplicables desde cero

**485 migraciones**

esquema reconstruido desde cero contra PostgreSQL real

### Deuda de la migración 507 clasificada

**55 sentencias, 1 sin clasificar**

medido contra el esquema final y el código vivo; defectos confirmados a mano

### Tablas multiinquilino sin índice por inquilino

**0**

consultado el catálogo de PostgreSQL, no una lista a mano

### El árbol compila y es desplegable

**sí**

scripts/puerta-de-build.mjs ejecuta un `next build` real, no un typecheck


### Pruebas que pasan

**8142 pruebas pasan** y **0 fallan**, ejecutadas ahora mismo.

El número sale de ejecutar la suite, no de contar ficheros de prueba. Un
fichero de prueba que nadie ejecuta no prueba nada.

---

## 2 · Resultado — lo que hoy NO se puede afirmar

### ¿Le va mejor a un cliente con NELVYON que sin NELVYON?

**NO_MEDIDO**

clientes reales operando meses, con línea base antes de empezar y un grupo de comparación. Sin línea base, cualquier mejora se puede atribuir a la temporada.

### ¿Le va mejor que con otra agencia o herramienta?

**NO_MEDIDO**

el mismo cliente, el mismo periodo y las dos alternativas. No existe, y estimarlo sería inventar en la dirección que nos conviene.

### ¿Cuánto trabajo hace la IA de verdad?

**NO_MEDIDO**

un modelo real conectado. Hoy la última medición de producción da 14.178 eventos de agente con CERO modelo real y CERO tokens. La capacidad de registrar procedencia existe y funciona; lo que no hay es procedencia real que registrar.

### ¿Cuánto tarda un cliente en recibir su primer entregable?

**NO_MEDIDO**

clientes que completen el ciclo. El cuadro de mando ya calcula la mediana y hoy devuelve DESCONOCIDO, que es lo correcto.

### ¿Aguanta el volumen de producción?

**PARCIAL**

medido en una tabla desechable de 200.000 filas: el índice por inquilino cambia una consulta de 9,88 ms a 0,14 ms. Eso dice que la estructura es correcta, NO que el sistema entero aguante carga real.


---

## 3 · Qué NO hay en este documento

**Ninguna comparación con un competidor por su nombre.** Afirmar qué hace o deja
de hacer un producto ajeno sin haberlo medido es inventar, y encima en la
dirección que nos conviene.

**Ninguna afirmación de superioridad.** Ni «el mejor», ni «world-class», ni
«líder». Lo que hay arriba es lo que se ha medido; lo que falta abajo es lo que
haría falta para poder decir algo más.

**Ningún número redondeado hacia arriba.** `NO_MEDIDO` aparece cinco veces en
este documento. Cada una de esas cinco es una afirmación que otro equipo habría
hecho igualmente.

---

## 4 · Lo que sí se puede decir hoy, sin exagerar

- El sistema **compila y es desplegable**, comprobado con un `next build` real.
- El esquema **se reconstruye desde cero** contra PostgreSQL de verdad.
- Ninguna acción con consecuencias hacia fuera **pasa sin cruzar siete puertas**:
  contrato del agente, aprobación humana, calidad, ejecutor, gasto,
  idempotencia y cierre del rastro.
- **Nadie evalúa su propio trabajo**: el motor de calidad lo impide
  estructuralmente, no por convención.
- **Una evaluación de reglas nunca se presenta como de modelo.**
- Los **agentes sectoriales son distintos entre sí**, medido por salida y no
  supuesto por su código fuente.

Todo eso es capacidad. El resultado está sin medir, y decirlo es parte del
trabajo.
