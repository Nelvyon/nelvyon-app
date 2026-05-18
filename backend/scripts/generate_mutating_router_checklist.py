#!/usr/bin/env python3
"""
Genera docs/NELVYON_MUTATING_ROUTERS_CHECKLIST.md con heurística por archivo.

No sustituye revisión ruta-a-ruta: marca REVIEW cuando hay mutaciones pero
señales incompletas (workspace / operator / plan).
"""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ROUTERS = ROOT / "routers"
OUT = ROOT.parent / "docs" / "NELVYON_MUTATING_ROUTERS_CHECKLIST.md"

MUT_RE = re.compile(r"@router\.(post|put|patch|delete)\s*\(", re.I)


def analyze(text: str) -> tuple[int, bool, bool, bool]:
    n = len(MUT_RE.findall(text))
    has_ws = "require_workspace" in text
    has_op = "require_workspace_operator" in text
    has_plan = "plan_quota" in text or "quota_guards" in text
    return n, has_ws, has_op, has_plan


def status(n: int, has_ws: bool, has_op: bool, has_plan: bool) -> str:
    if n == 0:
        return "SKIP"
    if has_ws and has_op:
        if has_plan:
            return "OK_EDGE+PLAN_SIGNAL"
        return "OK_EDGE"
    if not has_ws:
        return "GAP_WS"
    if not has_op:
        return "GAP_OP"
    return "REVIEW"


def main() -> None:
    rows: list[tuple[str, int, str, str, str, str]] = []
    for path in sorted(ROUTERS.glob("*.py")):
        text = path.read_text(encoding="utf-8", errors="replace")
        n, has_ws, has_op, has_plan = analyze(text)
        st = status(n, has_ws, has_op, has_plan)
        rows.append(
            (
                path.name,
                n,
                "yes" if has_ws else "no",
                "yes" if has_op else "no",
                "yes" if has_plan else "no",
                st,
            )
        )

    lines = [
        "# NELVYON — Checklist heurístico de routers mutantes",
        "",
        "**Fuente:** `backend/scripts/generate_mutating_router_checklist.py` (regenerable).",
        "**Fecha:** generado al ejecutar el script.",
        "",
        "## Cómo leer esto",
        "",
        "| Estado | Significado |",
        "|--------|-------------|",
        "| SKIP | Sin decoradores `@router.post|put|patch|delete` en el archivo. |",
        "| OK_EDGE | Archivo contiene `require_workspace` y `require_workspace_operator` (heurística; puede haber rutas sueltas). |",
        "| OK_EDGE+PLAN_SIGNAL | Además importa/uso de `plan_quota` o `quota_guards` en el archivo. |",
        "| GAP_WS | Hay mutaciones pero no aparece `require_workspace` en el archivo. |",
        "| GAP_OP | Hay mutaciones y `require_workspace` pero no `require_workspace_operator`. |",
        "| REVIEW | Caso raro; revisar manualmente. |",
        "",
        "> **No es 100/100 global:** dominios sin cuota en producto pueden ser OK sin `plan_quota`; dominios con cuotas deben revisarse manualmente (matriz `NELVYON_WRITE_PATH_MATRIX.md`).",
        "",
        "## Tabla (todos los `routers/*.py`)",
        "",
        "| Archivo | Mutaciones (conteo) | require_workspace | require_workspace_operator | plan_quota / quota_guards | Estado |",
        "|---------|--------------------:|-------------------|----------------------------|---------------------------|--------|",
    ]
    for name, n, ws, op, pl, st in rows:
        lines.append(f"| `{name}` | {n} | {ws} | {op} | {pl} | **{st}** |")

    mutants = sum(1 for r in rows if r[1] > 0)
    gap_ws = sum(1 for r in rows if r[5] == "GAP_WS")
    gap_op = sum(1 for r in rows if r[5] == "GAP_OP")
    lines += [
        "",
        "## Resumen automático",
        "",
        f"- Archivos con al menos una mutación: **{mutants}**",
        f"- Archivos etiquetados GAP_WS: **{gap_ws}**",
        f"- Archivos etiquetados GAP_OP: **{gap_op}**",
        "",
    ]
    OUT.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    main()
