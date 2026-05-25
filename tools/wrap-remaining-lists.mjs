import fs from "fs";
import path from "path";

const ROOT = path.join(
  "c:/Users/Asus/Downloads/app_v181/apps/web/src/app/dashboard",
);

/** rel -> { items, title, desc, action?, onAction?, skeleton?, startMarker } */
const PAGES = {
  "crm/page.tsx": { items: "contacts", title: "Sin contactos", desc: "Añade tu primer contacto al CRM.", action: "Nuevo contacto", onAction: "setContactModal(true)", marker: 'tab === "contactos"' },
  "cursos/page.tsx": { items: "courses", title: "Sin cursos", desc: "Publica tu primer curso online.", action: "Nuevo curso", onAction: "setModal(true)", marker: '<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"' },
  "webinars/page.tsx": { items: "items", title: "Sin webinars", desc: "Programa tu primer evento en vivo.", action: "Nuevo webinar", onAction: "setModal(true)", marker: '<div className="grid gap-4' },
  "social-monitoring/page.tsx": { items: "mentions", title: "Sin menciones", desc: "Configura alertas para empezar a monitorizar.", action: "Nueva alerta", onAction: "setModal(true)", marker: '<div className="space-y-3">' },
  "social-scheduler/page.tsx": { items: "posts", title: "Sin publicaciones", desc: "Programa contenido en redes sociales.", action: "Nueva publicación", onAction: "setModal(true)", marker: '<div className="space-y-3">' },
  "ab-testing/page.tsx": { items: "experiments", title: "Sin experimentos", desc: "Crea tu primer test A/B.", action: "Nuevo experimento", onAction: "setModal(true)", marker: '<div className="grid gap-4' },
  "sms/page.tsx": { items: "messages", title: "Sin mensajes", desc: "Envía tu primera campaña SMS.", skeleton: "SkeletonTable", marker: '<div className="overflow-x-auto rounded' },
  "reportes/page.tsx": { items: "reports", title: "Sin informes", desc: "Genera informes de rendimiento.", marker: '<div className="space-y-3"' },
  "calendario/page.tsx": { items: "events", title: "Sin eventos", desc: "Añade eventos a tu calendario.", action: "Nuevo evento", onAction: "setModal(true)", marker: '<div className="space-y-2"' },
  "seo/page.tsx": { items: "audits", title: "Sin auditorías", desc: "Ejecuta tu primera auditoría SEO.", marker: '<div className="space-y-3"' },
  "history/page.tsx": { items: "entries", title: "Sin historial", desc: "Las acciones recientes se registrarán aquí.", marker: '<ul className="space-y-2"' },
  "live-chat/page.tsx": { items: "sessions", title: "Sin conversaciones", desc: "Las conversaciones en vivo aparecerán aquí.", marker: '<div className="space-y-3"' },
  "settings/page.tsx": { items: "items", title: "Sin datos", desc: "Cargando configuración…", skipEmpty: true, marker: null },
  "qr/page.tsx": { items: "items", title: "Sin códigos QR", desc: "Genera QR estáticos o dinámicos.", action: "QR dinámico", onAction: "setDynamicModal(true)", marker: '<div className="rounded-lg border p-4">\n            <h2 className="mb-3 font-semibold">QRs dinámicos</h2>' },
  "formularios/page.tsx": { items: "items", title: "Sin formularios", desc: "Crea tu primer formulario o encuesta.", action: "Nuevo formulario", onAction: "setModal(true)", marker: '<div className="space-y-2 rounded-lg border p-3 lg:col-span-1">' },
};

function wrapAtMarker(text, cfg) {
  if (text.includes("<DashboardListShell")) return text;
  if (!cfg.marker) return text;
  const idx = text.indexOf(cfg.marker);
  if (idx === -1) return text;
  // For CRM, wrap only the table inside contactos tab - special case skip if complex
  if (cfg.marker.includes("contactos")) {
    const tableStart = text.indexOf('<div className="overflow-x-auto rounded-xl border">', idx);
    if (tableStart === -1) return text;
    const tableEnd = text.indexOf("</div>", text.indexOf("</table>", tableStart)) + 6;
    return wrapRange(text, tableStart, tableEnd, cfg);
  }
  // find block: from marker to balanced div - use line-based for space-y/grid
  let end = idx;
  let depth = 0;
  let pos = idx;
  while (pos < text.length) {
    const o = text.indexOf("<div", pos);
    const c = text.indexOf("</div>", pos);
    if (c === -1) break;
    if (o !== -1 && o < c) {
      depth++;
      pos = o + 4;
    } else {
      depth--;
      pos = c + 6;
      if (depth <= 0) {
        end = pos;
        break;
      }
    }
  }
  if (end <= idx) return text;
  return wrapRange(text, idx, end, cfg);
}

function wrapRange(text, start, end, cfg) {
  const block = text.slice(start, end);
  const sk = cfg.skeleton ?? "SkeletonList";
  const action = cfg.action
    ? `\n          emptyActionLabel="${cfg.action}"\n          onEmptyAction={() => ${cfg.onAction}}`
    : "";
  const emptyExpr = cfg.skipEmpty ? "false" : `!loading && ${cfg.items}.length === 0`;
  const shell = `<DashboardListShell
          empty={${emptyExpr}}
          emptyDescription="${cfg.desc}"
          emptyTitle="${cfg.title}"${action}
          loading={loading}
          skeleton={<${sk} />}
        >
        ${block}
        </DashboardListShell>`;
  return text.slice(0, start) + shell + text.slice(end);
}

for (const [rel, cfg] of Object.entries(PAGES)) {
  const full = path.join(ROOT, rel);
  if (!fs.existsSync(full)) continue;
  let t = fs.readFileSync(full, "utf8");
  const out = wrapAtMarker(t, cfg);
  if (out !== t) {
    fs.writeFileSync(full, out);
    console.log("ok", rel);
  } else console.log("fail", rel);
}
