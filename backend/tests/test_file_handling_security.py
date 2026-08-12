"""
Subidas, importaciones, exportaciones y descargas.

Tres defectos encontrados y medidos antes de tocar nada:

1. **CSV formula injection.** `audit_service` y `reports_service` escribian con
   `writer.writerow` valores crudos. Excel y Sheets evaluan como FORMULA toda
   celda que empiece por `=`, `+`, `-`, `@`, tab o retorno. Y no era teorico:
   `services/audit_events.py` guarda `resource_id=request.url.path` al registrar
   una denegacion, asi que pedir una ruta llamada `/=cmd|...` deja esa cadena en
   `security_events`; quien exporte la auditoria y la abra, ejecuta la formula.

2. **Escape del prefijo de tenant al subir media.** La extension salia del
   nombre del fichero del cliente y se concatenaba a la ruta:
   `a.../../../otro-tenant/evil` daba ext `/otro-tenant/evil` y la ruta quedaba
   `tenant-A/UUID./otro-tenant/evil`.

3. **`report_id` sin validar.** Se usaba en la ruta de almacenamiento y en la
   cabecera `Content-Disposition`. `../workspace-2/informe` leia del bucket de
   OTRO workspace; un salto de linea partia la cabecera de la respuesta.

Auditado y correcto, anotado para no repetirlo: `voice_pilot_v2` exige
`[a-f0-9]{32}` como storage key, y `os_deliverable_storage` reduce el nombre a
`PurePosixPath(...).name` con lista blanca.
"""
from __future__ import annotations

import csv
import io

import pytest

from core.csv_safety import INICIOS_PELIGROSOS, celda_segura, fila_segura


# ─────────────────────────────────────────── 1. CSV formula injection

@pytest.mark.parametrize("carga", [
    "=cmd|'/c calc'!A1",
    "+1+1",
    "-2+3",
    "@SUM(A1:A9)",
    "=HYPERLINK(\"http://evil\",\"click\")",
    "\t=1+1",
])
def test_una_celda_que_abriria_formula_se_neutraliza(carga):
    """La propiedad central."""
    salida = celda_segura(carga)
    assert salida.startswith("'"), f"{carga!r} sigue abriendo formula"
    assert salida[1:] == carga, "el contenido no debe alterarse, solo prefijarse"


@pytest.mark.parametrize("valor", ["Ana Perez", "correo@dominio.com", "", "3 - 4"])
def test_el_texto_normal_no_se_toca(valor):
    """Contraprueba: prefijar todo haria ilegible cualquier export."""
    assert celda_segura(valor) == valor


@pytest.mark.parametrize("valor", [1, 3.5, None, True])
def test_los_no_textos_pasan_intactos(valor):
    """Convertirlos a texto cambiaria el tipo de la columna."""
    assert celda_segura(valor) is valor


def test_el_csv_resultante_no_contiene_una_formula_viva():
    """
    Comprobacion de extremo a extremo: se escribe un CSV real con una carga y se
    relee, para no fiarse solo de la funcion.
    """
    buffer = io.StringIO()
    escritor = csv.writer(buffer)
    escritor.writerow(fila_segura(["nombre", "=cmd|'/c calc'!A1"]))
    buffer.seek(0)
    fila = next(csv.reader(buffer))
    assert not fila[1].startswith("="), f"formula viva en el CSV: {fila[1]!r}"
    assert fila[1] == "'=cmd|'/c calc'!A1"


def test_los_exportadores_reales_usan_el_saneado():
    """Regresion: un `writerow` sin envolver reabre el agujero."""
    import ast
    from pathlib import Path

    raiz = Path(__file__).resolve().parent.parent
    for fichero in ("services/audit_service.py", "services/reports_service.py"):
        arbol = ast.parse((raiz / fichero).read_text(encoding="utf-8"))
        crudos = []
        for n in ast.walk(arbol):
            if not (isinstance(n, ast.Call) and isinstance(n.func, ast.Attribute)):
                continue
            if n.func.attr != "writerow" or not n.args:
                continue
            # Se lee por AST y no por regex: el envoltorio suele quedar en la
            # linea siguiente y un patron de una sola linea lo daria por ausente.
            a = n.args[0]
            envuelto = isinstance(a, ast.Call) and getattr(a.func, "id", "") == "fila_segura"
            if not envuelto:
                crudos.append(n.lineno)
        assert crudos == [], f"{fichero}: writerow sin sanear en lineas {crudos}"


def test_la_lista_de_inicios_peligrosos_cubre_los_conocidos():
    for c in ("=", "+", "-", "@"):
        assert c in INICIOS_PELIGROSOS


# ─────────────────────────────────────────── 2. ruta de almacenamiento de media

def test_la_extension_sale_del_mime_y_no_del_nombre():
    """
    El nombre del fichero lo controla quien sube. El MIME ya paso por lista
    blanca, asi que la extension deja de ser una entrada.
    """
    from services.social_scheduler_service import ALLOWED_MIME, EXTENSION_POR_MIME

    assert set(EXTENSION_POR_MIME) == set(ALLOWED_MIME), (
        "cada MIME permitido necesita su extension, y ninguna de mas"
    )
    for ext in EXTENSION_POR_MIME.values():
        assert "/" not in ext and ".." not in ext, f"extension peligrosa: {ext}"


