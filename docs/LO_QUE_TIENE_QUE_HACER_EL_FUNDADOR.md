# Lo que solo puedes hacer tú

Todo lo demás está hecho y certificado. Esta versión ya no supone nada: se ha
**medido contra tu producción real**, en solo lectura, el 27 de agosto de 2026.

Lo que se comprobó y ya no hace falta que compruebes:

| | Estado real medido |
|---|---|
| `DATABASE_URL` | **ya está** en los dos servicios |
| `JWT_SECRET` | **ya está**, 53 caracteres, no es de relleno |
| `CRON_SECRET` | **ya está** en el servicio web, 64 caracteres |
| `SES_SNS_TOPIC_ARN` | **falta** — es lo único que falta de las cuatro |
| `user_roles` | existe y está **vacía**: nadie es administrador |
| Migraciones 568–577 | las **nueve** pendientes en producción |
| Roles del cutover | **ninguno de los dos existe** todavía |
| Colisión de workspace | **no hay ninguna** |
| Rol de conexión actual | `postgres` (superusuario), como se sospechaba |

---

## Paso 1 · Una sola variable

De las cuatro, tres ya están puestas y **pasan todas las comprobaciones de
calidad** (longitud, variedad, no son valores de relleno, son distintas entre
sí). Falta una:

**`SES_SNS_TOPIC_ARN`**

Y no hay que inventarla ni buscarla: el tema existe en tu cuenta de AWS y está
verificado desde tres sitios independientes — es el `BounceTopic` de
`nelvyon.com`, es su `ComplaintTopic`, y está suscrito a
`https://nelvyon.com/api/webhooks/ses`. Es éste:

```
arn:aws:sns:eu-west-1:354780327276:nelvyon-ses-events
```

**Ponlo así** (Railway → proyecto `truthful-respect` → servicio `@nelvyon/web` →
Variables), o por línea de comandos:

```bash
railway variables --service "@nelvyon/web" --environment production \
  --set SES_SNS_TOPIC_ARN=arn:aws:sns:eu-west-1:354780327276:nelvyon-ses-events
```

> **Esto no es preparación, es una avería activa.** AWS ya está enviando los
> avisos de rebote a `https://nelvyon.com/api/webhooks/ses`, y esa ruta responde
> **503** porque la variable no está. Es decir: **los rebotes y las quejas de
> spam se están perdiendo ahora mismo**. Poner la variable los recupera.

---

## Paso 2 · Necesito un dato tuyo, y sólo uno

Busqué tu usuario para prepararte el alta de administrador y **no lo encontré**.
Probé `danicaste2004@gmail.com`, `d00820188@gmail.com`, `admin@nelvyon.com`,
`daniel@nelvyon.com` y `hola@nelvyon.com`: ninguno tiene cuenta en
`nelvyon_users`, que tiene 25 usuarios.

No voy a elegir por ti cuál de esos 25 eres.

**Dime con qué correo entras a NELVYON** y te dejo la orden exacta lista. O, si
prefieres hacerlo tú, es esto:

```sql
-- 1. Busca tu usuario
SELECT user_id, email FROM nelvyon_users WHERE lower(email) = 'tu-correo-real';

-- 2. Conviértelo en administrador (pega el user_id del paso 1)
INSERT INTO user_roles (user_id, email, role, is_active, created_at, updated_at)
VALUES ('<el user_id del paso 1>', 'tu-correo-real',
        'super_admin', true, now(), now());
```

**Por qué `super_admin` y no `admin`**, que parecería lo prudente: porque un
`admin` (nivel 4) **no puede crear un `super_admin`** (nivel 5) — la jerarquía lo
impide, y está certificado que lo impide. Si el primero fuera `admin`, nunca
podrías crear el otro. Además **24 endpoints** exigen `super_admin` y quedarían
inalcanzables para siempre. No es ampliar privilegios: es que el primero tiene
que serlo o el sistema queda a medias.

A partir de ahí los demás se dan de alta desde el producto, sin tocar la base.

---

## Paso 3 · Aprobar las migraciones

Las **nueve** están pendientes en producción (`_migrations` tiene 467 filas). Las
ocho de ADR-064 más la `577`, que es la del paso 4.

| Migración | Qué hace | Riesgo |
|---|---|---|
| **573** | añade 2 índices | ninguno |
| **576** | añade 8 columnas que el código ya escribe | ninguno |
| **577** | crea los dos roles del cutover, **sin poder conectarse** | ninguno: no cambia el comportamiento de nada |
| 568 · 569 · 570 · 572 · 575 | activan reglas de aislamiento | cambian **qué filas se ven**; después del paso 4 |
| 574 | atribuye 2.761 registros sin dueño | escribe datos, pero **guarda copia de qué tocó** y trae escrito cómo deshacerlo |

Las nueve aplican limpias y son idempotentes, medido sobre copias desechables.
Ninguna es peligrosa.

**Empieza por 573, 576 y 577.** Las tres son inocuas y las dos primeras cierran
errores que el código ya está cometiendo hoy.

