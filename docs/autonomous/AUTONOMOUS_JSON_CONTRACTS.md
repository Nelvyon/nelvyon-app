# NELVYON Autonomous — JSON Contracts

**Versión:** 1.0 · **Fase:** AUTONOMOUS-PHASE-A  
**SKUs:** Landing · Chatbot · SEO básico  
**Uso:** Contratos entre agentes, intake, QA y publicación OS (sin implementación código)

---

## 1. Convenciones globales

| Campo | Tipo | Regla |
|-------|------|-------|
| `project_id` | UUID v4 | Generado en OS al kick-off autónomo |
| `sku` | enum | `NELVYON-LANDING` \| `NELVYON-CHATBOT` \| `NELVYON-SEO` |
| `tier` | enum | `starter` \| `professional` \| `premium` |
| `version` | int | Incrementa en cada reintento agente |
| `status` | enum | Ver §2 |
| `created_at` | ISO 8601 UTC | |
| `locale` | string | `es-ES` default; `en-GB` opcional |

### 1.1 Estados del job autónomo

```
INTAKE_VALIDATING → PLANNING → PRODUCING → QA_SCORING → QA_BLOCKED → RETRYING → PACKAGING → OS_PUBLISH_READY → DELIVERED
```

| Estado | Descripción |
|--------|-------------|
| `QA_BLOCKED` | Score < 85; esperando reintento |
| `RETRYING` | Agente corrigiendo (intento 1–3) |
| `OS_PUBLISH_READY` | Score ≥ 85; listo webhook OS |

---

## 2. Contrato raíz — `AutonomousProject`

```json
{
  "$schema": "https://nelvyon.internal/schemas/autonomous-project-v1.json",
  "project_id": "550e8400-e29b-41d4-a716-446655440000",
  "sku": "NELVYON-LANDING",
  "tier": "professional",
  "status": "PRODUCING",
  "retry_count": 0,
  "max_retries": 3,
  "os_refs": {
    "client_id": "os_client_uuid",
    "project_slug": "LANDING-ACME-SOLAR-Q2",
    "workspace_id": "ws_uuid"
  },
  "brief": {},
  "artifacts": {},
  "qa": {},
  "agent_log": []
}
```

### Validaciones raíz

| Campo | Validación | Bloqueo |
|-------|------------|---------|
| `brief` | Schema por SKU completo | Sin kick-off |
| `os_refs.client_id` | Existe en OS | INTAKE |
| `retry_count` | ≤ `max_retries` | Escalar operador |

---

## 3. Brief intake — Landing (`LandingBrief`)

```json
{
  "company_name": "HelioVolt Energía",
  "sector": "solar",
  "value_proposition": "Instalación solar llave en mano en Valencia con financiación.",
  "primary_cta": "Solicitar estudio gratuito",
  "cta_type": "form",
  "traffic_source": "google_ads",
  "target_geo": "ES-VC",
  "locale": "es-ES",
  "brand": {
    "logo_url": "https://cdn.../logo.svg",
    "primary_color": "#0F766E",
    "secondary_color": "#F59E0B"
  },
  "social_proof": [
    { "type": "testimonial", "text": "...", "author": "María G." }
  ],
  "domain": {
    "type": "subdomain",
    "host": "solar.cliente.com"
  },
  "tracking": {
    "google_ads_id": "AW-123456",
    "meta_pixel_id": null,
    "ga4_id": "G-XXXXXXXX"
  },
  "references": ["https://competidor1.com/landing"],
  "compliance_flags": {
    "regulated_sector": false,
    "requires_legal_review": false
  }
}
```

**Campos obligatorios:** `company_name`, `sector`, `value_proposition`, `primary_cta`, `domain.host`, `locale`.

---

## 4. Brief intake — Chatbot (`ChatbotBrief`)

```json
{
  "company_name": "Clínica Sonrisa Norte",
  "sector": "dental",
  "website_url": "https://sonrisanorte.com",
  "locale": "es-ES",
  "bot_name": "Asistente Sonrisa",
  "tone": "cercano_profesional",
  "channels": ["web_widget"],
  "business_hours": "L-V 9:00-20:00",
  "handoff": {
    "type": "email",
    "destination": "recepcion@sonrisanorte.com"
  },
  "lead_capture": {
    "enabled": true,
    "fields": ["name", "phone", "email"]
  },
  "faqs_source": {
    "urls": ["https://sonrisanorte.com/tratamientos"],
    "uploaded_docs": ["faq-cliente.pdf"]
  },
  "faqs_minimum": 15,
  "forbidden_topics": ["diagnostico", "prescripcion", "precio_exacto_sin_cita"],
  "compliance_flags": {
    "regulated_sector": true,
    "disclaimer_required": true
  },
  "openai_cost_bearer": "client"
}
```

**Campos obligatorios:** `company_name`, `website_url`, `bot_name`, `tone`, `handoff`, `faqs_source`, `compliance_flags`.

---

## 5. Brief intake — SEO (`SeoBrief`)

