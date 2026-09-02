# Sesión 2026-09-02 — hallazgos con evidencia

Todo lo de aquí está **medido**, no supuesto. Lo que no pude medir lo digo.

---

## 1 · `www.nelvyon.com` — causa raíz exacta

**No es DNS. No es la aplicación. Es el enrutado de Railway.**

| Prueba | Resultado |
|---|---|
| `https://www.nelvyon.com/` | **404** con `x-railway-fallback: true` |
| `https://nelvyon.com/` | 200 |
| `https://app.nelvyon.com/` | 200 |
| Dominio propio de Railway | 200 |
| `apex` **directo** al edge de Railway (sin Cloudflare) | 200 |
| `www` **directo** al edge de Railway (sin Cloudflare) | **la conexión falla** |

DNS: apex y `www` resuelven a las mismas IPs de Cloudflare; `app` va por CNAME
directo a Railway. Es decir, `www` **sí llega** al edge de Railway — y el edge
responde su página de reserva porque **no tiene ruta para ese `Host`**.

`railway domain` lo lista como `ACTIVE` sobre `@nelvyon/web`, el mismo servicio
que sirve apex. La entrada existe; el enrutado no.

**No se puede arreglar en código**: la petición nunca llega a la aplicación, así
que ningún `redirect` de Next puede verla. Se comprobó además que no hay ninguna
lógica de host en `middleware.ts` ni en `next.config.ts`.

### Qué debe hacer `www`: redirigir, no servir

El host canónico es el apex, y no es una opinión:

- `NEXTAUTH_URL = https://nelvyon.com`
- `NEXT_PUBLIC_APP_URL = https://nelvyon.com`
- de ahí derivan las cookies de sesión (`lib/authCookies.ts`) y los *redirect
  URI* de OAuth (`lib/integrations/oauthRedirect.ts`)

Servir la aplicación en `www` rompería sesiones y OAuth.

### `WWW_FIX_READY = SÍ` — pasos exactos (NO ejecutados)

**Opción A, recomendada** — una regla en Cloudflare, sin tocar Railway ni código:

1. Cloudflare → Rules → Redirect Rules → crear regla:
   - Si `http.host eq "www.nelvyon.com"`
   - Entonces redirección **301** dinámica a
     `concat("https://nelvyon.com", http.request.uri.path)`, preservando la
     cadena de consulta.
2. Después, **quitar** `www.nelvyon.com` de los dominios de `@nelvyon/web` en
   Railway: hoy aparece `ACTIVE` mientras devuelve 404, y eso hace perder tiempo
   a quien lo mire.

**Opción B** — que Railway sirva `www`: apuntar el registro `www` de Cloudflare
al *target* CNAME que Railway indique para ESE dominio (no al apex) y esperar a
que emita certificado. **No recomendada**: obligaría a alinear `NEXTAUTH_URL`,
cookies y OAuth con dos hosts.

**Riesgo de no hacer nada**: cualquiera que teclee `www.` ve un 404. Es la
primera impresión de la marca.

---

## 2 · NELVYON AI — qué es real

### No es un envoltorio de un proveedor

`backend/os-agents/LlmClient.ts` lo dice en su primera línea y lo cumple:

> *Never silent mock success — fail closed with `OsAgentError` when no path is
> available.*

Cuando no hay proveedor **lanza**. No devuelve texto enlatado. El `fallback` que
aparece en su código es un **modelo** alternativo, no una respuesta fabricada.

Los 30 agentes Premium reciben un `ILlmClient` inyectado y construyen sus pasos
con él; 29 de 30 lo invocan de verdad.

### Inferencia real verificada localmente, a 0 €

`laInferenciaLocalEsRealOSeDiceQueNo.pg.test.ts`: **4 pruebas en verde en 33 s**
contra Ollama local. Ese tiempo es generación de modelo, no un doble.

Modelos disponibles en la máquina: `llama3.1:8b`, `qwen2.5:3b`, `llama3.2:3b`,
`phi3:mini`, y dos de *embeddings* (`nomic-embed-text`, `mxbai-embed-large`)
— inferencia y RAG, ambos sin coste de proveedor.

### La producción ya está arquitecturada para 0 € de proveedor

Variables medidas en producción:

| Variable | Valor | Lectura |
|---|---|---|
| `NELVYON_AI_ENABLED` | `0` | interruptor maestro **apagado** |
| `OLLAMA_CONFIGURED` | `0` | Ollama declarado no configurado |
| `OLLAMA_HOST` | `http://100.102.207.30:11434` | rango `100.64/10` → **malla Tailscale**, no un proveedor |
| `OLLAMA_MODEL` | `llama3.2:3b-instruct-q4_K_M` | el mismo que corre en local |
| `AUTONOMOUS_ALLOW_OPENAI` | `0` | OpenAI apagado |
| `NELVYON_MESH_OPTION_A` | `1` | **la malla ya está activada** |
| `NELVYON_MESH_HOSTNAME` | `nelvyon-prod-web-canary` | canario de producción (ADR-068) |
| `TS_AUTHKEY` | presente | — |

`scripts/railway-mesh-option-a-entrypoint.sh` se declara **«cost 0»**, se activa
sólo con esas dos variables y prohíbe explícitamente Funnel, *exit node*, rutas
de subred y exponer Ollama en público. Sin las variables arranca como un Next
normal: falla cerrado.

**Y el servidor de modelo está vivo**: `http://100.102.207.30:11434/api/tags`
devuelve 200.

### `NELVYON_AI_PRODUCTION_ACTIVATION_PLAN`

Entre producción y la IA real quedan **dos variables**:

```
OLLAMA_CONFIGURED = 0  ->  1
NELVYON_AI_ENABLED = 0  ->  1
```

Coste de proveedor: **0 €**. No hace falta comprar nada ni contratar API.

**NO ACTIVADO.** Requiere autorización explícita.

### Lo que NO pude verificar, y hay que verificarlo antes

Que el contenedor de Railway **alcance** `100.102.207.30` por la malla. La malla
está activada y el servidor responde desde mi máquina, pero eso no prueba que la
ruta funcione desde dentro del contenedor. Sólo se comprueba desplegando con la
malla en marcha y sondeando desde allí.

**Y un punto único de fallo que conviene nombrar**: con este diseño, la
disponibilidad de NELVYON AI es la disponibilidad de esa máquina. Si se apaga,
la IA productiva se apaga con ella. Es el precio de los 0 €, y es una decisión
de negocio legítima — pero debe tomarse a sabiendas, no descubrirse un martes.

**El modelo es de 3B.** La calidad esperable es la de un modelo de 3B, no la de
un modelo frontera. Para trabajo de agencia vendido a clientes, conviene medir
la calidad antes de prometerla.
