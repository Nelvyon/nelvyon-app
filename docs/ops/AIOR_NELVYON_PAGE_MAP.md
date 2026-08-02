# AIOR → NELVYON — selección definitiva de composiciones

> **2026-08-02** · Base visual AIOR aprobada · **una sola Home** · resto = páginas internas  
> Sin publicar 10 homes duplicadas · Sin deploy hasta gates OK

## Homes AIOR — veredicto

| # | Demo AIOR | Uso NELVYON |
|---|---|---|
| 01 | AI Startup | **Descartada como Home** (robots / hype). Solo referencia de bloques “how it works” si hace falta |
| 02 | AI Chatbot | **Descartada como Home** (robot). Bloques chat → página IA opcional |
| 03 | Image Generate | **Excluida** |
| 04 | AI Writer | Secciones copy → `/agencia` o recursos |
| 05 | Business Intelligence | **Home**: hero producto + dashboard; analytics |
| 06 | AI Agent | Página `/producto/agentes` o `/producto/ia` |
| 07 | Productivity | Chrome nav limpia + features → shell |
| 08 | Chatbot tool | Automatizaciones / inbox |
| 09 | Cloud Based SaaS | **Home spine** (hero-9, tabs soluciones, features, pricing) |
| 10 | SaaS Product Showcase | Página `/producto` (product-led) |
| 11 | Finance crypto | **Excluida** |

## Home principal (única)

**Composición:** Cloud SaaS (09) como columna vertebral + hero/dashboard de BI (05) + bloques agentes/automatización de 06/08 **sin robots**.

Secciones Home (orden):

1. Header AIOR layout9 → nav NELVYON  
2. Hero-9 (sin estrellas falsas, sin 3D) + captura Dashboard real  
3. Capas/pilares (Agencia · SaaS · IA · Automatización · Enterprise) — no logos de clientes inventados  
4. Tabs soluciones (CRM / Workflows / IA / Campañas) + capturas reales  
5. Grid capacidades SaaS  
6. Bloque Agencia + packs OS  
7. Proof stats **solo métricas de producto reales** (capas, QA≥85, planes €) — sin clientes/premios inventados  
8. Precios SaaS teaser + CTA Agencia presupuesto  
9. FAQ real  
10. CTA contacto  
11. Footer  

**Eliminado de demos:** testimonials falsos, brand logos fake, “1850+ reviews”, robots, image-gen, crypto.

## Mapa páginas internas

| Ruta NELVYON | Composición AIOR de referencia |
|---|---|
| `/` | Home única (arriba) |
| `/agencia` | About + services + process (writer/agency blocks) |
| `/producto` | SaaS Product Showcase (10) |
| `/producto/ia`, `/producto/agentes` | AI Agent (06) sin robot |
| `/producto/workflows` | Chatbot-tool / automation sections (08) |
| `/producto/crm` … | Features + module detail + saas-shots |
| `/enterprise` | BI corporate sections (05) |
| `/precios` | pricing.html AIOR |
| `/contacto` | contact.html + form real Next API |
| `/integraciones` | integrations.html |
| `/sectores`, `/casos-de-uso` | case-studies layouts |
| `/recursos`, `/blog` | blog layouts |
| Legales | páginas existentes Next |

## Integración técnica

- CSS AIOR slim en `public/brand/public/aior/` (~26 MB)  
- React en `features/public-web` (shell + Home + core pages)  
- **Hecho:** sin redirect `/` → `/www/`; dump `/www/` **purgado**  
- Capturas: `/brand/public/saas-shots/*.webp`  
- Core local vivo: `/` · `/agencia` · `/producto` · `/producto/ia` · `/enterprise` · `/precios` · `/contacto`  
- Pendiente: resto de rutas internas + ModuleDetailPage + gates eslint/build/LH + OK CEO antes de deploy  

