"""Genera `docs/BLOQUE_2_ESTADO.md` a partir del estado de capacidades.

El documento decia ya que su fuente es `capacidades_estado.json` y que no debe
editarse a mano, pero nada lo impedia: se escribia a mano y se quedaba atras. Y
un resumen que se queda atras es peor que no tenerlo, porque se lee como si
estuviera al dia — el recuento decia "14/39 certificadas" cuando el JSON decia
38.

Aqui se DERIVA. `escribir()` regenera el fichero y `texto()` devuelve lo que
deberia haber, que es lo que compara el guardian para que las dos cosas no
puedan separarse otra vez.
"""

from __future__ import annotations

import json
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[3]
ESTADO = Path(__file__).with_name("capacidades_estado.json")
DOCUMENTO = RAIZ / "docs" / "BLOQUE_2_ESTADO.md"


def _capacidades() -> dict[str, dict]:
    d = json.loads(ESTADO.read_text(encoding="utf-8"))
    return d["capacidades"] if "capacidades" in d else d


def reparto() -> tuple[list[str], list[str], list[str]]:
    """Certificadas, bloqueadas y pendientes, cada una ordenada."""
    caps = _capacidades()
    cert, blo, pen = [], [], []
    for nombre in sorted(caps):
        estado = caps[nombre]["estado"]
        destino = cert if "CERTIFIED" in estado else blo if "BLOCKED" in estado else pen
        destino.append(nombre)
    return cert, blo, pen


def texto() -> str:
    caps = _capacidades()
    cert, blo, pen = reparto()
    total = len(caps)

    lineas = [
        "# BLOQUE 2 — estado vivo",
        "",
        "> GENERADO. No se edita a mano: sale de",
        "> `backend/db/certificacion/capacidades_estado.json` mediante",
        "> `backend/db/certificacion/estado_bloque2.py`.",
        "> Un guardian falla si este fichero y el JSON dejan de coincidir.",
        "",
        f"**{len(cert)}/{total} certificadas · {len(blo)} bloqueadas · "
        f"{len(pen)} pendientes**",
        "",
        f"Contador inviolable: {len(cert)} + {len(blo)} + {len(pen)} = "
        f"{len(cert) + len(blo) + len(pen)}",
        "",
    ]

    for titulo, grupo in (
        ("Certificadas", cert),
        ("Bloqueadas", blo),
        ("Pendientes", pen),
    ):
        lineas += [f"## {titulo} ({len(grupo)})", ""]
        if not grupo:
            lineas += ["_ninguna._", ""]
            continue
        for nombre in grupo:
            estado = caps[nombre]["estado"]
            # `FIXED_CERTIFIED` se distingue a proposito de `PASS_CERTIFIED`:
            # una capacidad que paso a la primera y otra que hubo que arreglar
            # no dicen lo mismo sobre el producto.
            lineas.append(f"- `{nombre}` — {estado}")
        lineas.append("")

    return "\n".join(lineas)


def escribir() -> Path:
    DOCUMENTO.write_text(texto(), encoding="utf-8")
    return DOCUMENTO


if __name__ == "__main__":
    print(escribir())
