"""Genera `docs/BLOQUE_4_ESTADO.md` desde el estado de capacidades de operacion.

Tercer generador del mismo tipo. El motivo se gano en el Bloque 2, donde el
resumen escrito a mano llego a anunciar "14/39 certificadas" con el JSON en 38.
Un resumen desactualizado se lee con la misma confianza que uno al dia.
"""

from __future__ import annotations

import json
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[3]
ESTADO = Path(__file__).with_name("capacidades_operacion_estado.json")
DOCUMENTO = RAIZ / "docs" / "BLOQUE_4_ESTADO.md"


def _capacidades() -> dict[str, dict]:
    return json.loads(ESTADO.read_text(encoding="utf-8"))["capacidades"]


def reparto() -> tuple[list[str], list[str], list[str]]:
    caps = _capacidades()
    cert, blo, pen = [], [], []
    for nombre in sorted(caps):
        e = caps[nombre]["estado"]
        (cert if "CERTIFIED" in e else blo if "BLOCKED" in e else pen).append(nombre)
    return cert, blo, pen


def texto() -> str:
    caps = _capacidades()
    cert, blo, pen = reparto()
    total = len(caps)
    fixed = sum(1 for v in caps.values() if v["estado"] == "FIXED_CERTIFIED")
    passed = sum(1 for v in caps.values() if v["estado"] == "PASS_CERTIFIED")

    lineas = [
        "# BLOQUE 4 — estado vivo",
        "",
        "> GENERADO. No se edita a mano: sale de",
        "> `backend/db/certificacion/capacidades_operacion_estado.json` mediante",
        "> `backend/db/certificacion/estado_bloque4.py`.",
        "",
        f"**{len(cert)}/{total} certificadas · {len(blo)} bloqueadas · "
        f"{len(pen)} pendientes**",
        "",
        f"De las certificadas: **{fixed} `FIXED_CERTIFIED`** (habia un defecto y se "
        f"corrigio) y **{passed} `PASS_CERTIFIED`** (ya estaba bien y queda protegida).",
        "",
        f"Contador inviolable: {len(cert)} + {len(blo)} + {len(pen)} = "
        f"{len(cert) + len(blo) + len(pen)}",
        "",
        "El denominador se DERIVA de 104 modulos de operacion del arbol mediante",
        "`capacidades_operacion.py`. Un guardian falla si un modulo queda huerfano",
        "o si una capacidad se queda sin modulos.",
        "",
    ]

    for titulo, grupo in (("Certificadas", cert), ("Bloqueadas", blo), ("Pendientes", pen)):
        lineas += [f"## {titulo} ({len(grupo)})", ""]
        if not grupo:
            lineas += ["_ninguna._", ""]
            continue
        for nombre in grupo:
            v = caps[nombre]
            lineas.append(f"- `{nombre}` — {v['estado']} · {v['familia']} · {v['modulos']} modulos")
        lineas.append("")

    return "\n".join(lineas)


def escribir() -> Path:
    DOCUMENTO.write_text(texto(), encoding="utf-8")
    return DOCUMENTO


if __name__ == "__main__":
    print(escribir())
