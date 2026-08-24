"""Genera `docs/BLOQUE_3_ESTADO.md` desde el estado de capacidades de IA.

Mismo trinquete que el del Bloque 2 y por la misma razon: un resumen escrito a
mano se queda atras y se lee con la misma confianza que uno al dia. En el Bloque
2 llego a anunciar "14/39 certificadas" con el JSON en 38.
"""

from __future__ import annotations

import json
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[3]
ESTADO = Path(__file__).with_name("capacidades_ia_estado.json")
DOCUMENTO = RAIZ / "docs" / "BLOQUE_3_ESTADO.md"


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

    lineas = [
        "# BLOQUE 3 — estado vivo",
        "",
        "> GENERADO. No se edita a mano: sale de",
        "> `backend/db/certificacion/capacidades_ia_estado.json` mediante",
        "> `backend/db/certificacion/estado_bloque3.py`.",
        "",
        f"**{len(cert)}/{total} certificadas · {len(blo)} bloqueadas · "
        f"{len(pen)} pendientes**",
        "",
        f"Contador inviolable: {len(cert)} + {len(blo)} + {len(pen)} = "
        f"{len(cert) + len(blo) + len(pen)}",
        "",
        "El denominador se DERIVA de 2224 modulos de IA del arbol mediante",
        "`capacidades_ia.py`. Un guardian falla si un modulo queda huerfano o si",
        "una capacidad se queda sin modulos: no se puede inflar ni desinflar.",
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
