#!/usr/bin/env python3
"""Apply elite UI baseline transforms to dashboard page.tsx files."""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(r"c:\Users\Asus\Downloads\app_v181\apps\web\src\app\dashboard")
ELITE_IMPORT = (
    'import {\n'
    "  DashboardListShell,\n"
    "  DashboardPageTransition,\n"
    "  EliteModal,\n"
    "  MetricGrid,\n"
    "  SkeletonList,\n"
    "  SkeletonTable,\n"
    '} from "@/features/dashboard/components/DashboardTabs";\n'
)
ELITE_IMPORT_METRIC_ONLY = (
    'import {\n'
    "  DashboardListShell,\n"
    "  DashboardPageTransition,\n"
    "  EliteModal,\n"
    "  MetricGrid,\n"
    "  SkeletonList,\n"
    "  SkeletonTable,\n"
    '} from "@/features/dashboard/components/DashboardTabs";\n'
)

SKIP = {"page.tsx"}


def has_elite_import(text: str) -> bool:
    return "DashboardPageTransition" in text


def ensure_use_state(text: str) -> str:
    if "useState" in text:
        return text
    return text.replace(
        'import { useCallback, useEffect',
        'import { useCallback, useEffect, useState',
    ).replace(
        'import { useEffect',
        'import { useEffect, useState',
    )


def add_loading_state(text: str) -> str:
    if re.search(r"const\s+\[loading,\s*setLoading\]", text):
        return text
    # After first useState block in component
    m = re.search(
        r"(export default function \w+\(\) \{\n(?:  const \[[^\]]+\][^\n]+\n)+)",
        text,
    )
    if m:
        insert_at = m.end()
        return text[:insert_at] + "  const [loading, setLoading] = useState(true);\n" + text[insert_at:]
    m2 = re.search(r"export default function \w+\(\) \{\n", text)
    if m2:
        insert_at = m2.end()
        return text[:insert_at] + "  const [loading, setLoading] = useState(true);\n" + text[insert_at:]
    return text


def wrap_load_with_loading(text: str) -> str:
    """Wrap load callbacks that fetch data with setLoading."""
    if "setLoading(false)" in text:
        return text

    def patch_load_body(body: str) -> str:
        if "setLoading" in body:
            return body
        stripped = body.strip()
        if stripped.startswith("try"):
            return body.replace("try {", "setLoading(true);\n    try {", 1).replace(
                "} finally {",
                "} finally {\n      setLoading(false);",
                1,
            ) if "} finally {" in body else body.replace(
                "} catch",
                "} catch",
                1,
            )
        # prepend setLoading true, append finally false
        lines = body.split("\n")
        indent = "    "
        new = f"{indent}setLoading(true);\n"
        new += body
        if not body.rstrip().endswith("finally"):
            new += f"\n{indent}setLoading(false);"
        return new

    # Pattern: const load = useCallback(async () => { ... }, [...]);
    pattern = re.compile(
        r"(const load\w* = useCallback\(async \(\) => \{)(.*?)(\}, \[[^\]]*\]\);)",
        re.DOTALL,
    )

    def repl(m: re.Match) -> str:
        start, body, end = m.group(1), m.group(2), m.group(3)
        if "setLoading" in body:
            return m.group(0)
        new_body = f"\n    setLoading(true);\n    try {{{body}\n    }} catch {{\n      /* keep existing catch if any */\n    }} finally {{\n      setLoading(false);\n    }}\n"
        # Simpler: just wrap existing body
        if "try {" in body:
            if "finally" not in body:
                new_body = body.replace(
                    re.search(r"\} catch[^}]+\}", body).group(0) if re.search(r"\} catch", body) else "",
                    "",
                )
            return m.group(0)
        new_body = f"\n    setLoading(true);\n    try {{{body}    }} finally {{\n      setLoading(false);\n    }}\n"
        return start + new_body + end

    # Simpler approach: patch useEffect that calls load
    if "setLoading(false)" not in text:

        def patch_effect(m: re.Match) -> str:
            inner = m.group(1)
            if "setLoading" in inner:
                return m.group(0)
            return (
                "useEffect(() => {\n"
                "    setLoading(true);\n"
                + inner
                + "    setLoading(false);\n"
                "  },"
            )

        text2 = re.sub(
            r"useEffect\(\(\) => \{\n((?:    .+\n)+?)  \}, (\[[^\]]*\])\);",
            lambda m: (
                "useEffect(() => {\n"
                "    let cancelled = false;\n"
                "    setLoading(true);\n"
                + m.group(1)
                + "    if (!cancelled) setLoading(false);\n"
                "    return () => { cancelled = true; };\n"
                "  }, "
                + m.group(2)
                + ");"
            )
            if "load()" in m.group(1) and "setLoading" not in m.group(0)
            else m.group(0),
            text,
            count=1,
        )
        if text2 != text:
            text = text2
    return text


