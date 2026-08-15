"""El upstream tiene que respetar la matriz de roles del producto.

POR QUE ESTE GUARD
------------------
`apps/web/src/core/routing/roleMatrix.ts` es el contrato de producto: dice que
rol minimo hace falta para ver, crear, editar y borrar en cada modulo. Pero esa
matriz vive en el FRONTEND, y el frontend solo decide que botones se pintan.

Quien manda de verdad es la dependencia de FastAPI. Si el boton esta oculto pero
el endpoint acepta la peticion, la autorizacion es decorativa: basta un `curl`.

EL DESVIO QUE SE ENCONTRO
-------------------------
Comparando ecommerce endpoint por endpoint contra la matriz aparecieron TRES
discrepancias, en las dos direcciones:

    view    matriz `member`    upstream `require_workspace`
                               -> mas laxo: `viewer` podia leer
    create  matriz `member`    upstream `require_workspace_operator`
                               -> mas estricto: `member` NO podia crear
    delete  matriz `admin`     upstream `require_workspace_operator`
                               -> MAS LAXO Y DESTRUCTIVO: un `operator` podia
                                  borrar un proyecto de tienda entero

La de `create` no era una decision pendiente: `require_workspace_member` ya
existia y su docstring dice literalmente que se creo porque «el producto permite
a `member` crear en crm, inbox, campaigns, ads, social, funnels y ECOMMERCE
(`roleMatrix.ts`)». La primitiva estaba; ecommerce nunca se conecto a ella.

QUE COMPRUEBA
-------------
Que cada endpoint cuyo verbo la matriz define use la dependencia que le
corresponde. `generate`, `publish` y `discounts` NO tienen verbo en la matriz y
se dejan como estan: este guard no inventa politica donde el producto no la ha
escrito.

AUTOMATIONS
-----------
Automations mantiene su autoridad en `require_workspace_operator`, que es
exactamente lo que la matriz pide (`create`/`edit`: operator) y lo que excluye a
`member` y `viewer`. No se declaran capabilities nominales en el BFF porque la
capa actual no puede expresarlas: `mapWorkspaceRoleToSaas` colapsa `operator` y
`member` en el mismo valor. Esa deuda esta registrada en
`docs/ops/DEUDA_ARQUITECTURA_RBAC.md`; hasta que se resuelva, la autoridad real
es la del upstream y es esta la que se certifica.
"""
from __future__ import annotations

import re
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent.parent
MATRIZ = REPO / "apps" / "web" / "src" / "core" / "routing" / "roleMatrix.ts"
ROUTERS = REPO / "backend" / "routers"

#: Rol minimo de la matriz -> dependencia de FastAPI que lo implementa.
#: No hay ninguna primitiva nueva: las cuatro ya existian.
DEPENDENCIA_POR_ROL = {
    "member": "require_workspace_member",     # owner, admin, operator, member (viewer NO)
    "operator": "require_workspace_operator",  # owner, admin, operator
    "admin": "require_workspace_admin",        # owner, admin
}

#: Endpoints de ecommerce y el verbo de la matriz que les corresponde.
#: `generate`, `publish` y `discounts` quedan fuera A PROPOSITO: la matriz no
#: define un verbo para ellos y este guard no se lo inventa.
ECOMMERCE = {
    ("GET", "/projects"): "view",
    ("GET", "/projects/{project_id}"): "view",
    ("GET", "/projects/{project_id}/analytics"): "view",
    ("GET", "/templates"): "view",
    ("POST", "/projects"): "create",
    ("POST", "/projects/{project_id}/products"): "create",
    ("PUT", "/projects/{project_id}/products/{product_id}"): "edit",
    ("DELETE", "/projects/{project_id}"): "delete",
    ("DELETE", "/projects/{project_id}/products/{product_id}"): "delete",
}

#: Rutas de automations que mutan, con la dependencia que deben conservar.
AUTOMATIONS_MUTANTES = {
    ("backend/routers/workflows_visual.py", "require_workspace_operator"),
    ("backend/routers/workflow_engine.py", "require_workspace_operator"),
}


def matriz_modulo(modulo: str) -> dict[str, str]:
    """Lee el rol minimo por verbo directamente del contrato de producto."""
    texto = MATRIZ.read_text(encoding="utf-8")
    m = re.search(rf"^\s*{modulo}:\s*\{{([^}}]*)\}}", texto, re.M)
    assert m, f"{modulo} no aparece en roleMatrix.ts"
    return dict(re.findall(r'(\w+):\s*"(\w+)"', m.group(1)))


