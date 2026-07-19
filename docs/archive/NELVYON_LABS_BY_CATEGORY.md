# NELVYON-LABS — Inventario por categoría

> Generado: 2026-07-15T18:00:12.839Z  
> **461 proyectos** agrupados. Tabla maestra: [`NELVYON_LABS_MASTER_TABLE.md`](./NELVYON_LABS_MASTER_TABLE.md)

---

## Índice de categorías

- [IA / LLM](#ia-llm) (16)
- [Agentes](#agentes) (22)
- [MCP](#mcp) (3)
- [RAG](#rag) (9)
- [Memoria](#memoria) (1)
- [Automatización](#automatizaci-n) (14)
- [CRM](#crm) (15)
- [SEO](#seo) (5)
- [Redes Sociales](#redes-sociales) (20)
- [Email](#email) (19)
- [Analítica](#anal-tica) (8)
- [BI](#bi) (6)
- [Bases de datos](#bases-de-datos) (27)
- [Backend](#backend) (20)
- [Frontend](#frontend) (20)
- [UI](#ui) (20)
- [Testing](#testing) (20)
- [DevOps](#devops) (37)
- [Docker](#docker) (1)
- [Seguridad](#seguridad) (20)
- [Observabilidad](#observabilidad) (13)
- [OCR](#ocr) (3)
- [Documentos](#documentos) (9)
- [PDFs](#pdfs) (8)
- [Vídeo](#v-deo) (20)
- [Audio](#audio) (19)
- [APIs](#apis) (20)
- [Integraciones](#integraciones) (39)
- [Productividad](#productividad) (20)
- [Otros](#otros) (7)


---

## IA / LLM

**16 proyectos**

| Nº | Nombre | Categoría | Repositorio oficial | Licencia | Estado | Prioridad | Qué hace | Para qué en NELVYON | Sustituye (pago) | ¿Ya tenemos algo? | Recomendación |
|---:|---|---|---|---|---|---|---|---|---|---|---|
| 1 | BentoML | IA / LLM | https://github.com/bentoml/BentoML | Apache-2.0 | Descargado | Más adelante | Model serving framework with OpenAI endpoints. | Package FastAPI agents as versioned inference services. | — | No | Revisar |
| 2 | ExLlamaV2 | IA / LLM | https://github.com/turboderp/exllamav2 | MIT | Descargado | Laboratorio | Fast GPTQ/EXL2 inference on NVIDIA. | Optimize 8B strategy model on RTX 3050. | — | No | Mantener solo en laboratorio |
| 3 | Infinity | IA / LLM | https://github.com/michaelfeil/infinity | MIT | Descargado | Más adelante | High-throughput embedding/reranker server. | Scale embedding beyond Ollama for RAG ingest. | — | No | Revisar |
| 4 | LiteLLM | IA / LLM | https://github.com/BerriAI/litellm | MIT | Descargado | Más adelante | Unified LLM gateway/proxy with routing, budgets, logging. | Model router gateway for cloud+local fallback in OS. | — | No | Revisar |
| 5 | llama.cpp | IA / LLM | https://github.com/ggml-org/llama.cpp | MIT | Descargado | Más adelante | High-performance C++ LLM inference engine. | Backend engine behind Ollama; direct use for custom quant pipelines. | — | Sí | Revisar |
| 6 | Llamafile | IA / LLM | https://github.com/Mozilla-Ocho/llamafile | Apache-2.0 | Descargado | Laboratorio | Single-file local LLM distribution. | Portable demos for agency clients offline. | — | No | Mantener solo en laboratorio |
| 7 | MLC LLM | IA / LLM | https://github.com/mlc-ai/mlc-llm | Apache-2.0 | Descargado | Laboratorio | Universal LLM deployment via TVM. | Cross-device inference research. | — | No | Mantener solo en laboratorio |
| 8 | Ollama | IA / LLM | https://github.com/ollama/ollama | MIT | Descargado | Integrar ahora | Local LLM runtime with model pull, OpenAI-compatible API. | Core PRIVATE_MODE inference — already integrated Phase 2. | — | Sí | Integrar |
| 9 | Open WebUI | IA / LLM | https://github.com/open-webui/open-webui | BSD-3-Clause | Descargado | Más adelante | Chat UI for Ollama/OpenAI-compatible backends. | Internal ops console for PRIVATE_MODE QA. | — | No | Revisar |
| 10 | Ray Serve | IA / LLM | https://github.com/ray-project/ray | Apache-2.0 | Descargado | Laboratorio | Scalable model serving and distributed compute. | Future GPU cluster for pack batch runs. | — | No | Mantener solo en laboratorio |
| 11 | Sentence Transformers | IA / LLM | https://github.com/huggingface/sentence-transformers | Apache-2.0 | Descargado | Más adelante | State-of-the-art embedding and reranker models library. | Python pack agents embedding models beyond Ollama nomic. | — | Sí | Revisar |
| 12 | Tabby | IA / LLM | https://github.com/TabbyML/tabby | Apache-2.0 | Descargado | Laboratorio | Self-hosted AI coding assistant server. | Dev productivity for NELVYON team; not end-user feature. | — | No | Mantener solo en laboratorio |
| 13 | Text Embeddings Inference | IA / LLM | https://github.com/huggingface/text-embeddings-inference | Apache-2.0 | Descargado | Más adelante | HuggingFace embedding inference server. | Production embedding service alternative to Ollama embed. | — | No | Revisar |
| 14 | Text Generation WebUI | IA / LLM | https://github.com/oobabooga/text-generation-webui | AGPL-3.0 | Descargado | Laboratorio | Gradio UI for local LLM experimentation. | Lab only — not for prod SaaS embedding. | — | No | Mantener solo en laboratorio |
| 15 | Transformers | IA / LLM | https://github.com/huggingface/transformers | Apache-2.0 | Descargado | Más adelante | Reference ML library for models and pipelines. | Python pack agents fine-tuning/eval pipelines. | — | No | Revisar |
| 16 | vLLM | IA / LLM | https://github.com/vllm-project/vllm | Apache-2.0 | Descargado | Más adelante | High-throughput LLM serving with PagedAttention. | Scale OS pack generation when GPU server available. | — | No | Revisar |

---

## Agentes

**22 proyectos**

| Nº | Nombre | Categoría | Repositorio oficial | Licencia | Estado | Prioridad | Qué hace | Para qué en NELVYON | Sustituye (pago) | ¿Ya tenemos algo? | Recomendación |
|---:|---|---|---|---|---|---|---|---|---|---|---|
| 17 | Apache Airflow | Agentes | https://github.com/apache/airflow | Apache-2.0 | Descargado | Más adelante | Platform to programmatically author, schedule, and monitor DAGs. | Batch ETL for CRM analytics; Prefect already in agents catalog. | — | Sí | Revisar |
| 18 | Argo Workflows | Agentes | https://github.com/argoproj/argo-workflows | Apache-2.0 | Descargado | Laboratorio | Kubernetes-native workflow engine for parallel job orchestration. | Future K8s GPU batch for pack generation. | — | No | Mantener solo en laboratorio |
| 19 | AutoGen | Agentes | https://github.com/microsoft/autogen | Unknown | Descargado | Laboratorio | Multi-agent conversation framework from Microsoft. | Research for multi-agent pack QA loops. | — | No | Mantener solo en laboratorio |
| 20 | CrewAI | Agentes | https://github.com/crewAIInc/crewAI | Unknown | Descargado | Más adelante | Role-based multi-agent crews for tasks. | Marketing pack role templates (SEO, copy, ads). | — | No | Revisar |
| 21 | Dagster | Agentes | https://github.com/dagster-io/dagster | Apache-2.0 | Descargado | Más adelante | Data orchestrator with software-defined assets and observability. | Pack pipeline asset lineage and CRM data pipelines. | — | No | Revisar |
| 22 | Dify | Agentes | https://github.com/langgenius/dify | Apache-2.0 | Descargado | Laboratorio | LLM app platform with workflows, RAG, agents. | Rapid internal prototyping; overlaps SaaS OS. | — | No | Mantener solo en laboratorio |
| 23 | Flowise | Agentes | https://github.com/FlowiseAI/Flowise | Apache-2.0 | Descargado | Laboratorio | Low-code LLM flow builder. | Agency ops build flows without code. | — | No | Mantener solo en laboratorio |
| 24 | Guardrails AI | Agentes | https://github.com/guardrails-ai/guardrails | Apache-2.0 | Descargado | Más adelante | LLM output validation and safety rails. | Complement RouterValidator for pack QA. | — | No | Revisar |
| 25 | Hatchet | Agentes | https://github.com/hatchet-dev/hatchet | MIT | Descargado | Más adelante | Durable task orchestration with concurrency and scheduling. | Lightweight Temporal alternative for pack retry logic. | — | No | Revisar |
| 26 | Hayhooks | Agentes | https://github.com/deepset-ai/haystack | Apache-2.0 | Descargado | Más adelante | Haystack pipeline server for RAG/agents. | See Haystack entry — pipeline hosting. | — | No | Revisar |
| 27 | Instructor | Agentes | https://github.com/567-labs/instructor | MIT | Descargado | Integrar ahora | Structured LLM outputs with Pydantic validation. | Pack deliverable JSON validation layer. | — | No | Integrar |
| 28 | K3s | Agentes | https://github.com/k3s-io/k3s | Apache-2.0 | Descargado | Más adelante | Lightweight certified Kubernetes distribution. | Single-node K8s for GPU host without full cluster ops. | — | No | Revisar |
| 29 | Kestra | Agentes | https://github.com/kestra-io/kestra | Apache-2.0 | Descargado | Más adelante | Event-driven declarative orchestration with UI and plugins. | YAML-first workflows for ops; alternative to Temporal for simpler jobs. | — | No | Revisar |
| 30 | Kubernetes | Agentes | https://github.com/kubernetes/kubernetes | Apache-2.0 | Descargado | Más adelante | Container orchestration platform for scaling and self-healing. | Future GPU cluster for pack batch; Railway handles current scale. | — | No | Revisar |
| 31 | LangGraph | Agentes | https://github.com/langchain-ai/langgraph | MIT | Descargado | Más adelante | Stateful agent workflows as graphs with checkpoints. | OS pack orchestrator evolution beyond custom TS. | custom pack orchestrator partial | No | Revisar |
| 32 | Luigi | Agentes | https://github.com/spotify/luigi | Apache-2.0 | Descargado | Laboratorio | Spotify batch workflow manager for Hadoop and local pipelines. | Legacy batch reference; Prefect/Dagster preferred for new pipelines. | — | No | Mantener solo en laboratorio |
| 33 | OpenClaw | Agentes | https://github.com/openclaw/openclaw | MIT | Descargado | Laboratorio | Personal AI assistant with messaging integrations. | Planned bridge (NELVYON_OPENCLAW_BRIDGE) — evaluate vs MCP. | — | No | Mantener solo en laboratorio |
| 34 | Prefect | Agentes | https://github.com/PrefectHQ/prefect | Apache-2.0 | Descargado | Más adelante | Modern workflow orchestration for data/ML pipelines. | ETL CRM + pack batch scheduling alternative. | — | No | Revisar |
| 35 | PydanticAI | Agentes | https://github.com/pydantic/pydantic-ai | MIT | Descargado | Más adelante | Type-safe agent framework from Pydantic team. | FastAPI agents with structured outputs. | — | No | Revisar |
| 36 | Semantic Kernel | Agentes | https://github.com/microsoft/semantic-kernel | MIT | Descargado | Más adelante | Enterprise AI orchestration SDK (.NET/Python/Java). | Enterprise-grade planner for OS if .NET not required. | — | No | Revisar |
| 37 | Sim | Agentes | https://github.com/simstudioai/sim | Apache-2.0 | Descargado | Laboratorio | AI agent workflow builder. | Early — monitor vs Dify/LangGraph. | — | No | Mantener solo en laboratorio |
| 38 | Temporal | Agentes | https://github.com/temporalio/temporal | MIT | Descargado | Más adelante | Durable workflow engine for long-running processes. | Replace cron idempotency for workflows + pack runs. | node-cron partial | Sí | Revisar |

---

## MCP

**3 proyectos**

| Nº | Nombre | Categoría | Repositorio oficial | Licencia | Estado | Prioridad | Qué hace | Para qué en NELVYON | Sustituye (pago) | ¿Ya tenemos algo? | Recomendación |
|---:|---|---|---|---|---|---|---|---|---|---|---|
| 39 | MCP Python SDK | MCP | https://github.com/modelcontextprotocol/python-sdk | MIT | Descargado | Más adelante | Official MCP SDK for FastAPI agents. | Wire FastAPI backend agents to MCP tools. | — | No | Revisar |
| 40 | MCP Servers (official) | MCP | https://github.com/modelcontextprotocol/servers | MIT | Descargado | Más adelante | Reference MCP servers: filesystem, git, postgres, etc. | Starter tool pack for agency automation. | — | No | Revisar |
| 41 | MCP TypeScript SDK | MCP | https://github.com/modelcontextprotocol/typescript-sdk | MIT | Descargado | Más adelante | Official Model Context Protocol SDK for TS servers/clients. | Standard tool bridge for router + OS agents. | — | No | Revisar |

---

## RAG

**9 proyectos**

| Nº | Nombre | Categoría | Repositorio oficial | Licencia | Estado | Prioridad | Qué hace | Para qué en NELVYON | Sustituye (pago) | ¿Ya tenemos algo? | Recomendación |
|---:|---|---|---|---|---|---|---|---|---|---|---|
| 42 | Haystack | RAG | https://github.com/deepset-ai/haystack | Apache-2.0 | Descargado | Más adelante | Production NLP/RAG pipelines with components and eval. | Complements hayhooks in agents catalog — pipeline design reference. | — | No | Revisar |
| 43 | LangChain | RAG | https://github.com/langchain-ai/langchain | MIT | Descargado | Más adelante | Composable LLM application framework with integrations. | Integration glue; LlamaIndex preferred for RAG-first design. | — | No | Revisar |
| 44 | LlamaIndex | RAG | https://github.com/run-llama/llama_index | MIT | Descargado | Más adelante | Data framework for LLM apps: ingest, index, query, agents. | Reference patterns for OS pack RAG pipelines beyond custom TS. | — | No | Revisar |
| 45 | pgvector | RAG | https://github.com/pgvector/pgvector | PostgreSQL | Descargado | Integrar ahora | Postgres extension for vector similarity search. | Core RAG store — already in Phase 2 LocalVectorStore on Postgres 16. | — | Sí | Integrar |
| 46 | R2R | RAG | https://github.com/SciPhi-AI/R2R | MIT | Descargado | Más adelante | Production RAG API: ingest, hybrid search, agents, eval. | End-to-end RAG microservice pattern for OS knowledge packs. | — | No | Revisar |
| 47 | RAGAS | RAG | https://github.com/explodinggradients/ragas | Apache-2.0 | Descargado | Más adelante | RAG evaluation metrics: faithfulness, context recall, answer relevancy. | Benchmark LocalRagRetriever and specialization pipeline quality. | — | No | Revisar |
| 48 | Sentence Transformers (Rerankers) | RAG | https://github.com/huggingface/sentence-transformers | Apache-2.0 | Sustituido | Más adelante | Local cross-encoder reranking models via sentence-transformers. | Improve LocalRagRetriever top-k precision post pgvector. | — | No | Revisar |
| 49 | txtai | RAG | https://github.com/neuml/txtai | Apache-2.0 | Descargado | Más adelante | All-in-one embeddings database, semantic search, and workflows. | Compact RAG stack for agency one-off deployments. | — | No | Revisar |
| 50 | Unstructured | RAG | https://github.com/Unstructured-IO/unstructured | Apache-2.0 | Descargado | Más adelante | Document parsing and chunking for PDF, DOCX, HTML, etc. | Knowledge ingest pipeline for agency client docs. | — | No | Revisar |

---

## Memoria

**1 proyectos**

| Nº | Nombre | Categoría | Repositorio oficial | Licencia | Estado | Prioridad | Qué hace | Para qué en NELVYON | Sustituye (pago) | ¿Ya tenemos algo? | Recomendación |
|---:|---|---|---|---|---|---|---|---|---|---|---|
| 51 | Mem0 | Memoria | https://github.com/mem0ai/mem0 | Apache-2.0 | Descargado | Más adelante | Scalable memory layer for personalized AI agents. | Tenant-scoped CRM conversation memory for OS chatbot pack. | — | No | Revisar |

---

## Automatización

**14 proyectos**

| Nº | Nombre | Categoría | Repositorio oficial | Licencia | Estado | Prioridad | Qué hace | Para qué en NELVYON | Sustituye (pago) | ¿Ya tenemos algo? | Recomendación |
|---:|---|---|---|---|---|---|---|---|---|---|---|
| 52 | Activepieces | Automatización | https://github.com/activepieces/activepieces | Unknown | Descargado | Más adelante | Open-source Zapier alternative with AI pieces. | Tenant workflow automation competitor to n8n. | Zapier blueprint | No | Revisar |
| 53 | Apache NiFi | Automatización | https://github.com/apache/nifi | Apache-2.0 | Descargado | Más adelante | Visual data flow automation with provenance and backpressure. | CRM data ingestion from client systems with audit trail. | — | No | Revisar |
| 54 | BullMQ | Automatización | https://github.com/taskforcesh/bullmq | MIT | Descargado | Integrar ahora | Redis-based job queue for Node with retries and rate limits. | Email campaign and workflow job queue on Redis. | — | No | Integrar |
| 55 | Camunda 8 | Automatización | https://github.com/camunda/camunda | Apache-2.0 | Descargado | Laboratorio | BPMN workflow engine for business process automation. | Enterprise client BPM; heavy for SaaS core. | — | No | Mantener solo en laboratorio |
| 56 | Huginn | Automatización | https://github.com/huginn/huginn | MIT | Descargado | Laboratorio | Build agents that monitor and act on events across the web. | Internal ops monitoring agents; lighter than n8n for scraping. | — | No | Mantener solo en laboratorio |
| 57 | Inngest | Automatización | https://github.com/inngest/inngest | Unknown | Descargado | Más adelante | Event-driven durable functions for serverless and Node. | Serverless workflow steps; self-host vs Trigger.dev eval. | — | No | Revisar |
| 58 | Jenkins | Automatización | https://github.com/jenkinsci/jenkins | MIT | Descargado | Más adelante | Extensible automation server for CI/CD and scheduled jobs. | Legacy CI; GitHub Actions primary — Jenkins for client on-prem. | — | No | Revisar |
| 59 | n8n | Automatización | https://github.com/n8n-io/n8n | Unknown | Descargado | Más adelante | Fair-code workflow automation with 400+ integrations and AI nodes. | Tenant + agency workflow automation; complements SaasWorkflowService. | Zapier/Make partial | Sí | Revisar |
| 60 | Node-RED | Automatización | https://github.com/node-red/node-red | Apache-2.0 | Descargado | Más adelante | Flow-based low-code programming for event-driven integrations. | IoT/webhook glue for agency client automations. | — | No | Revisar |
| 61 | Pipedream | Automatización | https://github.com/PipedreamHQ/pipedream | Unknown | Descargado | Más adelante | Connect APIs with code steps; OSS components and SDK. | Integration reference for SaaS connector catalog. | — | No | Revisar |
| 62 | Rundeck | Automatización | https://github.com/rundeck/rundeck | Apache-2.0 | Descargado | Más adelante | Runbook automation and scheduled job orchestration. | Agency ops scheduled maintenance scripts. | — | No | Revisar |
| 63 | StackStorm | Automatización | https://github.com/StackStorm/st2 | Apache-2.0 | Descargado | Laboratorio | Event-driven automation platform (IFTTT for infra). | DevOps runbooks and incident response automation. | — | No | Mantener solo en laboratorio |
| 64 | Trigger.dev | Automatización | https://github.com/triggerdotdev/trigger.dev | Apache-2.0 | Descargado | Más adelante | Background jobs and long-running tasks for TypeScript apps. | Next.js 15 async pack steps and webhook retries on Railway. | node-cron partial | No | Revisar |
| 65 | Windmill | Automatización | https://github.com/windmill-labs/windmill | Apache-2.0 | Descargado | Laboratorio | Developer-centric workflow engine with UI. | Internal ops automation; AGPL review for SaaS. | n8n partial | No | Mantener solo en laboratorio |

---

## CRM

**15 proyectos**

| Nº | Nombre | Categoría | Repositorio oficial | Licencia | Estado | Prioridad | Qué hace | Para qué en NELVYON | Sustituye (pago) | ¿Ya tenemos algo? | Recomendación |
|---:|---|---|---|---|---|---|---|---|---|---|---|
| 66 | Atomic CRM | CRM | https://github.com/marmelab/atomic-crm | MIT | Descargado | Más adelante | React admin CRM template on Supabase/REST with contacts and deals. | Reference React CRM patterns for SaasCrmService UI refresh. | — | No | Revisar |
| 67 | Chatwoot | CRM | https://github.com/chatwoot/chatwoot | Unknown | Descargado | Más adelante | Omnichannel customer support inbox with live chat, email, and social. | Tenant support widget + agency inbox; complements SaasInbox. | Intercom partial | Sí | Revisar |
| 68 | CiviCRM | CRM | https://github.com/civicrm/civicrm-core | AGPL-3.0 | Descargado | Laboratorio | CRM for nonprofits with donations, memberships, and events. | Niche vertical for nonprofit agency clients only. | — | No | Mantener solo en laboratorio |
| 69 | Dolibarr | CRM | https://github.com/Dolibarr/dolibarr | GPL-3.0 | Descargado | Laboratorio | ERP/CRM for SMEs with invoicing, projects, and inventory. | French/EU SME client ERP; separate from NELVYON core. | — | No | Mantener solo en laboratorio |
| 70 | Erxes | CRM | https://github.com/erxes/erxes | AGPL-3.0 | Descargado | Laboratorio | Experience OS combining CRM, messaging, forms, and popups. | All-in-one growth stack reference; overlaps NELVYON SaaS modules. | — | No | Mantener solo en laboratorio |
| 71 | EspoCRM | CRM | https://github.com/espocrm/espocrm | AGPL-3.0 | Descargado | Laboratorio | Configurable CRM with sales pipeline, cases, and email integration. | Agency client on-prem CRM deployments; not for NELVYON core embedding. | — | No | Mantener solo en laboratorio |
| 72 | Frappe CRM | CRM | https://github.com/frappe/crm | AGPL-3.0 | Descargado | Más adelante | Modern CRM built on Frappe framework with deals and lead management. | Frappe ecosystem CRM; pairs with ERPNext for full stack clients. | — | No | Revisar |
| 73 | FreeScout | CRM | https://github.com/freescout-help-desk/freescout | AGPL-3.0 | Descargado | Más adelante | Shared inbox help desk for email support with modules and SLA. | Lightweight email helpdesk for small agency clients. | — | No | Revisar |
| 74 | Kanboard | CRM | https://github.com/kanboard/kanboard | MIT | Descargado | Más adelante | Minimal Kanban project management with tasks and swimlanes. | Simple client project boards; complements SaasPipeline. | — | No | Revisar |
| 75 | Mautic | CRM | https://github.com/mautic/mautic | Apache-2.0 | Descargado | Más adelante | Marketing automation with contacts, segments, campaigns, and scoring. | Lead nurturing + CRM contact sync for SaasCampaniasService. | HubSpot Marketing partial | No | Revisar |
| 76 | Monica | CRM | https://github.com/monicaHQ/monica | AGPL-3.0 | Descargado | Laboratorio | Personal relationship manager for contacts, activities, and reminders. | Personal CRM lab — not enterprise SaaS; GDPR-friendly self-host. | — | No | Mantener solo en laboratorio |
| 77 | Odoo CRM | CRM | https://github.com/odoo/odoo | LGPL-3.0 | Descargado | Más adelante | Modular ERP with CRM, sales, invoicing, and marketing apps. | All-in-one client ERP+CRM; separate from NELVYON SaaS CRM layer. | — | No | Revisar |
| 78 | Twenty | CRM | https://github.com/twentyhq/twenty | AGPL-3.0 | Descargado | Laboratorio | Modern open-source CRM with customizable objects, views, and workflows. | Reference UX for SaasCrmService evolution; AGPL limits embedded multi-tenant. | HubSpot partial | No | Mantener solo en laboratorio |
| 79 | UVdesk | CRM | https://github.com/uvdesk/community-skeleton | Unknown | Descargado | Más adelante | Symfony-based helpdesk with multi-channel tickets and knowledge base. | MIT helpdesk alternative to Chatwoot for email-first clients. | — | No | Revisar |
| 80 | Zammad | CRM | https://github.com/zammad/zammad | AGPL-3.0 | Descargado | Laboratorio | Web-based helpdesk with email, chat, phone, and social ticketing. | Enterprise helpdesk for agency ops; AGPL review for tenant-facing UI. | — | No | Mantener solo en laboratorio |

---

## SEO

**5 proyectos**

| Nº | Nombre | Categoría | Repositorio oficial | Licencia | Estado | Prioridad | Qué hace | Para qué en NELVYON | Sustituye (pago) | ¿Ya tenemos algo? | Recomendación |
|---:|---|---|---|---|---|---|---|---|---|---|---|
| 81 | Matomo | SEO | https://github.com/matomo-org/matomo | GPL-3.0 | Descargado | Más adelante | Self-hosted web analytics with privacy focus and e-commerce tracking. | Client site analytics for OS landing packs; GDPR-friendly. | Google Analytics partial | No | Revisar |
| 82 | Plausible Analytics | SEO | https://github.com/plausible/analytics | AGPL-3.0 | Descargado | Más adelante | Privacy-friendly lightweight web analytics without cookies. | Simple analytics embed for tenant landing pages. | GA4 partial | No | Revisar |
| 83 | SearXNG | SEO | https://github.com/searxng/searxng | AGPL-3.0 | Descartado | Más adelante | Privacy-respecting metasearch engine aggregating multiple sources. | SEO research and SERP monitoring without API costs. | — | No | Mantener solo en laboratorio |
| 84 | Serposcope | SEO | https://github.com/serphacker/serposcope | MIT | Sustituido | Más adelante | Search engine rank checker and SERP monitoring tool. | NELVYON-SEO pack rank tracking for client keywords. | — | No | Revisar |
| 85 | Umami | SEO | https://github.com/umami-software/umami | MIT | Descargado | Más adelante | Simple, fast, privacy-focused website analytics. | MIT analytics — preferred for NELVYON tenant dashboards. | — | No | Revisar |

---

## Redes Sociales

**20 proyectos**

| Nº | Nombre | Categoría | Repositorio oficial | Licencia | Estado | Prioridad | Qué hace | Para qué en NELVYON | Sustituye (pago) | ¿Ya tenemos algo? | Recomendación |
|---:|---|---|---|---|---|---|---|---|---|---|---|
| 86 | Apprise | Redes Sociales | https://github.com/caronc/apprise | BSD-2-Clause | Descargado | Más adelante | Push notifications to 80+ services via unified Python/CLI API. | Multi-channel alert router for ops and client notifications. | — | No | Revisar |
| 87 | Botpress | Redes Sociales | https://github.com/botpress/botpress | Unknown | Descargado | Más adelante | Conversational AI platform with NLU and multi-channel deploy. | Advanced chatbot NLU for NELVYON-CHATBOT pack SKU. | — | No | Revisar |
| 88 | Conduit | Redes Sociales | https://github.com/conduit-rust/conduit | Unknown | Descargado | Más adelante | Lightweight Matrix homeserver in Rust for small deployments. | Low-resource Matrix for PRIVATE_MODE single-tenant. | — | No | Revisar |
| 89 | Dendrite | Redes Sociales | https://github.com/element-hq/dendrite | AGPL-3.0 | Descargado | Más adelante | Second-generation Matrix homeserver in Go with modular design. | Matrix alternative to Synapse for resource-constrained hosts. | — | No | Revisar |
| 90 | Element | Redes Sociales | https://github.com/element-hq/element-web | SEE LICENSE IN README.md | Descargado | Más adelante | Matrix web/desktop client for secure team chat and rooms. | Agency ops chat UI paired with Synapse homeserver. | Slack partial | No | Revisar |
| 91 | Evolution API | Redes Sociales | https://github.com/EvolutionAPI/evolution-api | Apache-2.0 | Descargado | Más adelante | WhatsApp integration API with multi-device, webhooks, and Typebot. | WhatsApp channel for SaasInbox and campaign notifications. | Twilio WhatsApp partial | No | Revisar |
| 92 | Gotify | Redes Sociales | https://github.com/gotify/server | MIT | Descargado | Más adelante | Self-hosted push notification server with REST API and clients. | Internal push for pack completion and workflow events. | — | No | Revisar |
| 93 | Jitsi Meet | Redes Sociales | https://github.com/jitsi/jitsi-meet | Apache-2.0 | Descargado | Más adelante | Secure video conferencing with WebRTC and screen sharing. | Client kickoff calls and agency team meetings self-hosted. | Zoom partial | No | Revisar |
| 94 | LiveKit | Redes Sociales | https://github.com/livekit/livekit | Apache-2.0 | Descargado | Más adelante | WebRTC infrastructure for realtime audio, video, and data. | Embed live support video in Chatwoot or portal. | — | No | Revisar |
| 95 | Matrix Synapse | Redes Sociales | https://github.com/element-hq/synapse | Apache-2.0 | Descargado | Más adelante | Reference Matrix homeserver for federated secure messaging. | Internal team comms and client secure channels in PRIVATE_MODE. | — | No | Revisar |
| 96 | Mattermost | Redes Sociales | https://github.com/mattermost/mattermost | MIT | Descargado | Más adelante | Secure team messaging with integrations, playbooks, and calls. | Enterprise team chat with audit logs for agency compliance. | Slack | No | Revisar |
| 97 | mautrix-whatsapp | Redes Sociales | https://github.com/mautrix/whatsapp | AGPL-3.0 | Descargado | Más adelante | Matrix bridge connecting WhatsApp to Matrix rooms. | Unified inbox via Matrix instead of direct Evolution API. | — | No | Revisar |
| 98 | ntfy | Redes Sociales | https://github.com/binwiederhier/ntfy | Apache-2.0 | Descargado | Más adelante | Simple HTTP-based pub-sub notification service with mobile push. | Ops alerts and workflow notifications without Slack dependency. | — | No | Revisar |
| 99 | Rasa | Redes Sociales | https://github.com/RasaHQ/rasa | Apache-2.0 | Descargado | Más adelante | ML conversational AI framework with NLU and dialogue management. | Custom NLU training for industry-specific chatbot packs. | — | No | Revisar |
| 100 | Rocket.Chat | Redes Sociales | https://github.com/RocketChat/Rocket.Chat | MIT | Descargado | Más adelante | Team communication platform with channels, DMs, and omnichannel. | Self-hosted Slack alternative for agency teams. | Slack | No | Revisar |
| 101 | Shoutrrr | Redes Sociales | https://github.com/containrrr/shoutrrr | MIT | Descargado | Más adelante | Go notification library supporting 20+ services via URL scheme. | Lightweight alert routing in Go sidecars and workers. | — | No | Revisar |
| 102 | signal-cli | Redes Sociales | https://github.com/AsamK/signal-cli | GPL-3.0 | Descargado | Laboratorio | Signal messenger CLI for sending/receiving via linked device. | Lab-only Signal bridge — GPL and ToS constraints. | — | No | Mantener solo en laboratorio |
| 103 | Typebot | Redes Sociales | https://github.com/baptisteArno/typebot.io | Unknown | Descargado | Más adelante | Visual chatbot builder for web, WhatsApp, and Messenger. | Lead capture bots for OS landing packs and SaaS forms. | Intercom bots partial | No | Revisar |
| 104 | WAHA | Redes Sociales | https://github.com/devlikeapro/waha | Apache-2.0 | Descargado | Más adelante | WhatsApp HTTP API wrapper with Docker and multi-session support. | Lighter WhatsApp bridge alternative to Evolution API. | — | No | Revisar |
| 105 | Zulip | Redes Sociales | https://github.com/zulip/zulip | Apache-2.0 | Descargado | Más adelante | Threaded team chat organized by topics with email integration. | Threaded async comms for distributed agency teams. | — | No | Revisar |

---

## Email

**19 proyectos**

| Nº | Nombre | Categoría | Repositorio oficial | Licencia | Estado | Prioridad | Qué hace | Para qué en NELVYON | Sustituye (pago) | ¿Ya tenemos algo? | Recomendación |
|---:|---|---|---|---|---|---|---|---|---|---|---|
| 106 | EmailEngine | Email | https://github.com/postalsys/emailengine | LICENSE_EMAILENGINE | Descargado | Más adelante | Email API gateway for IMAP/SMTP with webhooks and OAuth mailboxes. | Unified email API for inbox sync beyond AWS SES outbound. | — | No | Revisar |
| 107 | GNU Mailman 3 | Email | https://github.com/mailman/mailman | MIT | Descargado | Más adelante | Mailing list manager with REST API and HyperKitty archiver. | Suppression and list-unsubscribe infrastructure for compliance. | — | No | Revisar |
| 108 | GreenMail | Email | https://github.com/greenmail-mail-test/greenmail | Apache-2.0 | Descargado | Laboratorio | In-memory email server for Java/integration test suites. | Reference pattern for email integration tests in CI. | — | No | Mantener solo en laboratorio |
| 109 | Haraka | Email | https://github.com/haraka/Haraka | MIT | Descargado | Más adelante | Node.js SMTP server with plugin architecture for inbound/outbound mail. | Custom inbound parsing for lead capture webhooks. | — | No | Revisar |
| 110 | Keila | Email | https://github.com/pentacent/keila | AGPL-3.0 | Sustituido | Más adelante | Newsletter tool with block editor, segments, and double opt-in. | Modern Listmonk alternative with better editor UX. | — | No | Revisar |
| 111 | Listmonk | Email | https://github.com/knadh/listmonk | AGPL-3.0 | Descargado | Más adelante | Self-hosted newsletter and mailing list manager with campaigns and analytics. | Tenant newsletter engine; AGPL review if exposing UI to tenants. | Mailchimp partial | No | Revisar |
| 112 | Maddy | Email | https://github.com/foxcpp/maddy | GPL-3.0 | Descargado | Laboratorio | All-in-one mail server implementing SMTP, IMAP, and LMTP in Go. | Simple single-binary mail for PRIVATE_MODE labs. | — | No | Mantener solo en laboratorio |
| 113 | mailcow | Email | https://github.com/mailcow/mailcow-dockerized | GPL-3.0 | Descargado | Laboratorio | Integrated mail server suite with SOGo, Rspamd, and Docker compose. | Enterprise client mail stack; GPL limits SaaS resale. | — | No | Mantener solo en laboratorio |
| 114 | MailHog | Email | https://github.com/mailhog/MailHog | MIT | Descargado | Integrar ahora | Email testing tool that captures SMTP for local development. | Dev/staging email capture for SaasCampaniasService QA. | — | No | Integrar |
| 115 | Mailpit | Email | https://github.com/axllent/mailpit | MIT | Descargado | Integrar ahora | Modern email testing with web UI, API, and HTML preview. | MailHog successor for Next.js dev email testing. | MailHog | No | Integrar |
| 116 | Mailu | Email | https://github.com/Mailu/Mailu | MIT | Descargado | Laboratorio | Dockerized full mail server with web admin, IMAP, and anti-spam. | Agency client mail hosting; NELVYON prod uses SES. | — | No | Mantener solo en laboratorio |
| 117 | PHPMailer (List-Unsubscribe) | Email | https://github.com/PHPMailer/PHPMailer | LGPL-3.0 | Sustituido | Integrar ahora | One-click unsubscribe header tooling and validation utilities. | CAN-SPAM/GDPR compliance for tenant email campaigns. | — | No | Integrar |
| 118 | Postal | Email | https://github.com/postalserver/postal | MIT | Descargado | Más adelante | Self-hosted mail delivery platform for transactional and bulk email. | Private SMTP infrastructure alternative to AWS SES for PRIVATE_MODE. | SES partial | No | Revisar |
| 119 | PostfixAdmin | Email | https://github.com/postfixadmin/postfixadmin | GPL-2.0 | Descargado | Laboratorio | Web admin interface for Postfix mail server virtual domains. | Mail server admin for agency-hosted email stacks. | — | No | Mantener solo en laboratorio |
| 120 | Rspamd | Email | https://github.com/rspamd/rspamd | Apache-2.0 | Descargado | Más adelante | Fast spam filtering with DKIM, DMARC, and fuzzy hashing. | Spam scoring layer for self-hosted mail or inbound lead forms. | — | No | Revisar |
| 121 | SendPortal | Email | https://github.com/mettle/sendportal | MIT | Descargado | Más adelante | Laravel-based email marketing app for campaigns and subscribers. | PHP newsletter stack for Laravel agency clients. | — | No | Revisar |
| 122 | Stalwart Mail Server | Email | https://github.com/stalwartlabs/mail-server | AGPL-3.0 | Descargado | Más adelante | Modern Rust mail server with JMAP, IMAP, and SMTP in one binary. | High-performance MTA for PRIVATE_MODE email infra research. | — | No | Revisar |
| 123 | Suppression List Pattern | Email | https://github.com/awsdocs/aws-doc-sdk-examples | Apache-2.0 | Descargado | Integrar ahora | Reference patterns for bounce/complaint suppression lists in email systems. | Extend SaasCampaniasService bounce handling with persistent suppression. | — | No | Integrar |
| 124 | WildDuck | Email | https://github.com/nodemailer/wildduck | Unknown | Descargado | Más adelante | Modern IMAP/POP3 server with REST API and MongoDB storage. | Programmatic mailbox API for agency automation. | — | No | Revisar |

---

## Analítica

**8 proyectos**

| Nº | Nombre | Categoría | Repositorio oficial | Licencia | Estado | Prioridad | Qué hace | Para qué en NELVYON | Sustituye (pago) | ¿Ya tenemos algo? | Recomendación |
|---:|---|---|---|---|---|---|---|---|---|---|---|
| 125 | AWStats | Analítica | https://github.com/eldy/awstats | GPL-3.0 | Descargado | Laboratorio | Log analyzer generating web, streaming, and mail statistics. | Legacy log stats for client server reports. | — | No | Mantener solo en laboratorio |
| 126 | GoAccess | Analítica | https://github.com/allinurl/goaccess | MIT | Descargado | Más adelante | Real-time web log analyzer and interactive terminal/HTML reports. | Quick nginx/Traefik log analytics without full BI stack. | — | No | Revisar |
| 127 | Grafana OnCall | Analítica | https://github.com/grafana/oncall | AGPL-3.0 | Descargado | Más adelante | Incident response and on-call scheduling integrated with Grafana. | Ops incident routing paired with existing Grafana stack. | — | No | Revisar |
| 128 | GrowthBook | Analítica | https://github.com/growthbook/growthbook | Unknown | Descargado | Más adelante | Open-source A/B testing and feature flag platform. | Experiment framework for pack conversion optimization. | — | No | Revisar |
| 129 | OpenReplay | Analítica | https://github.com/openreplay/openreplay | MIT | Descargado | Más adelante | Self-hosted session replay and product analytics with privacy controls. | Session replay alternative when PostHog stack is too heavy. | — | No | Revisar |
| 130 | PostHog | Analítica | https://github.com/PostHog/posthog | Unknown | Descargado | Más adelante | Product analytics, feature flags, session replay, and A/B testing. | SaaS product analytics + feature flags for gradual rollouts. | Mixpanel partial | No | Revisar |
| 131 | Snowplow | Analítica | https://github.com/snowplow/snowplow | Apache-2.0 | Descargado | Más adelante | Behavioral data collection pipeline for event analytics. | Enterprise event pipeline for multi-tenant analytics warehouse. | — | No | Revisar |
| 132 | Tracardi | Analítica | https://github.com/Tracardi/tracardi | MIT | Descargado | Más adelante | Customer data platform with event tracking and workflow automation. | Unified customer profile for CRM + marketing automation. | — | No | Revisar |

---

## BI

**6 proyectos**

| Nº | Nombre | Categoría | Repositorio oficial | Licencia | Estado | Prioridad | Qué hace | Para qué en NELVYON | Sustituye (pago) | ¿Ya tenemos algo? | Recomendación |
|---:|---|---|---|---|---|---|---|---|---|---|---|
| 133 | Apache Superset | BI | https://github.com/apache/superset | Apache-2.0 | Descargado | Más adelante | Modern data exploration and visualization platform. | Advanced BI for agency data teams; Metabase simpler for SaaS embed. | — | No | Revisar |
| 134 | Cube | BI | https://github.com/cube-js/cube | MIT | Descargado | Más adelante | Semantic layer and headless BI API for metrics and caching. | Headless metrics API for embedded tenant analytics widgets. | — | No | Revisar |
| 135 | Evidence | BI | https://github.com/evidence-dev/evidence | MIT | Descargado | Más adelante | BI as code — SQL + Markdown reports with charts and dashboards. | Git-versioned client reports for NELVYON-SEO pack deliverables. | — | No | Revisar |
| 136 | Lightdash | BI | https://github.com/lightdash/lightdash | Unknown | Descargado | Más adelante | Open-source BI for dbt projects with metrics layer. | dbt + Lightdash for agency client data warehouse BI. | — | No | Revisar |
| 137 | Metabase | BI | https://github.com/metabase/metabase | AGPL-3.0 | Descargado | Más adelante | Business intelligence with SQL queries, dashboards, and embedding. | CEO metrics and tenant CRM analytics dashboards from Postgres. | Looker partial | No | Revisar |
| 138 | Redash | BI | https://github.com/getredash/redash | Unknown | Descargado | Más adelante | Connect and query data sources, visualize and share dashboards. | SQL dashboard tool for agency analysts; Metabase preferred. | — | No | Revisar |

---

## Bases de datos

**27 proyectos**

| Nº | Nombre | Categoría | Repositorio oficial | Licencia | Estado | Prioridad | Qué hace | Para qué en NELVYON | Sustituye (pago) | ¿Ya tenemos algo? | Recomendación |
|---:|---|---|---|---|---|---|---|---|---|---|---|
| 139 | Chroma | Bases de datos | https://github.com/chroma-core/chroma | Apache-2.0 | Descargado | Laboratorio | Embedded AI-native vector database for dev and small deploys. | Local RAG prototyping; pgvector for prod. | — | No | Mantener solo en laboratorio |
| 140 | ClickHouse | Bases de datos | https://github.com/ClickHouse/ClickHouse | Apache-2.0 | Descargado | Más adelante | Columnar OLAP database for real-time analytics. | CEO metrics, campaign analytics, Langfuse/SigNoz backend. | — | No | Revisar |
| 141 | CockroachDB | Bases de datos | https://github.com/cockroachdb/cockroach | Unknown | Descargado | Laboratorio | Distributed SQL database with Postgres wire protocol. | Multi-region future; Railway single-region Postgres sufficient now. | — | No | Mantener solo en laboratorio |
| 142 | DuckDB | Bases de datos | https://github.com/duckdb/duckdb | Unknown | Descargado | Más adelante | In-process analytical SQL database for OLAP workloads. | Local analytics on pack reports and benchmark JSON exports. | — | No | Revisar |
| 143 | Flyway | Bases de datos | https://github.com/flyway/flyway | Apache-2.0 | Descargado | Laboratorio | Database migration tool with versioned SQL scripts. | Reference; NELVYON uses custom SQL migrations in backend/db. | — | No | Mantener solo en laboratorio |
| 144 | Garage | Bases de datos | https://github.com/deuxfleurs-org/garage | AGPL-3.0 | Sustituido | Laboratorio | Lightweight geo-distributed S3-compatible object store. | Edge object storage; AGPL review for SaaS. | — | No | Mantener solo en laboratorio |
| 145 | LanceDB | Bases de datos | https://github.com/lance-format/lance | Apache-2.0 | Descargado | Más adelante | Serverless embedded vector DB on Lance columnar format. | Edge/offline pack demos; Lance columnar for analytics RAG. | — | No | Revisar |
| 146 | Litestream | Bases de datos | https://github.com/benbjohnson/litestream | Apache-2.0 | Descargado | Más adelante | Streaming replication and backup for SQLite to S3/MinIO. | Backup edge SQLite services to MinIO. | — | No | Revisar |
| 147 | Milvus | Bases de datos | https://github.com/milvus-io/milvus | Apache-2.0 | Descargado | Laboratorio | Distributed vector database for billion-scale embeddings. | Overkill for Railway single-node; future GPU cluster only. | — | No | Mantener solo en laboratorio |
| 148 | MinIO | Bases de datos | https://github.com/minio/minio | AGPL-3.0 | Descargado | Más adelante | S3-compatible high-performance object storage. | Pack deliverables, RAG doc blobs, portal assets in PRIVATE_MODE. | AWS S3 partial | No | Revisar |
| 149 | ParadeDB | Bases de datos | https://github.com/paradedb/paradedb | AGPL-3.0 | Descargado | Laboratorio | Postgres extension for Elasticsearch-grade search on Postgres. | Search in Postgres without separate Meilisearch; AGPL review. | — | No | Mantener solo en laboratorio |
| 150 | pgBackRest | Bases de datos | https://github.com/pgbackrest/pgbackrest | MIT | Descargado | Más adelante | Reliable PostgreSQL backup and restore with parallel transfer. | Alternative to WAL-G for Postgres 16 PITR on Railway. | — | No | Revisar |
| 151 | PgBouncer | Bases de datos | https://github.com/pgbouncer/pgbouncer | ISC | Descargado | Integrar ahora | Lightweight connection pooler for PostgreSQL. | Essential on Railway for Next.js serverless connection limits. | — | No | Integrar |
| 152 | PocketBase | Bases de datos | https://github.com/pocketbase/pocketbase | MIT | Descargado | Laboratorio | Single-file backend with SQLite, auth, and realtime. | Rapid agency micro-sites; not NELVYON core SaaS. | — | No | Mantener solo en laboratorio |
| 153 | PostgreSQL | Bases de datos | https://github.com/postgres/postgres | PostgreSQL | Descargado | Integrar ahora | Advanced open-source relational database. | Core DB Postgres 16 — SaaS tenants, packs, pgvector RAG. | — | Sí | Integrar |
| 154 | Qdrant | Bases de datos | https://github.com/qdrant/qdrant | Apache-2.0 | Descargado | Más adelante | High-performance vector search engine with filtering and HNSW. | Dedicated vector tier if pgvector limits hit at scale. | — | Sí | Revisar |
| 155 | QuestDB | Bases de datos | https://github.com/questdb/questdb | Apache-2.0 | Descargado | Más adelante | High-performance time-series database with SQL. | High-ingest metrics if Timescale limits hit. | — | No | Revisar |
| 156 | Redis | Bases de datos | https://github.com/redis/redis | AGPL-3.0 | Descargado | Integrar ahora | In-memory data store for cache, queues, and pub/sub. | Session cache, BullMQ queues, rate limiting on Railway. | — | Parcial | Revisar |
| 157 | Redis Stack | Bases de datos | https://github.com/redis/redis | AGPL-3.0 | Descargado | Más adelante | Redis with vector search, JSON, and time series modules. | Session cache + optional vector tier; license review for SaaS. | — | No | Revisar |
| 158 | SQLite | Bases de datos | https://github.com/sqlite/sqlite | Unknown | Descargado | Más adelante | Embedded relational database engine in a single file. | Uptime Kuma and local dev; not prod SaaS primary. | — | No | Revisar |
| 159 | Supabase | Bases de datos | https://github.com/supabase/supabase | Apache-2.0 | Descargado | Laboratorio | Postgres platform with auth, storage, realtime, and REST. | Reference architecture; NELVYON uses custom Next.js+Postgres. | — | No | Mantener solo en laboratorio |
| 160 | TimescaleDB | Bases de datos | https://github.com/timescale/timescaledb | Apache-2.0 | Descargado | Más adelante | Postgres extension for time-series and analytics workloads. | Metrics and workflow events in existing Postgres 16. | — | No | Revisar |
| 161 | Typesense | Bases de datos | https://github.com/typesense/typesense | GPL-3.0 | Descargado | Laboratorio | Fast typo-tolerant search engine with vector hybrid search. | Agency portal search; GPL risky for networked SaaS. | — | No | Mantener solo en laboratorio |
| 162 | Valkey | Bases de datos | https://github.com/valkey-io/valkey | BSD-3-Clause | Descargado | Más adelante | Linux Foundation fork of Redis under BSD license. | Redis-compatible cache without SSPL license risk. | redis partial | No | Revisar |
| 163 | Vespa | Bases de datos | https://github.com/vespa-engine/vespa | Apache-2.0 | Descargado | Laboratorio | Big data serving engine for search, recommendations, RAG. | Enterprise-scale search — overkill for current Railway deploy. | — | No | Mantener solo en laboratorio |
| 164 | WAL-G | Bases de datos | https://github.com/wal-g/wal-g | Apache-2.0 | Descargado | Más adelante | Archival backup and restore for Postgres and other databases. | Postgres 16 PITR backups to MinIO/S3 on Railway. | — | No | Revisar |
| 165 | Weaviate | Bases de datos | https://github.com/weaviate/weaviate | BSD-3-Clause | Descargado | Más adelante | AI-native vector database with hybrid search and modules. | Alternative dedicated store — Qdrant preferred for simplicity. | — | No | Revisar |

---

## Backend

**20 proyectos**

| Nº | Nombre | Categoría | Repositorio oficial | Licencia | Estado | Prioridad | Qué hace | Para qué en NELVYON | Sustituye (pago) | ¿Ya tenemos algo? | Recomendación |
|---:|---|---|---|---|---|---|---|---|---|---|---|
| 166 | Bagisto | Backend | https://github.com/bagisto/bagisto | MIT | Descargado | Más adelante | Laravel-based ecommerce platform with multi-vendor support. | Laravel ecommerce for PHP agency client deployments. | — | No | Revisar |
| 167 | Builder.io SDK | Backend | https://github.com/BuilderIO/builder | MIT | Descargado | Más adelante | Visual headless CMS SDK for React/Next.js page building. | Visual page builder for OS landing pack client editing. | — | No | Revisar |
| 168 | Directus | Backend | https://github.com/directus/directus | Unknown | Descargado | Más adelante | Data platform wrapping SQL databases with instant REST/GraphQL API. | SQL-first CMS for client Postgres; GPL review for SaaS. | — | No | Revisar |
| 169 | Ghost | Backend | https://github.com/TryGhost/Ghost | Unknown | Descargado | Más adelante | Professional publishing platform for blogs and newsletters. | Client blog CMS for content marketing pack deliverables. | WordPress blog partial | No | Revisar |
| 170 | KeystoneJS | Backend | https://github.com/keystonejs/keystone | MIT | Descargado | Más adelante | GraphQL CMS and API with Prisma and React admin. | GraphQL CMS option for TypeScript-first client projects. | — | No | Revisar |
| 171 | Medusa | Backend | https://github.com/medusajs/medusa | MIT | Descargado | Más adelante | Digital commerce platform with modular architecture and admin. | Headless ecommerce for client stores in ecommerce-growth pack. | Shopify partial | No | Revisar |
| 172 | October CMS | Backend | https://github.com/octobercms/october | Unknown | Descargado | Más adelante | Self-hosted CMS platform built on Laravel. | PHP CMS for simple client brochure sites. | — | No | Revisar |
| 173 | Payload CMS | Backend | https://github.com/payloadcms/payload | MIT | Descargado | Más adelante | Next.js-native TypeScript CMS with admin UI and hooks. | Best-fit CMS for Next.js 15 stack — OS pack content backend. | — | No | Revisar |
| 174 | PrestaShop | Backend | https://github.com/PrestaShop/PrestaShop | Unknown | Descargado | Laboratorio | Popular PHP ecommerce platform with themes and modules. | Legacy PHP store migrations for ecommerce-growth pack. | — | No | Mantener solo en laboratorio |
| 175 | Saleor | Backend | https://github.com/saleor/saleor | BSD-3-Clause | Descargado | Más adelante | GraphQL-first headless commerce platform in Python/Django. | GraphQL ecommerce for Python-heavy agency clients. | — | No | Revisar |
| 176 | Shopware | Backend | https://github.com/shopware/platform | Unknown | Descargado | Más adelante | Modern ecommerce platform with API-first and rule builder. | EU ecommerce clients preferring Symfony/PHP stack. | — | No | Revisar |
| 177 | Spree Commerce | Backend | https://github.com/spree/spree | BSD-3-Clause | Descargado | Laboratorio | Ruby on Rails headless commerce platform. | Ruby client ecommerce; Medusa preferred for Node stack. | — | No | Mantener solo en laboratorio |
| 178 | Strapi | Backend | https://github.com/strapi/strapi | Unknown | Descargado | Más adelante | Leading open-source headless CMS with REST and GraphQL APIs. | Client content API for landing packs and blog deliverables. | — | No | Revisar |
| 179 | TinaCMS | Backend | https://github.com/tinacms/tinacms | Apache-2.0 | Descargado | Más adelante | Git-backed visual CMS for Markdown/MDX content in repos. | Git-based content for OS pack templates and docs. | — | No | Revisar |
| 180 | TYPO3 | Backend | https://github.com/TYPO3/typo3 | LGPL-3.0 | Descargado | Laboratorio | Enterprise CMS with multisite, workflows, and granular permissions. | Enterprise EU client CMS; GPL limits SaaS embedding. | — | No | Mantener solo en laboratorio |
| 181 | Vendure | Backend | https://github.com/vendure-ecommerce/vendure | GPL-3.0 | Descargado | Laboratorio | Headless commerce framework built with TypeScript and GraphQL. | TS-native ecommerce; Medusa preferred for MIT license. | — | No | Mantener solo en laboratorio |
| 182 | Wagtail | Backend | https://github.com/wagtail/wagtail | BSD-3-Clause | Descargado | Más adelante | Django CMS with stream fields and powerful page tree. | Python CMS for FastAPI agency clients needing page trees. | — | No | Revisar |
| 183 | Webiny | Backend | https://github.com/webiny/webiny-js | Unknown | Descargado | Laboratorio | Serverless CMS and page builder on AWS serverless stack. | Serverless CMS reference; Railway Postgres preferred for NELVYON. | — | No | Mantener solo en laboratorio |
| 184 | WooCommerce | Backend | https://github.com/woocommerce/woocommerce | GPL-2.0 | Descargado | Más adelante | WordPress ecommerce plugin with payments and shipping. | WordPress store integrations for ecommerce-growth pack. | — | No | Revisar |
| 185 | WordPress | Backend | https://github.com/WordPress/WordPress | GPL-2.0 | Descargado | Más adelante | World's most popular CMS powering 40%+ of websites. | Client site migrations and WooCommerce integrations. | — | No | Revisar |

---

## Frontend

**20 proyectos**

| Nº | Nombre | Categoría | Repositorio oficial | Licencia | Estado | Prioridad | Qué hace | Para qué en NELVYON | Sustituye (pago) | ¿Ya tenemos algo? | Recomendación |
|---:|---|---|---|---|---|---|---|---|---|---|---|
| 186 | Blender | Frontend | https://github.com/blender/blender | GPL-3.0 | Descartado | Laboratorio | 3D creation suite for modeling, animation, and rendering. | 3D brand assets and motion graphics for premium packs. | — | No | Mantener solo en laboratorio |
| 187 | draw.io (Diagrams.net) | Frontend | https://github.com/jgraph/drawio | Apache-2.0 | Descargado | Más adelante | Diagram editor for flowcharts, UML, network, and architecture diagrams. | Architecture diagrams for pack docs and client onboarding. | — | No | Revisar |
| 188 | Excalidraw | Frontend | https://github.com/excalidraw/excalidraw | MIT | Descargado | Más adelante | Virtual whiteboard for hand-drawn style diagrams and wireframes. | Wireframes for OS pack planning and client workshops. | — | No | Revisar |
| 189 | figma-api | Frontend | https://github.com/figma/rest-api-spec | MIT | Descargado | Más adelante | Figma REST API specification for design file export automation. | Import Figma designs into Penpot/OS pack pipeline. | — | No | Revisar |
| 190 | Fontsource | Frontend | https://github.com/fontsource/fontsource | MIT | Descargado | Integrar ahora | Self-host npm fonts with CSS imports — no Google Fonts CDN. | GDPR-friendly typography for SaaS shell without CDN tracking. | Google Fonts CDN | No | Integrar |
| 191 | GIMP | Frontend | https://github.com/GNOME/gimp | GPL-2.0 | Descargado | Más adelante | GNU Image Manipulation Program for photo retouching and composition. | Batch image processing via CLI for ad creative packs. | — | No | Revisar |
| 192 | GrapesJS | Frontend | https://github.com/GrapesJS/grapesjs | Unknown | Descargado | Más adelante | Free web builder framework for HTML templates without coding. | Email and landing page visual builder for OS packs. | — | No | Revisar |
| 193 | Iconify | Frontend | https://github.com/iconify/iconify | MIT | Descargado | Más adelante | Unified icon framework with 200+ icon sets and on-demand loading. | Icon search API for brand kit builder in portal. | — | No | Revisar |
| 194 | Inkscape | Frontend | https://github.com/inkscape/inkscape | GPL-3.0 | Descargado | Laboratorio | Professional vector graphics editor for SVG logos and illustrations. | Logo and brand asset creation for client branding packs. | — | No | Mantener solo en laboratorio |
| 195 | Krita | Frontend | https://github.com/KDE/krita | GPL-3.0 | Descargado | Laboratorio | Digital painting and illustration application for concept art. | Creative assets for social pack illustrations. | — | No | Mantener solo en laboratorio |
| 196 | Nord Color Palette | Frontend | https://github.com/nordtheme/nord | MIT | Sustituido | Más adelante | Reference API for curated color palette collections. | Brand palette suggestions in OS design pack workflow. | — | No | Revisar |
| 197 | Penpot | Frontend | https://github.com/penpot/penpot | MPL-2.0 | Descargado | Más adelante | Open-source design and prototyping platform for teams. | Self-hosted Figma alternative for agency design deliverables. | Figma partial | No | Revisar |
| 198 | Polotno SDK | Frontend | https://github.com/polotno-project/polotno-node | MIT | Descargado | Más adelante | Canvas editor SDK for building Canva-like design tools in React. | Embeddable design editor for client self-service ad creation. | — | No | Revisar |
| 199 | react-colorful | Frontend | https://github.com/omgovich/react-colorful | MIT | Descargado | Más adelante | Tiny color picker component for React applications. | Brand color picker in tenant theme customization UI. | — | No | Revisar |
| 200 | Sass Color Tools | Frontend | https://github.com/sass/sass | Unknown | Descargado | Más adelante | CSS preprocessor with color manipulation for brand design systems. | Brand color token generation for client design systems. | — | No | Revisar |
| 201 | Storybook Design Addon | Frontend | https://github.com/storybookjs/addon-designs | MIT | Descargado | Más adelante | Embed Figma/Penpot designs alongside UI components in Storybook. | Design-dev handoff for SaasShellLayout component library. | — | No | Revisar |
| 202 | Svelte Logoipsum | Frontend | https://github.com/srmullen/svelte-logoipsum | MIT | Sustituido | Más adelante | Placeholder logo library for wireframes and mockups. | Placeholder brand assets in pack wireframe deliverables. | — | No | Revisar |
| 203 | SVG-Edit | Frontend | https://github.com/SVG-Edit/svgedit | MIT | Descargado | Más adelante | Web-based SVG editor for creating and modifying vector graphics. | In-browser SVG editing for portal brand asset tools. | — | No | Revisar |
| 204 | Synfig Studio | Frontend | https://github.com/synfig/synfig | GPL-3.0 | Descargado | Laboratorio | 2D vector animation software for film-quality motion graphics. | 2D animated assets for social video pack deliverables. | — | No | Mantener solo en laboratorio |
| 205 | tldraw | Frontend | https://github.com/tldraw/tldraw | Unknown | Descargado | Más adelante | Infinite canvas SDK and whiteboard for React applications. | Embeddable whiteboard in portal for client collaboration. | — | No | Revisar |

---

## UI

**20 proyectos**

| Nº | Nombre | Categoría | Repositorio oficial | Licencia | Estado | Prioridad | Qué hace | Para qué en NELVYON | Sustituye (pago) | ¿Ya tenemos algo? | Recomendación |
|---:|---|---|---|---|---|---|---|---|---|---|---|
| 206 | Aceternity UI | UI | https://github.com/shadcn-ui/ui | MIT | Sustituido | Más adelante | Modern animated UI components for stunning landing pages. | Premium landing effects for NELVYON-LANDING pack SKU. | — | No | Revisar |
| 207 | cmdk | UI | https://github.com/pacocoursey/cmdk | MIT | Descargado | Más adelante | Fast, composable command menu React component. | SaaS command palette (⌘K) for CRM and navigation. | — | No | Revisar |
| 208 | Framer Motion | UI | https://github.com/motiondivision/motion | MIT | Descargado | Integrar ahora | Production-ready motion library for React animations. | SaaS shell transitions and Magic UI animation backbone. | — | No | Integrar |
| 209 | Headless UI | UI | https://github.com/tailwindlabs/headlessui | MIT | Descargado | Más adelante | Unstyled accessible UI components from Tailwind Labs. | Tailwind-native primitives where Radix not needed. | — | No | Revisar |
| 210 | HeroUI | UI | https://github.com/heroui-inc/heroui | Apache-2.0 | Descargado | Más adelante | Beautiful React component library built on Tailwind and React Aria. | Rapid SaaS UI prototyping alternative to shadcn. | — | No | Revisar |
| 211 | Lucide | UI | https://github.com/lucide-icons/lucide | ISC | Descargado | Integrar ahora | Beautiful open-source icon toolkit with React components. | Icon system for SaasSidebar and portal UI. | — | No | Integrar |
| 212 | Magic UI | UI | https://github.com/magicuidesign/magicui | MIT | Descargado | Más adelante | Animated marketing components and landing page blocks for React. | OS landing pack templates and SaaS marketing pages. | — | No | Revisar |
| 213 | Radix UI | UI | https://github.com/radix-ui/primitives | MIT | Descargado | Integrar ahora | Unstyled accessible React primitives for dialogs, menus, and forms. | Foundation under shadcn/ui — direct use for custom SaaS components. | — | No | Integrar |
| 214 | React Aria | UI | https://github.com/adobe/react-spectrum | Apache-2.0 | Descargado | Más adelante | Adobe React hooks for accessible UI primitives. | A11y patterns for complex SaaS forms and comboboxes. | — | No | Revisar |
| 215 | React Hook Form | UI | https://github.com/react-hook-form/react-hook-form | MIT | Descargado | Integrar ahora | Performant form library with minimal re-renders and validation. | All SaaS forms — CRM, campaigns, workflows, billing. | — | Parcial | Integrar |
| 216 | Recharts | UI | https://github.com/recharts/recharts | MIT | Descargado | Más adelante | Composable charting library built on React and D3. | CRM analytics charts in tenant dashboards. | — | No | Revisar |
| 217 | shadcn/ui | UI | https://github.com/shadcn-ui/ui | MIT | Descargado | Integrar ahora | Re-usable Radix-based components copied into your codebase. | Primary UI kit for SaasShellLayout and portal refresh. | — | No | Integrar |
| 218 | Sonner | UI | https://github.com/emilkowalski/sonner | MIT | Descargado | Integrar ahora | Opinionated toast component for React applications. | Toast notifications across SaaS actions and pack status. | — | No | Integrar |
| 219 | Tailwind CSS | UI | https://github.com/tailwindlabs/tailwindcss | MIT | Descargado | Integrar ahora | Utility-first CSS framework for rapid UI development. | Core styling — Tailwind v4 across all SaaS and OS pages. | — | No | Integrar |
| 220 | TanStack Query | UI | https://github.com/TanStack/query | MIT | Descargado | Integrar ahora | Powerful async state management for server data in React. | Standard data layer for all /saas/* pages and portal BFF. | SWR partial | No | Integrar |
| 221 | TanStack Router | UI | https://github.com/TanStack/router | MIT | Descargado | Más adelante | Type-safe routing for React with search params and loaders. | Eval for client-heavy SaaS sub-apps; Next.js App Router primary. | — | No | Revisar |
| 222 | TanStack Table | UI | https://github.com/TanStack/table | MIT | Descargado | Integrar ahora | Headless UI for building powerful tables and datagrids. | CRM, pipeline, and campaign list tables in SaaS shell. | — | Parcial | Integrar |
| 223 | Tremor | UI | https://github.com/tremorlabs/tremor | Apache-2.0 | Descargado | Más adelante | React components for dashboards, charts, and KPI cards. | CEO metrics dashboard and tenant analytics widgets. | — | No | Revisar |
| 224 | Vaul | UI | https://github.com/emilkowalski/vaul | MIT | Descargado | Más adelante | Drawer component for React with mobile-friendly gestures. | Mobile SaaS drawer panels for CRM detail views. | — | No | Revisar |
| 225 | Zustand | UI | https://github.com/pmndrs/zustand | MIT | Descargado | Integrar ahora | Small, fast, scalable state management for React. | Client UI state for SaaS shell sidebar and pack wizard. | — | No | Integrar |

---

## Testing

**20 proyectos**

| Nº | Nombre | Categoría | Repositorio oficial | Licencia | Estado | Prioridad | Qué hace | Para qué en NELVYON | Sustituye (pago) | ¿Ya tenemos algo? | Recomendación |
|---:|---|---|---|---|---|---|---|---|---|---|---|
| 226 | Allure Report | Testing | https://github.com/allure-framework/allure2 | Apache-2.0 | Descargado | Más adelante | Flexible test report framework with history and trends. | E2E and benchmark test reporting for router certification. | — | No | Revisar |
| 227 | Artillery | Testing | https://github.com/artilleryio/artillery | MPL-2.0 | Descargado | Más adelante | Modern load testing toolkit for HTTP, WebSocket, and Playwright. | Quick HTTP load tests; k6 preferred for router soak. | — | No | Revisar |
| 228 | Chromatic | Testing | https://github.com/chromaui/chromatic-cli | MIT | Descargado | Más adelante | Visual regression testing CLI for Storybook components. | Visual diff SaaS UI components in CI pipeline. | — | No | Revisar |
| 229 | CodeQL | Testing | https://github.com/github/codeql | MIT | Descargado | Más adelante | Semantic code analysis engine for finding vulnerabilities via queries. | GitHub Advanced Security-style SAST for monorepo CI gates. | — | No | Revisar |
| 230 | Cypress | Testing | https://github.com/cypress-io/cypress | MIT | Descargado | Más adelante | JavaScript E2E testing framework with time-travel debugging. | Alternative E2E; Playwright preferred for cross-browser. | — | No | Revisar |
| 231 | Jest | Testing | https://github.com/jestjs/jest | MIT | Descargado | Más adelante | Delightful JavaScript testing framework with snapshot testing. | Legacy tests; Vitest is primary for Vite/Next.js monorepo. | — | No | Revisar |
| 232 | k6 | Testing | https://github.com/grafana/k6 | AGPL-3.0 | Descargado | Más adelante | Developer-centric load testing tool using JavaScript scripts. | Load test SaaS API and router soak benchmarks. | — | No | Revisar |
| 233 | Locust | Testing | https://github.com/locustio/locust | MIT | Descargado | Más adelante | Python-based load testing with distributed swarming. | Python load tests for FastAPI pack agents. | — | No | Revisar |
| 234 | MSW | Testing | https://github.com/mswjs/msw | MIT | Descargado | Integrar ahora | Mock Service Worker for API mocking in browser and Node tests. | Frontend API mocking in Vitest and Storybook. | — | No | Integrar |
| 235 | OWASP ZAP | Testing | https://github.com/zaproxy/zaproxy | Apache-2.0 | Descargado | Más adelante | Web application security scanner for automated penetration testing. | DAST scans on staging /saas and /portal before release. | — | No | Revisar |
| 236 | Pact | Testing | https://github.com/pact-foundation/pact-js | MIT | Descargado | Más adelante | Consumer-driven contract testing for microservices and APIs. | Contract tests between Next.js BFF and FastAPI agents. | — | No | Revisar |
| 237 | Playwright | Testing | https://github.com/microsoft/playwright | Apache-2.0 | Descargado | Integrar ahora | Cross-browser end-to-end testing framework with auto-wait and tracing. | Primary E2E for /saas/*, portal, and OS pack smoke tests. | Cypress partial | No | Integrar |
| 238 | pytest | Testing | https://github.com/pytest-dev/pytest | MIT | Descargado | Integrar ahora | Python testing framework with fixtures and plugins. | FastAPI pack agent test suite in backend/tests. | — | No | Integrar |
| 239 | SonarQube | Testing | https://github.com/SonarSource/sonarqube | LGPL-3.0 | Descargado | Más adelante | Continuous code quality and security analysis platform. | Static analysis gate for TS/Python before deploy. | — | No | Revisar |
| 240 | Storybook | Testing | https://github.com/storybookjs/storybook | MIT | Descargado | Más adelante | UI component development environment and visual test harness. | Isolated development for SaaS UI component library. | — | No | Revisar |
| 241 | Stryker Mutator | Testing | https://github.com/stryker-mutator/stryker-js | Apache-2.0 | Descargado | Más adelante | Mutation testing framework to measure test suite effectiveness. | Mutation testing for critical SaasBillingService logic. | — | No | Revisar |
| 242 | Testcontainers | Testing | https://github.com/testcontainers/testcontainers-node | MIT | Descargado | Más adelante | Docker containers for reliable integration tests in Node. | Postgres/Redis integration tests for SaasWorkflowService. | — | No | Revisar |
| 243 | Testing Library | Testing | https://github.com/testing-library/react-testing-library | MIT | Descargado | Integrar ahora | Simple and complete testing utilities for React DOM. | Component tests for SaasShellLayout and CRM features. | — | Parcial | Integrar |
| 244 | Vitest | Testing | https://github.com/vitest-dev/vitest | MIT | Descargado | Integrar ahora | Vite-native unit test framework compatible with Jest API. | Core test runner — 489+ tests in backend/saas suite. | Jest partial | Sí | Integrar |
| 245 | WireMock | Testing | https://github.com/wiremock/wiremock | Apache-2.0 | Descargado | Más adelante | HTTP mock server for stubbing and verifying API interactions. | Mock Stripe/SES/external APIs in integration tests. | — | No | Revisar |

---

## DevOps

**37 proyectos**

| Nº | Nombre | Categoría | Repositorio oficial | Licencia | Estado | Prioridad | Qué hace | Para qué en NELVYON | Sustituye (pago) | ¿Ya tenemos algo? | Recomendación |
|---:|---|---|---|---|---|---|---|---|---|---|---|
| 246 | Ansible | DevOps | https://github.com/ansible/ansible | GPL-3.0 | Descargado | Más adelante | Agentless configuration management and automation. | Configure Ollama hosts and Windows dev machines. | — | No | Revisar |
| 247 | Argo CD | DevOps | https://github.com/argoproj/argo-cd | Apache-2.0 | Descargado | Más adelante | Declarative GitOps continuous delivery for Kubernetes. | GitOps when K8s adopted for GPU workloads. | — | No | Revisar |
| 248 | ast-grep | DevOps | https://github.com/ast-grep/ast-grep | MIT | Descargado | Más adelante | Structural search and replace using AST patterns across languages. | Pattern-based refactors across TS/Python monorepo. | — | No | Revisar |
| 249 | Biome | DevOps | https://github.com/biomejs/biome | MIT | Descargado | Más adelante | Fast all-in-one toolchain for linting and formatting JS/TS/JSON. | Potential ESLint+Prettier replacement for faster CI. | ESLint+Prettier partial | No | Revisar |
| 250 | Caddy | DevOps | https://github.com/caddyserver/caddy | Apache-2.0 | Descargado | Más adelante | Automatic HTTPS reverse proxy with simple config. | Simpler TLS for dev/staging; Traefik for prod multi-service. | — | No | Revisar |
| 251 | Changesets | DevOps | https://github.com/changesets/changesets | MIT | Descargado | Más adelante | Version management and changelog generation for monorepos. | Structured releases for shared backend packages. | — | No | Revisar |
| 252 | Commitlint | DevOps | https://github.com/conventional-changelog/commitlint | MIT | Descargado | Más adelante | Lint commit messages against conventional commit format. | Enforce conventional commits for CHANGELOG automation. | — | No | Revisar |
| 253 | Coolify | DevOps | https://github.com/coollabsio/coolify | Apache-2.0 | Descargado | Más adelante | Self-hosted Heroku/Railway alternative for app deployment. | PRIVATE_MODE PaaS for agency client instances on VPS. | Railway partial self-host | No | Revisar |
| 254 | Dagger | DevOps | https://github.com/dagger/dagger | Apache-2.0 | Descargado | Más adelante | Portable CI/CD pipelines as code running in containers. | Reproducible CI pipelines across Windows and Linux. | — | No | Revisar |
| 255 | Docker Compose | DevOps | https://github.com/docker/compose | Apache-2.0 | Descargado | Integrar ahora | Multi-container Docker application definition and orchestration. | local-ai full stack: Ollama, Postgres, observability. | — | Parcial | Integrar |
| 256 | Dokku | DevOps | https://github.com/dokku/dokku | Unknown | Descargado | Más adelante | Minimal Docker-powered PaaS similar to Heroku. | Lightweight client deploys; Coolify preferred for UI. | — | No | Revisar |
| 257 | esbuild | DevOps | https://github.com/evanw/esbuild | MIT | Descargado | Integrar ahora | Extremely fast JavaScript bundler and minifier written in Go. | Fast bundling for scripts and tooling in monorepo. | — | No | Integrar |
| 258 | ESLint | DevOps | https://github.com/eslint/eslint | Unknown | Descargado | Integrar ahora | Pluggable JavaScript/TypeScript linter for code quality. | Core lint for Next.js 15 monorepo — zero TS errors policy. | — | Sí | Integrar |
| 259 | Flux | DevOps | https://github.com/fluxcd/flux2 | Apache-2.0 | Descargado | Más adelante | GitOps toolkit for Kubernetes with Helm integration. | Alternative to Argo CD — pick one GitOps tool. | — | No | Revisar |
| 260 | GitHub Actions | DevOps | https://github.com/actions/runner | MIT | Descargado | Integrar ahora | Self-hosted runners for GitHub Actions workflows. | CI for vitest, Trivy, router soak on Windows runner. | — | No | Integrar |
| 261 | Helm | DevOps | https://github.com/helm/helm | Apache-2.0 | Descargado | Más adelante | Package manager for Kubernetes applications. | Deploy observability and local-ai stacks on K8s. | — | No | Revisar |
| 262 | Husky | DevOps | https://github.com/typicode/husky | MIT | Descargado | Integrar ahora | Git hooks made easy for pre-commit lint and test runs. | Pre-commit tsc + vitest on changed files. | — | No | Integrar |
| 263 | jscodeshift | DevOps | https://github.com/facebook/jscodeshift | MIT | Descargado | Más adelante | JavaScript codemod toolkit for automated codebase refactoring. | Bulk migrations for SaasShellLayout and API route refactors. | — | No | Revisar |
| 264 | Knip | DevOps | https://github.com/webpro/knip | ISC | Descargado | Más adelante | Find unused files, dependencies, and exports in JS/TS projects. | Monorepo dead code cleanup for apps/web + backend. | — | No | Revisar |
| 265 | Lefthook | DevOps | https://github.com/evilmartians/lefthook | MIT | Descargado | Más adelante | Fast parallel git hooks manager written in Go. | Husky alternative for faster parallel pre-commit hooks. | — | No | Revisar |
| 266 | lint-staged | DevOps | https://github.com/lint-staged/lint-staged | MIT | Descargado | Integrar ahora | Run linters on git staged files only for fast pre-commit. | Fast pre-commit ESLint on staged SaaS files. | — | No | Integrar |
| 267 | NGINX | DevOps | https://github.com/nginx/nginx | Unknown | Descargado | Más adelante | High-performance HTTP server and reverse proxy. | Static asset serving fallback; Traefik preferred for dynamic. | — | No | Revisar |
| 268 | Nx | DevOps | https://github.com/nrwl/nx | MIT | Descargado | Más adelante | Smart monorepo build system with dependency graph and caching. | Alternative to Turborepo for larger monorepo scale. | — | No | Revisar |
| 269 | OpenTofu | DevOps | https://github.com/opentofu/opentofu | MPL-2.0 | Descargado | Más adelante | Open-source Terraform fork under MPL-2.0. | IaC without BSL if HashiCorp policy changes. | — | No | Revisar |
| 270 | Portainer | DevOps | https://github.com/portainer/portainer | Unknown | Descargado | Más adelante | Web UI for managing Docker and Kubernetes environments. | Ops UI for PRIVATE_MODE Docker stacks. | — | No | Revisar |
| 271 | Prettier | DevOps | https://github.com/prettier/prettier | Unknown | Descargado | Integrar ahora | Opinionated code formatter for consistent style. | Code format standard across TS/Python (via plugin). | — | Sí | Integrar |
| 272 | Railway CLI | DevOps | https://github.com/railwayapp/cli | MIT | Descargado | Integrar ahora | CLI for deploying and managing Railway projects. | Primary deploy target — already in prod workflow. | — | Sí | Integrar |
| 273 | Renovate | DevOps | https://github.com/renovatebot/renovate | AGPL-3.0 | Descargado | Más adelante | Automated dependency update bot for npm, Docker, and more. | Automated PRs for security patches in monorepo. | — | No | Revisar |
| 274 | semantic-release | DevOps | https://github.com/semantic-release/semantic-release | MIT | Descargado | Más adelante | Fully automated version management and package publishing. | Automated Railway deploy versioning from conventional commits. | — | No | Revisar |
| 275 | SWC | DevOps | https://github.com/swc-project/swc | Apache-2.0 | Descargado | Integrar ahora | Rust-based platform for fast TypeScript/JavaScript compilation. | Next.js 15 compiler backend for faster dev builds. | — | No | Integrar |
| 276 | Syncpack | DevOps | https://github.com/JamieMason/syncpack | MIT | Descargado | Más adelante | Manage JavaScript monorepo dependency versions consistently. | pnpm workspace version alignment across packages. | — | No | Revisar |
| 277 | Terraform | DevOps | https://github.com/hashicorp/terraform | Unknown | Descargado | Más adelante | Infrastructure as code for provisioning cloud resources. | Railway/AWS SES infra codification. | — | No | Revisar |
| 278 | Traefik | DevOps | https://github.com/traefik/traefik | MIT | Descargado | Más adelante | Cloud-native reverse proxy and load balancer with auto TLS. | Edge routing for PRIVATE_MODE multi-service on one host. | — | No | Revisar |
| 279 | Turborepo | DevOps | https://github.com/vercel/turborepo | Unknown | Descargado | Más adelante | High-performance build system for JavaScript monorepos. | pnpm workspace build cache for apps/web + backend. | — | No | Revisar |
| 280 | TypeScript | DevOps | https://github.com/microsoft/TypeScript | Apache-2.0 | Descargado | Integrar ahora | Typed superset of JavaScript compiling to clean JS output. | TS 5.9 strict — tsc --noEmit gate with 0 errors. | — | No | Integrar |
| 281 | Vite | DevOps | https://github.com/vitejs/vite | MIT | Descargado | Integrar ahora | Next-generation frontend tooling with instant HMR. | Vitest and script bundling; Next.js primary for app. | — | No | Integrar |
| 282 | Watchtower | DevOps | https://github.com/containrrr/watchtower | Apache-2.0 | Descargado | Más adelante | Automated Docker container image updates. | Auto-update local-ai sidecar containers in PRIVATE_MODE. | — | No | Revisar |

---

## Docker

**1 proyectos**

| Nº | Nombre | Categoría | Repositorio oficial | Licencia | Estado | Prioridad | Qué hace | Para qué en NELVYON | Sustituye (pago) | ¿Ya tenemos algo? | Recomendación |
|---:|---|---|---|---|---|---|---|---|---|---|---|
| 283 | Docker | Docker | https://github.com/moby/moby | Apache-2.0 | Descargado | Integrar ahora | Container runtime and image packaging platform. | Local-ai stack, Ollama, Railway deploys — foundation layer. | — | Sí | Integrar |

---

## Seguridad

**20 proyectos**

| Nº | Nombre | Categoría | Repositorio oficial | Licencia | Estado | Prioridad | Qué hace | Para qué en NELVYON | Sustituye (pago) | ¿Ya tenemos algo? | Recomendación |
|---:|---|---|---|---|---|---|---|---|---|---|---|
| 284 | Authelia | Seguridad | https://github.com/authelia/authelia | Apache-2.0 | Descargado | Más adelante | SSO and 2FA portal for protecting web applications. | Lightweight forward-auth; authentik preferred for full IdP. | — | No | Revisar |
| 285 | authentik | Seguridad | https://github.com/goauthentik/authentik | Unknown | Descargado | Más adelante | Modern identity provider with flows, SSO, and MFA. | Lighter IdP for PRIVATE_MODE and internal ops SSO. | — | No | Revisar |
| 286 | Casbin | Seguridad | https://github.com/casbin/casbin | Apache-2.0 | Descargado | Más adelante | Authorization library supporting ACL, RBAC, ABAC models. | Fine-grained RBAC for platform OS vs SaaS tenant roles. | — | No | Revisar |
| 287 | CrowdSec | Seguridad | https://github.com/crowdsecurity/crowdsec | MIT | Descargado | Más adelante | Collaborative IPS and reputation-based threat blocking. | Rate-limit and block abusive API traffic on Railway edge. | — | No | Revisar |
| 288 | Dependency-Track | Seguridad | https://github.com/DependencyTrack/dependency-track | Apache-2.0 | Descargado | Más adelante | SBOM analysis and vulnerability management platform. | Track pnpm and Python deps across monorepo. | — | No | Revisar |
| 289 | Falco | Seguridad | https://github.com/falcosecurity/falco | Apache-2.0 | Descargado | Laboratorio | Cloud-native runtime security with kernel syscall rules. | Runtime threat detection when on K8s; optional on Railway. | — | No | Mantener solo en laboratorio |
| 290 | Gitleaks | Seguridad | https://github.com/gitleaks/gitleaks | MIT | Descargado | Integrar ahora | Detect hardcoded secrets in git repos and CI. | Pre-commit and CI gate — complements Vault. | — | No | Integrar |
| 291 | GoTrue | Seguridad | https://github.com/supabase/gotrue | MIT | Descargado | Laboratorio | JWT-based API auth server used by Supabase (GoTrue). | Reference for JWT auth patterns; NELVYON has custom JWT. | — | No | Mantener solo en laboratorio |
| 292 | Keycloak | Seguridad | https://github.com/keycloak/keycloak | Apache-2.0 | Descargado | Más adelante | Identity and access management with OIDC, SAML, and SSO. | Enterprise SSO for agency clients; complements JWT SaaS auth. | — | No | Revisar |
| 293 | ModSecurity | Seguridad | https://github.com/owasp-modsecurity/ModSecurity | Apache-2.0 | Descargado | Más adelante | Web application firewall engine for HTTP traffic. | WAF layer in front of Next.js if Traefik/nginx used. | — | No | Revisar |
| 294 | OAuth2 Proxy | Seguridad | https://github.com/oauth2-proxy/oauth2-proxy | MIT | Descargado | Más adelante | Reverse proxy providing authentication via OIDC providers. | Protect internal Grafana/Open WebUI in PRIVATE_MODE. | — | No | Revisar |
| 295 | OpenBao | Seguridad | https://github.com/openbao/openbao | MPL-2.0 | Descargado | Más adelante | Community fork of Vault under MPL-2.0 license. | Open-license Vault alternative if BSL blocks fork policy. | — | No | Revisar |
| 296 | OpenFGA | Seguridad | https://github.com/openfga/openfga | Apache-2.0 | Descargado | Más adelante | Relationship-based access control inspired by Google Zanzibar. | Multi-tenant object permissions for CRM and portal. | — | No | Revisar |
| 297 | OWASP ZAP | Seguridad | https://github.com/zaproxy/zaproxy | Apache-2.0 | Descargado | Más adelante | Dynamic application security testing proxy. | DAST in staging smokes for /saas and /api routes. | — | No | Revisar |
| 298 | Semgrep | Seguridad | https://github.com/semgrep/semgrep | LGPL-3.0 | Descargado | Integrar ahora | Static analysis for code security and custom rules. | SAST in CI for TypeScript and Python backends. | — | No | Integrar |
| 299 | SimpleWebAuthn | Seguridad | https://github.com/MasterKale/SimpleWebAuthn | MIT | Descargado | Más adelante | Server-side WebAuthn/Passkeys library for Node and browsers. | Future passkey login for SaaS tenants on Next.js 15. | — | No | Revisar |
| 300 | Trivy | Seguridad | https://github.com/aquasecurity/trivy | Apache-2.0 | Descargado | Integrar ahora | Vulnerability scanner for containers, IaC, and dependencies. | CI scan for Docker images and pnpm lockfile. | — | No | Integrar |
| 301 | Vault | Seguridad | https://github.com/hashicorp/vault | Unknown | Descargado | Más adelante | Secrets management, encryption, and dynamic credentials. | Centralize JWT_SECRET, Stripe keys, Ollama tokens on Railway. | — | No | Revisar |
| 302 | Wazuh | Seguridad | https://github.com/wazuh/wazuh | GPL-2.0 | Descargado | Laboratorio | Unified XDR and SIEM platform for threat detection. | Enterprise SIEM for agency clients; GPL SaaS embedding risk. | — | No | Mantener solo en laboratorio |
| 303 | Zitadel | Seguridad | https://github.com/zitadel/zitadel | AGPL-3.0 | Descargado | Más adelante | Cloud-native identity with event-sourcing and multi-tenancy. | Multi-tenant IdP model aligns with SaaS; heavier than authentik. | — | No | Revisar |

---

## Observabilidad

**13 proyectos**

| Nº | Nombre | Categoría | Repositorio oficial | Licencia | Estado | Prioridad | Qué hace | Para qué en NELVYON | Sustituye (pago) | ¿Ya tenemos algo? | Recomendación |
|---:|---|---|---|---|---|---|---|---|---|---|---|
| 304 | Alertmanager | Observabilidad | https://github.com/prometheus/alertmanager | Apache-2.0 | Descargado | Más adelante | Handles alerts from Prometheus and routes to Slack/PagerDuty. | Pager alerts for workflow failures and Ollama router soak. | — | No | Revisar |
| 305 | cAdvisor | Observabilidad | https://github.com/google/cadvisor | Apache-2.0 | Descargado | Más adelante | Container resource usage and performance metrics. | Docker metrics for local-ai stack containers. | — | No | Revisar |
| 306 | Grafana | Observabilidad | https://github.com/grafana/grafana | AGPL-3.0 | Descargado | Más adelante | Observability dashboards for metrics, logs, and traces. | Ops dashboard for SaaS+OS; AGPL if offering dashboards to tenants. | — | Sí | Revisar |
| 307 | Grafana Alloy | Observabilidad | https://github.com/grafana/alloy | Apache-2.0 | Descargado | Más adelante | OpenTelemetry-compatible telemetry collector from Grafana. | Unified collector replacing multiple agents. | — | No | Revisar |
| 308 | Langfuse | Observabilidad | https://github.com/langfuse/langfuse | Unknown | Descargado | Más adelante | LLM engineering platform: traces, evals, prompt management. | Trace router + specialization pipeline; complements RAGAS eval. | — | No | Revisar |
| 309 | Netdata | Observabilidad | https://github.com/netdata/netdata | GPL-3.0 | Descargado | Laboratorio | Real-time per-second infrastructure monitoring. | Dev machine monitoring; GPL limits SaaS embedding. | — | No | Mantener solo en laboratorio |
| 310 | Node Exporter | Observabilidad | https://github.com/prometheus/node_exporter | Apache-2.0 | Descargado | Más adelante | Hardware and OS metrics exporter for Prometheus. | RTX 3050/Ollama host resource monitoring in PRIVATE_MODE. | — | No | Revisar |
| 311 | OpenTelemetry | Observabilidad | https://github.com/open-telemetry/opentelemetry-collector | Apache-2.0 | Descargado | Más adelante | Vendor-neutral telemetry SDK and collector for metrics/logs/traces. | Instrument Next.js 15 API routes and FastAPI with one standard. | — | Sí | Revisar |
| 312 | Prometheus | Observabilidad | https://github.com/prometheus/prometheus | Apache-2.0 | Descargado | Más adelante | Time-series metrics collection and alerting toolkit. | Core metrics for Railway Node/FastAPI services and Ollama router. | — | Sí | Revisar |
| 313 | SigNoz | Observabilidad | https://github.com/SigNoz/signoz | Unknown | Descargado | Más adelante | Open-source APM with metrics, traces, and logs in one UI. | All-in-one observability for PRIVATE_MODE without Grafana AGPL stack. | Grafana+Tempo partial | No | Revisar |
| 314 | Uptime Kuma | Observabilidad | https://github.com/louislam/uptime-kuma | MIT | Descargado | Integrar ahora | Self-hosted uptime monitoring with status pages. | Status page for app.nelvyon.com and client portal SLAs. | — | No | Integrar |
| 315 | VictoriaMetrics | Observabilidad | https://github.com/VictoriaMetrics/VictoriaMetrics | Apache-2.0 | Descargado | Más adelante | Fast and scalable Prometheus-compatible TSDB. | Long-term metrics retention cheaper than raw Prometheus. | — | No | Revisar |
| 316 | Zabbix | Observabilidad | https://github.com/zabbix/zabbix | AGPL-3.0 | Descargado | Laboratorio | Enterprise monitoring for networks, servers, and apps. | Agency client infra; not for NELVYON SaaS core. | — | No | Mantener solo en laboratorio |

---

## OCR

**3 proyectos**

| Nº | Nombre | Categoría | Repositorio oficial | Licencia | Estado | Prioridad | Qué hace | Para qué en NELVYON | Sustituye (pago) | ¿Ya tenemos algo? | Recomendación |
|---:|---|---|---|---|---|---|---|---|---|---|---|
| 317 | OCRmyPDF | OCR | https://github.com/ocrmypdf/OCRmyPDF | MPL-2.0 | Descargado | Más adelante | Adds OCR text layer to scanned PDFs using Tesseract. | Make scanned client docs searchable before RAG chunking. | — | No | Revisar |
| 318 | PaddleOCR | OCR | https://github.com/PaddlePaddle/PaddleOCR | Apache-2.0 | Descargado | Más adelante | Multilingual OCR with layout analysis and table recognition. | Superior accuracy for marketing PDFs and invoices in ingest pipeline. | — | No | Revisar |
| 319 | Tesseract OCR | OCR | https://github.com/tesseract-ocr/tesseract | Apache-2.0 | Descargado | Más adelante | Industry-standard OCR engine supporting 100+ languages. | Extract text from client PDFs and scans for RAG ingest. | — | No | Revisar |

---

## Documentos

**9 proyectos**

| Nº | Nombre | Categoría | Repositorio oficial | Licencia | Estado | Prioridad | Qué hace | Para qué en NELVYON | Sustituye (pago) | ¿Ya tenemos algo? | Recomendación |
|---:|---|---|---|---|---|---|---|---|---|---|---|
| 320 | Apache Tika | Documentos | https://github.com/apache/tika | Apache-2.0 | Descargado | Más adelante | Content detection and extraction toolkit for 1000+ file formats. | Universal MIME detection and text extraction in ingest pipeline. | — | No | Revisar |
| 321 | calibre | Documentos | https://github.com/kovidgoyal/calibre | GPL-3.0 | Descargado | Laboratorio | E-book management and conversion between formats. | E-book deliverables for content marketing packs. | — | No | Mantener solo en laboratorio |
| 322 | Docling | Documentos | https://github.com/docling-project/docling | MIT | Descargado | Más adelante | IBM document parsing with layout, tables, and export to Markdown. | High-quality PDF→MD for knowledge ingest beyond Unstructured. | — | No | Revisar |
| 323 | ImageMagick | Documentos | https://github.com/ImageMagick/ImageMagick | Unknown | Descargado | Más adelante | Image manipulation and conversion toolkit for 200+ formats. | Thumbnail and format conversion in media pack pipeline. | — | No | Revisar |
| 324 | LibreOffice Headless | Documentos | https://github.com/LibreOffice/core | GPL-3.0 | Descargado | Más adelante | Office document conversion via headless LibreOffice CLI. | DOCX/PPTX→PDF for client deliverable conversion. | — | No | Revisar |
| 325 | Marker | Documentos | https://github.com/VikParuchuri/marker | GPL-3.0 | Descargado | Laboratorio | Convert PDF to Markdown with high accuracy using ML models. | PDF→MD for RAG; Docling preferred (MIT). | — | No | Mantener solo en laboratorio |
| 326 | Mayan EDMS | Documentos | https://github.com/mayan-edms/mayan-edms | Apache-2.0 | Descargado | Más adelante | Electronic document management with workflows and OCR. | Apache DMS for client document portals. | — | No | Revisar |
| 327 | Pandoc | Documentos | https://github.com/jgm/pandoc | GPL-2.0 | Descargado | Más adelante | Universal document converter between Markdown, HTML, DOCX, PDF, etc. | Pack deliverable format conversion in OS pipeline. | — | No | Revisar |
| 328 | Paperless-ngx | Documentos | https://github.com/paperless-ngx/paperless-ngx | GPL-3.0 | Descargado | Laboratorio | Document management with OCR, tagging, and full-text search. | Agency document archive; GPL limits SaaS embedding. | — | No | Mantener solo en laboratorio |

---

## PDFs

**8 proyectos**

| Nº | Nombre | Categoría | Repositorio oficial | Licencia | Estado | Prioridad | Qué hace | Para qué en NELVYON | Sustituye (pago) | ¿Ya tenemos algo? | Recomendación |
|---:|---|---|---|---|---|---|---|---|---|---|---|
| 329 | Camelot | PDFs | https://github.com/camelot-dev/camelot | MIT | Descargado | Más adelante | Python library to extract tables from PDF files. | Financial and marketing table extraction for RAG and reports. | — | No | Revisar |
| 330 | Gotenberg | PDFs | https://github.com/gotenberg/gotenberg | MIT | Descargado | Más adelante | Docker API for converting HTML, Office, and Markdown to PDF. | Pack deliverable PDF generation for OS landing and reports. | wkhtmltopdf | No | Revisar |
| 331 | pdf2image | PDFs | https://github.com/Belval/pdf2image | MIT | Descargado | Más adelante | Python wrapper to convert PDF pages to PIL images via poppler. | PDF page images for vision OCR and pack previews. | — | No | Revisar |
| 332 | pdfcpu | PDFs | https://github.com/pdfcpu/pdfcpu | Apache-2.0 | Descargado | Más adelante | Go PDF processor for merge, split, encrypt, and optimize. | Programmatic PDF manipulation in Go sidecars. | — | No | Revisar |
| 333 | Poppler | PDFs | https://gitlab.freedesktop.org/poppler/poppler | LGPL-3.0 | Descargado | Más adelante | PDF rendering library based on Xpdf for text and image extraction. | Low-level PDF extraction dependency for ingest tools. | — | No | Revisar |
| 334 | PyMuPDF | PDFs | https://github.com/pymupdf/PyMuPDF | AGPL-3.0 | Descargado | Más adelante | High-performance Python bindings for MuPDF PDF rendering and extraction. | Fast PDF text/image extraction in FastAPI agents. | — | No | Revisar |
| 335 | Stirling-PDF | PDFs | https://github.com/Stirling-Tools/Stirling-PDF | MIT | Descargado | Más adelante | Local web app for PDF merge, split, sign, OCR, and convert. | Client-facing PDF tools in portal; ops PDF manipulation. | — | No | Revisar |
| 336 | WeasyPrint | PDFs | https://github.com/Kozea/WeasyPrint | BSD-3-Clause | Descargado | Más adelante | HTML/CSS to PDF renderer without headless browser. | Lightweight invoice and report PDF from React HTML templates. | — | No | Revisar |

---

## Vídeo

**20 proyectos**

| Nº | Nombre | Categoría | Repositorio oficial | Licencia | Estado | Prioridad | Qué hace | Para qué en NELVYON | Sustituye (pago) | ¿Ya tenemos algo? | Recomendación |
|---:|---|---|---|---|---|---|---|---|---|---|---|
| 337 | AnimateDiff | Vídeo | https://github.com/guoyww/AnimateDiff | Apache-2.0 | Descargado | Laboratorio | Animate personalized text-to-video diffusion models. | Short-form video generation for social pack experiments. | — | No | Mantener solo en laboratorio |
| 338 | ComfyUI | Vídeo | https://github.com/comfyanonymous/ComfyUI | GPL-3.0 | Descargado | Más adelante | Node-based UI for Stable Diffusion workflows with extensible graphs. | Agency creative pack image generation in PRIVATE_MODE GPU. | — | No | Revisar |
| 339 | Creatomate API Pattern | Vídeo | https://github.com/creatomate/creatomate-node | MIT | Descargado | Más adelante | Reference Node SDK patterns for template-based video rendering. | Template video API design reference for Remotion integration. | — | No | Revisar |
| 340 | Diffusers | Vídeo | https://github.com/huggingface/diffusers | Apache-2.0 | Descargado | Más adelante | HuggingFace library for diffusion models inference and training. | Python API for image gen in FastAPI pack agents. | — | No | Revisar |
| 341 | FFmpeg | Vídeo | https://github.com/FFmpeg/FFmpeg | LGPL-3.0 | Descargado | Integrar ahora | Complete cross-platform solution to record, convert, and stream A/V. | Video pack transcoding, thumbnails, and ad creative processing. | — | No | Integrar |
| 342 | Fooocus | Vídeo | https://github.com/lllyasviel/Fooocus | GPL-3.0 | Descargado | Laboratorio | Simplified Stable Diffusion UI focused on quality with minimal config. | Quick creative drafts for agency designers. | — | No | Mantener solo en laboratorio |
| 343 | HandBrake | Vídeo | https://github.com/HandBrake/HandBrake | LGPL-3.0 | Descargado | Más adelante | Video transcoder for converting formats and compressing files. | Client video deliverable compression pipeline. | — | No | Revisar |
| 344 | InvokeAI | Vídeo | https://github.com/invoke-ai/InvokeAI | Apache-2.0 | Descargado | Más adelante | Creative engine for Stable Diffusion with professional UI and API. | Apache-licensed image gen API for OS creative packs. | — | No | Revisar |
| 345 | Jellyfin | Vídeo | https://github.com/jellyfin/jellyfin | LGPL-3.0 | Descargado | Laboratorio | Self-hosted media server for video, music, and photos. | Client media asset preview server; not core SaaS. | — | No | Mantener solo en laboratorio |
| 346 | kohya_ss | Vídeo | https://github.com/bmaltais/kohya_ss | Apache-2.0 | Descargado | Laboratorio | GUI for training LoRA and fine-tuning Stable Diffusion models. | Brand-specific LoRA training for client creative packs. | — | No | Mantener solo en laboratorio |
| 347 | Lottie | Vídeo | https://github.com/airbnb/lottie-web | MIT | Descargado | Más adelante | Render After Effects animations on web and mobile. | Animated assets for OS landing pack and SaaS UI micro-interactions. | — | No | Revisar |
| 348 | MoviePy | Vídeo | https://github.com/Zulko/moviepy | MIT | Descargado | Más adelante | Python video editing library for cuts, compositing, and effects. | FastAPI agent video assembly for social pack outputs. | — | No | Revisar |
| 349 | OBS Studio | Vídeo | https://github.com/obsproject/obs-studio | LGPL-3.0 | Descargado | Laboratorio | Video recording and live streaming software. | Agency webinar and tutorial recording for content packs. | — | No | Mantener solo en laboratorio |
| 350 | OpenCV | Vídeo | https://github.com/opencv/opencv | Apache-2.0 | Descargado | Más adelante | Open-source computer vision library for image and video processing. | Image preprocessing, face detection, and video frame extraction. | — | No | Revisar |
| 351 | Real-ESRGAN | Vídeo | https://github.com/xinntao/Real-ESRGAN | BSD-3-Clause | Descargado | Más adelante | Image and video super-resolution with GAN upscaling. | Upscale client assets for print and ad deliverables. | — | No | Revisar |
| 352 | Remotion | Vídeo | https://github.com/remotion-dev/remotion | Unknown | Descargado | Más adelante | Create videos programmatically with React and TypeScript. | Programmatic ad and social video for OS pack deliverables. | — | No | Revisar |
| 353 | Shotcut | Vídeo | https://github.com/mltframework/shotcut | GPL-3.0 | Descargado | Laboratorio | Cross-platform video editor with wide format support. | Manual video editing reference; Remotion for programmatic. | — | No | Mantener solo en laboratorio |
| 354 | Stable Diffusion WebUI | Vídeo | https://github.com/AUTOMATIC1111/stable-diffusion-webui | AGPL-3.0 | Descargado | Laboratorio | Automatic1111 Gradio UI for Stable Diffusion image generation. | Lab image gen; ComfyUI preferred for pipeline automation. | — | No | Mantener solo en laboratorio |
| 355 | Streamlink | Vídeo | https://github.com/streamlink/streamlink | Unknown | Descargado | Laboratorio | CLI to extract streams from various services into video players. | Live stream capture for social monitoring packs. | — | No | Mantener solo en laboratorio |
| 356 | Wand | Vídeo | https://github.com/emcconville/wand | Unknown | Descargado | Más adelante | Python binding for ImageMagick image processing. | Image transforms in FastAPI media pack pipeline. | — | No | Revisar |

---

## Audio

**19 proyectos**

| Nº | Nombre | Categoría | Repositorio oficial | Licencia | Estado | Prioridad | Qué hace | Para qué en NELVYON | Sustituye (pago) | ¿Ya tenemos algo? | Recomendación |
|---:|---|---|---|---|---|---|---|---|---|---|---|
| 357 | AudioCraft | Audio | https://github.com/facebookresearch/audiocraft | MIT | Descargado | Más adelante | PyTorch library for audio generation including MusicGen and AudioGen. | Background music generation for video pack deliverables. | — | No | Revisar |
| 358 | Bark | Audio | https://github.com/suno-ai/bark | MIT | Descargado | Laboratorio | Transformer-based text-to-audio including music and sound effects. | Creative audio SFX for social pack experiments. | — | No | Mantener solo en laboratorio |
| 359 | Coqui TTS | Audio | https://github.com/coqui-ai/TTS | MPL-2.0 | Descargado | Más adelante | Deep learning toolkit for text-to-speech training and inference. | Custom brand voice training for client audio packs. | — | No | Revisar |
| 360 | ESPnet | Audio | https://github.com/espnet/espnet | Apache-2.0 | Descargado | Laboratorio | End-to-end speech processing toolkit for ASR, TTS, and translation. | Research and custom model training for speech packs. | — | No | Mantener solo en laboratorio |
| 361 | faster-whisper | Audio | https://github.com/SYSTRAN/faster-whisper | MIT | Descargado | Más adelante | CTranslate2 reimplementation of Whisper for 4x faster inference. | Production STT on RTX 3050 for pack video transcription. | Whisper baseline | No | Revisar |
| 362 | Fish Speech | Audio | https://github.com/fishaudio/fish-speech | Unknown | Descargado | Laboratorio | Foundation model for multilingual expressive speech synthesis. | Next-gen TTS research for premium voice packs. | — | No | Mantener solo en laboratorio |
| 363 | LivePortrait | Audio | https://github.com/KlingTeam/LivePortrait | MIT | Descargado | Más adelante | Efficient portrait animation bringing static images to life. | Avatar video for social pack talking-head content. | — | No | Revisar |
| 364 | OpenAI Whisper | Audio | https://github.com/openai/whisper | MIT | Descargado | Más adelante | Robust speech recognition model supporting multilingual transcription. | Transcribe client calls and video content for pack deliverables. | — | No | Revisar |
| 365 | OpenVoice | Audio | https://github.com/myshell-ai/OpenVoice | Unknown | Descargado | Laboratorio | Instant voice cloning with tone color converter. | Voice style transfer for multilingual client content. | — | No | Mantener solo en laboratorio |
| 366 | Piper | Audio | https://github.com/rhasspy/piper | MIT | Descargado | Más adelante | Fast local neural text-to-speech with ONNX voices. | Low-latency TTS for chatbot and IVR pack demos. | — | No | Revisar |
| 367 | pyannote.audio | Audio | https://github.com/pyannote/pyannote-audio | MIT | Descargado | Más adelante | Neural speaker diarization toolkit for who-spoke-when analysis. | Speaker segmentation paired with WhisperX transcripts. | — | No | Revisar |
| 368 | Rhasspy | Audio | https://github.com/rhasspy/rhasspy | MIT | Descargado | Laboratorio | Offline voice assistant toolkit with intent recognition. | Voice command interface for PRIVATE_MODE ops console. | — | No | Mantener solo en laboratorio |
| 369 | SadTalker | Audio | https://github.com/OpenTalker/SadTalker | Apache-2.0 | Descargado | Más adelante | Audio-driven single-image talking head video generation. | Quick talking avatar from client photo + Piper TTS audio. | — | No | Revisar |
| 370 | Silero Models | Audio | https://github.com/snakers4/silero-models | Unknown | Descargado | Más adelante | Pre-trained STT/TTS models with simple PyTorch and ONNX inference. | Lightweight TTS/STT for edge and low-resource PRIVATE_MODE. | — | No | Revisar |
| 371 | VoiceFixer | Audio | https://github.com/haoheliu/voicefixer | MIT | Descargado | Más adelante | General speech restoration for denoising and quality enhancement. | Clean noisy client call recordings before transcription. | — | No | Revisar |
| 372 | Vosk | Audio | https://github.com/alphacep/vosk-api | Apache-2.0 | Descargado | Más adelante | Offline speech recognition toolkit for 20+ languages. | CPU-only STT fallback when GPU unavailable. | — | No | Revisar |
| 373 | Wav2Lip | Audio | https://github.com/Rudrabha/Wav2Lip | MIT | Descargado | Más adelante | Accurate lip-sync for video given arbitrary audio track. | Dub and lip-sync for multilingual client video packs. | — | No | Revisar |
| 374 | WhisperX | Audio | https://github.com/m-bain/whisperX | BSD-2-Clause | Descargado | Más adelante | Whisper with word-level timestamps and speaker diarization. | Meeting transcripts with speaker labels for agency client reports. | — | No | Revisar |
| 375 | XTTS v2 | Audio | https://github.com/coqui-ai/TTS | MPL-2.0 | Descargado | Laboratorio | Cross-lingual voice cloning TTS with few-shot speaker adaptation. | Voice clone for branded audio ads — strict consent workflow. | — | No | Mantener solo en laboratorio |

---

## APIs

**20 proyectos**

| Nº | Nombre | Categoría | Repositorio oficial | Licencia | Estado | Prioridad | Qué hace | Para qué en NELVYON | Sustituye (pago) | ¿Ya tenemos algo? | Recomendación |
|---:|---|---|---|---|---|---|---|---|---|---|---|
| 376 | Apache APISIX | APIs | https://github.com/apache/apisix | Apache-2.0 | Descargado | Más adelante | Dynamic cloud-native API gateway built on OpenResty/Nginx. | High-performance gateway for multi-tenant API rate limiting. | — | No | Revisar |
| 377 | Apollo Router | APIs | https://github.com/apollographql/router | Unknown | Descargado | Más adelante | High-performance GraphQL federation router written in Rust. | GraphQL federation if multi-service GraphQL adopted. | — | No | Revisar |
| 378 | Emissary-Ingress | APIs | https://github.com/emissary-ingress/emissary | Apache-2.0 | Descargado | Laboratorio | Kubernetes-native API gateway built on Envoy proxy. | Future K8s API routing; Traefik/Kong for current Railway. | — | No | Mantener solo en laboratorio |
| 379 | FastAPI | APIs | https://github.com/fastapi/fastapi | MIT | Descargado | Integrar ahora | Modern Python web framework for building APIs with automatic OpenAPI docs. | Core Python API layer — backend/main.py pack agents port 8000. | — | No | Integrar |
| 380 | GraphQL Mesh | APIs | https://github.com/ardatan/graphql-mesh | MIT | Descargado | Más adelante | Unified GraphQL gateway from REST, OpenAPI, gRPC, and databases. | Federate SaaS + OS + external APIs into single GraphQL. | — | No | Revisar |
| 381 | Gravitee APIM | APIs | https://github.com/gravitee-io/gravitee-api-management | Apache-2.0 | Descargado | Más adelante | Full API management with gateway, portal, and analytics. | Enterprise API management for multi-tenant SaaS APIs. | — | No | Revisar |
| 382 | Hasura | APIs | https://github.com/hasura/graphql-engine | Apache-2.0 | Descargado | Más adelante | Instant GraphQL API over Postgres with permissions and subscriptions. | GraphQL layer for tenant CRM data with row-level permissions. | — | No | Revisar |
| 383 | Hoppscotch | APIs | https://github.com/hoppscotch/hoppscotch | MIT | Descargado | Más adelante | Open-source API development ecosystem with REST/GraphQL client. | Team API testing for SaaS and FastAPI development. | Postman partial | No | Revisar |
| 384 | Kong Gateway | APIs | https://github.com/Kong/kong | Apache-2.0 | Descargado | Más adelante | Cloud-native API gateway with plugins for auth, rate limit, and logging. | API gateway for /api/saas, /api/os, and /api/platform routing. | — | No | Revisar |
| 385 | KrakenD | APIs | https://github.com/krakend/krakend-ce | Apache-2.0 | Descargado | Más adelante | Ultra-high performance API gateway for aggregation and transformation. | BFF aggregation layer for portal multi-service calls. | — | No | Revisar |
| 386 | Nango | APIs | https://github.com/NangoHQ/nango | Unknown | Descargado | Más adelante | Unified API for SaaS integrations with OAuth and sync templates. | OAuth connector catalog for tenant CRM/email integrations. | — | No | Revisar |
| 387 | OpenAPI Generator | APIs | https://github.com/OpenAPITools/openapi-generator | Apache-2.0 | Descargado | Más adelante | Generate API client SDKs and server stubs from OpenAPI specs. | Auto-generate TS clients for FastAPI and external integrations. | — | No | Revisar |
| 388 | Pomerium | APIs | https://github.com/pomerium/pomerium | Apache-2.0 | Descargado | Más adelante | Identity-aware reverse proxy for secure access to internal services. | Zero-trust access to Hasura, Grafana, and ops tools. | — | No | Revisar |
| 389 | PostgREST | APIs | https://github.com/PostgREST/postgrest | Unknown | Descargado | Más adelante | Standalone REST API from Postgres database schema. | Zero-code REST for internal tools over Postgres 16. | — | No | Revisar |
| 390 | Svix | APIs | https://github.com/svix/svix-webhooks | MIT | Descargado | Más adelante | Enterprise webhook sending service with retry and signing. | Reliable tenant webhook delivery for workflow triggers. | — | No | Revisar |
| 391 | Swagger UI | APIs | https://github.com/swagger-api/swagger-ui | Apache-2.0 | Descargado | Más adelante | Interactive API documentation from OpenAPI specifications. | Internal API docs for SaaS and OS endpoints. | — | No | Revisar |
| 392 | Tyk | APIs | https://github.com/TykTechnologies/tyk | MPL-2.0 | Descargado | Más adelante | Open-source API gateway with analytics, quotas, and developer portal. | Alternative gateway with built-in developer portal. | — | No | Revisar |
| 393 | Webhook.site OSS | APIs | https://github.com/webhooksite/webhook.site | MIT | Descargado | Más adelante | Self-hosted webhook inspector for debugging HTTP callbacks. | Debug Stripe/SES/workflow webhooks in staging. | — | No | Revisar |
| 394 | WunderGraph Cosmo | APIs | https://github.com/wundergraph/cosmo | Apache-2.0 | Sustituido | Más adelante | Backend-for-frontend framework combining GraphQL, REST, and auth. | BFF pattern reference for portal Next.js routes. | — | No | Revisar |
| 395 | Zapier Platform CLI | APIs | https://github.com/zapier/zapier-platform | Unknown | Descargado | Más adelante | SDK for building Zapier integrations with OAuth and triggers. | Reference for building NELVYON SaaS connector SDK. | — | No | Revisar |

---

## Integraciones

**39 proyectos**

| Nº | Nombre | Categoría | Repositorio oficial | Licencia | Estado | Prioridad | Qué hace | Para qué en NELVYON | Sustituye (pago) | ¿Ya tenemos algo? | Recomendación |
|---:|---|---|---|---|---|---|---|---|---|---|---|
| 396 | Agent-E | Integraciones | https://github.com/EmergenceAI/Agent-E | MIT | Descargado | Laboratorio | Autonomous web navigation agent for task completion. | Research agent for automated pack data gathering. | — | No | Mantener solo en laboratorio |
| 397 | AgentQL | Integraciones | https://github.com/tinyfish-io/agentql | MIT | Descargado | Más adelante | Query web page elements with natural language instead of selectors. | Resilient element targeting for AI browser agents. | — | No | Revisar |
| 398 | Appium | Integraciones | https://github.com/appium/appium | Apache-2.0 | Descargado | Laboratorio | Cross-platform mobile app automation using WebDriver protocol. | Mobile app testing for client app marketing packs. | — | No | Mantener solo en laboratorio |
| 399 | Botasaurus | Integraciones | https://github.com/omkarcloud/botasaurus | MIT | Descargado | Más adelante | All-in-one web scraping framework with anti-detection built in. | Turnkey stealth scraper for competitor monitoring packs. | — | No | Revisar |
| 400 | browser-use | Integraciones | https://github.com/browser-use/browser-use | MIT | Descargado | Más adelante | Make websites accessible for AI agents via browser control. | Agent browser tool for pack research and form automation. | — | No | Revisar |
| 401 | Browserless | Integraciones | https://github.com/browserless/browserless | SSPL-1.0 OR Browserless Commercial License` | Descargado | Más adelante | Headless Chrome/Firefox as a service with REST and Puppeteer API. | Scalable headless browser pool for scrape and PDF packs. | — | No | Revisar |
| 402 | Browsertrix Crawler | Integraciones | https://github.com/webrecorder/browsertrix-crawler | AGPL-3.0 | Descargado | Laboratorio | High-fidelity web archiving crawler using headless browsers. | Web archive for compliance and competitive research. | — | No | Mantener solo en laboratorio |
| 403 | Camoufox | Integraciones | https://github.com/daijro/camoufox | MPL-2.0 | Descargado | Laboratorio | Stealth Firefox build for anti-bot detection bypass. | Firefox-based stealth for sites blocking Chromium. | — | No | Mantener solo en laboratorio |
| 404 | Cheerio | Integraciones | https://github.com/cheeriojs/cheerio | MIT | Descargado | Integrar ahora | Fast, flexible jQuery-like HTML parsing for Node.js. | Static HTML parsing in Next.js API crawl endpoints. | — | No | Integrar |
| 405 | Chrome for Testing | Integraciones | https://github.com/GoogleChromeLabs/chrome-for-testing | Apache-2.0 | Sustituido | Más adelante | WebDriver implementation for Chromium browser automation. | Low-level driver for Selenium; Playwright bundles own browsers. | — | No | Revisar |
| 406 | chromedp | Integraciones | https://github.com/chromedp/chromedp | MIT | Descargado | Más adelante | Go library for driving Chrome via DevTools Protocol. | High-performance headless Chrome in Go crawl sidecars. | — | No | Revisar |
| 407 | Colly | Integraciones | https://github.com/gocolly/colly | Apache-2.0 | Descargado | Más adelante | Fast and elegant Go web scraping framework. | High-performance crawl workers for SEO pack batch jobs. | — | No | Revisar |
| 408 | Crawlee | Integraciones | https://github.com/apify/crawlee | Apache-2.0 | Descargado | Más adelante | Web scraping and crawling library for Node with anti-blocking. | Primary scraper for SEO audits and competitor analysis packs. | — | No | Revisar |
| 409 | Ferret | Integraciones | https://github.com/MontFerret/ferret | Apache-2.0 | Descargado | Más adelante | Declarative web scraping language compiling to browser automation. | Declarative scrape scripts for repeatable SEO audits. | — | No | Revisar |
| 410 | Firecrawl | Integraciones | https://github.com/mendableai/firecrawl | AGPL-3.0 | Descargado | Más adelante | Web scrape API converting sites to LLM-ready Markdown. | URL→Markdown for RAG ingest and pack research. | — | No | Revisar |
| 411 | Goutte | Integraciones | https://github.com/FriendsOfPHP/Goutte | Unknown | Descargado | Más adelante | Simple PHP web scraper built on Symfony DomCrawler. | PHP client site scrapers for WordPress agency clients. | — | No | Revisar |
| 412 | HTTrack | Integraciones | https://github.com/xroche/httrack | GPL-3.0 | Descargado | Laboratorio | Website copier for offline browsing and full site mirrors. | Full site archive for migration packs; GPL limits SaaS. | — | No | Mantener solo en laboratorio |
| 413 | Katana | Integraciones | https://github.com/projectdiscovery/katana | MIT | Descargado | Más adelante | Fast web crawler focused on automation and penetration testing. | Site discovery for SEO audits and broken link detection. | — | No | Revisar |
| 414 | LinkChecker | Integraciones | https://github.com/linkchecker/linkchecker | LGPL-3.0 | Descargado | Más adelante | Check links for validity and SEO broken link detection. | Broken link reports for NELVYON-SEO pack deliverables. | — | No | Revisar |
| 415 | MechanicalSoup | Integraciones | https://github.com/MechanicalSoup/MechanicalSoup | MIT | Descargado | Más adelante | Python library for automating interaction with websites. | Simple form-based scraping for legacy client sites. | — | No | Revisar |
| 416 | Mozilla Readability | Integraciones | https://github.com/mozilla/readability | Apache-2.0 | Descargado | Más adelante | Extract readable content from web pages — Firefox Reader View engine. | Browser-side and Node content extraction for pack research. | — | No | Revisar |
| 417 | Newspaper3k | Integraciones | https://github.com/codelucas/newspaper | MIT | Descargado | Más adelante | Extract and curate articles from news websites. | News monitoring for client brand mention packs. | — | No | Revisar |
| 418 | nodriver | Integraciones | https://github.com/ultrafunkamsterdam/nodriver | AGPL-3.0 | Descargado | Laboratorio | Successor to undetected-chromedriver with async Python API. | Python stealth browser for FastAPI scrape agents. | — | No | Mantener solo en laboratorio |
| 419 | Patchright | Integraciones | https://github.com/Kaliiiiiiiiii-Vinyzu/patchright | Apache-2.0 | Descargado | Laboratorio | Patched Playwright build bypassing bot detection mechanisms. | Stealth scraping for SEO audits on protected client sites. | — | No | Mantener solo en laboratorio |
| 420 | Playwright Browser Automation | Integraciones | https://github.com/microsoft/playwright | Apache-2.0 | Descargado | Integrar ahora | Playwright for programmatic browser control — automation catalog entry. | Cross-browser automation backbone for agents and E2E. | — | No | Integrar |
| 421 | Playwright Scraper | Integraciones | https://github.com/microsoft/playwright | Apache-2.0 | Descargado | Más adelante | Playwright for cross-browser scraping with auto-wait and tracing. | Cross-browser SEO rendering tests; separate from E2E test entry. | — | No | Revisar |
| 422 | Puppeteer | Integraciones | https://github.com/puppeteer/puppeteer | Apache-2.0 | Descargado | Más adelante | Node.js library for controlling headless Chrome/Chromium. | JS-rendered page scraping for SPA client sites. | — | No | Revisar |
| 423 | puppeteer-extra | Integraciones | https://github.com/berstend/puppeteer-extra | MIT | Descargado | Más adelante | Modular plugin framework for Puppeteer with stealth evasions. | Stealth Puppeteer plugins for protected site scraping. | — | No | Revisar |
| 424 | Rebrowser | Integraciones | https://github.com/rebrowser/rebrowser-patches | MIT | Descargado | Laboratorio | Patches for Puppeteer/Playwright to avoid automation detection. | Detection bypass patches for SEO crawl agents. | — | No | Mantener solo en laboratorio |
| 425 | Rod | Integraciones | https://github.com/go-rod/rod | MIT | Descargado | Más adelante | Go high-level driver for Chrome DevTools Protocol. | Go browser automation alternative to chromedp. | — | No | Revisar |
| 426 | Scrapy | Integraciones | https://github.com/scrapy/scrapy | BSD-3-Clause | Descargado | Más adelante | High-level Python web crawling framework with pipelines. | FastAPI agent scraping for large-scale SEO crawls. | — | No | Revisar |
| 427 | Scrapyd | Integraciones | https://github.com/scrapy/scrapyd | BSD-3-Clause | Descargado | Más adelante | Service to deploy and run Scrapy spiders with HTTP API. | Scheduled SEO crawl spider deployment for agency clients. | — | No | Revisar |
| 428 | Selenium | Integraciones | https://github.com/SeleniumHQ/selenium | Apache-2.0 | Descargado | Más adelante | Industry-standard browser automation framework with WebDriver protocol. | Legacy browser automation; Playwright preferred for new work. | — | No | Revisar |
| 429 | Selenium Grid | Integraciones | https://github.com/SeleniumHQ/docker-selenium | Apache-2.0 | Descargado | Más adelante | Docker Selenium Grid for parallel browser session scaling. | Parallel browser pool for batch SEO screenshot captures. | — | No | Revisar |
| 430 | SingleFile | Integraciones | https://github.com/gildas-lormeau/SingleFile | AGPL-3.0 | Descargado | Más adelante | Browser extension and CLI to save complete web pages as single HTML. | Competitive page snapshots for marketing research. | — | No | Revisar |
| 431 | Skyvern | Integraciones | https://github.com/Skyvern-AI/skyvern | AGPL-3.0 | Descargado | Más adelante | AI-powered browser automation for complex web workflows. | AI form filling for client onboarding and data entry packs. | — | No | Revisar |
| 432 | Stagehand | Integraciones | https://github.com/browserbase/stagehand | MIT | Descargado | Más adelante | AI browser automation framework built on Playwright with natural language. | Natural language browser tasks for OS research agents. | — | No | Revisar |
| 433 | Steel Browser | Integraciones | https://github.com/steel-dev/steel-browser | Apache-2.0 | Descargado | Más adelante | Open-source browser API for AI agents and automation. | Browserless alternative with AI agent focus. | — | No | Revisar |
| 434 | Trafilatura | Integraciones | https://github.com/adbar/trafilatura | Apache-2.0 | Descargado | Más adelante | Python library to extract main text and metadata from web pages. | Clean article text for RAG and content marketing analysis. | — | No | Revisar |

---

## Productividad

**20 proyectos**

| Nº | Nombre | Categoría | Repositorio oficial | Licencia | Estado | Prioridad | Qué hace | Para qué en NELVYON | Sustituye (pago) | ¿Ya tenemos algo? | Recomendación |
|---:|---|---|---|---|---|---|---|---|---|---|---|
| 435 | Akaunting | Productividad | https://github.com/akaunting/akaunting | Unknown | Descargado | Laboratorio | Online accounting software for small businesses. | Client invoicing reference; Stripe billing primary for NELVYON. | — | No | Mantener solo en laboratorio |
| 436 | AppFlowy | Productividad | https://github.com/AppFlowy-IO/AppFlowy | AGPL-3.0 | Descargado | Laboratorio | Open-source Notion alternative with local-first data. | Client workspace templates for content planning packs. | — | No | Mantener solo en laboratorio |
| 437 | BookStack | Productividad | https://github.com/BookStackApp/BookStack | MIT | Descargado | Más adelante | Simple self-hosted wiki platform organized in books, chapters, pages. | Internal agency runbooks and client knowledge bases. | — | No | Revisar |
| 438 | Cal.com | Productividad | https://github.com/calcom/cal.com | MIT | Descargado | Más adelante | Open-source scheduling infrastructure for meetings and bookings. | Client booking pages for agency kickoff and sales calls. | Calendly | No | Revisar |
| 439 | CryptPad | Productividad | https://github.com/cryptpad/cryptpad | AGPL-3.0 | Descargado | Más adelante | End-to-end encrypted collaborative docs, sheets, and whiteboards. | Zero-knowledge client collaboration for sensitive campaigns. | — | No | Revisar |
| 440 | ERPNext | Productividad | https://github.com/frappe/erpnext | GPL-3.0 | Descargado | Más adelante | Frappe-based ERP with accounting, HR, manufacturing, and CRM. | Open ERP for SME clients on Frappe stack. | — | No | Revisar |
| 441 | Frappe Framework | Productividad | https://github.com/frappe/frappe | MIT | Descargado | Más adelante | Full-stack web framework powering ERPNext and Frappe apps. | Python low-code platform for custom client ERP modules. | — | No | Revisar |
| 442 | Invoice Ninja | Productividad | https://github.com/invoiceninja/invoiceninja | Unknown | Descargado | Laboratorio | Invoicing, payments, and expense tracking platform. | Client invoicing stack; Elastic license review. | — | No | Mantener solo en laboratorio |
| 443 | Jitsi | Productividad | https://github.com/jitsi/jitsi-meet | Apache-2.0 | Descargado | Más adelante | Secure video conferencing with WebRTC — also in social catalog. | Meeting scheduling via Cal.com + Jitsi video rooms. | — | No | Revisar |
| 444 | Kimai | Productividad | https://github.com/kimai/kimai | AGPL-3.0 | Descargado | Más adelante | Multi-user time tracking for projects and billing. | Agency time tracking for client billing reports. | — | No | Revisar |
| 445 | Leantime | Productividad | https://github.com/Leantime/leantime | AGPL-3.0 | Descargado | Laboratorio | Lean project management for non-project managers. | Simple PM for non-technical agency clients. | — | No | Mantener solo en laboratorio |
| 446 | Nextcloud | Productividad | https://github.com/nextcloud/server | AGPL-3.0 | Descargado | Más adelante | Self-hosted file sync, calendar, contacts, and office collaboration. | Client file sharing and document collaboration hub. | Google Drive partial | No | Revisar |
| 447 | Odoo | Productividad | https://github.com/odoo/odoo | LGPL-3.0 | Descargado | Más adelante | Full business suite: CRM, accounting, inventory, HR, and projects. | All-in-one ERP for agency clients; distinct from NELVYON SaaS core. | — | No | Revisar |
| 448 | ONLYOFFICE | Productividad | https://github.com/ONLYOFFICE/DocumentServer | AGPL-3.0 | Descargado | Más adelante | Online office suite for document, spreadsheet, and presentation editing. | Collaborative doc editing paired with Nextcloud. | Google Docs partial | No | Revisar |
| 449 | OpenProject | Productividad | https://github.com/opf/openproject | GPL-3.0 | Descargado | Más adelante | Project management with Gantt, agile boards, and time tracking. | Agency project delivery tracking for client engagements. | — | No | Revisar |
| 450 | Outline | Productividad | https://github.com/outline/outline | Apache-2.0 | Descargado | Más adelante | Modern team knowledge base with realtime collaboration. | Agency wiki; BookStack MIT alternative preferred. | — | No | Revisar |
| 451 | Plane | Productividad | https://github.com/makeplane/plane | AGPL-3.0 | Descargado | Más adelante | Modern open-source project management alternative to Jira/Linear. | Internal sprint tracking for NELVYON dev and agency PM. | Jira partial | No | Revisar |
| 452 | Solidtime | Productividad | https://github.com/solidtime-io/solidtime | AGPL-3.0 | Descargado | Laboratorio | Modern time tracking with projects, reports, and invoicing. | Next-gen time tracker; Kimai more mature. | — | No | Mantener solo en laboratorio |
| 453 | Taiga | Productividad | https://github.com/taigaio/taiga-back | MPL-2.0 | Descargado | Más adelante | Agile project management with kanban, scrum, and epics. | Agile boards for agency dev teams; Plane preferred. | — | No | Revisar |
| 454 | Vaultwarden | Productividad | https://github.com/dani-garcia/vaultwarden | AGPL-3.0 | Descargado | Más adelante | Lightweight Bitwarden-compatible password manager server. | Team secrets vault for agency credentials and API keys. | — | No | Revisar |

---

## Otros

**7 proyectos**

| Nº | Nombre | Categoría | Repositorio oficial | Licencia | Estado | Prioridad | Qué hace | Para qué en NELVYON | Sustituye (pago) | ¿Ya tenemos algo? | Recomendación |
|---:|---|---|---|---|---|---|---|---|---|---|---|
| 455 | GlitchTip | Otros | https://github.com/glitchtip/glitchtip | MIT | Descargado | Más adelante | Lightweight Sentry-compatible error tracking. | Lower-resource Sentry alternative for staging/PRIVATE_MODE. | — | No | Revisar |
| 456 | Highlight.io | Otros | https://github.com/highlight/highlight | Apache-2.0 | Descargado | Más adelante | Open-source session replay and error monitoring. | Debug SaaS UI issues with replay; privacy review for CRM. | — | No | Revisar |
| 457 | Jaeger | Otros | https://github.com/jaegertracing/jaeger | Apache-2.0 | Descargado | Más adelante | CNCF distributed tracing platform for microservices. | Apache-licensed trace backend alternative to Tempo. | — | No | Revisar |
| 458 | Loki | Otros | https://github.com/grafana/loki | AGPL-3.0 | Descargado | Más adelante | Horizontally scalable log aggregation inspired by Prometheus. | Centralize Next.js/FastAPI/router logs on Railway. | — | No | Revisar |
| 459 | Meilisearch | Otros | https://github.com/meilisearch/meilisearch | MIT | Descargado | Más adelante | Lightning-fast search API with typo tolerance. | SaaS CRM global search without vector needs. | — | No | Revisar |
| 460 | Sentry (self-hosted) | Otros | https://github.com/getsentry/sentry | Unknown | Descargado | Más adelante | Error tracking and performance monitoring platform. | Production error tracking for Next.js and FastAPI. | — | No | Revisar |
| 461 | Tempo | Otros | https://github.com/grafana/tempo | AGPL-3.0 | Descargado | Más adelante | High-scale distributed tracing backend. | Trace pack orchestration and router inference paths. | — | No | Revisar |
