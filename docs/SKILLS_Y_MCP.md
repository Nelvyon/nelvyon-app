# Skills y MCP de NELVYON — inventario auditado

Estado a 2026-08-24. Rama `bloque4-webhooks`.

## Lo que se ha hecho, y lo que deliberadamente no

**Se han construido 16 Skills propias** con el estándar de NELVYON, repartidas
entre los agentes con mínimo privilegio y vigiladas por
`backend/private-ai/__tests__/registroDeSkills.test.ts`.

**No se ha instalado ninguna Skill, plugin ni MCP de terceros.** No es dejadez;
es la política que el propio encargo fija, aplicada:

> «NO instales automáticamente cualquier repositorio encontrado en Internet.
> Si una Skill puede ejecutar código o tocar credenciales, trátala como código
> no confiable hasta revisarla.»

A eso se suma una razón de método: meter código de terceros en el árbol mientras
está bajo certificación contamina el SHA que se está certificando. Lo correcto es
cerrar el bloque y hacer la incorporación como un trabajo con su propia puerta.

Y una tercera, la que más pesa: **una Skill de terceros que se instala sin leerla
es exactamente el vector de inyección que este bloque acaba de cerrar por dentro.**
Habría sido incoherente arreglar la inyección por RAG y abrir la puerta por el
lado de las herramientas el mismo día.

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

## MCP y herramientas — evaluación, sin instalar

Cada fila dice qué haría falta y por qué está donde está. Ninguna se ha
instalado.

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

### Los dos candidatos sin coste ni cuenta

`Playwright` y `Lighthouse` son los únicos de la lista que pueden funcionar en
local, sin cuenta y sin gasto. Son también los que más falta hacen: sin ellos,
`nelvyon-web-qa` y `nelvyon-performance` describen cómo comprobar cosas que hoy
nadie ejecuta automáticamente.

Ese es el trabajo natural del Bloque 4, con su propia revisión de permisos de red.

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
