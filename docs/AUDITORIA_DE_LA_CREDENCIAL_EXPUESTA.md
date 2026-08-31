# La credencial que imprimí, y qué alcanza

> Medido el 2026-08-31 en **solo lectura** contra producción.
> Ninguna credencial se ha rotado. Ninguna se ha escrito. Ninguna aparece aquí.

## Qué pasó

Auditando las variables de entorno del servicio `@nelvyon/web`, un script mío
imprimió `LOCAL_AI_DATABASE_URL` **recortada a 60 caracteres**. El recorte
incluía el usuario y parte de la contraseña.

No fue un fallo de permisos ni una fuga hacia fuera: el valor apareció en la
salida del terminal local de Daniel y en ningún otro sitio. No viajó a ningún
servicio externo. Pero apareció, y eso basta para tratarlo como expuesto.

**Recortar no protege.** Un secreto truncado sigue siendo material sensible:
reduce el espacio de búsqueda de quien lo ataque y, en una cadena de conexión,
los primeros caracteres son justo los que llevan usuario y principio de
contraseña. La defensa contra que vuelva a pasar está en el código, no en la
buena intención: `backend/seguridad/loQueNoSeImprime.mjs` y el detector
`scripts/nada-de-secretos-en-los-diagnosticos.mjs`, con 25 pruebas y 6
mutaciones comprobadas.

## Dónde vive

| | |
|---|---|
| Almacenada en | variable de entorno del servicio `@nelvyon/web` en Railway (una de 61) |
| En el repositorio | **no**, con valor real. Sólo en `.env.local.example` con credenciales de desarrollo (`nelvyon_local_app_dev`, `127.0.0.1:5434`) |
| Quién la lee | `backend/local-ai/railwayRagPrep.ts` (primera en la precedencia), `LocalAiHealth.ts`, `rlsRoleGuard.ts` |

## Qué privilegios tiene el rol

Rol `nelvyon_local_ai_app`, leído de `pg_roles`:

```
super=false  bypassrls=false  createdb=false  createrole=false  replication=false
pertenencia a otros roles: ninguna
usage sobre public: sí   ·   create sobre public: NO
usage sobre auth: NO
```

Es **mínimo privilegio de verdad**, y no por casualidad:
`backend/local-ai/rlsRoleGuard.ts` lo exige y falla cerrado si la variable
apunta a un rol privilegiado. Al estar sin `BYPASSRLS`, las políticas RLS se le
aplican.

## Qué alcanza — el radio de daño

**6 tablas de 735.** Para comparar: el rol de la aplicación (`nelvyon_app`)
alcanza 735.

| Tabla | RLS | Forzada | Políticas | Filas |
|---|---|---|---|---:|
| `local_ai_audit` | sí | sí | 4 | 0 |
| `local_ai_config` | **no** | no | 0 | 1 |
| `local_ai_ingest_jobs` | sí | sí | 4 | 0 |
| `local_ai_memory` | sí | sí | 1 | 0 |
| `local_ai_rag_chunks` | sí | sí | 1 | 2 |
| `local_ai_rag_documents` | sí | sí | 1 | 2 |

**Cinco filas en total, y ninguna de cliente real.** `local_ai_config` es la
única sin RLS; su fila guarda una clave de configuración y un checksum, no
credenciales (comprobado describiendo los valores sin imprimirlos).

## ¿Conviene rotarla?

**Sí, pero sin urgencia.** Los tres factores, separados para que la decisión no
dependa de una sensación:

- **A favor de rotar**: el valor apareció en claro (parcial) fuera de su sitio.
  Rotar elimina la duda por completo y es barato.
- **A favor de no correr**: el rol es de mínimo privilegio, no escala, alcanza
  6 tablas con 5 filas de prueba, y la exposición fue a un terminal local, no a
  un canal compartido ni a un registro persistente.
- **Coste de rotar**: es una **escritura en producción** (`ALTER ROLE … PASSWORD`)
  más actualizar la variable en Railway, lo que **reinicia el servicio**. Eso
  necesita autorización explícita y una ventana.

**No se ha rotado.** Queda propuesto abajo.

## Un hallazgo aparte, encontrado en la misma auditoría

`nelvyon_jobs` tiene **`BYPASSRLS`**. Es el rol del trabajador y salta todas las
políticas de aislamiento por inquilino. Puede ser deliberado —un trabajador de
sistema suele necesitarlo— pero conviene que conste: mientras exista, el
aislamiento entre inquilinos depende del código del trabajador y no de la base.

Los roles con login y sus privilegios:

```
postgres              SUPERUSER BYPASSRLS CREATEDB CREATEROLE REPLICATION
nelvyon_jobs          BYPASSRLS
nelvyon_app           sin privilegios elevados
nelvyon_local_ai_app  sin privilegios elevados
```

## Si se autoriza rotar

```
ACCIÓN        ALTER ROLE nelvyon_local_ai_app WITH PASSWORD '<nuevo>';
              + actualizar LOCAL_AI_DATABASE_URL en Railway (@nelvyon/web)

POR QUÉ       el valor apareció parcialmente en claro fuera de su sitio

EVIDENCIA     este documento; privilegios y alcance medidos en solo lectura

RIESGO        el servicio se reinicia al cambiar la variable. Si la cadena
              nueva se escribe mal, `rlsRoleGuard` falla CERRADO: NELVYON AI
              queda UNAVAILABLE, que ya es su estado actual. No afecta a
              `nelvyon_app` ni al resto del producto.

COSTE         0,00 € — no activa ningún recurso. El redespliegue que provoca
              el cambio de variable sí consume build/compute, como cualquier
              otro (rango medido: 0,001–0,008 USD).

ROLLBACK      volver a poner la contraseña anterior y la variable anterior.
              Requiere conservar el valor previo antes de tocar nada.

PRECONDICIÓN  ventana acordada; nadie usando NELVYON AI (hoy está UNAVAILABLE,
              así que la ventana es cualquier momento).

RESULTADO     `LocalAiHealth` sigue respondiendo; la credencial anterior deja
              de servir.
```

**No lo ejecuto.** Rotar una credencial de producción no está autorizado.
