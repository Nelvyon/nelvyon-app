"""
Produccion no puede arrancar sin lo imprescindible.

Todos los secretos criticos se declaran con `default=""`, asi que un despliegue
al que se le olvide uno LEVANTA IGUAL y falla peticion a peticion. El health
check responde, el proceso parece sano y la autenticacion rechaza todo: el peor
modo de fallo, porque no se nota hasta que lo nota un usuario.

El conjunto que impide arrancar es corto a proposito — solo lo que deja el
servicio inservible. `STRIPE_WEBHOOK_SECRET` ya tiene guarda por ruta y
`MASK_KEY` corta al cifrar, asi que no justifican bloquear el arranque entero.
"""
from __future__ import annotations

import pytest

from core.config import Settings


def _ajustes(**kw) -> Settings:
    base = {
        "ENVIRONMENT": "production",
        "JWT_SECRET": "s" * 40,
        "DATABASE_URL": "postgresql://u:p@h/db",
    }
    base.update(kw)
    # Se construye con los ALIAS, no con los nombres de campo: `Field(...,
    # validation_alias="ENVIRONMENT")` hace que el alias sea la unica clave
    # aceptada. Con el nombre de campo, `environment` se quedaba en su default
    # y el test comprobaba un objeto que no era de produccion.
    return Settings(**base)


def test_produccion_completa_arranca():
    """Contraprueba: la comprobacion no bloquea un despliegue correcto."""
    _ajustes().assert_production_ready()


def test_sin_secreto_jwt_no_arranca():
    """Sin el, `decode_access_token` rechazaria TODA peticion."""
    with pytest.raises(RuntimeError, match="JWT_SECRET"):
        _ajustes(JWT_SECRET="", JWT_SECRET_KEY="").assert_production_ready()


def test_sin_base_de_datos_no_arranca():
    with pytest.raises(RuntimeError, match="DATABASE_URL"):
        _ajustes(DATABASE_URL="").assert_production_ready()


def test_el_error_nombra_todo_lo_que_falta():
    """Arreglar de uno en uno, reiniciando cada vez, es peor que saberlo todo."""
    with pytest.raises(RuntimeError) as exc:
        _ajustes(JWT_SECRET="", JWT_SECRET_KEY="", DATABASE_URL="").assert_production_ready()
    assert "JWT_SECRET" in str(exc.value) and "DATABASE_URL" in str(exc.value)


@pytest.mark.parametrize("entorno", ["development", "test", "staging", ""])
def test_fuera_de_produccion_no_estorba(entorno):
    """
    Desarrollo y tests arrancan sin secretos a proposito; imponerlo ahi solo
    haria que la gente los pusiera falsos, que es peor.
    """
    _ajustes(ENVIRONMENT=entorno, JWT_SECRET="", JWT_SECRET_KEY="",
             DATABASE_URL="").assert_production_ready()


@pytest.mark.parametrize("alias", ["production", "prod", "PRODUCTION", "Prod"])
def test_reconoce_las_formas_de_nombrar_produccion(alias):
    with pytest.raises(RuntimeError):
        _ajustes(ENVIRONMENT=alias, JWT_SECRET="", JWT_SECRET_KEY="").assert_production_ready()


def test_el_arranque_lo_comprueba_de_verdad():
    """
    Definir la comprobacion y no llamarla seria peor que no tenerla: daria
    sensacion de proteccion.
    """
    from pathlib import Path

    src = (Path(__file__).resolve().parent.parent / "main.py").read_text(encoding="utf-8")
    i = src.index("async def startup_event")
    cuerpo = src[i : i + 900]
    assert "assert_production_ready()" in cuerpo
