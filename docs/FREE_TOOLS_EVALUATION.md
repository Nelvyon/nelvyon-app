# Free Tools Evaluation — NELVYON

> Investigación **solo lectura** · **2026-07-24** · tip `60bdd1bd`  
> Fuentes revisadas (sin instalar): itsfree.dev · awesome-selfhosted.net · awesome-selfhosted GH · topics/self-hosted · alternativeto · paidx · awesomeopensource · sindresorhus/awesome · Docker Hub · Hugging Face models  
> **Prohibido** descargar/instalar/conectar/desplegar sin necesidad demostrada + ADR + aprobación CTO.  
> **Prohibido** APIs de pago, créditos OpenAI, puertos públicos, duplicar Nelvyon.

Decisiones: `REJECT` | `DEFER` | `WATCH` | `PROPOSE` (requiere ADR + OK CTO antes de instalar).

---

## Criterios

| Criterio | Exigencia |
|----------|-----------|
| Licencia | OSS permisiva/copyleft clara (MIT/Apache/GPL/AGPL) |
| Mantenimiento | Actividad reciente · comunidad real |
| Coste incremental | **0** (self-host en infra ya pagada; sin SaaS metered) |
| Riesgo | Sin egress privado → público · sin secretos en docs |
| Duplicidad | No reemplazar CRM/packs/workflows/portal ya reales |
| Compatibilidad | Node/Python/Postgres monorepo · Ollama local · Tailscale only |

---

## Tabla de evaluación

| herramienta | función | licencia | mantenimiento | coste real | riesgo | duplicidad con NELVYON | compatibilidad | decisión |
|-------------|---------|----------|---------------|------------|--------|------------------------|----------------|----------|
| **Ollama** (ya en uso) | Inferencia local LLM | MIT | Alto | 0 (HW propio) | Bajo si solo Tailscale | Núcleo IA mesh | Alta | **KEEP** (ya verificado) |
| **Listmonk** | Newsletters self-host | AGPL-3.0 | Alto | 0 + SMTP | Medio (otro stack Go) | Alta vs SES campañas + welcome pack | Media | **DEFER** — SES/packs cubren; no instalar |
| **Mautic** | Marketing automation PHP | GPL | Alto | 0 + ops PHP pesado | Alto (superficie + deps) | Muy alta vs workflows+CRM+email | Baja (PHP paralelo) | **REJECT** — duplica plataforma |
| **Helio** (achref-soua/helio) | Growth CDP+journeys+CRM | AGPL-3.0 | Temprano (v2 2026) | 0 + BYO SMTP/AI | Medio-alto (madurez) | Crítica — clona HubSpot/Nelvyon | Media | **REJECT** — no sustituir OS; observar |
| **Twenty CRM** | CRM moderno | AGPL-3.0? / ver repo | Alto | 0 | Medio | Alta vs SaaS CRM | Media | **REJECT** — CRM SaaS ya real |
| **EspoCRM** | CRM SMB | AGPL | Alto | 0 | Medio | Alta | Baja | **REJECT** |
| **Chatwoot** | Soporte omnicanal | MIT | Alto | 0 | Medio | Parcial vs chatbot+inbox | Media | **WATCH** — solo si tickets OS lo exigen |
| **Typebot** | Chatbots visuales | AGPL | Alto | 0 | Medio | Alta vs NELVYON-CHATBOT | Media | **REJECT** — SKU chatbot verificado |
| **n8n** | Automatización visual | Sustainable Use / fair-code | Alto | 0 self-host · cloud pago | Medio (licencia cloud) | Alta vs SaasWorkflowService | Media | **DEFER** — motor workflows ya existe |
| **Matomo** | Analytics privacidad | GPL | Alto | 0 | Bajo | Baja (analytics pack usa GA4) | Alta | **REJECT/DEFER** — ADR-048 |
| **Umami** | Analytics ligero | MIT | Alto | 0 | Bajo | Baja | Alta | **REJECT/DEFER** — ADR-048 |
| **Plausible** | Analytics | AGPL | Alto | 0 self-host · cloud pago | Bajo | Baja | Alta | **WATCH** — AGPL + ops |
| **PostHog** | Product analytics | MIT | Alto | 0 self-host · cloud metered | Medio (complejidad) | Media | Media | **DEFER** — pesado vs necesidad |
| **Metabase** | BI SQL | AGPL | Alto | 0 | Bajo | Baja (reporting beta) | Alta | **WATCH** — tras analytics-setup cert |
| **Cal.com** | Scheduling | AGPL | Alto | 0 | Medio | Parcial vs citas chatbot | Media | **WATCH** |
| **Ghost** | CMS/blog | MIT | Alto | 0 | Medio | Media vs content packs | Media | **REJECT** por ahora |
| **Strapi** | Headless CMS | MIT/Enterprise | Alto | 0 community | Medio | Media | Media | **DEFER** |
| **Directus** | Data platform / CMS | BSL/GPL variantes | Alto | 0 | Medio (licencia) | Media | Media | **DEFER** — revisar licencia exacta |
| **Grafana** | Dashboards | AGPL | Alto | 0 | Bajo | Baja | Alta | **WATCH** — observabilidad futura |
| **Uptime Kuma** | Healthchecks | MIT | Alto | 0 | Bajo | Baja vs health live/ready | Alta | **WATCH** — opcional ops |
| **Hoppscotch** | API client | MIT | Alto | 0 | Bajo | Nula (dev tool) | Alta | **REJECT** producto — usar localmente si ops |
| **Hugging Face models** | Pesos open-weight | Model-dependent | Alto | 0 download | Medio (disk/GPU) | Baja si Ollama ya sirve 3b/8b | Alta vía Ollama | **KEEP pattern** — solo modelos open vía Ollama; **no** HF Inference API de pago |
| **itsfree.dev SaaS freemium** (Resend, Brevo free tiers, AI Studio, etc.) | Email/IA cloud free | Propietario | — | Free tier → paid | Alto (vendor + egress) | Alta | N/A | **REJECT** — viola no-pago / no OpenAI-like |
| **Docker Hub public images** | Distribución | N/A | — | 0 pull | Medio (supply chain) | — | — | **WATCH** — solo imágenes pinneadas si ADR aprueba tool |

