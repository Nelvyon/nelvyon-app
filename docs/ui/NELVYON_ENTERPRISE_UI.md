# Nelvyon Enterprise UI

Documentación del sistema visual oficial del **producto Nelvyon** (marketing site + app autenticada).  
No confundir con las plantillas que entregamos a **clientes finales** vía packs — esas viven en la misma biblioteca curada pero con namespace SaaS/OS separado.

---

## ¿Había plantilla base interna dedicada?

**Antes (commit `564e674`):** la UI enterprise se implementó en React/Tailwind **sin registrar** una seed oficial. Tomaba inspiración genérica de Aceternity (hero 3D, glass cards) y tokens de marca Nelvyon, pero **no** estaba cableada a la biblioteca curada.

**Ahora:** existe una **plantilla base interna dedicada** registrada en código:

| Campo | Valor |
|-------|--------|
| **Seed ID** | `aceternity-simplistic-saas` |
| **Nombre catálogo** | Simplistic SaaS Template |
| **Proveedor** | Aceternity UI Pro (score 95) |
| **Ruta seed** | `templates/seeds/aceternity/simplistic-saas-template/` |
| **Registro TS** | `apps/web/src/lib/template-library/platform-ui-seed.ts` |
| **Manifest** | `apps/web/src/lib/template-library/ingest/aceternity-manifest.ts` → `status: ported_partial` |

### Por qué Simplistic SaaS

Entre las 14 seeds Aceternity de máxima calidad, **Simplistic SaaS** es la más alineada con un producto B2B premium:

- Hero con badge animado + CTA dual + **product frame** (preview tipo Mac del dashboard).
- Jerarquía tipográfica `display` con `tracking-tight` y peso semibold (no “landing genérica”).
- Grid de features, pricing three-tier, trust bar — mismos bloques que ya usamos en landing y dashboard.
- Página de login nativa en la seed → base para `/login` y `/register`.

Alternativas descartadas para la UI del **propio** Nelvyon:

| Seed | Motivo de descarte |
|------|-------------------|
| Foxtrot / Productized Agency | Orientadas a agencia marketing; el PA legacy ya las usaba en rutas secundarias |
| AI SaaS | Multipágina genérica; menos cohesión dashboard + marketing |
| Envato SaaS HTML | Seeds para **entregables cliente**, no para shell interno del OS |

---

## Bloques portados (seed → React nativo)

| Bloque seed | Implementación Nelvyon |
|-------------|----------------------|
| `hero:gradient-badge-cta` | `NelvyonEnterpriseHomePage` + `NelvyonEnterpriseBadge` |
| `hero:product-frame-preview` | `NelvyonProductFrame` |
| `features:icon-grid-glass` | Secciones servicios / arquitectura dual (`nv-enterprise-glass`) |
| `pricing:three-tier-highlight` | `NelvyonHomePage` planes |
| `auth:split-panel-card` | `AuthLayout` + `LoginForm` |
| `dashboard:sidebar-navy-glass` | `AppShell` + `nelvyon-enterprise.css` |
| `typography:display-tight-tracking` | `NelvyonEnterpriseHeading` |
| `motion:badge-hover-stagger` | Framer Motion en badge, product frame, `FadeUp` |

**Importante:** no servimos ZIP, HTML ni assets remotos de Aceternity. Solo patrones de diseño reimplementados en componentes propios.

---

## Decisiones “empresa multimillonaria”

1. **Jerarquía tipográfica única** — Display 7xl semibold con tracking negativo; subtítulos en zinc muted; eyebrows en caps con letter-spacing amplio (`nv-enterprise-eyebrow`).
2. **Color system dual** — Marketing oscuro `#050505` + electric `#0066FF`; app autenticada navy `#07122a` + accent `#0084ff` (misma familia, distinta luminosidad).
3. **Product frame en landing** — Preview del dashboard real (sidebar + hero + KPIs) flotando suavemente; transmite “producto ya construido”, no mockup vacío.
4. **Glass + grid sutil** — Cards `nv-enterprise-glass`, fondos con grid 64px y radial glow; sensación de profundidad sin ruido visual.
5. **Sidebar enterprise** — Gradiente vertical navy, item activo con glow pulsante, wordmark con gradiente; badge **Enterprise** en topbar.
6. **Dashboard hero operativo** — “Centro de operaciones” + stat pills (SLA, packs, 24/7) antes del launchpad.
7. **Motion con respeto a `prefers-reduced-motion`** — Float del product frame y glow del sidebar desactivables.
8. **Trazabilidad** — Atributo `data-platform-ui-seed="aceternity-simplistic-saas"` en shell marketing, auth y app.

---

## Consistencia marketing ↔ app

```
nelvyon-enterprise.css          ← tokens compartidos
        │
        ├── nelvyon-enterprise-theme   → /, NelvyonShell, AuthLayout
        └── nelvyon-enterprise-app     → AppShell, /dashboard
                │
                └── nelvyon-enterprise/   ← primitivos portados de Simplistic SaaS
                        ├── NelvyonEnterpriseHeading
                        ├── NelvyonEnterpriseBadge
                        └── NelvyonProductFrame
```

| Superficie | Ruta | Shell | Seed attr |
|------------|------|-------|-----------|
| Landing | `/` | `NelvyonShell` | ✓ |
| Login | `/login` | `AuthLayout` | ✓ |
| Registro | `/register` | `AuthLayout` | ✓ |
| Dashboard | `/dashboard` | `AppShell` | ✓ |

Otras rutas marketing (`/pricing`, `/servicios`, …) mantienen chrome PA legacy vía `MarketingChrome`; solo la home usa la plantilla platform completa.

---

## Archivos clave

```
apps/web/src/lib/template-library/platform-ui-seed.ts
apps/web/src/components/nelvyon-enterprise/
apps/web/src/styles/nelvyon-enterprise.css
apps/web/src/components/nelvyon-site/NelvyonEnterpriseHomePage.tsx
apps/web/src/components/nelvyon-site/AuthLayout.tsx
apps/web/src/core/shell/AppShell.tsx
apps/web/src/features/dashboard/components/EnterpriseDashboardHero.tsx
```

---

## Staging

Tras deploy de `main`:

- https://ideal-victory-staging.up.railway.app/
- https://ideal-victory-staging.up.railway.app/login
- https://ideal-victory-staging.up.railway.app/dashboard

Verificar en DevTools: `document.querySelector('[data-platform-ui-seed]')?.dataset.platformUiSeed` → `aceternity-simplistic-saas`.

---

## Frase demo (interfaz del producto)

> **“La propia interfaz de Nelvyon está construida con el mismo estándar visual que exigimos en un SaaS enterprise: preview del producto en la landing, consola navy en el panel y una sola línea de diseño de la home al dashboard.”**

Variante corta:

> **“No vendemos una plantilla genérica: la UI de Nelvyon refleja un producto de escala — landing, login y panel comparten el mismo sistema visual premium.”**

---

*Última actualización: 2026-06-18*
