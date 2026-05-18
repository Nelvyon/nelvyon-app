# NELVYON Premium OS Standards — Fotografía de Producto v1

**Parent:** [`nelvyon_master_operations_v1.md`](./nelvyon_master_operations_v1.md)

## NAME

Fotografía de Producto Premium OS Standards for NELVYON v1 (client delivery checklist — **paperwork layer only**)

## Purpose

This **Fotografía Producto Premium** template is **OS-facing delivery paperwork**: statuses, evidence, **format badges** (pack_ecommerce, lifestyle, fondo_blanco, detalle, editorial, 360_product, still_life), and links — it does **not** connect DAM/CDN upload APIs, cloud storage, or automated image pipelines.

Suggested OS / workspace touchpoints for honest verification:

- `/os/video-multimedia-premium/preview` — when hero motion or B-roll overlaps stills  
- `/os/3d-inmersivo-premium/preview` — when CG + photo composites are in scope  
- `/os/web-premium/preview` — when web breakpoints and LCP targets bind to stills  
- `/app/branding` — palette, logo clear space, and packshot rules  
- `/help` — IP, model releases, or marketplace image policy escalations  

---

## Scope (minimum real)

- **Delivery discipline:** Shot list, aspect ratios, and marketplace vs editorial use documented before client sign-off.
- **Asset hygiene:** Naming, color space (e.g. sRGB vs Adobe RGB handoff), and revision rounds explicit — no silent “unlimited retouch”.
- **Performance honesty:** Web export dimensions and weight targets described without claiming automated CDN optimization from this surface.

---

## Limits (explicit non-goals)

- No S3/Cloudinary/Imgix or similar storage/CDN APIs from this template.
- Does not modify closed product fronts; does not open `/crm/deals`.
- No AI “magic upscaling” or rights-cleared stock guarantees from this OS surface alone.

---

## Premium checklist (product photography delivery)

| Area | Premium expectation |
| --- | --- |
| READY | Golden path / `pnpm gate` discipline when photo-related web surfaces ship in the same release train. |
| BRIEF & MOODBOARD | Creative brief, references, prop/styling notes — aligned with brand where applicable. |
| SESSION & DIRECTION | Lighting plan, set safety, capture checklist — honest about studio vs location. |
| SELECTION & EDITING | Culling criteria, crop rules, and client proofing rounds explicit. |
| RETOUCH & COLOR | Skin/product integrity, dust removal scope, and color match to physical samples. |
| WEB OPTIMIZATION | sRGB exports, dimensions per breakpoint, and agreed max file weight — no auto CDN. |
| DELIVERY | Folder structure, TIFF/JPEG/WebP naming, and checksums — storage outside NELVYON unless product says otherwise. |
| REPORTING | Channel performance claims limited to agreed definitions — template records expectations only. |

---

## Mini X‑EXEC

1. Open `/os/fotografia-producto-premium/preview` and walk deliverables for the demo project.  
2. Open `/os/video-multimedia-premium/preview` if motion deliverables overlap.  
3. Skim `/help` when model releases or marketplace policies are in scope.  
4. Run golden path (`/os/excellence/golden-path`) before closing the checklist.
