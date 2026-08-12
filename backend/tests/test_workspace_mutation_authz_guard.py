"""
Guard estructural: ninguna mutacion workspace-scoped puede quedarse en
`require_workspace`.

El hallazgo que motiva esto: `POST /api/ads-agent/briefing` usaba
`require_workspace` —que solo comprueba PERTENENCIA— mientras sus 21 endpoints
mutantes hermanos usaban `require_workspace_operator`. Nada obligaba a ser
coherente, asi que la excepcion paso inadvertida.

COMO FUNCIONA
-------------
No es un grep. Recorre los `routers/*.py` con el AST de Python (`ast`, libreria
estandar: no anade dependencias), localiza funciones decoradas con
`@<algo>.post/put/patch/delete` y examina los DEFAULTS de sus parametros
buscando `Depends(...)`. Una mutacion que dependa de `require_workspace` sin una
autoridad de rol por encima es un fallo.

Al trabajar sobre el AST detecta routers con cualquier nombre de variable
(`router`, `os_store_router`, `funnel_router`...), que es justo donde un conteo
ingenuo por `@router.` se dejaba endpoints fuera.
"""
from __future__ import annotations

import ast
from pathlib import Path

import pytest

ROUTERS_DIR = Path(__file__).resolve().parent.parent / "routers"

METODOS_MUTANTES = {"post", "put", "patch", "delete"}

#: Dependencias que SI acreditan autoridad de mutacion.
AUTORIDAD_SUFICIENTE = {
    "require_workspace_operator",
    "require_workspace_admin",
    "require_super_admin",
    "require_admin",
    # Escalon intermedio: owner/admin/operator/member, nunca `viewer`. Acredita
    # autoridad de ROL —a diferencia de `require_workspace`, que solo acredita
    # pertenencia— pero es el mas debil de los cuatro.
    "require_workspace_member",
}

#: Autoridad EXIGIDA a las clases sensibles. `require_workspace_member` no basta
#: aqui: gastar dinero, consumir credito de pago o emitir hacia un tercero con la
#: identidad del workspace no es trabajo colaborativo ordinario.
AUTORIDAD_FUERTE = {
    "require_workspace_operator",
    "require_workspace_admin",
    "require_super_admin",
    "require_admin",
}

#: La dependencia debil: acredita pertenencia, no autoridad.
SOLO_PERTENENCIA = "require_workspace"

#: Excepciones por ENDPOINT, nunca por fichero.
#: clave: "<fichero>::<funcion>"
PERMITIDAS: dict[str, dict[str, str]] = {
    # (vacio a proposito: hoy no hay ninguna mutacion legitima que se conforme
    #  con pertenencia. Cualquier alta aqui debe declarar autoridad esperada.)
}


def _dependencias(func: ast.AST) -> set[str]:
    """Nombres pasados a `Depends(...)` en los defaults de la firma."""
    nombres: set[str] = set()
    args = getattr(func, "args", None)
    if args is None:
        return nombres
    defaults = list(args.defaults) + [d for d in args.kw_defaults if d is not None]
    for d in defaults:
        if not isinstance(d, ast.Call):
            continue
        fn = d.func
        if not (isinstance(fn, ast.Name) and fn.id == "Depends"):
            continue
        for a in d.args:
            if isinstance(a, ast.Name):
                nombres.add(a.id)
            elif isinstance(a, ast.Attribute):
                nombres.add(a.attr)
    return nombres


def _es_mutacion(func: ast.AST) -> bool:
    for dec in getattr(func, "decorator_list", []):
        f = dec.func if isinstance(dec, ast.Call) else dec
        # `@<lo_que_sea>.post(...)` — el nombre del router no importa.
        if isinstance(f, ast.Attribute) and f.attr.lower() in METODOS_MUTANTES:
            return True
    return False


