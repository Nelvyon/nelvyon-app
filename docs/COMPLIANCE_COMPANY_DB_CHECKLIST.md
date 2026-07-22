# Checklist — Base de empresas / marketing (software only)

> **No es dictamen legal.** No enviar campañas desde este checklist.  
> Requiere revisión legal competente (RGPD/LSSI) antes de cualquier contacto masivo.

## Software ya existente (referencia)

| Capacidad | Ubicación |
|-----------|-----------|
| GDPR subject rights SaaS | `SaasGdprService` · `/api/saas/compliance/gdpr` |
| Unsubscribe campañas | `/api/saas/campanias/unsubscribe` |
| Suppressions / bounce | SES webhook · `SaasDeliverabilityService` |
| Cookie consent UI | `CookieBanner` · `cookieConsent.ts` |

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
