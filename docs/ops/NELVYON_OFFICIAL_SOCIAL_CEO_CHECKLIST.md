# CEO checklist — Redes sociales oficiales NELVYON (staging only)

> **Estado:** **PENDING_CEO** en las 8 cuentas · `publish_authorized: false` · `oauth: OFF` ·
> `paid: PREPARED_OFF` · `mass_dm: FORBIDDEN` — todo el paquete es 100% estrategia/preparación,
> **cero publicación, cero gasto, cero OAuth conectado**.
>
> Fuente de verdad en código: `backend/agency/NelvyonOfficialSocialPrep.ts`
> (`buildNelvyonOfficialSocialPackage()` + `listNelvyonSocialAccountsChecklist()`).
> Tests: `backend/agency/__tests__/NelvyonOfficialSocialPrep.test.ts`.

## Qué hace este módulo (y qué NO hace)

- Genera estrategia mensual, calendario 30 días, formatos por plataforma, copies (2 variantes),
  storyboard, rúbrica QA élite y plan de analítica — reutilizando el mismo motor que usamos para
  clientes (`OsSocialNetworksService`).
- **No** publica nada, **no** conecta ningún OAuth, **no** activa paid social, **no** envía DM masivos.
- **No** contiene secretos reales — solo nombres de variables de entorno que existirán el día que
  el CEO conecte cada cuenta.

## Las 8 cuentas que Daniel debe crear/conectar

Cada fila es un bloqueo independiente: mientras no se complete, esa red permanece `PENDING_CEO`
y el publish/OAuth de esa red seguirá `OFF` sin excepción.

| # | Red | Qué crear (click a click, resumen) | Variables de entorno (nombres, sin valores) |
|---|-----|-------------------------------------|----------------------------------------------|
| 1 | **TikTok** | Crear cuenta TikTok Business a nombre de NELVYON con email corporativo → verificar teléfono → activar TikTok for Business Suite → (más adelante) registrar app en TikTok for Developers. | `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`, `TIKTOK_ACCESS_TOKEN` |
| 2 | **Instagram Business** | Crear/convertir el perfil de Instagram a cuenta Business → vincularlo a la Facebook Page de NELVYON (ver #3) → en Meta for Developers, crear la app y habilitar Instagram Graph API. | `META_APP_ID`, `META_APP_SECRET`, `META_PAGE_ACCESS_TOKEN`, `IG_BUSINESS_ACCOUNT_ID` |
| 3 | **Facebook Page** | Crear la Facebook Page oficial "NELVYON" en Meta Business Suite → asignar a Daniel como admin → vincular con Instagram Business (#2). | `META_APP_ID`, `META_APP_SECRET`, `META_PAGE_ACCESS_TOKEN`, `FB_PAGE_ID` |
| 4 | **YouTube** | Crear canal de YouTube con la cuenta de Google Workspace corporativa de NELVYON → en Google Cloud Console, crear proyecto y habilitar "YouTube Data API v3" → configurar consent screen OAuth. | `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, `YOUTUBE_REFRESH_TOKEN`, `YOUTUBE_CHANNEL_ID` |
| 5 | **LinkedIn Company** | Crear página de empresa "NELVYON" en LinkedIn → verificar el dominio `nelvyon.com` (registro DNS) → registrar app en LinkedIn Developer Portal y solicitar acceso a Marketing Developer Platform (requiere revisión de LinkedIn). | `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`, `LINKEDIN_ACCESS_TOKEN`, `LINKEDIN_ORG_URN` |
| 6 | **X (Twitter)** | Crear cuenta `@nelvyon` en X → solicitar acceso de desarrollador (X API v2, plan de pago según volumen) → crear proyecto/app en el portal de desarrolladores. | `X_API_KEY`, `X_API_SECRET`, `X_ACCESS_TOKEN`, `X_ACCESS_TOKEN_SECRET` |
| 7 | **Pinterest Business** | Convertir/crear cuenta Pinterest Business → verificar el dominio `nelvyon.com` → registrar app en Pinterest Developers. | `PINTEREST_APP_ID`, `PINTEREST_APP_SECRET`, `PINTEREST_ACCESS_TOKEN` |
| 8 | **Google Business Profile** | Crear/reclamar ficha de Google Business Profile para NELVYON (categoría "servicio a domicilio"/remoto) → verificar la ficha (correo o vídeo según Google) → habilitar la Google Business Profile API en Google Cloud Console. | `GBP_CLIENT_ID`, `GBP_CLIENT_SECRET`, `GBP_REFRESH_TOKEN`, `GBP_ACCOUNT_ID`, `GBP_LOCATION_ID` |

## Qué queda bloqueado hasta que el CEO complete cada cuenta

- **OAuth**: ninguna de las 8 integraciones se conecta en código hasta que las credenciales existan
  como variables de entorno reales en Railway (nunca en el repo) **y** el CEO autorice explícitamente
  la activación (`oauth_status` pasa de `OFF` a un flag específico por red, todavía por definir).
- **Publish**: `publish_authorized` permanece `false` en el paquete hasta que exista aprobación
  explícita del CEO por cada pieza de contenido — igual que en el flujo de clientes
  (`assertSocialPublishAuthorized`).
- **Paid social**: `paid_social_status` permanece `PREPARED_OFF` — ningún euro se gasta sin
  presupuesto CEO explícito y cuenta publicitaria conectada.
- **Mass DM**: prohibido en todas las redes, sin excepción ni flag de activación.

## Cómo verificar el estado (sin credenciales, sin red)

```bash
pnpm -C apps/web exec vitest run backend/agency/__tests__/NelvyonOfficialSocialPrep.test.ts --reporter=dot
```

## Próximo paso EXACTO

1. CEO abre/reclama las 8 cuentas de la tabla anterior (fuera de este repo).
2. CEO añade las variables de entorno reales en Railway (staging) — **nunca** en el código ni en
   docs.
3. Se solicita una autorización CEO explícita, red por red, antes de activar cualquier OAuth real.
4. Publicación y paid social permanecen bloqueados hasta esa autorización explícita adicional.