def _recolectar_todos() -> list[tuple[str, str, set[str]]]:
    """(fichero, funcion, dependencias) de TODO endpoint, mute o no."""
    out: list[tuple[str, str, set[str]]] = []
    for p in sorted(ROUTERS_DIR.glob("*.py")):
        arbol = ast.parse(p.read_text(encoding="utf-8"))
        for nodo in ast.walk(arbol):
            if isinstance(nodo, (ast.FunctionDef, ast.AsyncFunctionDef)):
                for dec in getattr(nodo, "decorator_list", []):
                    f = dec.func if isinstance(dec, ast.Call) else dec
                    if isinstance(f, ast.Attribute) and f.attr.lower() in (
                        METODOS_MUTANTES | {"get"}
                    ):
                        out.append((p.name, nodo.name, _dependencias(nodo)))
                        break
    return out


def _recolectar() -> list[tuple[str, str, set[str]]]:
    """(fichero, funcion, dependencias) de cada endpoint mutante."""
    out: list[tuple[str, str, set[str]]] = []
    for p in sorted(ROUTERS_DIR.glob("*.py")):
        try:
            arbol = ast.parse(p.read_text(encoding="utf-8"))
        except SyntaxError:  # pragma: no cover
            pytest.fail(f"{p.name} no parsea")
        for nodo in ast.walk(arbol):
            if isinstance(nodo, (ast.FunctionDef, ast.AsyncFunctionDef)) and _es_mutacion(nodo):
                out.append((p.name, nodo.name, _dependencias(nodo)))
    return out


#: Routers auditados en este bloque: los cinco upstream de los BFF delegados.
#: El guard los exige de forma ESTRICTA. El resto del backend queda cubierto por
#: el trinquete de mas abajo, no por confianza.
ROUTERS_AUDITADOS = {
    "workflows.py",
    "workflow_engine.py",
    "os_store_builder.py",
    "funnel_builder.py",
}

#: Routers PLATFORM-SCOPED: consumen un recurso corporativo unico, sin dimension
#: de workspace. Aqui la autoridad de workspace no es "demasiado debil": es de la
#: CLASE equivocada. `ads_agent` opera la unica cuenta Google/Meta de NELVYON, asi
#: que un operator de cualquier workspace no debe alcanzarla ni para leer.
ROUTERS_PLATFORM_SCOPED = {
    "ads_agent.py",
    # google_ads_service / meta_ads_service: cero referencias a workspace o
    # tenant, credenciales y cuenta desde variables de entorno globales.
    "google_ads.py",
    "meta_ads.py",
}

#: Autoridad valida para recursos de plataforma. Deriva del rol del JWT
#: verificado, nunca de `X-Workspace-Id` ni de `workspace_members`.
AUTORIDAD_DE_PLATAFORMA = {"get_super_admin_user", "require_super_admin"}

#: POST/PUT/DELETE que NO mutan: analisis, busqueda, render, previsualizacion.
#: El metodo HTTP no decide la clase. Exigirles autoridad de rol no protegeria
#: nada y quitaria a `viewer` lecturas que le corresponden.
#:
#: La entrada obliga a declarar por que. Sin motivo, el test falla: una
#: allowlist sin justificacion es una excepcion silenciosa con otro nombre.
#: Sustituye al contador `DEUDA_SIN_AUDITAR_MAXIMA = 67`, que solo media cuantos
#: quedaban sin mirar; estos ya estan mirados uno a uno.
LECTURA_JUSTIFICADA: dict[str, str] = {
    "memory.py::search_client_memory":
        "busqueda semantica; el servicio filtra por ctx.workspace_id",
    "templates.py::render_template":
        "render Jinja en memoria; get_template filtra `workspace_id = :ws OR is_public`",
    "saas_intelligence.py::compare_benchmarks":
        "calculo puro contra benchmarks de sector; no persiste ni sale fuera",
    "os_web_builder.py::score_website":
        "puntua un proyecto ya scopeado por workspace_id; no escribe",
    "social_publish.py::preview_post":
        "previsualiza; no programa ni publica en ninguna red",
    "omnichannel.py::suggest_reply":
        "sugiere texto al operador humano; no envia nada",
    "conversation_realtime.py::create_stream_token":
        "emite token para una conversacion que el llamante ya puede leer; "
        "_get_scoped_conversation filtra conversation+user+workspace",
    "gdpr.py::export_user_data":
        "derecho de acceso: exportar los datos PROPIOS no puede depender del rol. "
        "Exportar los de otro sujeto ya exige admin/super_admin dentro del endpoint",
}