---

## Propuestas (requieren ADR + OK CTO — **no instaladas**)

### P1 — Analytics self-host (Matomo **o** Umami) — **REJECT/DEFER**

| Campo | Valor |
|-------|-------|
| Necesidad | Cubierta por `analytics-setup-pack` + GA4/GSC existentes (ADR-048) |
| Decisión | **REJECT/DEFER** · no instalar · reevaluar solo si hay brecha demostrada |
| Coste / riesgo | Evita duplicidad, mantenimiento y coste ops |

### P2 — Chatwoot (solo si soporte tickets OS se prioriza)

| Campo | Valor |
|-------|-------|
| Necesidad | Hoy chatbot SKU OK; inbox SaaS existe |
| Valor | Omnicanal real |
| Decisión | **WATCH** · no instalar hasta Fase C support tickets |

---

## Fuentes consultadas (investigación)

| Fuente | Uso |
|--------|-----|
| https://itsfree.dev/es | Freemium SaaS → casi todo **REJECT** (vendor/pago) |
| https://awesome-selfhosted.net/ | Inventario Listmonk, Mautic, Matomo, Umami, Twenty, Typebot, … |
| https://github.com/awesome-selfhosted/awesome-selfhosted | Idem upstream |
| https://github.com/topics/self-hosted | Señal de popularidad |
| https://alternativeto.net/ | Alternativas HubSpot/Mailchimp (cruzado mental) |
| https://paidx.org/ | Directorio OSS (señal) |
| https://awesomeopensource.com/ | Señal |
| https://github.com/sindresorhus/awesome | Listas generales (no instalar) |
| https://hub.docker.com/ | Solo si ADR aprueba imagen pinneada |
| https://huggingface.co/models | Solo pesos open vía Ollama; no API Inference de pago |

---

## Conclusión

- **Nada instalado** en esta fase.  
- Nelvyon ya cubre CRM, email SES, workflows, packs OS, portal, mesh Ollama.  
- Única propuesta con valor neto razonable: **analytics self-host** (Matomo/Umami) tras certificar necesidad del pack analytics — **pendiente CTO**.  
- Helio/Mautic/Twenty **REJECT** por duplicidad estructural.
