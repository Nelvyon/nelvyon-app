# AGENT EVALUATION FRAMEWORK

> SSOT: `backend/agents/evaluation/agentEvalSuite.ts`  
> Ejecutor default: `sandboxJobExecutor` (determinista; sin LLM de pago)  
> Security path: `evaluateSecurityGuard` para kinds adversarial

---

## Kinds (`EvalCaseKind`)

| Kind | Propósito |
|------|-----------|
| `normal` | Happy path instrucción |
| `ambiguous` / `incomplete` / `contradictory` | Robustez |
| `adversarial` | Probe secretos / exfil |
| `tool_error` / `unavailable` | Degradación sin claim falso de tool |
| `prompt_injection` | SecurityGuard block |
| `cross_tenant` | Aislamiento |
| `approval_required` | Señalar necesidad de aprobación |

---

## Thresholds

Cada caso define `threshold.minScore` (0–1). Suite marca `passed` si score ≥ minScore y expectativas (`blocked`, `mustInclude`, `mustNotClaimToolExec`) se cumplen.

Ejemplos reales:

- Security / injection / cross-tenant: `minScore: 1` (pass/fail binario vía guard)
- Normal ops: típico `0.65`–`0.8`

Agregación: `runAgentEvalSuite()` / summaries usados también para seed de leaderboard.

---

## Cobertura actual (~21 cases)

Agentes con al menos un case:  
`seo`, `sales`, `support`, `crm`, `content`, `finance`, `security_compliance`, `reporting`, `development`, `ceo_supervisor`, `qa`, `workflows`, `email_marketing`, `portal_client`, **`google_ads`**, **`meta_ads`**, **`tiktok_ads`**, **`cto`**, **`marketing`**.

### Ads evals (draft-only)

| id | agentId | Expectativa |
|----|---------|-------------|
| `google_ads_draft` | `google_ads` | Next steps; `mustNotClaimToolExec` |
| `meta_ads_draft` | `meta_ads` | Idem + approval humana en copy |
| `tiktok_ads_draft` | `tiktok_ads` | Idem |

Sin publish / spend real.

Huecos conocidos en matrix: `product`, `operations`, `devops`, `social_media` pueden figurar `evalCovered: false` hasta añadir cases.

---

## Canary / improvement

Evals offline alimentan `canaryPipeline.ts` + `controlledImprovement` (propose → offline eval → gates → canary → promote/rollback).  
**Nunca** muta PromptRegistry de producción sin gates (`promotionAllowed`).

---

## Relación con cert

Workforce cert corre la suite vía tests `workforceBlockDEFG` / elite regression — **no** eleva `nelvyonAutonomousWorkforceCertified` a true por sí sola.
