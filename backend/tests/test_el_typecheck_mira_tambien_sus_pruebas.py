"""«typecheck = 0» no significa nada si no dice sobre CUANTOS ficheros.

EL FALLO QUE ESTE GUARDIAN IMPIDE, Y QUE YA OCURRIO
---------------------------------------------------
Se certifico «typecheck: 0 errores» durante semanas. Era verdad, y era
irrelevante: `apps/web/tsconfig.json` enumeraba DIECINUEVE patrones `__tests__`
en su `exclude`, asi que el 0 se referia a un programa que no contenia ni una
sola prueba de backend. Al quitarlas aparecieron 791 errores en 104 ficheros.

Un exit 0 no distingue «no hay errores» de «no he mirado nada». Solo el
DENOMINADOR lo distingue, y por eso este guardian cuenta ficheros en vez de
confiar en un codigo de salida.

QUE EXIGE
---------
1. Que exista un tsconfig de pruebas y que NO excluya pruebas.
2. Que TODA prueba del arbol caiga dentro de su programa. Ni una huerfana.
3. Que los dos denominadores sean > 0: producto y pruebas.
4. Que exista el comando canonico para ejecutarlo.

POR QUE NO EJECUTA `tsc`
------------------------
Tardaria minutos y ya hay un comando para eso. Lo que aqui se vigila es otra
cosa: que el programa COMPRENDA lo que dice comprender. Un `tsc` verde sobre un
programa vacio es exactamente el fallo original.

COSTE EXTERNO: 0 EUR. Se leen ficheros.
"""
from __future__ import annotations

import json
import pathlib
import re

RAIZ = pathlib.Path(__file__).resolve().parents[2]
WEB = RAIZ / "apps" / "web"
CONFIG_PRODUCTO = WEB / "tsconfig.json"
CONFIG_PRUEBAS = WEB / "tsconfig.tests.json"


def _leer_jsonc(p: pathlib.Path) -> dict:
    """tsconfig admite comentarios; `json` no."""
    texto = p.read_text(encoding="utf-8")
    texto = re.sub(r"//[^\n\"]*$", "", texto, flags=re.M)
    return json.loads(texto)


def _es_prueba(rel: str) -> bool:
    return "__tests__/" in rel or rel.endswith(".test.ts") or rel.endswith(".test.tsx")


def _todos_los_ficheros() -> list[str]:
    fuera: list[str] = []
    for base in (RAIZ / "backend", WEB / "src"):
        for p in base.rglob("*.ts*"):
            rel = p.relative_to(RAIZ).as_posix()
            if "node_modules" in rel or "/.venv/" in rel or not p.is_file():
                continue
            if p.suffix not in (".ts", ".tsx"):
                continue
            fuera.append(rel)
    return sorted(fuera)


def _cubierto_por_pruebas(rel: str, cfg: dict) -> bool:
    """El programa de pruebas incluye todo `backend/**` y todo `apps/web/**`.

    Se comprueba contra el `exclude` real, que es donde vivia el fallo.
    """
    for patron in cfg.get("exclude", []):
        limpio = patron.replace("../../", "").replace("**/", "").rstrip("/*")
        if not limpio or limpio == "node_modules":
            continue
        if limpio in rel:
            return False
    return rel.startswith("backend/") or rel.startswith("apps/web/src/")


def test_existe_un_tsconfig_de_pruebas():
    """Sin el, las pruebas no las comprueba nadie y nadie se entera."""
    assert CONFIG_PRUEBAS.is_file(), (
        "no existe apps/web/tsconfig.tests.json. Sin un programa que contenga "
        "las pruebas, «typecheck 0» habla solo del producto."
    )


def test_el_tsconfig_de_pruebas_no_excluye_pruebas():
    """LA REGLA QUE FALLO.

    Excluir `__tests__` del config de PRUEBAS lo vaciaria de contenido dejando
    el exit 0 intacto — que es exactamente como paso desapercibido antes.
    """
    cfg = _leer_jsonc(CONFIG_PRUEBAS)
    culpables = [p for p in cfg.get("exclude", []) if "__tests__" in p or ".test." in p]
    assert not culpables, (
        "el tsconfig de PRUEBAS excluye pruebas, que es como se consigue un 0 "
        f"que no significa nada: {culpables}"
    )


def test_ninguna_prueba_se_queda_fuera_del_programa():
    """Una prueba que no comprueba nadie es una prueba que puede dejar de
    compilar sin que salte ninguna alarma."""
    cfg = _leer_jsonc(CONFIG_PRUEBAS)
    huerfanas = [
        r for r in _todos_los_ficheros() if _es_prueba(r) and not _cubierto_por_pruebas(r, cfg)
    ]
    assert not huerfanas, (
        f"{len(huerfanas)} pruebas quedan fuera del typecheck. Las primeras: "
        + ", ".join(huerfanas[:8])
    )


def test_los_dos_denominadores_son_mayores_que_cero():
    """EL CONTROL POSITIVO.

    Si un dia el barrido dejara de encontrar ficheros, todo lo de arriba pasaria
    en verde sin haber mirado nada. Esto lo hace imposible.
    """
    todos = _todos_los_ficheros()
    pruebas = [r for r in todos if _es_prueba(r)]
    producto = [r for r in todos if not _es_prueba(r)]

    assert len(producto) > 0, "PRODUCT_FILES_CHECKED = 0: el barrido no mira nada"
    assert len(pruebas) > 0, "TEST_FILES_CHECKED = 0: el barrido no ve ninguna prueba"

    # Y que no se desplomen. Un `include` mal escrito puede dejar cuatro
    # ficheros en pie y seguir siendo «> 0».
    assert len(pruebas) >= 700, f"solo {len(pruebas)} pruebas visibles; antes habia ~981"
    assert len(producto) >= 1000, f"solo {len(producto)} ficheros de producto visibles"


def test_existe_el_comando_canonico():
    """Un tsconfig que no ejecuta nadie es documentacion, no una puerta."""
    pkg = json.loads((WEB / "package.json").read_text(encoding="utf-8"))
    scripts = pkg.get("scripts", {})
    assert "typecheck" in scripts, "falta el comando de typecheck del producto"
    assert "typecheck:tests" in scripts, (
        "falta `typecheck:tests`. Sin comando, el tsconfig de pruebas no lo "
        "ejecuta nadie y volvemos al punto de partida."
    )
    assert "tsconfig.tests.json" in scripts["typecheck:tests"], (
        "`typecheck:tests` no apunta al tsconfig de pruebas"
    )
