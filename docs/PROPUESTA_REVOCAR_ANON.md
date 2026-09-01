# `anon` y `authenticated`: clasificación de las 47 tablas — sin revocar nada

> Medido en producción el 2026-09-01 en **solo lectura**, después de aplicar 590
> y 591. **No se ha revocado ningún grant.** Es una propuesta.

## La pregunta

Las 47 tablas de la 591 tenían `SELECT` concedido a `anon` (44 de ellas) y DML a
`authenticated`. ¿Hay que revocarlo, o forma parte del diseño?

## Lo que se midió, no lo que se supone

**1 · `anon` y `authenticated` son `NOLOGIN`.**

```
anon             rolsuper=false  rolbypassrls=false  rolcanlogin=false
authenticated    rolsuper=false  rolbypassrls=false  rolcanlogin=false
```

Nadie puede conectarse *como* ellos. Sólo se alcanzan si algo hace `SET ROLE`
después de conectarse — que es lo que hace PostgREST.

**2 · No hay PostgREST ni Supabase en el proyecto.** El proyecto de Railway
tiene dos servicios: `@nelvyon/web` y `Postgres`. No hay nada delante de la base
que traduzca peticiones HTTP a SQL.

**3 · El SDK de Supabase no está instalado.** `@supabase/supabase-js` no aparece
en ningún `package.json`. `apps/web/src/lib/supabaseClient.ts` lo dice en su
propia cabecera: *«No @supabase/supabase-js dependency in v1 — helpers only»*.
Son funciones que devuelven una URL y una clave, y nadie crea un cliente.

**4 · Nadie hace `SET ROLE`.** Se buscó en todo el árbol. Los tres aciertos son
`UPDATE … SET role = …`, una columna llamada `role`, no el comando de PostgreSQL.

**5 · `NEXT_PUBLIC_SUPABASE_URL` apunta a otro sitio**
(`lezzkqpkxcoxqqcgohof.supabase.co`), no a esta base
(`reseau.proxy.rlwy.net`). Y `.env.production.example` ya lo decía:
*«SUPABASE_ANON_KEY … (sin uso activo)»*.

## Conclusión

Los roles `anon` y `authenticated` de esta base son **vestigiales**: vienen de un
esquema derivado de una plantilla de Supabase y **no son alcanzables** en el
despliegue actual.

## Clasificación

| Clase | Tablas | Razón |
|---|---:|---|
| `REVOKE_SAFE` | **46** (las de la 591) + `saas_tenants` | Los roles no son alcanzables: ni pueden conectar, ni hay quien haga `SET ROLE` |
| `REQUIRED_BY_DESIGN` | **0** | No se encontró ninguna ruta que dependa de ellos |
| `UNKNOWN` | **0** técnicamente | Ver la salvedad de abajo |

**La salvedad no es técnica, es de intención.** Si el plan es adoptar Supabase o
poner PostgREST delante más adelante, estos grants son el andamio de eso y
revocarlos habría que rehacerlo. Esa decisión es tuya; la evidencia técnica dice
que hoy no sirven para nada.

## Qué añadiría revocar, de verdad

**Para las 46 de la 591: casi nada hoy.** Ya tienen RLS + FORCE con la política
por `user_id`. `anon` no tiene `request.jwt.claim.sub`, la comparación da NULL, y
no ve ni una fila aunque llegara a conectarse. Revocar sólo cubre el caso de que
alguien desactive RLS o borre una política más adelante.

**Para `saas_tenants`: sí añade algo, y ahora mismo.** Esa tabla **no tiene RLS**
—ver abajo— y tiene **22 filas de clientes reales** con nombre de empresa,
teléfono, web, plan y estado de facturación. Ahí el grant a `anon` es lo único
que separaría a un lector anónimo de la lista de clientes, si algún día apareciera
un PostgREST delante.

Pero lo que de verdad hace falta en `saas_tenants` no es revocar: es **RLS**.

## Estado tras la 592 — reclasificado

**La 592 ya está aplicada en producción.** Las 5 tablas que quedaban —incluida
`saas_tenants`— tienen ahora RLS + FORCE con la política de su modelo.

Eso cambia lo que aporta revocar: **ya no queda ninguna tabla donde el grant a
`anon` sea lo único que separa a un lector anónimo de los datos.** Con RLS y sin
`request.jwt.claim.sub`, `anon` no ve ni una fila en ninguna.

Y hay una comprobación nueva que refuerza la clasificación: **de los siete roles
de la base, sólo `postgres` puede conectarse.** `anon`, `authenticated`,
`nelvyon_app`, `nelvyon_web_app`, `nelvyon_web_jobs` y `service_role` son todos
`NOLOGIN`. No es que hoy nadie los use: es que hoy nadie *puede* usarlos sin que
alguien antes les conceda `LOGIN` o ponga un PostgREST delante.

| Clase | Tablas | Razón |
|---|---:|---|
| `REVOKE_SAFE` | las 46 de la 591 + las 5 de la 592 | Roles `NOLOGIN`, sin PostgREST, sin SDK, sin `SET ROLE`. Y ahora además con RLS debajo |
| `REQUIRED_BY_DESIGN` | 0 | Ninguna ruta depende de ellos |
| `UNKNOWN` | 0 técnicamente | La duda es de intención, no de evidencia |

**Recomendación: revocar es ahora opcional, no urgente.** Era urgente cuando
`saas_tenants` no tenía RLS; ya la tiene. Queda como higiene —quitar privilegios
que nadie usa— y como cierre del andamio de Supabase si decides que no entra en
el plan.

## El revoke, si decides hacerlo

```sql
-- NO EJECUTADO. Propuesta.
REVOKE SELECT ON  <las 46 de la 591>  FROM anon;
REVOKE ALL    ON  <las 46 de la 591>  FROM authenticated;
```

En ese orden: primero la protección que funciona sola, después la que sólo
cubre el caso de que la primera falle.
