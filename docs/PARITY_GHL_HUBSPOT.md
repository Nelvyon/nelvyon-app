# Paridad Nelvyon SaaS vs GoHighLevel + HubSpot

> Referencia para cierre élite SaaS. Estado desde código `71fd2388+`.  
> Leyenda: ✅ paridad real | 🟡 UI+API, falta integración live | ❌ no existe | 🚫 oculto legacy

| Feature | GHL | HubSpot | Nelvyon ruta | Estado | Acción |
|---|---|---|---|---|---|
| CRM contactos | ✅ | ✅ | `/saas/crm` | ✅ | — |
| Pipeline / deals | ✅ | ✅ | `/saas/pipeline` | ✅ | — |
| Inbox unificado | ✅ | ✅ | `/saas/inbox` | ✅ | — |
| Email campañas | ✅ | ✅ | `/saas/campanias` | 🟡 | SES ops |
| SMS | ✅ | ✅ | `/saas/sms` | 🟡 | Twilio ops |
| WhatsApp | ✅ | 🟡 | `/saas/whatsapp` | 🟡 | Twilio ops |
| Workflows / automation | ✅ | ✅ | `/saas/workflows` | ✅ | Cron ops |
| Secuencias / drips | ✅ | ✅ | `/saas/secuencias` | 🟡 | SES ops |
| Formularios | ✅ | ✅ | `/saas/formularios` | ✅ | — |
| Funnels | ✅ | 🟡 | `/saas/funnels` | ✅ | — |
| Landing / web builder | ✅ | ✅ CMS | `/saas/web-builder` | ✅ | — |
| Calendario / citas | ✅ | ✅ | `/saas/calendar`, `/saas/citas` | 🟡 | GCal OAuth |
| Social planner | ✅ | ✅ | `/saas/social` | 🟡 | OAuth + banner degradado |
| Ads manager | ✅ | ✅ Ads | `/saas/publicidad` | 🟡 | OAuth + banner degradado |
| SEO | 🟡 | 🟡 | `/saas/seo` | ✅ | — |
| Reputación / reviews | ✅ | 🟡 | `/saas/reputacion` | ✅ | — |
| Helpdesk / tickets | ✅ | ✅ Service | `/saas/helpdesk` | ✅ | — |
| LMS / cursos | ✅ | ❌ | `/saas/lms` | ✅ | — |
| Tienda / products | ✅ | ❌ | `/saas/store` | ✅ | — |
| Afiliados | ✅ | ❌ | `/saas/affiliates` | ✅ | redirect `/saas/afiliados` |
| Loyalty | 🟡 | ❌ | `/saas/loyalty` | ✅ | — |
| Memberships | ✅ | ❌ | `/saas/memberships` | ✅ | sidebar + API |
| A/B testing | 🟡 | ✅ | `/saas/ab-testing` | ✅ | — |
| Encuestas / NPS | 🟡 | ✅ | `/saas/encuestas` | ✅ | — |
| QR codes | 🟡 | ❌ | `/saas/qr` | ✅ | — |
| Lead scoring | 🟡 | ✅ | `/saas/lead-scoring` | ✅ | — |
| Documentos / contratos | 🟡 | ✅ | `/saas/documentos` | ✅ | — |
| Facturas clientes | 🟡 | ✅ Quotes | `/saas/facturas` | ✅ | — |
| Snippets | 🟡 | ✅ | `/saas/snippets` | ✅ | — |
| Countdown timers | ✅ | ❌ | `/saas/countdown` | ✅ | — |
| Custom objects | 🟡 | ✅ | `/saas/objetos` | ✅ | — |
| Prospección | ✅ | ✅ | `/saas/prospecting` | ✅ | — |
| Comunidades | 🟡 | ❌ | `/saas/comunidades` | ✅ | — |
| Dialer | ✅ | ✅ | `/saas/dialer` | 🟡 | Twilio |
| Voice AI | 🟡 | ❌ | `/saas/voice` | 🟡 | ElevenLabs |
| Agentes IA | 🟡 | ✅ Breeze | `/saas/agentes` | ✅ | — |
| Chat IA | 🟡 | ✅ | `/saas/chat` | ✅ | — |
| Copywriter IA | 🟡 | ✅ | `/saas/copywriter` | ✅ | — |
| Reportes / analytics | ✅ | ✅ | `/saas/reportes` | ✅ | — |
| Integraciones hub | ✅ | ✅ | `/saas/integraciones` | ✅ | 13 live; OAuth manual |
| API keys | 🟡 | ✅ | `/saas/api-keys` | ✅ | — |
| Webhooks | ✅ | ✅ | `/saas/webhooks` | ✅ | — |
| White label | ✅ | ❌ | `/saas/white-label` | ✅ | — |
| Subcuentas agencia | ✅ | ❌ | `/saas/subcuentas` | 🟡 | Stripe Connect |
| Partner / wholesale | ✅ | ❌ | `/saas/partner` | ✅ | billing BFF fixed |
| Billing Stripe | ✅ | ✅ | `/saas/billing` | 🟡 | Stripe live |
| Team | ✅ | ✅ | `/saas/team` | ✅ | — |
| Compliance | 🟡 | 🟡 | `/saas/compliance` | ✅ | — |
| PWA install | 🟡 | ❌ | `/saas/pwa` | ✅ | — |
| Autopilot / AI ops | 🟡 | ❌ | `/saas/autopilot` | ✅ | — |
| Pack store OS | ❌ | ❌ | `/saas/packs` | ✅ | único Nelvyon |
| Playbooks | 🟡 | ✅ | `/saas/playbooks` | ✅ | — |
| Brief-to-launch | ❌ | ❌ | `/saas/brief-to-launch` | ✅ | único Nelvyon |

**Resumen paridad:** ~45 ✅/🟡 con código real vs GHL+HubSpot core; gaps principales = ops (SES/Twilio/Stripe/OAuth) + 13 conectores + publicación social/ads live.
