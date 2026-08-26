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

No son fallos. Son decisiones con consecuencias que una sesión de certificación
no puede tomar.

| Id | Qué hay que decidir |
|---|---|
| `PLATFORM_ADMIN_MODEL` | **Nadie puede ser administrador de plataforma.** `isUserAdmin` consulta un esquema que ninguna migración crea. Cierra en falso; toda la superficie `admin/*` responde 403 |
| `STABLE_WORKSPACE_ID_MIGRATION` | El workspace derivado colisiona. Con 1 000 inquilinos, **42,6 %** de probabilidad de tener ya una colisión. Estudio y plan en `DECISION_WORKSPACE_ID.md` |
| `RLS_SAAS_TENANTS_SOBRE_TABLA_CON_DATOS` | Cuatro políticas RLS de `saas_tenants` no llegan a una base con filas. Es un cambio de visibilidad de datos |
| `WEB_DB_ROLE_CUTOVER` | El lado web se conecta con un rol que **evita** las políticas RLS |
| `ADR-064` | Decisión de arquitectura pendiente de firma |
| `STRIPE_MEMBERSHIP_REACTIVATION` | Política de reactivación de membresías |
| `INVOICING_AB_TESTING_SERVICES` | `InvoicingService` y `ABTestingService` |
| `CRM_EMAIL_VALIDATION` | Política de validación de email inválido |

Las tres primeras se cruzan entre sí: decidir la de `saas_tenants` exige decidir
antes `WEB_DB_ROLE_CUTOVER`, porque hoy las políticas no son la frontera efectiva
de todas formas.

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
