"""
Lo que nunca puede acabar en un log ni en una URL.

HALLAZGO: en `routers/auth.py`, el callback de OAuth registraba
`token_response.text` ENTERO —el cuerpo del endpoint de tokens, que es
literalmente donde viven los tokens— y ademas lo metia en el redirect de error,
o sea en la URL del navegador, en el historial y en la cabecera `Referer`.

`routers/oauth_integrations.py` ya hacia lo correcto en el mismo repositorio:
recorte en el log y mensaje generico al usuario. Ese contraste es la evidencia
de que era un descuido y no una decision.

El guard es de CLASE: barre todas las llamadas a logger de servicios, routers,
core, dependencias y middlewares buscando argumentos con nombre sensible.
"""
from __future__ import annotations

import ast
import os
import re
from pathlib import Path

import pytest

RAIZ = Path(__file__).resolve().parent.parent
CARPETAS = ("services", "routers", "core", "dependencies", "middlewares")

#: `token` a secas queda fuera a proposito: `token_url` es un endpoint publico y
#: generaria ruido. Pero los tokens CONCRETOS si entran — excluirlos por evitar
#: ese ruido fue el hueco que tuvo la primera version de este detector.
SENSIBLE = re.compile(
    r"password|passwd|secret|api_key|apikey|authorization|credential|private_key"
    r"|access_key|access_token|refresh_token|id_token|bearer",
    re.I,
)

#: Argumentos que NOMBRAN algo sensible pero no lo exponen. Cada uno con su
#: motivo: una allowlist sin razon escrita es una excepcion disfrazada.
PERMITIDOS = {
    "token_url": "endpoint del proveedor, no una credencial",
    "credentials_configured": "booleano de configuracion, no el valor",
    "has_api_key": "booleano, no la clave",
}


def _llamadas_a_logger():
    for carpeta in CARPETAS:
        base = RAIZ / carpeta
        if not base.exists():
            continue
        for f in sorted(base.rglob("*.py")):
            if "__pycache__" in str(f):
                continue
            try:
                arbol = ast.parse(f.read_text(encoding="utf-8"))
            except SyntaxError:  # pragma: no cover
                pytest.fail(f"{f.name} no parsea")
            rel = str(f.relative_to(RAIZ)).replace(os.sep, "/")
            for n in ast.walk(arbol):
                if not isinstance(n, ast.Call):
                    continue
                fn = n.func
                if not (isinstance(fn, ast.Attribute) and fn.attr in
                        ("debug", "info", "warning", "error", "exception", "critical")):
                    continue
                if not (isinstance(fn.value, ast.Name) and "log" in fn.value.id.lower()):
                    continue
                for a in list(n.args[1:]) + [k.value for k in n.keywords]:
                    yield rel, n.lineno, ast.unparse(a)


def test_el_barrido_encuentra_llamadas_de_verdad():
    """Sin esto, un barrido roto daria cero hallazgos y pareceria limpio."""
    assert len(list(_llamadas_a_logger())) > 50


def test_ningun_log_recibe_un_argumento_con_nombre_sensible():
    culpables = []
    for rel, linea, arg in _llamadas_a_logger():
        if not SENSIBLE.search(arg):
            continue
        # Recortes y hashes no exponen el valor.
        if "hash" in arg.lower() or "[:8]" in arg or "bool(" in arg:
            continue
        if arg.strip() in PERMITIDOS:
            continue
        culpables.append(f"{rel}:{linea} -> {arg[:60]}")
    assert culpables == [], f"posibles secretos en logs: {culpables}"


def test_el_detector_reconoceria_el_patron_si_volviese():
    """
    Positivo conocido: cero hallazgos solo vale si el detector detecta. Se le da
    el argumento exacto que tenia el codigo antes de la correccion.
    """
    assert SENSIBLE.search("payload['access_token']")
    assert SENSIBLE.search("user_password")
    assert not SENSIBLE.search("workspace_id")


def test_el_callback_no_devuelve_el_cuerpo_del_proveedor_al_navegador():
    """Regresion del hallazgo: la URL de error no puede llevar el cuerpo."""
    src = (RAIZ / "routers" / "auth.py").read_text(encoding="utf-8")
    assert "redirect_with_error(f\"Token exchange failed: {token_response.text}\")" not in src
    assert 'redirect_with_error("Token exchange failed")' in src


def test_el_cuerpo_del_proveedor_se_registra_acotado():
    """Registrar el cuerpo entero de un endpoint de tokens es la fuga."""
    src = (RAIZ / "routers" / "auth.py").read_text(encoding="utf-8")
    import re as _re

    crudos = _re.findall(r"token_response\.text(?!\[)", src)
    assert crudos == [], f"{len(crudos)} usos del cuerpo sin recortar"
