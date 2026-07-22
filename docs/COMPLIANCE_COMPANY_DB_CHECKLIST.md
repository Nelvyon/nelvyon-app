# Checklist — Base de empresas / marketing (software only)

> **No es dictamen legal.** No enviar campañas desde este checklist.  
> Requiere revisión legal competente (RGPD/LSSI) antes de cualquier contacto masivo.

## Software ya existente (referencia)

| Capacidad | Ubicación | Estado técnico |
|-----------|-----------|----------------|
| GDPR subject rights SaaS | `SaasGdprService` · `/api/saas/compliance/gdpr` | Controles de código presentes |
| Unsubscribe campañas | `/api/saas/campanias/unsubscribe` | Controles de código presentes |
| Suppressions / bounce | SES webhook · `SaasDeliverabilityService` | Controles de código presentes |
| Cookie consent UI | `CookieBanner` · `cookieConsent.ts` | Controles de código presentes |
| Audit / límites envío | Campañas + deliverability services | Controles de código presentes |
| Trazabilidad bajas | GDPR + unsubscribe paths | Controles de código presentes |

> Completar controles técnicos ≠ cumplimiento legal. No afirmar RGPD/LSSI “cumplido”.

## Checklist CEO antes de campaña

- [ ] Fuente de datos documentada (licencia / consentimiento / interés legítimo asesorado)  
- [ ] Finalidad explícita y registro de tratamiento  
- [ ] Base legal revisada por abogado  
- [ ] Lista de exclusión / unsubscribe operativa y testeada  
- [ ] Límites de envío SES / reputación  
- [ ] Evidencia de opt-out almacenada  
- [ ] **Prohibido** scrape de bases propietarias sin licencia  
- [ ] **Prohibido** activar envío masivo desde Cursor sin OK legal + CEO  

## Bloqueo

**BLOQUEADO_LEGAL:** no campañas ni automatización de contacto masivo hasta checklist firmada por CEO + asesoría legal.
