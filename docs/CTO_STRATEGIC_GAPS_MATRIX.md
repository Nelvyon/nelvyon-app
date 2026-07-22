# CTO — Matriz de gaps estratégicos (honesta)

> **2026-07-22** · `claimReady: false`  
> Coste solo **"si se solicitara"** — no implica aprobación ni implementación.

| Área | IMPLEMENTADO | Evidencia | Coste si se solicitara | Decisión CEO |
|------|--------------|-----------|------------------------|--------------|
| **Mobile app nativa** | NO | Solo web responsive Next.js | Alto (iOS/Android + store + auth) | Pendiente — no fake app |
| **Marketplace público de packs** | PARCIAL | SaaS marketplace blueprints API + UI hub; no store multi-vendor público | Medio–Alto | Pendiente alcance comercial |
| **Integraciones breadth** | PARCIAL | Catálogo amplio 🟡; Stripe/SES ✅; OAuth ads/CRM muchos 🟡 | Medio (OAuth ops por provider) | Priorizar por cliente |
| **Cobertura sectorial OS** | PARCIAL | 20 sectores readiness + playbooks; betas no promote | Medio (cert E2E + contenido) | Promote solo con evidencia |
| **Escala multi-región** | NO | Single Railway region (sfo) + Postgres 16 | Alto (replicas/DR multi-region) | No urgente post-DNS |
| **IA privada en prod** | PREPARADO OFF | OllamaRuntimePrep · canaries · ADR-036/037 · mesh doc | 0 mesh Option A; GPU cloud = evitar | Staging canary batch |
| **Partner payouts** | PREPARADO OFF | Facade + calc + `NELVYON_CEO_PARTNER_PAYOUTS` | Bajo (flag) + compliance | OFF hasta CEO |
| **Campañas DB empresas** | BLOQUEADO_LEGAL | Controles técnicos GDPR/unsub/SES; checklist sin firma | Legal + ops | Firma legal |
| **Superioridad con clientes** | NO | Plataforma CONDITIONAL_READY técnica ≠ adopción | Comercial | Fuera de engineering alone |

## Lectura CTO

- **Plataforma lista técnicamente (condicional):** web/DNS/health/SQL SSOT/billing/email/portal P0 — sí, con flags IA/payouts OFF.  
- **Superioridad con clientes:** no — requiere legal campañas, IA staging (opcional), integraciones OAuth por cuenta, y go-to-market.

No inventar features. No declarar "perfecto".
