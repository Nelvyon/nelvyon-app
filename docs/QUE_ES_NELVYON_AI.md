# Que es NELVYON AI, tecnicamente

> Generado por `scripts/que-es-nelvyon-ai.mjs` el 2026-08-29.
> No se edita a mano: se regenera.

«Tenemos IA propia» es la frase mas facil de decir y la mas dificil de
sostener. Hay dos formas de equivocarse:

- **por arriba**, llamando «IA propia» a una pantalla que le pasa el texto
  del cliente a un proveedor ajeno;
- **por abajo**, haciendo como que existe inferencia real cuando no la hay.

Este documento no describe: **mide**. Y la capa de inferencia se declara con
su estado real, sea el que sea.

---

## Lo que hace a una IA «propia», y no es el modelo

Un modelo es un proveedor intercambiable. Lo que NO se puede cambiar de
proveedor es todo lo demas: **que sabe del cliente, quien decide que se hace,
hasta donde puede llegar solo, quien lo revisa y que se aprende de lo que
sale.**

Eso es lo que hay debajo, y es lo que se cuenta aqui.

---

## Lo que sabe de cada cliente

**54 dimensiones**

Un almacén de contexto con procedencia, confianza y caducidad por dato. No es un campo de texto libre: cada dimensión sabe de dónde salió —lo dijo el cliente, lo dedujo un agente, lo midió una herramienta— y cuándo deja de valer.

*Por que importa:* Es lo que permite a un agente distinguir lo que el cliente dijo de lo que otro agente supuso. Sin eso, una suposición acaba citada como hecho en un informe.

`backend/cerebro/dimensiones.ts`

## Quién decide qué

**25 operativos · 5 planeados**

Departamentos con responsabilidad, con lo que NO deciden y con los indicadores que los juzgan. Y `operativo` frente a `planeado`, con el motivo escrito.

*Por que importa:* Un organigrama donde no se distingue lo que existe de lo que se ha diseñado es cómo se acaba con veintitrés especialistas que nadie ha instanciado.

`backend/agentes/departamentos.ts`

## Quién hace el trabajo

**26 contratos · 26 agentes de servicio · 1605 sectoriales**

Contratos que declaran qué necesita saber cada agente, qué produce, qué NUNCA hace y cuándo escala. Más los agentes de servicio premium, con sus pasos encadenados, y los sectoriales.

*Por que importa:* Un agente sin contrato es un agente del que no se puede decir si se ha pasado de la raya, porque no había raya.

`backend/agentes/catalogo.ts`

## Hasta dónde puede llegar solo

**13 consecuencias con suelo declarado**

Seis niveles, de observar a exigir aprobación humana, y un suelo por CONSECUENCIA real de la acción: gastar dinero, publicar en nombre del cliente, tocar credenciales, ser irreversible.

*Por que importa:* Se comprueba con las consecuencias de la acción concreta, no con las que el agente declaró en su contrato: el mismo agente que redacta un correo puede estar a punto de enviarlo.

`backend/agentes/autonomia.ts`

## Cómo llega al mundo real

**19 denegaciones tipificadas**

Un puente entre el agente y el ejecutor con siete puertas: contrato, aprobación humana, coherencia de la declaración, calidad, ejecutor, gasto e idempotencia, y cierre del rastro.

*Por que importa:* Al otro lado hay dinero de un cliente y publicaciones con su cara. Ninguna puerta es opcional, y la de calidad va ANTES que la de gasto: una pieza que suspende no debe llegar a reservar presupuesto.

`backend/ejecucion/PuenteDeEjecucion.ts`

## Quién revisa lo que sale

**51 comprobaciones en 16 disciplinas**

Un evaluador independiente por disciplina. El agente que produce algo NO puede ser su juez: el motor lanza si el evaluador coincide con el autor.

*Por que importa:* Un agente que se evalúa a sí mismo aprueba lo que sabe hacer, y lo que no sabe hacer no lo detecta — no por mala fe, sino porque el mismo razonamiento que produjo el fallo lo revisa.

`backend/calidad/MotorDeCalidad.ts`

## Qué se aprende de lo que sale

**motor de resultados + inteligencia entre departamentos, con corte de bucles**

Objetivos con línea base, acciones, medidas y atribución. Y la inteligencia entre departamentos, que deja pasar un hallazgo de un departamento a otro con su evidencia y su confianza.

*Por que importa:* Una mejora sin línea base se puede atribuir a la temporada. Y un insight sin evidencia es una corazonada con formato de dato.

`backend/resultados/MotorDeResultados.ts`

---

## La capa de inferencia

Aqui es donde se puede mentir con mas facilidad, asi que aqui se es mas
explicito.

| | |
|---|---|
| Registro de proveedores | 2 adaptadores declarados |
| Declaracion de modo | `REAL` / `MOCK` resuelto en ejecucion |
| **Inferencia real hoy** | **UNAVAILABLE** |

**`UNAVAILABLE` no es un fallo: es la verdad.** No hay un modelo
conectado porque donde vive el modelo es una decision empresarial con coste
recurrente, y esa decision no la toma el codigo.

Lo que si esta construido y comprobado:

- La procedencia se registra siempre: que proveedor, que modelo, cuantos
  tokens, cuanto costo, cuantos reintentos.
- `RULE_ENGINE` es publicable; `MOCK` y `FALLBACK` **no**. Un generador determinista por diseno no es una
  degradacion; una simulacion si.
- El motor de calidad exige **proveedor configurado** para sellar `REAL`. Poner una variable de entorno no basta: eso sellaria
  aprobaciones que nadie ha dado.
- El dia que se conecte un modelo, la ultima medicion de produccion —14.178
  eventos con **cero** modelo real y **cero** tokens— pasara a tener numeros
  distintos de cero, y se vera.

---

## Lo que NELVYON AI **no** es

- **No es una envoltura de otro proveedor.** Las capas de arriba se quedan
  igual si manana se cambia de modelo; son lo que el modelo no aporta.
- **No es un chat.** Lo que hay es un sistema que recibe un encargo, decide
  que hacer, lo hace, lo revisa, lo ejecuta con permisos y lo mide.
- **No es autonoma sin limites.** Hay un suelo de autonomia por consecuencia,
  y publicar en nombre del cliente o gastar dinero exige que una persona diga
  que si.

---

## Lo que falta, dicho con claridad

| Que | Estado | Quien lo desbloquea |
|---|---|---|
| Modelo de inferencia conectado | `UNAVAILABLE` | decision empresarial (coste recurrente) |
| Resultado real para un cliente | `NOT_MEASURED` | hacen falta clientes y meses |
| Comparacion con otras herramientas | `NOT_MEASURED` | no se ha medido, y estimarlo seria inventar |

Todo lo demas de este documento esta construido y tiene pruebas que lo
demuestran.
