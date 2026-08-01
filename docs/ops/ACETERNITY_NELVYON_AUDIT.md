# Auditoría Aceternity UI → NELVYON (web pública)

> Fecha: **2026-08-01** · Fuente: [ui.aceternity.com/components](https://ui.aceternity.com/components)  
> **No instalar** hasta aprobación CEO. Canvas interactivo: `aceternity-nelvyon-audit.canvas.tsx`.

## Criterio de selección

Cada componente debe mejorar UX, percepción enterprise, storytelling, navegación, producto o conversión.  
Descartar automáticamente estética: startup barata · portfolio · experimental · demo · página de efectos · meteoros · auroras · partículas · neón · glow excesivo · fondos recargados.

**Stack:** Next.js 15 · React 19 · Tailwind **v4** (snippets Aceternity suelen ser v3 → retune) · Framer Motion.  
**Ya en repo (soft):** `SpotlightHero`, `SoftBeams`, `HoverDepthCard` + Timeline/Tabs/Bento propios.

---

## OBLIGATORIOS (7)

| Componente | Utilidad | Dif. | Visual | Perf. | A11y | TW4 | Merece | Dónde |
|---|---|---|---|---|---|---|---|---|
| Spotlight / Spotlight New (suave) | Atención hero | Baja | Alto sutil | Excelente | Buena + reduced-motion | Sí | Sí | Hero Home, `/producto`, Enterprise |
| Background Beams **soft** (no collision) | Profundidad fondo | Baja | Medio-alto | Buena si estático | aria-hidden | Sí | Sí | Héroes (ya SoftBeams) |
| Bento Grid | Catálogo módulos | Media | Alto | Excelente | Buena | Sí | Sí | `/producto`, Home, Automatizaciones |
| Timeline (+ Tracing Beam muy suave opcional) | Proceso / discovery | Media | Alto | Buena | Lista ordenada | Sí | Sí | Enterprise, módulos, Agencia, casos |
| Tabs | SaaS vs Agencia; features | Baja | Medio | Excelente | tab/tabpanel | Sí | Sí | Pricing, módulos, integraciones |
| Card Hover / Card Spotlight soft | Hover premium cards | Baja | Medio-alto | Excelente | No solo hover | Sí | Sí | Cards SaaS, sectores, recursos |
| Compare | Mock↔captura / SaaS↔Agencia | Media | Muy alto | Buena | Slider + teclado | Sí | Sí | Home, `/producto`, CRM, workflows |

---

## MUY RECOMENDABLES (11)

| Componente | Merece | Dónde exacto |
|---|---|---|
| Sticky Scroll Reveal | Sí | `/producto`, CRM, IA/Agentes, Automatizaciones |
| Container Scroll (sobrio) | Sí | Hero `/producto` (opcional Home) |
| Apple Cards Carousel / Carousel | Sí | Galería `saas-shots` Home + módulos |
| Focus Cards | Sí | Cards SaaS, Sectores, Agentes |
| Glowing Effect (border `#0084ff` soft) | Sí | CTA, plan featured Pricing, Enterprise |
| Moving Border (CTA lento, 1–2×) | Sí | Botón demo Hero / Pricing |
| Navbar Menu / Resizable Navbar | Sí | `PublicNav` global |
| Stateful Button | Sí | `/contacto` submit |
| Infinite Moving Cards (lento, pausable) | Sí | Integraciones / stack Home |
| Hero Highlight (texto) | Sí | Headline Home / Enterprise |
| Lens | Sí | Zoom captura CRM / pipeline / workflows |

**Techo sugerido tras OK:** integrar ≤5 de esta lista en la primera oleada.

---

## OPCIONALES (12)

Layout Grid / Expandable Cards · 3D Card (una sola) · Macbook Scroll · Animated Tooltip / Images Badge · Flip Words · Background Lines sutil · Grid/Dot (unificar DS) · Glare Card · Link Preview · Code Block · World Map (solo narrativa geográfica real) · Pro blocks FAQ/Pricing/CTA/Logo como **referencia de layout** (no branding Aceternity).

---

## DESCARTADOS (lista negra)

Meteors · Shooting Stars · Stars Background · Aurora · Vortex · Wavy · Noise · Dotted Glow · Beams With Collision · Sparkles · Background Boxes · Ripple · Gemini Effect · Cover space · Canvas Reveal/Text · Evervault · Encrypted Text · Text Reveal gimmick · Typewriter · Colourful/Squiggly/Flipping Board · ASCII/Dither/Webcam Pixel · 3D Marquee/Pin · Comet/Draggable/Wobble Card · Floating Dock · Notch · Keyboard · Terminal · GitHub/3D Globe (Three.js) · Hero Parallax circus · Parallax scroll grids · Animated Testimonials / Card Stack (sin testimonios reales) · Following Pointer · Magnetic Button · Pointer Highlight · Gooey Input · Placeholders Vanish · Lamp · SVG Mask agresivo · Hover Border Gradient agresivo · Background Gradient Animation · Sidebar Aceternity en marketing · Floating Navbar hide agresivo · Multi-step loader espectáculo · Shaders Pro · Illustrations kitschy · File Upload fancy.

---

## Mapa por superficie

| Superficie | Componentes |
|---|---|
| Hero | Spotlight soft · SoftBeams · Hero Highlight · (opc.) Container Scroll + captura |
| Integraciones | Infinite Moving lento · Focus Cards · Tabs |
| Cards SaaS | Bento · Card Hover/Spotlight · Focus Cards |
| CRM | Compare · Sticky Scroll + shot · Lens |
| Automatizaciones | Timeline · Sticky Scroll · Compare · Bento |
| Agentes IA | Focus Cards · Sticky Scroll · Card Spotlight (gobierno) |
| Enterprise | Timeline · Spotlight soft · Glowing CTA · Code Block opc. |
| Pricing | Tabs · Glowing plan · Moving Border CTA |
| FAQ | Accordion propio; Pro FAQ solo referencia |
| CTA | Moving Border · Stateful Button · Glowing |
| Footer | Sin efectos pesados |
| Blog / Recursos | Carousel · Layout Grid · Link Preview opc. |
| Sectores | Focus Cards · Card Hover · Timeline |
| Casos de uso | Expandable/Layout Grid · Timeline · Compare |

---

## Envato Elements (no descargar aún)

Ver también `docs/ops/ENVATO_PUBLIC_WEB_WISHLIST.md`. Mínimo mundial:

1. MacBook blank mockup — [enlace](https://elements.envato.com/graphics/macbook-pro-blank-screen-mockup) — Hero / producto  
2. iPhone blank mockup — [enlace](https://elements.envato.com/graphics/iphone-blank-screen-mockup) — mobile shots  
3. Team office daylight — [enlace](https://elements.envato.com/stock-photos/business-team-collaborating-modern-office) — Agencia  
4. Executive meeting glass — [enlace](https://elements.envato.com/stock-photos/executive-meeting-glass-office-screen) — Enterprise  
5. Office architecture white — [enlace](https://elements.envato.com/stock-photos/modern-office-interior-architecture-daylight) — Enterprise/Agencia  
6. Minimal line icons business — [enlace](https://elements.envato.com/graphics/minimal-line-icons-business) — iconboxes  
7. Soft geometric blue/gray — [enlace](https://elements.envato.com/graphics/abstract-geometric-shapes-soft-blue) — bandas  
8. Corporate collab video muted — [enlace](https://elements.envato.com/stock-video/business-team-office-collaboration) — Agencia opc.

---

## Próximo paso

CEO marca: (a) OBLIGATORIOS a implementar ya, (b) ≤5 MUY RECOMENDABLES, (c) Envato a descargar.  
Luego integrar · `prefers-reduced-motion` · sin deploy hasta OK visual.
