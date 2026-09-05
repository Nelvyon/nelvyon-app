"""Una ruta que ESCRIBE no puede autorizarse con un permiso de LECTURA.

LA CLASE DE FALLO, Y LO QUE COSTABA
------------------------------------
`requireSaasContext(req, accion)` autoriza de verdad: resuelve el rol, aplica
permisos personalizados y falla cerrado. La puerta esta bien construida.

Pero la puerta no decide QUE se le pide: eso lo escribe quien programa la ruta.
Y veintitres manejadores de escritura le pedian una accion de LECTURA.

Con eso, `viewer` —un rol de solo lectura, que tiene `contacts.read`— podia:

    PATCH  /api/saas/contracts/[id]     cancelar y ENVIAR un contrato
    POST   /api/saas/facturas/dunning   reclamar impagos a los clientes
    DELETE /api/saas/integrations       desconectar un proveedor del inquilino
    POST   /api/saas/voice/execute      ejecutar un comando
    POST   /api/saas/ads/optimizer      guardar reglas que gobiernan la inversion

Ninguna prueba fallaba. Todas esas rutas autorizaban —devolvian 403 a un
extraño— y ninguna autorizaba lo correcto. Es el mismo patron que en Fase 1
dejo una «matriz RBAC completa» sin mirar el rol `operator`: cobertura aparente
sobre el conjunto equivocado.

POR QUE ESTA PRUEBA MIRA EL DENOMINADOR
---------------------------------------
Arreglar los veintitres no impide el veinticuatro. Lo que se vigila aqui es el
INVARIANTE: si un manejador exporta POST, PUT, PATCH o DELETE, la accion que le
pide a la puerta no puede terminar en `.read`.

Una ruta nueva que se equivoque rompe esta prueba el dia que se escribe, no el
dia que alguien la audita.

LAS EXCEPCIONES SON BLANCAS Y LLEVAN MOTIVO
-------------------------------------------
Hay POST que no mutan nada: se usan como consulta porque el cuerpo no cabe en
una URL. Estan declaradas abajo, una a una, con su razon. Lo que no este
declarado, falla. Y si una declarada deja de ser de lectura, tambien falla: la
lista solo puede encoger.

COSTE EXTERNO: 0 EUR. Se lee el arbol.
"""
from __future__ import annotations

import io
import pathlib
import re

RAIZ = pathlib.Path(__file__).resolve().parents[2]
API = RAIZ / "apps" / "web" / "src" / "app" / "api"

_COMENTARIO = re.compile(r"//[^\n]*|/\*.*?\*/", re.S)
_ESCRITURA = ("POST", "PUT", "PATCH", "DELETE")
_BLOQUE = re.compile(
    r"export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE)\b"
    r"(.*?)(?=export\s+(?:async\s+)?function\s+(?:GET|POST|PUT|PATCH|DELETE)\b|\Z)",
    re.S,
)
_PUERTA = re.compile(r'requireSaasContext\s*\([^,]+,\s*"([^"]+)"')

#: POST que NO mutan: se usan como consulta porque el cuerpo no cabe en una URL.
#: Clave `(ruta, metodo)`. Cada una con el motivo por el que leer basta.
CONSULTAS_POR_POST: dict[tuple[str, str], str] = {
    ("apps/web/src/app/api/os/competitor-gap/analyze/route.ts", "POST"):
        "analiza y devuelve; no persiste nada",
    ("apps/web/src/app/api/saas/ai-copy/route.ts", "POST"):
        "genera texto y lo devuelve; no lo guarda",
    ("apps/web/src/app/api/saas/benchmarks/compare/route.ts", "POST"):
        "compara dos conjuntos y devuelve el resultado",
    ("apps/web/src/app/api/saas/crm/copilot/route.ts", "POST"):
        "sugiere para un contacto; la sugerencia no se aplica sola",
    ("apps/web/src/app/api/saas/voice/parse/route.ts", "POST"):
        "convierte voz en intencion; ejecutar es otra ruta, con otra accion",
}