```json
{
  "company_name": "Alonso & Vega Abogados",
  "primary_domain": "https://alonsovega.es",
  "locale": "es-ES",
  "market": "ES-AN",
  "seed_keywords": [
    "abogado laboral sevilla",
    "despacho mercantil sevilla"
  ],
  "competitors": [
    "https://competidor1.es",
    "https://competidor2.es"
  ],
  "gsc_oauth": {
    "connected": true,
    "property": "sc-domain:alonsovega.es"
  },
  "ga4_property_id": "123456789",
  "pages_to_optimize": 5,
  "tier_scope": "starter",
  "compliance_flags": {
    "regulated_sector": true,
    "no_ranking_guarantee_ack": true
  }
}
```

**Campos obligatorios:** `primary_domain`, `seed_keywords` (min 5), `market`, `pages_to_optimize`.

---

## 6. Artefactos por agente — Landing

### 6.1 `artifacts.strategy` (`LandingStrategy`)

```json
{
  "version": 1,
  "framework": "PAS",
  "avatar": "Propietario vivienda 35-55 años, Valencia, factura luz alta",
  "primary_objection": "No sé si compensa económicamente",
  "promise": "Estudio gratuito con ahorro estimado en 48h",
  "single_cta": "Solicitar estudio gratuito",
  "sections": [
    { "id": "hero", "goal": "captar atención + CTA" },
    { "id": "benefits", "goal": "3 beneficios tangibles" },
    { "id": "social_proof", "goal": "testimonios" },
    { "id": "faq", "goal": "objeciones" },
    { "id": "final_cta", "goal": "cierre" }
  ],
  "template_id": "landing-cro-v3"
}
```

### 6.2 `artifacts.copy` (`LandingCopy`)

```json
{
  "version": 1,
  "hero": {
    "headline": "Reduce tu factura hasta un 70% con solar en Valencia",
    "subheadline": "Estudio gratuito sin compromiso · Instalación certificada",
    "cta_label": "Solicitar estudio gratuito"
  },
  "benefits": [
    { "title": "...", "body": "..." }
  ],
  "faq": [{ "q": "...", "a": "..." }],
  "thank_you": {
    "headline": "Gracias — te llamamos en 24h",
    "body": "..."
  },
  "meta": {
    "title": "Solar Valencia | HelioVolt",
    "description": "..."
  }
}
```

### 6.3 `artifacts.design` (`LandingDesign`)

```json
{
  "version": 1,
  "template_id": "landing-cro-v3",
  "tokens": {
    "primary": "#0F766E",
    "secondary": "#F59E0B",
    "font_heading": "Inter",
    "font_body": "Inter"
  },
  "assets": [
    { "slot": "hero_image", "url": "https://...", "alt": "..." }
  ]
}
```

### 6.4 `artifacts.build` (`LandingBuild`)

```json
{
  "version": 1,
  "staging_url": "https://solar.cliente.com",
  "builder_ref": "landing_builder_service",
  "build_id": "build_abc123",
  "lighthouse_mobile": 88,
  "form_endpoint": "https://hooks.../lead"
}
```

---

## 7. Artefactos por agente — Chatbot

### 7.1 `artifacts.strategy` (`ChatbotStrategy`)

```json
{
  "version": 1,
  "persona": {
    "name": "Asistente Sonrisa",
    "tone": "cercano_profesional",
    "boundaries": ["no diagnostico", "no precios cerrados"]
  },
  "intents": [
    { "id": "hours", "priority": "high" },
    { "id": "treatments_info", "priority": "high" },
    { "id": "book_appointment", "priority": "high" },
    { "id": "handoff_human", "priority": "critical" }
  ],
  "flow_template_id": "faq-general"
}
```

### 7.2 `artifacts.knowledge_base` (`ChatbotKB`)

```json
{
  "version": 1,
  "faqs": [
    {
      "id": "faq_001",
      "intent": "hours",
      "question_patterns": ["horario", "abierto domingo"],
      "canonical_answer": "L-V 9:00-20:00. Sábados 10:00-14:00.",
      "source": "client_faq"
    }
  ],
  "fallback": "No tengo esa información. ¿Quieres que te contacte recepción?",
  "disclaimer": "Información orientativa, no sustituye consulta profesional."
}
```

### 7.3 `artifacts.config` (`ChatbotConfig`)

```json
{
  "version": 1,
  "service_ref": "chatbot_service",
  "bot_id": "bot_uuid",
  "system_prompt_hash": "sha256:...",
  "widget_snippet": "<script>...</script>",
  "lead_webhook": "https://..."
}
```

---

## 8. Artefactos por agente — SEO

### 8.1 `artifacts.audit` (`SeoAudit`)

```json
{
  "version": 1,
  "crawl": {
    "urls_discovered": 42,
    "urls_with_errors": 2,
    "critical_5xx": 0
  },
  "technical": {
    "robots_ok": true,
    "sitemap_ok": true,
    "cwv_sample": { "lcp_p75": 2.1, "cls_p75": 0.05 }
  },
  "issues": [
    {
      "id": "ISS-001",
      "priority": "P0",
      "type": "missing_meta_description",
      "url": "/servicios",
      "fix_auto": true
    }
  ]
}
```

