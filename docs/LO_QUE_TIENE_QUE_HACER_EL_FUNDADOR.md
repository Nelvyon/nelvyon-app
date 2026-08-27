# Lo que solo puedes hacer tú

Todo lo demás está hecho y certificado. Esto es lo que queda, y queda porque
necesita **una credencial que no tengo**, **acceso a producción**, o **una
decisión de negocio**. Ninguna de las tres se puede resolver desde una sesión de
certificación.

Está en orden: cada paso deja el siguiente listo.

---

## Paso 1 · Poner cuatro variables

Sin ellas NELVYON no arranca, o arranca con puertas cerradas a propósito.

| Variable | Qué es | Sin ella |
|---|---|---|
| `DATABASE_URL` | la cadena de conexión a PostgreSQL | no hay producto |
| `JWT_SECRET` | la clave con la que se firman las sesiones. **Mínimo 32 caracteres** | nadie puede entrar |
| `CRON_SECRET` | la clave de las 16 tareas programadas. **Mínimo 16** | no corre ninguna tarea automática |
| `SES_SNS_TOPIC_ARN` | la lista de *topics* de AWS autorizados a avisar de rebotes | el aviso de correos rebotados responde 503 |

La cuarta es la que menos suena y la que más importa. Antes, cualquiera con una
cuenta gratuita de AWS podía marcar como rebotados a los destinatarios de las
campañas de cualquier cliente tuyo. Ahora esa puerta está cerrada, y se abre
poniendo la lista de topics.

**Genera los secretos así** (uno distinto para cada uno):

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

**Comprueba que están bien puestas antes de desplegar:**

```bash
node scripts/puerta-de-despliegue.mjs
```

No hace falta que entiendas la salida: si dice `FALTA` en algo, ahí está el
problema, con el motivo escrito al lado. **Nunca imprime tus secretos** — solo su
longitud.

---

## Paso 2 · Nombrar al primer administrador

Hoy **nadie** puede entrar al panel de administración de la plataforma. No es un
fallo: es que nunca se dijo quién debía poder.

El mecanismo ya está hecho y certificado. Falta el dato: **quién eres tú en la
base**.

```sql
-- 1. Busca tu usuario
SELECT user_id, email FROM nelvyon_users WHERE email = 'tu-email@tu-dominio.com';

-- 2. Conviértelo en administrador (pega el user_id del paso 1)
INSERT INTO user_roles (user_id, email, role, is_active, created_at, updated_at)
VALUES ('<el user_id del paso 1>', 'tu-email@tu-dominio.com',
        'super_admin', true, now(), now());
```

A partir de ahí, los demás administradores se dan de alta desde el producto, sin
tocar la base. Y está certificado que **nadie se convierte en administrador
solo**: ni registrándose, ni siendo dueño de su espacio, ni manipulando su
sesión, ni por SSO, ni por invitación.

---

## Paso 3 · Aprobar las ocho migraciones pendientes

Hay ocho cambios de base de datos escritos, probados y esperando tu visto bueno.
**Las ocho aplican limpias y se pueden aplicar dos veces sin efecto distinto**,
medido sobre una copia. Ninguna es peligrosa; dos son completamente inocuas.

| Migración | Qué hace | Riesgo |
|---|---|---|
| **573** | añade 2 índices | ninguno |
| **576** | añade 8 columnas que el código ya escribe | ninguno |
| 568 · 569 · 570 · 572 · 575 | activan reglas de aislamiento en la base | cambian **qué filas se ven**; conviene hacerlo después del paso 4 |
| 574 | atribuye 2.761 registros antiguos que quedaron sin dueño | escribe datos, pero **se guarda una copia de qué tocó** y trae escrito cómo deshacerlo |

Para revisar la clasificación tú mismo, con la evidencia recalculada:

```bash
node scripts/clasificar-migraciones-bloqueadas.mjs
```

Aplicar en producción exige que declares la aprobación, que es como está montado
el gobierno de migraciones desde hace tiempo:

```bash
NELVYON_PROD_MIGRATE_APPROVED=1 \
NELVYON_PROD_MIGRATE_APPROVED_BY="tu nombre" \
NELVYON_PROD_MIGRATE_COMMIT_SHA="<el sha que despliegas>" \
  <tu comando de despliegue habitual>
```