def merge_dashboard_tabs_import(text: str) -> str:
    """Add elite exports to existing DashboardTabs import or insert new import."""
    m = re.search(
        r'import \{([^}]+)\} from "@/features/dashboard/components/DashboardTabs";',
        text,
    )
    needed = [
        "DashboardListShell",
        "DashboardPageTransition",
        "EliteModal",
        "SkeletonList",
        "SkeletonTable",
    ]
    if m:
        existing = [x.strip() for x in m.group(1).split(",") if x.strip()]
        for n in needed:
            if n not in existing:
                existing.append(n)
        new_imp = "import { " + ", ".join(existing) + ' } from "@/features/dashboard/components/DashboardTabs";'
        return text[: m.start()] + new_imp + text[m.end() :]
    # Insert after ProtectedLayout import
    pl = re.search(r'(import \{ ProtectedLayout \}[^\n]+\n)', text)
    if pl:
        pos = pl.end()
        return text[:pos] + ELITE_IMPORT_METRIC_ONLY + text[pos:]
    return text


def replace_simple_modal(text: str) -> str:
    text = re.sub(r"\bSimpleModal\b", "EliteModal", text)
    text = re.sub(
        r'import \{([^}]*)\} from "@/features/builders/components/DashboardUi";',
        lambda m: (
            None
            if not m.group(1).strip() or m.group(1).replace("SimpleModal,", "").replace(", SimpleModal", "").replace("SimpleModal", "").strip() == ""
            else 'import { ' + ", ".join(x.strip() for x in m.group(1).split(",") if x.strip() and x.strip() != "SimpleModal") + ' } from "@/features/builders/components/DashboardUi";'
        ),
        text,
    )
    # Fix broken import line
    text = re.sub(
        r'import \{ \} from "@/features/builders/components/DashboardUi";\n',
        "",
        text,
    )
    text = re.sub(
        r'import \{,\s*',
        "import { ",
        text,
    )
    return text


def replace_page_wrapper(text: str) -> str:
    text = re.sub(
        r"<ProtectedLayout([^>]*)>\s*\n\s*<div className=\"space-y-6\">",
        r"<ProtectedLayout\1>\n      <DashboardPageTransition>",
        text,
        count=1,
    )
    # Close: last </div> before </ProtectedLayout> when transition used
    if "<DashboardPageTransition>" in text and "</DashboardPageTransition>" not in text:
        text = re.sub(
            r"(</EliteModal>\s*)?\n(\s*)</div>\s*\n(\s*)</ProtectedLayout>",
            r"\1\n\2</DashboardPageTransition>\n\3</ProtectedLayout>",
            text,
            count=1,
        )
    return text


def metric_grid_loading(text: str) -> str:
    text = re.sub(
        r"<MetricGrid items=\{([^}]+)\} />",
        r"<MetricGrid items={\1} loading={loading} />",
        text,
    )
    text = re.sub(
        r"loading=\{loading\} loading=\{loading\}",
        "loading={loading}",
        text,
    )
    text = re.sub(
        r"\{stats \? <MetricGrid items=\{([^}]+)\} loading=\{loading\} /> : null\}",
        r"<MetricGrid items={\1} loading={loading} />",
        text,
    )
    return text


def table_row_hover(text: str) -> str:
    return re.sub(
        r'<tr className="border-b last:border-0"',
        '<tr className="border-b last:border-0 transition-colors hover:bg-muted/50"',
        text,
    )


def upgrade_file(path: Path) -> bool:
    if path.name in SKIP and path.parent == ROOT:
        return False
    text = path.read_text(encoding="utf-8")
    if '"use client"' not in text or "ProtectedLayout" not in text:
        return False
    orig = text
    text = ensure_use_state(text)
    text = merge_dashboard_tabs_import(text)
    text = add_loading_state(text)
    text = replace_simple_modal(text)
    text = replace_page_wrapper(text)
    text = metric_grid_loading(text)
    text = table_row_hover(text)
    if text != orig:
        path.write_text(text, encoding="utf-8")
        return True
    return False


def main() -> None:
    changed = []
    for p in sorted(ROOT.rglob("page.tsx")):
        if upgrade_file(p):
            changed.append(str(p.relative_to(ROOT)))
    print(f"Modified {len(changed)} files:")
    for c in changed:
        print(" ", c)


if __name__ == "__main__":
    main()
