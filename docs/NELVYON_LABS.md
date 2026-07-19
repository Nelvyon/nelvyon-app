# NELVYON-LABS — Laboratorio tecnológico

> **Independiente de `nelvyon-app/`** — copias locales de referencia OSS.  
> **No integrar** en código producto hasta decisión explícita.  
> **Estado:** cerrado 2026-07-15 — `failed=0`, `integrity_failed=0`, `pending=0`

## Documentación oficial del laboratorio

| Documento | Contenido |
|---|---|
| [`NELVYON_LABS_SUMMARY.md`](./NELVYON_LABS_SUMMARY.md) | Totales, licencias, conteos por categoría |
| [`NELVYON_LABS_MASTER_TABLE.md`](./NELVYON_LABS_MASTER_TABLE.md) | **Tabla maestra completa** (todos los proyectos) |
| [`NELVYON_LABS_BY_CATEGORY.md`](./NELVYON_LABS_BY_CATEGORY.md) | Misma tabla agrupada por categoría |

Regenerar: `node scripts/generate-nelvyon-labs-docs.mjs`

---

## Ubicación

```
C:\Proyectos\Nelvyon\NELVYON-LABS\
├── README.md
├── inventory.json       # inventario machine-readable
├── INVENTORY.md         # inventario humano
├── REPLACEMENTS.json    # sustituciones + descartes justificados
├── download.log / reconcile.log
├── ai/ agents/ mcp/ rag/ …
```

---

## Estado final (2026-07-15)

| Métrica | Valor |
|---|---|
| Entradas catálogo (incl. alias) | **461** |
| URLs únicas planificadas | **451** |
| ✅ OK | **459** |
| 🔄 Sustituidos | **10** (documentados) |
| ⛔ Descartados Windows | **2** (searxng, blender) |
| ❌ Clone failed | **0** |
| ⚠️ Integridad failed | **0** |
| ⏳ Pendientes | **0** |
| Espacio en disco | **~50,54 GB** |
| Integrado en `nelvyon-app` | **No** |

### Sustituciones

Ver `C:\Proyectos\Nelvyon\NELVYON-LABS\REPLACEMENTS.json`:

| ID | Original → Sustituto |
|---|---|
| garage | deuxfleurs/garage → deuxfleurs-org/garage |
| keila | we-promise/keila → pentacent/keila |
| list-unsubscribe-header | michaelherman/… → PHPMailer/PHPMailer |
| serposcope | serph-hq → serphacker/serposcope (legacy MIT) |
| cohere-rerank | cross-encoder modelo → huggingface/sentence-transformers |
| aceternity-ui | aceternity-ui/components → shadcn-ui/ui |
| wundergraph | wundergraph → wundergraph/cosmo |
| coolors-pattern | color-hunt-api → nordtheme/nord |
| logo-squid | logoipsum → srmullen/svelte-logoipsum |
| chromedriver | ChromeDriver → GoogleChromeLabs/chrome-for-testing |

### Descartes justificados (plataforma Windows)

| ID | Motivo | Mitigación |
|---|---|---|
| **searxng** | Path NTFS inválido (`:` en nombre de archivo) | Docker `searxng/searxng` o Linux/WSL |
| **blender** | Checkout parcial + EPERM al borrar | Binarios oficiales / clone en Linux |

### Licencias (OK)

Detectadas principalmente: MIT, Apache-2.0, AGPL/GPL/LGPL, MPL, BSD, ISC, PostgreSQL.  
`licenseMatch`: ~368 match · ~79 review · ~12 unknown (sin LICENSE legible; catálogo conserva SPDX esperado).

---

## Origen de datos

Catálogo: `docs/master-open-source-catalog.json`  
**Incluidos:** `integrar_ahora` · `integrar_mas_adelante` · `solo_laboratorio`  
**Excluidos:** `descartar`

---

## Comandos

```powershell
cd C:\Proyectos\Nelvyon\nelvyon-app

# Setup inicial / resume
node scripts/setup-nelvyon-labs.mjs --resume

# Reconciliación completa (dedupe + sustituciones + inventario)
node scripts/reconcile-nelvyon-labs.mjs
```

---

## Reglas

1. **No modificar** código del laboratorio para producto NELVYON  
2. **No mezclar** con `nelvyon-app/`  
3. Re-ejecutar reconcile tras cambios de catálogo  
4. Router soak / Ollama / Docker **no** deben tocarse desde scripts Labs  
