"""Los bloqueos no se disuelven solos.

Un bloqueo humano que nadie vuelve a mirar se convierte, con el tiempo, en una
decision tomada por omision. Y un `REQUIRED_CONFIGURATION` que no aparece en
ninguna puerta se descubre el dia del despliegue.

Este guardian hace tres cosas y ninguna es decorativa:

  1. Fija el REGISTRO: cada bloqueo tiene identificador, clase, motivo y lo que
     NO se debe hacer. Una entrada sin motivo es una etiqueta, no un bloqueo.
  2. Comprueba que los bloqueos con COMPORTAMIENTO EN CODIGO siguen teniendolo.
     Que `SES_SNS_TOPIC_ARN` este apuntado en un JSON no sirve de nada si
     alguien quita el cierre en falso de la ruta.
  3. Comprueba que la checklist de pre-despliegue los INCLUYE a todos. Un
     bloqueo que no llega a la checklist no existe operativamente.

El registro vive en `decisiones_y_bloqueos.json` y es la unica fuente.
"""

from __future__ import annotations

import io
import json
import os
from pathlib import Path

RAIZ = Path(os.environ.get("NELVYON_RAIZ") or Path(__file__).resolve().parents[2])
REGISTRO = RAIZ / "backend" / "db" / "certificacion" / "decisiones_y_bloqueos.json"

CLASES = {
    "REQUIRED_CONFIGURATION",
    "BLOCKED_HUMAN_DECISION",
    "EXTERNAL_VERIFICATION_REQUIRED",
}


def registro() -> list[dict]:
    return json.load(io.open(REGISTRO, encoding="utf-8"))["entradas"]


def _texto(rel: str) -> str:
    try:
        return io.open(RAIZ / rel, encoding="utf-8", errors="replace").read()
    except OSError:
        return ""


def test_el_registro_existe_y_no_esta_vacio() -> None:
    """Suelo minimo: cero bloqueos sobre cero entradas es el verde mas vacio."""
    e = registro()
    assert len(e) >= 8, (
        f"solo {len(e)} entradas en el registro de bloqueos. Los bloques 1 a 7 "
        "dejaron ocho como minimo: si el numero baja, alguien ha borrado uno."
    )


def test_toda_entrada_dice_QUE_es_y_POR_QUE() -> None:
    """Una etiqueta sin motivo no es un bloqueo: es una excusa."""
    for e in registro():
        assert e.get("id"), f"entrada sin id: {e}"
        assert e.get("clase") in CLASES, f"{e['id']}: clase invalida {e.get('clase')!r}"
        assert e.get("titulo"), f"{e['id']}: sin titulo"
        assert e.get("lo_que_NO_se_debe_hacer"), (
            f"{e['id']}: no dice que NO se debe hacer. Sin esa linea, la proxima "
            "sesion 'resuelve' el bloqueo sin saber que lo era."
        )


def test_los_bloqueos_heredados_siguen_todos_presentes() -> None:
    """Ninguno de los siete que el fundador aisló puede desaparecer."""
    obligatorios = {
        "WEB_DB_ROLE_CUTOVER",
        "ADR-064",
        "STRIPE_MEMBERSHIP_REACTIVATION",
        "INVOICING_AB_TESTING_SERVICES",
        "CRM_EMAIL_VALIDATION",
        "PLATFORM_ADMIN_MODEL",
        "STABLE_WORKSPACE_ID_MIGRATION",
    }
    presentes = {e["id"] for e in registro()}
    faltan = sorted(obligatorios - presentes)
    assert not faltan, (
        f"han desaparecido del registro: {faltan}. Un bloqueo que se borra es una "
        "decision tomada por omision."
    )


