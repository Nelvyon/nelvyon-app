"""Todo path upstream que invoca un BFF tiene que existir en algun router FastAPI.

EL FALLO QUE ESTO IMPIDE
------------------------
`apps/web/src/app/api/platform/ecommerce/projects/[id]/route.ts` exporta un PUT
que proxya a

    PUT /api/os/store/projects/{id}

y ese endpoint NO existe: `os_store_builder.py` define POST, GET, generate,
publish, products y delete, pero ningun PUT sobre el proyecto. El BFF propaga el
404 honestamente —no lo disfraza de exito—, pero promete una capacidad que el
backend nunca implemento.

Nadie lo detecto porque un BFF que proxya a la nada no falla al construir, no
falla al desplegar y no falla en ningun test: solo devuelve 404 cuando alguien
lo llama. Y en este caso no lo llama nadie desde la UI.

QUE COMPRUEBA
-------------
Que cada (metodo, path) que un BFF de `platform/*` invoca hacia arriba
corresponde a un endpoint declarado en `backend/routers/`.

Solo se miran los paths resolubles estaticamente: literales y plantillas cuyo
unico hueco es una interpolacion (`/api/workflows/${id}`), que se normaliza. Un
path construido dinamicamente no se puede comprobar asi, y se ignora en vez de
inventarse una respuesta.
"""
from __future__ import annotations

import re
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent.parent
PLAT = REPO / "apps" / "web" / "src" / "app" / "api" / "platform"
ROUTERS = REPO / "backend" / "routers"

#: `proxyPlatformFetch(req, "PUT", "/api/x")` y `adsBffPost(req, "/api/x")`.
_PROXY = re.compile(
    r"""proxyPlatformFetch\s*\(\s*[^,]+,\s*["'](GET|POST|PUT|PATCH|DELETE)["']\s*,\s*[`"']([^`"']+)[`"']""",
    re.S,
)
_BFF = re.compile(r"""(\w*Bff(?:Get|Post|Put|Patch|Delete))\s*\(\s*[^,]+,\s*[`"']([^`"']+)[`"']""")

_DECOR = re.compile(r'@(\w+)\.(get|post|put|patch|delete)\(\s*["\']([^"\']*)["\']')

#: Excepciones justificadas: paths que no se pueden resolver estaticamente.
#: Vacio a proposito — si hace falta anadir algo, que sea con motivo escrito.
IGNORADOS: set[tuple[str, str]] = set()


def _normaliza(p: str) -> str:
    # La query no forma parte de la ruta declarada en FastAPI: sin quitarla,
    # `/api/x?period=${p}` nunca casaria y el guard seria ruido.
    p = p.split("?")[0]
    # Una interpolacion precedida de `/` es un SEGMENTO (`/projects/${id}`).
    # Si no lo esta, es un sufijo —tipicamente una query ya montada, como
    # `/dashboard${refresh}`— y no forma parte de la ruta declarada.
    p = re.sub(r"(?<=/)\$\{[^}]*\}", "{}", p)
    p = re.sub(r"\$\{[^}]*\}", "", p)
    p = re.sub(r"\{[^}]*\}", "{}", p)
    return p.rstrip("/") or "/"


def endpoints_fastapi() -> set[tuple[str, str]]:
    """(metodo, path normalizado) de todo endpoint declarado en los routers."""
    encontrados: set[tuple[str, str]] = set()
    for f in ROUTERS.glob("*.py"):
        txt = f.read_text(encoding="utf-8", errors="replace")
        prefijos = {}
        for m in re.finditer(r"(\w+)\s*=\s*APIRouter\(([^)]*)\)", txt, re.S):
            pm = re.search(r'prefix\s*=\s*["\']([^"\']*)["\']', m.group(2))
            prefijos[m.group(1)] = pm.group(1) if pm else ""
        for m in _DECOR.finditer(txt):
            var, metodo, path = m.group(1), m.group(2).upper(), m.group(3)
            encontrados.add((metodo, _normaliza(prefijos.get(var, "") + path)))
    return encontrados


def llamadas_bff() -> dict[tuple[str, str], set[str]]:
    """(metodo, path) que invoca cada BFF, y desde donde."""
    llamadas: dict[tuple[str, str], set[str]] = {}
    for f in PLAT.rglob("route.ts"):
        txt = f.read_text(encoding="utf-8", errors="replace")
        rel = f.relative_to(PLAT).parent.as_posix()
        for metodo, path in _PROXY.findall(txt):
            if path.startswith("/api/"):
                llamadas.setdefault((metodo, _normaliza(path)), set()).add(rel)
        for helper, path in _BFF.findall(txt):
            if not path.startswith("/api/"):
                continue
            met = "GET" if helper.endswith("Get") else helper[-4:].upper().lstrip("F")
            met = {"POST": "POST", "PUT": "PUT", "ATCH": "PATCH", "LETE": "DELETE"}.get(met, met)
            if helper.endswith("Post"):
                met = "POST"
            llamadas.setdefault((met, _normaliza(path)), set()).add(rel)
    return llamadas


def test_el_barrido_ve_ambos_lados():
    """Control positivo: sin esto, un regex roto daria verde con cero datos."""
    eps = endpoints_fastapi()
    lls = llamadas_bff()
    assert len(eps) > 500, f"solo {len(eps)} endpoints FastAPI; el barrido esta roto"
    assert len(lls) > 15, f"solo {len(lls)} llamadas BFF; el barrido esta roto"
    assert ("POST", "/api/funnels") in eps, "no se detecta POST /api/funnels"
    assert any(p.startswith("/api/os/store") for _, p in lls), (
        "no se detectan las llamadas de ecommerce"
    )


def test_el_barrido_normaliza_las_interpolaciones():
    """Control negativo: `${id}` y `{project_id}` son el MISMO hueco.

    Sin esto todo daria "no existe" y el test seria ruido puro.
    """
    assert _normaliza("/api/os/store/projects/${id}") == _normaliza(
        "/api/os/store/projects/{project_id}"
    )
    assert _normaliza("/api/workflows/${id}/activate") == "/api/workflows/{}/activate"


def test_todo_upstream_invocado_por_un_bff_existe():
    """El fallo entero: un BFF que promete lo que el backend no implementa."""
    eps = endpoints_fastapi()
    huerfanas = {
        k: sorted(v) for k, v in llamadas_bff().items()
        if k not in eps and k not in IGNORADOS
    }
    assert not huerfanas, (
        "BFF que proxyan a endpoints inexistentes:\n  "
        + "\n  ".join(f"{m} {p}  <- {rutas}" for (m, p), rutas in sorted(huerfanas.items()))
        + "\nO se implementa el endpoint upstream, o se retira el BFF."
    )
