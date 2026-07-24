# Integrations Marketplace v1

> Código: `backend/agency/IntegrationsMarketplaceV1.ts` · Tests:
> `backend/agency/__tests__/IntegrationsMarketplaceV1.test.ts` · Catálogo OS v1.3

## Qué es

Un catálogo de integraciones versionado + ciclo de vida de instalación por tenant
(`install` → `healthcheck` → `upgrade` → `revoke` → `uninstall`), todo en memoria, con
auditoría. Es la base técnica para un futuro marketplace real; **v1 no publica ni instala
nada de terceros**.

## Qué incluye v1

- **Manifest**: `id` (formato `namespace.categoria.nombre`), `version` (semver estricto),
  `title`, `publisher` (solo `"nelvyon_internal"` permitido en v1), `scopes`, `permissions`,
  `healthcheckPath`.
- **Validación fail-closed**: `assertValidManifest()` rechaza cualquier manifest con
  publisher distinto de `nelvyon_internal`, id/versión mal formados, o scopes/permissions
  vacíos.
- **Catálogo en memoria + instalación por tenant**, con versionado (varias versiones del
  mismo `id` pueden convivir) y `upgrade()` explícito.
- **Una integración interna de referencia**: `nelvyon.internal.ping` — se instala y su
  healthcheck siempre responde `{ ok: true, detail: "pong" }`, sin dependencias externas.
- **Auditoría**: cada registro de manifest, instalación, upgrade, revoke, uninstall y
  healthcheck queda en un log consultable por tenant.
- **Aislamiento por tenant**: las instalaciones de un tenant son invisibles e
  inmodificables desde otro.

## Qué NO incluye v1 (explícitamente fuera de alcance)

- Publicación de integraciones de terceros — no hay flujo de submit/review externo.
- Llamadas HTTP reales a un healthcheck remoto — `healthcheckPath` es metadata declarativa;
  la ejecución real la hace el `handlers.healthcheck` registrado en código.
- Marketplace público o UI de descubrimiento — esto es la capa de dominio/backend únicamente.

## Próximo paso EXACTO

Si se necesita una integración interna adicional (p. ej. un webhook interno), registrar un
nuevo manifest con `publisher: "nelvyon_internal"` vía `registerIntegration()` y sus propios
tests — no se requiere ningún cambio de infraestructura para añadir integraciones internas.
