# OS Delivery Certificate (O23)

A verifiable HTML document issued per completed pack run that bundles the proof of
quality and provenance for the deliverables.

## What it contains

- Pack id + pack run id + issue date
- QA score (`kpis.avg_qa_score`) + visual score + Lighthouse proxy (from O18 audit)
- Legal pass/fail badge
- Seed used (`seed_id` + source)
- Data provider (`semrush` | `dataforseo` | `mock` | `none`, from O21 `_agent_data`)
- SKUs / agents executed (`sku_results[].sku`)
- Content hash (SHA-256 — the O18 audit hash when present, else a hash of the
  canonical report kpis + SKUs)
- Footer: "Generado por Nelvyon OS — no editable"

Self-contained HTML, dark-glass styled (`#020817` / `#0084ff`). No PDF binary in v1;
`cert_url` points to the authenticated HTML viewer.

## When it is issued

- **Automatically** when a pack run reaches `status = completed` (hook in
  `packOrchestrator`, best-effort — never blocks the run).
- **Manually** via `POST /api/os/certificates/issue { packRunId, force? }`
  (platform admin), or the "Re-emitir" button in `/os/certificates`.

Non-completed runs get a `pending` row (no document) unless `force: true`.

## How to re-issue

```
POST /api/os/certificates/issue   { "packRunId": "<uuid>", "force": true }
```
Idempotent on `pack_run_id` (UNIQUE) — re-issuing refreshes the HTML + hash.

## Relation to S50 Compliance Vault

On issuance with a known `tenantId`, the service calls
`SaasComplianceVaultService.syncFromPackRun` (best-effort) so the certificate appears
as a `qa_certificate` artifact in `/saas/compliance` with `qa_pdf_url = cert_url`.

## APIs

- `GET /api/os/certificates` → `{ summary, certificates[] }`
- `GET /api/os/certificates/[id]` → metadata (with html)
- `GET /api/os/certificates/[id]/html` → `text/html` (platform-auth, v1)
- `POST /api/os/certificates/issue` → issue / re-issue

Dashboard: `/os/certificates` (KPIs, table, iframe preview).

## Portal client (future)

`GET /api/platform/portal/deliverables/[id]/certificate` will resolve a deliverable's
`metadata.pack_run_id` → its certificate so clients can view/download it. Not wired in
v1 (platform-only viewer).
