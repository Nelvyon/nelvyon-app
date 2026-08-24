# Skills y MCP de NELVYON — inventario auditado

Estado a 2026-08-24. Rama `bloque4-webhooks`.

## Resumen

- **16 Skills propias** con el estándar de NELVYON, repartidas con mínimo
  privilegio y vigiladas por `backend/private-ai/__tests__/registroDeSkills.test.ts`.
- **8 Skills externas oficiales de Anthropic**, auditadas e instaladas por la vía
  oficial. Ver [la auditoría del ecosistema](#auditoría-del-ecosistema-de-claude-code).
- **Ninguna Skill ni MCP de terceros sin verificar.** Cinco candidatos propuestos
  no existen en las fuentes oficiales y quedan como `UNSAFE` por falta de
  procedencia, no por sospecha.
- **Coste externo nuevo: 0 €.**

Las externas **no se copiaron al árbol**: `anthropics/skills` no declara licencia,
así que copiar sus ficheros sería redistribuir código ajeno sin permiso. Se
instalan por el mecanismo con el que Anthropic los distribuye, que es usarlos.

---

## Skills propias — las 16

Todas en `.claude/skills/`, todas con su `SKILL.md`, todas asignadas.

| Skill | Área | Quién la usa |
|---|---|---|
| `nelvyon-web-elite` | Web y producto | `product`, `development` |
| `nelvyon-cro` | Conversión | `marketing`, `product` |
| `nelvyon-seo-elite` | SEO técnico, contenido y local | `seo`, `content` |
| `nelvyon-social-elite` | Redes por plataforma | `social_media` |
| `nelvyon-brand-strategy` | Estrategia, ICP, posicionamiento, voz | `ceo_supervisor`, `marketing`, `content`, `social_media`, `email_marketing`, `sales`, `support`, `portal_client` |
| `nelvyon-paid-media` | Medios de pago | `google_ads`, `meta_ads`, `tiktok_ads` |
| `nelvyon-email-marketing` | Ciclo de vida y entregabilidad | `email_marketing` |
| `nelvyon-sales` | Ventas y CRM | `sales`, `crm` |
| `nelvyon-reputation` | Reseñas y ficha de negocio | `support` |
| `nelvyon-ecommerce` | Ficha, carrito, retención | `operations` |
| `nelvyon-local-business` | Negocio local y proximidad | `operations` |
| `nelvyon-analytics` | Medición y atribución | `ceo_supervisor`, `marketing`, `seo`, `crm`, `reporting`, ads |
| `nelvyon-marketing-qa` | Revisión de entregables | `qa`, `ceo_supervisor` |
| `nelvyon-web-qa` | Revisión de web publicada | `qa` |
| `nelvyon-accessibility` | WCAG aplicada | `qa`, `development` |
| `nelvyon-performance` | Core Web Vitals | `qa`, `development`, `seo` |

### Dos decisiones de reparto que no son obvias

**Nadie se autorrevisa.** Los nueve agentes que producen entregables de cliente
—`content`, `seo`, `social_media`, `email_marketing`, `sales`, `marketing` y los
tres de publicidad— **no** llevan `nelvyon-marketing-qa` ni `nelvyon-web-qa`. Un
agente que revisa su propio trabajo no revisa, relee, y así es como se consigue
un QA que siempre aprueba. Hay una prueba que falla si alguien lo cambia.

**`finance`, `cto`, `devops` y `security_compliance` no llevan ninguna.** Su
trabajo no las necesita, y cada Skill que un agente puede invocar es superficie
por la que se le puede desviar.

---

## MCP de terceros — evaluación, ninguno instalado

Estos son **MCP de proveedores**, distintos de las Skills oficiales de Anthropic
que sí se instalaron. Cada fila dice qué haría falta y por qué está donde está.

| Herramienta | Para qué | Riesgo principal | Estado |
|---|---|---|---|
| **Playwright MCP** | QA de web publicada, responsive, capturas | Ejecuta un navegador y puede navegar a cualquier URL: es un vector de SSRF y de inyección por contenido de la propia página | `PENDIENTE_DE_REVISION` — es el de más valor para `nelvyon-web-qa`; necesita revisión de permisos de red antes de entrar |
| **Figma MCP** | Leer diseños para implementarlos | Requiere token de Figma con acceso a los archivos del cliente | `BLOCKED_EXTERNALLY: CUENTA` |
| **GitHub MCP** | Leer repos, PRs, issues | Token con alcance sobre repositorios | `BLOCKED_ON_FOUNDER` — el alcance del token es decisión del fundador |
| **Google Analytics 4** | Datos reales de medición | Credenciales de cliente; datos personales | `BLOCKED_EXTERNALLY: CUENTA` |
| **Google Search Console** | Rendimiento en búsqueda | Igual que GA4 | `BLOCKED_EXTERNALLY: CUENTA` |
| **Meta / Google / TikTok Ads** | Campañas | **Gasto real.** Además de la cuenta, exige el gate de aprobación | `BLOCKED_ON_FOUNDER: COSTE` |
| **Proveedores de email** | Envío real | Envío masivo es acción sensible; y quema el dominio del cliente si se hace mal | `BLOCKED_EXTERNALLY: CUENTA` |
| **APIs de redes sociales** | Publicación real | Publicación real = acción irreversible con gate | `BLOCKED_EXTERNALLY: CUENTA` |
| **Lighthouse / CWV** | Rendimiento medido | Bajo: se puede ejecutar local | `PENDIENTE_DE_REVISION` — candidato preferente, sin coste y sin cuenta |
| **Almacenamiento y CMS** | Entregables y publicación | Escritura en sistemas del cliente | `BLOCKED_EXTERNALLY: CUENTA` |

### Playwright: resuelto por otra vía

La fila de arriba se quedó obsoleta en cuanto se auditó el ecosistema. **Playwright
ya está instalado**, pero no como MCP de terceros: la Skill oficial de Anthropic
`webapp-testing` lo trae, es local, sin cuenta y sin coste. Ver la auditoría.

Queda `chrome-devtools-mcp` (Chrome DevTools) como candidato para medir
rendimiento real, `PENDIENTE_DE_REVISION` por sus permisos de red.

---

## Checklist de admisión de terceros

Antes de que cualquier Skill o MCP externo entre en el árbol:

1. **Procedencia**: oficial, proveedor conocido, o open source con historial.
2. **Permisos**: qué lee, qué escribe, a qué red sale.
3. **Scripts**: se leen. Todos. Un `postinstall` es ejecución de código.
4. **Filesystem**: qué rutas toca fuera de su propia carpeta.
5. **Secretos**: ninguna Skill recibe una credencial que no necesite.
6. **Inyección**: si trae contenido de fuera —una página, un documento, una
   respuesta de API— ese contenido es **dato**, nunca instrucción. Ver
   `backend/private-ai/contextoRecuperado.ts`.
7. **Dependencias** y **mantenimiento**: cuántas, de quién, y desde cuándo sin
   tocarse.
8. **Licencia** compatible.
9. **Duplicado**: si ya hay algo que lo hace, no entra.

Una Skill que ejecuta código o toca credenciales se trata como **código no
confiable** hasta haber pasado los nueve puntos.

---

# Auditoría del ecosistema de Claude Code

Actualizado el 2026-08-24. **Ningún nombre se ha dado por bueno**: cada uno se ha
verificado contra su fuente antes de clasificarlo.

## Las dos fuentes oficiales

| Fuente | Qué es | Verificación |
|---|---|---|
| `anthropics/skills` | Repositorio público de Agent Skills | 19 Skills, activo (último push 2026-08-21), 171k estrellas |
| `anthropics/claude-plugins-official` | Directorio de plugins gestionado por Anthropic | 300+ entradas, con procedencia por repositorio |

## Verificación de la lista propuesta

De los 21 nombres, **11 no existen** con ese nombre en ninguna de las dos fuentes
oficiales. Esa es la razón de comprobar antes de instalar.

| Nombre propuesto | ¿Existe? | Clasificación |
|---|---|---|
| Frontend Design | **Sí** — `frontend-design`, Anthropic | `VERIFIED_FREE_SAFE` · **instalada** |
| Playwright | **No con ese nombre** — es `webapp-testing`, Anthropic, y usa Playwright | `VERIFIED_FREE_SAFE` · **instalada** |
| Skill Creator | **Sí** — `skill-creator`, Anthropic | `VERIFIED_FREE_SAFE` · **instalada** |
| MCP Server Dev | **Sí** — `mcp-builder`, Anthropic | `VERIFIED_FREE_SAFE` · **instalada** |
| Modern Web Guidance | **Sí** — `modern-web-guidance`, Google Chrome | `REDUNDANT` — solapa `nelvyon-web-elite` y `nelvyon-performance` |
| Lighthouse | **No** — lo más cercano es `chrome-devtools-mcp` | `PENDIENTE_DE_REVISION` — Chrome real, permisos de red por auditar |
| Code Review | **Sí** — `code-review`, Anthropic | `REDUNDANT` — este proyecto ya usa `/code-review` |
| Code Simplifier | **Sí** — `code-simplifier`, Anthropic | `REDUNDANT` — ya disponible como `/simplify` |
| Feature Dev | **Sí** — `feature-dev`, Anthropic | `NOT_APPLICABLE` — no encaja con el método de certificación por bloques |
| Hookify | **Sí** — `hookify`, Anthropic | `NOT_APPLICABLE` — no hay comportamiento que frenar hoy |
| Claude Code Setup | **Sí** — `claude-code-setup`, Anthropic | `NOT_APPLICABLE` — el proyecto ya está configurado |
| CLAUDE.md Management | **Sí** — `claude-md-management`, Anthropic | `NOT_APPLICABLE` — `CLAUDE.md` ya existe y se mantiene a mano |
| Security Guidance | **Sí** — `claude-security`, Anthropic | `REDUNDANT` — ya disponible como `/security-review` |
| fakechat | **Sí** — `fakechat`, Anthropic | `NOT_APPLICABLE` — chat local para probar notificaciones |
| Pydantic AI | **No** — lo que existe es `logfire` de Pydantic (observabilidad Python) | `NOT_APPLICABLE` — el backend de IA es TypeScript |
| TypeScript LSP | **No aparece** — sí hay LSP de C, C#, Go, Java, Kotlin, Lua | `NOT_APPLICABLE` |
| Superpowers | **No existe** en fuentes oficiales | `UNSAFE` — sin procedencia verificable |
| Ralph Loop | **No existe** en fuentes oficiales | `UNSAFE` — sin procedencia verificable |
| PR Review Toolkit | **No existe** con ese nombre | `UNSAFE` — sin procedencia verificable |
| Plugin Developer Toolkit | **No existe** con ese nombre | `UNSAFE` — sin procedencia verificable |
| SearchFit SEO | **No existe** en fuentes oficiales | `UNSAFE` — sin procedencia verificable |

`UNSAFE` aquí no acusa a nadie: significa **no he podido verificar qué es**, y
esa es razón suficiente para no instalarlo.

## Lo descubierto que sí aporta y no estaba en la lista

Las cuatro Skills de documentos de `anthropics/skills` — `pdf`, `docx`, `xlsx`,
`pptx` — no venían propuestas y son de las más útiles para una agencia: informes,
propuestas y hojas de cálculo son entregables reales, no adornos.

`VERIFIED_FREE_SAFE`, **instaladas**, y asignadas a `reporting`, `sales` y
`ceo_supervisor`, que son quienes entregan al cliente.

## Cómo se instalaron, y por qué así

Por la vía oficial: `extraKnownMarketplaces` en `.claude/settings.json`
apuntando a `anthropics/skills`. **No se copió ni un fichero al árbol.**

La distinción no es de estilo. El repositorio oficial **no declara licencia** —
`license: null` en la API de GitHub, y no hay fichero `LICENSE`. Sin licencia,
copiar los ficheros dentro del repositorio de un cliente sería redistribuir
código ajeno sin permiso. Instalarlos por el mecanismo con el que Anthropic los
distribuye es usarlos, que es otra cosa distinta.

Ese mismo motivo descarta la opción de «extraer el conocimiento útil»: sin
licencia, extraer también es copiar.

## Auditoría de `webapp-testing`, la de más alcance

Es la única de las ocho que **ejecuta algo**, así que es la única que merece
párrafo propio.

| | |
|---|---|
| Qué hace | Automatiza un navegador Chromium con Playwright para comprobar una web |
| Cuenta o pago | Ninguno |
| Red | Solo `localhost`. Está diseñada para desarrollo local, no para producción |
| Filesystem | Lee HTML y escribe capturas |
| Instalación | Playwright descarga binarios de Chromium en el primer uso |
| Secretos | No recibe ninguno |

**El binario descargado es la parte que hay que tener presente.** Viene del CDN
de Playwright (Microsoft) y es el mecanismo estándar de la herramienta, pero es
descarga de un ejecutable, y eso se dice en vez de esconderlo.

Por eso lleva **mínimo privilegio**: solo `qa` y `development`. Un navegador que
puede ir a cualquier URL es superficie de SSRF y de inyección por el contenido de
la propia página; el agente de contenido y el de redes no lo necesitan y no lo
tienen. Hay una prueba que falla si alguien se lo da.

## Resumen

| Clasificación | Cuántas |
|---|---|
| `VERIFIED_FREE_SAFE` · instaladas | **8** |
| `REDUNDANT` | 4 |
| `NOT_APPLICABLE` | 7 |
| `UNSAFE` (sin procedencia verificable) | 5 |
| `PENDIENTE_DE_REVISION` | 1 (`chrome-devtools-mcp`) |
| `BLOCKED_EXTERNALLY` / `BLOCKED_ON_FOUNDER` | 10 (tabla anterior) |

Coste externo nuevo: **0 €**.
