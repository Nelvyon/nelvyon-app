# MASTER — Seguridad Open Source NELVYON

> Generado: 2026-07-15 · Enfoque: PRIVATE_MODE + SaaS multi-tenant

---

## Principios

1. **PRIVATE_MODE=1** — sin egress de datos de tenant a APIs cloud no autorizadas.
2. **Aislamiento por tenant** — RLS Postgres, colas scoped, JWT httpOnly.
3. **Supply chain** — pin de versiones, SBOM, escaneo Trivy/Grype.
4. **Secretos** — Vault/Infisical; nunca en repo.
5. **Superficie mínima** — solo exponer APIs necesarias; MCP tools con sandbox.

---

## Herramientas OSS recomendadas (INTEGRAR AHORA)

| Herramienta | Función | Riesgo residual |
|---|---|---|
| [Trivy](https://github.com/aquasecurity/trivy) | Vulnerability scanner for containers, IaC, and dep | low |
| [Semgrep](https://github.com/semgrep/semgrep) | Static analysis for code security and custom rules | low |
| [Gitleaks](https://github.com/gitleaks/gitleaks) | Detect hardcoded secrets in git repos and CI. | low |

---

## Riesgos por categoría

| Categoría | Riesgo principal | Mitigación |
|---|---|---|
| LLM local | Model poisoning, prompt injection | RouterValidator, Guardrails, constitution |
| MCP / Agentes | Tool escalation, filesystem access | Allowlist tools, sandbox, audit log |
| RAG | Data leakage cross-tenant | pgvector RLS, tenant.id scope |
| Email self-hosted | Open relay, spam | SPF/DKIM/DMARC, rate limits |
| Scraping | ToS legal, IP block | Respect robots.txt, rate limit, cache |
| AGPL tools | License contamination | Legal review; no embed en prod multi-tenant |

---

## Proyectos alto riesgo (clasificación DESCARTAR o SOLO LABORATORIO)

| Proyecto | Riesgo | Motivo |
|---|---|---|
| LocalAI | low | OK for local |
| KoboldCpp | medium | AGPL |
| MLX | low | N/A |
| Jan | medium | AGPL |
| GPT4All | low | OK |
| Ray Serve | high | Complex attack surface |
| Langflow | medium | Standard |
| Windmill | high | AGPL network copyleft |
| Sim | high | Unproven |
| Milvus | high | Complex cluster surface |
| Typesense | high | GPL copyleft for SaaS |
| Vespa | high | Large JVM attack surface |
| Camunda 8 | high | BPMN XML injection review |
| Automatisch | high | AGPL network copyleft |
| Bonita | high | GPL copyleft |
| Netdata | high | GPL copyleft |
| Checkmk | high | GPL |
| Zabbix | high | GPL |
| Wazuh | high | GPL |
| MinIO | high | AGPL if offering storage-as-service to tenants |
| Garage | high | AGPL |
| CockroachDB | high | BSL license |
| ParadeDB | high | AGPL extension |
| SurrealDB | high | BSL; immature multi-tenant |
| Kubernetes | high | RBAC, network policies mandatory |
| Twenty | high | AGPL network copyleft for SaaS UI |
| EspoCRM | high | AGPL; PHP patch cadence |
| SuiteCRM | high | AGPL; long upgrade paths |
| Zammad | high | AGPL; Elasticsearch data retention |
| Mautic | high | GPL copyleft; PII in contact DB |
| Vtiger CRM | medium | VPL license review |
| osTicket | medium | GPL; plugin audit |
| Erxes | high | AGPL; Mongo tenant isolation |
| Papercups | medium | Widget embed CSP |
| Live Helper Chat | medium | AGPL |
| Frappe CRM | high | AGPL Frappe bench isolation |
| Listmonk | high | AGPL; bounce webhook secrets |
| mailcow | high | GPL; complex attack surface |
| Keila | high | AGPL; consent tracking GDPR |
| Mailtrain | medium | GPL |

---

## Checklist pre-integración

- [ ] CVE scan (Trivy/Grype) en imagen Docker
- [ ] Licencia revisada (`MASTER_OPEN_SOURCE_LICENSES.md`)
- [ ] Auth/network policy definida
- [ ] Tests de aislamiento tenant
- [ ] Runbook en `docs/OPS.md`
- [ ] Compatible PRIVATE_MODE verificado
