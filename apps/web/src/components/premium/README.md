# Biblioteca premium NELVYON

Componentes adaptados (estilo Aceternity / enterprise) para NELVYON y webs de clientes.

## Aprobados

| Componente | Archivo | Uso previsto |
|------------|---------|--------------|
| Logo Cloud Marquee | `logo-cloud-marquee.tsx` | Home, integraciones, clientes SaaS |
| Macbook Scroll | `macbook-scroll.tsx` | `/saas` — capturas reales del producto |
| Bento Grid | `bento-grid.tsx` | `/saas`, `/servicios`, sectores |
| Card Hover Effect | `card-hover-effect.tsx` | Servicios, SaaS, sectores |

## No aprobados

Text Hover Effect, Orbit, Meteors, Sparkles, Lamp, Floating Logos, Vortex, Background Beams excesivos, efectos demo.

## Reglas

- Sin textos demo, logos de clientes falsos, testimonios ni métricas inventadas.
- Sin imágenes IA ni dashboards ficticios.
- Paleta: `#020817`, `#0084FF`, blanco.

## Ejemplo

```tsx
import { LogoCloudMarquee, NELVYON_INTEGRATION_LOGOS } from "@/components/premium";

<LogoCloudMarquee
  title="Conecta tus herramientas en un solo sistema"
  subtitle="..."
  logos={NELVYON_INTEGRATION_LOGOS}
/>
```
