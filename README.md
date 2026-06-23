# NELVYON

Plataforma SaaS de marketing digital con **packs autónomos** (Local, Ecommerce, SaaS B2B, especializados y Analytics Insights). El producto está diseñado para que **tú operes clientes** sin depender de herramientas de desarrollo asistido en el día a día.

## Propiedad

- **Software propietario:** todo el código de este repositorio es propiedad de la empresa titular de NELVYON. Licencia privada — no distribuir ni sublicenciar sin autorización escrita.
- **Datos del cliente:** cada cliente es titular de sus datos y contenidos; NELVYON solo los trata para prestar el servicio (ver `/legal/terms` y `/legal/privacy`).

## Estructura del monorepo

| Ruta | Qué es |
|------|--------|
| `apps/web/` | **App principal** — Next.js 15, panel SaaS, OS packs, portal BFF, integraciones |
| `backend/` | API Python FastAPI (legacy/parcial) + agentes OS + integraciones compartidas |
| `scripts/` | Smokes de staging, preflight demo, utilidades operativas |
| `docs/` | Runbooks, smokes P0, checklist de lanzamiento |

Documentación técnica completa: **[TECH_HANDOFF.md](./TECH_HANDOFF.md)**

## Inicio rápido (desarrollo)

```bash
pnpm install
cp apps/web/.env.example apps/web/.env.local
# Rellena DATABASE_URL, JWT_SECRET, NEXT_PUBLIC_APP_URL

cd apps/web
pnpm dev
```

App local: `http://localhost:3000`

## Staging (operación demo / clientes piloto)

| Entorno | URL típica |
|---------|------------|
| Web staging | `https://ideal-victory-staging.up.railway.app` |
| API Python (si aplica) | Ver `backend/README.md` |

**Antes de cada demo o revisión con cliente:**

```bash
node scripts/staging-demo-preflight.mjs
```

Smokes P0 completos: `node scripts/run-staging-p0-smokes.mjs` — ver `docs/STAGING_P0_SMOKES.md`.

## Packs disponibles (demo)

Catálogo usuario: `/packs` · Kickoff operador: `/os/packs/*` · Informes: `/dashboard/*`

**Biblioteca de plantillas:** `apps/web/src/lib/template-library/` · **Flujo local + personalización:** `docs/templates/BIBLIOTECA_LOCAL_Y_FLUJO_PERSONALIZACION.md` · **Demos staging:** `/demo/pack-landing` · **Tabla descargas (3.500+ filas):** `docs/templates/ENVATO_ACETERNITY_DOWNLOADS_TABLE.md`

## Legal y onboarding

- Términos: `/legal/terms`
- Privacidad: `/legal/privacy`
- Índice legal: `/legal`
- Enlaces en footer marketing, registro (`/signup`) y paso 4 de onboarding SaaS

**Antes de facturar clientes reales:** revisa `docs/BEFORE_LAUNCH_CHECKLIST.md` con abogado e infra.

## Repositorio GitHub

Código en repositorio **privado**: `https://github.com/nelvyon/nelvyon-app` (rama `main`).

Antes del lunes, asegúrate de que todo lo importante está subido:

```bash
git remote -v          # debe apuntar a github.com/nelvyon/nelvyon-app.git
git status             # sin cambios críticos solo en local
git push origin main   # cuando estés listo
```

No subas `.env`, claves API ni `DATABASE_URL` con credenciales reales. Usa variables en Railway / Supabase.

## Soporte operativo (sin Cursor en flujo cliente)

| Acción | Dónde |
|--------|--------|
| Alta de cliente | `/signup` → onboarding `/saas/onboarding` |
| Lanzar pack | `/os/packs/<slug>` → 1 clic demo |
| Informe al cliente | `/dashboard/<pack>` + `/portal` |
| Preflight staging | `scripts/staging-demo-preflight.mjs` |
| Añadir pack nuevo | `TECH_HANDOFF.md` § Packs |

---

© NELVYON. Todos los derechos reservados.
