# Cierre de pendientes post-certificación

El programa 1–10 quedó cerrado con **8 decisiones humanas**, **4 configuraciones**
y **6 verificaciones externas**. Este documento cuenta qué pasó al reevaluar cada
una contra el árbol, en vez de fiarse de la etiqueta.

**De 8 decisiones humanas quedan 2.**

La regla que lo hizo posible: *una etiqueta antigua `BLOCKED_ON_FOUNDER` no
demuestra que siga haciendo falta el fundador*. Seis de las ocho no eran
decisiones — eran trabajo sin hacer con nombre de decisión.

---

## Lo que resultó ser cada bloqueo

| Id | Lo que decía la etiqueta | Lo que era |
|---|---|---|
| `PLATFORM_ADMIN_MODEL` | «hay que decidir el modelo de administradores» | **Ya existía.** `user_roles`, migración 545, con su API, su jerarquía y su auditoría, y seis sitios del lado Python decidiendo con ella. Este lado no estaba conectado |
| `WEB_DB_ROLE_CUTOVER` | «hay que decidir el cambio de rol» | No faltaba decidir: faltaba que las 60 rutas cross-tenant tuvieran por dónde conectarse después |
| `ADR-064` | «decisión de arquitectura pendiente de firma» | Un **mecanismo de gobierno ya implementado**. Faltaba clasificar las ocho migraciones una a una |
| `STRIPE_MEMBERSHIP_REACTIVATION` | «política de reactivación» | El contrato se podía reconstruir de los eventos. Y ocultaba un defecto peor |
| `INVOICING_AB_TESTING_SERVICES` | «¿conectar o borrar?» | Duplicados muertos **y rotos** contra el esquema |
| `CRM_EMAIL_VALIDATION` | «política de validación» | Una política por puerta que no rechaza ni destruye datos |
| `STABLE_WORKSPACE_ID_MIGRATION` | migración de identidad | **Sigue siendo suya.** Pero se dejó de depender del hash |
| `RLS_SAAS_TENANTS_SOBRE_TABLA_CON_DATOS` | cambio de visibilidad de datos | **Sigue siendo suya** |

---

## Los defectos reales que aparecieron al mirar

Ninguno se buscaba. Los seis salieron de reconstruir el contrato de algo que
estaba etiquetado como «pendiente de decidir».

### 1 · Un `admin` podía ascender a `super_admin`

`/api/v1/entities/user_roles` es un router CRUD **genérico** que `main.py` monta
solo con `pkgutil`. Sus escrituras exigían `get_admin_user`, así que un anónimo
no llegaba — pero **no comprobaban la jerarquía** que `/rbac/assign` sí impone
con un mensaje explícito. Un `admin` de nivel 4 podía hacer POST con
`role='super_admin'` y ascender, o PUT sobre su propia fila.

La regla existía y este camino se la saltaba. Lo encontró la prueba escrita para
demostrar que sólo había un escritor: había dos.

### 2 · La caducidad por impago no caducaba a nadie

`event.data.object` es una Suscripción en `customer.subscription.*` y una
**Factura** en `invoice.*`. La ruta leía `obj.id` para todos por igual, así que
`invoice.payment_failed` buscaba un miembro con `stripe_subscription_id = 'in_…'`.
**No coincidía nunca.**

Y no fallaba al hacerlo: el `UPDATE` tocaba cero filas y la ruta devolvía `200
OK`. Un moroso conservaba el acceso indefinidamente.

Este defecto y el que se buscaba —que los caducados no volvían— **se tapaban
entre sí**: como nadie caducaba, nadie notaba que los caducados no volvían.

### 3 · Las dos mitades del flujo OAuth no se ponían de acuerdo

`saas/oauth/connect` derivaba el workspace siempre; `saas/oauth/callback` —la
otra mitad del **mismo flujo**— prefería el puente. Con
`saas_tenants.workspace_id` poblado, que es su estado previsto desde la migración
310, la autorización salía hacia un workspace y la conexión resultante se
guardaba en otro.

