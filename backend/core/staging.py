"""
Ajustes de STAGING — NELVYON OS.

QUE HACE ESTE MODULO, EXACTAMENTE
---------------------------------
Baja el nivel de log a DEBUG cuando `ENVIRONMENT=staging`. Nada mas.

POR QUE ESTA ADVERTENCIA OCUPA LA CABECERA
------------------------------------------
La version anterior declaraba un `STAGING_CONFIG` con nueve claves —entre ellas
`email_sandbox: True` («Don't send real emails»), `stripe_mode: "test"`,
`rate_limit_multiplier: 3` y `enable_mock_data`— y las imprimia al arrancar
como si estuvieran en vigor:

    🟡 STAGING ENVIRONMENT ACTIVE
      Rate limit multiplier: 3x
      Email sandbox: True
      Stripe mode: test

Ninguna se consumia en ninguna parte del codigo. `get_staging_config()` solo lo
llamaba `apply_staging_overrides()`, que unicamente usaba `log_level`; las otras
ocho claves eran literales muertos.

No era un detalle cosmetico: durante la certificacion de produccion ese
`Rate limit multiplier: 3x` llevo a calcular el margen del limitador con un
factor tres que no existia, y las peticiones se estrellaron contra el limite
real. Y una promesa de «no se envian correos de verdad» que el codigo no
cumple es peor que no hacer promesa alguna, porque invita a probar contra
staging dando por hecha una red de seguridad inexistente.

DONDE VIVEN DE VERDAD ESOS INTERRUPTORES
----------------------------------------
El modo de los proveedores NO depende de `ENVIRONMENT`, y esta bien que sea
asi: cada integracion se configura por su propia credencial.

    pagos    STRIPE_SECRET_KEY   (`sk_test_` o `sk_live_` decide el modo)
    correo   la credencial del proveedor de correo
    mock     ALLOW_MOCK_SEED     (bloqueado en staging y produccion por defecto)
    limites  TIER_* en middleware/rate_limit.py

`ENVIRONMENT` describe DONDE se ejecuta el proceso; las credenciales describen
CONTRA QUE habla. Mezclar ambas cosas es lo que hace que cambiar de entorno dé
miedo. Si alguna vez hace falta un interruptor de staging con efecto real,
implementalo donde actua y que el consumidor lo lea — no lo declares aqui.
"""
import logging
import os
from typing import Any, Dict

logger = logging.getLogger(__name__)

#: Solo lo que este modulo aplica de verdad. Añadir una clave aqui sin un
#: consumidor real vuelve a crear la garantia falsa que costo la medicion.
STAGING_CONFIG: Dict[str, Any] = {
    "log_level": "DEBUG",
}


def get_staging_config() -> Dict[str, Any]:
    """Configuracion de staging, con override por variable de entorno."""
    config = STAGING_CONFIG.copy()
    if os.environ.get("STAGING_LOG_LEVEL"):
        config["log_level"] = os.environ["STAGING_LOG_LEVEL"]
    return config


def is_staging() -> bool:
    """¿El proceso corre en staging?"""
    return os.environ.get("ENVIRONMENT", "").lower() == "staging"


def apply_staging_overrides() -> None:
    """Aplica los ajustes de staging al arrancar."""
    if not is_staging():
        return

    config = get_staging_config()
    logger.info("STAGING: nivel de log en %s", config["log_level"])
    logger.info(
        "STAGING: el modo de pagos, correo y datos de prueba NO depende de "
        "ENVIRONMENT; lo fija la credencial de cada integracion."
    )
    logging.getLogger().setLevel(getattr(logging, config["log_level"]))
