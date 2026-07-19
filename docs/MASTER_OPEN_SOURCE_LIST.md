# MASTER LIST — Open Source para NELVYON

> **Fase:** Investigación · **Sin instalación** · Generado: 2026-07-15  
> **Catálogo JSON:** `docs/master-open-source-catalog.json` (480 proyectos)

---

## Resumen ejecutivo

| Métrica | Valor |
|---|---|
| Proyectos analizados | **480** |
| INTEGRAR AHORA | 47 |
| INTEGRAR MÁS ADELANTE | 328 |
| SOLO LABORATORIO | 86 |
| DESCARTAR | 19 |

**Contexto NELVYON:** Next.js 15, Node 20, Postgres 16, FastAPI, Ollama, pgvector, Railway, PRIVATE_MODE  
**Capas:** SaaS /saas · OS /os · Agency Portal /portal

---

## Metodología

1. Repositorio oficial verificado (GitHub primary).
2. Licencia evaluada para uso comercial SaaS multi-tenant.
3. Mantenimiento y comunidad (snapshot 2026-07).
4. Compatibilidad Windows + Docker + `PRIVATE_MODE=1`.
5. **Un solo ganador** por capacidad duplicada (`dedupeWinner: true`).
6. Sin descarga ni instalación en esta fase.

---

## P0 — INTEGRAR AHORA (prioridad máxima)

