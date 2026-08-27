# Estado de lanzamiento de NELVYON

Cuatro listas, y son distintas a propósito. Meterlas en una sola hace que la
única acción posible sea «revisar todo», que es lo mismo que no revisar nada.

Esta página se genera y se comprueba: `node scripts/puerta-de-despliegue.mjs`.

---

## 1 · CERTIFICADO

Lo que está demostrado con evidencia reproducible en esta máquina.

| Propiedad | Evidencia |
|---|---|
| **Autenticación y sesiones** | 14 ataques contra la puerta: `alg:none`, confusión de algoritmo HS512, firma ajena, firma recortada, payload manipulado para cambiar de inquilino y para ascender a `owner`, caducidad, cuatro nombres de cookie parecidos |
| **Aislamiento entre inquilinos** | 8 ataques contra PostgreSQL real con dos inquilinos completos. Cierra en falso sin caída silenciosa, y el `tenantId` del propio token **no manda** sobre la pertenencia |
| **RLS efectiva** | 30 pruebas con el rol `nelvyon_web_app`, que **sí** está sujeto a las políticas — no con superusuario, que las evitaría |
| **Superficie atacable** | **925 superficies** derivadas del árbol, 12 categorías, **0 huérfanas** |
| **Webhooks entrantes** | firma, `TopicArn`, replay, idempotencia. 20 ataques |
| **OAuth** | los **cinco** proveedores atan el flujo al navegador con un nonce |
| **SSRF** | 34 destinos hostiles contra la guarda canónica, incluida la IPv4 escondida en IPv6 |
| **Inyección SQL** | ~180 interpolaciones en 58 ficheros, todas aclaradas por forma o leídas hasta su origen. **Cero** llevan datos de la petición al texto de la consulta |
| **Travesía de rutas** | 35 casos: lista blanca anclada **y** comprobación de contención |
| **Agentes y memoria** | el contenido ajeno va delimitado y anunciado como datos, no como instrucciones |
| **Idempotencia bajo concurrencia** | 30 reclamaciones simultáneas de la misma clave → **exactamente una gana** |
| **Rendimiento y carga** | 1 367 puntos de escalado, 7 clases, 0 huérfanos. Pool, cotas y límites medidos |
| **Recuperación** | PostgreSQL **parado y arrancado de verdad**: vuelve solo en 536 ms sin perder nada |
| **Backup y restauración** | restauración certificada con suma del contenido, estructura, restricciones que **restringen**, y la aplicación consultando la base restaurada |
| **Reconstrucción desde cero** | 475 migraciones, 7 segundos, 0 fallos |
| **Observabilidad** | las sondas dicen la verdad: `down` en 6 ms con la base caída, sin filtrar su nombre |
| **UX y accesibilidad** | 362 pantallas auditadas con reglas medibles (relleno, enlace muerto, sin `alt`, `alt` inútil, campo sin etiqueta) |
| **Recorrido completo** | alta → autenticación → configuración → operación → automatización → resultado → reporting → permisos → recuperación → cierre, **con dos inquilinos a la vez** |

---

## 2 · HACE FALTA ANTES DE PRODUCCIÓN

Configuración. **El árbol está bien; falta poner cosas en el entorno.**

| Variable | Sin ella |
|---|---|
| `DATABASE_URL` | no hay producto |
| `JWT_SECRET` (≥32) | es la clave de las sesiones **y** de los enlaces de capacidad |
| `CRON_SECRET` (≥16) | las 16 rutas de cron cierran en falso y no corre ningún trabajo |
| **`SES_SNS_TOPIC_ARN`** | `/api/webhooks/ses` responde **503 en producción** |

`SES_SNS_TOPIC_ARN` está aquí por el Bloque 7 y no por gusto: sin la lista de
topics, cualquiera con una cuenta gratuita de AWS marcaba como rebotados los
destinatarios de las campañas de cualquier inquilino. La ruta ahora cierra en
falso — es decir, **el webhook deja de funcionar** hasta que se configure.

