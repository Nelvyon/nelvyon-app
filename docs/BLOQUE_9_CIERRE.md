# BLOQUE 9 — OPERACIÓN, OBSERVABILIDAD, BACKUP/RESTORE Y RECUPERACIÓN

**Lo que se pedía:** demostrar que NELVYON puede **operarse y recuperarse**, no
solamente ejecutarse. Y una propiedad por encima de todas: **una señal verde
tiene que significar lo que dice**.

**Lo que salió:** las señales dicen la verdad, la restauración devuelve el
producto entero, y el esquema que corre **no era el que las migraciones
declaran**.

---

## 1. La unidad: la capacidad de operación

No módulos ni rutas: **capacidades de operación**, cosas que alguien de guardia
usaría a las tres de la mañana. Un `console.log` no es observabilidad; un fichero
de backup que nadie ha restaurado no es un backup; un runbook que menciona un
comando que no existe es **peor** que no tener runbook, porque hace perder el
tiempo justo cuando no sobra.

**656 capacidades en 8 familias, 0 comandos de runbook rotos.**

| Familia | Capacidades | Estado |
|---|---:|---|
| `migraciones` | 475 | CERTIFIED_CON_HALLAZGO |
| `runbooks` | 72 | FIXED_CERTIFIED |
| `interruptores` | 35 | CERTIFIED |
| `correlacion` | 34 | CERTIFIED |
| `auditoria` | 29 | CERTIFIED |
| `respaldo_y_restauracion` | 6 | FIXED_CERTIFIED |
| `sondas` | 4 | CERTIFIED |
| `recuperacion` | 1 | CERTIFIED |

---

## 2. El hallazgo: el esquema que corre no era el declarado

Las migraciones son la fuente de verdad del esquema. Pero una base lleva años de
despliegues y migraciones aplicadas a medias, y **nadie comprueba nunca si lo que
corre es lo que las migraciones dicen**.

Se construyó un detector que lo comprueba: reconstruye el esquema desde cero en
una base desechable y compara. La primera vez que se ejecutó encontró **21
diferencias** en la base de certificación:

- **8 columnas** que las migraciones declaran y la base no tenía —
  `campaigns.from_email`, `security_events.metadata`, `saas_conversations.metadata`…
- **13 políticas de RLS**, cuatro de ellas sobre `saas_tenants`, que es la tabla
  de inquilinos.

Aplicando las migraciones, la deriva bajó de 21 a 4. **Y esas cuatro no bajan
nunca.**

### Por qué no bajan

`567_rls_saas_tablas_vacias.sql` activa RLS sobre un lote de tablas, **pero solo
si están vacías**:

```sql
EXECUTE format('SELECT EXISTS (SELECT 1 FROM public.%I)', t) INTO tiene_filas;
IF tiene_filas THEN ... CONTINUE;
```

La cautela está bien razonada en la cabecera de la propia migración: activar RLS
sobre una tabla con datos puede ocultárselos a quien ya los estaba leyendo, y eso
es una avería peor que la que se venía a evitar.

Pero **la consecuencia no la decidió nadie**: una tabla se queda sin RLS para
siempre por lo que hubiera dentro el día en que se aplicó la migración. Una base
reconstruida desde cero tiene 2 121 políticas; la base viva, tras aplicar las 475
migraciones **sin un solo error**, tiene 2 117.

Y las dos creen estar al día.

Es exactamente lo que el encargo del bloque describía: *«migración válida que
solo funciona sobre una base ya preparada»*.

**No se ha corregido**, y a propósito: activar RLS sobre una `saas_tenants` con
datos es un cambio de visibilidad, y además se cruza con `WEB_DB_ROLE_CUTOVER`,
que ya está bloqueado — hoy la aplicación se conecta con un rol que **evita** las
políticas, así que estas no son la frontera efectiva de todas formas. Decidir
esto exige decidir aquello primero. Registrado como
`RLS_SAAS_TENANTS_SOBRE_TABLA_CON_DATOS`.

---

## 3. La restauración: de un marcador a el producto entero

Ya existía un simulacro y **funcionaba**: `pg_dump`, base nueva, `pg_restore`,
comprobar un marcador. Eso demuestra que la tubería existe.

No demuestra que vuelva el producto. Un marcador de una fila sobrevive a casi
cualquier restauración rota. Lo que no sobrevive —y es justo lo que se echa de
menos el día que hace falta— son las restricciones, los índices, las secuencias y
las políticas. Un volcado restaurado sin su clave foránea acepta datos que la
aplicación considera imposibles, y nadie se entera hasta semanas después.

La certificación nueva comprueba lo que importa, contra PostgreSQL real:

| | Resultado |
|---|---|
| Inquilino real con relaciones | usuario → workspace → inquilino → 250 contactos |
| Suma md5 del **contenido** | calculada en origen, recalculada en destino |
| Estructura | **714** tablas, **1 334** restricciones, **2 302** índices, **2 108** políticas |
| La clave foránea **restringe** | se intenta la escritura imposible y la rechaza |
| La **aplicación** puede usarla | se conecta y ejecuta una consulta del producto |

