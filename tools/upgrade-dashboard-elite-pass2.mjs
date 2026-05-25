import fs from "fs";
import path from "path";

const ROOT = path.join(
  "c:/Users/Asus/Downloads/app_v181/apps/web/src/app/dashboard",
);

const EMPTY_META = {
  "websites/page.tsx": {
    grid: true,
    title: "Aún no tienes webs",
    desc: "Crea tu primera web multipágina generada con IA.",
    action: "Crear nueva web",
    onAction: "setModal(true)",
    items: "items",
  },
  "stores/page.tsx": {
    grid: true,
    title: "Sin tiendas todavía",
    desc: "Lanza tu primera tienda online con Stripe integrado.",
    action: "Crear tienda",
    onAction: "setModal(true)",
    items: "items",
  },
  "funnels/page.tsx": {
    grid: true,
    title: "Sin funnels",
    desc: "Diseña embudos de conversión paso a paso.",
    action: "Nuevo funnel",
    onAction: "setModal(true)",
    items: "items",
  },
  "landing-pages/page.tsx": {
    grid: true,
    title: "Sin landing pages",
    desc: "Crea landings con el editor visual o desde plantilla.",
    action: "Nueva landing",
    onAction: "setModal(true)",
    items: "items",
  },
  "automatizacion/page.tsx": {
    grid: true,
    title: "Sin workflows",
    desc: "Automatiza tareas repetitivas con flujos visuales.",
    action: "Nuevo workflow",
    onAction: "setModal(true)",
    items: "items",
  },
  "campanas/page.tsx": {
    table: true,
    title: "Sin campañas",
    desc: "Lanza tu primera campaña de email o multicanal.",
    action: "Nueva campaña",
    onAction: "setModal(true)",
    items: "items",
  },
  "contratos/page.tsx": {
    table: true,
    title: "Sin contratos",
    desc: "Genera y envía contratos para firma digital.",
    action: "Nuevo contrato",
    onAction: "setModal(true)",
    items: "items",
  },
  "dialer/page.tsx": {
    list: true,
    title: "Sin historial de llamadas",
    desc: "Realiza tu primera llamada desde el marcador.",
    action: null,
    items: "history",
  },
  "helpdesk/page.tsx": {
    table: true,
    title: "Sin tickets",
    desc: "Los tickets de soporte aparecerán aquí.",
    action: "Nuevo ticket",
    onAction: "setModal(true)",
    items: "items",
  },
  "facturacion/page.tsx": {
    table: true,
    title: "Sin facturas",
    desc: "Crea tu primera factura o presupuesto.",
    action: "Nueva factura",
    onAction: "setModal(true)",
    items: "items",
  },
  "storage/page.tsx": {
    list: true,
    title: "Almacenamiento vacío",
    desc: "Sube archivos para compartirlos con tu equipo.",
    action: null,
    items: "files",
  },
  "live-chat/page.tsx": {
    list: true,
    title: "Sin conversaciones",
    desc: "Las conversaciones en vivo aparecerán aquí.",
    action: null,
    items: "sessions",
  },
  "history/page.tsx": {
    list: true,
    title: "Sin historial",
    desc: "Las acciones recientes se registrarán aquí.",
    action: null,
    items: "entries",
  },
};