| Proyecto | Categoría | Qué aporta |
|---|---|---|
| [Ollama](https://github.com/ollama/ollama) | llm-inference, local-ai | Core PRIVATE_MODE inference — already integrated Phase 2. |
| [pgvector](https://github.com/pgvector/pgvector) | rag, vector-db, postgres | Core RAG store — already in Phase 2 LocalVectorStore on Postgres 16. |
| [PostgreSQL](https://github.com/postgres/postgres) | database, relational | Core DB Postgres 16 — SaaS tenants, packs, pgvector RAG. |
| [Redis](https://github.com/redis/redis) | database, cache | Session cache, BullMQ queues, rate limiting on Railway. |
| [PgBouncer](https://github.com/pgbouncer/pgbouncer) | database, pooling | Essential on Railway for Next.js serverless connection limits. |
| [Docker](https://github.com/moby/moby) | containers, devops | Local-ai stack, Ollama, Railway deploys — foundation layer. |
| [GitHub Actions](https://github.com/actions/runner) | devops, ci-cd | CI for vitest, Trivy, router soak on Windows runner. |
| [Docker Compose](https://github.com/docker/compose) | devops, containers | local-ai full stack: Ollama, Postgres, observability. |
| [Railway CLI](https://github.com/railwayapp/cli) | devops, deploy | Primary deploy target — already in prod workflow. |
| [FFmpeg](https://github.com/FFmpeg/FFmpeg) | media, video, audio | Video pack transcoding, thumbnails, and ad creative processing. |
| [shadcn/ui](https://github.com/shadcn-ui/ui) | ui, react, components | Primary UI kit for SaasShellLayout and portal refresh. |
| [Radix UI](https://github.com/radix-ui/primitives) | ui, react, accessibility | Foundation under shadcn/ui — direct use for custom SaaS components. |
| [TanStack Query](https://github.com/TanStack/query) | ui, react, data-fetching | Standard data layer for all /saas/* pages and portal BFF. |
| [TanStack Table](https://github.com/TanStack/table) | ui, react, data-grid | CRM, pipeline, and campaign list tables in SaaS shell. |
| [React Hook Form](https://github.com/react-hook-form/react-hook-form) | ui, react, forms | All SaaS forms — CRM, campaigns, workflows, billing. |
| [Tailwind CSS](https://github.com/tailwindlabs/tailwindcss) | ui, css, design-system | Core styling — Tailwind v4 across all SaaS and OS pages. |
| [Lucide](https://github.com/lucide-icons/lucide) | ui, icons | Icon system for SaasSidebar and portal UI. |
| [Playwright](https://github.com/microsoft/playwright) | testing, e2e, browser | Primary E2E for /saas/*, portal, and OS pack smoke tests. |
| [Vitest](https://github.com/vitest-dev/vitest) | testing, unit | Core test runner — 489+ tests in backend/saas suite. |
| [Testing Library](https://github.com/testing-library/react-testing-library) | testing, unit, react | Component tests for SaasShellLayout and CRM features. |
| [pytest](https://github.com/pytest-dev/pytest) | testing, python | FastAPI pack agent test suite in backend/tests. |
| [ESLint](https://github.com/eslint/eslint) | devtools, linting | Core lint for Next.js 15 monorepo — zero TS errors policy. |
| [Prettier](https://github.com/prettier/prettier) | devtools, formatting | Code format standard across TS/Python (via plugin). |
| [TypeScript](https://github.com/microsoft/TypeScript) | devtools, language | TS 5.9 strict — tsc --noEmit gate with 0 errors. |
| [Vite](https://github.com/vitejs/vite) | devtools, bundler, dev-server | Vitest and script bundling; Next.js primary for app. |
| [FastAPI](https://github.com/fastapi/fastapi) | api, python, framework | Core Python API layer — backend/main.py pack agents port 8000. |
| [Playwright Browser Automation](https://github.com/microsoft/playwright) | browser-automation, testing | Cross-browser automation backbone for agents and E2E. |

---

## Índice por categoría

### ui (27 proyectos)

**Ganadores:** `open-webui`, `element-web`, `shadcn-ui`, `radix-ui`, `tanstack-query`

<details>
<summary>Ver todos (27)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Jan](https://github.com/janhq/jan) | AGPL-3.0 | DESCARTAR | P3 |
| [shadcn/ui](https://github.com/shadcn-ui/ui) | MIT | INTEGRAR AHORA | P0 |
| [Radix UI](https://github.com/radix-ui/primitives) | MIT | INTEGRAR AHORA | P0 |
| [TanStack Query](https://github.com/TanStack/query) | MIT | INTEGRAR AHORA | P0 |
| [TanStack Table](https://github.com/TanStack/table) | MIT | INTEGRAR AHORA | P0 |
| [Framer Motion](https://github.com/motiondivision/motion) | MIT | INTEGRAR AHORA | P1 |
| [React Hook Form](https://github.com/react-hook-form/react-hook-form) | MIT | INTEGRAR AHORA | P0 |
| [Zustand](https://github.com/pmndrs/zustand) | MIT | INTEGRAR AHORA | P1 |
| [Tailwind CSS](https://github.com/tailwindlabs/tailwindcss) | MIT | INTEGRAR AHORA | P0 |
| [Lucide](https://github.com/lucide-icons/lucide) | ISC | INTEGRAR AHORA | P0 |
| [Sonner](https://github.com/emilkowalski/sonner) | MIT | INTEGRAR AHORA | P1 |
| [Open WebUI](https://github.com/open-webui/open-webui) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [Element](https://github.com/element-hq/element-web) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [TanStack Router](https://github.com/TanStack/router) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [Tremor](https://github.com/tremorlabs/tremor) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P1 |
| [Magic UI](https://github.com/magicuidesign/magicui) | MIT | INTEGRAR MÁS ADELANTE | P1 |
| [Aceternity UI](https://github.com/aceternity-ui/components) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [React Aria](https://github.com/adobe/react-spectrum) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [Headless UI](https://github.com/tailwindlabs/headlessui) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [HeroUI](https://github.com/heroui-inc/heroui) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [Recharts](https://github.com/recharts/recharts) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [cmdk](https://github.com/pacocoursey/cmdk) | MIT | INTEGRAR MÁS ADELANTE | P1 |
| [Vaul](https://github.com/emilkowalski/vaul) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [Storybook](https://github.com/storybookjs/storybook) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [Chromatic](https://github.com/chromaui/chromatic-cli) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [Penpot](https://github.com/penpot/penpot) | MPL-2.0 | INTEGRAR MÁS ADELANTE | P1 |
| [react-colorful](https://github.com/omgovich/react-colorful) | MIT | INTEGRAR MÁS ADELANTE | P2 |

</details>

### api (27 proyectos)

**Ganadores:** `r2r`, `emailengine`, `evolution-api`, `wiremock`, `msw`

<details>
<summary>Ver todos (27)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [MSW](https://github.com/mswjs/msw) | MIT | INTEGRAR AHORA | P1 |
| [FastAPI](https://github.com/fastapi/fastapi) | MIT | INTEGRAR AHORA | P0 |
| [R2R](https://github.com/SciPhi-AI/R2R) | MIT | INTEGRAR MÁS ADELANTE | P1 |
| [EmailEngine](https://github.com/postalsys/emailengine) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [Evolution API](https://github.com/EvolutionAPI/evolution-api) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P1 |
| [WAHA](https://github.com/devlikeapro/waha) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [Creatomate API Pattern](https://github.com/creatomate/creatomate-node) | MIT | INTEGRAR MÁS ADELANTE | P3 |
| [WireMock](https://github.com/wiremock/wiremock) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [Hasura](https://github.com/hasura/graphql-engine) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P1 |
| [PostgREST](https://github.com/PostgREST/postgrest) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [Kong Gateway](https://github.com/Kong/kong) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P1 |
| [Tyk](https://github.com/TykTechnologies/tyk) | MPL-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [Apache APISIX](https://github.com/apache/apisix) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [KrakenD](https://github.com/krakend/krakend-ce) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [GraphQL Mesh](https://github.com/ardatan/graphql-mesh) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [OpenAPI Generator](https://github.com/OpenAPITools/openapi-generator) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [Swagger UI](https://github.com/swagger-api/swagger-ui) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [Nango](https://github.com/NangoHQ/nango) | Elastic-2.0 | INTEGRAR MÁS ADELANTE | P1 |
| [Svix](https://github.com/svix/svix-webhooks) | MIT | INTEGRAR MÁS ADELANTE | P1 |
| [Hoppscotch](https://github.com/hoppscotch/hoppscotch) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [WunderGraph](https://github.com/wundergraph/wundergraph) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [Gravitee APIM](https://github.com/gravitee-io/gravitee-api-management) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P3 |
| [Webhook.site OSS](https://github.com/webhooksite/webhook.site) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [Apollo Router](https://github.com/apollographql/router) | MIT | INTEGRAR MÁS ADELANTE | P3 |
| [Zapier Platform CLI](https://github.com/zapier/zapier-platform) | MIT | INTEGRAR MÁS ADELANTE | P3 |
| [Pomerium](https://github.com/pomerium/pomerium) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P1 |
| [Emissary-Ingress](https://github.com/emissary-ingress/emissary) | Apache-2.0 | SOLO LABORATORIO | P3 |

</details>

### testing (24 proyectos)

**Ganadores:** `greenmail`, `playwright`, `vitest`, `k6`, `locust`

<details>
<summary>Ver todos (24)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Playwright](https://github.com/microsoft/playwright) | Apache-2.0 | INTEGRAR AHORA | P0 |
| [Vitest](https://github.com/vitest-dev/vitest) | MIT | INTEGRAR AHORA | P0 |
| [Testing Library](https://github.com/testing-library/react-testing-library) | MIT | INTEGRAR AHORA | P0 |
| [MSW](https://github.com/mswjs/msw) | MIT | INTEGRAR AHORA | P1 |
| [pytest](https://github.com/pytest-dev/pytest) | MIT | INTEGRAR AHORA | P0 |
| [Playwright Browser Automation](https://github.com/microsoft/playwright) | Apache-2.0 | INTEGRAR AHORA | P0 |
| [k6](https://github.com/grafana/k6) | AGPL-3.0 | INTEGRAR MÁS ADELANTE | P1 |
| [Locust](https://github.com/locustio/locust) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [SonarQube](https://github.com/SonarSource/sonarqube) | LGPL-3.0 | INTEGRAR MÁS ADELANTE | P1 |
| [Storybook](https://github.com/storybookjs/storybook) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [Cypress](https://github.com/cypress-io/cypress) | MIT | INTEGRAR MÁS ADELANTE | P3 |
| [Jest](https://github.com/jestjs/jest) | MIT | INTEGRAR MÁS ADELANTE | P3 |
| [Pact](https://github.com/pact-foundation/pact-js) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [Testcontainers](https://github.com/testcontainers/testcontainers-node) | MIT | INTEGRAR MÁS ADELANTE | P1 |
| [Stryker Mutator](https://github.com/stryker-mutator/stryker-js) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P3 |
| [CodeQL](https://github.com/github/codeql) | MIT | INTEGRAR MÁS ADELANTE | P1 |
| [OWASP ZAP](https://github.com/zaproxy/zaproxy) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P1 |
| [Allure Report](https://github.com/allure-framework/allure2) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P3 |
| [WireMock](https://github.com/wiremock/wiremock) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [Artillery](https://github.com/artilleryio/artillery) | MPL-2.0 | INTEGRAR MÁS ADELANTE | P3 |
| [Chromatic](https://github.com/chromaui/chromatic-cli) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [Hoppscotch](https://github.com/hoppscotch/hoppscotch) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [Selenium](https://github.com/SeleniumHQ/selenium) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P3 |
| [GreenMail](https://github.com/greenmail-mail-test/greenmail) | Apache-2.0 | SOLO LABORATORIO | P3 |

</details>

### browser-automation (22 proyectos)

**Ganadores:** `puppeteer`, `playwright-scraper`, `browserless`, `selenium`, `skyvern`

<details>
<summary>Ver todos (22)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Playwright Browser Automation](https://github.com/microsoft/playwright) | Apache-2.0 | INTEGRAR AHORA | P0 |
| [Puppeteer](https://github.com/puppeteer/puppeteer) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P1 |
| [Playwright Scraper](https://github.com/microsoft/playwright) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P1 |
| [Browserless](https://github.com/browserless/browserless) | SSPL-1.0 | INTEGRAR MÁS ADELANTE | P1 |
| [Selenium](https://github.com/SeleniumHQ/selenium) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P3 |
| [Skyvern](https://github.com/Skyvern-AI/skyvern) | AGPL-3.0 | INTEGRAR MÁS ADELANTE | P1 |
| [Stagehand](https://github.com/browserbase/stagehand) | MIT | INTEGRAR MÁS ADELANTE | P1 |
| [browser-use](https://github.com/browser-use/browser-use) | MIT | INTEGRAR MÁS ADELANTE | P1 |
| [chromedp](https://github.com/chromedp/chromedp) | MIT | INTEGRAR MÁS ADELANTE | P3 |
| [Rod](https://github.com/go-rod/rod) | MIT | INTEGRAR MÁS ADELANTE | P3 |
| [puppeteer-extra](https://github.com/berstend/puppeteer-extra) | MIT | INTEGRAR MÁS ADELANTE | P3 |
| [AgentQL](https://github.com/tinyfish-io/agentql) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [Steel Browser](https://github.com/steel-dev/steel-browser) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [Botasaurus](https://github.com/omkarcloud/botasaurus) | MIT | INTEGRAR MÁS ADELANTE | P3 |
| [Selenium Grid](https://github.com/SeleniumHQ/docker-selenium) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P3 |
| [ChromeDriver](https://github.com/ChromeDriver/chromedriver) | BSD-3-Clause | INTEGRAR MÁS ADELANTE | P3 |
| [Patchright](https://github.com/Kaliiiiiiiiii-Vinyzu/patchright) | Apache-2.0 | SOLO LABORATORIO | P3 |
| [Camoufox](https://github.com/daijro/camoufox) | MPL-2.0 | SOLO LABORATORIO | P3 |
| [Appium](https://github.com/appium/appium) | Apache-2.0 | SOLO LABORATORIO | P3 |
| [Rebrowser](https://github.com/rebrowser/rebrowser-patches) | MIT | SOLO LABORATORIO | P3 |
| [nodriver](https://github.com/ultrafunkamsterdam/nodriver) | GPL-3.0 | SOLO LABORATORIO | P3 |
| [Agent-E](https://github.com/EmergenceAI/Agent-E) | Apache-2.0 | SOLO LABORATORIO | P3 |

</details>

### email (21 proyectos)

**Ganadores:** `freescout`, `listmonk`, `postal`, `mailu`, `stalwart-mail`

<details>
<summary>Ver todos (21)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Mailtrain](https://github.com/Mailtrain-org/mailtrain) | GPL-3.0 | DESCARTAR | P3 |
| [MailHog](https://github.com/mailhog/MailHog) | MIT | INTEGRAR AHORA | P1 |
| [Mailpit](https://github.com/axllent/mailpit) | MIT | INTEGRAR AHORA | P1 |
| [Suppression List Pattern](https://github.com/awsdocs/aws-doc-sdk-examples) | Apache-2.0 | INTEGRAR AHORA | P1 |
| [List-Unsubscribe Tools](https://github.com/RFC2369/list-unsubscribe) | MIT | INTEGRAR AHORA | P1 |
| [FreeScout](https://github.com/freescout-help-desk/freescout) | AGPL-3.0 | INTEGRAR MÁS ADELANTE | P3 |
| [Listmonk](https://github.com/knadh/listmonk) | AGPL-3.0 | INTEGRAR MÁS ADELANTE | P1 |
| [Postal](https://github.com/postalserver/postal) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [Keila](https://github.com/patrikx3/keila) | AGPL-3.0 | INTEGRAR MÁS ADELANTE | P2 |
| [SendPortal](https://github.com/mettle/sendportal) | MIT | INTEGRAR MÁS ADELANTE | P3 |
| [Stalwart Mail Server](https://github.com/stalwartlabs/mail-server) | AGPL-3.0 | INTEGRAR MÁS ADELANTE | P3 |
| [Haraka](https://github.com/haraka/Haraka) | MIT | INTEGRAR MÁS ADELANTE | P3 |
| [Rspamd](https://github.com/rspamd/rspamd) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P3 |
| [WildDuck](https://github.com/nodemailer/wildduck) | EUPL-1.2 | INTEGRAR MÁS ADELANTE | P3 |
| [GNU Mailman 3](https://github.com/mailman/mailman) | GPL-3.0 | INTEGRAR MÁS ADELANTE | P3 |
| [EmailEngine](https://github.com/postalsys/emailengine) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [Mailu](https://github.com/Mailu/Mailu) | MIT | SOLO LABORATORIO | P3 |
| [mailcow](https://github.com/mailcow/mailcow-dockerized) | GPL-3.0 | SOLO LABORATORIO | P3 |
| [Maddy](https://github.com/foxcpp/maddy) | GPL-3.0 | SOLO LABORATORIO | P3 |
| [PostfixAdmin](https://github.com/postfixadmin/postfixadmin) | GPL-2.0 | SOLO LABORATORIO | P3 |
| [GreenMail](https://github.com/greenmail-mail-test/greenmail) | Apache-2.0 | SOLO LABORATORIO | P3 |

</details>

### react (21 proyectos)

**Ganadores:** `atomic-crm`, `remotion`, `shadcn-ui`, `radix-ui`, `tanstack-query`

<details>
<summary>Ver todos (21)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [shadcn/ui](https://github.com/shadcn-ui/ui) | MIT | INTEGRAR AHORA | P0 |
| [Radix UI](https://github.com/radix-ui/primitives) | MIT | INTEGRAR AHORA | P0 |
| [TanStack Query](https://github.com/TanStack/query) | MIT | INTEGRAR AHORA | P0 |
| [TanStack Table](https://github.com/TanStack/table) | MIT | INTEGRAR AHORA | P0 |
| [Framer Motion](https://github.com/motiondivision/motion) | MIT | INTEGRAR AHORA | P1 |
| [React Hook Form](https://github.com/react-hook-form/react-hook-form) | MIT | INTEGRAR AHORA | P0 |
| [Zustand](https://github.com/pmndrs/zustand) | MIT | INTEGRAR AHORA | P1 |
| [Sonner](https://github.com/emilkowalski/sonner) | MIT | INTEGRAR AHORA | P1 |
| [Testing Library](https://github.com/testing-library/react-testing-library) | MIT | INTEGRAR AHORA | P0 |
| [Atomic CRM](https://github.com/marmelab/atomic-crm) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [Remotion](https://github.com/remotion-dev/remotion) | Remotion License | INTEGRAR MÁS ADELANTE | P1 |
| [TanStack Router](https://github.com/TanStack/router) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [Tremor](https://github.com/tremorlabs/tremor) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P1 |
| [Magic UI](https://github.com/magicuidesign/magicui) | MIT | INTEGRAR MÁS ADELANTE | P1 |
| [Aceternity UI](https://github.com/aceternity-ui/components) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [React Aria](https://github.com/adobe/react-spectrum) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [Headless UI](https://github.com/tailwindlabs/headlessui) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [HeroUI](https://github.com/heroui-inc/heroui) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [Recharts](https://github.com/recharts/recharts) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [cmdk](https://github.com/pacocoursey/cmdk) | MIT | INTEGRAR MÁS ADELANTE | P1 |
| [Vaul](https://github.com/emilkowalski/vaul) | MIT | INTEGRAR MÁS ADELANTE | P2 |

</details>

### scraping (21 proyectos)

**Ganadores:** `crawlee`, `scrapy`, `firecrawl`, `colly`, `puppeteer`

<details>
<summary>Ver todos (21)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [urlgrabber](https://github.com/rpm-software-management/urlgrabber) | LGPL-2.1 | DESCARTAR | P3 |
| [Cheerio](https://github.com/cheeriojs/cheerio) | MIT | INTEGRAR AHORA | P1 |
| [Crawlee](https://github.com/apify/crawlee) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P1 |
| [Scrapy](https://github.com/scrapy/scrapy) | BSD-3-Clause | INTEGRAR MÁS ADELANTE | P1 |
| [Firecrawl](https://github.com/mendableai/firecrawl) | AGPL-3.0 | INTEGRAR MÁS ADELANTE | P1 |
| [Colly](https://github.com/gocolly/colly) | BSD-3-Clause | INTEGRAR MÁS ADELANTE | P2 |
| [Puppeteer](https://github.com/puppeteer/puppeteer) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P1 |
| [Trafilatura](https://github.com/adbar/trafilatura) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P1 |
| [Katana](https://github.com/projectdiscovery/katana) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [MechanicalSoup](https://github.com/MechanicalSoup/MechanicalSoup) | MIT | INTEGRAR MÁS ADELANTE | P3 |
| [Scrapyd](https://github.com/scrapy/scrapyd) | BSD-3-Clause | INTEGRAR MÁS ADELANTE | P2 |
| [Newspaper3k](https://github.com/codelucas/newspaper) | MIT | INTEGRAR MÁS ADELANTE | P3 |
| [Mozilla Readability](https://github.com/mozilla/readability) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [Playwright Scraper](https://github.com/microsoft/playwright) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P1 |
| [Ferret](https://github.com/MontFerret/ferret) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P3 |
| [Goutte](https://github.com/FriendsOfPHP/Goutte) | MIT | INTEGRAR MÁS ADELANTE | P3 |
| [LinkChecker](https://github.com/linkchecker/linkchecker) | GPL-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [SingleFile](https://github.com/gildas-lormeau/SingleFile) | AGPL-3.0 | INTEGRAR MÁS ADELANTE | P3 |
| [Botasaurus](https://github.com/omkarcloud/botasaurus) | MIT | INTEGRAR MÁS ADELANTE | P3 |
| [HTTrack](https://github.com/xroche/httrack) | GPL-3.0 | SOLO LABORATORIO | P3 |
| [Browsertrix Crawler](https://github.com/webrecorder/browsertrix-crawler) | AGPL-3.0 | SOLO LABORATORIO | P3 |

</details>

### audio (21 proyectos)

**Ganadores:** `ffmpeg`, `whisper`, `faster-whisper`, `whisperx`, `piper`

<details>
<summary>Ver todos (21)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Mimic3](https://github.com/MycroftAI/mimic3) | AGPL-3.0 | DESCARTAR | P3 |
| [FFmpeg](https://github.com/FFmpeg/FFmpeg) | LGPL-2.1 | INTEGRAR AHORA | P0 |
| [OpenAI Whisper](https://github.com/openai/whisper) | MIT | INTEGRAR MÁS ADELANTE | P1 |
| [faster-whisper](https://github.com/SYSTRAN/faster-whisper) | MIT | INTEGRAR MÁS ADELANTE | P1 |
| [WhisperX](https://github.com/m-bain/whisperX) | BSD-2-Clause | INTEGRAR MÁS ADELANTE | P2 |
| [Piper](https://github.com/rhasspy/piper) | MIT | INTEGRAR MÁS ADELANTE | P1 |
| [Coqui TTS](https://github.com/coqui-ai/TTS) | MPL-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [LivePortrait](https://github.com/KlingTeam/LivePortrait) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [SadTalker](https://github.com/OpenTalker/SadTalker) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [Wav2Lip](https://github.com/Rudrabha/Wav2Lip) | MIT | INTEGRAR MÁS ADELANTE | P3 |
| [Vosk](https://github.com/alphacep/vosk-api) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [Silero Models](https://github.com/snakers4/silero-models) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [AudioCraft](https://github.com/facebookresearch/audiocraft) | MIT | INTEGRAR MÁS ADELANTE | P3 |
| [pyannote.audio](https://github.com/pyannote/pyannote-audio) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [VoiceFixer](https://github.com/haoheliu/voicefixer) | MIT | INTEGRAR MÁS ADELANTE | P3 |
| [XTTS v2](https://github.com/coqui-ai/TTS) | MPL-2.0 | SOLO LABORATORIO | P3 |
| [Bark](https://github.com/suno-ai/bark) | MIT | SOLO LABORATORIO | P3 |
| [OpenVoice](https://github.com/myshell-ai/OpenVoice) | MIT | SOLO LABORATORIO | P3 |
| [Fish Speech](https://github.com/fishaudio/fish-speech) | Apache-2.0 | SOLO LABORATORIO | P3 |
| [Rhasspy](https://github.com/rhasspy/rhasspy) | MIT | SOLO LABORATORIO | P3 |
| [ESPnet](https://github.com/espnet/espnet) | Apache-2.0 | SOLO LABORATORIO | P3 |

</details>

### llm-inference (20 proyectos)

**Ganadores:** `ollama`, `llama-cpp`, `vllm`, `tabby`, `open-webui`

<details>
<summary>Ver todos (20)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [LocalAI](https://github.com/mudler/LocalAI) | MIT | DESCARTAR | P3 |
| [KoboldCpp](https://github.com/LostRuins/koboldcpp) | AGPL-3.0 | DESCARTAR | P3 |
| [MLX](https://github.com/ml-explore/mlx) | MIT | DESCARTAR | P3 |
| [Jan](https://github.com/janhq/jan) | AGPL-3.0 | DESCARTAR | P3 |
| [GPT4All](https://github.com/nomic-ai/gpt4all) | MIT | DESCARTAR | P3 |
| [Ollama](https://github.com/ollama/ollama) | MIT | INTEGRAR AHORA | P0 |
| [llama.cpp](https://github.com/ggml-org/llama.cpp) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [vLLM](https://github.com/vllm-project/vllm) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [Open WebUI](https://github.com/open-webui/open-webui) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [LiteLLM](https://github.com/BerriAI/litellm) | MIT | INTEGRAR MÁS ADELANTE | P1 |
| [Transformers](https://github.com/huggingface/transformers) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [Infinity](https://github.com/michaelfeil/infinity) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [Text Embeddings Inference](https://github.com/huggingface/text-embeddings-inference) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [BentoML](https://github.com/bentoml/BentoML) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [Text Generation WebUI](https://github.com/oobabooga/text-generation-webui) | AGPL-3.0 | SOLO LABORATORIO | P3 |
| [Tabby](https://github.com/TabbyML/tabby) | Apache-2.0 | SOLO LABORATORIO | P3 |
| [ExLlamaV2](https://github.com/turboderp/exllamav2) | MIT | SOLO LABORATORIO | P3 |
| [MLC LLM](https://github.com/mlc-ai/mlc-llm) | Apache-2.0 | SOLO LABORATORIO | P3 |
| [Llamafile](https://github.com/Mozilla-Ocho/llamafile) | Apache-2.0 | SOLO LABORATORIO | P3 |
| [Ray Serve](https://github.com/ray-project/ray) | Apache-2.0 | SOLO LABORATORIO | P3 |

</details>

### agents (20 proyectos)

**Ganadores:** `langgraph`, `mcp-sdk-typescript`, `mcp-sdk-python`, `openclaw`, `semantic-kernel`

<details>
<summary>Ver todos (20)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Langflow](https://github.com/langflow-ai/langflow) | MIT | DESCARTAR | P3 |
| [Instructor](https://github.com/567-labs/instructor) | MIT | INTEGRAR AHORA | P1 |
| [LangGraph](https://github.com/langchain-ai/langgraph) | MIT | INTEGRAR MÁS ADELANTE | P1 |
| [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk) | MIT | INTEGRAR MÁS ADELANTE | P1 |
| [MCP Python SDK](https://github.com/modelcontextprotocol/python-sdk) | MIT | INTEGRAR MÁS ADELANTE | P1 |
| [CrewAI](https://github.com/crewAIInc/crewAI) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [Semantic Kernel](https://github.com/microsoft/semantic-kernel) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [Hayhooks](https://github.com/deepset-ai/haystack) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [PydanticAI](https://github.com/pydantic/pydantic-ai) | MIT | INTEGRAR MÁS ADELANTE | P1 |
| [Guardrails AI](https://github.com/guardrails-ai/guardrails) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P1 |
| [Temporal](https://github.com/temporalio/temporal) | MIT | INTEGRAR MÁS ADELANTE | P1 |
| [Mem0](https://github.com/mem0ai/mem0) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [Skyvern](https://github.com/Skyvern-AI/skyvern) | AGPL-3.0 | INTEGRAR MÁS ADELANTE | P1 |
| [browser-use](https://github.com/browser-use/browser-use) | MIT | INTEGRAR MÁS ADELANTE | P1 |
| [OpenClaw](https://github.com/openclaw/openclaw) | Apache-2.0 | SOLO LABORATORIO | P2 |
| [AutoGen](https://github.com/microsoft/autogen) | MIT | SOLO LABORATORIO | P2 |
| [Dify](https://github.com/langgenius/dify) | Apache-2.0 | SOLO LABORATORIO | P2 |
| [Flowise](https://github.com/FlowiseAI/Flowise) | Apache-2.0 | SOLO LABORATORIO | P3 |
| [Sim](https://github.com/simstudioai/sim) | Apache-2.0 | SOLO LABORATORIO | P3 |
| [Agent-E](https://github.com/EmergenceAI/Agent-E) | Apache-2.0 | SOLO LABORATORIO | P3 |

</details>

### database (20 proyectos)

**Ganadores:** `postgresql`, `redis`, `clickhouse`, `duckdb`, `timescaledb`

<details>
<summary>Ver todos (20)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [SurrealDB](https://github.com/surrealdb/surrealdb) | BSL-1.0 | DESCARTAR | P3 |
| [PostgreSQL](https://github.com/postgres/postgres) | PostgreSQL | INTEGRAR AHORA | P0 |
| [Redis](https://github.com/redis/redis) | RSALv2 OR SSPL-1.0 | INTEGRAR AHORA | P0 |
| [PgBouncer](https://github.com/pgbouncer/pgbouncer) | ISC | INTEGRAR AHORA | P0 |
| [Valkey](https://github.com/valkey-io/valkey) | BSD-3-Clause | INTEGRAR MÁS ADELANTE | P1 |
| [ClickHouse](https://github.com/ClickHouse/ClickHouse) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [DuckDB](https://github.com/duckdb/duckdb) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [TimescaleDB](https://github.com/timescale/timescaledb) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [QuestDB](https://github.com/questdb/questdb) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P3 |
| [SQLite](https://github.com/sqlite/sqlite) | blessing | INTEGRAR MÁS ADELANTE | P3 |
| [Litestream](https://github.com/benbjohnson/litestream) | MIT | INTEGRAR MÁS ADELANTE | P3 |
| [pgBackRest](https://github.com/pgbackrest/pgbackrest) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [WAL-G](https://github.com/wal-g/wal-g) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P1 |
| [Hasura](https://github.com/hasura/graphql-engine) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P1 |
| [PostgREST](https://github.com/PostgREST/postgrest) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [PocketBase](https://github.com/pocketbase/pocketbase) | MIT | SOLO LABORATORIO | P3 |
| [Supabase](https://github.com/supabase/supabase) | Apache-2.0 | SOLO LABORATORIO | P3 |
| [CockroachDB](https://github.com/cockroachdb/cockroach) | BSL-1.0 | SOLO LABORATORIO | P3 |
| [Flyway](https://github.com/flyway/flyway) | Apache-2.0 | SOLO LABORATORIO | P3 |
| [ParadeDB](https://github.com/paradedb/paradedb) | AGPL-3.0 | SOLO LABORATORIO | P3 |

</details>

### analytics (20 proyectos)

**Ganadores:** `clickhouse`, `duckdb`, `matomo`, `plausible`, `umami`

<details>
<summary>Ver todos (20)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Open Web Analytics](https://github.com/Open-Web-Analytics/Open-Web-Analytics) | GPL-2.0 | DESCARTAR | P3 |
| [ClickHouse](https://github.com/ClickHouse/ClickHouse) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [DuckDB](https://github.com/duckdb/duckdb) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [Matomo](https://github.com/matomo-org/matomo) | GPL-3.0 | INTEGRAR MÁS ADELANTE | P1 |
| [Plausible Analytics](https://github.com/plausible/analytics) | AGPL-3.0 | INTEGRAR MÁS ADELANTE | P1 |
| [Umami](https://github.com/umami-software/umami) | MIT | INTEGRAR MÁS ADELANTE | P1 |
| [Metabase](https://github.com/metabase/metabase) | AGPL-3.0 | INTEGRAR MÁS ADELANTE | P1 |
| [Apache Superset](https://github.com/apache/superset) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [PostHog](https://github.com/PostHog/posthog) | MIT | INTEGRAR MÁS ADELANTE | P1 |
| [Snowplow](https://github.com/snowplow/snowplow) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P3 |
| [GoAccess](https://github.com/allinurl/goaccess) | MIT | INTEGRAR MÁS ADELANTE | P3 |
| [Redash](https://github.com/getredash/redash) | BSD-2-Clause | INTEGRAR MÁS ADELANTE | P3 |
| [Lightdash](https://github.com/lightdash/lightdash) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [Evidence](https://github.com/evidence-dev/evidence) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [Cube](https://github.com/cube-js/cube) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [GrowthBook](https://github.com/growthbook/growthbook) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [Tracardi](https://github.com/Tracardi/tracardi) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [OpenReplay](https://github.com/openreplay/openreplay) | MIT | INTEGRAR MÁS ADELANTE | P3 |
| [Grafana OnCall](https://github.com/grafana/oncall) | AGPL-3.0 | INTEGRAR MÁS ADELANTE | P3 |
| [AWStats](https://github.com/eldy/awstats) | GPL-3.0 | SOLO LABORATORIO | P3 |

</details>

### social (20 proyectos)

**Ganadores:** `matrix-synapse`, `element-web`, `rocket-chat`, `mattermost`, `evolution-api`

<details>
<summary>Ver todos (20)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Matrix Synapse](https://github.com/element-hq/synapse) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [Element](https://github.com/element-hq/element-web) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [Rocket.Chat](https://github.com/RocketChat/Rocket.Chat) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [Mattermost](https://github.com/mattermost/mattermost) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [Evolution API](https://github.com/EvolutionAPI/evolution-api) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P1 |
| [WAHA](https://github.com/devlikeapro/waha) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [Typebot](https://github.com/baptisteArno/typebot.io) | AGPL-3.0 | INTEGRAR MÁS ADELANTE | P1 |
| [Botpress](https://github.com/botpress/botpress) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [Rasa](https://github.com/RasaHQ/rasa) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P3 |
| [ntfy](https://github.com/binwiederhier/ntfy) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [Gotify](https://github.com/gotify/server) | MIT | INTEGRAR MÁS ADELANTE | P3 |
| [Apprise](https://github.com/caronc/apprise) | BSD-2-Clause | INTEGRAR MÁS ADELANTE | P2 |
| [Jitsi Meet](https://github.com/jitsi/jitsi-meet) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P3 |
| [LiveKit](https://github.com/livekit/livekit) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [Conduit](https://github.com/conduit-rust/conduit) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P3 |
| [Dendrite](https://github.com/element-hq/dendrite) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P3 |
| [Zulip](https://github.com/zulip/zulip) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P3 |
| [mautrix-whatsapp](https://github.com/mautrix/whatsapp) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P3 |
| [Shoutrrr](https://github.com/containrrr/shoutrrr) | MIT | INTEGRAR MÁS ADELANTE | P3 |
| [signal-cli](https://github.com/AsamK/signal-cli) | GPL-3.0 | SOLO LABORATORIO | P3 |

</details>

### media (20 proyectos)

**Ganadores:** `comfyui`, `invokeai`, `ffmpeg`, `remotion`, `opencv`

<details>
<summary>Ver todos (20)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [FFmpeg](https://github.com/FFmpeg/FFmpeg) | LGPL-2.1 | INTEGRAR AHORA | P0 |
| [ComfyUI](https://github.com/comfyanonymous/ComfyUI) | GPL-3.0 | INTEGRAR MÁS ADELANTE | P2 |
| [InvokeAI](https://github.com/invoke-ai/InvokeAI) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [Remotion](https://github.com/remotion-dev/remotion) | Remotion License | INTEGRAR MÁS ADELANTE | P1 |
| [OpenCV](https://github.com/opencv/opencv) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [MoviePy](https://github.com/Zulko/moviepy) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [HandBrake](https://github.com/HandBrake/HandBrake) | GPL-2.0 | INTEGRAR MÁS ADELANTE | P3 |
| [Diffusers](https://github.com/huggingface/diffusers) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [Real-ESRGAN](https://github.com/xinntao/Real-ESRGAN) | BSD-3-Clause | INTEGRAR MÁS ADELANTE | P2 |
| [Wand](https://github.com/emcconville/wand) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [Lottie](https://github.com/airbnb/lottie-web) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [Creatomate API Pattern](https://github.com/creatomate/creatomate-node) | MIT | INTEGRAR MÁS ADELANTE | P3 |
| [Stable Diffusion WebUI](https://github.com/AUTOMATIC1111/stable-diffusion-webui) | AGPL-3.0 | SOLO LABORATORIO | P3 |
| [Fooocus](https://github.com/lllyasviel/Fooocus) | GPL-3.0 | SOLO LABORATORIO | P3 |
| [kohya_ss](https://github.com/bmaltais/kohya_ss) | Apache-2.0 | SOLO LABORATORIO | P3 |
| [AnimateDiff](https://github.com/guoyww/AnimateDiff) | Apache-2.0 | SOLO LABORATORIO | P3 |
| [Jellyfin](https://github.com/jellyfin/jellyfin) | GPL-2.0 | SOLO LABORATORIO | P3 |
| [Streamlink](https://github.com/streamlink/streamlink) | BSD-2-Clause | SOLO LABORATORIO | P3 |
| [OBS Studio](https://github.com/obsproject/obs-studio) | GPL-2.0 | SOLO LABORATORIO | P3 |
| [Shotcut](https://github.com/mltframework/shotcut) | GPL-3.0 | SOLO LABORATORIO | P3 |

</details>

### devtools (20 proyectos)

**Ganadores:** `eslint`, `biome`, `turborepo`, `changesets`, `prettier`

<details>
<summary>Ver todos (20)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [ESLint](https://github.com/eslint/eslint) | MIT | INTEGRAR AHORA | P0 |
| [Prettier](https://github.com/prettier/prettier) | MIT | INTEGRAR AHORA | P0 |
| [TypeScript](https://github.com/microsoft/TypeScript) | Apache-2.0 | INTEGRAR AHORA | P0 |
| [Husky](https://github.com/typicode/husky) | MIT | INTEGRAR AHORA | P1 |
| [lint-staged](https://github.com/lint-staged/lint-staged) | MIT | INTEGRAR AHORA | P1 |
| [esbuild](https://github.com/evanw/esbuild) | MIT | INTEGRAR AHORA | P1 |
| [SWC](https://github.com/swc-project/swc) | Apache-2.0 | INTEGRAR AHORA | P1 |
| [Vite](https://github.com/vitejs/vite) | MIT | INTEGRAR AHORA | P0 |
| [Biome](https://github.com/biomejs/biome) | MIT | INTEGRAR MÁS ADELANTE | P1 |
| [Turborepo](https://github.com/vercel/turborepo) | MIT | INTEGRAR MÁS ADELANTE | P1 |
| [Changesets](https://github.com/changesets/changesets) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [Nx](https://github.com/nrwl/nx) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [Commitlint](https://github.com/conventional-changelog/commitlint) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [semantic-release](https://github.com/semantic-release/semantic-release) | MIT | INTEGRAR MÁS ADELANTE | P3 |
| [Knip](https://github.com/webpro/knip) | ISC | INTEGRAR MÁS ADELANTE | P2 |
| [jscodeshift](https://github.com/facebook/jscodeshift) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [ast-grep](https://github.com/ast-grep/ast-grep) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [Syncpack](https://github.com/JamieMason/syncpack) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [Renovate](https://github.com/renovatebot/renovate) | AGPL-3.0 | INTEGRAR MÁS ADELANTE | P1 |
| [Lefthook](https://github.com/evilmartians/lefthook) | MIT | INTEGRAR MÁS ADELANTE | P2 |

</details>

### design (20 proyectos)

**Ganadores:** `penpot`, `excalidraw`, `tldraw`, `drawio`, `inkscape`

<details>
<summary>Ver todos (20)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Fontsource](https://github.com/fontsource/fontsource) | MIT | INTEGRAR AHORA | P1 |
| [Penpot](https://github.com/penpot/penpot) | MPL-2.0 | INTEGRAR MÁS ADELANTE | P1 |
| [Excalidraw](https://github.com/excalidraw/excalidraw) | MIT | INTEGRAR MÁS ADELANTE | P1 |
| [tldraw](https://github.com/tldraw/tldraw) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [draw.io (Diagrams.net)](https://github.com/jgraph/drawio) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [GIMP](https://github.com/GNOME/gimp) | GPL-3.0 | INTEGRAR MÁS ADELANTE | P3 |
| [SVG-Edit](https://github.com/SVG-Edit/svgedit) | MIT | INTEGRAR MÁS ADELANTE | P3 |
| [Sass Color Tools](https://github.com/sass/sass) | MIT | INTEGRAR MÁS ADELANTE | P3 |
| [figma-api](https://github.com/figma/rest-api-spec) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [ColorHunt API Pattern](https://github.com/cristianbgp/color-hunt-api) | MIT | INTEGRAR MÁS ADELANTE | P3 |
| [Iconify](https://github.com/iconify/iconify) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [Storybook Design Addon](https://github.com/storybookjs/addon-designs) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [react-colorful](https://github.com/omgovich/react-colorful) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [Polotno SDK](https://github.com/polotno-project/polotno-node) | Proprietary | INTEGRAR MÁS ADELANTE | P2 |
| [GrapesJS](https://github.com/GrapesJS/grapesjs) | BSD-3-Clause | INTEGRAR MÁS ADELANTE | P2 |
| [LogoSquirrel](https://github.com/logoipsum/logoipsum) | MIT | INTEGRAR MÁS ADELANTE | P3 |
| [Inkscape](https://github.com/inkscape/inkscape) | GPL-3.0 | SOLO LABORATORIO | P3 |
| [Krita](https://github.com/KDE/krita) | GPL-3.0 | SOLO LABORATORIO | P3 |
| [Blender](https://github.com/blender/blender) | GPL-3.0 | SOLO LABORATORIO | P3 |
| [Synfig Studio](https://github.com/synfig/synfig) | GPL-3.0 | SOLO LABORATORIO | P3 |

</details>

### devops (19 proyectos)

**Ganadores:** `stackstorm`, `docker`, `helm`, `traefik`, `coolify`

<details>
<summary>Ver todos (19)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Docker](https://github.com/moby/moby) | Apache-2.0 | INTEGRAR AHORA | P0 |
| [GitHub Actions](https://github.com/actions/runner) | MIT | INTEGRAR AHORA | P0 |
| [Docker Compose](https://github.com/docker/compose) | Apache-2.0 | INTEGRAR AHORA | P0 |
| [Railway CLI](https://github.com/railwayapp/cli) | MIT | INTEGRAR AHORA | P0 |
| [Helm](https://github.com/helm/helm) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [Traefik](https://github.com/traefik/traefik) | MIT | INTEGRAR MÁS ADELANTE | P1 |
| [Caddy](https://github.com/caddyserver/caddy) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [Coolify](https://github.com/coollabsio/coolify) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [Dokku](https://github.com/dokku/dokku) | MIT | INTEGRAR MÁS ADELANTE | P3 |
| [Terraform](https://github.com/hashicorp/terraform) | BSL-1.0 | INTEGRAR MÁS ADELANTE | P2 |
| [OpenTofu](https://github.com/opentofu/opentofu) | MPL-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [Ansible](https://github.com/ansible/ansible) | GPL-3.0 | INTEGRAR MÁS ADELANTE | P3 |
| [Argo CD](https://github.com/argoproj/argo-cd) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P3 |
| [Flux](https://github.com/fluxcd/flux2) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P3 |
| [Portainer](https://github.com/portainer/portainer) | ZPL-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [Watchtower](https://github.com/containrrr/watchtower) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P3 |
| [NGINX](https://github.com/nginx/nginx) | BSD-2-Clause | INTEGRAR MÁS ADELANTE | P2 |
| [Dagger](https://github.com/dagger/dagger) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P3 |
| [StackStorm](https://github.com/StackStorm/st2) | Apache-2.0 | SOLO LABORATORIO | P3 |

</details>

### documents (19 proyectos)

**Ganadores:** `tesseract`, `paddleocr`, `gotenberg`, `stirling-pdf`, `docling`

<details>
<summary>Ver todos (19)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Tesseract OCR](https://github.com/tesseract-ocr/tesseract) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P1 |
| [PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P1 |
| [Gotenberg](https://github.com/gotenberg/gotenberg) | MIT | INTEGRAR MÁS ADELANTE | P1 |
| [Stirling-PDF](https://github.com/Stirling-Tools/Stirling-PDF) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [Docling](https://github.com/docling-project/docling) | MIT | INTEGRAR MÁS ADELANTE | P1 |
| [Apache Tika](https://github.com/apache/tika) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [Mayan EDMS](https://github.com/mayan-edms/mayan-edms) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P3 |
| [PyMuPDF](https://github.com/pymupdf/PyMuPDF) | AGPL-3.0 | INTEGRAR MÁS ADELANTE | P2 |
| [pdfcpu](https://github.com/pdfcpu/pdfcpu) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P3 |
| [Poppler](https://github.com/freedesktop/poppler) | GPL-2.0 | INTEGRAR MÁS ADELANTE | P3 |
| [Pandoc](https://github.com/jgm/pandoc) | GPL-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [WeasyPrint](https://github.com/Kozea/WeasyPrint) | BSD-3-Clause | INTEGRAR MÁS ADELANTE | P2 |
| [LibreOffice Headless](https://github.com/LibreOffice/core) | MPL-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [ImageMagick](https://github.com/ImageMagick/ImageMagick) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [pdf2image](https://github.com/Belval/pdf2image) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [Camelot](https://github.com/camelot-dev/camelot) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [Paperless-ngx](https://github.com/paperless-ngx/paperless-ngx) | GPL-3.0 | SOLO LABORATORIO | P3 |
| [Marker](https://github.com/VikParuchuri/marker) | GPL-3.0 | SOLO LABORATORIO | P3 |
| [calibre](https://github.com/kovidgoyal/calibre) | GPL-3.0 | SOLO LABORATORIO | P3 |

</details>

### automation (18 proyectos)

**Ganadores:** `openclaw`, `n8n`, `node-red`, `trigger-dev`, `bullmq`

<details>
<summary>Ver todos (18)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Automatisch](https://github.com/automatisch/automatisch) | AGPL-3.0 | DESCARTAR | P3 |
| [BullMQ](https://github.com/taskforcesh/bullmq) | MIT | INTEGRAR AHORA | P1 |
| [Activepieces](https://github.com/activepieces/activepieces) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [n8n](https://github.com/n8n-io/n8n) | Sustainable Use License | INTEGRAR MÁS ADELANTE | P1 |
| [Node-RED](https://github.com/node-red/node-red) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [Trigger.dev](https://github.com/triggerdotdev/trigger.dev) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P1 |
| [Inngest](https://github.com/inngest/inngest) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [Rundeck](https://github.com/rundeck/rundeck) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P3 |
| [Apache NiFi](https://github.com/apache/nifi) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P3 |
| [Jenkins](https://github.com/jenkinsci/jenkins) | MIT | INTEGRAR MÁS ADELANTE | P3 |
| [Pipedream](https://github.com/PipedreamHQ/pipedream) | MIT | INTEGRAR MÁS ADELANTE | P3 |
| [Tracardi](https://github.com/Tracardi/tracardi) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [Renovate](https://github.com/renovatebot/renovate) | AGPL-3.0 | INTEGRAR MÁS ADELANTE | P1 |
| [OpenClaw](https://github.com/openclaw/openclaw) | Apache-2.0 | SOLO LABORATORIO | P2 |
| [Windmill](https://github.com/windmill-labs/windmill) | AGPL-3.0 | SOLO LABORATORIO | P3 |
| [Sim](https://github.com/simstudioai/sim) | Apache-2.0 | SOLO LABORATORIO | P3 |
| [Huginn](https://github.com/huginn/huginn) | MIT | SOLO LABORATORIO | P3 |
| [StackStorm](https://github.com/StackStorm/st2) | Apache-2.0 | SOLO LABORATORIO | P3 |

</details>

### productivity (18 proyectos)

**Ganadores:** `odoo`, `erpnext`, `nextcloud`, `cal-com`, `bookstack`

<details>
<summary>Ver todos (18)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Odoo](https://github.com/odoo/odoo) | LGPL-3.0 | INTEGRAR MÁS ADELANTE | P2 |
| [ERPNext](https://github.com/frappe/erpnext) | GPL-3.0 | INTEGRAR MÁS ADELANTE | P3 |
| [Nextcloud](https://github.com/nextcloud/server) | AGPL-3.0 | INTEGRAR MÁS ADELANTE | P2 |
| [Cal.com](https://github.com/calcom/cal.com) | AGPL-3.0 | INTEGRAR MÁS ADELANTE | P1 |
| [BookStack](https://github.com/BookStackApp/BookStack) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [OpenProject](https://github.com/opf/openproject) | GPL-3.0 | INTEGRAR MÁS ADELANTE | P3 |
| [Plane](https://github.com/makeplane/plane) | AGPL-3.0 | INTEGRAR MÁS ADELANTE | P2 |
| [Kimai](https://github.com/kimai/kimai) | AGPL-3.0 | INTEGRAR MÁS ADELANTE | P3 |
| [Vaultwarden](https://github.com/dani-garcia/vaultwarden) | AGPL-3.0 | INTEGRAR MÁS ADELANTE | P2 |
| [Outline](https://github.com/outline/outline) | BSL-1.1 | INTEGRAR MÁS ADELANTE | P3 |
| [ONLYOFFICE](https://github.com/ONLYOFFICE/DocumentServer) | AGPL-3.0 | INTEGRAR MÁS ADELANTE | P3 |
| [Taiga](https://github.com/taigaio/taiga-back) | MPL-2.0 | INTEGRAR MÁS ADELANTE | P3 |
| [Frappe Framework](https://github.com/frappe/frappe) | MIT | INTEGRAR MÁS ADELANTE | P3 |
| [Jitsi](https://github.com/jitsi/jitsi-meet) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P3 |
| [CryptPad](https://github.com/cryptpad/cryptpad) | AGPL-3.0 | INTEGRAR MÁS ADELANTE | P3 |
| [AppFlowy](https://github.com/AppFlowy-IO/AppFlowy) | AGPL-3.0 | SOLO LABORATORIO | P3 |
| [Leantime](https://github.com/Leantime/leantime) | AGPL-3.0 | SOLO LABORATORIO | P3 |
| [Solidtime](https://github.com/solidtime-io/solidtime) | AGPL-3.0 | SOLO LABORATORIO | P3 |

</details>

### ai (16 proyectos)

**Ganadores:** `docling`, `firecrawl`, `comfyui`, `invokeai`, `kohya-ss`

<details>
<summary>Ver todos (16)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Docling](https://github.com/docling-project/docling) | MIT | INTEGRAR MÁS ADELANTE | P1 |
| [Firecrawl](https://github.com/mendableai/firecrawl) | AGPL-3.0 | INTEGRAR MÁS ADELANTE | P1 |
| [ComfyUI](https://github.com/comfyanonymous/ComfyUI) | GPL-3.0 | INTEGRAR MÁS ADELANTE | P2 |
| [InvokeAI](https://github.com/invoke-ai/InvokeAI) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [Diffusers](https://github.com/huggingface/diffusers) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [Real-ESRGAN](https://github.com/xinntao/Real-ESRGAN) | BSD-3-Clause | INTEGRAR MÁS ADELANTE | P2 |
| [AudioCraft](https://github.com/facebookresearch/audiocraft) | MIT | INTEGRAR MÁS ADELANTE | P3 |
| [Skyvern](https://github.com/Skyvern-AI/skyvern) | AGPL-3.0 | INTEGRAR MÁS ADELANTE | P1 |
| [Stagehand](https://github.com/browserbase/stagehand) | MIT | INTEGRAR MÁS ADELANTE | P1 |
| [browser-use](https://github.com/browser-use/browser-use) | MIT | INTEGRAR MÁS ADELANTE | P1 |
| [AgentQL](https://github.com/tinyfish-io/agentql) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [Stable Diffusion WebUI](https://github.com/AUTOMATIC1111/stable-diffusion-webui) | AGPL-3.0 | SOLO LABORATORIO | P3 |
| [Fooocus](https://github.com/lllyasviel/Fooocus) | GPL-3.0 | SOLO LABORATORIO | P3 |
| [kohya_ss](https://github.com/bmaltais/kohya_ss) | Apache-2.0 | SOLO LABORATORIO | P3 |
| [AnimateDiff](https://github.com/guoyww/AnimateDiff) | Apache-2.0 | SOLO LABORATORIO | P3 |
| [Agent-E](https://github.com/EmergenceAI/Agent-E) | Apache-2.0 | SOLO LABORATORIO | P3 |

</details>

### security (15 proyectos)

**Ganadores:** `guardrails-ai`, `vault`, `trivy`, `falco`, `owasp-zap`

<details>
<summary>Ver todos (15)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Trivy](https://github.com/aquasecurity/trivy) | Apache-2.0 | INTEGRAR AHORA | P1 |
| [Semgrep](https://github.com/semgrep/semgrep) | LGPL-2.1 | INTEGRAR AHORA | P1 |
| [Gitleaks](https://github.com/gitleaks/gitleaks) | MIT | INTEGRAR AHORA | P1 |
| [Guardrails AI](https://github.com/guardrails-ai/guardrails) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P1 |
| [Vault](https://github.com/hashicorp/vault) | BSL-1.0 | INTEGRAR MÁS ADELANTE | P1 |
| [OpenBao](https://github.com/openbao/openbao) | MPL-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [OWASP ZAP](https://github.com/zaproxy/zaproxy) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P1 |
| [CrowdSec](https://github.com/crowdsecurity/crowdsec) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [ModSecurity](https://github.com/owasp-modsecurity/ModSecurity) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P3 |
| [Dependency-Track](https://github.com/DependencyTrack/dependency-track) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [Katana](https://github.com/projectdiscovery/katana) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [CodeQL](https://github.com/github/codeql) | MIT | INTEGRAR MÁS ADELANTE | P1 |
| [OWASP ZAP](https://github.com/zaproxy/zaproxy) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P1 |
| [Falco](https://github.com/falco-security/falco) | Apache-2.0 | SOLO LABORATORIO | P3 |
| [Wazuh](https://github.com/wazuh/wazuh) | GPL-2.0 | SOLO LABORATORIO | P3 |

</details>

### voice (14 proyectos)

**Ganadores:** `whisper`, `faster-whisper`, `whisperx`, `piper`, `coqui-tts`

<details>
<summary>Ver todos (14)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Mimic3](https://github.com/MycroftAI/mimic3) | AGPL-3.0 | DESCARTAR | P3 |
| [OpenAI Whisper](https://github.com/openai/whisper) | MIT | INTEGRAR MÁS ADELANTE | P1 |
| [faster-whisper](https://github.com/SYSTRAN/faster-whisper) | MIT | INTEGRAR MÁS ADELANTE | P1 |
| [WhisperX](https://github.com/m-bain/whisperX) | BSD-2-Clause | INTEGRAR MÁS ADELANTE | P2 |
| [Piper](https://github.com/rhasspy/piper) | MIT | INTEGRAR MÁS ADELANTE | P1 |
| [Coqui TTS](https://github.com/coqui-ai/TTS) | MPL-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [Vosk](https://github.com/alphacep/vosk-api) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [Silero Models](https://github.com/snakers4/silero-models) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [XTTS v2](https://github.com/coqui-ai/TTS) | MPL-2.0 | SOLO LABORATORIO | P3 |
| [Bark](https://github.com/suno-ai/bark) | MIT | SOLO LABORATORIO | P3 |
| [OpenVoice](https://github.com/myshell-ai/OpenVoice) | MIT | SOLO LABORATORIO | P3 |
| [Fish Speech](https://github.com/fishaudio/fish-speech) | Apache-2.0 | SOLO LABORATORIO | P3 |
| [Rhasspy](https://github.com/rhasspy/rhasspy) | MIT | SOLO LABORATORIO | P3 |
| [ESPnet](https://github.com/espnet/espnet) | Apache-2.0 | SOLO LABORATORIO | P3 |

</details>

### orchestration (13 proyectos)

**Ganadores:** `langgraph`, `semantic-kernel`, `temporal`, `prefect`, `dagster`

<details>
<summary>Ver todos (13)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [LangGraph](https://github.com/langchain-ai/langgraph) | MIT | INTEGRAR MÁS ADELANTE | P1 |
| [Semantic Kernel](https://github.com/microsoft/semantic-kernel) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [Temporal](https://github.com/temporalio/temporal) | MIT | INTEGRAR MÁS ADELANTE | P1 |
| [Prefect](https://github.com/PrefectHQ/prefect) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [Apache Airflow](https://github.com/apache/airflow) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P3 |
| [Dagster](https://github.com/dagster-io/dagster) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [Kestra](https://github.com/kestra-io/kestra) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [Hatchet](https://github.com/hatchet-dev/hatchet) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [Kubernetes](https://github.com/kubernetes/kubernetes) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [K3s](https://github.com/k3s-io/k3s) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [Windmill](https://github.com/windmill-labs/windmill) | AGPL-3.0 | SOLO LABORATORIO | P3 |
| [Argo Workflows](https://github.com/argoproj/argo-workflows) | Apache-2.0 | SOLO LABORATORIO | P3 |
| [Luigi](https://github.com/spotify/luigi) | Apache-2.0 | SOLO LABORATORIO | P3 |

</details>

### crm (13 proyectos)

**Ganadores:** `twenty`, `espocrm`, `odoo-crm`, `mautic`, `civicrm`

<details>
<summary>Ver todos (13)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [SuiteCRM](https://github.com/SuiteCRM/SuiteCRM) | AGPL-3.0 | DESCARTAR | P3 |
| [Vtiger CRM](https://github.com/vtiger-crm/vtigercrm) | VPL-1.2 | DESCARTAR | P3 |
| [Odoo CRM](https://github.com/odoo/odoo) | LGPL-3.0 | INTEGRAR MÁS ADELANTE | P3 |
| [Mautic](https://github.com/mautic/mautic) | GPL-3.0 | INTEGRAR MÁS ADELANTE | P1 |
| [Kanboard](https://github.com/kanboard/kanboard) | MIT | INTEGRAR MÁS ADELANTE | P3 |
| [Frappe CRM](https://github.com/frappe/crm) | AGPL-3.0 | INTEGRAR MÁS ADELANTE | P3 |
| [Atomic CRM](https://github.com/marmelab/atomic-crm) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [Twenty](https://github.com/twentyhq/twenty) | AGPL-3.0 | SOLO LABORATORIO | P2 |
| [EspoCRM](https://github.com/espocrm/espocrm) | AGPL-3.0 | SOLO LABORATORIO | P3 |
| [Erxes](https://github.com/erxes/erxes) | AGPL-3.0 | SOLO LABORATORIO | P3 |
| [CiviCRM](https://github.com/civicrm/civicrm-core) | AGPL-3.0 | SOLO LABORATORIO | P3 |
| [Dolibarr](https://github.com/Dolibarr/dolibarr) | GPL-3.0 | SOLO LABORATORIO | P3 |
| [Monica](https://github.com/monicaHQ/monica) | AGPL-3.0 | SOLO LABORATORIO | P3 |

</details>

### branding (13 proyectos)

**Ganadores:** `penpot`, `inkscape`, `blender`, `brand-colors`, `figma-export`

<details>
<summary>Ver todos (13)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Fontsource](https://github.com/fontsource/fontsource) | MIT | INTEGRAR AHORA | P1 |
| [Penpot](https://github.com/penpot/penpot) | MPL-2.0 | INTEGRAR MÁS ADELANTE | P1 |
| [Sass Color Tools](https://github.com/sass/sass) | MIT | INTEGRAR MÁS ADELANTE | P3 |
| [figma-api](https://github.com/figma/rest-api-spec) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [ColorHunt API Pattern](https://github.com/cristianbgp/color-hunt-api) | MIT | INTEGRAR MÁS ADELANTE | P3 |
| [Iconify](https://github.com/iconify/iconify) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [Storybook Design Addon](https://github.com/storybookjs/addon-designs) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [react-colorful](https://github.com/omgovich/react-colorful) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [Polotno SDK](https://github.com/polotno-project/polotno-node) | Proprietary | INTEGRAR MÁS ADELANTE | P2 |
| [GrapesJS](https://github.com/GrapesJS/grapesjs) | BSD-3-Clause | INTEGRAR MÁS ADELANTE | P2 |
| [LogoSquirrel](https://github.com/logoipsum/logoipsum) | MIT | INTEGRAR MÁS ADELANTE | P3 |
| [Inkscape](https://github.com/inkscape/inkscape) | GPL-3.0 | SOLO LABORATORIO | P3 |
| [Blender](https://github.com/blender/blender) | GPL-3.0 | SOLO LABORATORIO | P3 |

</details>

### rag (12 proyectos)

**Ganadores:** `hayhooks`, `pgvector`, `llamaindex`, `haystack`, `txtai`

<details>
<summary>Ver todos (12)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [pgvector](https://github.com/pgvector/pgvector) | PostgreSQL | INTEGRAR AHORA | P0 |
| [Hayhooks](https://github.com/deepset-ai/haystack) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [LlamaIndex](https://github.com/run-llama/llama_index) | MIT | INTEGRAR MÁS ADELANTE | P1 |
| [Haystack](https://github.com/deepset-ai/haystack) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P1 |
| [txtai](https://github.com/neuml/txtai) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [R2R](https://github.com/SciPhi-AI/R2R) | MIT | INTEGRAR MÁS ADELANTE | P1 |
| [Unstructured](https://github.com/Unstructured-IO/unstructured) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P1 |
| [Sentence Transformers](https://github.com/UKPLab/sentence-transformers) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [RAGAS](https://github.com/explodinggradients/ragas) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P1 |
| [Mem0](https://github.com/mem0ai/mem0) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [Cross-Encoder Rerankers](https://github.com/cross-encoder/ms-marco-MiniLM-L-6-v2) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [LangChain](https://github.com/langchain-ai/langchain) | MIT | INTEGRAR MÁS ADELANTE | P2 |

</details>

### video (12 proyectos)

**Ganadores:** `jitsi-meet`, `livekit`, `ffmpeg`, `remotion`, `moviepy`

<details>
<summary>Ver todos (12)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [FFmpeg](https://github.com/FFmpeg/FFmpeg) | LGPL-2.1 | INTEGRAR AHORA | P0 |
| [Jitsi Meet](https://github.com/jitsi/jitsi-meet) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P3 |
| [LiveKit](https://github.com/livekit/livekit) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [Remotion](https://github.com/remotion-dev/remotion) | Remotion License | INTEGRAR MÁS ADELANTE | P1 |
| [MoviePy](https://github.com/Zulko/moviepy) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [HandBrake](https://github.com/HandBrake/HandBrake) | GPL-2.0 | INTEGRAR MÁS ADELANTE | P3 |
| [Creatomate API Pattern](https://github.com/creatomate/creatomate-node) | MIT | INTEGRAR MÁS ADELANTE | P3 |
| [LivePortrait](https://github.com/KlingTeam/LivePortrait) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [SadTalker](https://github.com/OpenTalker/SadTalker) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [Jitsi](https://github.com/jitsi/jitsi-meet) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P3 |
| [AnimateDiff](https://github.com/guoyww/AnimateDiff) | Apache-2.0 | SOLO LABORATORIO | P3 |
| [Shotcut](https://github.com/mltframework/shotcut) | GPL-3.0 | SOLO LABORATORIO | P3 |

</details>

### cms (12 proyectos)

**Ganadores:** `strapi`, `payload-cms`, `directus`, `ghost`, `wagtail`

<details>
<summary>Ver todos (12)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Strapi](https://github.com/strapi/strapi) | MIT | INTEGRAR MÁS ADELANTE | P1 |
| [Payload CMS](https://github.com/payloadcms/payload) | MIT | INTEGRAR MÁS ADELANTE | P1 |
| [Directus](https://github.com/directus/directus) | GPL-3.0 | INTEGRAR MÁS ADELANTE | P2 |
| [Ghost](https://github.com/TryGhost/Ghost) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [Wagtail](https://github.com/wagtail/wagtail) | BSD-3-Clause | INTEGRAR MÁS ADELANTE | P3 |
| [KeystoneJS](https://github.com/keystonejs/keystone) | MIT | INTEGRAR MÁS ADELANTE | P3 |
| [October CMS](https://github.com/octobercms/october) | MIT | INTEGRAR MÁS ADELANTE | P3 |
| [Builder.io SDK](https://github.com/BuilderIO/builder) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [WordPress](https://github.com/WordPress/WordPress) | GPL-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [TinaCMS](https://github.com/tinacms/tinacms) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [Webiny](https://github.com/webiny/webiny-js) | MIT | SOLO LABORATORIO | P3 |
| [TYPO3](https://github.com/TYPO3/typo3) | GPL-2.0 | SOLO LABORATORIO | P3 |

</details>

### monitoring (10 proyectos)

**Ganadores:** `prometheus`, `grafana`, `uptime-kuma`, `alertmanager`, `node-exporter`

<details>
<summary>Ver todos (10)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Checkmk](https://github.com/checkmk/checkmk) | GPL-2.0 | DESCARTAR | P3 |
| [Uptime Kuma](https://github.com/louislam/uptime-kuma) | MIT | INTEGRAR AHORA | P1 |
| [Prometheus](https://github.com/prometheus/prometheus) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P1 |
| [Grafana](https://github.com/grafana/grafana) | AGPL-3.0 | INTEGRAR MÁS ADELANTE | P1 |
| [Alertmanager](https://github.com/prometheus/alertmanager) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P1 |
| [Node Exporter](https://github.com/prometheus/node_exporter) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [cAdvisor](https://github.com/google/cadvisor) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [VictoriaMetrics](https://github.com/VictoriaMetrics/VictoriaMetrics) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [Netdata](https://github.com/netdata/netdata) | GPL-3.0 | SOLO LABORATORIO | P3 |
| [Zabbix](https://github.com/zabbix/zabbix) | GPL-2.0 | SOLO LABORATORIO | P3 |

</details>

### auth (10 proyectos)

**Ganadores:** `keycloak`, `authentik`, `oauth2-proxy`, `passkeys-webauthn`, `casbin`

<details>
<summary>Ver todos (10)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Keycloak](https://github.com/keycloak/keycloak) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P1 |
| [authentik](https://github.com/goauthentik/authentik) | MIT | INTEGRAR MÁS ADELANTE | P1 |
| [Zitadel](https://github.com/zitadel/zitadel) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [OAuth2 Proxy](https://github.com/oauth2-proxy/oauth2-proxy) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [Authelia](https://github.com/authelia/authelia) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P3 |
| [SimpleWebAuthn](https://github.com/MasterKale/SimpleWebAuthn) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [Casbin](https://github.com/casbin/casbin) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [OpenFGA](https://github.com/openfga/openfga) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [Pomerium](https://github.com/pomerium/pomerium) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P1 |
| [GoTrue](https://github.com/supabase/gotrue) | MIT | SOLO LABORATORIO | P3 |

</details>

### pdf (10 proyectos)

**Ganadores:** `gotenberg`, `stirling-pdf`, `ocrmypdf`, `pymupdf`, `pdfcpu`

<details>
<summary>Ver todos (10)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Gotenberg](https://github.com/gotenberg/gotenberg) | MIT | INTEGRAR MÁS ADELANTE | P1 |
| [Stirling-PDF](https://github.com/Stirling-Tools/Stirling-PDF) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [OCRmyPDF](https://github.com/ocrmypdf/OCRmyPDF) | MPL-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [PyMuPDF](https://github.com/pymupdf/PyMuPDF) | AGPL-3.0 | INTEGRAR MÁS ADELANTE | P2 |
| [pdfcpu](https://github.com/pdfcpu/pdfcpu) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P3 |
| [Poppler](https://github.com/freedesktop/poppler) | GPL-2.0 | INTEGRAR MÁS ADELANTE | P3 |
| [WeasyPrint](https://github.com/Kozea/WeasyPrint) | BSD-3-Clause | INTEGRAR MÁS ADELANTE | P2 |
| [pdf2image](https://github.com/Belval/pdf2image) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [Camelot](https://github.com/camelot-dev/camelot) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [Marker](https://github.com/VikParuchuri/marker) | GPL-3.0 | SOLO LABORATORIO | P3 |

</details>

### vector-db (9 proyectos)

**Ganadores:** `pgvector`, `qdrant`, `lancedb`, `redis-stack`, `typesense`

<details>
<summary>Ver todos (9)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [pgvector](https://github.com/pgvector/pgvector) | PostgreSQL | INTEGRAR AHORA | P0 |
| [Qdrant](https://github.com/qdrant/qdrant) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [Weaviate](https://github.com/weaviate/weaviate) | BSD-3-Clause | INTEGRAR MÁS ADELANTE | P3 |
| [LanceDB](https://github.com/lance-format/lance) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [Redis Stack](https://github.com/redis/redis) | RSALv2 OR SSPL-1.0 | INTEGRAR MÁS ADELANTE | P2 |
| [Milvus](https://github.com/milvus-io/milvus) | Apache-2.0 | SOLO LABORATORIO | P3 |
| [Chroma](https://github.com/chroma-core/chroma) | Apache-2.0 | SOLO LABORATORIO | P3 |
| [Typesense](https://github.com/typesense/typesense) | GPL-3.0 | SOLO LABORATORIO | P3 |
| [Vespa](https://github.com/vespa-engine/vespa) | Apache-2.0 | SOLO LABORATORIO | P3 |

</details>

### helpdesk (8 proyectos)

**Ganadores:** `chatwoot`, `zammad`, `freescout`

<details>
<summary>Ver todos (8)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [osTicket](https://github.com/osTicket/osTicket) | GPL-2.0 | DESCARTAR | P3 |
| [Papercups](https://github.com/papercups-io/papercups) | MIT | DESCARTAR | P3 |
| [Live Helper Chat](https://github.com/LiveHelperChat/livehelperchat) | AGPL-3.0 | DESCARTAR | P3 |
| [Chatwoot](https://github.com/chatwoot/chatwoot) | MIT | INTEGRAR MÁS ADELANTE | P1 |
| [FreeScout](https://github.com/freescout-help-desk/freescout) | AGPL-3.0 | INTEGRAR MÁS ADELANTE | P3 |
| [UVdesk](https://github.com/uvdesk/community-skeleton) | MIT | INTEGRAR MÁS ADELANTE | P3 |
| [Zammad](https://github.com/zammad/zammad) | AGPL-3.0 | SOLO LABORATORIO | P3 |
| [Erxes](https://github.com/erxes/erxes) | AGPL-3.0 | SOLO LABORATORIO | P3 |

</details>

### python (8 proyectos)

**Ganadores:** `scrapy`, `mechanicalsoup`, `moviepy`, `imagMagick-wand`, `wagtail`

<details>
<summary>Ver todos (8)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [pytest](https://github.com/pytest-dev/pytest) | MIT | INTEGRAR AHORA | P0 |
| [FastAPI](https://github.com/fastapi/fastapi) | MIT | INTEGRAR AHORA | P0 |
| [Scrapy](https://github.com/scrapy/scrapy) | BSD-3-Clause | INTEGRAR MÁS ADELANTE | P1 |
| [MechanicalSoup](https://github.com/MechanicalSoup/MechanicalSoup) | MIT | INTEGRAR MÁS ADELANTE | P3 |
| [MoviePy](https://github.com/Zulko/moviepy) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [Wand](https://github.com/emcconville/wand) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [Wagtail](https://github.com/wagtail/wagtail) | BSD-3-Clause | INTEGRAR MÁS ADELANTE | P3 |
| [Locust](https://github.com/locustio/locust) | MIT | INTEGRAR MÁS ADELANTE | P2 |

</details>

### image (8 proyectos)

**Ganadores:** `comfyui`, `invokeai`, `opencv`, `diffusers`, `real-esrgan`

<details>
<summary>Ver todos (8)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [ComfyUI](https://github.com/comfyanonymous/ComfyUI) | GPL-3.0 | INTEGRAR MÁS ADELANTE | P2 |
| [InvokeAI](https://github.com/invoke-ai/InvokeAI) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [OpenCV](https://github.com/opencv/opencv) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [Diffusers](https://github.com/huggingface/diffusers) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [Real-ESRGAN](https://github.com/xinntao/Real-ESRGAN) | BSD-3-Clause | INTEGRAR MÁS ADELANTE | P2 |
| [Wand](https://github.com/emcconville/wand) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [Stable Diffusion WebUI](https://github.com/AUTOMATIC1111/stable-diffusion-webui) | AGPL-3.0 | SOLO LABORATORIO | P3 |
| [Fooocus](https://github.com/lllyasviel/Fooocus) | GPL-3.0 | SOLO LABORATORIO | P3 |

</details>

### ecommerce (8 proyectos)

**Ganadores:** `medusa`, `saleor`, `prestashop`, `bagisto`, `spree`

<details>
<summary>Ver todos (8)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Medusa](https://github.com/medusajs/medusa) | MIT | INTEGRAR MÁS ADELANTE | P1 |
| [Saleor](https://github.com/saleor/saleor) | BSD-3-Clause | INTEGRAR MÁS ADELANTE | P2 |
| [Bagisto](https://github.com/bagisto/bagisto) | MIT | INTEGRAR MÁS ADELANTE | P3 |
| [WooCommerce](https://github.com/woocommerce/woocommerce) | GPL-3.0 | INTEGRAR MÁS ADELANTE | P2 |
| [Shopware](https://github.com/shopware/platform) | MIT | INTEGRAR MÁS ADELANTE | P3 |
| [Vendure](https://github.com/vendure-ecommerce/vendure) | GPL-3.0 | SOLO LABORATORIO | P3 |
| [PrestaShop](https://github.com/PrestaShop/PrestaShop) | OSL-3.0 | SOLO LABORATORIO | P3 |
| [Spree Commerce](https://github.com/spree/spree) | BSD-3-Clause | SOLO LABORATORIO | P3 |

</details>

### gateway (7 proyectos)

**Ganadores:** `litellm`, `kong`, `krakend`, `gravitee`, `emissary`

<details>
<summary>Ver todos (7)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [LiteLLM](https://github.com/BerriAI/litellm) | MIT | INTEGRAR MÁS ADELANTE | P1 |
| [Kong Gateway](https://github.com/Kong/kong) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P1 |
| [Tyk](https://github.com/TykTechnologies/tyk) | MPL-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [Apache APISIX](https://github.com/apache/apisix) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [KrakenD](https://github.com/krakend/krakend-ce) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [Gravitee APIM](https://github.com/gravitee-io/gravitee-api-management) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P3 |
| [Emissary-Ingress](https://github.com/emissary-ingress/emissary) | Apache-2.0 | SOLO LABORATORIO | P3 |

</details>

### search (7 proyectos)

**Ganadores:** `txtai`, `typesense`, `vespa`, `paradedb`, `searxng`

<details>
<summary>Ver todos (7)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [txtai](https://github.com/neuml/txtai) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [Meilisearch](https://github.com/meilisearch/meilisearch) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [SearXNG](https://github.com/searxng/searxng) | AGPL-3.0 | INTEGRAR MÁS ADELANTE | P3 |
| [ast-grep](https://github.com/ast-grep/ast-grep) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [Typesense](https://github.com/typesense/typesense) | GPL-3.0 | SOLO LABORATORIO | P3 |
| [Vespa](https://github.com/vespa-engine/vespa) | Apache-2.0 | SOLO LABORATORIO | P3 |
| [ParadeDB](https://github.com/paradedb/paradedb) | AGPL-3.0 | SOLO LABORATORIO | P3 |

</details>

### proxy (7 proyectos)

**Ganadores:** `oauth2-proxy`, `traefik`, `nginx`, `kong`, `pomerium`

<details>
<summary>Ver todos (7)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [OAuth2 Proxy](https://github.com/oauth2-proxy/oauth2-proxy) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [Traefik](https://github.com/traefik/traefik) | MIT | INTEGRAR MÁS ADELANTE | P1 |
| [Caddy](https://github.com/caddyserver/caddy) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [NGINX](https://github.com/nginx/nginx) | BSD-2-Clause | INTEGRAR MÁS ADELANTE | P2 |
| [Kong Gateway](https://github.com/Kong/kong) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P1 |
| [Apache APISIX](https://github.com/apache/apisix) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [Pomerium](https://github.com/pomerium/pomerium) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P1 |

</details>

### erp (7 proyectos)

**Ganadores:** `odoo-crm`, `odoo`, `erpnext`, `akaunting`, `frappe`

<details>
<summary>Ver todos (7)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Odoo CRM](https://github.com/odoo/odoo) | LGPL-3.0 | INTEGRAR MÁS ADELANTE | P3 |
| [Odoo](https://github.com/odoo/odoo) | LGPL-3.0 | INTEGRAR MÁS ADELANTE | P2 |
| [ERPNext](https://github.com/frappe/erpnext) | GPL-3.0 | INTEGRAR MÁS ADELANTE | P3 |
| [Frappe Framework](https://github.com/frappe/frappe) | MIT | INTEGRAR MÁS ADELANTE | P3 |
| [Dolibarr](https://github.com/Dolibarr/dolibarr) | GPL-3.0 | SOLO LABORATORIO | P3 |
| [Akaunting](https://github.com/akaunting/akaunting) | BSL-1.1 | SOLO LABORATORIO | P3 |
| [Invoice Ninja](https://github.com/invoiceninja/invoiceninja) | Elastic-2.0 | SOLO LABORATORIO | P3 |

</details>

### seo (7 proyectos)

**Ganadores:** `matomo`, `plausible`, `umami`, `serposcope`, `searxng`

<details>
<summary>Ver todos (7)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Open Web Analytics](https://github.com/Open-Web-Analytics/Open-Web-Analytics) | GPL-2.0 | DESCARTAR | P3 |
| [Matomo](https://github.com/matomo-org/matomo) | GPL-3.0 | INTEGRAR MÁS ADELANTE | P1 |
| [Plausible Analytics](https://github.com/plausible/analytics) | AGPL-3.0 | INTEGRAR MÁS ADELANTE | P1 |
| [Umami](https://github.com/umami-software/umami) | MIT | INTEGRAR MÁS ADELANTE | P1 |
| [Serposcope](https://github.com/serph-rotator/serposcope) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [SearXNG](https://github.com/searxng/searxng) | AGPL-3.0 | INTEGRAR MÁS ADELANTE | P3 |
| [LinkChecker](https://github.com/linkchecker/linkchecker) | GPL-2.0 | INTEGRAR MÁS ADELANTE | P2 |

</details>

### tts (7 proyectos)

**Ganadores:** `piper`, `coqui-tts`, `xtts`, `bark`, `silero-tts`

<details>
<summary>Ver todos (7)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Mimic3](https://github.com/MycroftAI/mimic3) | AGPL-3.0 | DESCARTAR | P3 |
| [Piper](https://github.com/rhasspy/piper) | MIT | INTEGRAR MÁS ADELANTE | P1 |
| [Coqui TTS](https://github.com/coqui-ai/TTS) | MPL-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [Silero Models](https://github.com/snakers4/silero-models) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [XTTS v2](https://github.com/coqui-ai/TTS) | MPL-2.0 | SOLO LABORATORIO | P3 |
| [Bark](https://github.com/suno-ai/bark) | MIT | SOLO LABORATORIO | P3 |
| [Fish Speech](https://github.com/fishaudio/fish-speech) | Apache-2.0 | SOLO LABORATORIO | P3 |

</details>

### containers (6 proyectos)

**Ganadores:** `cadvisor`, `docker`, `kubernetes`, `portainer`, `watchtower`

<details>
<summary>Ver todos (6)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Docker](https://github.com/moby/moby) | Apache-2.0 | INTEGRAR AHORA | P0 |
| [Docker Compose](https://github.com/docker/compose) | Apache-2.0 | INTEGRAR AHORA | P0 |
| [cAdvisor](https://github.com/google/cadvisor) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [Kubernetes](https://github.com/kubernetes/kubernetes) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [Portainer](https://github.com/portainer/portainer) | ZPL-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [Watchtower](https://github.com/containrrr/watchtower) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P3 |

</details>

### bi (6 proyectos)

**Ganadores:** `metabase`, `apache-superset`, `lightdash`, `evidence-dev`, `cube`

<details>
<summary>Ver todos (6)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Metabase](https://github.com/metabase/metabase) | AGPL-3.0 | INTEGRAR MÁS ADELANTE | P1 |
| [Apache Superset](https://github.com/apache/superset) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [Redash](https://github.com/getredash/redash) | BSD-2-Clause | INTEGRAR MÁS ADELANTE | P3 |
| [Lightdash](https://github.com/lightdash/lightdash) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [Evidence](https://github.com/evidence-dev/evidence) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [Cube](https://github.com/cube-js/cube) | MIT | INTEGRAR MÁS ADELANTE | P2 |

</details>

### crawl (6 proyectos)

**Ganadores:** `crawlee`, `scrapy`, `firecrawl`, `colly`, `katana`

<details>
<summary>Ver todos (6)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Crawlee](https://github.com/apify/crawlee) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P1 |
| [Scrapy](https://github.com/scrapy/scrapy) | BSD-3-Clause | INTEGRAR MÁS ADELANTE | P1 |
| [Firecrawl](https://github.com/mendableai/firecrawl) | AGPL-3.0 | INTEGRAR MÁS ADELANTE | P1 |
| [Colly](https://github.com/gocolly/colly) | BSD-3-Clause | INTEGRAR MÁS ADELANTE | P2 |
| [Katana](https://github.com/projectdiscovery/katana) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [Browsertrix Crawler](https://github.com/webrecorder/browsertrix-crawler) | AGPL-3.0 | SOLO LABORATORIO | P3 |

</details>

### headless (6 proyectos)

**Ganadores:** `strapi`, `payload-cms`, `directus`, `medusa`, `browserless`

<details>
<summary>Ver todos (6)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Strapi](https://github.com/strapi/strapi) | MIT | INTEGRAR MÁS ADELANTE | P1 |
| [Payload CMS](https://github.com/payloadcms/payload) | MIT | INTEGRAR MÁS ADELANTE | P1 |
| [Directus](https://github.com/directus/directus) | GPL-3.0 | INTEGRAR MÁS ADELANTE | P2 |
| [Medusa](https://github.com/medusajs/medusa) | MIT | INTEGRAR MÁS ADELANTE | P1 |
| [Browserless](https://github.com/browserless/browserless) | SSPL-1.0 | INTEGRAR MÁS ADELANTE | P1 |
| [Steel Browser](https://github.com/steel-dev/steel-browser) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |

</details>

### graphql (6 proyectos)

**Ganadores:** `saleor`, `hasura`, `graphql-mesh`, `apollo-router`

<details>
<summary>Ver todos (6)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Saleor](https://github.com/saleor/saleor) | BSD-3-Clause | INTEGRAR MÁS ADELANTE | P2 |
| [KeystoneJS](https://github.com/keystonejs/keystone) | MIT | INTEGRAR MÁS ADELANTE | P3 |
| [Hasura](https://github.com/hasura/graphql-engine) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P1 |
| [GraphQL Mesh](https://github.com/ardatan/graphql-mesh) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [WunderGraph](https://github.com/wundergraph/wundergraph) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [Apollo Router](https://github.com/apollographql/router) | MIT | INTEGRAR MÁS ADELANTE | P3 |

</details>

### integration (6 proyectos)

**Ganadores:** `testcontainers`, `graphql-mesh`, `openapi-generator`, `nango`, `zapier-platform`

<details>
<summary>Ver todos (6)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Testcontainers](https://github.com/testcontainers/testcontainers-node) | MIT | INTEGRAR MÁS ADELANTE | P1 |
| [GraphQL Mesh](https://github.com/ardatan/graphql-mesh) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [OpenAPI Generator](https://github.com/OpenAPITools/openapi-generator) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [Nango](https://github.com/NangoHQ/nango) | Elastic-2.0 | INTEGRAR MÁS ADELANTE | P1 |
| [Zapier Platform CLI](https://github.com/zapier/zapier-platform) | MIT | INTEGRAR MÁS ADELANTE | P3 |
| [figma-api](https://github.com/figma/rest-api-spec) | MIT | INTEGRAR MÁS ADELANTE | P2 |

</details>

### stealth (6 proyectos)

**Ganadores:** `patchright`, `puppeteer-extra`, `camoufox`, `rebrowser`, `botasaurus`

<details>
<summary>Ver todos (6)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [puppeteer-extra](https://github.com/berstend/puppeteer-extra) | MIT | INTEGRAR MÁS ADELANTE | P3 |
| [Botasaurus](https://github.com/omkarcloud/botasaurus) | MIT | INTEGRAR MÁS ADELANTE | P3 |
| [Patchright](https://github.com/Kaliiiiiiiiii-Vinyzu/patchright) | Apache-2.0 | SOLO LABORATORIO | P3 |
| [Camoufox](https://github.com/daijro/camoufox) | MPL-2.0 | SOLO LABORATORIO | P3 |
| [Rebrowser](https://github.com/rebrowser/rebrowser-patches) | MIT | SOLO LABORATORIO | P3 |
| [nodriver](https://github.com/ultrafunkamsterdam/nodriver) | GPL-3.0 | SOLO LABORATORIO | P3 |

</details>

### framework (5 proyectos)

**Ganadores:** `llamaindex`, `haystack`, `frappe`, `fastapi`

<details>
<summary>Ver todos (5)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [FastAPI](https://github.com/fastapi/fastapi) | MIT | INTEGRAR AHORA | P0 |
| [LlamaIndex](https://github.com/run-llama/llama_index) | MIT | INTEGRAR MÁS ADELANTE | P1 |
| [Haystack](https://github.com/deepset-ai/haystack) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P1 |
| [LangChain](https://github.com/langchain-ai/langchain) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [Frappe Framework](https://github.com/frappe/frappe) | MIT | INTEGRAR MÁS ADELANTE | P3 |

</details>

### workflow (5 proyectos)

**Ganadores:** `n8n`, `kestra`, `camunda`

<details>
<summary>Ver todos (5)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Bonita](https://github.com/bonitasoft/bonita-engine) | GPL-2.0 | DESCARTAR | P3 |
| [n8n](https://github.com/n8n-io/n8n) | Sustainable Use License | INTEGRAR MÁS ADELANTE | P1 |
| [Apache Airflow](https://github.com/apache/airflow) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P3 |
| [Kestra](https://github.com/kestra-io/kestra) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [Camunda 8](https://github.com/camunda/camunda) | Apache-2.0 | SOLO LABORATORIO | P3 |

</details>

### sales (5 proyectos)

**Ganadores:** `twenty`, `espocrm`

<details>
<summary>Ver todos (5)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [SuiteCRM](https://github.com/SuiteCRM/SuiteCRM) | AGPL-3.0 | DESCARTAR | P3 |
| [Vtiger CRM](https://github.com/vtiger-crm/vtigercrm) | VPL-1.2 | DESCARTAR | P3 |
| [Frappe CRM](https://github.com/frappe/crm) | AGPL-3.0 | INTEGRAR MÁS ADELANTE | P3 |
| [Twenty](https://github.com/twentyhq/twenty) | AGPL-3.0 | SOLO LABORATORIO | P2 |
| [EspoCRM](https://github.com/espocrm/espocrm) | AGPL-3.0 | SOLO LABORATORIO | P3 |

</details>

### project-management (5 proyectos)

**Ganadores:** `kanboard`, `openproject`, `plane`

<details>
<summary>Ver todos (5)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Kanboard](https://github.com/kanboard/kanboard) | MIT | INTEGRAR MÁS ADELANTE | P3 |
| [OpenProject](https://github.com/opf/openproject) | GPL-3.0 | INTEGRAR MÁS ADELANTE | P3 |
| [Plane](https://github.com/makeplane/plane) | AGPL-3.0 | INTEGRAR MÁS ADELANTE | P2 |
| [Taiga](https://github.com/taigaio/taiga-back) | MPL-2.0 | INTEGRAR MÁS ADELANTE | P3 |
| [Leantime](https://github.com/Leantime/leantime) | AGPL-3.0 | SOLO LABORATORIO | P3 |

</details>

### messaging (5 proyectos)

**Ganadores:** `matrix-synapse`, `element-web`, `signal-cli`

<details>
<summary>Ver todos (5)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Matrix Synapse](https://github.com/element-hq/synapse) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [Element](https://github.com/element-hq/element-web) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [Conduit](https://github.com/conduit-rust/conduit) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P3 |
| [Dendrite](https://github.com/element-hq/dendrite) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P3 |
| [signal-cli](https://github.com/AsamK/signal-cli) | GPL-3.0 | SOLO LABORATORIO | P3 |

</details>

### notifications (5 proyectos)

**Ganadores:** `ntfy`, `apprise`, `sonner`

<details>
<summary>Ver todos (5)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Sonner](https://github.com/emilkowalski/sonner) | MIT | INTEGRAR AHORA | P1 |
| [ntfy](https://github.com/binwiederhier/ntfy) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [Gotify](https://github.com/gotify/server) | MIT | INTEGRAR MÁS ADELANTE | P3 |
| [Apprise](https://github.com/caronc/apprise) | BSD-2-Clause | INTEGRAR MÁS ADELANTE | P2 |
| [Shoutrrr](https://github.com/containrrr/shoutrrr) | MIT | INTEGRAR MÁS ADELANTE | P3 |

</details>

### php (5 proyectos)

**Ganadores:** `prestashop`, `octobercms`, `wordpress`

<details>
<summary>Ver todos (5)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Goutte](https://github.com/FriendsOfPHP/Goutte) | MIT | INTEGRAR MÁS ADELANTE | P3 |
| [October CMS](https://github.com/octobercms/october) | MIT | INTEGRAR MÁS ADELANTE | P3 |
| [WordPress](https://github.com/WordPress/WordPress) | GPL-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [Shopware](https://github.com/shopware/platform) | MIT | INTEGRAR MÁS ADELANTE | P3 |
| [PrestaShop](https://github.com/PrestaShop/PrestaShop) | OSL-3.0 | SOLO LABORATORIO | P3 |

</details>

### embeddings (4 proyectos)

**Ganadores:** `infinity`, `txtai`, `sentence-transformers`

<details>
<summary>Ver todos (4)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Infinity](https://github.com/michaelfeil/infinity) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [Text Embeddings Inference](https://github.com/huggingface/text-embeddings-inference) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [txtai](https://github.com/neuml/txtai) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [Sentence Transformers](https://github.com/UKPLab/sentence-transformers) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |

</details>

### k8s (4 proyectos)

**Ganadores:** `argo-workflows`, `helm`, `k3s`, `emissary`

<details>
<summary>Ver todos (4)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Helm](https://github.com/helm/helm) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [K3s](https://github.com/k3s-io/k3s) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [Argo Workflows](https://github.com/argoproj/argo-workflows) | Apache-2.0 | SOLO LABORATORIO | P3 |
| [Emissary-Ingress](https://github.com/emissary-ingress/emissary) | Apache-2.0 | SOLO LABORATORIO | P3 |

</details>

### observability (4 proyectos)

**Ganadores:** `opentelemetry`, `signoz`, `alloy`, `langfuse`

<details>
<summary>Ver todos (4)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [OpenTelemetry](https://github.com/open-telemetry/opentelemetry-collector) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P1 |
| [SigNoz](https://github.com/SigNoz/signoz) | MIT | INTEGRAR MÁS ADELANTE | P1 |
| [Grafana Alloy](https://github.com/grafana/alloy) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [Langfuse](https://github.com/langfuse/langfuse) | MIT | INTEGRAR MÁS ADELANTE | P1 |

</details>

### newsletter (4 proyectos)

**Ganadores:** `listmonk`

<details>
<summary>Ver todos (4)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Mailtrain](https://github.com/Mailtrain-org/mailtrain) | GPL-3.0 | DESCARTAR | P3 |
| [Listmonk](https://github.com/knadh/listmonk) | AGPL-3.0 | INTEGRAR MÁS ADELANTE | P1 |
| [Keila](https://github.com/patrikx3/keila) | AGPL-3.0 | INTEGRAR MÁS ADELANTE | P2 |
| [SendPortal](https://github.com/mettle/sendportal) | MIT | INTEGRAR MÁS ADELANTE | P3 |

</details>

### mta (4 proyectos)

**Ganadores:** `postal`, `stalwart-mail`, `haraka`

<details>
<summary>Ver todos (4)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Postal](https://github.com/postalserver/postal) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [Stalwart Mail Server](https://github.com/stalwartlabs/mail-server) | AGPL-3.0 | INTEGRAR MÁS ADELANTE | P3 |
| [Haraka](https://github.com/haraka/Haraka) | MIT | INTEGRAR MÁS ADELANTE | P3 |
| [Maddy](https://github.com/foxcpp/maddy) | GPL-3.0 | SOLO LABORATORIO | P3 |

</details>

### ocr (4 proyectos)

**Ganadores:** `tesseract`, `paddleocr`, `ocrmypdf`, `paperless-ngx`

<details>
<summary>Ver todos (4)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Tesseract OCR](https://github.com/tesseract-ocr/tesseract) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P1 |
| [PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P1 |
| [OCRmyPDF](https://github.com/ocrmypdf/OCRmyPDF) | MPL-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [Paperless-ngx](https://github.com/paperless-ngx/paperless-ngx) | GPL-3.0 | SOLO LABORATORIO | P3 |

</details>

### conversion (4 proyectos)

**Ganadores:** `gotenberg`, `pandoc`, `libreoffice-headless`, `imagemagick`

<details>
<summary>Ver todos (4)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Gotenberg](https://github.com/gotenberg/gotenberg) | MIT | INTEGRAR MÁS ADELANTE | P1 |
| [Pandoc](https://github.com/jgm/pandoc) | GPL-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [LibreOffice Headless](https://github.com/LibreOffice/core) | MPL-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [ImageMagick](https://github.com/ImageMagick/ImageMagick) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |

</details>

### stt (4 proyectos)

**Ganadores:** `whisper`, `faster-whisper`, `whisperx`, `vosk`

<details>
<summary>Ver todos (4)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [OpenAI Whisper](https://github.com/openai/whisper) | MIT | INTEGRAR MÁS ADELANTE | P1 |
| [faster-whisper](https://github.com/SYSTRAN/faster-whisper) | MIT | INTEGRAR MÁS ADELANTE | P1 |
| [WhisperX](https://github.com/m-bain/whisperX) | BSD-2-Clause | INTEGRAR MÁS ADELANTE | P2 |
| [Vosk](https://github.com/alphacep/vosk-api) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |

</details>

### collaboration (4 proyectos)

**Ganadores:** `nextcloud`, `appflowy`, `onlyoffice`, `cryptpad`

<details>
<summary>Ver todos (4)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Nextcloud](https://github.com/nextcloud/server) | AGPL-3.0 | INTEGRAR MÁS ADELANTE | P2 |
| [ONLYOFFICE](https://github.com/ONLYOFFICE/DocumentServer) | AGPL-3.0 | INTEGRAR MÁS ADELANTE | P3 |
| [CryptPad](https://github.com/cryptpad/cryptpad) | AGPL-3.0 | INTEGRAR MÁS ADELANTE | P3 |
| [AppFlowy](https://github.com/AppFlowy-IO/AppFlowy) | AGPL-3.0 | SOLO LABORATORIO | P3 |

</details>

### mcp (3 proyectos)

**Ganadores:** `mcp-sdk-typescript`, `mcp-sdk-python`, `mcp-servers`

<details>
<summary>Ver todos (3)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk) | MIT | INTEGRAR MÁS ADELANTE | P1 |
| [MCP Python SDK](https://github.com/modelcontextprotocol/python-sdk) | MIT | INTEGRAR MÁS ADELANTE | P1 |
| [MCP Servers (official)](https://github.com/modelcontextprotocol/servers) | MIT | INTEGRAR MÁS ADELANTE | P1 |

</details>

### llm-platform (3 proyectos)

**Ganadores:** `dify`

<details>
<summary>Ver todos (3)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Langflow](https://github.com/langflow-ai/langflow) | MIT | DESCARTAR | P3 |
| [Dify](https://github.com/langgenius/dify) | Apache-2.0 | SOLO LABORATORIO | P2 |
| [Flowise](https://github.com/FlowiseAI/Flowise) | Apache-2.0 | SOLO LABORATORIO | P3 |

</details>

### embedded (3 proyectos)

**Ganadores:** `lancedb`, `sqlite`

<details>
<summary>Ver todos (3)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [LanceDB](https://github.com/lance-format/lance) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [SQLite](https://github.com/sqlite/sqlite) | blessing | INTEGRAR MÁS ADELANTE | P3 |
| [Chroma](https://github.com/chroma-core/chroma) | Apache-2.0 | SOLO LABORATORIO | P3 |

</details>

### cache (3 proyectos)

**Ganadores:** `redis-stack`, `redis`

<details>
<summary>Ver todos (3)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Redis](https://github.com/redis/redis) | RSALv2 OR SSPL-1.0 | INTEGRAR AHORA | P0 |
| [Redis Stack](https://github.com/redis/redis) | RSALv2 OR SSPL-1.0 | INTEGRAR MÁS ADELANTE | P2 |
| [Valkey](https://github.com/valkey-io/valkey) | BSD-3-Clause | INTEGRAR MÁS ADELANTE | P1 |

</details>

### data (3 proyectos)

**Ganadores:** `dagster`, `luigi`, `directus`

<details>
<summary>Ver todos (3)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Dagster](https://github.com/dagster-io/dagster) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [Directus](https://github.com/directus/directus) | GPL-3.0 | INTEGRAR MÁS ADELANTE | P2 |
| [Luigi](https://github.com/spotify/luigi) | Apache-2.0 | SOLO LABORATORIO | P3 |

</details>

### background-jobs (3 proyectos)

**Ganadores:** `trigger-dev`

<details>
<summary>Ver todos (3)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Trigger.dev](https://github.com/triggerdotdev/trigger.dev) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P1 |
| [Inngest](https://github.com/inngest/inngest) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [Hatchet](https://github.com/hatchet-dev/hatchet) | MIT | INTEGRAR MÁS ADELANTE | P2 |

</details>

### ci-cd (3 proyectos)

**Ganadores:** `jenkins`, `github-actions`, `dagger`

<details>
<summary>Ver todos (3)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [GitHub Actions](https://github.com/actions/runner) | MIT | INTEGRAR AHORA | P0 |
| [Jenkins](https://github.com/jenkinsci/jenkins) | MIT | INTEGRAR MÁS ADELANTE | P3 |
| [Dagger](https://github.com/dagger/dagger) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P3 |

</details>

### metrics (3 proyectos)

**Ganadores:** `prometheus`, `node-exporter`, `victoriametrics`

<details>
<summary>Ver todos (3)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Prometheus](https://github.com/prometheus/prometheus) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P1 |
| [Node Exporter](https://github.com/prometheus/node_exporter) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [VictoriaMetrics](https://github.com/VictoriaMetrics/VictoriaMetrics) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |

</details>

### tracing (3 proyectos)

**Ganadores:** `tempo`, `opentelemetry`

<details>
<summary>Ver todos (3)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Tempo](https://github.com/grafana/tempo) | AGPL-3.0 | INTEGRAR MÁS ADELANTE | P2 |
| [Jaeger](https://github.com/jaegertracing/jaeger) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [OpenTelemetry](https://github.com/open-telemetry/opentelemetry-collector) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P1 |

</details>

### error-tracking (3 proyectos)

**Ganadores:** `sentry-self-host`

<details>
<summary>Ver todos (3)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Sentry (self-hosted)](https://github.com/getsentry/sentry) | BSL-1.1 | INTEGRAR MÁS ADELANTE | P1 |
| [GlitchTip](https://github.com/glitchtip/glitchtip) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [Highlight.io](https://github.com/highlight/highlight) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P3 |

</details>

### session-replay (3 proyectos)

**Ganadores:** `posthog`, `openreplay`

<details>
<summary>Ver todos (3)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Highlight.io](https://github.com/highlight/highlight) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P3 |
| [PostHog](https://github.com/PostHog/posthog) | MIT | INTEGRAR MÁS ADELANTE | P1 |
| [OpenReplay](https://github.com/openreplay/openreplay) | MIT | INTEGRAR MÁS ADELANTE | P3 |

</details>

### iam (3 proyectos)

**Ganadores:** `keycloak`, `authentik`

<details>
<summary>Ver todos (3)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Keycloak](https://github.com/keycloak/keycloak) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P1 |
| [authentik](https://github.com/goauthentik/authentik) | MIT | INTEGRAR MÁS ADELANTE | P1 |
| [Zitadel](https://github.com/zitadel/zitadel) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |

</details>

### secrets (3 proyectos)

**Ganadores:** `vault`, `gitleaks`

<details>
<summary>Ver todos (3)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Gitleaks](https://github.com/gitleaks/gitleaks) | MIT | INTEGRAR AHORA | P1 |
| [Vault](https://github.com/hashicorp/vault) | BSL-1.0 | INTEGRAR MÁS ADELANTE | P1 |
| [OpenBao](https://github.com/openbao/openbao) | MPL-2.0 | INTEGRAR MÁS ADELANTE | P2 |

</details>

### backup (3 proyectos)

**Ganadores:** `litestream`, `wal-g`

<details>
<summary>Ver todos (3)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Litestream](https://github.com/benbjohnson/litestream) | MIT | INTEGRAR MÁS ADELANTE | P3 |
| [pgBackRest](https://github.com/pgbackrest/pgbackrest) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [WAL-G](https://github.com/wal-g/wal-g) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P1 |

</details>

### live-chat (3 proyectos)

**Ganadores:** `chatwoot`

<details>
<summary>Ver todos (3)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Papercups](https://github.com/papercups-io/papercups) | MIT | DESCARTAR | P3 |
| [Live Helper Chat](https://github.com/LiveHelperChat/livehelperchat) | AGPL-3.0 | DESCARTAR | P3 |
| [Chatwoot](https://github.com/chatwoot/chatwoot) | MIT | INTEGRAR MÁS ADELANTE | P1 |

</details>

### ticketing (3 proyectos)

**Ganadores:** `zammad`

<details>
<summary>Ver todos (3)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [osTicket](https://github.com/osTicket/osTicket) | GPL-2.0 | DESCARTAR | P3 |
| [UVdesk](https://github.com/uvdesk/community-skeleton) | MIT | INTEGRAR MÁS ADELANTE | P3 |
| [Zammad](https://github.com/zammad/zammad) | AGPL-3.0 | SOLO LABORATORIO | P3 |

</details>

### marketing (3 proyectos)

**Ganadores:** `magic-ui`

<details>
<summary>Ver todos (3)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Magic UI](https://github.com/magicuidesign/magicui) | MIT | INTEGRAR MÁS ADELANTE | P1 |
| [Aceternity UI](https://github.com/aceternity-ui/components) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [Erxes](https://github.com/erxes/erxes) | AGPL-3.0 | SOLO LABORATORIO | P3 |

</details>

### federated (3 proyectos)

**Ganadores:** `matrix-synapse`

<details>
<summary>Ver todos (3)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Matrix Synapse](https://github.com/element-hq/synapse) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [Conduit](https://github.com/conduit-rust/conduit) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P3 |
| [Dendrite](https://github.com/element-hq/dendrite) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P3 |

</details>

### team-chat (3 proyectos)

**Ganadores:** `rocket-chat`, `mattermost`

<details>
<summary>Ver todos (3)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Rocket.Chat](https://github.com/RocketChat/Rocket.Chat) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [Mattermost](https://github.com/mattermost/mattermost) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [Zulip](https://github.com/zulip/zulip) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P3 |

</details>

### whatsapp (3 proyectos)

**Ganadores:** `evolution-api`

<details>
<summary>Ver todos (3)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Evolution API](https://github.com/EvolutionAPI/evolution-api) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P1 |
| [WAHA](https://github.com/devlikeapro/waha) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [mautrix-whatsapp](https://github.com/mautrix/whatsapp) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P3 |

</details>

### chatbot (3 proyectos)

**Ganadores:** `typebot`, `botpress`

<details>
<summary>Ver todos (3)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Typebot](https://github.com/baptisteArno/typebot.io) | AGPL-3.0 | INTEGRAR MÁS ADELANTE | P1 |
| [Botpress](https://github.com/botpress/botpress) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [Rasa](https://github.com/RasaHQ/rasa) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P3 |

</details>

### dashboards (3 proyectos)

**Ganadores:** `metabase`, `apache-superset`, `tremor`

<details>
<summary>Ver todos (3)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Metabase](https://github.com/metabase/metabase) | AGPL-3.0 | INTEGRAR MÁS ADELANTE | P1 |
| [Apache Superset](https://github.com/apache/superset) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [Tremor](https://github.com/tremorlabs/tremor) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P1 |

</details>

### parsing (3 proyectos)

**Ganadores:** `docling`, `apache-tika`

<details>
<summary>Ver todos (3)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Docling](https://github.com/docling-project/docling) | MIT | INTEGRAR MÁS ADELANTE | P1 |
| [Apache Tika](https://github.com/apache/tika) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [Marker](https://github.com/VikParuchuri/marker) | GPL-3.0 | SOLO LABORATORIO | P3 |

</details>

### go (3 proyectos)

**Ganadores:** `colly`, `chromedp`

<details>
<summary>Ver todos (3)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Colly](https://github.com/gocolly/colly) | BSD-3-Clause | INTEGRAR MÁS ADELANTE | P2 |
| [chromedp](https://github.com/chromedp/chromedp) | MIT | INTEGRAR MÁS ADELANTE | P3 |
| [Rod](https://github.com/go-rod/rod) | MIT | INTEGRAR MÁS ADELANTE | P3 |

</details>

### streaming (3 proyectos)

**Ganadores:** `jellyfin`, `streamlink`, `obs-studio`

<details>
<summary>Ver todos (3)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Jellyfin](https://github.com/jellyfin/jellyfin) | GPL-2.0 | SOLO LABORATORIO | P3 |
| [Streamlink](https://github.com/streamlink/streamlink) | BSD-2-Clause | SOLO LABORATORIO | P3 |
| [OBS Studio](https://github.com/obsproject/obs-studio) | GPL-2.0 | SOLO LABORATORIO | P3 |

</details>

### animation (3 proyectos)

**Ganadores:** `lottie`, `framer-motion`, `synfig`

<details>
<summary>Ver todos (3)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Framer Motion](https://github.com/motiondivision/motion) | MIT | INTEGRAR AHORA | P1 |
| [Lottie](https://github.com/airbnb/lottie-web) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [Synfig Studio](https://github.com/synfig/synfig) | GPL-3.0 | SOLO LABORATORIO | P3 |

</details>

### avatar (3 proyectos)

**Ganadores:** `liveportrait`, `sadtalker`, `wav2lip`

<details>
<summary>Ver todos (3)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [LivePortrait](https://github.com/KlingTeam/LivePortrait) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [SadTalker](https://github.com/OpenTalker/SadTalker) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [Wav2Lip](https://github.com/Rudrabha/Wav2Lip) | MIT | INTEGRAR MÁS ADELANTE | P3 |

</details>

### accessibility (3 proyectos)

**Ganadores:** `radix-ui`, `react-aria`, `headlessui`

<details>
<summary>Ver todos (3)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Radix UI](https://github.com/radix-ui/primitives) | MIT | INTEGRAR AHORA | P0 |
| [React Aria](https://github.com/adobe/react-spectrum) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [Headless UI](https://github.com/tailwindlabs/headlessui) | MIT | INTEGRAR MÁS ADELANTE | P2 |

</details>

### typescript (3 proyectos)

**Ganadores:** `payload-cms`

<details>
<summary>Ver todos (3)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Payload CMS](https://github.com/payloadcms/payload) | MIT | INTEGRAR MÁS ADELANTE | P1 |
| [KeystoneJS](https://github.com/keystonejs/keystone) | MIT | INTEGRAR MÁS ADELANTE | P3 |
| [Vendure](https://github.com/vendure-ecommerce/vendure) | GPL-3.0 | SOLO LABORATORIO | P3 |

</details>

### unit (3 proyectos)

**Ganadores:** `vitest`, `testing-library`

<details>
<summary>Ver todos (3)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Vitest](https://github.com/vitest-dev/vitest) | MIT | INTEGRAR AHORA | P0 |
| [Testing Library](https://github.com/testing-library/react-testing-library) | MIT | INTEGRAR AHORA | P0 |
| [Jest](https://github.com/jestjs/jest) | MIT | INTEGRAR MÁS ADELANTE | P3 |

</details>

### load (3 proyectos)

**Ganadores:** `k6`, `locust`

<details>
<summary>Ver todos (3)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [k6](https://github.com/grafana/k6) | AGPL-3.0 | INTEGRAR MÁS ADELANTE | P1 |
| [Locust](https://github.com/locustio/locust) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [Artillery](https://github.com/artilleryio/artillery) | MPL-2.0 | INTEGRAR MÁS ADELANTE | P3 |

</details>

### monorepo (3 proyectos)

**Ganadores:** `turborepo`, `syncpack`

<details>
<summary>Ver todos (3)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Turborepo](https://github.com/vercel/turborepo) | MIT | INTEGRAR MÁS ADELANTE | P1 |
| [Nx](https://github.com/nrwl/nx) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [Syncpack](https://github.com/JamieMason/syncpack) | MIT | INTEGRAR MÁS ADELANTE | P2 |

</details>

### git-hooks (3 proyectos)

**Ganadores:** `husky`, `lint-staged`

<details>
<summary>Ver todos (3)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Husky](https://github.com/typicode/husky) | MIT | INTEGRAR AHORA | P1 |
| [lint-staged](https://github.com/lint-staged/lint-staged) | MIT | INTEGRAR AHORA | P1 |
| [Lefthook](https://github.com/evilmartians/lefthook) | MIT | INTEGRAR MÁS ADELANTE | P2 |

</details>

### mlops (2 proyectos)

**Ganadores:** `bentoml`, `ray-serve`

<details>
<summary>Ver todos (2)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [BentoML](https://github.com/bentoml/BentoML) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [Ray Serve](https://github.com/ray-project/ray) | Apache-2.0 | SOLO LABORATORIO | P3 |

</details>

### bpm (2 proyectos)

**Ganadores:** `camunda`

<details>
<summary>Ver todos (2)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Bonita](https://github.com/bonitasoft/bonita-engine) | GPL-2.0 | DESCARTAR | P3 |
| [Camunda 8](https://github.com/camunda/camunda) | Apache-2.0 | SOLO LABORATORIO | P3 |

</details>

### apm (2 proyectos)

**Ganadores:** `signoz`, `sentry-self-host`

<details>
<summary>Ver todos (2)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [SigNoz](https://github.com/SigNoz/signoz) | MIT | INTEGRAR MÁS ADELANTE | P1 |
| [Sentry (self-hosted)](https://github.com/getsentry/sentry) | BSL-1.1 | INTEGRAR MÁS ADELANTE | P1 |

</details>

### infra (2 proyectos)

**Ganadores:** `checkmk`

<details>
<summary>Ver todos (2)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Checkmk](https://github.com/checkmk/checkmk) | GPL-2.0 | DESCARTAR | P3 |
| [Zabbix](https://github.com/zabbix/zabbix) | GPL-2.0 | SOLO LABORATORIO | P3 |

</details>

### dast (2 proyectos)

**Ganadores:** `owasp-zap`, `zaproxy`

<details>
<summary>Ver todos (2)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [OWASP ZAP](https://github.com/zaproxy/zaproxy) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P1 |
| [OWASP ZAP](https://github.com/zaproxy/zaproxy) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P1 |

</details>

### sast (2 proyectos)

**Ganadores:** `semgrep`, `codeql`

<details>
<summary>Ver todos (2)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Semgrep](https://github.com/semgrep/semgrep) | LGPL-2.1 | INTEGRAR AHORA | P1 |
| [CodeQL](https://github.com/github/codeql) | MIT | INTEGRAR MÁS ADELANTE | P1 |

</details>

### waf (2 proyectos)

**Ganadores:** `crowdsec`, `modsecurity`

<details>
<summary>Ver todos (2)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [CrowdSec](https://github.com/crowdsecurity/crowdsec) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [ModSecurity](https://github.com/owasp-modsecurity/ModSecurity) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P3 |

</details>

### authorization (2 proyectos)

**Ganadores:** `casbin`

<details>
<summary>Ver todos (2)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Casbin](https://github.com/casbin/casbin) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [OpenFGA](https://github.com/openfga/openfga) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |

</details>

### storage (2 proyectos)

**Ganadores:** `minio`

<details>
<summary>Ver todos (2)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [MinIO](https://github.com/minio/minio) | AGPL-3.0 | INTEGRAR MÁS ADELANTE | P1 |
| [Garage](https://github.com/deuxfleurs/garage) | AGPL-3.0 | SOLO LABORATORIO | P3 |

</details>

### object (2 proyectos)

**Ganadores:** `minio`

<details>
<summary>Ver todos (2)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [MinIO](https://github.com/minio/minio) | AGPL-3.0 | INTEGRAR MÁS ADELANTE | P1 |
| [Garage](https://github.com/deuxfleurs/garage) | AGPL-3.0 | SOLO LABORATORIO | P3 |

</details>

### timeseries (2 proyectos)

**Ganadores:** `timescaledb`

<details>
<summary>Ver todos (2)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [TimescaleDB](https://github.com/timescale/timescaledb) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [QuestDB](https://github.com/questdb/questdb) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P3 |

</details>

### backend (2 proyectos)

**Ganadores:** `pocketbase`, `supabase`

<details>
<summary>Ver todos (2)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [PocketBase](https://github.com/pocketbase/pocketbase) | MIT | SOLO LABORATORIO | P3 |
| [Supabase](https://github.com/supabase/supabase) | Apache-2.0 | SOLO LABORATORIO | P3 |

</details>

### paas (2 proyectos)

**Ganadores:** `coolify`

<details>
<summary>Ver todos (2)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Coolify](https://github.com/coollabsio/coolify) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |
| [Dokku](https://github.com/dokku/dokku) | MIT | INTEGRAR MÁS ADELANTE | P3 |

</details>

### iac (2 proyectos)

**Ganadores:** `terraform`

<details>
<summary>Ver todos (2)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Terraform](https://github.com/hashicorp/terraform) | BSL-1.0 | INTEGRAR MÁS ADELANTE | P2 |
| [OpenTofu](https://github.com/opentofu/opentofu) | MPL-2.0 | INTEGRAR MÁS ADELANTE | P2 |

</details>

### gitops (2 proyectos)

**Ganadores:** `argocd`

<details>
<summary>Ver todos (2)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Argo CD](https://github.com/argoproj/argo-cd) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P3 |
| [Flux](https://github.com/fluxcd/flux2) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P3 |

</details>

### mail-server (2 proyectos)

**Ganadores:** `mailu`

<details>
<summary>Ver todos (2)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Mailu](https://github.com/Mailu/Mailu) | MIT | SOLO LABORATORIO | P3 |
| [mailcow](https://github.com/mailcow/mailcow-dockerized) | GPL-3.0 | SOLO LABORATORIO | P3 |

</details>

### imap (2 proyectos)

**Ganadores:** `wildduck`, `emailengine`

<details>
<summary>Ver todos (2)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [WildDuck](https://github.com/nodemailer/wildduck) | EUPL-1.2 | INTEGRAR MÁS ADELANTE | P3 |
| [EmailEngine](https://github.com/postalsys/emailengine) | MIT | INTEGRAR MÁS ADELANTE | P2 |

</details>

### dev-tools (2 proyectos)

**Ganadores:** `mailhog`

<details>
<summary>Ver todos (2)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [MailHog](https://github.com/mailhog/MailHog) | MIT | INTEGRAR AHORA | P1 |
| [Mailpit](https://github.com/axllent/mailpit) | MIT | INTEGRAR AHORA | P1 |

</details>

### compliance (2 proyectos)

**Ganadores:** `email-suppression-db`, `list-unsubscribe-header`

<details>
<summary>Ver todos (2)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Suppression List Pattern](https://github.com/awsdocs/aws-doc-sdk-examples) | Apache-2.0 | INTEGRAR AHORA | P1 |
| [List-Unsubscribe Tools](https://github.com/RFC2369/list-unsubscribe) | MIT | INTEGRAR AHORA | P1 |

</details>

### nlp (2 proyectos)

**Ganadores:** 

<details>
<summary>Ver todos (2)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Rasa](https://github.com/RasaHQ/rasa) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P3 |
| [Newspaper3k](https://github.com/codelucas/newspaper) | MIT | INTEGRAR MÁS ADELANTE | P3 |

</details>

### meetings (2 proyectos)

**Ganadores:** `jitsi-meet`

<details>
<summary>Ver todos (2)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Jitsi Meet](https://github.com/jitsi/jitsi-meet) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P3 |
| [Jitsi](https://github.com/jitsi/jitsi-meet) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P3 |

</details>

### log-analysis (2 proyectos)

**Ganadores:** `goaccess`

<details>
<summary>Ver todos (2)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [GoAccess](https://github.com/allinurl/goaccess) | MIT | INTEGRAR MÁS ADELANTE | P3 |
| [AWStats](https://github.com/eldy/awstats) | GPL-3.0 | SOLO LABORATORIO | P3 |

</details>

### dms (2 proyectos)

**Ganadores:** `paperless-ngx`, `mayan-edms`

<details>
<summary>Ver todos (2)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Mayan EDMS](https://github.com/mayan-edms/mayan-edms) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P3 |
| [Paperless-ngx](https://github.com/paperless-ngx/paperless-ngx) | GPL-3.0 | SOLO LABORATORIO | P3 |

</details>

### content-extraction (2 proyectos)

**Ganadores:** `trafilatura`, `readability`

<details>
<summary>Ver todos (2)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Trafilatura](https://github.com/adbar/trafilatura) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P1 |
| [Mozilla Readability](https://github.com/mozilla/readability) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |

</details>

### archive (2 proyectos)

**Ganadores:** `browsertrix`, `single-file`

<details>
<summary>Ver todos (2)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [SingleFile](https://github.com/gildas-lormeau/SingleFile) | AGPL-3.0 | INTEGRAR MÁS ADELANTE | P3 |
| [Browsertrix Crawler](https://github.com/webrecorder/browsertrix-crawler) | AGPL-3.0 | SOLO LABORATORIO | P3 |

</details>

### editor (2 proyectos)

**Ganadores:** `shotcut`, `polotno`

<details>
<summary>Ver todos (2)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Polotno SDK](https://github.com/polotno-project/polotno-node) | Proprietary | INTEGRAR MÁS ADELANTE | P2 |
| [Shotcut](https://github.com/mltframework/shotcut) | GPL-3.0 | SOLO LABORATORIO | P3 |

</details>

### web (2 proyectos)

**Ganadores:** `lottie`, `svg-edit`

<details>
<summary>Ver todos (2)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Lottie](https://github.com/airbnb/lottie-web) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [SVG-Edit](https://github.com/SVG-Edit/svgedit) | MIT | INTEGRAR MÁS ADELANTE | P3 |

</details>

### clone (2 proyectos)

**Ganadores:** `xtts`

<details>
<summary>Ver todos (2)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [XTTS v2](https://github.com/coqui-ai/TTS) | MPL-2.0 | SOLO LABORATORIO | P3 |
| [OpenVoice](https://github.com/myshell-ai/OpenVoice) | MIT | SOLO LABORATORIO | P3 |

</details>

### components (2 proyectos)

**Ganadores:** `shadcn-ui`

<details>
<summary>Ver todos (2)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [shadcn/ui](https://github.com/shadcn-ui/ui) | MIT | INTEGRAR AHORA | P0 |
| [HeroUI](https://github.com/heroui-inc/heroui) | MIT | INTEGRAR MÁS ADELANTE | P2 |

</details>

### charts (2 proyectos)

**Ganadores:** `tremor`, `recharts`

<details>
<summary>Ver todos (2)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Tremor](https://github.com/tremorlabs/tremor) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P1 |
| [Recharts](https://github.com/recharts/recharts) | MIT | INTEGRAR MÁS ADELANTE | P2 |

</details>

### css (2 proyectos)

**Ganadores:** `tailwindcss`, `brand-colors`

<details>
<summary>Ver todos (2)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Tailwind CSS](https://github.com/tailwindlabs/tailwindcss) | MIT | INTEGRAR AHORA | P0 |
| [Sass Color Tools](https://github.com/sass/sass) | MIT | INTEGRAR MÁS ADELANTE | P3 |

</details>

### icons (2 proyectos)

**Ganadores:** `lucide`, `iconify`

<details>
<summary>Ver todos (2)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Lucide](https://github.com/lucide-icons/lucide) | ISC | INTEGRAR AHORA | P0 |
| [Iconify](https://github.com/iconify/iconify) | MIT | INTEGRAR MÁS ADELANTE | P2 |

</details>

### laravel (2 proyectos)

**Ganadores:** `bagisto`, `octobercms`

<details>
<summary>Ver todos (2)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Bagisto](https://github.com/bagisto/bagisto) | MIT | INTEGRAR MÁS ADELANTE | P3 |
| [October CMS](https://github.com/octobercms/october) | MIT | INTEGRAR MÁS ADELANTE | P3 |

</details>

### e2e (2 proyectos)

**Ganadores:** `playwright`

<details>
<summary>Ver todos (2)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Playwright](https://github.com/microsoft/playwright) | Apache-2.0 | INTEGRAR AHORA | P0 |
| [Cypress](https://github.com/cypress-io/cypress) | MIT | INTEGRAR MÁS ADELANTE | P3 |

</details>

### documentation (2 proyectos)

**Ganadores:** `storybook`, `swagger-ui`

<details>
<summary>Ver todos (2)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Storybook](https://github.com/storybookjs/storybook) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [Swagger UI](https://github.com/swagger-api/swagger-ui) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |

</details>

### mocking (2 proyectos)

**Ganadores:** `wiremock`, `msw`

<details>
<summary>Ver todos (2)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [MSW](https://github.com/mswjs/msw) | MIT | INTEGRAR AHORA | P1 |
| [WireMock](https://github.com/wiremock/wiremock) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |

</details>

### linting (2 proyectos)

**Ganadores:** `eslint`, `biome`

<details>
<summary>Ver todos (2)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [ESLint](https://github.com/eslint/eslint) | MIT | INTEGRAR AHORA | P0 |
| [Biome](https://github.com/biomejs/biome) | MIT | INTEGRAR MÁS ADELANTE | P1 |

</details>

### formatting (2 proyectos)

**Ganadores:** `biome`, `prettier`

<details>
<summary>Ver todos (2)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Prettier](https://github.com/prettier/prettier) | MIT | INTEGRAR AHORA | P0 |
| [Biome](https://github.com/biomejs/biome) | MIT | INTEGRAR MÁS ADELANTE | P1 |

</details>

### build (2 proyectos)

**Ganadores:** `turborepo`

<details>
<summary>Ver todos (2)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Turborepo](https://github.com/vercel/turborepo) | MIT | INTEGRAR MÁS ADELANTE | P1 |
| [Nx](https://github.com/nrwl/nx) | MIT | INTEGRAR MÁS ADELANTE | P2 |

</details>

### release (2 proyectos)

**Ganadores:** `changesets`, `semantic-release`

<details>
<summary>Ver todos (2)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Changesets](https://github.com/changesets/changesets) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [semantic-release](https://github.com/semantic-release/semantic-release) | MIT | INTEGRAR MÁS ADELANTE | P3 |

</details>

### bundler (2 proyectos)

**Ganadores:** `esbuild`, `vite`

<details>
<summary>Ver todos (2)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [esbuild](https://github.com/evanw/esbuild) | MIT | INTEGRAR AHORA | P1 |
| [Vite](https://github.com/vitejs/vite) | MIT | INTEGRAR AHORA | P0 |

</details>

### codemod (2 proyectos)

**Ganadores:** `jscodeshift`, `ast-grep`

<details>
<summary>Ver todos (2)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [jscodeshift](https://github.com/facebook/jscodeshift) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [ast-grep](https://github.com/ast-grep/ast-grep) | MIT | INTEGRAR MÁS ADELANTE | P2 |

</details>

### dependencies (2 proyectos)

**Ganadores:** `syncpack`, `renovate`

<details>
<summary>Ver todos (2)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Syncpack](https://github.com/JamieMason/syncpack) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [Renovate](https://github.com/renovatebot/renovate) | AGPL-3.0 | INTEGRAR MÁS ADELANTE | P1 |

</details>

### wiki (2 proyectos)

**Ganadores:** `bookstack`

<details>
<summary>Ver todos (2)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [BookStack](https://github.com/BookStackApp/BookStack) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [Outline](https://github.com/outline/outline) | BSL-1.1 | INTEGRAR MÁS ADELANTE | P3 |

</details>

### docs (2 proyectos)

**Ganadores:** `bookstack`

<details>
<summary>Ver todos (2)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [BookStack](https://github.com/BookStackApp/BookStack) | MIT | INTEGRAR MÁS ADELANTE | P2 |
| [Outline](https://github.com/outline/outline) | BSL-1.1 | INTEGRAR MÁS ADELANTE | P3 |

</details>

### time-tracking (2 proyectos)

**Ganadores:** `kimai`

<details>
<summary>Ver todos (2)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Kimai](https://github.com/kimai/kimai) | AGPL-3.0 | INTEGRAR MÁS ADELANTE | P3 |
| [Solidtime](https://github.com/solidtime-io/solidtime) | AGPL-3.0 | SOLO LABORATORIO | P3 |

</details>

### webhooks (2 proyectos)

**Ganadores:** `svix`, `webhook-capture`

<details>
<summary>Ver todos (2)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Svix](https://github.com/svix/svix-webhooks) | MIT | INTEGRAR MÁS ADELANTE | P1 |
| [Webhook.site OSS](https://github.com/webhooksite/webhook.site) | MIT | INTEGRAR MÁS ADELANTE | P2 |

</details>

### whiteboard (2 proyectos)

**Ganadores:** `excalidraw`, `tldraw`

<details>
<summary>Ver todos (2)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Excalidraw](https://github.com/excalidraw/excalidraw) | MIT | INTEGRAR MÁS ADELANTE | P1 |
| [tldraw](https://github.com/tldraw/tldraw) | MIT | INTEGRAR MÁS ADELANTE | P2 |

</details>

### diagrams (2 proyectos)

**Ganadores:** `excalidraw`, `drawio`

<details>
<summary>Ver todos (2)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Excalidraw](https://github.com/excalidraw/excalidraw) | MIT | INTEGRAR MÁS ADELANTE | P1 |
| [draw.io (Diagrams.net)](https://github.com/jgraph/drawio) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |

</details>

### local-ai (1 proyectos)

**Ganadores:** `ollama`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Ollama](https://github.com/ollama/ollama) | MIT | INTEGRAR AHORA | P0 |

</details>

### coding (1 proyectos)

**Ganadores:** `tabby`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Tabby](https://github.com/TabbyML/tabby) | Apache-2.0 | SOLO LABORATORIO | P3 |

</details>

### ml (1 proyectos)

**Ganadores:** `huggingface-transformers`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Transformers](https://github.com/huggingface/transformers) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |

</details>

### structured-output (1 proyectos)

**Ganadores:** `instructor`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Instructor](https://github.com/567-labs/instructor) | MIT | INTEGRAR AHORA | P1 |

</details>

### postgres (1 proyectos)

**Ganadores:** `pgvector`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [pgvector](https://github.com/pgvector/pgvector) | PostgreSQL | INTEGRAR AHORA | P0 |

</details>

### ingest (1 proyectos)

**Ganadores:** `unstructured`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Unstructured](https://github.com/Unstructured-IO/unstructured) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P1 |

</details>

### eval (1 proyectos)

**Ganadores:** `ragas`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [RAGAS](https://github.com/explodinggradients/ragas) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P1 |

</details>

### memory (1 proyectos)

**Ganadores:** `mem0`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Mem0](https://github.com/mem0ai/mem0) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |

</details>

### reranker (1 proyectos)

**Ganadores:** `cohere-rerank`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Cross-Encoder Rerankers](https://github.com/cross-encoder/ms-marco-MiniLM-L-6-v2) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |

</details>

### iot (1 proyectos)

**Ganadores:** `node-red`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Node-RED](https://github.com/node-red/node-red) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |

</details>

### queue (1 proyectos)

**Ganadores:** `bullmq`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [BullMQ](https://github.com/taskforcesh/bullmq) | MIT | INTEGRAR AHORA | P1 |

</details>

### runbooks (1 proyectos)

**Ganadores:** `rundeck`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Rundeck](https://github.com/rundeck/rundeck) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P3 |

</details>

### data-flow (1 proyectos)

**Ganadores:** `apache-nifi`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Apache NiFi](https://github.com/apache/nifi) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P3 |

</details>

### integrations (1 proyectos)

**Ganadores:** `pipedream`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Pipedream](https://github.com/PipedreamHQ/pipedream) | MIT | INTEGRAR MÁS ADELANTE | P3 |

</details>

### visualization (1 proyectos)

**Ganadores:** `grafana`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Grafana](https://github.com/grafana/grafana) | AGPL-3.0 | INTEGRAR MÁS ADELANTE | P1 |

</details>

### logging (1 proyectos)

**Ganadores:** `loki`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Loki](https://github.com/grafana/loki) | AGPL-3.0 | INTEGRAR MÁS ADELANTE | P1 |

</details>

### uptime (1 proyectos)

**Ganadores:** `uptime-kuma`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Uptime Kuma](https://github.com/louislam/uptime-kuma) | MIT | INTEGRAR AHORA | P1 |

</details>

### alerting (1 proyectos)

**Ganadores:** `alertmanager`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Alertmanager](https://github.com/prometheus/alertmanager) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P1 |

</details>

### collector (1 proyectos)

**Ganadores:** `alloy`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Grafana Alloy](https://github.com/grafana/alloy) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |

</details>

### llm (1 proyectos)

**Ganadores:** `langfuse`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Langfuse](https://github.com/langfuse/langfuse) | MIT | INTEGRAR MÁS ADELANTE | P1 |

</details>

### scanning (1 proyectos)

**Ganadores:** `trivy`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Trivy](https://github.com/aquasecurity/trivy) | Apache-2.0 | INTEGRAR AHORA | P1 |

</details>

### runtime (1 proyectos)

**Ganadores:** `falco`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Falco](https://github.com/falco-security/falco) | Apache-2.0 | SOLO LABORATORIO | P3 |

</details>

### mfa (1 proyectos)

**Ganadores:** 

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Authelia](https://github.com/authelia/authelia) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P3 |

</details>

### passkeys (1 proyectos)

**Ganadores:** `passkeys-webauthn`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [SimpleWebAuthn](https://github.com/MasterKale/SimpleWebAuthn) | MIT | INTEGRAR MÁS ADELANTE | P2 |

</details>

### siem (1 proyectos)

**Ganadores:** `wazuh`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Wazuh](https://github.com/wazuh/wazuh) | GPL-2.0 | SOLO LABORATORIO | P3 |

</details>

### sbom (1 proyectos)

**Ganadores:** `dependency-track`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Dependency-Track](https://github.com/DependencyTrack/dependency-track) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |

</details>

### relational (1 proyectos)

**Ganadores:** `postgresql`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [PostgreSQL](https://github.com/postgres/postgres) | PostgreSQL | INTEGRAR AHORA | P0 |

</details>

### distributed (1 proyectos)

**Ganadores:** `cockroachdb`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [CockroachDB](https://github.com/cockroachdb/cockroach) | BSL-1.0 | SOLO LABORATORIO | P3 |

</details>

### pooling (1 proyectos)

**Ganadores:** `pgbouncer`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [PgBouncer](https://github.com/pgbouncer/pgbouncer) | ISC | INTEGRAR AHORA | P0 |

</details>

### migrations (1 proyectos)

**Ganadores:** `schemaflyway`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Flyway](https://github.com/flyway/flyway) | Apache-2.0 | SOLO LABORATORIO | P3 |

</details>

### multi-model (1 proyectos)

**Ganadores:** `surrealdb`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [SurrealDB](https://github.com/surrealdb/surrealdb) | BSL-1.0 | DESCARTAR | P3 |

</details>

### config (1 proyectos)

**Ganadores:** `ansible`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Ansible](https://github.com/ansible/ansible) | GPL-3.0 | INTEGRAR MÁS ADELANTE | P3 |

</details>

### deploy (1 proyectos)

**Ganadores:** `railway-cli`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Railway CLI](https://github.com/railwayapp/cli) | MIT | INTEGRAR AHORA | P0 |

</details>

### marketing-automation (1 proyectos)

**Ganadores:** `mautic`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Mautic](https://github.com/mautic/mautic) | GPL-3.0 | INTEGRAR MÁS ADELANTE | P1 |

</details>

### nonprofit (1 proyectos)

**Ganadores:** `civicrm`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [CiviCRM](https://github.com/civicrm/civicrm-core) | AGPL-3.0 | SOLO LABORATORIO | P3 |

</details>

### personal (1 proyectos)

**Ganadores:** `monica`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Monica](https://github.com/monicaHQ/monica) | AGPL-3.0 | SOLO LABORATORIO | P3 |

</details>

### anti-spam (1 proyectos)

**Ganadores:** `rspamd`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Rspamd](https://github.com/rspamd/rspamd) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P3 |

</details>

### lists (1 proyectos)

**Ganadores:** `mailman3`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [GNU Mailman 3](https://github.com/mailman/mailman) | GPL-3.0 | INTEGRAR MÁS ADELANTE | P3 |

</details>

### admin (1 proyectos)

**Ganadores:** `postfixadmin`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [PostfixAdmin](https://github.com/postfixadmin/postfixadmin) | GPL-2.0 | SOLO LABORATORIO | P3 |

</details>

### push (1 proyectos)

**Ganadores:** `ntfy`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [ntfy](https://github.com/binwiederhier/ntfy) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |

</details>

### webrtc (1 proyectos)

**Ganadores:** `livekit`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [LiveKit](https://github.com/livekit/livekit) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |

</details>

### bridge (1 proyectos)

**Ganadores:** 

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [mautrix-whatsapp](https://github.com/mautrix/whatsapp) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P3 |

</details>

### product (1 proyectos)

**Ganadores:** `posthog`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [PostHog](https://github.com/PostHog/posthog) | MIT | INTEGRAR MÁS ADELANTE | P1 |

</details>

### data-pipeline (1 proyectos)

**Ganadores:** `snowplow`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Snowplow](https://github.com/snowplow/snowplow) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P3 |

</details>

### reports (1 proyectos)

**Ganadores:** `evidence-dev`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Evidence](https://github.com/evidence-dev/evidence) | MIT | INTEGRAR MÁS ADELANTE | P2 |

</details>

### semantic-layer (1 proyectos)

**Ganadores:** `cube`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Cube](https://github.com/cube-js/cube) | MIT | INTEGRAR MÁS ADELANTE | P2 |

</details>

### ab-testing (1 proyectos)

**Ganadores:** `growthbook`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [GrowthBook](https://github.com/growthbook/growthbook) | MIT | INTEGRAR MÁS ADELANTE | P2 |

</details>

### feature-flags (1 proyectos)

**Ganadores:** `growthbook`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [GrowthBook](https://github.com/growthbook/growthbook) | MIT | INTEGRAR MÁS ADELANTE | P2 |

</details>

### rank-tracking (1 proyectos)

**Ganadores:** `serposcope`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Serposcope](https://github.com/serph-rotator/serposcope) | MIT | INTEGRAR MÁS ADELANTE | P2 |

</details>

### cdp (1 proyectos)

**Ganadores:** `tracardi`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Tracardi](https://github.com/Tracardi/tracardi) | MIT | INTEGRAR MÁS ADELANTE | P2 |

</details>

### ops (1 proyectos)

**Ganadores:** `grafana-oncall`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Grafana OnCall](https://github.com/grafana/oncall) | AGPL-3.0 | INTEGRAR MÁS ADELANTE | P3 |

</details>

### html (1 proyectos)

**Ganadores:** `weasyprint`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [WeasyPrint](https://github.com/Kozea/WeasyPrint) | BSD-3-Clause | INTEGRAR MÁS ADELANTE | P2 |

</details>

### ebooks (1 proyectos)

**Ganadores:** `calibre`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [calibre](https://github.com/kovidgoyal/calibre) | GPL-3.0 | SOLO LABORATORIO | P3 |

</details>

### images (1 proyectos)

**Ganadores:** `imagemagick`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [ImageMagick](https://github.com/ImageMagick/ImageMagick) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |

</details>

### tables (1 proyectos)

**Ganadores:** `camelot`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Camelot](https://github.com/camelot-dev/camelot) | MIT | INTEGRAR MÁS ADELANTE | P2 |

</details>

### nodejs (1 proyectos)

**Ganadores:** `crawlee`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Crawlee](https://github.com/apify/crawlee) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P1 |

</details>

### html-parsing (1 proyectos)

**Ganadores:** `cheerio`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Cheerio](https://github.com/cheeriojs/cheerio) | MIT | INTEGRAR AHORA | P1 |

</details>

### mirror (1 proyectos)

**Ganadores:** `httrack`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [HTTrack](https://github.com/xroche/httrack) | GPL-3.0 | SOLO LABORATORIO | P3 |

</details>

### deployment (1 proyectos)

**Ganadores:** `scrapyd`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Scrapyd](https://github.com/scrapy/scrapyd) | BSD-3-Clause | INTEGRAR MÁS ADELANTE | P2 |

</details>

### news (1 proyectos)

**Ganadores:** 

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Newspaper3k](https://github.com/codelucas/newspaper) | MIT | INTEGRAR MÁS ADELANTE | P3 |

</details>

### download (1 proyectos)

**Ganadores:** 

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [urlgrabber](https://github.com/rpm-software-management/urlgrabber) | LGPL-2.1 | DESCARTAR | P3 |

</details>

### declarative (1 proyectos)

**Ganadores:** `ferret`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Ferret](https://github.com/MontFerret/ferret) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P3 |

</details>

### links (1 proyectos)

**Ganadores:** `linkchecker`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [LinkChecker](https://github.com/linkchecker/linkchecker) | GPL-2.0 | INTEGRAR MÁS ADELANTE | P2 |

</details>

### computer-vision (1 proyectos)

**Ganadores:** `opencv`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [OpenCV](https://github.com/opencv/opencv) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |

</details>

### training (1 proyectos)

**Ganadores:** `kohya-ss`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [kohya_ss](https://github.com/bmaltais/kohya_ss) | Apache-2.0 | SOLO LABORATORIO | P3 |

</details>

### transcoding (1 proyectos)

**Ganadores:** `handbrake`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [HandBrake](https://github.com/HandBrake/HandBrake) | GPL-2.0 | INTEGRAR MÁS ADELANTE | P3 |

</details>

### recording (1 proyectos)

**Ganadores:** `obs-studio`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [OBS Studio](https://github.com/obsproject/obs-studio) | GPL-2.0 | SOLO LABORATORIO | P3 |

</details>

### lip-sync (1 proyectos)

**Ganadores:** `wav2lip`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Wav2Lip](https://github.com/Rudrabha/Wav2Lip) | MIT | INTEGRAR MÁS ADELANTE | P3 |

</details>

### assistant (1 proyectos)

**Ganadores:** `rhasspy`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Rhasspy](https://github.com/rhasspy/rhasspy) | MIT | SOLO LABORATORIO | P3 |

</details>

### research (1 proyectos)

**Ganadores:** `espnet`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [ESPnet](https://github.com/espnet/espnet) | Apache-2.0 | SOLO LABORATORIO | P3 |

</details>

### music (1 proyectos)

**Ganadores:** `audiocraft`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [AudioCraft](https://github.com/facebookresearch/audiocraft) | MIT | INTEGRAR MÁS ADELANTE | P3 |

</details>

### diarization (1 proyectos)

**Ganadores:** `pyannote-audio`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [pyannote.audio](https://github.com/pyannote/pyannote-audio) | MIT | INTEGRAR MÁS ADELANTE | P2 |

</details>

### enhancement (1 proyectos)

**Ganadores:** `voicefixer`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [VoiceFixer](https://github.com/haoheliu/voicefixer) | MIT | INTEGRAR MÁS ADELANTE | P3 |

</details>

### data-fetching (1 proyectos)

**Ganadores:** `tanstack-query`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [TanStack Query](https://github.com/TanStack/query) | MIT | INTEGRAR AHORA | P0 |

</details>

### data-grid (1 proyectos)

**Ganadores:** `tanstack-table`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [TanStack Table](https://github.com/TanStack/table) | MIT | INTEGRAR AHORA | P0 |

</details>

### routing (1 proyectos)

**Ganadores:** `tanstack-router`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [TanStack Router](https://github.com/TanStack/router) | MIT | INTEGRAR MÁS ADELANTE | P2 |

</details>

### forms (1 proyectos)

**Ganadores:** `react-hook-form`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [React Hook Form](https://github.com/react-hook-form/react-hook-form) | MIT | INTEGRAR AHORA | P0 |

</details>

### state (1 proyectos)

**Ganadores:** `zustand`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Zustand](https://github.com/pmndrs/zustand) | MIT | INTEGRAR AHORA | P1 |

</details>

### design-system (1 proyectos)

**Ganadores:** `tailwindcss`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Tailwind CSS](https://github.com/tailwindlabs/tailwindcss) | MIT | INTEGRAR AHORA | P0 |

</details>

### command-palette (1 proyectos)

**Ganadores:** `cmdk`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [cmdk](https://github.com/pacocoursey/cmdk) | MIT | INTEGRAR MÁS ADELANTE | P1 |

</details>

### drawer (1 proyectos)

**Ganadores:** `vaul`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Vaul](https://github.com/emilkowalski/vaul) | MIT | INTEGRAR MÁS ADELANTE | P2 |

</details>

### blog (1 proyectos)

**Ganadores:** `ghost`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Ghost](https://github.com/TryGhost/Ghost) | MIT | INTEGRAR MÁS ADELANTE | P2 |

</details>

### publishing (1 proyectos)

**Ganadores:** `ghost`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Ghost](https://github.com/TryGhost/Ghost) | MIT | INTEGRAR MÁS ADELANTE | P2 |

</details>

### serverless (1 proyectos)

**Ganadores:** `webiny`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Webiny](https://github.com/webiny/webiny-js) | MIT | SOLO LABORATORIO | P3 |

</details>

### ruby (1 proyectos)

**Ganadores:** `spree`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Spree Commerce](https://github.com/spree/spree) | BSD-3-Clause | SOLO LABORATORIO | P3 |

</details>

### enterprise (1 proyectos)

**Ganadores:** `typo3`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [TYPO3](https://github.com/TYPO3/typo3) | GPL-2.0 | SOLO LABORATORIO | P3 |

</details>

### visual-builder (1 proyectos)

**Ganadores:** `builder-io`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Builder.io SDK](https://github.com/BuilderIO/builder) | MIT | INTEGRAR MÁS ADELANTE | P2 |

</details>

### wordpress (1 proyectos)

**Ganadores:** `woocommerce`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [WooCommerce](https://github.com/woocommerce/woocommerce) | GPL-3.0 | INTEGRAR MÁS ADELANTE | P2 |

</details>

### git-based (1 proyectos)

**Ganadores:** `tina-cms`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [TinaCMS](https://github.com/tinacms/tinacms) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |

</details>

### browser (1 proyectos)

**Ganadores:** `playwright`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Playwright](https://github.com/microsoft/playwright) | Apache-2.0 | INTEGRAR AHORA | P0 |

</details>

### performance (1 proyectos)

**Ganadores:** `k6`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [k6](https://github.com/grafana/k6) | AGPL-3.0 | INTEGRAR MÁS ADELANTE | P1 |

</details>

### quality (1 proyectos)

**Ganadores:** `sonarqube`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [SonarQube](https://github.com/SonarSource/sonarqube) | LGPL-3.0 | INTEGRAR MÁS ADELANTE | P1 |

</details>

### static-analysis (1 proyectos)

**Ganadores:** `sonarqube`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [SonarQube](https://github.com/SonarSource/sonarqube) | LGPL-3.0 | INTEGRAR MÁS ADELANTE | P1 |

</details>

### contract (1 proyectos)

**Ganadores:** `pact`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Pact](https://github.com/pact-foundation/pact-js) | MIT | INTEGRAR MÁS ADELANTE | P2 |

</details>

### docker (1 proyectos)

**Ganadores:** `testcontainers`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Testcontainers](https://github.com/testcontainers/testcontainers-node) | MIT | INTEGRAR MÁS ADELANTE | P1 |

</details>

### mutation (1 proyectos)

**Ganadores:** `stryker`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Stryker Mutator](https://github.com/stryker-mutator/stryker-js) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P3 |

</details>

### reporting (1 proyectos)

**Ganadores:** `allure`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Allure Report](https://github.com/allure-framework/allure2) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P3 |

</details>

### visual (1 proyectos)

**Ganadores:** `chromatic`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Chromatic](https://github.com/chromaui/chromatic-cli) | MIT | INTEGRAR MÁS ADELANTE | P2 |

</details>

### versioning (1 proyectos)

**Ganadores:** `changesets`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Changesets](https://github.com/changesets/changesets) | MIT | INTEGRAR MÁS ADELANTE | P2 |

</details>

### language (1 proyectos)

**Ganadores:** `typescript`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [TypeScript](https://github.com/microsoft/TypeScript) | Apache-2.0 | INTEGRAR AHORA | P0 |

</details>

### git (1 proyectos)

**Ganadores:** `commitlint`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Commitlint](https://github.com/conventional-changelog/commitlint) | MIT | INTEGRAR MÁS ADELANTE | P2 |

</details>

### conventions (1 proyectos)

**Ganadores:** `commitlint`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Commitlint](https://github.com/conventional-changelog/commitlint) | MIT | INTEGRAR MÁS ADELANTE | P2 |

</details>

### ci (1 proyectos)

**Ganadores:** `semantic-release`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [semantic-release](https://github.com/semantic-release/semantic-release) | MIT | INTEGRAR MÁS ADELANTE | P3 |

</details>

### dead-code (1 proyectos)

**Ganadores:** `knip`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Knip](https://github.com/webpro/knip) | ISC | INTEGRAR MÁS ADELANTE | P2 |

</details>

### compiler (1 proyectos)

**Ganadores:** `swc`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [SWC](https://github.com/swc-project/swc) | Apache-2.0 | INTEGRAR AHORA | P1 |

</details>

### dev-server (1 proyectos)

**Ganadores:** `vite`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Vite](https://github.com/vitejs/vite) | MIT | INTEGRAR AHORA | P0 |

</details>

### files (1 proyectos)

**Ganadores:** `nextcloud`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Nextcloud](https://github.com/nextcloud/server) | AGPL-3.0 | INTEGRAR MÁS ADELANTE | P2 |

</details>

### scheduling (1 proyectos)

**Ganadores:** `cal-com`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Cal.com](https://github.com/calcom/cal.com) | AGPL-3.0 | INTEGRAR MÁS ADELANTE | P1 |

</details>

### accounting (1 proyectos)

**Ganadores:** `akaunting`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Akaunting](https://github.com/akaunting/akaunting) | BSL-1.1 | SOLO LABORATORIO | P3 |

</details>

### invoicing (1 proyectos)

**Ganadores:** 

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Invoice Ninja](https://github.com/invoiceninja/invoiceninja) | Elastic-2.0 | SOLO LABORATORIO | P3 |

</details>

### password-manager (1 proyectos)

**Ganadores:** `vaultwarden`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Vaultwarden](https://github.com/dani-garcia/vaultwarden) | AGPL-3.0 | INTEGRAR MÁS ADELANTE | P2 |

</details>

### notes (1 proyectos)

**Ganadores:** `appflowy`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [AppFlowy](https://github.com/AppFlowy-IO/AppFlowy) | AGPL-3.0 | SOLO LABORATORIO | P3 |

</details>

### office (1 proyectos)

**Ganadores:** `onlyoffice`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [ONLYOFFICE](https://github.com/ONLYOFFICE/DocumentServer) | AGPL-3.0 | INTEGRAR MÁS ADELANTE | P3 |

</details>

### agile (1 proyectos)

**Ganadores:** 

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Taiga](https://github.com/taigaio/taiga-back) | MPL-2.0 | INTEGRAR MÁS ADELANTE | P3 |

</details>

### encrypted (1 proyectos)

**Ganadores:** `cryptpad`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [CryptPad](https://github.com/cryptpad/cryptpad) | AGPL-3.0 | INTEGRAR MÁS ADELANTE | P3 |

</details>

### rest (1 proyectos)

**Ganadores:** `postgrest`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [PostgREST](https://github.com/PostgREST/postgrest) | MIT | INTEGRAR MÁS ADELANTE | P2 |

</details>

### aggregation (1 proyectos)

**Ganadores:** `krakend`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [KrakenD](https://github.com/krakend/krakend-ce) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |

</details>

### codegen (1 proyectos)

**Ganadores:** `openapi-generator`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [OpenAPI Generator](https://github.com/OpenAPITools/openapi-generator) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |

</details>

### oauth (1 proyectos)

**Ganadores:** `nango`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Nango](https://github.com/NangoHQ/nango) | Elastic-2.0 | INTEGRAR MÁS ADELANTE | P1 |

</details>

### client (1 proyectos)

**Ganadores:** `hoppscotch`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Hoppscotch](https://github.com/hoppscotch/hoppscotch) | MIT | INTEGRAR MÁS ADELANTE | P2 |

</details>

### bff (1 proyectos)

**Ganadores:** 

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [WunderGraph](https://github.com/wundergraph/wundergraph) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |

</details>

### management (1 proyectos)

**Ganadores:** `gravitee`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Gravitee APIM](https://github.com/gravitee-io/gravitee-api-management) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P3 |

</details>

### debugging (1 proyectos)

**Ganadores:** `webhook-capture`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Webhook.site OSS](https://github.com/webhooksite/webhook.site) | MIT | INTEGRAR MÁS ADELANTE | P2 |

</details>

### federation (1 proyectos)

**Ganadores:** `apollo-router`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Apollo Router](https://github.com/apollographql/router) | MIT | INTEGRAR MÁS ADELANTE | P3 |

</details>

### sdk (1 proyectos)

**Ganadores:** `zapier-platform`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Zapier Platform CLI](https://github.com/zapier/zapier-platform) | MIT | INTEGRAR MÁS ADELANTE | P3 |

</details>

### zero-trust (1 proyectos)

**Ganadores:** `pomerium`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Pomerium](https://github.com/pomerium/pomerium) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P1 |

</details>

### flowcharts (1 proyectos)

**Ganadores:** `drawio`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [draw.io (Diagrams.net)](https://github.com/jgraph/drawio) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P2 |

</details>

### vector (1 proyectos)

**Ganadores:** `inkscape`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Inkscape](https://github.com/inkscape/inkscape) | GPL-3.0 | SOLO LABORATORIO | P3 |

</details>

### raster (1 proyectos)

**Ganadores:** `krita`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Krita](https://github.com/KDE/krita) | GPL-3.0 | SOLO LABORATORIO | P3 |

</details>

### illustration (1 proyectos)

**Ganadores:** `krita`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Krita](https://github.com/KDE/krita) | GPL-3.0 | SOLO LABORATORIO | P3 |

</details>

### image-editing (1 proyectos)

**Ganadores:** `gimp`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [GIMP](https://github.com/GNOME/gimp) | GPL-3.0 | INTEGRAR MÁS ADELANTE | P3 |

</details>

### svg (1 proyectos)

**Ganadores:** `svg-edit`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [SVG-Edit](https://github.com/SVG-Edit/svgedit) | MIT | INTEGRAR MÁS ADELANTE | P3 |

</details>

### 3d (1 proyectos)

**Ganadores:** `blender`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Blender](https://github.com/blender/blender) | GPL-3.0 | SOLO LABORATORIO | P3 |

</details>

### 2d (1 proyectos)

**Ganadores:** `synfig`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Synfig Studio](https://github.com/synfig/synfig) | GPL-3.0 | SOLO LABORATORIO | P3 |

</details>

### colors (1 proyectos)

**Ganadores:** `coolors-pattern`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [ColorHunt API Pattern](https://github.com/cristianbgp/color-hunt-api) | MIT | INTEGRAR MÁS ADELANTE | P3 |

</details>

### typography (1 proyectos)

**Ganadores:** `fontsource`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Fontsource](https://github.com/fontsource/fontsource) | MIT | INTEGRAR AHORA | P1 |

</details>

### handoff (1 proyectos)

**Ganadores:** `storybook-design`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Storybook Design Addon](https://github.com/storybookjs/addon-designs) | MIT | INTEGRAR MÁS ADELANTE | P2 |

</details>

### page-builder (1 proyectos)

**Ganadores:** `grapesjs`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [GrapesJS](https://github.com/GrapesJS/grapesjs) | BSD-3-Clause | INTEGRAR MÁS ADELANTE | P2 |

</details>

### placeholders (1 proyectos)

**Ganadores:** `logo-squid`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [LogoSquirrel](https://github.com/logoipsum/logoipsum) | MIT | INTEGRAR MÁS ADELANTE | P3 |

</details>

### firefox (1 proyectos)

**Ganadores:** `camoufox`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Camoufox](https://github.com/daijro/camoufox) | MPL-2.0 | SOLO LABORATORIO | P3 |

</details>

### mobile (1 proyectos)

**Ganadores:** `appium`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Appium](https://github.com/appium/appium) | Apache-2.0 | SOLO LABORATORIO | P3 |

</details>

### query (1 proyectos)

**Ganadores:** 

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [AgentQL](https://github.com/tinyfish-io/agentql) | MIT | INTEGRAR MÁS ADELANTE | P2 |

</details>

### grid (1 proyectos)

**Ganadores:** `selenium-grid`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Selenium Grid](https://github.com/SeleniumHQ/docker-selenium) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P3 |

</details>

### scaling (1 proyectos)

**Ganadores:** `selenium-grid`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [Selenium Grid](https://github.com/SeleniumHQ/docker-selenium) | Apache-2.0 | INTEGRAR MÁS ADELANTE | P3 |

</details>

### webdriver (1 proyectos)

**Ganadores:** `chromedriver`

<details>
<summary>Ver todos (1)</summary>

| Proyecto | Licencia | Clasificación | Prioridad |
|---|---|---|---|
| [ChromeDriver](https://github.com/ChromeDriver/chromedriver) | BSD-3-Clause | INTEGRAR MÁS ADELANTE | P3 |

</details>

---

## Ficha estándar (campos JSON)

Cada proyecto en `master-open-source-catalog.json` incluye:

`id`, `name`, `repository`, `license`, `commercialUseAllowed`, `categories`, `description`, `nelvyonValue`, `maturity`, `risk`, `quality`, `community`, `maintenanceStatus`, `documentation`, `integrationDifficulty`, `windowsCompatible`, `dockerCompatible`, `privateModeCompatible`, `nelvyonArchitectureFit`, `dependencies`, `resourceConsumption`, `replacesExisting`, `classification`, `priority`, `worthIntegrating`, `securityNotes`, `alternativesDiscarded`.

---

## Documentos relacionados

| Documento | Contenido |
|---|---|
| `MASTER_OPEN_SOURCE_SECURITY.md` | Riesgos, hardening, PRIVATE_MODE |
| `MASTER_OPEN_SOURCE_LICENSES.md` | Matriz de licencias |
| `MASTER_OPEN_SOURCE_COMPARISON.md` | Comparativas head-to-head |
| `MASTER_OPEN_SOURCE_ROADMAP.md` | Plan de integración por fases |
