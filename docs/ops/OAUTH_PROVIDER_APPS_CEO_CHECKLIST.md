# Checklist Daniel — Apps OAuth reales (Google / Meta / LinkedIn / Twilio)

> Hoy el framework OAuth multi-tenant (`backend/agency/OAuthMultiTenantFramework.ts`) usa
> **proveedores simulados (mock)** para los 4 servicios de abajo — genera tokens sintéticos,
> nunca hace una llamada HTTP real. Sirve para probar el ciclo completo (autorizar, rotar,
> revocar, reconectar, borrar) sin depender de cuentas reales. Este checklist es para cuando
> quieras conectar cuentas OAuth de verdad.

## Qué falta por proveedor

| # | Proveedor | Qué hace falta de ti |
|---|-----------|------------------------|
| 1 | **Google** | Proyecto en Google Cloud Console + pantalla de consentimiento OAuth verificada + credenciales (client ID/secret) |
| 2 | **Meta (Facebook/Instagram)** | App en Meta for Developers, revisión de permisos ("App Review") si se piden scopes avanzados |
| 3 | **LinkedIn** | App en LinkedIn Developer Portal + producto autorizado según el scope necesario |
| 4 | **Twilio** | Cuenta Twilio (ver también `docs/ops/TELEPHONY_PROVIDER_CEO_CHECKLIST.md` si es para llamadas) |

Para cada uno hace falta además:
- **Redirect URI** de producción registrado en la consola del proveedor (`https://app.nelvyon.com/...`).
- **Clave de cifrado real** (`NELVYON_OAUTH_MT_ENCRYPTION_KEY`, 64 caracteres hex) generada y
  guardada como secreto de producción — sin ella, el sistema se niega a arrancar en
  producción (fail-closed, nunca usa una clave débil por defecto).
- Confirmación de qué **scopes mínimos** necesita cada integración (ya definidos en código,
  revisar que sigan siendo los correctos antes de ir a producción).

## Qué pasa en el código mientras esto no esté

- Los 4 adaptadores (`GoogleMockOAuthProvider`, `MetaMockOAuthProvider`,
  `LinkedInMockOAuthProvider`, `TwilioMockOAuthProvider`) son simulados: generan tokens con
  prefijo `mock-...` y nunca contactan un servidor de autorización real.
- El resto del ciclo de vida (PKCE, estado CSRF de un solo uso, cifrado AES-256-GCM,
  aislamiento por tenant, rotación, revocación, reconexión, borrado, auditoría) sí es real y
  ya está probado — solo el intercambio de código por token está simulado.
- Sin `NELVYON_OAUTH_MT_ENCRYPTION_KEY` configurada, fuera de entorno de test el sistema
  lanza un error en vez de arrancar con una clave insegura por defecto.

## Próximo paso EXACTO

1. Decide qué proveedor(es) reales necesitas primero.
2. Crea las apps/proyectos correspondientes en cada consola (tabla de arriba).
3. Genera y guarda `NELVYON_OAUTH_MT_ENCRYPTION_KEY` como secreto de producción.
4. Avisa al equipo técnico con las credenciales — sustituirán el adaptador mock por uno real
   solo para el/los proveedores que confirmes, uno a la vez.
