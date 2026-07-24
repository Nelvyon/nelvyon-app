# Social Publish OAuth — CEO Checklist

> Capability: `community_publish_core` · Module: `backend/agency/CommunityPublishCore.ts`
> Catálogo OS v1.3.0 · Status: `PREPARED_OFF`

## Estado actual (honesto)

`CommunityPublishCore` implementa el **núcleo** de publish/community management:

- Content inbox (`addToContentInbox` / `decideContentInboxItem`) con estado
  `pending_review` → `approved`/`rejected`.
- Calendario editorial (`buildEditorialCalendar`) por plataforma.
- Workflow de aprobación (`evaluateApprovalWorkflow`) — CEO siempre requerido; cliente
  requerido cuando el contenido lo exige.
- Variantes por red (`buildNetworkVariants`) — captions y hashtags ajustados a los límites
  reales de cada plataforma.
- Cola de publicación (`enqueuePublishItem`) y moderación con escalado a humano
  (`classifyModerationEvent`) — quejas y contenido legal-sensible **siempre** escalan.
- Placeholders de métricas (`buildMetricsPlaceholders`) — `reach`/`engagement` siempre
  `null` hasta que exista publish real autorizado.
- Plan de rollback (`COMMUNITY_PUBLISH_ROLLBACK_PLAN`) y audit trail completo
  (`listAuditLog`).

`SimulatorPublishProvider` es el **único** proveedor de publish implementado. No hace
ninguna llamada de red; `publish()` solo devuelve un registro simulado
(`{ ok: true, simulated: true, providerId: "simulator" }`). No existe ningún otro
proveedor en este código — nada puede publicar de verdad ni enviar un DM real.

`assertPublishDisabled()` devuelve `disabled: true` (bloqueado) salvo que **ambos**
`oauthConnected` y `ceoApproved` sean explícitamente `true` (ambos son `false` por
defecto). Incluso cuando el gate se abre, `enqueuePublishItem` solo enruta hacia el
simulador — abrir el gate nunca activa un proveedor real porque no existe ninguno.

## Antes de publicar contenido real en cualquier red

1. **CEO** aprueba explícitamente, cuenta por cuenta, qué red se conecta primero (ver
   `docs/ops/NELVYON_OFFICIAL_SOCIAL_CEO_CHECKLIST.md` para el caso de cuentas oficiales
   NELVYON; para clientes SaaS, aprobación equivalente por escrito).
2. Conectar OAuth real de la plataforma correspondiente — credenciales en variables de
   entorno, nunca hardcodeadas.
3. Implementar un proveedor real (p. ej. `InstagramGraphPublishProvider`) que sustituya —
   nunca complemente silenciosamente — a `SimulatorPublishProvider` para esa plataforma
   específica, manteniendo el resto en simulador hasta su propia autorización.
4. Publicación de prueba única, con aprobación explícita del CEO/cliente antes de cualquier
   publicación adicional (mismo patrón que `attemptNelvyonManualPublish` en
   `NelvyonOfficialSocialOps.ts`).
5. Evidencia de staging E2E demostrando que `assertPublishDisabled` bloquea por defecto y
   que el audit log registra cada intento, antes de promover `community_publish_core` a
   `IMPLEMENTED_VERIFIED` en `backend/agency/OsCatalogV1.ts`.
6. Mensajes masivos (mass DM) permanecen prohibidos sin excepción — no forman parte de
   este roadmap.

## Tests

`backend/agency/__tests__/CommunityPublishCore.test.ts` — cubre inbox/calendario/
aprobación/variantes/cola/simulador/moderación/métricas placeholder/rollback/integridad.

## Forbidden

Publish real sin este checklist · mass DM · OpenAI · Pepito DB