### 8.2 `artifacts.keywords` (`SeoKeywordMap`)

```json
{
  "version": 1,
  "keywords": [
    {
      "keyword": "abogado laboral sevilla",
      "intent": "transactional",
      "target_url": "/laboral",
      "priority": 1
    }
  ],
  "gap_vs_competitors": []
}
```

### 8.3 `artifacts.on_page_fixes` (`SeoOnPageFixes`)

```json
{
  "version": 1,
  "pages": [
    {
      "url": "/laboral",
      "title": "Abogado laboral en Sevilla | Alonso & Vega",
      "meta_description": "...",
      "h1": "Abogado laboral en Sevilla",
      "schema": { "@type": "LegalService", "name": "..." }
    }
  ]
}
```

### 8.4 `artifacts.report` (`SeoReport`)

```json
{
  "version": 1,
  "pdf_url": "https://storage.../seo-report.pdf",
  "sections_complete": 10,
  "plan_90d": [
    { "week": 1, "action": "Fix P0 meta titles" }
  ]
}
```

---

## 9. Contrato QA — `QaResult`

```json
{
  "score": 87,
  "passed": true,
  "threshold": 85,
  "sku": "NELVYON-LANDING",
  "dimensions": {
    "sop_compliance": 22,
    "technical": 21,
    "content": 18,
    "conversion": 13,
    "seo_tracking": 13
  },
  "blocking_failures": [],
  "warnings": ["LCP 2.4s near limit"],
  "failed_agents": [],
  "retry_recommendation": null,
  "evaluated_at": "2026-06-07T14:30:00Z",
  "artifact_versions": {
    "copy": 2,
    "build": 1
  }
}
```

### Bloqueo si `score < 85`

```json
{
  "score": 78,
  "passed": false,
  "blocking_failures": [
    { "code": "LAND-FORM-001", "message": "Form submit failed", "agent": "agent-qa" }
  ],
  "failed_agents": ["agent-copywriter"],
  "retry_recommendation": {
    "target_agent": "agent-copywriter",
    "reason": "CTA unclear below fold",
    "attempt": 1
  }
}
```

---

## 10. Contrato reintento — `RetryDirective`

```json
{
  "project_id": "550e8400-e29b-41d4-a716-446655440000",
  "attempt": 1,
  "max_attempts": 3,
  "target_agent": "agent-designer",
  "failed_checks": ["LAND-WCAG-001", "LAND-LCP-002"],
  "instructions": "Increase contrast on CTA button; optimize hero image WebP",
  "preserve_artifacts": ["strategy", "copy"],
  "regenerate_artifacts": ["design", "build"]
}
```

| Intento | Acción si falla |
|---------|-----------------|
| 1 | Reintento agente señalado |
| 2 | Reintento + modelo upgrade |
| 3 | Reintento + plantilla alternativa |
| > 3 | `ESCALATE_OPERATOR` — OS tarea manual |

---

## 11. Contrato entrega OS — `OsPublishPayload`

**Integración delgada** — no modifica OS core; escribe registros existentes.

```json
{
  "project_id": "550e8400-e29b-41d4-a716-446655440000",
  "os_refs": {
    "client_id": "os_client_uuid",
    "project_slug": "LANDING-ACME-SOLAR-Q2"
  },
  "deliverables": [
    {
      "type": "url",
      "label": "Landing live",
      "value": "https://solar.cliente.com",
      "visibility": "client"
    },
    {
      "type": "file",
      "label": "QA Report",
      "value": "storage://projects/.../qa-report.pdf",
      "visibility": "internal"
    },
    {
      "type": "json",
      "label": "Copy map",
      "value": "storage://projects/.../copy-v2.json",
      "visibility": "client"
    }
  ],
  "qa_score": 87,
  "autonomous_job_id": "job_uuid",
  "handoff_email_draft": {
    "subject": "Tu landing NELVYON está lista",
    "body_markdown": "..."
  },
  "os_actions": [
    { "entity": "deliverable", "action": "create", "status": "published" },
    { "entity": "project", "action": "update_status", "status": "CLIENTE_REVISION" },
    { "entity": "task", "action": "complete", "task_key": "QA_AUTONOMOUS" }
  ]
}
```

### Mapeo OS (referencia)

| Contrato | Entidad OS existente |
|----------|---------------------|
| `os_refs.project_slug` | `os_projects` |
| `deliverables[]` | `os_deliverables` / documentos proyecto |
| `os_actions.update_status` | Pipeline proyecto OS |
| `handoff_email_draft` | Plantilla email ops (no SaaS) |

---

## 12. Log de agente — `AgentLogEntry`

```json
{
  "agent": "agent-copywriter",
  "started_at": "2026-06-07T14:00:00Z",
  "ended_at": "2026-06-07T14:02:30Z",
  "input_artifact_versions": { "strategy": 1 },
  "output_artifact": "copy",
  "output_version": 2,
  "model": "gpt-4o",
  "tokens": 4200,
  "status": "success"
}
```

---

*JSON Contracts v1.0 — AUTONOMOUS-PHASE-A*
