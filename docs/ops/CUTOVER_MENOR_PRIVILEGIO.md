# Cutover a menor privilegio — runbook

> Estado: **PREPARADO, NO EJECUTADO.** Falta una decisión humana (§4) y una
> credencial (§3).
>
> La migración va **partida en dos a propósito**:
>
> - **597** — RLS de `user_provider_api_keys` + las 31 concesiones. Sólo suma:
>   conceder de más no rompe nada. Se puede aplicar ya.
> - **598** — las 969 revocaciones. Espera al **cutover**, con el rol ya
>   sirviendo tráfico: quitar un permiso que sí hacía falta no falla al
>   arrancar, falla la primera vez que alguien recorre ese camino, y eso puede
>   tardar semanas en verse.

## 1 · Qué problema resuelve

La aplicación se conecta a producción como **`postgres`**, que es **superusuario**
y por tanto **salta RLS**.

```
current_user      = postgres     usesuper = true
tablas con RLS    = 651
políticas activas = 2324
```

Esas 2324 políticas están escritas y **no se aplican a ninguna consulta del
producto**. Todo el aislamiento entre inquilinos depende hoy de que cada `WHERE`
del código lleve su `tenant_id`, sin red debajo.

## 2 · Lo que se encontró al medirlo

Los roles acotados existen desde la migración 577, pero estaban preparados a
medias:

| | `nelvyon_web_app` | `nelvyon_web_jobs` |
|---|---|---|
| LOGIN | **no** | **no** |
| BYPASSRLS | no *(correcto)* | sí *(correcto para jobs)* |
| SELECT / INSERT / UPDATE / DELETE | 293 / 464 / 148 / 63 | 293 / 464 / 148 / 63 |

Los dos tenían **permisos idénticos**: la separación web/jobs no existía. Eran el
mismo rol escrito dos veces.

### Lo que necesita cada uno

Se extrajo de las consultas del árbol, **por operación**, separando los módulos
que usan `DbClient` (runtime web) de los que usan `DbJobsClient` (jobs y cron).
Un `SELECT` sobre una tabla no da derecho a `DELETE` sobre ella.

| | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `nelvyon_web_app` necesita | 282 | 471 | 145 | 63 |
| `nelvyon_web_jobs` necesita | **21** | **7** | **8** | **1** |

`nelvyon_web_app` ya estaba casi bien: le faltaban 29 permisos sueltos.
`nelvyon_web_jobs` sobraba entero: **933 permisos que no usa**, incluido INSERT
en 457 tablas que sus siete consultas no tocan.

### Limitación del método, dicha en voz alta

El análisis lee las consultas del árbol. Una consulta construida dinámicamente
—nombre de tabla en una variable— no la ve. Por eso el cutover (§4) va con
verificación inmediata y rollback de una variable: si algo quedó fuera, se nota
en minutos y se revierte en segundos.

## 3 · Lo que hace falta y no está en el repositorio

**Una credencial.** `ALTER ROLE ... LOGIN PASSWORD` no se escribe en git.

```sql
-- Ejecutar en producción, con una contraseña generada al momento:
ALTER ROLE nelvyon_web_app  WITH LOGIN PASSWORD '<generada>';
ALTER ROLE nelvyon_web_jobs WITH LOGIN PASSWORD '<generada>';
```

Rollback: `ALTER ROLE nelvyon_web_app WITH NOLOGIN;`

## 4 · El cutover

Dos variables, en este orden:

```
NELVYON_WEB_JOBS_DATABASE_URL = postgresql://nelvyon_web_jobs:<clave>@<host>:<puerto>/<base>
DATABASE_URL                  = postgresql://nelvyon_web_app:<clave>@<host>:<puerto>/<base>
```

Primero la de jobs. `DbJobsClient` cae a `DATABASE_URL` mientras esa variable no
exista, así que ponerla antes no cambia nada; ponerla después dejaría a los
trabajos entre inquilinos corriendo con el rol equivocado durante la ventana.

### Rollback exacto

```
DATABASE_URL = <el valor actual, guardado antes de tocar nada>
```

Una variable. El despliegue anterior sigue disponible en Railway. **No hay
cambio de esquema que revertir**: la 597 sólo mueve permisos, y los permisos no
rompen datos.

### Verificación inmediata tras el cutover

| Qué | Cómo | Verde |
|---|---|---|
| salud | `GET /api/health/ready` | `database: ok` |
| profunda | `GET /api/health/deep` con `x-cron-secret` | `database: ok` |
| portal | `GET /portal` | 200 |
| fronteras | 4 rutas protegidas sin credencial | 401 |
| jobs | `GET /api/cron/saas-retencion-ejecuciones` con el secreto | 200 con recuentos |
| Stripe | firma inválida al webhook | 400, 0 filas nuevas |

**Señal de alarma específica**: con RLS ya aplicándose, una ruta que no fije el
contexto de inquilino **no da error — devuelve CERO FILAS**. Es la avería más
cara de diagnosticar que puede producir este cambio. Si un listado que antes
traía datos aparece vacío, es esto, y el rollback es inmediato.

## 5 · Estado

- [x] Permisos calculados por operación y por cliente
- [x] Migraciones **597** y **598** escritas, aplicadas e **idempotentes** (dos pasadas cada una)
- [x] Certificadas sobre una base con **los permisos exactos de producción**, restaurados para la prueba
- [x] Secuencia medida: antes `290/460/146/62` en ambos → tras **597** `web_app 293/483/147/64` y `web_jobs 292/…` (**nada revocado**) → tras **598** `web_app 282/471/145/63` y `web_jobs 21/7/8/1`
- [x] Tras **597 sola**: `nelvyon_web_app` lee **282/282** de lo que consulta el web, `BYPASSRLS=false`
- [x] `user_provider_api_keys`: RLS + FORCE + 4 políticas
- [x] Guardianes de esquema y RLS en verde sobre la base resultante
- [ ] LOGIN + contraseña en producción — **requiere decisión humana**
- [ ] Cambio de `DATABASE_URL` — **requiere decisión humana**