No es un riesgo futuro: pasa en cuanto la 310 rellena la columna.

### 4 · Dos servicios muertos y rotos

`InvoicingService` escribía en columnas que **no existen** en `invoices`
(`user_id`, `client_name`, `items`, `sent_at`); la tabla usa `tenant_id`,
`contact_id` y `line_items`. Cada uno de sus métodos habría lanzado.

Sus nueve pruebas estaban verdes porque fabricaban a mano una fila con las
columnas inventadas, y llevaban `@ts-nocheck`.

`ABTestingService` usaba cuatro tablas y **tres no existen**.

### 5 · El detector de deriva confundía «no pude» con «hay»

Salía con **1** ante un fallo de conexión — el mismo código que usa para decir
«HAY DERIVA». Quien lo llamara desde un despliegue no podía distinguir «tu
esquema ha cambiado» de «no llegué a mirarlo», y las dos cosas exigen reacciones
opuestas.

### 6 · Ocho pruebas que sólo fallan con el árbol entero

Tres usaban un doble que simulaba un esquema inexistente. Tres cogían el
singleton `DbClient` que **otro fichero del mismo worker** ya había construido
apuntando a otra base — sembraban en una y consultaban en la otra. Una
documentaba un hallazgo ya resuelto. Y una era mía: un control positivo escrito
con `rejects` que fallaba justo cuando la conexión iba bien.

---

## Lo certificado en esta sesión

| Suite | Resultado | Mutaciones |
|---|---|---|
| `serAdministradorLoDiceLaBase` | 15/15 | — |
| `nadieSeHaceAdministradorSolo` | 9/9 | 4/4 caen |
| `elCutoverDelRolDelLadoWeb` | 11/11 | 4/4 caen |
| `elPuenteManda` | 8/8 | — |
| `elEmailDelContactoNoSeInventa` | 16/16 | 5/5 caen |
| `laMembresiaQueVuelveAPagar` | 14/14 | 5/5 caen |

**18 mutaciones aplicadas, 18 caen.** Una —M11, «validar siempre al editar»—
quedó **infiel por construcción**: la ausencia de email es válida, así que la
sustitución no cambiaba la conducta. No se escondió; se sustituyó por M11b, que
sí cae.

### Herramientas nuevas

| Qué | Para qué |
|---|---|
| `scripts/detectar-colision-de-workspace.mjs` | ¿hay ya dos clientes compartiendo espacio? Sólo lee, en transacción de sólo lectura |
| `scripts/clasificar-migraciones-bloqueadas.mjs` | clasifica las ocho pendientes sobre copias desechables |
| `backend/db/DbJobsClient.ts` | la conexión cross-tenant del cutover, que se niega a trabajar si hay un inquilino en el contexto |
| `backend/db/migrations/577_roles_del_lado_web.sql` | crea los dos roles **sin login** y concede 964 privilegios medidos del uso real |
| `backend/saas/emailDeContacto.ts` | la política de email, en un sitio |

---

## Lo que este cierre NO hizo

- **No tocó producción.** Ni una petición.
- **No gastó un euro.** Ni una llamada a Stripe, a AWS, a un proveedor OAuth ni
  a un modelo de pago.
- **No aplicó ninguna migración a producción.**
- **No cambió ninguna credencial.**
- **No borró datos reales.**
- **No inventó ninguna contraseña.** La migración 577 crea los roles `NOLOGIN`
  precisamente para no tener que escribir un secreto en el repositorio.

---

## Lo que queda

Seis pasos, con los comandos exactos, en
**`docs/LO_QUE_TIENE_QUE_HACER_EL_FUNDADOR.md`**.

Y en cualquier momento:

```bash
node scripts/puerta-de-despliegue.mjs
```

Cada línea en rojo es una acción concreta con nombre. Ya no queda ninguna zona
sin explorar.
