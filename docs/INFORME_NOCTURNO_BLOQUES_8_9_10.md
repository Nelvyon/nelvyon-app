# Informe de la ejecución nocturna · Bloques 8, 9 y 10

Punto de partida: Bloque 7 cerrado en `c33b9939`.
Los tres bloques se cerraron encadenados, sin parar entre ellos.

---

## SHAs certificados

| Bloque | SHA | Qué certifica |
|---|---|---|
| 4 | `cf43aeda` | operación real *(heredado, verificado intacto)* |
| 5 | `9a3841bc` | producto medido *(heredado)* |
| 6 | `5352db46` | autonomía y resiliencia *(heredado)* |
| 7 | `c33b9939` | seguridad ofensiva *(heredado)* |
| **8** | **`efb27997`** | rendimiento, carga y concurrencia |
| **9** | **`87304e68`** | operación, observabilidad y recuperación |
| **10** | **`53763685`** | certificación integral final |

---

## Defectos encontrados y corregidos

### Bloque 8

**El pool no tenía plazo para la consulta que ya tiene la conexión.**
Medido: con el pool a dos y dos consultas de dos segundos, una consulta trivial
esperó **1 803 ms**. `connectionTimeoutMillis` acota cuánto *esperas*, no cuánto
*retienes*. Faltaba también el plazo silencioso: una transacción abierta que
nadie cierra retiene sus bloqueos sin salir en ninguna gráfica y deja colgado el
`ALTER TABLE` de la siguiente migración.
→ `statement_timeout` = 30 s, `idle_in_transaction_session_timeout` = 60 s.
Medido después: consulta de 10 s **cortada en 409 ms**, conexión usable.

**Un listado sin cota crecía con el cliente.**
Medido: 5 000 inscripciones → **5 000 filas y 1 821 KiB** en una respuesta.
→ Cota en SQL y **después** de ordenar. Medido: **500 filas, 182 KiB, 15 ms**.

### Bloque 9

**El esquema que corre no era el declarado.**
Un detector nuevo reconstruye desde las 475 migraciones y compara. Encontró **21
diferencias**: 8 columnas y 13 políticas RLS que las migraciones declaran y la
base no tenía. Aplicando las migraciones bajaron a 4 — y esas cuatro **no bajan
nunca** (§ decisiones).

**La restauración certificaba un marcador, no el producto.**
El simulacro existente sembraba una fila y comprobaba que sobreviviera. Un
marcador sobrevive a casi cualquier restauración rota.
→ Certificación nueva: suma del contenido, **714** tablas / **1 334**
restricciones / **2 302** índices / **2 108** políticas, la clave foránea sigue
**restringiendo**, y la **aplicación** consulta la base restaurada. 16/16.

**Runbooks con comandos inexistentes.**
Uno real corregido. Y **cinco falsos positivos de mi propio detector**, que
resolvía todas las rutas contra `RAIZ/scripts/` y daba por rotas tres que existen
en `backend/scripts/` y `apps/web/scripts/`.

### Bloque 10

**Un retroceso literal (0x08) cegaba una regla mía.** Mi patrón terminaba en un
carácter de control en vez de `\b`, así que **no casaba nunca**. Lo cazó un
guardián del Bloque 5. Al corregirlo, una justificación pasó a sobrar y el otro
guardián también lo dijo.

**Captura de `process.env` al cargar el fichero** en vez de dentro del hook.

**Falso positivo del guardián de rutas**: tomaba un fichero `__tests__` por una
ruta. Next no enruta segmentos que empiezan por `_`.

**El trinquete de RLS exigía apretarse**: la deuda bajó de 4 tablas a 2 y el
trinquete obliga a registrar las bajadas. Apretado.

**Un control positivo intermitente.** En una de cuatro ejecuciones completas,
tres controles fallaron. Causa: el reinicio del singleton de `AuthService` se
hacía por la ruta relativa mientras el código usa `@nelvyon/auth` — dos
especificadores, potencialmente dos instancias, y el control pasaba o fallaba
según qué fichero cargara antes. Unificado. Dos ejecuciones posteriores:
idénticas.