**Sugerencia**: aplica primero **573 y 576**. Son inocuas y cierran errores que
el código ya está cometiendo hoy.

---

## Paso 4 · Cambiar el usuario con el que la web habla con la base

Hoy la parte web se conecta como **superusuario**. Eso significa que las 1.763
reglas de aislamiento que protegen los datos de cada cliente **no se le aplican**.
El aislamiento real lo da que cada consulta filtre bien a mano — y está
certificado que lo hacen —, pero no hay red debajo.

Está todo preparado. Los dos usuarios se crean solos al aplicar la migración
`577`, sin poder conectarse. Lo que falta es darles contraseña y apuntarles las
variables:

```sql
ALTER ROLE nelvyon_web_app  WITH LOGIN PASSWORD '<un secreto>';
ALTER ROLE nelvyon_web_jobs WITH LOGIN PASSWORD '<otro secreto distinto>';
```

```bash
DATABASE_URL                  -> ...nelvyon_web_app...
NELVYON_WEB_JOBS_DATABASE_URL -> ...nelvyon_web_jobs...
```

> **Las dos variables, o ninguna.** Si mueves solo la primera, las tareas
> programadas, los avisos de Stripe y el panel de plataforma **no darán error**:
> devolverán listas vacías, en silencio. Está medido. La puerta de despliegue lo
> detecta y te lo dice, pero es mejor saberlo antes.

**Para volver atrás** basta con devolver `DATABASE_URL` al usuario de antes. No
hay nada que deshacer en la base.

---

## Paso 5 · Tres comprobaciones que solo se pueden hacer contra producción

Ninguna cambia nada. Las tres solo leen.

```bash
# ¿El esquema real coincide con lo que dicen las migraciones?
DATABASE_URL="<produccion>" node scripts/detectar-deriva-de-esquema.mjs

# ¿Hay ya dos clientes compartiendo el mismo espacio de trabajo?
DATABASE_URL="<produccion>" node scripts/detectar-colision-de-workspace.mjs
```

Las dos salen con **0** si todo está bien, **1** si encuentran algo, y **2** si no
han podido comprobarlo — que no es lo mismo que «no hay problema».

Y la tercera, que es la única que de verdad certifica un backup:

```bash
# Restaurar UNA VEZ el backup real en una base desechable
CERT_SOURCE_DB="<la base de produccion>" node scripts/certificar-restauracion.mjs
```

> Un backup que nunca se ha restaurado no es un backup: es un fichero. El
> simulacro pasa 16 de 16 en local, pero eso certifica el procedimiento, no *tu*
> copia de seguridad.

---

## Paso 6 · Dos decisiones que son tuyas, y pueden esperar

Ninguna bloquea el lanzamiento. Las dos están estudiadas y medidas.

**1. El identificador de espacio de trabajo puede repetirse.**
Se deriva del cliente con un cálculo que tiene 900.000 resultados posibles. Con
1.000 clientes, la probabilidad de que dos ya compartan uno es del **42,6 %**.

Ya se ha hecho lo que no requería decidir nada: ahora se usa el identificador
real cuando existe, y solo se calcula cuando no. La decisión que queda es si
migrar los identificadores antiguos, que es una operación de identidad sobre
datos reales. El estudio completo está en `docs/DECISION_WORKSPACE_ID.md`.

*Mientras tanto*: el paso 5 te dice si ya ha pasado.

**2. Si alguien que se dio de baja debería recuperar el acceso al volver a pagar.**
Hoy: **no**. Quien caduca por un impago y paga, vuelve a entrar
—eso ya funciona y está certificado—, pero quien se dio de baja explícitamente
no revive con un cobro rezagado. Está escrito así porque es la dirección segura:
si alguien pagó y no entra, te llama; si alguien que se dio de baja entra, no te
llama nadie.

---

## Cómo saber en cualquier momento qué falta

```bash
node scripts/puerta-de-despliegue.mjs
```

Se ejecuta, no se lee. Cada línea en rojo es una acción concreta, y dice cuál.
