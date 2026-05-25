import fs from "fs";
import path from "path";

const ROOT = path.join(
  "c:/Users/Asus/Downloads/app_v181/apps/web/src/app/dashboard",
);

const PAGE_SHELL = {
  "helpdesk/page.tsx": { items: "items", title: "Sin tickets", desc: "Crea un ticket o espera nuevas conversaciones.", action: "Nuevo ticket", onAction: "setModal(true)" },
  "dialer/page.tsx": { items: "history", title: "Sin historial de llamadas", desc: "Tu historial aparecerá tras la primera llamada.", skeleton: "SkeletonTable" },
  "afiliados/page.tsx": { items: "payouts", title: "Sin pagos registrados", desc: "Los pagos de referidos aparecerán aquí.", skeleton: "SkeletonTable" },
  "chatbot/page.tsx": { items: "bots", title: "Sin chatbots", desc: "Crea un asistente con IA para tu web.", action: "Crear chatbot", onAction: "setModal(true)", grid: true },
  "cursos/page.tsx": { items: "courses", title: "Sin cursos", desc: "Publica tu primer curso online.", action: "Nuevo curso", onAction: "setModal(true)", grid: true },
  "webinars/page.tsx": { items: "webinars", title: "Sin webinars", desc: "Programa tu primer evento en vivo.", action: "Nuevo webinar", onAction: "setModal(true)", grid: true },
  "loyalty/page.tsx": { items: "programs", title: "Sin programas", desc: "Lanza un programa de fidelización.", action: "Nuevo programa", onAction: "setModal(true)", grid: true },
  "sms/page.tsx": { items: "messages", title: "Sin mensajes", desc: "Envía tu primera campaña SMS.", skeleton: "SkeletonTable" },
  "cdp/page.tsx": { items: "segments", title: "Sin segmentos", desc: "Define audiencias para personalizar campañas.", skeleton: "SkeletonList" },
  "formularios/page.tsx": { items: "forms", title: "Sin formularios", desc: "Captura leads con formularios embebibles.", action: "Nuevo formulario", onAction: "setModal(true)", grid: true },
  "ab-testing/page.tsx": { items: "experiments", title: "Sin experimentos", desc: "Compara variantes para optimizar conversiones.", action: "Nuevo experimento", onAction: "setModal(true)", grid: true },
  "social-scheduler/page.tsx": { items: "posts", title: "Sin publicaciones", desc: "Programa contenido en redes sociales.", action: "Nueva publicación", onAction: "setModal(true)", skeleton: "SkeletonList" },
  "social-monitoring/page.tsx": { items: "mentions", title: "Sin menciones", desc: "Configura alertas para empezar a monitorizar.", action: "Nueva alerta", onAction: "setModal(true)", skeleton: "SkeletonList" },
  "reportes/page.tsx": { items: "reports", title: "Sin informes", desc: "Genera informes de rendimiento.", skeleton: "SkeletonList" },
  "reservas/page.tsx": { items: "bookings", title: "Sin reservas", desc: "Las reservas de clientes aparecerán aquí.", action: "Nueva reserva", onAction: "setModal(true)", skeleton: "SkeletonTable" },
  "calendario/page.tsx": { items: "events", title: "Sin eventos", desc: "Añade eventos a tu calendario.", action: "Nuevo evento", onAction: "setModal(true)", skeleton: "SkeletonList" },
  "ia/page.tsx": { items: "history", title: "Sin generaciones", desc: "Tus imágenes y textos generados aparecerán aquí.", skeleton: "SkeletonList" },
  "seo/page.tsx": { items: "audits", title: "Sin auditorías", desc: "Ejecuta tu primera auditoría SEO.", skeleton: "SkeletonList" },
  "settings/page.tsx": { skeleton: "SkeletonList" },
  "history/page.tsx": { items: "entries", title: "Sin historial", desc: "Las acciones recientes se registrarán aquí.", skeleton: "SkeletonList" },
  "live-chat/page.tsx": { items: "sessions", title: "Sin conversaciones", desc: "Las conversaciones en vivo aparecerán aquí.", skeleton: "SkeletonList" },
  "storage/page.tsx": { items: "files", title: "Almacenamiento vacío", desc: "Sube archivos para compartirlos.", skeleton: "SkeletonList" },
  "qr/page.tsx": { items: "codes", title: "Sin códigos QR", desc: "Genera QR estáticos o dinámicos.", action: "Crear QR", onAction: "setDynamicModal(true)", grid: true },
};

function ensureEliteImports(text) {
  const re =
    /import \{([^}]+)\} from "@\/features\/dashboard\/components\/DashboardTabs";/;
  const m = text.match(re);
  if (!m) return text;
  const need = ["DashboardListShell", "DashboardPageTransition", "SkeletonList", "SkeletonTable"];
  const parts = m[1].split(",").map((s) => s.trim()).filter(Boolean);
  for (const n of need) if (!parts.includes(n)) parts.push(n);
  return text.replace(re, `import { ${parts.join(", ")} } from "@/features/dashboard/components/DashboardTabs";`);
}

