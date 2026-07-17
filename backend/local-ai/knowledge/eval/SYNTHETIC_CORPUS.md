# Synthetic RAG evaluation corpus (safe)

Internal, non-sensitive snippets for validating Unified RAG ingest/retrieve
without depending on an external customer corpus.

## Documents

### doc-nelvyon-privacy
Tenant isolation is enforced with RLS and `app.tenant_id`. Agents must not
export or compare data across tenants.

### doc-nelvyon-seo-basics
On-page SEO requires unique title, single H1, descriptive meta description,
and internal links to conversion pages.

### doc-nelvyon-support-sla
Support triage: classify urgency, acknowledge within SLA, escalate billing
and security issues to human approval.

### doc-nelvyon-crm-followup
CRM follow-up: after 7 days of silence, send one value email; after 14 days,
offer a short call; never invent tool execution without evidence.

## Eval queries (expected doc ids)

| query | expect_contains |
|-------|-----------------|
| tenant isolation RLS | doc-nelvyon-privacy |
| on-page SEO H1 title | doc-nelvyon-seo-basics |
| support escalate billing | doc-nelvyon-support-sla |
| CRM follow-up 14 days | doc-nelvyon-crm-followup |

## Status

Corpus defined for elite work. Indexing into LocalVectorStore and retrieval
precision metrics remain an ops/ingest step (see TODO / PHASE2_ELITE_CERT).