function fixImports(text) {
  text = text.replace(
    /import \{ EliteModal, /g,
    "import { ",
  );
  text = text.replace(
    /import \{ EliteModal \} from "@\/features\/builders\/components\/DashboardUi";\n/g,
    "",
  );
  text = text.replace(/import \{ , /g, "import { ");
  text = text.replace(/import \{ EliteModal, StatusBadge \}/g, "import { StatusBadge }");
  text = text.replace(/, EliteModal/g, "");
  text = text.replace(/import \{  /g, "import { ");
  text = text.replace(/  \} from "react"/g, " } from \"react\"");
  return text;
}

function wrapGrid(text, meta) {
  if (text.includes("<DashboardListShell")) return text;
  const re = /(\n        <div className="grid gap-4[^>]*>[\s\S]*?\n        <\/div>)(\n)/;
  const m = text.match(re);
  if (!m) return text;
  const shell = `
        <DashboardListShell
          empty={!loading && ${meta.items}.length === 0}
          emptyActionLabel="${meta.action ?? ""}"
          emptyDescription="${meta.desc}"
          emptyTitle="${meta.title}"
          loading={loading}
          onEmptyAction={() => ${meta.onAction}}
          skeleton={<SkeletonList />}
        >${m[1]}
        </DashboardListShell>${m[2]}`;
  if (!meta.action) {
    return text.replace(re, (full) => {
      const inner = full.match(re)[1];
      return `
        <DashboardListShell
          empty={!loading && ${meta.items}.length === 0}
          emptyDescription="${meta.desc}"
          emptyTitle="${meta.title}"
          loading={loading}
          skeleton={<SkeletonList />}
        >${inner}
        </DashboardListShell>
`;
    });
  }
  return text.replace(re, shell);
}

function fixCrmLoading(text) {
  if (!text.includes("CrmDashboardPage")) return text;
  // Remove setLoading from individual loaders except one bootstrap
  text = text.replace(
    /const loadDeals = useCallback\(async \(\) => \{\n    setLoading\(true\);\n    try \{\n    const res = await dashboardCrmApi\.deals\(\);\n    setDeals\(res\.items \?\? \[\]\);\n    \} catch \{\n      \/\* preserved \*\/\n    \} finally \{\n      setLoading\(false\);\n    \}\n  \}, \[\]\);/,
    `const loadDeals = useCallback(async () => {
    const res = await dashboardCrmApi.deals();
    setDeals(res.items ?? []);
  }, []);`,
  );
  text = text.replace(
    /const loadActivities[\s\S]*?  \}, \[\]\);\n\n  const loadPipeline[\s\S]*?  \}, \[\]\);\n\n  const loadStats[\s\S]*?  \}, \[\]\);/,
    `const loadActivities = useCallback(async () => {
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
    /useEffect\(\(\) => \{\n    loadContacts\(\)\.catch/,
    `useEffect(() => {
    setLoading(true);
    Promise.all([
      loadContacts().catch(() => setContacts([])),
      loadDeals().catch(() => setDeals([])),
      loadActivities().catch(() => setActivities([])),
      loadPipeline().catch(() => setPipeline(null)),
      loadStats().catch(() => setStats(null)),
    ]).finally(() => setLoading(false));
  }, [loadContacts, loadDeals, loadActivities, loadPipeline, loadStats]);

  useEffect(() => {
    loadContacts().catch`,
  );
  // Remove duplicate old useEffect if created badly - read file after
  return text;
}

function fixImg(text) {
  if (!text.includes("<img ")) return text;
  if (!text.includes('from "next/image"')) {
    text = text.replace(
      /import Link from "next\/link";/,
      'import Image from "next/image";\nimport Link from "next/link";',
    );
    if (!text.includes('import Image from "next/image"')) {
      text = text.replace(
        /("use client";\n\n)/,
        '$1import Image from "next/image";\n',
      );
    }
  }
  text = text.replace(
    /<img alt="([^"]*)" className="([^"]*)" src=\{([^}]+)\} \/>/g,
    '<Image alt="$1" className="$2" height={160} src={$3} unoptimized width={160} />',
  );
  text = text.replace(
    /<img alt="([^"]*)" className="([^"]*)" src=\{([^}]+)\}>/g,
    '<Image alt="$1" className="$2" height={160} src={$3} unoptimized width={160} />',
  );
  text = text.replace(
    /<img src=\{([^}]+)\} alt="([^"]*)" className="([^"]*)" \/>/g,
    '<Image alt="$2" className="$3" height={160} src={$1} unoptimized width={160} />',
  );
  return text;
}

const changed = [];
for (const [rel, meta] of Object.entries(EMPTY_META)) {
  const full = path.join(ROOT, rel);
  if (!fs.existsSync(full)) continue;
  let t = fs.readFileSync(full, "utf8");
  const orig = t;
  t = fixImports(t);
  t = wrapGrid(t, meta);
  if (rel === "crm/page.tsx") t = fixCrmLoading(t);
  t = fixImg(t);
  if (t !== orig) {
    fs.writeFileSync(full, t);
    changed.push(rel);
  }
}

// Global import fix on all pages
for (const file of fs.readdirSync(ROOT, { recursive: true })) {
  if (typeof file !== "string" || !file.endsWith("page.tsx")) continue;
  const full = path.join(ROOT, file);
  if (path.relative(ROOT, full) === "page.tsx") continue;
  let t = fs.readFileSync(full, "utf8");
  const fixed = fixImports(t);
  const withImg = fixImg(fixed);
  if (withImg !== t) {
    fs.writeFileSync(full, withImg);
    if (!changed.includes(file.replace(/\\/g, "/"))) changed.push(file.replace(/\\/g, "/"));
  }
}

console.log("pass2", changed.length, changed.join("\n"));
