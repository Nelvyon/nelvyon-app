"""Las 1.763 politicas RLS son inertes para el servicio web. Verificado, no supuesto.

EL HALLAZGO
-----------
Los dos servicios de NELVYON conectan a la MISMA base con roles distintos:

    nelvyon-app  (FastAPI)   nelvyon_app   super=False  bypassrls=False
                             nelvyon_jobs  super=False  bypassrls=True
    @nelvyon/web (Next.js)   postgres      super=True   bypassrls=True

Un SUPERUSUARIO salta RLS incondicionalmente. `FORCE ROW LEVEL SECURITY` tampoco
le aplica: FORCE solo somete al DUEÑO de la tabla, no al superusuario.

Es decir: las 498 tablas con RLS y las 1.763 politicas protegen el lado Python y
**no protegen nada** en el lado TypeScript, que es el que sirve el panel, el SaaS
y el OS. Y `backend/db/DbClient.ts` no fija ningun contexto de inquilino
—ni `set_config`, ni `SET LOCAL`, ni `request.jwt.claim.sub`— asi que tampoco
habria por donde evaluar una politica aunque el rol no la saltara.

QUE PARTE DE ESTO ES NUEVA Y QUE PARTE YA SE SABIA
---------------------------------------------------
El problema del rol superusuario estaba ANTICIPADO: `core/contexto_rls.py` lo
explica y por eso fija el contexto en cada transaccion, declarandose «inocuo hoy»
mientras el rol saltara RLS.

Lo que ha cambiado desde entonces es que la rotacion de credencial movio FastAPI
a `nelvyon_app` —sin BYPASSRLS— y ahi las politicas SI evaluan. Ese lado esta
cerrado y demostrado.

Lo nuevo, y lo que esta bateria fija, es que **el lado web no se movio**: sigue en
`postgres`, y su `DbClient` no fija contexto de ninguna clase. Es decir, la mitad
del sistema que sirve el panel, el SaaS y el OS quedo fuera del cierre sin que
nadie lo anotara. El comentario de `DbClient.ts` ademas lo escribe como REQUISITO
—«must use the service_role URL (bypasses RLS)»— y no como riesgo.

Se distingue con cuidado porque presentar como hallazgo nuevo algo ya documentado
seria inflar el trabajo, y presentar como cerrado algo que solo lo esta a medias
seria peor.

LO QUE ESTO NO ES
-----------------
No es «la RLS no sirve». Para FastAPI si sirve, y esta demostrado. Tampoco
significa que cada consulta del lado web filtre mal: muchas acotan explicitamente
por `tenant_id` y estan bien. Lo que significa es que en ese lado la acotacion
depende ENTERAMENTE de que cada consulta la escriba a mano, sin red debajo.

LA CONSECUENCIA PARA LAS MIGRACIONES PENDIENTES
------------------------------------------------
568/569/570/572 cierran la deuda de aislamiento del lado Python. NO la cierran
para el lado web. Presentarlas como «aislamiento cerrado» seria falso, y por eso
se escribe aqui.

POR QUE `xfail` ESTRICTO Y NO UN `skip`
----------------------------------------
Un `skip` desaparece del informe. Un `xfail` estricto falla EN CUANTO SE ARREGLE,
obligando a venir aqui y retirar la marca. La deuda no se puede cerrar en
silencio ni quedarse olvidada en verde.
"""
from __future__ import annotations

import pathlib
import re

import pytest

RAIZ = pathlib.Path(__file__).resolve().parents[2]
CLIENTE = RAIZ / "backend" / "db" / "DbClient.ts"


def test_el_cliente_de_base_del_lado_web_existe_donde_se_cree():
    """Si se movio, las dos pruebas de abajo no estarian mirando nada."""
    assert CLIENTE.exists(), (
        f"no esta `{CLIENTE.relative_to(RAIZ)}`: estas pruebas quedarian inertes")


@pytest.mark.xfail(strict=True, reason=
    "DEUDA CONOCIDA: `@nelvyon/web` conecta como `postgres` (superusuario) y "
    "`DbClient` no fija contexto de inquilino. Cuando se arregle, esta prueba "
    "pasa a verde y el xfail estricto la marca en rojo: ven aqui y quita la marca")
def test_el_cliente_del_lado_web_fija_el_inquilino_de_la_peticion():
    """LA PRUEBA, hoy en rojo a proposito.

    Para que una politica RLS pueda evaluarse hace falta que alguien diga QUIEN
    esta preguntando. En el lado Python lo hace el middleware por peticion. En el
    lado web no lo hace nadie.
    """
    fuente = CLIENTE.read_text(encoding="utf-8")
    assert re.search(r"set_config|SET\s+LOCAL|request\.jwt\.claim\.sub", fuente), (
        "`DbClient` no fija ningun contexto de inquilino: aunque el rol dejara de "
        "saltarse RLS, no habria valor contra el que evaluar las politicas")


@pytest.mark.xfail(strict=True, reason=
    "DEUDA CONOCIDA: el fichero documenta el bypass de RLS como REQUISITO "
    "(«must use the service_role URL»), no como riesgo asumido")
def test_el_cliente_no_exige_un_rol_que_salte_rls():
    """El comentario que convirtio el agujero en requisito.

    `DbClient.ts` dice literalmente que `DATABASE_URL` DEBE ser la URL que salta
    RLS. Escrito asi, cualquiera que intente ponerle un rol acotado cree que esta
    rompiendo el sistema, y lo revierte.
    """
    fuente = CLIENTE.read_text(encoding="utf-8")
    assert not re.search(r"bypass(es)?\s+RLS", fuente, re.I), (
        "el cliente documenta saltarse RLS como requisito: mientras eso este "
        "escrito, nadie va a intentar acotarlo")


def test_el_lado_python_si_fija_el_inquilino():
    """EL CONTROL. Sin esto, «nadie fija el contexto» pareceria normal.

    Es lo que demuestra que el problema es del lado web y no un malentendido
    sobre como funciona RLS en este proyecto: en Python el contexto se fija, y por
    eso alli las politicas si evaluan.
    """
    contexto = (RAIZ / "backend" / "core" / "contexto_rls.py").read_text(encoding="utf-8")
    assert re.search(r"set_config", contexto) and            re.search(r"request\.jwt\.claim\.sub", contexto), (
        "tampoco el lado Python fija contexto: entonces el hallazgo es mas "
        "grande de lo descrito y hay que revisar toda la premisa")
