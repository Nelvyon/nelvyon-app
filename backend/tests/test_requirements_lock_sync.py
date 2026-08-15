"""El lockfile debe describir lo que `requirements.txt` pide.

POR QUE HACE FALTA VIGILARLO
----------------------------
`requirements.txt` declara intencion: 81 de sus 82 lineas son rangos, asi que dos
instalaciones en dias distintos pueden resolver a versiones distintas.
`requirements.lock.txt` fija el resultado.

Un lockfile solo vale mientras describe la realidad. Si alguien anade un paquete
a `requirements.txt` y no regenera el lock, quien instale desde el lock no tendra
ese paquete —y el fallo aparecera en produccion, no aqui—. Peor: la auditoria de
seguridad se corre sobre el lock, asi que un paquete ausente del lock no se
audita nunca.

Estos tests no comprueban versiones concretas: eso obligaria a tocar el test en
cada actualizacion y acabaria borrandose. Comprueban la relacion entre los dos
ficheros, que es lo que se rompe en silencio.
"""
from __future__ import annotations

import re
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
REQUISITOS = RAIZ / "requirements.txt"
LOCK = RAIZ / "requirements.lock.txt"

#: `nombre[extra]>=1.2` -> `nombre`. Los extras no son distribuciones propias:
#: `python-jose[cryptography]` instala `python-jose`, no un paquete con corchetes.
_NOMBRE = re.compile(r"^\s*([A-Za-z0-9._-]+)")


def _paquetes(ruta: Path, *, solo_pineados: bool = False) -> dict[str, str]:
    fuera: dict[str, str] = {}
    for linea in ruta.read_text(encoding="utf-8").splitlines():
        linea = linea.strip()
        if not linea or linea.startswith("#") or linea.startswith("-"):
            continue
        m = _NOMBRE.match(linea)
        if not m:
            continue
        if solo_pineados and "==" not in linea:
            continue
        # PyPI trata `-`, `_` y `.` como equivalentes y no distingue mayusculas.
        fuera[re.sub(r"[-_.]+", "-", m.group(1)).lower()] = linea
    return fuera


def test_el_lockfile_existe():
    assert LOCK.exists(), (
        "sin lockfile, `pip install -r requirements.txt` resuelve distinto segun "
        "el dia y la auditoria de seguridad no describe nada estable"
    )


def test_todo_lo_declarado_esta_en_el_lock():
    """Si falta un paquete, ni se instala ni se audita."""
    declarados = _paquetes(REQUISITOS)
    bloqueados = _paquetes(LOCK, solo_pineados=True)
    faltan = sorted(set(declarados) - set(bloqueados))
    assert not faltan, (
        "estos paquetes estan en requirements.txt y no en el lock; regenerar con "
        "`pip install -r requirements.txt` en un venv vacio y `pip freeze`:\n  "
        + "\n  ".join(faltan)
    )


def test_todo_el_lock_esta_pineado():
    """Un lock con rangos no fija nada; seria un requirements.txt duplicado."""
    sueltos = [
        l
        for l in LOCK.read_text(encoding="utf-8").splitlines()
        if l.strip() and not l.strip().startswith("#") and "==" not in l
    ]
    assert not sueltos, "lineas sin version exacta en el lock:\n  " + "\n  ".join(sueltos)


def test_el_lock_incluye_las_transitivas():
    """Un lock que solo repite lo declarado no fija la mitad del arbol.

    Control positivo del propio fichero: sin esto, un lock generado mal —copiando
    `requirements.txt` y pineandolo— pasaria los dos tests de arriba.
    """
    declarados = set(_paquetes(REQUISITOS))
    bloqueados = set(_paquetes(LOCK, solo_pineados=True))
    transitivas = bloqueados - declarados
    assert len(transitivas) > 20, (
        f"solo {len(transitivas)} dependencias transitivas en el lock: parece "
        "generado a partir de requirements.txt en vez de una instalacion real"
    )


def test_el_lock_no_arrastra_herramientas_del_entorno():
    """`pip`, `setuptools` y `wheel` los pone el entorno, no el proyecto.

    Fijarlos en el lock rompe instalaciones en entornos con otra version de pip.
    """
    bloqueados = _paquetes(LOCK, solo_pineados=True)
    for herramienta in ("pip", "setuptools", "wheel"):
        assert herramienta not in bloqueados, (
            f"{herramienta} no debe fijarse: lo aporta el entorno"
        )