function wrapBlock(text, startMarker, endMarker, shellProps) {
  if (text.includes("<DashboardListShell")) return text;
  const start = text.indexOf(startMarker);
  if (start === -1) return text;
  const end = text.indexOf(endMarker, start);
  if (end === -1) return text;
  const block = text.slice(start, end + endMarker.length);
  const sk = shellProps.skeleton ?? "SkeletonList";
  const actionProps = shellProps.action
    ? `\n          emptyActionLabel="${shellProps.action}"\n          onEmptyAction={() => ${shellProps.onAction}}`
    : "";
  const shell = `<DashboardListShell
          empty={!loading && ${shellProps.items}.length === 0}
          emptyDescription="${shellProps.desc}"
          emptyTitle="${shellProps.title}"${actionProps}
          loading={loading}
          skeleton={<${sk} />}
        >
        ${block}
        </DashboardListShell>`;
  return text.slice(0, start) + shell + text.slice(end + endMarker.length);
}

function fixSpaceY6(text) {
  return text.replace(
    /<ProtectedLayout([^>]*)>\s*\n\s*<div className="space-y-6">/g,
    "<ProtectedLayout$1>\n      <DashboardPageTransition>",
  ).replace(
    /(<ProtectedLayout[^>]*>[\s\S]*?)<\/div>(\s*\n\s*<\/ProtectedLayout>)/,
    (m, inner, tail) => {
      if (inner.includes("</DashboardPageTransition>")) return m;
      if (!inner.includes("<DashboardPageTransition>")) return m;
      return inner + "</DashboardPageTransition>" + tail;
    },
  );
}

function fixTableHover(text) {
  return text
    .replace(/<tr className="border-t">/g, '<tr className="border-t transition-colors hover:bg-muted/50">')
    .replace(/<tr className="border-b"(?! transition)/g, '<tr className="border-b transition-colors hover:bg-muted/50"');
}

function fixCrm(text) {
  if (!text.includes("CrmDashboardPage")) return text;
  text = text.replace(
    /const loadDeals = useCallback\(async \(\) => \{[\s\S]*?\}, \[\]\);\n\n  const loadActivities[\s\S]*?\}, \[\]\);\n\n  const loadPipeline[\s\S]*?\}, \[\]\);\n\n  const loadStats[\s\S]*?\}, \[\]\);/,
    `const loadDeals = useCallback(async () => {
    const res = await dashboardCrmApi.deals();
    setDeals(res.items ?? []);
  }, []);

  const loadActivities = useCallback(async () => {
    const res = await dashboardCrmApi.activities();
    setActivities(res.items ?? []);
  }, []);

  const loadPipeline = useCallback(async () => {
    const res = await dashboardCrmApi.pipeline();
    setPipeline(res);
  }, []);

  const loadStats = useCallback(async () => {
    const res = await dashboardCrmApi.stats();
    setStats(res);
  }, []);`,
  );
  text = text.replace(
    /useEffect\(\(\) => \{\n    loadContacts\(\)\.catch\(\(\) => setContacts\(\[\]\)\);\n    loadDeals\(\)\.catch\(\(\) => setDeals\(\[\]\)\);\n    loadActivities\(\)\.catch\(\(\) => setActivities\(\[\]\)\);\n    loadPipeline\(\)\.catch\(\(\) => setPipeline\(null\)\);\n    loadStats\(\)\.catch\(\(\) => setStats\(null\)\);\n  \}, \[loadContacts, loadDeals, loadActivities, loadPipeline, loadStats\]\);/,
    `useEffect(() => {
    setLoading(true);
    Promise.all([
      loadContacts().catch(() => setContacts([])),
      loadDeals().catch(() => setDeals([])),
      loadActivities().catch(() => setActivities([])),
      loadPipeline().catch(() => setPipeline(null)),
      loadStats().catch(() => setStats(null)),
    ]).finally(() => setLoading(false));
  }, [loadContacts, loadDeals, loadActivities, loadPipeline, loadStats]);`,
  );
  return text;
}

for (const [rel, meta] of Object.entries(PAGE_SHELL)) {
  const full = path.join(ROOT, rel);
  if (!fs.existsSync(full)) continue;
  let t = fs.readFileSync(full, "utf8");
  t = ensureEliteImports(t);
  t = fixSpaceY6(t);
  t = fixTableHover(t);
  if (meta.items) {
    if (meta.grid) {
      t = wrapBlock(t, '<div className="grid gap-4', "</div>\n        </DashboardListShell>", meta) ||
        wrapBlock(t, '<div className="grid gap-4', "</div>", meta);
    } else {
      t = wrapBlock(
        t,
        '<div className="overflow-x-auto rounded',
        "</div>",
        meta,
      );
    }
  }
  if (rel === "crm/page.tsx") t = fixCrm(t);
  fs.writeFileSync(full, t);
  console.log("ok", rel);
}

// Global table hover + space-y-6 fix
for (const file of fs.readdirSync(ROOT, { recursive: true })) {
  if (typeof file !== "string" || !file.endsWith("page.tsx")) continue;
  const full = path.join(ROOT, file);
  const rel = file.replace(/\\/g, "/");
  if (rel === "page.tsx") continue;
  let t = fs.readFileSync(full, "utf8");
  const orig = t;
  t = fixTableHover(t);
  if (!PAGE_SHELL[rel]) t = fixSpaceY6(t);
  if (t !== orig) fs.writeFileSync(full, t);
}
