import fs from "fs";
import path from "path";

const ROOT = path.join(
  "c:/Users/Asus/Downloads/app_v181/apps/web/src/app/dashboard",
);

const CONFIG = {
  "chatbot/page.tsx": { items: "bots", title: "Sin chatbots", desc: "Crea un asistente IA para tu web.", action: "Crear chatbot", onAction: "setModal(true)", grid: "grid gap-4 md:grid-cols-2" },
  "cursos/page.tsx": { items: "courses", title: "Sin cursos", desc: "Publica tu primer curso online.", action: "Nuevo curso", onAction: "setModal(true)", grid: "grid gap-4 md:grid-cols-2" },
  "webinars/page.tsx": { items: "items", title: "Sin webinars", desc: "Programa tu primer evento en vivo.", action: "Nuevo webinar", onAction: "setModal(true)", grid: "grid gap-4" },
  "loyalty/page.tsx": { items: "programs", title: "Sin programas", desc: "Lanza un programa de fidelización.", action: "Nuevo programa", onAction: "setModal(true)", grid: "grid gap-4" },
  "sms/page.tsx": { items: "messages", title: "Sin mensajes", desc: "Envía tu primera campaña SMS.", table: true },
  "cdp/page.tsx": { items: "segments", title: "Sin segmentos", desc: "Define audiencias para campañas.", list: "space-y-3" },
  "formularios/page.tsx": { items: "forms", title: "Sin formularios", desc: "Captura leads con formularios.", action: "Nuevo formulario", onAction: "setModal(true)", grid: "grid gap-4" },
  "ab-testing/page.tsx": { items: "experiments", title: "Sin experimentos", desc: "Compara variantes A/B.", action: "Nuevo experimento", onAction: "setModal(true)", grid: "grid gap-4" },
  "social-scheduler/page.tsx": { items: "posts", title: "Sin publicaciones", desc: "Programa contenido en redes.", action: "Nueva publicación", onAction: "setModal(true)", list: "space-y-3" },
  "social-monitoring/page.tsx": { items: "mentions", title: "Sin menciones", desc: "Configura alertas para monitorizar.", action: "Nueva alerta", onAction: "setModal(true)", list: "space-y-3" },
  "reportes/page.tsx": { items: "items", title: "Sin informes", desc: "Genera informes de rendimiento.", list: "space-y-3" },
  "reservas/page.tsx": { items: "items", title: "Sin reservas", desc: "Las reservas aparecerán aquí.", action: "Nueva reserva", onAction: "setModal(true)", table: true },
  "calendario/page.tsx": { items: "events", title: "Sin eventos", desc: "Añade eventos a tu calendario.", action: "Nuevo evento", onAction: "setModal(true)", list: "space-y-2" },
  "ia/page.tsx": { items: "items", title: "Sin generaciones", desc: "Tus creaciones con IA aparecerán aquí.", list: "space-y-4" },
  "seo/page.tsx": { items: "audits", title: "Sin auditorías", desc: "Ejecuta tu primera auditoría SEO.", list: "space-y-3" },
  "history/page.tsx": { items: "entries", title: "Sin historial", desc: "Las acciones recientes se registrarán aquí.", list: "space-y-2" },
  "live-chat/page.tsx": { items: "sessions", title: "Sin conversaciones", desc: "Las conversaciones en vivo aparecerán aquí.", list: "space-y-3" },
  "qr/page.tsx": { items: "codes", title: "Sin códigos QR", desc: "Genera QR estáticos o dinámicos.", action: "Crear QR", onAction: "setDynamicModal(true)", grid: "grid gap-4" },
  "crm/page.tsx": { skip: true },
  "helpdesk/page.tsx": { skip: true },
  "dialer/page.tsx": { skip: true },
  "afiliados/page.tsx": { skip: true },
  "websites/page.tsx": { skip: true },
  "stores/page.tsx": { skip: true },
  "funnels/page.tsx": { skip: true },
  "landing-pages/page.tsx": { skip: true },
  "automatizacion/page.tsx": { skip: true },
  "campanas/page.tsx": { skip: true },
  "contratos/page.tsx": { skip: true },
  "facturacion/page.tsx": { skip: true },
  "storage/page.tsx": { skip: true },
};

function skeletonFor(cfg) {
  if (cfg.table) return "SkeletonTable";
  return "SkeletonList";
}

function wrapContent(text, cfg) {
  if (text.includes("<DashboardListShell")) return text;
  let marker;
  if (cfg.grid) marker = `<div className="${cfg.grid}`;
  else if (cfg.list) marker = `<div className="${cfg.list}`;
  else if (cfg.table) marker = '<div className="overflow-x-auto rounded';
  else return text;

  const idx = text.indexOf(marker);
  if (idx === -1) return text;

  // find closing div at same indent level - naive: next `\n        </div>` after block
  let depth = 0;
  let pos = idx;
  let end = -1;
  const openTag = "<div";
  while (pos < text.length) {
    const nextOpen = text.indexOf(openTag, pos + 1);
    const nextClose = text.indexOf("</div>", pos);
    if (nextClose === -1) break;
    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth++;
      pos = nextOpen + 4;
    } else {
      if (depth === 0) {
        end = nextClose + 6;
        break;
      }
      depth--;
      pos = nextClose + 6;
    }
  }
  if (end === -1) return text;

  const block = text.slice(idx, end);
  const sk = skeletonFor(cfg);
  const action = cfg.action
    ? `\n          emptyActionLabel="${cfg.action}"\n          onEmptyAction={() => ${cfg.onAction}}`
    : "";
  const shell = `<DashboardListShell
          empty={!loading && ${cfg.items}.length === 0}
          emptyDescription="${cfg.desc}"
          emptyTitle="${cfg.title}"${action}
          loading={loading}
          skeleton={<${sk} />}
        >
        ${block}
        </DashboardListShell>`;
  return text.slice(0, idx) + shell + text.slice(end);
}

for (const [rel, cfg] of Object.entries(CONFIG)) {
  if (cfg.skip) continue;
  const full = path.join(ROOT, rel);
  if (!fs.existsSync(full)) {
    console.log("missing", rel);
    continue;
  }
  let t = fs.readFileSync(full, "utf8");
  const out = wrapContent(t, cfg);
  if (out !== t) {
    fs.writeFileSync(full, out);
    console.log("wrapped", rel);
  } else {
    console.log("skip", rel);
  }
}