def test_el_nombre_del_cliente_ya_no_compone_la_ruta():
    """Regresion de forma del escape de prefijo de tenant."""
    from pathlib import Path

    import re

    src = (
        Path(__file__).resolve().parent.parent / "services" / "social_scheduler_service.py"
    ).read_text(encoding="utf-8")
    # Sin comentarios: el codigo explica el defecto NOMBRANDOLO, y un `in`
    # sobre el fuente confundiria la explicacion con el uso.
    salto = chr(10)
    codigo = salto.join(re.sub(r"#.*$", "", l) for l in src.split(salto))
    assert 'filename.rsplit(".", 1)' not in codigo, "la extension vuelve a salir del nombre"
    assert "EXTENSION_POR_MIME[mime]" in codigo


# ─────────────────────────────────────────── 3. identificador de informe

@pytest.mark.parametrize("malicioso", [
    "../workspace-2/informe",
    "..",
    "a/../../otro",
    'x"; evil',
    "con espacio",
    "a\nSet-Cookie: x=1",
    "a\r\nLocation: http://evil",
    "",
    "x" * 200,
])
def test_un_id_de_informe_malicioso_se_rechaza(malicioso):
    """Cierra a la vez el escape de bucket y la inyeccion de cabecera."""
    from services.reports_service import _id_informe_valido

    with pytest.raises(ValueError):
        _id_informe_valido(malicioso)


@pytest.mark.parametrize("bueno", ["abc-123", "rep_2026.01", "A1", "x" * 128])
def test_un_id_de_informe_normal_se_acepta(bueno):
    """Contraprueba: la validacion no rechaza los identificadores reales."""
    from services.reports_service import _id_informe_valido

    assert _id_informe_valido(bueno) == bueno


def test_el_id_se_valida_antes_de_componer_ruta_o_cabecera():
    from pathlib import Path

    src = (
        Path(__file__).resolve().parent.parent / "services" / "reports_service.py"
    ).read_text(encoding="utf-8")
    i = src.index("async def download_csv")
    cuerpo = src[i : i + 400]
    assert "_id_informe_valido(report_id)" in cuerpo
    assert cuerpo.index("_id_informe_valido") < cuerpo.index("_storage_prefix()")


# ─────────────────────────────────────────── auditado y correcto

def test_la_clave_de_almacenamiento_de_voz_no_admite_rutas():
    """32 hex: ni `..`, ni barras, ni nombres del cliente."""
    from services.voice_pilot_v2 import _sanitize_storage_key

    assert _sanitize_storage_key("a" * 32) is True
    for malo in ("../../etc/passwd", "a" * 31, "A" * 32, "a" * 32 + "/x", ""):
        assert _sanitize_storage_key(malo) is False, f"aceptado: {malo!r}"


@pytest.mark.parametrize("malo", ["..", ".", "", "   ", "../..", "\\"])
def test_el_nombre_de_entregable_rechaza_lo_que_no_es_un_nombre(malo):
    from services.os_deliverable_storage import sanitize_upload_filename

    with pytest.raises(ValueError):
        sanitize_upload_filename(malo)


@pytest.mark.parametrize("entrada,esperado", [
    ("../evil.pdf", "evil.pdf"),
    (chr(46)*2 + chr(92) + "evil.pdf", "evil.pdf"),  # ..\evil.pdf sin escape ambiguo
    ("a/b/c/informe.pdf", "informe.pdf"),
])
def test_el_nombre_de_entregable_se_reduce_a_su_base(entrada, esperado):
    """
    No rechaza una ruta: la REDUCE a su ultimo componente, que es igual de
    seguro y no pierde la subida. La premisa inicial de este test era que
    rechazaba, y era falsa.
    """
    from services.os_deliverable_storage import sanitize_upload_filename

    assert sanitize_upload_filename(entrada) == esperado


@pytest.mark.parametrize("entrada", ["/etc/passwd", "script.sh", "a.exe", "payload.php"])
def test_el_nombre_de_entregable_exige_un_tipo_permitido(entrada):
    """
    Control adicional que ya existia: ademas de reducir la ruta, exige que la
    extension este en lista blanca (pdf, jpg, png, docx, xlsx, zip...). Por eso
    `/etc/passwd` no llega ni a reducirse: `passwd` no es un tipo admitido.
    """
    from services.os_deliverable_storage import sanitize_upload_filename

    with pytest.raises(ValueError, match="file type not allowed"):
        sanitize_upload_filename(entrada)


def test_el_nombre_de_entregable_acepta_uno_normal():
    """Contraprueba de la anterior."""
    from services.os_deliverable_storage import sanitize_upload_filename

    assert sanitize_upload_filename("informe final.pdf") == "informe final.pdf"


def test_una_ruta_con_directorio_se_reduce_a_su_nombre():
    from services.os_deliverable_storage import sanitize_upload_filename

    assert sanitize_upload_filename("carpeta/sub/informe.pdf") == "informe.pdf"
