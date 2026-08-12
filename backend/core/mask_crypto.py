# Used to conceal LLM access
import base64
import hashlib
import os

from cryptography.fernet import Fernet

#: NO hay clave por defecto.
#:
#: Antes existia un literal en este fichero que se usaba cuando `MASK_KEY` no
#: estaba puesta. Como este modulo cifra los tokens OAuth de las cuentas
#: sociales de los clientes (`services/social_token_crypto.py`), un despliegue
#: sin esa variable los cifraba con una clave publicada en el repositorio:
#: equivalente a guardarlos en claro para cualquiera con acceso al codigo.
#:
#: Sin clave configurada no se cifra ni se descifra. Se corta.
_VARIABLES_DE_CLAVE = ("MASK_KEY", "SOCIAL_TOKEN_ENCRYPTION_KEY")


def _clave_configurada() -> str:
    for nombre in _VARIABLES_DE_CLAVE:
        valor = (os.environ.get(nombre) or "").strip()
        if valor:
            return valor
    raise RuntimeError(
        "Encryption key is not configured: set MASK_KEY (or "
        "SOCIAL_TOKEN_ENCRYPTION_KEY). Refusing to use a built-in default."
    )
key_prefix = "mgxkey-"


def _derive_fernet_key(key_material: str) -> bytes:
    """Derive a valid Fernet key from arbitrary string using SHA-256 and urlsafe base64."""
    digest = hashlib.sha256(key_material.encode("utf-8")).digest()  # 32 bytes
    return base64.urlsafe_b64encode(digest)


def _get_fernet(key_str: str) -> Fernet:
    key = _derive_fernet_key(key_str)
    return Fernet(key)


def encrypt_text(plain: str) -> str:
    pwd = _clave_configurada()
    f = _get_fernet(pwd)
    return key_prefix + f.encrypt(plain.encode("utf-8")).decode("utf-8")


def decrypt_text(token: str) -> str:
    pwd = _clave_configurada()
    f = _get_fernet(pwd)
    token = token.removeprefix(key_prefix)
    return f.decrypt(token.encode("utf-8")).decode("utf-8")