def dependencias(fichero: Path, variable: str) -> dict[tuple[str, str], str]:
    """(metodo, ruta) -> dependencia declarada, leido del router real."""
    s = fichero.read_text(encoding="utf-8")
    fuera: dict[tuple[str, str], str] = {}
    for m in re.finditer(rf'@{variable}\.(get|post|put|patch|delete)\(\s*"([^"]*)"', s):
        cuerpo = s[m.end(): s.find("):", m.end())]
        dep = re.search(r"Depends\((require_\w+)\)", cuerpo)
        fuera[(m.group(1).upper(), m.group(2))] = dep.group(1) if dep else "(ninguna)"
    return fuera


def test_el_barrido_lee_la_matriz_y_los_routers():
    """Control positivo: sin datos a ambos lados, el guard seria decorativo."""
    eco = matriz_modulo("ecommerce")
    assert eco == {"view": "member", "create": "member", "edit": "operator", "delete": "admin"}, (
        f"la matriz de ecommerce cambio: {eco}. Si es intencionado, actualiza este guard "
        "y los tests de operacion; no al reves."
    )
    auto = matriz_modulo("automations")
    assert auto["create"] == "operator" and auto["edit"] == "operator", (
        f"la matriz de automations cambio: {auto}"
    )
    deps = dependencias(ROUTERS / "os_store_builder.py", "os_store_router")
    assert len(deps) >= 10, f"solo {len(deps)} endpoints de tienda; el barrido esta roto"


def test_ecommerce_respeta_la_matriz_endpoint_por_endpoint():
    """El desvio que se encontro: tres discrepancias en las dos direcciones."""
    matriz = matriz_modulo("ecommerce")
    deps = dependencias(ROUTERS / "os_store_builder.py", "os_store_router")
    desvios = []
    for clave, verbo in ECOMMERCE.items():
        rol = matriz[verbo]
        esperada = DEPENDENCIA_POR_ROL[rol]
        real = deps.get(clave, "(no existe)")
        if real != esperada:
            desvios.append(f"{clave[0]} {clave[1]} ({verbo}={rol}): {real} != {esperada}")
    assert not desvios, "ecommerce no respeta la matriz:\n  " + "\n  ".join(desvios)


def test_las_operaciones_sin_verbo_en_la_matriz_no_se_tocan():
    """Control negativo: no inventar politica donde el producto no la escribio.

    `generate`, `publish` y `discounts` no tienen verbo en la matriz. Conservan
    `require_workspace_operator`, que es lo que tenian. Si alguien las relaja a
    `member` sin decidirlo, esto lo dice.
    """
    deps = dependencias(ROUTERS / "os_store_builder.py", "os_store_router")
    for ruta in ("/projects/{project_id}/generate",
                 "/projects/{project_id}/publish",
                 "/projects/{project_id}/discounts"):
        assert deps.get(("POST", ruta)) == "require_workspace_operator", (
            f"{ruta} cambio de dependencia sin que la matriz defina su verbo: "
            f"{deps.get(('POST', ruta))}"
        )


def test_automations_conserva_la_autoridad_en_el_upstream():
    """La decision B: la autoridad real vive en el upstream, no en el BFF."""
    for rel, esperada in AUTOMATIONS_MUTANTES:
        f = REPO / rel
        s = f.read_text(encoding="utf-8")
        mutantes = re.findall(
            r'@\w+\.(post|put|patch|delete)\(\s*"([^"]*)"', s
        )
        assert mutantes, f"{rel} ya no declara endpoints mutantes"
        deps = dependencias(f, re.search(r"(\w+)\s*=\s*APIRouter", s).group(1))
        flojas = [
            f"{m} {r} -> {d}" for (m, r), d in deps.items()
            if m in ("POST", "PUT", "PATCH", "DELETE") and d != esperada
        ]
        assert not flojas, (
            f"{rel}: mutaciones de automations sin {esperada}:\n  " + "\n  ".join(flojas)
        )


def test_ninguna_mutacion_de_estos_modulos_se_queda_sin_dependencia():
    """Fail-closed estructural: una ruta nueva sin `Depends` cae aqui."""
    huerfanas = []
    for rel in ("backend/routers/os_store_builder.py",
                "backend/routers/workflows_visual.py",
                "backend/routers/workflow_engine.py"):
        f = REPO / rel
        s = f.read_text(encoding="utf-8")
        var = re.search(r"(\w+)\s*=\s*APIRouter", s).group(1)
        for (metodo, ruta), dep in dependencias(f, var).items():
            if metodo in ("POST", "PUT", "PATCH", "DELETE") and dep == "(ninguna)":
                huerfanas.append(f"{rel}: {metodo} {ruta}")
    assert not huerfanas, (
        "rutas mutantes sin dependencia de autorizacion:\n  " + "\n  ".join(huerfanas)
    )
