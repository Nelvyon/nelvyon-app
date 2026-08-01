# Estado biblioteca Envato — web pública

> Actualizado: **2026-08-01** · sin deploy a producción

## Estructura definitiva

```
.reference/envato-public-assets/          # descargas CEO (gitignored)
  _organized/<ID>/                        # canónico por ID + extract
apps/web/public/brand/public/library/     # publishable
  photos/F-01.webp|.avif|.jpg
  icons/I-01…I-05/*.svg
  mockups/<ID>.md                         # PSD-only note
  videos/                                 # (vacío hasta V-01…03)
  manifest.json
```

Pipeline: `node apps/web/scripts/organize-envato-library.mjs`

## Integrado ahora

| ID | Tipo | Uso web |
|----|------|---------|
| F-01 | Foto equipo | Home agencia, `/agencia`, contacto, catálogo `img.agency/hero/brand` |
| F-02 | Foto office tech | `/enterprise`, `/producto`, `/sectores`, cases, resources |
| I-01…I-05 | SVG packs | Iconos módulos/servicios/enterprise (`visualLibrary.ts`) |
| M-01,04,07,09 | PSD | Archivados; UI usa `DeviceMockup` CSS + `saas-shots` |

Pantallas de producto: **siempre** `/brand/public/saas-shots/*.webp`.

## Pendiente descarga CEO (P0 restante)

Fotos F-03…F-24 · Vídeos V-01…V-03 · Mockups M-02,03,05,06,08 · Iconos I-06  
Lista SSOT: `docs/ops/NELVYON_VISUAL_LIBRARY_ENVATO.md`

Al añadir archivos en `.reference/envato-public-assets/`, re-ejecutar el script organize e integrar.

## Revisión local

`http://127.0.0.1:3010` — **no deploy** hasta OK visual.
