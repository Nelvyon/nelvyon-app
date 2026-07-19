# OS + SaaS — Production readiness

> Snapshot **2026-07-17** · Distinción: código vs ops vs certificado vs E2E live

## Veredicto corto

| Producto | ¿Listo producción? | Condición |
|----------|-------------------|-----------|
| **NELVYON SaaS** | **Parcial** | Código + UI_CONTRACT E2E verde; **sin** E2E live multi-tenant local hoy; **email** bloqueado SES |
| **NELVYON OS** | **Parcial** | Packs/CI existen; staging smokes no re-ejecutados 2026-07-17 |
| **Portal** | **Parcial** | Entregables UI_CONTRACT PASS; approve live parcial |
| **Private AI** | **No default-on** | Router+MCP CERTIFIED; flag OFF |
| **Marketing web** | **Sí código** | Independiente de SES SaaS |

## Checklist producción

| Requisito | SaaS | OS |
|-----------|------|-----|
| Auth real (código) | Sí | Sí |
| E2E UI_CONTRACT | **53/53 PASS** | parcial |
| E2E live multi-tenant | **No** (Docker down) | No |
| Tenant isolation (tests) | UNIT + static | — |
| Mocks silenciosos writes | Mitigado ADR-022 | BFF fail-closed |
| Lead scoring SSOT | **HTTP único** ADR-023 | — |
| Email prod | **No** SES | n/a |
| Billing | Sí si Stripe keys | n/a |
| Backups + restore drill | **No** drill | — |
| MCP / Router certificados | Sí (freeze) | — |
| Docs fieles | Sí 2026-07-17 | Sí |
| P0 externos documentados | SES, SNS, backup, Docker local | — |

## Bloqueos (owner / infra)

1. KI-013 SES dominio  
2. KI-014 SES sandbox  
3. KI-011 SNS  
4. Primer backup + **restore**  
5. **Docker Desktop local** para certificación live (KI-016)  
6. Secrets Stripe/OAuth por entorno  

## No declarar

- “NELVYON OS Y SAAS COMPLETADOS”  
- “100% producción” / “perfecto”  
- Playwright mockeado como “E2E live certificado”

Ver `OS_SAAS_FINAL_CERTIFICATION.md` · `OS_SAAS_E2E_MATRIX.md`.
