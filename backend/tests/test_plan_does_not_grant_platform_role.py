"""
Un plan comercial no concede autoridad de plataforma.

HALLAZGO: `core/nelvyon_jwt.py` derivaba el rol de FastAPI del `plan` del token
de la app, y `enterprise` daba `role = "admin"`.

`get_admin_user` describe ese rol como "platform operators" y guarda, entre
otros, `POST /rbac/assign` —asignar roles—, las estadisticas de auditoria, los
ajustes de plataforma y las metricas globales.

`enterprise` es un plan VENDIBLE: esta en `core.pricing_plans` junto a starter,
pro, agency y partner. Es decir, la autoridad sobre la plataforma se compraba
contratando una suscripcion.

`admin` NO es vendible —no aparece en `pricing_plans`— porque no es un plan sino
la marca del personal de NELVYON. Esa es la diferencia que separa el mecanismo
legitimo del agujero, y por eso se conserva.
"""
from __future__ import annotations

import pytest

from core.pricing_plans import PRICING_PLANS

ROLES_DE_PLATAFORMA = {"admin", "super_admin"}


def _rol_para(plan: str) -> str:
    """Rol que produce el puente para un `plan` dado, sin montar HTTP."""
    import core.nelvyon_jwt as puente

    payload = {"userId": "u-1", "email": "u@test.local", "plan": plan}

    class _Falso:
        @staticmethod
        def decode(*_a, **_k):
            return payload

    original = getattr(puente, "jwt", None)
    # No se salta: si el puente deja de exponer `jwt`, la forma del modulo
    # cambio y este test dejaria de comprobar nada sin que nadie se enterase.
    assert original is not None, "el puente ya no expone `jwt`: revisar este test"
    puente.jwt = _Falso  # type: ignore[attr-defined]
    try:
        return str(puente.try_decode_nelvyon_app_token("token")["role"])
    finally:
        puente.jwt = original  # type: ignore[attr-defined]


@pytest.mark.parametrize("plan", sorted(PRICING_PLANS.keys()))
def test_ningun_plan_vendible_concede_rol_de_plataforma(plan):
    """
    La propiedad, recorriendo el catalogo comercial REAL. Si manana se anade un
    plan nuevo, este test lo cubre solo.
    """
    rol = _rol_para(plan)
    assert rol not in ROLES_DE_PLATAFORMA, (
        f"el plan vendible {plan!r} concede rol de plataforma {rol!r}"
    )


def test_enterprise_era_el_caso_concreto():
    """Regresion explicita del hallazgo."""
    assert _rol_para("enterprise") == "operator"


def test_el_marcador_de_personal_sigue_funcionando():
    """
    Contraprueba: la correccion no puede dejar a NELVYON sin acceso. `admin` no
    es un plan vendible, es como se marca al personal.
    """
    assert "admin" not in PRICING_PLANS, "si `admin` se volviese vendible, esto es un agujero"
    assert _rol_para("admin") == "admin"


@pytest.mark.parametrize("plan", ["free", "", "desconocido", "ENTERPRISE"])
def test_planes_no_reconocidos_no_escalan(plan):
    """Fail-closed: lo que no se reconoce no obtiene nada."""
    rol = _rol_para(plan)
    assert rol not in ROLES_DE_PLATAFORMA
    if plan == "ENTERPRISE":
        # Se normaliza a minusculas, asi que es el mismo caso que `enterprise`.
        assert rol == "operator"


def test_el_puente_no_vuelve_a_mapear_un_plan_a_admin():
    """Regresion de forma sobre el codigo."""
    from pathlib import Path

    src = (Path(__file__).resolve().parent.parent / "core" / "nelvyon_jwt.py").read_text(
        encoding="utf-8"
    )
    i = src.index('plan = str(decoded.get("plan")')
    tramo = src[i : i + 500]
    assert 'plan in ("enterprise",)' not in tramo
    assert 'role = "admin"' in tramo, "se perdio el marcador de personal"
    # Solo una rama puede producir `admin`, y es la del plan no vendible.
    assert tramo.count('role = "admin"') == 1