#: Clases que exigen AUTORIDAD_FUERTE, fijadas por endpoint.
#:
#: Sin esto, degradar `require_workspace_operator` a `require_workspace_member`
#: en `whatsapp::send_template` seguiria pareciendo correcto —hay autoridad de
#: rol— y nadie lo notaria. La clase se declara aqui para que el guard pueda
#: distinguir "tiene guardia" de "tiene la guardia adecuada".
CLASES_SENSIBLES: dict[str, str] = {
    # dinero
    "marketplace.py::purchase_marketplace_item": "FINANCIAL",
    "affiliates.py::register_affiliate": "FINANCIAL",
    # credenciales / identidad
    "ses.py::verify_domain": "PLATFORM_CREDENTIAL",
    # cuota o credito de pago
    "advisor_entitlements.py::consume_advisor_session": "QUOTA",
    "apollo.py::search_leads": "QUOTA",
    # emision externa irreversible con la identidad del workspace
    "whatsapp.py::send_message": "EXTERNAL_SEND",
    "whatsapp.py::send_template": "EXTERNAL_SEND",
    "whatsapp.py::send_media": "EXTERNAL_SEND",
    "ses.py::send_email": "EXTERNAL_SEND",
    "ses.py::send_bulk_emails": "EXTERNAL_SEND",
    "gsc.py::submit_sitemap": "EXTERNAL_SEND",
    "social_publish.py::publish_now": "EXTERNAL_SEND",
    "social_publish.py::schedule_posts": "EXTERNAL_SEND",
    "email_marketing.py::create_campaign": "EXTERNAL_SEND",
}

#: Dinero: ni siquiera `operator` decide donde se paga o que se compra.
CLASE_FINANCIERA = {k for k, v in CLASES_SENSIBLES.items() if v == "FINANCIAL"}

MUTANTES = _recolectar()
#: Solo las que se declaran workspace-scoped: las que no tocan workspace tienen
#: su propia frontera (cron, webhooks, publicas) y se auditan aparte.
WORKSPACE_SCOPED = [m for m in MUTANTES if SOLO_PERTENENCIA in m[2] or AUTORIDAD_SUFICIENTE & m[2]]
AUDITADOS = [m for m in WORKSPACE_SCOPED if m[0] in ROUTERS_AUDITADOS]
SIN_AUDITAR = [
    m for m in WORKSPACE_SCOPED
    if m[0] not in ROUTERS_AUDITADOS and m[0] not in ROUTERS_PLATFORM_SCOPED
]
#: Todos los endpoints —muten o no— de los routers platform-scoped: en ellos
#: incluso una lectura expone datos corporativos.
PLATFORM = [m for m in _recolectar_todos() if m[0] in ROUTERS_PLATFORM_SCOPED]


def test_el_barrido_encuentra_endpoints_de_verdad():
    """Sin esto, un fallo del AST dejaria el guard verde por vacio."""
    assert len(MUTANTES) > 50, f"solo {len(MUTANTES)} mutaciones halladas"
    assert len(WORKSPACE_SCOPED) > 20, f"solo {len(WORKSPACE_SCOPED)} workspace-scoped"
    ficheros = {m[0] for m in WORKSPACE_SCOPED}
    # Los routers upstream de los BFF delegados deben estar cubiertos.
    for esperado in ("workflows.py", "workflow_engine.py", "os_store_builder.py", "funnel_builder.py"):
        assert esperado in ficheros, f"{esperado} no aparece en el barrido"
    # `ads_agent.py` ya NO debe aparecer aqui: es platform-scoped y se cubre en
    # su propio bloque. Si reapareciera, alguien le habria devuelto autoridad de
    # workspace.
    assert "ads_agent.py" not in ficheros
    assert len(PLATFORM) >= 4, f"solo {len(PLATFORM)} endpoints platform-scoped"


