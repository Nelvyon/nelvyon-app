/**
 * Generates docs/templates/ENVATO_ACETERNITY_DOWNLOADS_TABLE.md
 * Run: pnpm --dir apps/web exec tsx ../../scripts/templates/generate-downloads-table.mts
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { GLOBAL_SECTORS } from "../../apps/web/src/lib/template-library/global-sectors.ts";
import {
  matchSeedForLayer,
  resolveRowLayer,
  SEED_DOWNLOAD_CATALOG,
} from "../../apps/web/src/lib/template-library/seed-download-catalog.ts";
import {
  DUAL_SERVICE_LINKS,
  OS_CAPABILITIES,
  OS_CAPABILITY_COUNT,
  SAAS_SERVICES,
  SAAS_SERVICE_COUNT,
} from "../../apps/web/src/lib/template-library/service-layers.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.resolve(__dirname, "../../docs/templates/ENVATO_ACETERNITY_DOWNLOADS_TABLE.md");

type Row = {
  layer: "saas" | "os" | "both";
  namespace: "saas" | "os";
  service_id: string;
  service_label: string;
  dual_ref?: string;
  sector: string;
  kind: string;
  provider: string;
  item_name: string;
  notes: string;
};

const rows: Row[] = [];
const seen = new Set<string>();

for (const sector of GLOBAL_SECTORS) {
  for (const svc of SAAS_SERVICES) {
    for (const kind of svc.kinds) {
      const seed = matchSeedForLayer("saas", sector.id, svc.id, kind);
      const layer = resolveRowLayer("saas", svc.id);
      const key = `saas|${layer}|${svc.id}|${sector.id}|${kind}|${seed.item_name}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({
        layer,
        namespace: "saas",
        service_id: svc.id,
        service_label: svc.label,
        dual_ref: svc.dual_os_id,
        sector: sector.id,
        kind,
        provider: seed.provider,
        item_name: seed.item_name,
        notes: `${seed.notes} | pack: ${seed.pack_ids} | lang: ${seed.lang} | sector_label: ${sector.label_en}`,
      });
    }
  }

  for (const cap of OS_CAPABILITIES) {
    for (const kind of cap.kinds) {
      const seed = matchSeedForLayer("os", sector.id, cap.id, kind);
      const layer = resolveRowLayer("os", cap.id);
      const key = `os|${layer}|${cap.id}|${sector.id}|${kind}|${seed.item_name}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({
        layer,
        namespace: "os",
        service_id: cap.id,
        service_label: cap.label,
        dual_ref: cap.dual_saas_id,
        sector: sector.id,
        kind,
        provider: seed.provider,
        item_name: seed.item_name,
        notes: `${seed.notes} | pack: ${seed.pack_ids} | lang: ${seed.lang} | sector_label: ${sector.label_en}`,
      });
    }
  }
}

const saasRows = rows.filter((r) => r.namespace === "saas").length;
const osRows = rows.filter((r) => r.namespace === "os").length;
const bothRows = rows.filter((r) => r.layer === "both").length;

const header = `# Tabla de descargas — Envato Elements + Aceternity UI Pro

> **Generado automáticamente** desde \`apps/web/src/lib/template-library/seed-download-catalog.ts\` + \`service-layers.ts\`  
> Regenerar: \`pnpm --dir apps/web exec tsx ../../scripts/templates/generate-downloads-table.mts\`  
> **Sectores:** ${GLOBAL_SECTORS.length} · **Filas totales:** ${rows.length} (SaaS: ${saasRows}, OS: ${osRows}, marcadas \`both\`: ${bothRows}) · **Seeds únicos:** ${SEED_DOWNLOAD_CATALOG.length}

## Capas de servicio (SaaS vs OS)

| Capa | Namespace | Entradas | Uso |
|------|-----------|----------|-----|
| **saas** | \`saasServiceTemplates\` | ${SAAS_SERVICE_COUNT} servicios cliente | Packs, SKUs comerciales, marketing site, features portal |
| **os** | \`osServiceTemplates\` | ${OS_CAPABILITY_COUNT} capacidades OS | Motores premium, builders, pipelines autónomos |
| **both** | enlace dual | ${DUAL_SERVICE_LINKS.length} pares | Mismo seed técnico; resolve por capa según caller |

**Regla:** packs SaaS → solo \`saasServiceTemplates\`. Procesos OS → solo \`osServiceTemplates\`. Seeds compartidos vía \`matchSeedForLayer\`.

### Enlaces dual (SaaS ↔ OS)

${DUAL_SERVICE_LINKS.map((l) => `- **${l.saas_label}** (\`${l.saas_id}\`) ↔ **${l.os_label}** (\`${l.os_id}\`)`).join("\n")}

---

## Fuentes permitidas (solo estas)

| Proveedor | Suscripción | Uso en Nelvyon |
|-----------|-------------|----------------|
| **Envato Elements** | elements.envato.com | Seed interno → bloques/composiciones \`nelvyon_native\` |
| **Aceternity UI Pro** | ui.aceternity.com / pro.aceternity.com | Seed React/Next → componentes \`components/pa\` + bloques |

**No usar:** MonsterONE, ThemeForest individual (salvo que el item esté también en Elements), ni redistribuir ZIP/HTML/assets tal cual.

---

## Cómo descargar de forma legal

1. **Suscripción activa** a Envato Elements y Aceternity UI Pro a nombre de la empresa.
2. **Descarga** cada item de esta tabla desde la biblioteca oficial (búsqueda por nombre exacto).
3. **Almacenamiento:** \`templates/seeds/envato/{sector}/{item-slug}/\` o \`templates/seeds/aceternity/{item-slug}/\` — **gitignored**.
4. **Conversión:** pipeline ingest → \`nelvyon_native\` en \`template-library/compositions/\`.
5. **Cliente:** solo composiciones Nelvyon; nunca el seed.

Licencias: \`apps/web/src/lib/template-library/license.ts\`

---

## Catálogo único de items (referencia rápida)

### Aceternity UI Pro (${SEED_DOWNLOAD_CATALOG.filter((s) => s.provider === "Aceternity").length} items)

${[...new Set(SEED_DOWNLOAD_CATALOG.filter((s) => s.provider === "Aceternity").map((s) => s.item_name))].map((n) => `- ${n}`).join("\n")}

### Envato Elements (${SEED_DOWNLOAD_CATALOG.filter((s) => s.provider === "EnvatoElements").length} items)

${[...new Set(SEED_DOWNLOAD_CATALOG.filter((s) => s.provider === "EnvatoElements").map((s) => s.item_name))].map((n) => `- ${n}`).join("\n")}

---

## Matriz completa layer × service × sector × kind

| layer | namespace | service_id | service_label | dual_ref | sector | kind | provider | item_name | notes |
|-------|-----------|------------|---------------|----------|--------|------|----------|-----------|-------|
`;

const body = rows
  .map((r) => {
    const esc = (s: string) => s.replace(/\|/g, "\\|").replace(/\n/g, " ");
    return `| ${r.layer} | ${r.namespace} | ${esc(r.service_id)} | ${esc(r.service_label)} | ${esc(r.dual_ref ?? "")} | ${esc(r.sector)} | ${esc(r.kind)} | ${esc(r.provider)} | ${esc(r.item_name)} | ${esc(r.notes)} |`;
  })
  .join("\n");

const footer = `

---

## SaaS services (${SAAS_SERVICE_COUNT})

| id | label | origin | pack_id / sku | dual_os_id | kinds |
|----|-------|--------|---------------|------------|-------|
${SAAS_SERVICES.map((s) => `| ${s.id} | ${s.label} | ${s.origin} | ${s.pack_id ?? s.sku ?? "—"} | ${s.dual_os_id ?? "—"} | ${s.kinds.join(", ")} |`).join("\n")}

---

## OS capabilities (${OS_CAPABILITY_COUNT})

| id | label | os_premium_id | dual_saas_id | kinds |
|----|-------|---------------|--------------|-------|
${OS_CAPABILITIES.map((c) => `| ${c.id} | ${c.label} | ${c.os_premium_id ?? "—"} | ${c.dual_saas_id ?? "—"} | ${c.kinds.join(", ")} |`).join("\n")}

---

## Sectores globales (${GLOBAL_SECTORS.length})

| sector_id | label_en | label_es | vertical |
|-----------|----------|----------|----------|
${GLOBAL_SECTORS.map((s) => `| ${s.id} | ${s.label_en} | ${s.label_es} | ${s.vertical} |`).join("\n")}

---

*Última generación: ${new Date().toISOString().slice(0, 10)}*
`;

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, header + body + footer, "utf8");
console.log(`Wrote ${rows.length} rows (${saasRows} saas + ${osRows} os) to ${outPath}`);
