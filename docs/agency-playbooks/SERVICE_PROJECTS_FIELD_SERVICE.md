# SERVICE — Projects & Field Service Core

> Module: `backend/agency/ProjectsFieldServiceCore.ts` · Block **29**  
> In-memory operational core · **NOT** accounting/GL · signature capture **BLOCKED_EXTERNAL**

## Scope

| Domain | What it does |
|--------|----------------|
| Project | `name`, optional `templateId`, `status`, `milestones[]`, `tasks[{id,title,status,dependsOn[],assigneeId?}]` |
| Kanban | Columns = task statuses (`backlog` → `done` / `blocked`) via `getKanbanBoard` |
| Capacity | Per-assignee weekly hours; `planAssignment` returns **warn** on overload (does not hard-fail) |
| Timesheet | Entries with informational `rateInternalCents` → submit → approve / reject |
| Operational profitability | `computeOperationalMargin(revenue − hours×rate)` — **explicitly NOT accounting** |
| Field work order | assign → schedule → checklist / evidence → complete; `signaturePrepared: prepared_off` |
| Signature | `captureSignature()` **always** throws `BLOCKED_EXTERNAL`; consent flag stays `false` |
| Portal stub | In-memory `listClientDeliverablesForPortal` by `projectId` + `portalRole` (tenant-scoped) |
| SLA | `targetHours` + `checkSlaBreach` helper |
| Audit / isolation | Per-tenant audit log; cross-tenant access denied |

## Integrity

```ts
assertProjectsFsCoreIntegrity() // signature blocked · margin non-GL · tenant isolation
```

## Forbidden claims

- No GL / invoicing / payroll posting from timesheet rates
- No real e-signature / consent capture
- Not wired into `OsCatalogV1` / `backend/agency/index.ts` in this block