Aplicar exige que declares la aprobación — es el mecanismo ADR-064, y **yo no
puedo declararla por ti**: firmar la aprobación en tu nombre vaciaría de sentido
la puerta que existe justo para eso.

```bash
NELVYON_PROD_MIGRATE_APPROVED=1 \
NELVYON_PROD_MIGRATE_APPROVED_BY="Daniel" \
NELVYON_PROD_MIGRATE_COMMIT_SHA="<el sha que despliegas>" \
  <tu comando de despliegue habitual>
```

---

## Paso 4 · El cutover del rol de base de datos

Confirmado contra producción: la web se conecta como **`postgres`**, que es
superusuario, así que las reglas de aislamiento **no se le aplican**. El
aislamiento real lo da que cada consulta filtre bien a mano — y está certificado
que lo hacen —, pero no hay red debajo.

Los dos roles **no existen todavía**: los crea la migración `577` del paso 3, sin
poder conectarse. Luego:

```sql
ALTER ROLE nelvyon_web_app  WITH LOGIN PASSWORD '<un secreto>';
ALTER ROLE nelvyon_web_jobs WITH LOGIN PASSWORD '<otro secreto distinto>';
```

```bash
DATABASE_URL                  -> ...nelvyon_web_app...
NELVYON_WEB_JOBS_DATABASE_URL -> ...nelvyon_web_jobs...
```

Genera los secretos con:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

> **Las dos variables, o ninguna.** Si mueves sólo la primera, las tareas
> programadas, los avisos de Stripe y el panel de plataforma **no darán error**:
> devolverán listas vacías, en silencio. Está medido. La puerta de despliegue lo
> detecta, pero es mejor saberlo antes.

**Vuelta atrás**: devolver `DATABASE_URL` al usuario anterior. No hay nada que
deshacer en la base.

---

## Paso 5 · Lo que ya está comprobado contra producción

**Dos de las tres comprobaciones ya las he ejecutado yo**, en solo lectura:

| Comprobación | Resultado |
|---|---|
| Colisión de workspace | **SIN COLISIONES.** 22 inquilinos, ninguno comparte |
| Simulacro del puente | **Nada cambiaría de identidad** (ver paso 6) |

Queda una, y es un comando:

```bash
DATABASE_URL="<la cadena publica de tu Postgres>" \
  node scripts/detectar-deriva-de-esquema.mjs
```

Sale con **0** si el esquema coincide con lo que dicen las migraciones, **1** si
hay diferencias, y **2** si no ha podido comprobarlo — que no es lo mismo que «no
hay problema».

> Este comando **no funcionaba** contra producción hasta hoy: reconstruía la
> referencia bien, pero luego consultaba una base **local** que se llamara igual.
> Habría dado un veredicto sin haber mirado producción. Corregido y verificado.

---

## Paso 6 · La decisión del identificador de workspace

**La evidencia cambió la pregunta.** Medido hoy en producción:

- 22 inquilinos.
- **2** tienen `workspace_id` real.
- **20** no lo tienen — y **ninguno de esos 20 tiene un workspace al que
  enlazarse**: la tabla `workspaces` sólo tiene **3 filas**.

Es decir: **hoy no existe la migración que estabas decidiendo.** No hay
identificador nuevo al que mover a nadie. Rellenar el puente cambiaría **cero**
identidades.

Mi recomendación está al final de este documento.

---

## Paso 7 · Certificar el backup real

**Corrección importante.** La versión anterior de este documento decía:

```bash
CERT_SOURCE_DB="<la base de produccion>" node scripts/certificar-restauracion.mjs
```

**No hagas eso.** Ese simulacro **siembra 250 contactos de prueba en el origen**
antes de volcarlo — es lo que le permite comprobar que la restauración devuelve
el contenido y no sólo el recuento. Apuntado a producción habría escrito datos
falsos en la base de tus clientes. No habría llegado a hacerlo (sólo ve bases
locales), pero la instrucción era peligrosa y ya lleva una guarda que se niega a
empezar si el origen no es local.

**El procedimiento correcto**, sin escribir en ningún sitio real:

1. En Railway, restaura la copia de seguridad **en una base nueva** — nunca
   encima de producción. (Railway → Postgres → Backups → Restore, eligiendo un
   destino nuevo.)
2. Compara ese entorno restaurado con lo que las migraciones dicen:
   ```bash
   DATABASE_URL="<la cadena de la base RESTAURADA>" \
     node scripts/detectar-deriva-de-esquema.mjs
   ```
3. Y comprueba que el contenido está:
   ```bash
   DATABASE_URL="<la cadena de la base RESTAURADA>" \
     node scripts/diagnostico-de-produccion.mjs
   ```
   Debe darte los mismos recuentos que producción: 22 inquilinos, 25 usuarios.

Los dos comandos **sólo leen** — la conexión se abre en modo de sólo lectura
impuesto por PostgreSQL, no por buena voluntad del código.

> Un backup que nunca se ha restaurado no es un backup: es un fichero.

---

## Cómo saber en cualquier momento qué falta

```bash
node scripts/puerta-de-despliegue.mjs
```

Se ejecuta, no se lee. Cada línea en rojo es una acción concreta con nombre.