---

## 3 · BLOQUEADO POR EL FUNDADOR

Eran **ocho**. Al reevaluar cada uno contra el árbol —en vez de fiarse de la
etiqueta— quedaron **dos**. Una etiqueta antigua no demuestra que siga haciendo
falta el fundador.

| Id | Qué hay que decidir |
|---|---|
| `STABLE_WORKSPACE_ID_MIGRATION` | Si se migran los identificadores de espacio de trabajo ya emitidos. Es una operación de identidad sobre datos reales. Estudio en `DECISION_WORKSPACE_ID.md` |
| `RLS_SAAS_TENANTS_SOBRE_TABLA_CON_DATOS` | Cuatro políticas RLS de `saas_tenants` no llegan a una base con filas. Es un cambio de visibilidad de datos, y se cruza con el paso 4 de abajo |

### Los seis que dejaron de serlo, y por qué

| Id | Qué era en realidad |
|---|---|
| `PLATFORM_ADMIN_MODEL` | No era una decisión de producto: era este lado sin conectar a `user_roles`, la fuente canónica que **ya existía** (migración 545, con su API, su jerarquía y su auditoría, y seis sitios del lado Python decidiendo con ella). Conectado. Queda designar a la primera persona → **paso 2** |
| `WEB_DB_ROLE_CUTOVER` | No faltaba decidir: faltaba que las 60 rutas cross-tenant tuvieran por dónde conectarse después. Hecho y certificado. Queda dar contraseña a dos roles → **paso 4** |
| `ADR-064` | No era una decisión sin escribir: es un mecanismo de gobierno **ya implementado**. Faltaba clasificar las ocho migraciones una a una. Hecho: 2 inocuas, 6 que solo necesitan firma, 0 peligrosas → **paso 3** |
| `STRIPE_MEMBERSHIP_REACTIVATION` | Contrato reconstruido. Y apareció un defecto que nadie buscaba: los eventos de factura usaban el id equivocado, así que **la caducidad por impago no caducaba a nadie** |
| `INVOICING_AB_TESTING_SERVICES` | No era «conectar o borrar»: eran duplicados muertos **y rotos** contra el esquema. Eliminados; lo canónico se queda |
| `CRM_EMAIL_VALIDATION` | Se implementó una política **por puerta** que no rechaza ni destruye datos existentes |

Todo con su evidencia en `backend/db/certificacion/decisiones_y_bloqueos.json`,
sección `resueltas`: nadie cierra un bloqueo sin decir qué hizo y con qué medida.

---

## 4 · EXIGE VERIFICACIÓN EXTERNA

Cosas que **esta máquina no puede comprobar**, no cosas que estén mal.

| Qué | Por qué no se puede aquí |
|---|---|
| RLS del Supabase gestionado | 2 casos exigen Supabase en vivo (`RUN_SUPABASE_RLS=1`) |
| Deriva de esquema en **producción** | el detector existe; hay que apuntarlo a la base real |
| Colisión de workspace en **producción** | la detección existe; hay que ejecutarla contra los inquilinos reales |
| Restauración desde el backup **real** | el simulacro corre en local; el backup de producción hay que restaurarlo **una vez** |
| Entrega de correo real | SES en producción solo se comprueba enviando |
| Webhooks de Stripe en vivo | la firma se certifica en local; la entrega real, no |

---

## Lo que NO se puede decir todavía

**«Listo para producción sin condiciones»** — no, mientras existan las listas 2 y 3.

Lo que sí se puede decir: *todo lo certificable sin decisiones humanas, sin tocar
producción y sin coste externo está cerrado con evidencia reproducible.*

Y una cosa más, que antes no se podía decir: **cada rojo que queda es una acción
concreta con nombre**, no una zona sin explorar. Están los seis pasos, en orden y
con los comandos exactos, en `docs/LO_QUE_TIENE_QUE_HACER_EL_FUNDADOR.md`.
