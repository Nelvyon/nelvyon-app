# Auditoría de coste — qué se puede tocar sin que suba la factura

> Medido el **29 de agosto de 2026** contra la infraestructura real, en solo
> lectura. Presupuesto adicional autorizado: **0,00 €**.

---

## Cómo se lee esta tabla

Hay siete clases de coste y la línea que importa está entre la cuarta y la
quinta. No es una escala de «más o menos caro»: es la frontera entre **está
demostrado que no incrementa la factura** y todo lo demás.

| Clase | Se puede ejecutar | Qué quiere decir |
|---|---|---|
| `ALREADY_PAID_FIXED_COST` | ✅ | ya se paga, y pasa igual si esto se ejecuta o no |
| `FREE_WITHIN_EXISTING_PLAN` | ✅ | cabe en lo que el plan ya incluye, sin exceso posible |
| `FREE_LOCAL` | ✅ | ocurre en esta máquina y no sale de aquí |
| `FREE_SELF_HOSTED_ON_EXISTING_HARDWARE` | ✅ | se sirve solo, sobre hardware que ya estaba |
| `MAY_INCREASE_BILL` | ❌ | **puede** subirla. No hace falta que la suba: puede |
| `PAID` | ❌ | cuesta dinero |
| `UNKNOWN_COST` | ❌ | no se sabe. Es la peor, porque parece la más inofensiva |

**`UNKNOWN_COST` es la que gobierna todo esto.** Un proveedor sin clasificar no
es «probablemente gratis»: es desconocido, y desconocido significa que no. Esa
decisión no puede depender de que alguien se acuerde de mirar la documentación,
así que está en código —`backend/coste/PoliticaDeCosteCero.ts`— y falla cerrado.

---

## Lo que hay hoy, medido

### Infraestructura

| Componente | Proveedor | Estado hoy | Clase | Riesgo de exceso | Seguro a 0 € | Acción |
|---|---|---|---|---|---|---|
| Web de producción | Railway `@nelvyon/web` | encendido, `Online`, sirviendo nelvyon.com | `ALREADY_PAID_FIXED_COST` | ninguno mientras no se escale | ✅ | leer estado y variables |
| App | Railway `nelvyon-app` | encendido | `ALREADY_PAID_FIXED_COST` | ninguno | ✅ | — |
| Base de datos | Railway `Postgres` 18.6 | encendido, 710 tablas | `ALREADY_PAID_FIXED_COST` | crecimiento de volumen | ✅ | leer catálogos |
| Lectura de metadatos | Railway API / proxy TCP | usado en esta auditoría | `FREE_WITHIN_EXISTING_PLAN` | ninguno: kilobytes | ✅ | hecho |
| **Escalar cualquier cosa** | Railway | — | `MAY_INCREASE_BILL` | **directo** | ❌ | `BLOCKED_BY_ZERO_COST_POLICY` |
| Entorno `staging` | Railway | 3 servicios, uno `CRASHED` | `ALREADY_PAID_FIXED_COST` | ya se paga | ✅ | sólo mirar |
| Redis | Upstash | configurado en producción | `MAY_INCREASE_BILL` | su nivel gratuito tiene tope de peticiones | ❌ para cargas nuevas | no aumentar uso |
| Errores | Sentry | configurado | `MAY_INCREASE_BILL` | tope de eventos en el nivel gratuito | ❌ para cargas nuevas | no aumentar uso |

### Inteligencia artificial

| Componente | Estado hoy en producción | Clase | Seguro a 0 € | Acción |
|---|---|---|---|---|
| Ollama local | `OLLAMA_CONFIGURED=0`; `OLLAMA_HOST` apunta a una IP **Tailscale CGNAT** | `FREE_SELF_HOSTED_ON_EXISTING_HARDWARE` | ✅ en local · ❌ alcanzable desde producción | ver más abajo |
| OpenAI | sin clave, `AUTONOMOUS_ALLOW_OPENAI=0` | `PAID` | ❌ | `BLOCKED_BY_ZERO_COST_POLICY` |
| Anthropic / Gemini / OpenRouter | no configurados | `PAID` | ❌ | `BLOCKED_BY_ZERO_COST_POLICY` |
| Groq / Together / Fireworks | no configurados | `UNKNOWN_COST` | ❌ | tienen nivel gratuito **con límites que pueden cambiar sin aviso**, y un crédito que se agota. No es una garantía |

### Conectores