def test_el_cierre_en_falso_de_SES_sigue_en_pie() -> None:
    """`SES_SNS_TOPIC_ARN` en un JSON no protege nada por si solo.

    Lo que protege es que la ruta responda 503 en produccion cuando falta. Se
    comprueba en el codigo, no en la nota.
    """
    ruta = _texto("apps/web/src/app/api/webhooks/ses/route.ts")
    assert ruta, "no se encuentra la ruta de SES"
    assert "SES_SNS_TOPIC_ARN" in ruta, "la ruta ya no lee SES_SNS_TOPIC_ARN"
    assert "503" in ruta, (
        "la ruta ya no devuelve 503 cuando falta la lista de topics: el cierre en "
        "falso ha desaparecido y el webhook vuelve a aceptar cualquier topic de AWS."
    )
    assert "Untrusted TopicArn" in ruta, (
        "la comprobacion del TopicArn ha desaparecido. Verificar la firma NO "
        "identifica al remitente: AWS firma para todo el mundo."
    )


def test_el_administrador_de_plataforma_lee_la_fuente_canonica() -> None:
    """PLATFORM_ADMIN_MODEL: RESUELTO el mecanismo, pendiente el dato.

    Esta prueba exigia antes que `isUserAdmin` siguiera cerrado en falso por
    falta de esquema. Se puso ROJA al conectarlo a `user_roles`, que es
    exactamente lo que tenia que pasar: una deuda no se cierra en silencio, se
    cierra viniendo aqui y sustituyendo la vigilancia vieja por la nueva.

    Lo que cambio, medido contra el arbol:

        os_users        NO existe: ninguna migracion la crea
        nelvyon_users   SI existe (003_auth.sql) pero NO tiene columna `role`
        user_roles      SI existe (migracion 545) y es la fuente canonica: tiene
                        su modelo, su API de gestion con jerarquia y auditoria,
                        y SEIS sitios del lado Python deciden con ella

    Asi que no habia una decision de producto que tomar: habia un lado sin
    conectar al sistema que ya existia. Lo que SIGUE siendo del fundador es
    QUIEN: la primera fila con rol `admin` es un dato sobre una persona real.

    Lo que se vigila ahora es que no se afloje en ninguna de las dos direcciones.
    """
    svc = _texto("backend/admin/NelvyonAdminService.ts")
    assert svc, "no se encuentra NelvyonAdminService"
    assert "isUserAdmin" in svc

    assert "user_roles" in svc, (
        "`isUserAdmin` ya no consulta `user_roles`, la fuente canonica de roles "
        "de plataforma. Si se ha movido a otra, actualiza esta prueba con la "
        "evidencia de por que la nueva es canonica."
    )
    # El predicado, exacto y el mismo que gobierna el lado Python.
    assert '"admin", "super_admin"' in svc, (
        "el conjunto de roles de plataforma ha cambiado. Ampliarlo da acceso al "
        "plano de administracion a quien antes no lo tenia."
    )
    # Revocar tiene que surtir efecto: por eso se va a la base y no al token.
    assert "is_active" in svc, (
        "`isUserAdmin` ya no mira `is_active`: revocar un rol dejaria de tener "
        "efecto y habria que esperar a que caducara la sesion."
    )
    # Y sigue cerrando en falso cuando no puede preguntar.
    assert "return false" in svc, "isUserAdmin ya no cierra en falso"
    assert "NADIE puede ser administrador" in svc, (
        "el aviso ha desaparecido: un esquema o un privilegio que falta volveria "
        "a informarse como 'no es administrador', indistinguible de una "
        "denegacion legitima."
    )


def test_el_workspace_derivado_no_se_ha_cambiado_a_escondidas() -> None:
    """STABLE_WORKSPACE_ID_MIGRATION esta BLOQUEADO: los ids no se tocan.

    Se fija el valor de una derivacion concreta. Si alguien cambia el algoritmo,
    esto se pone rojo — que es exactamente lo que debe pasar, porque cambiarlo
    sin migracion deja huerfanos los datos de todos los inquilinos.
    """
    src = _texto("apps/web/src/lib/platformFastApiProxy.ts")
    assert "stableWorkspaceIdFromTenant" in src
    assert "900_000" in src or "900000" in src, (
        "la derivacion del workspace ha cambiado. Eso NO se hace desde una sesion "
        "de certificacion: cambia el identificador de todos los inquilinos que ya "
        "lo usan. Ver STABLE_WORKSPACE_ID_MIGRATION en el registro."
    )
