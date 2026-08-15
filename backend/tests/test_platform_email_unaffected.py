"""
El correo operativo del propio SaaS sigue siendo de NELVYON.

Al exigir identidad remitente propia al email en frio de `/api/ses/*`, el riesgo
evidente es pasarse de frenada y romper el correo que NELVYON envia legitimamente
con su propia identidad: alta de usuario, avisos de workflow, avisos de ticket,
notificaciones de OS.

La distincion no es el proveedor, es EN NOMBRE DE QUIEN va el mensaje:

    NELVYON escribe a su usuario        -> identidad de NELVYON  (correcto)
    el cliente escribe a su prospecto   -> identidad del cliente (lo que se cerro)

Estos dos caminos ya estaban separados en el codigo y se quedan separados:
`services/email_service.py` (SendGrid, `SENDGRID_FROM_EMAIL`) para el primero,
`services/ses_service.py` para el segundo. Este fichero fija esa frontera para
que un cambio futuro no la borre por descuido.
"""
from __future__ import annotations

import ast
from pathlib import Path

BACKEND = Path(__file__).resolve().parent.parent


def test_el_email_de_plataforma_no_exige_integracion_de_workspace():
    """
    Un reset de contrasena no puede depender de que el workspace haya conectado
    su dominio: dejaria a los usuarios sin poder recuperar la cuenta.
    """
    src = (BACKEND / "services" / "email_service.py").read_text(encoding="utf-8")
    assert "assert_workspace_email_sender" not in src, (
        "el correo operativo del SaaS no debe pasar por el binding de tenant")
    assert "messaging_integration" not in src


def test_las_funciones_operativas_siguen_existiendo():
    """Contraprueba: el test anterior no vale si las funciones desaparecieron."""
    arbol = ast.parse((BACKEND / "services" / "email_service.py").read_text(encoding="utf-8"))
    nombres = {
        n.name for n in ast.walk(arbol)
        if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef))
    }
    for esperada in ("send_welcome_email", "send_workflow_notification",
                     "send_ticket_notification"):
        assert esperada in nombres, f"{esperada} desaparecio del correo operativo"


def test_los_dos_caminos_de_correo_no_se_han_fusionado():
    """
    Si algun dia el correo operativo pasara por `ses_service`, heredaria el
    fail-closed por integracion y se caeria sin que nadie lo relacionase.
    """
    src = (BACKEND / "services" / "email_service.py").read_text(encoding="utf-8")
    assert "ses_service" not in src


def test_el_email_en_frio_si_exige_identidad_propia():
    """La otra mitad de la frontera, para que este fichero no la fije a medias."""
    src = (BACKEND / "routers" / "ses.py").read_text(encoding="utf-8")
    assert src.count("assert_workspace_email_sender(") == 2, (
        "send y bulk deben exigir remitente propio del workspace")


def test_el_correo_operativo_no_lo_consume_ningun_endpoint_de_cliente():
    """
    `EmailService` manda con la identidad de NELVYON, asi que ningun endpoint
    customer-facing puede usarlo para escribir a los prospectos del cliente: eso
    reintroduciria el remitente corporativo por otra puerta.

    `campaign_sender` es la excepcion CONOCIDA y esta registrada como deuda en
    `docs/TODO.md` — sus campanas salen hoy desde `SENDGRID_FROM_EMAIL`. No se
    cierra aqui porque romperia una funcionalidad viva y la alternativa
    (exigir dominio verificado por workspace) es una decision de producto.
    """
    consumidores = set()
    for f in (BACKEND / "routers").glob("*.py"):
        if "email_service import" in f.read_text(encoding="utf-8"):
            consumidores.add(f.name)
    assert consumidores <= {"email_service.py", "communications_v1.py"}, (
        f"routers nuevos usando el remitente corporativo: {consumidores}")
