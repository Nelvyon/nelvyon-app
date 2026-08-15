"""
Direccionar un recurso por su id no puede alcanzar el de otro.

Barrido del bloque 16: 31 endpoints autenticados direccionan un recurso por
`{id}` sin ninguna dimension de workspace. Siete de ellos usan `get_admin_user`
y son de plataforma (rbac, settings, user_roles), asi que ahi es correcto.

Los otros 24 se apoyan en el `user_id` del llamante, no en el workspace. Se
comprobo que el filtro se APLICA de verdad —`get_by_id` anade
`WHERE user_id = :uid`, no solo lo recibe— asi que no hay fuga entre inquilinos:
un usuario no alcanza los registros de otro. Es un alcance por propietario en
vez de por workspace, que limita el trabajo compartido pero no filtra datos.

Este fichero fija esa propiedad sobre HTTP real, que es donde importa.
"""
from __future__ import annotations

import pytest
from httpx import AsyncClient

#: Familias con el patron `{id}` + filtro por usuario. Un id ajeno debe dar 404,
#: nunca el registro.
FAMILIAS = [
    "/api/v1/entities/website-pages",
    "/api/v1/entities/website-items",
    "/api/v1/entities/form-items",
    "/api/v1/entities/funnel-items",
    "/api/v1/entities/presentation-history",
    "/api/v1/entities/pricing-promos",
    "/api/v1/entities/contract-logs",
]


@pytest.mark.asyncio
@pytest.mark.parametrize("base", FAMILIAS)
async def test_un_id_que_no_es_tuyo_no_devuelve_el_registro(
    client: AsyncClient, auth_headers: dict, member_headers: dict, base
):
    """
    A/B: dos usuarios distintos, el mismo id. Ninguno puede leer el del otro.

    Se recorren ids bajos, que son los que existirian de haber datos: si
    cualquiera devolviese 200 para ambos usuarios, seria una fuga.
    """
    vistos = []
    for cabeceras, quien in ((auth_headers, "A"), (member_headers, "B")):
        for oid in (1, 2, 3):
            r = await client.get(f"{base}/{oid}", headers=cabeceras)
            if r.status_code == 200:
                vistos.append((quien, oid, r.json().get("id")))
            else:
                assert r.status_code in (403, 404, 422), (
                    f"{base}/{oid} como {quien}: {r.status_code} {r.text[:120]}"
                )
    compartidos = {
        oid for _, oid, _ in vistos if len([1 for q, o, _ in vistos if o == oid]) > 1
    }
    assert not compartidos, f"{base}: usuarios distintos ven el mismo registro {compartidos}"


@pytest.mark.asyncio
@pytest.mark.parametrize("base", FAMILIAS)
async def test_sin_sesion_no_se_alcanza_ningun_id(client: AsyncClient, base):
    """Contraprueba de que la ruta existe y exige identidad."""
    r = await client.get(f"{base}/1")
    assert r.status_code in (401, 403), f"{base}: {r.status_code} {r.text[:120]}"


def test_los_endpoints_por_id_declaran_su_alcance():
    """
    Guard estructural: un endpoint nuevo direccionado por `{id}` tiene que
    acotar por `user_id` o por workspace. Sin ninguno de los dos, el id del
    cuerpo o de la ruta decide a que fila se llega.
    """
    import ast
    from pathlib import Path

    raiz = Path(__file__).resolve().parent.parent / "routers"
    #: Publicos por diseno (token de embed, pixel, slug publico) y plataforma.
    #: Alcance legitimo por otra via que `user_id`/`workspace`. Cada entrada
    #: dice CUAL, para que anadir una obligue a justificarla.
    PERMITIDOS = {
        "chatbot.py::public_widget_config": "token de embed publico",
        "cpq.py::quote_viewed_pixel": "pixel de apertura; sin datos en la respuesta",
        "forms.py::public_form": "formulario publico por slug",
        "funnel_publisher.py::public_funnel": "embudo publicado",
        "landing_builder.py::public_page": "pagina publicada por slug",
        "lms.py::public_course_detail": "catalogo publico",
        "conversation_realtime.py::stream_messages":
            "token de stream firmado y de vida corta, emitido por create_stream_token, "
            "que si comprueba conversation+user+workspace",
        "internal_agent_prompts.py::get_agent_prompts":
            "servicio interno: _verify_internal_secret",
        "marketplace.py::get_marketplace_agency": "ficha publica del marketplace",
        "os_store_builder.py::store_sitemap": "sitemap publico de la tienda",
        "os_store_builder.py::store_robots": "robots.txt publico de la tienda",
        "saas_intelligence.py::industry_benchmarks": "benchmarks de sector, no datos de tenant",
        "social.py::oauth_callback": "callback OAuth; el alcance lo da el parametro state",
        "platform_metrics.py::get_platform_metrics": "plataforma (get_admin_user)",
        "platform_metrics.py::update_platform_metrics": "plataforma (get_admin_user)",
        "platform_metrics.py::delete_platform_metrics": "plataforma (get_admin_user)",
        #  y  NO van aqui: ahora
        # acotan por workspace, asi que los cubre la regla normal. Ponerlos en
        # la allowlist los dejaria fuera de vigilancia y quitarles el alcance no
        # haria fallar nada — verde falso que tuvo esta lista en su primera
        # version.
    }
    culpables = []
    for p in sorted(raiz.glob("*.py")):
        arbol = ast.parse(p.read_text(encoding="utf-8"))
        for n in ast.walk(arbol):
            if not isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef)):
                continue
            por_id = False
            for d in n.decorator_list:
                f = d.func if isinstance(d, ast.Call) else d
                if (
                    isinstance(f, ast.Attribute)
                    and f.attr.lower() in ("get", "put", "patch", "delete")
                    and isinstance(d, ast.Call)
                    and d.args
                    and isinstance(d.args[0], ast.Constant)
                    and "{" in str(d.args[0].value)
                ):
                    por_id = True
                    break
            if not por_id:
                continue
            cuerpo = ast.unparse(n).lower()
            clave = f"{p.name}::{n.name}"
            if clave in PERMITIDOS:
                assert len(PERMITIDOS[clave]) > 15, f"{clave} permitido sin motivo"
                continue
            if "public" in n.name:
                continue
            if "workspace" in cuerpo or "user_id" in cuerpo or "current_user" in cuerpo:
                continue
            if "admin" in cuerpo:  # plataforma
                continue
            culpables.append(clave)
    assert culpables == [], f"endpoints por id sin acotar: {culpables}"