@pytest.mark.parametrize(
    "fichero,funcion,deps",
    [pytest.param(f, fn, d, id=f"{f}::{fn}") for f, fn, d in AUDITADOS],
)
def test_mutacion_workspace_scoped_exige_autoridad(fichero, funcion, deps):
    clave = f"{fichero}::{funcion}"
    if clave in PERMITIDAS:
        assert PERMITIDAS[clave].get("motivo"), f"{clave} en allowlist sin motivo"
        assert PERMITIDAS[clave].get("autoridad_esperada"), f"{clave} sin autoridad declarada"
        return
    assert AUTORIDAD_SUFICIENTE & deps, (
        f"{clave} muta y es workspace-scoped, pero solo depende de "
        f"{sorted(deps)}. `require_workspace` acredita PERTENENCIA, no autoridad: "
        f"usa require_workspace_operator (o admin) como los demas, o justificalo "
        f"en PERMITIDAS con motivo y autoridad esperada."
    )


def test_la_allowlist_no_tiene_entradas_muertas():
    claves = {f"{f}::{fn}" for f, fn, _ in MUTANTES}
    for k in PERMITIDAS:
        assert k in claves, f"{k} ya no existe: limpia la allowlist"


def test_ads_briefing_exige_autoridad_de_plataforma():
    """
    Regresion explicita del hallazgo. Paso por dos estados: primero
    `require_workspace` (pertenencia), luego `require_workspace_operator`, y solo
    al trazar los servicios se vio que la cuenta Google/Meta es unica y
    corporativa. La autoridad correcta es de plataforma.
    """
    encontrado = [m for m in MUTANTES if m[0] == "ads_agent.py" and m[1] == "ads_agent_briefing"]
    assert encontrado, "el endpoint del hallazgo ya no existe: revisa el guard"
    deps = encontrado[0][2]
    assert "get_super_admin_user" in deps
    assert not any(x.startswith("require_workspace") for x in deps)


@pytest.mark.parametrize(
    "fichero,funcion,deps",
    [pytest.param(f, fn, d, id=f"{f}::{fn}") for f, fn, d in SIN_AUDITAR],
)
def test_toda_mutacion_workspace_scoped_declara_su_clase(fichero, funcion, deps):
    """
    Sustituye al contador de deuda. Ya no quedan endpoints "sin mirar": cada
    uno tiene autoridad de rol o una entrada de lectura con motivo escrito.

    Un endpoint nuevo que se conforme con pertenencia falla aqui, y para
    aprobarlo hay que decir en LECTURA_JUSTIFICADA por que no muta.
    """
    clave = f"{fichero}::{funcion}"
    if clave in LECTURA_JUSTIFICADA:
        motivo = LECTURA_JUSTIFICADA[clave]
        assert len(motivo) > 30, f"{clave}: el motivo no explica nada ({motivo!r})"
        return
    assert AUTORIDAD_SUFICIENTE & deps, (
        f"{clave} es workspace-scoped y solo depende de {sorted(deps)}. "
        f"`require_workspace` acredita PERTENENCIA —incluida la de `viewer`—, no "
        f"autoridad. Usa require_workspace_member (trabajo diario), "
        f"require_workspace_operator (mutacion de negocio) o require_workspace_admin "
        f"(dinero); si de verdad no muta, declaralo en LECTURA_JUSTIFICADA."
    )


@pytest.mark.parametrize("clave,clase", sorted(CLASES_SENSIBLES.items()))
def test_las_clases_sensibles_exigen_autoridad_fuerte(clave, clase):
    """
    Tener guardia no es tener la guardia adecuada.

    `require_workspace_member` acredita autoridad de rol, asi que un endpoint
    que gasta dinero o emite un WhatsApp con el numero de NELVYON pasaria el
    test generico sin problema. Aqui no.
    """
    fichero, funcion = clave.split("::")
    encontrado = [m for m in MUTANTES if m[0] == fichero and m[1] == funcion]
    assert encontrado, f"{clave} ya no existe: actualiza CLASES_SENSIBLES"
    deps = encontrado[0][2]
    exigido = AUTORIDAD_FUERTE - {"require_workspace_member"}
    if clase == "PLATFORM_CREDENTIAL":
        # Anade una identidad a la cuenta SES unica de NELVYON y no queda
        # constancia de que workspace la posee: ningun rol de workspace sirve.
        exigido = {"get_super_admin_user", "require_super_admin"}
    elif clave in CLASE_FINANCIERA:
        exigido = {"require_workspace_admin", "require_super_admin", "require_admin"}
    assert exigido & deps, (
        f"{clave} es de clase {clase} pero depende de {sorted(deps)}. "
        f"Se exige una de {sorted(exigido)}."
    )