**Y una regresión del Bloque 7** que su propia puerta no vio, porque se corrió
sobre las zonas tocadas y no sobre el árbol entero.

---

## Mediciones

| Qué | Antes | Después |
|---|---|---|
| Consulta trivial con el pool ocupado | 1 803 ms de espera | acotada por `statement_timeout` |
| Consulta desbocada de 10 s | corría entera | **cortada en 409 ms** |
| `listEnrollments` con 5 000 inscripciones | 5 000 filas · 1 821 KiB · 33 ms | **500 filas · 182 KiB · 15 ms** |
| Contexto de inquilino | — | **×1,7** en p50 (cuatro viajes en vez de uno) |
| Pool a 2 con 20 simultáneas | — | p50 17 ms, ninguna perdida ni mezclada |
| Ráfaga de 120 sobre pool de 8 | — | 24 ms, la p95 vuelve **igual** |
| 30 reclamaciones simultáneas de la misma clave | — | **exactamente 1 gana** |
| Límite de uso, 1 000 llamadas | — | exactamente 60 permitidas |
| PostgreSQL parado y arrancado | — | vuelve **solo en 536 ms**, sin perder nada |
| Reconstrucción desde cero | — | 475 migraciones, **7 s**, 0 fallos |
| Colisión de workspace (1 000 inquilinos) | — | **42,6 %** de probabilidad |

---

## Mutaciones e inyecciones de fallo

**56 aplicadas en los tres bloques. 50 caen.** Las que no, registradas con su
motivo:

- **M8** (Bloque 8): infiel *por construcción*. Sin `await` entre leer y
  escribir, la secuencia es atómica en un runtime de un solo hilo — la mutación
  cambia la forma del código y no su comportamiento.
- **M25 / M26** (Bloque 7, revisadas): una mutaba una rama muerta, la otra no
  cambia nada observable.
- **M16** (Bloque 7): no cae y es correcto — con la lista blanca estricta, la
  comprobación de contención es inalcanzable. **No se forzó que cayera.**

Y dos que **no cayeron al principio y enseñaron algo**:

- **M5**: la prueba certificaba una coincidencia del almacenamiento, no el
  `ORDER BY`. Se barajó la siembra y entonces cayó.
- **M32**: tres negativos verdes interrogaban a un doble en vez de a PostgreSQL.
  De ahí salió una suite contra la base real, donde la misma mutación tumba tres.

Inyecciones de fallo reales, no simuladas: contenedor de PostgreSQL **parado y
arrancado**, restauración con `--schema-only` y `--data-only`, base inexistente
para las sondas.

---

## Puertas finales

| Puerta | Resultado |
|---|---|
| Árbol limpio antes y después | ✔ 0 ficheros sin commitear |
| Web completa | **8 196 verdes · 0 fallos · 7 saltos** (×2, idéntico) |
| Python completa + PostgreSQL real | **3 735 verdes · 0 fallos · 13 saltos** |
| Inventarios derivados | 925 / 1 367 / 655 · **0 huérfanos** en los tres |
| Guardianes acumulados 1–10 | dentro de la suite Python |
| Suite ofensiva (Bloque 7) | dentro de la web |
| Carga y concurrencia (Bloque 8) | dentro de la web |
| Recuperación **a solas** | 4/4, vuelta sola en 536 ms |
| Restauración certificada | 16/16, y **falla** con fallo inyectado |
| Deriva de esquema | 4 diferencias, todas del hallazgo registrado |
| E2E con dos inquilinos | 14/14 |
| UX / WCAG | 362 pantallas, reglas medibles |
| Auditoría de saltos | **de 96 a 7**, los siete clasificados |
| Puerta de pre-despliegue | 15 automáticas OK · 4 config · 8 decisiones · 6 externas |
| Tipos | 11 errores, **todos previos**, 0 en ficheros nuevos |

---

## Coste y alcance

- **Producción: intacta.** Ni una petición.
- **Coste externo: 0 €.** Ningún proveedor de pago, ningún correo, ningún OAuth,
  ningún webhook externo.
- **Decisiones humanas resueltas: ninguna.** Las siete que aislaste siguen
  aisladas, y hay una nueva.