| Conector | Credenciales en producción | Clase de la operación real | Seguro a 0 € | Estado |
|---|---|---|---|---|
| Amazon SES | **sí** (`eu-west-1`) | `MAY_INCREASE_BILL` | ❌ para enviar | `PROVIDER_APPROVAL_REQUIRED` (sandbox) |
| Google Analytics 4 | no | lectura sería `FREE_WITHIN_EXISTING_PLAN` | — | `CREDENTIAL_REQUIRED` |
| Google Search Console | no | lectura gratuita | — | `CREDENTIAL_REQUIRED` |
| Google Ads | no | `PAID` | ❌ | `PROVIDER_APPROVAL_REQUIRED` |
| Meta Ads | no | `PAID` | ❌ | `CREDENTIAL_REQUIRED` |
| TikTok / LinkedIn Ads | no | `PAID` | ❌ | `CREDENTIAL_REQUIRED` |
| SEMrush | no | de pago por plan | ❌ | `CREDENTIAL_REQUIRED` |
| Shopify | no | lectura gratuita con app | — | `CREDENTIAL_REQUIRED` |
| WhatsApp | no | `PAID` por conversación | ❌ | `PROVIDER_APPROVAL_REQUIRED` |
| Twilio | no | `PAID` por mensaje | ❌ | `CREDENTIAL_REQUIRED` |
| Telegram | no | gratuito | — | `CREDENTIAL_REQUIRED` |
| HubSpot / Salesforce / Klaviyo / Mailchimp | no | varía | ❌ | `PROVIDER_APPROVAL_REQUIRED` |

**Ninguno tiene credenciales en producción salvo SES.** Eso no es un problema
que se pueda resolver escribiendo código: son cuentas que alguien tiene que
abrir. Y ninguno está `PROVIDER_VERIFIED`: nada ha hablado nunca con la API real.

### Facturación al cliente

| Componente | Estado | Nota |
|---|---|---|
| Stripe | claves en producción, precios configurados | cobrar a un cliente **no es** coste nuestro; queda fuera de esta política |
| Los cuatro precios sin decidir | `BUSINESS_DECISION_REQUIRED` | `precioFacturable()` devuelve `null`; no son facturables |

---

## NELVYON AI en producción: por qué sigue bloqueada

El camino real de inferencia **funciona y está medido** —`REAL_LLM_SUCCESS`,
`llama3.1:8b`, 81/184 tokens, 0 €— pero en local. Para servirlo a producción a
coste cero habría que hacer una de estas cuatro cosas, y ninguna vale:

1. **Ollama dentro de Railway.** Necesita un contenedor con memoria suficiente
   para un modelo de 8B. Es un recurso nuevo: `MAY_INCREASE_BILL`.
2. **GPU alquilada.** `PAID`, y está prohibido explícitamente.
3. **Exponer el Ollama de esta máquina a internet.** Sería un endpoint de
   inferencia sin autenticación seria delante, y además pondría un portátil
   doméstico en el camino crítico de producción. Falla el listón de seguridad y
   el de arquitectura a la vez — y la regla dice que para conseguir 0 € no se
   baja ninguno de los dos.
4. **Un proveedor con nivel gratuito** (Groq, Together…). `UNKNOWN_COST`: su
   cuota puede cambiar sin aviso y el crédito inicial se agota facturando. Un
   nivel gratuito que exige tarjeta no es gratis, es «gratis por ahora».

Y hay un problema anterior a todos: `OLLAMA_HOST` apunta hoy a una IP
**Tailscale (100.64/10)**. Un contenedor de Railway no está en ese tailnet, así
que no puede alcanzarla — es el fallo histórico, y sigue exactamente igual. La
configuración actual es honesta al respecto: `OLLAMA_CONFIGURED=0`, es decir,
apagado. No finge que funciona.

**Veredicto: `NELVYON_AI_PRODUCTION = BLOCKED_BY_ZERO_COST_INFRASTRUCTURE`.**

La arquitectura queda lista. El día que haya dónde servir un modelo, no hay nada
que construir: el adaptador, la procedencia, el enrutado, los límites y la
política de coste ya están y están probados.

---

## Lo que sí se ha podido hacer a 0 €

- Leer el estado completo de producción: commit desplegado, salud, esquema,
  migraciones aplicadas, cola, bloqueos.
- Clasificar las 21 migraciones pendientes y comprobar qué crearían.
- Inspeccionar los 12 trabajos parados sin ejecutar ninguno.
- Medir la inferencia real en local.
- Poner la política de coste cero **en código**, fallando cerrado, con
  mutaciones que lo demuestran.

## Lo que NO se ha hecho, y por qué

| Qué | Motivo |
|---|---|
| Activar cualquier conector | no hay credenciales, y las que costarían dinero están prohibidas |
| Servir NELVYON AI en producción | no existe forma a 0 € que no baje seguridad o arquitectura |
| Ejecutar los 12 trabajos | son huérfanos; y ejecutar cuesta |
| Escalar, ampliar o provisionar nada | `MAY_INCREASE_BILL` |
| Salir del sandbox de SES | lo aprueba AWS, no el código |

**Coste adicional generado por esta auditoría: 0,00 €.**