def test_la_lectura_justificada_no_tiene_entradas_muertas():
    claves = {f"{f}::{fn}" for f, fn, _ in MUTANTES}
    huerfanas = [k for k in LECTURA_JUSTIFICADA if k not in claves]
    assert huerfanas == [], f"entradas muertas en LECTURA_JUSTIFICADA: {huerfanas}"


def test_ninguna_lectura_justificada_es_ademas_sensible():
    """Contradiccion imposible: no puede a la vez no mutar y gastar dinero."""
    solapan = set(LECTURA_JUSTIFICADA) & set(CLASES_SENSIBLES)
    assert solapan == set(), f"clasificados como lectura Y como sensibles: {solapan}"


@pytest.mark.parametrize(
    "fichero,funcion,deps",
    [pytest.param(f, fn, d, id=f"{f}::{fn}") for f, fn, d in PLATFORM],
)
def test_recurso_de_plataforma_exige_autoridad_de_plataforma(fichero, funcion, deps):
    """
    El defecto de ads no fue una dependencia demasiado debil: fue la CLASE de
    autoridad equivocada. Autorizar por workspace un recurso que no tiene
    workspace protege correctamente el recurso equivocado.
    """
    assert AUTORIDAD_DE_PLATAFORMA & deps, (
        f"{fichero}::{funcion} consume un recurso corporativo unico pero depende de "
        f"{sorted(deps)}. Un rol de workspace no acredita autoridad sobre la cuenta "
        f"de NELVYON: usa get_super_admin_user."
    )


def test_ningun_endpoint_de_plataforma_usa_autoridad_de_workspace():
    contaminados = [
        f"{f}::{fn}" for f, fn, d in PLATFORM
        if any(x.startswith("require_workspace") for x in d)
    ]
    assert contaminados == [], (
        f"estos endpoints platform-scoped siguen autorizando por workspace: {contaminados}"
    )


#: Routers customer-facing cuyo proveedor externo tenia cuenta GLOBAL. No son
#: platform-scoped —sus datos si llevan workspace_id— pero jamas pueden caer a
#: la cuenta corporativa: sin integracion propia se falla cerrado.
ROUTERS_CUSTOMER_SIN_FALLBACK = {"snapchat_ads.py": "snapchat", "tiktok_ads.py": "tiktok"}


@pytest.mark.parametrize("fichero,proveedor", sorted(ROUTERS_CUSTOMER_SIN_FALLBACK.items()))
def test_customer_ads_no_usan_mera_pertenencia(fichero, proveedor):
    src = (ROUTERS_DIR / fichero).read_text(encoding="utf-8")
    assert "Depends(require_workspace)" not in src, (
        f"{fichero} volvio a autorizar por mera pertenencia; usa require_workspace_operator"
    )


@pytest.mark.parametrize("fichero,proveedor", sorted(ROUTERS_CUSTOMER_SIN_FALLBACK.items()))
def test_customer_ads_no_exponen_la_cuenta_corporativa(fichero, proveedor):
    """`/status` llego a devolver el id de la cuenta global a cualquier miembro."""
    src = (ROUTERS_DIR / fichero).read_text(encoding="utf-8")
    for filtracion in ("svc.ad_account_id", "svc.advertiser_id"):
        assert filtracion not in src, f"{fichero} expone {filtracion} de la cuenta corporativa"


@pytest.mark.parametrize("fichero,proveedor", sorted(ROUTERS_CUSTOMER_SIN_FALLBACK.items()))
def test_creacion_de_campana_exige_integracion_propia(fichero, proveedor):
    """La guarda vive en el servicio, antes de la red."""
    servicio = ROUTERS_DIR.parent / "services" / f"{proveedor}_ads_service.py"
    src = servicio.read_text(encoding="utf-8")
    i = src.index("async def create_campaign")
    j = src.index("httpx.AsyncClient", i)
    assert "assert_workspace_ads_integration" in src[i:j], (
        f"{servicio.name}: create_campaign puede alcanzar la red sin exigir integracion propia"
    )
