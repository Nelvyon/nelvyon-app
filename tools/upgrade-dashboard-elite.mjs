import fs from "fs";
import path from "path";

const ROOT = path.join(
  "c:/Users/Asus/Downloads/app_v181/apps/web/src/app/dashboard",
);

const ELITE_NAMES = [
  "DashboardListShell",
  "DashboardPageTransition",
  "EliteModal",
  "SkeletonList",
  "SkeletonTable",
];

function mergeImport(text) {
  const re =
    /import \{([^}]+)\} from "@\/features\/dashboard\/components\/DashboardTabs";/;
  const m = text.match(re);
  if (m) {
    const parts = m[1].split(",").map((s) => s.trim()).filter(Boolean);
    for (const n of ELITE_NAMES) {
      if (!parts.includes(n)) parts.push(n);
    }
    if (!parts.includes("MetricGrid") && text.includes("MetricGrid")) parts.unshift("MetricGrid");
    if (!parts.includes("DashboardTabs") && text.includes("DashboardTabs")) parts.unshift("DashboardTabs");
    return text.replace(re, `import { ${parts.join(", ")} } from "@/features/dashboard/components/DashboardTabs";`);
  }
  const anchor = 'import { ProtectedLayout } from "@/core/routing/ProtectedLayout";';
  if (!text.includes(anchor)) return text;
  const imp = `import { ${ELITE_NAMES.join(", ")} } from "@/features/dashboard/components/DashboardTabs";\n`;
  return text.replace(anchor, anchor + "\n" + imp);
}

function ensureUseState(text) {
  if (!text.includes("useState")) {
    text = text.replace(
      /from "react";/,
      (m) => m.replace ? m : m,
    );
  }
  if (!/useState/.test(text.split("from \"react\"")[1]?.slice(0, 80) ?? "")) {
    text = text.replace(
      /import \{([^}]+)\} from "react";/,
      (_, inner) => {
        if (inner.includes("useState")) return `import { ${inner} } from "react";`;
        return `import { ${inner}, useState } from "react";`;
      },
    );
  }
  return text;
}

function addLoading(text) {
  if (/const \[loading, setLoading\]/.test(text)) return text;
  const fn = text.match(/export default function \w+\(\) \{/);
  if (!fn) return text;
  const i = fn.index + fn[0].length;
  return text.slice(0, i) + "\n  const [loading, setLoading] = useState(true);" + text.slice(i);
}

function patchLoad(text) {
  if (text.includes("setLoading(false)")) return text;
  return text.replace(
    /const (load\w*) = useCallback\(async \(\) => \{\n([\s\S]*?)\n  \}, (\[[^\]]*\])\);/g,
    (_, name, body, deps) => {
      if (body.includes("setLoading")) return `const ${name} = useCallback(async () => {\n${body}\n  }, ${deps});`;
      return `const ${name} = useCallback(async () => {
    setLoading(true);
    try {
${body}
    } catch {
      /* preserved */
    } finally {
      setLoading(false);
    }
  }, ${deps});`;
    },
  );
}

function patchEffectLoad(text) {
  if (text.includes("setLoading(false)")) return text;
  return text.replace(
    /useEffect\(\(\) => \{\n    (load\w*\(\)[^\n]*)\n  \}, (\[[^\]]*\])\);/g,
  (full, call, deps) => `useEffect(() => {
    setLoading(true);
    ${call}
      .finally(() => setLoading(false));
  }, ${deps});`,
  );
}

function transform(text) {
  if (!text.includes('"use client"') || !text.includes("ProtectedLayout")) return null;
  if (text.trim().startsWith("import { redirect")) return null;
  let t = text;
  t = ensureUseState(t);
  t = mergeImport(t);
  t = addLoading(t);
  t = patchLoad(t);
  t = patchEffectLoad(t);
  t = t.replace(/\bSimpleModal\b/g, "EliteModal");
  t = t.replace(
    /import \{([^}]*)\} from "@\/features\/builders\/components\/DashboardUi";/g,
    (_, inner) => {
      const parts = inner.split(",").map((s) => s.trim()).filter((s) => s && s !== "SimpleModal");
      if (!parts.length) return "";
      return `import { ${parts.join(", ")} } from "@/features/builders/components/DashboardUi";`;
    },
  );
  t = t.replace(
    /<ProtectedLayout([^>]*)>\s*\n\s*<div className="space-y-6">/,
    "<ProtectedLayout$1>\n      <DashboardPageTransition>",
  );
  if (t.includes("<DashboardPageTransition>") && !t.includes("</DashboardPageTransition>")) {
    t = t.replace(
      /(\n\s*)<\/div>(\s*\n\s*<EliteModal)/,
      "$1</DashboardPageTransition>$2",
    );
    if (!t.includes("</DashboardPageTransition>")) {
      t = t.replace(
        /(\n\s*)<\/div>(\s*\n\s*<\/ProtectedLayout>)/,
        "$1</DashboardPageTransition>$2",
      );
    }
  }
  t = t.replace(/<MetricGrid items=\{([^}]+)\}(?! loading)/g, "<MetricGrid items={$1} loading={loading}");
  t = t.replace(/loading=\{loading\} loading=\{loading\}/g, "loading={loading}");
  t = t.replace(
    /\{stats \? <MetricGrid items=\{([^}]+)\} loading=\{loading\} \/> : null\}/g,
    "<MetricGrid items={$1} loading={loading} />",
  );
  t = t.replace(
    /<tr className="border-b last:border-0"/g,
    '<tr className="border-b last:border-0 transition-colors hover:bg-muted/50"',
  );
  return t === text ? null : t;
}

const changed = [];
for (const dir of [ROOT]) {
  for (const file of fs.readdirSync(dir, { recursive: true })) {
    if (typeof file !== "string" || !file.endsWith("page.tsx")) continue;
    const full = path.join(dir, file);
    const rel = path.relative(ROOT, full);
    if (rel === "page.tsx") continue;
    const text = fs.readFileSync(full, "utf8");
    const out = transform(text);
    if (out) {
      fs.writeFileSync(full, out);
      changed.push(rel);
    }
  }
}
console.log("modified", changed.length);
changed.forEach((c) => console.log(c));
