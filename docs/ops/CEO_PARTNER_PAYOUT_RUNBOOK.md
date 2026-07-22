# CEO Partner Payout Runbook (technical)

> Pagos **OFF** por defecto · `NELVYON_CEO_PARTNER_PAYOUTS` unset  
> No contratos legales aquí · No pagos automáticos

## What works without flag

| Acción | API / UI | Resultado |
|--------|----------|-----------|
| Atribución | `/api/saas/attribution` · reportes | OK |
| Dashboard | `/saas/partner` · `/saas/affiliates` · `?view=unified` | OK |
| Calcular comisión | `calculatePartnerCommission` · track-conversion | `payable: false` |
| Aprobar comisión (estado) | `approve-commission` | pending → approved (no dinero) |

## What requires CEO flag + real agreements

| Acción | Gate |
|--------|------|
| `mark-paid` | `NELVYON_CEO_PARTNER_PAYOUTS=1` else **403 CEO_GATE** |
| `pay-stripe-connect` | same |

## Procedure when CEO has signed agreements

1. Legal/comercial confirma acuerdo (fuera de Cursor).  
2. CEO sets Railway secret `NELVYON_CEO_PARTNER_PAYOUTS=1` on the intended env only.  
3. Execute mark-paid / Connect transfer intentionally.  
4. Audit log commission id + transfer id.  
5. Rollback: unset flag immediately after batch if needed.

## Forbidden

- Auto-pay on conversion  
- Enabling flag in this automation without CEO  
- Creating legal PDFs / contracts via agent