**16/16.**

Y —esto es lo que la separa de un adorno— **se comprueba a sí misma** con
inyección de fallo reproducible:

- `--schema-only` (estructura sin datos) → **2 fallos**, los de contenido.
- `--data-only` (datos sin estructura) → **6 fallos**, contenido y estructura.
- Sin inyección → 16/16.

Dos fallos distintos con **firmas distintas**. Si los dos dieran el mismo
resultado, la certificación no estaría midiendo dos cosas.

---

## 4. Las señales dicen la verdad

Provocando el fallo **de verdad** —apuntando a una base que no existe, no
simulándolo:

- La sonda de **disponibilidad** dice `down` en **6 ms**, respeta su plazo de 3 s,
  y **no revela** el nombre de la base ni la contraseña a quien pregunta.
- La sonda de **vida** responde 200 en menos de 1 ms con la base inutilizable.

Lo segundo no es un descuido: es la decisión correcta. Una sonda de vida que
consultara PostgreSQL reiniciaría **todo el parque** durante un parpadeo de la
base, convirtiendo un incidente de treinta segundos en uno de varios minutos con
el arranque en frío de todo encima. La de vida responde «el proceso está vivo»;
la de disponibilidad, «puede atender». Son preguntas distintas y confundirlas
cuesta caro en las dos direcciones.

**Mutaciones: 2, las 2 caen.** Hacer que la sonda devuelva `ok` en el `catch`
tumba 2; hacer que la de vida consulte la base tumba 1.

---

## 5. Perder PostgreSQL y volver

No se leyó el código: **se paró el contenedor**.

| Momento | Qué pasó |
|---|---|
| Base parada | la consulta **falla** (`Connection terminated unexpectedly`) — no devuelve datos de una caché que nadie ha declarado |
| Base arrancada | el pool vuelve a servir **solo**, sin reiniciar el proceso, en **536 ms** |
| Después | la fila escrita **antes** del corte sigue ahí |
| Sonda | vuelve a decir `ok` |

Recuperarse perdiendo lo escrito sería peor que no recuperarse, y una sonda que
se queda en rojo para siempre saca de servicio a un proceso sano. Las dos mitades
se comprueban.

La suite lleva salvaguarda: solo reinicia el contenedor con
`NELVYON_PERMITIR_REINICIO_PG=1`. No es burocracia — es lo que impide que una
ejecución rutinaria de la batería tumbe la base a mitad de otra suite.

---

## 6. Los runbooks, y un fallo de mi propio detector

La huérfana de este inventario no es un módulo sin categoría: es **un runbook que
manda teclear un comando que no existe**.

El detector encontró 7. **Cinco eran falsos positivos míos**: resolvía todas las
rutas contra `RAIZ/scripts/` y daba por rotas tres que existen en
`backend/scripts/` y `apps/web/scripts/` — incluidas la del runbook de
copia/restauración y la de despliegue.

Un detector que grita por rutas correctas se ignora entero, y con él se ignoran
los gritos de verdad. Se corrigió para respetar el prefijo.

Quedaron **2 reales**: una ruta equivocada (corregida) y un comando que el
runbook ya declara honestamente como `Placeholder:`. Esos dos casos son
**distintos** y el detector ahora los separa: «falta y nadie lo sabe» frente a
«falta y está escrito». Silenciar el segundo dentro del primero habría borrado la
diferencia.

**Resultado: 0 rotos, 1 pendiente declarado.**

---

## 7. Reconstrucción desde cero

**475 migraciones sobre una base vacía: 7 segundos, 0 fallos.** La reconstrucción
tiene las mismas 712 tablas de producto que la referencia.

Las dos únicas tablas de diferencia son restos de las propias pruebas
(`_nelvyon_restore_drill`, `zz_concurrency_parent`), no producto.

---

## 8. SHA certificado

**`87304e68`** en la rama `bloque4-webhooks`.

| Puerta | Resultado |
|---|---|
| Inventario de operación | 655 capacidades · 8 familias · **0 comandos de runbook rotos** |
| Guardianes acumulados (Python, a solas) | **21/21** |
| Certificación de restauración | **16/16**, y falla como debe con fallo inyectado |
| Detección de deriva | ejecutada: 4 diferencias, todas del hallazgo registrado. **Hoy son 6**: el detector pasó a comparar también si la seguridad por filas está activada y forzada, y `saas_tenants` aparece ahora en las tres listas en vez de sólo en la de políticas. Es la misma carencia, contada con precisión |
| Reconstrucción desde cero | **475 migraciones, 0 fallos** |
| Recuperación (contenedor parado y arrancado) | **4/4**, vuelta sola en 536 ms |
| Regresión amplia (736 ficheros) | **7 602 verdes, 0 fallos** |
| Tipos | 11 errores, **todos previos** |
| Árbol | limpio antes y después |

Los saltos bajaron de 96 a **45** al documentar los DSN que faltaban.

Cadena: 4 `cf43aeda`, 5 `9a3841bc`, 6 `5352db46`, 7 `c33b9939`, 8 `efb27997`,
**9 `87304e68`**.