def _manejadores() -> list[tuple[str, str, str]]:
    """(ruta, metodo, accion) de cada manejador que pasa por la puerta."""
    fuera: list[tuple[str, str, str]] = []
    for p in API.rglob("route.ts"):
        if "__tests__" in p.parts:
            continue
        rel = p.relative_to(RAIZ).as_posix()
        texto = _COMENTARIO.sub(" ", io.open(p, encoding="utf-8", errors="replace").read())
        if "requireSaasContext" not in texto:
            continue
        for metodo, cuerpo in _BLOQUE.findall(texto):
            for accion in _PUERTA.findall(cuerpo):
                fuera.append((rel, metodo, accion))
    return fuera


def test_el_barrido_ve_manejadores_y_reconoce_una_lectura():
    """CONTROL POSITIVO.

    Si el barrido dejara de encontrar manejadores —por un cambio de sintaxis, por
    una carpeta movida— todo lo de abajo pasaria en verde sin mirar nada.
    """
    todos = _manejadores()
    assert len(todos) > 200, f"el barrido solo ve {len(todos)} manejadores; algo dejo de reconocerse"
    assert any(m in _ESCRITURA for _, m, _ in todos), "no se ve ni un manejador de escritura"
    assert any(a.endswith(".read") for *_, a in todos), "el detector ya no reconoce una accion de lectura"


def test_ninguna_escritura_pide_permiso_de_lectura():
    """LA REGLA.

    Un `viewer` no puede escribir. Si esta prueba falla, alguien acaba de dar a
    un rol de solo lectura la capacidad de mutar.
    """
    culpables = [
        (r, m, a)
        for r, m, a in _manejadores()
        if m in _ESCRITURA and a.endswith(".read") and (r, m) not in CONSULTAS_POR_POST
    ]
    assert not culpables, (
        "estos manejadores ESCRIBEN pero se autorizan con una accion de LECTURA, "
        "asi que un rol de solo lectura puede ejecutarlos:\n  "
        + "\n  ".join(f"{m:<7} {a:<18} {r}" for r, m, a in sorted(culpables))
    )


def test_las_consultas_declaradas_siguen_siendo_consultas():
    """EL TRINQUETE.

    Si una excepcion deja de leer —porque la ruta empezo a guardar algo— la
    excepcion deja de valer. Y si desaparece, sale de la lista para que nadie
    herede un permiso relajado sin motivo.
    """
    vistos = {(r, m): a for r, m, a in _manejadores()}
    fantasmas = sorted(k for k in CONSULTAS_POR_POST if k not in vistos)
    assert not fantasmas, (
        "estas excepciones ya no existen o cambiaron de metodo; sacalas de la "
        f"lista: {fantasmas}"
    )
    ascendidas = sorted(k for k in CONSULTAS_POR_POST if not vistos[k].endswith(".read"))
    assert not ascendidas, (
        "estas ya piden una accion de escritura; sacalas de la lista de "
        f"excepciones para que el guardian vuelva a vigilarlas: {ascendidas}"
    )


def test_toda_accion_usada_existe_en_el_catalogo():
    """Una accion mal escrita no autoriza: no esta en ninguna matriz de rol, asi
    que `assertSaasPermission` la rechazaria siempre. Un 403 permanente es un
    fallo tan silencioso como un permiso de mas."""
    catalogo = (RAIZ / "backend" / "saas" / "saasRbac.ts").read_text(encoding="utf-8")
    declaradas = set(re.findall(r'"([a-z_]+\.[a-z_]+)"', catalogo))
    usadas = {a for *_, a in _manejadores()}
    huerfanas = sorted(usadas - declaradas)
    assert not huerfanas, f"acciones que ninguna ruta puede satisfacer: {huerfanas}"
