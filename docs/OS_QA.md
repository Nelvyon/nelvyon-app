# OS QA Engine — Visual + Legal Pre-Portal

Every pack deliverable passes through two QA gates before it can be auto-approved or surfaced in the client portal:

1. **QA Score gate** — `scoreProject()` in `backend/autonomous/qa/scorer.ts`
2. **Visual + Legal gate** — `runVisualQa()` in `backend/autonomous/qa/visualQaEngine.ts` (O12)

---

## Visual QA (O12)

### Scoring breakdown (100 pts)

| Dimension | Max pts | What is checked |
|---|---|---|
| Structural | 40 | `<h1>` (15), CTA keyword EN/ES (15), `<meta name="description">` (10) |
| Brand contrast | 35 | WCAG 2.1 AA relative luminance ratio ≥ 4.5 between brand color and background |
| Legal compliance | 25 | No prohibited guarantees, health claims, or financial promises |

### Brand contrast formula

Uses WCAG 2.1 relative luminance:

```
L = 0.2126·R + 0.7152·G + 0.0722·B  (sRGB linearized)
Contrast ratio = (L_lighter + 0.05) / (L_darker + 0.05)
AA threshold = 4.5:1
```

Pack deliverables use `brandColor: "#0084ff"` on `backgroundColor: "#020817"` (Nelvyon dark glass).

### Legal checks

Scans deliverable HTML + copy for patterns including:
- `100% garantizado`
- `sin riesgo` / `risk-free`
- `cura` (health claims)
- Financial return guarantees

---

## Portal blocking logic

`packOrchestrator.ts` sets `needsReview = true` (blocks auto-approve) when **any** of:
- `qa_score < 85` (existing scorer)
- `qa_visual_score < 70` (visual QA)
- `qa_legal_passed === false` (legal check)

`SkuRunResult` now carries `qa_visual_score` and `qa_legal_passed` alongside the existing `qa_score`.

---

## Usage

```typescript
import { runVisualQa } from "backend/autonomous/qa/visualQaEngine";

const result = runVisualQa({
  landingHtml: "<h1>Title</h1><button>Get Started</button>",
  copyText: "Our platform grows your business.",
  brandColor: "#0084ff",
  backgroundColor: "#020817",
});

// result.score: 0–100
// result.legal_passed: boolean
// result.checks: { structural_score, contrast_score, legal_score, ... }
```

---

## Tests

```bash
pnpm -C apps/web exec vitest run backend/autonomous/__tests__/visualQaEngine.test.ts
# 18 tests — structural (6), contrast (4), legal (5), combined (3)
```
