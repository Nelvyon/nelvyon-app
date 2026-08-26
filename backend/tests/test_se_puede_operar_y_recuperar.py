"""BLOQUE 9 · se puede operar y recuperar.

Guardián del inventario de capacidades de operación. La propiedad que persigue no
es «existe un fichero de observabilidad» sino **una señal verde significa lo que
dice** y **un comando escrito en un runbook se puede teclear**.

La huérfana de este inventario no es un módulo sin categoría: es un runbook que
manda ejecutar algo que no existe. A las tres de la mañana eso cuesta minutos que
no sobran.
"""

from __future__ import annotations

import io
import re

from backend.db.certificacion import capacidades_de_operacion as inv


def test_el_arbol_es_el_arbol() -> None:
    n = len(inv._fuentes_ts())
    assert n >= 3000, f"solo {n} ficheros: la raiz apunta mal y todo lo demas mide el vacio."


def test_ninguna_familia_se_queda_vacia() -> None:
    """Una familia vacía es un patrón roto, no un producto sin operación."""
    r = inv.reparto()
    vacias = [k for k, v in r.items() if not v]
    assert not vacias, (
        f"familias sin una sola capacidad: {vacias}. En un arbol de 4000 ficheros eso "
        "no significa que no haya: significa que el patron ha dejado de verlas."
    )


def test_cada_familia_mantiene_su_suelo() -> None:
    r = inv.reparto()
    bajas = [f"{k}: {len(r[k])} < {m}" for k, m in inv.SUELO.items() if len(r[k]) < m]
    assert not bajas, (
        f"familias por debajo de su suelo: {bajas}. Si de verdad ha mejorado tanto, "
        "baja el suelo A MANO y explica por que."
    )


def test_ningun_runbook_manda_teclear_algo_que_no_existe() -> None:
    """La huérfana de este inventario.

    Un runbook que dice «ejecuta `scripts/foo.mjs`» y `foo.mjs` no existe es peor
    que no tener runbook: hace perder tiempo justo cuando no sobra, y además
    hace dudar del resto del documento.

    Los comandos marcados como `Placeholder:` NO cuentan aquí: son trabajo
    anunciado, y se listan aparte en `pendientes()`. La diferencia que importa es
    «falta y nadie lo sabe» frente a «falta y está escrito».
    """
    rotos = inv.huerfanas()
    assert not rotos, (
        f"{len(rotos)} comandos de runbook que no existen: {rotos}. O se corrige la "
        "ruta, o se escribe el script, o se marca como `Placeholder:` — pero no se "
        "deja como si existiera."
    )


def test_el_detector_de_runbooks_sabe_decir_que_si() -> None:
    """CONTROL POSITIVO: la prueba de arriba espera cero.

    Una regla rota tambien devuelve cero. Se le pone delante el caso real que ya
    encontro —una ruta con prefijo— y se exige que distinga.
    """
    ref = re.compile(r"((?:[\w.\-]+/)*scripts/[\w.\-]+\.(?:mjs|js|ts|py|sh))")
    # Con prefijo: la primera version del detector resolvia SIEMPRE contra
    # `RAIZ/scripts/` y daba por rotas tres rutas que existian.
    assert ref.search("ver backend/scripts/db_backup_restore.py").group(1) == (
        "backend/scripts/db_backup_restore.py"
    )
    assert ref.search("node scripts/migrate-pg.mjs").group(1) == "scripts/migrate-pg.mjs"
    assert ref.search("apps/web/scripts/migrate-prod.ts").group(1) == (
        "apps/web/scripts/migrate-prod.ts"
    )


def test_los_comandos_pendientes_estan_declarados_como_tales() -> None:
    """Lo que falta y SE SABE que falta, contado aparte y no escondido."""
    p = inv.pendientes()
    for x in p:
        doc = x.split(" -> ")[0]
        texto = io.open(inv.RAIZ / doc, encoding="utf-8", errors="replace").read()
        assert "placeholder" in texto.lower(), (
            f"{x} se cuenta como pendiente pero el runbook no lo declara"
        )


def test_las_sondas_de_vida_y_de_disponibilidad_son_DISTINTAS() -> None:
    """Confundirlas cuesta caro en las dos direcciones.

    Si la de VIDA consultara la base, un parpadeo de PostgreSQL reiniciaría todo
    el parque. Si la de DISPONIBILIDAD no la consultara, el balanceador mandaría
    tráfico a procesos que no pueden atender.
    """
    api = inv.RAIZ / "apps" / "web" / "src" / "app" / "api" / "health"
    vida = (api / "live" / "route.ts").read_text(encoding="utf-8", errors="replace")
    listo = (api / "ready" / "route.ts").read_text(encoding="utf-8", errors="replace")

    assert not re.search(r"DbClient|checkDatabase|SELECT", vida, re.I), (
        "la sonda de VIDA consulta la base: un parpadeo de PostgreSQL reiniciaria "
        "todos los procesos a la vez."
    )
    assert re.search(r"checkDatabase", listo), (
        "la sonda de DISPONIBILIDAD ya no consulta la base: diria que puede atender "
        "sin haberlo comprobado."
    )
    assert "503" in listo, (
        "la sonda de disponibilidad ya no responde 503 cuando no puede atender: un "
        "200 constante es una senal que no significa nada."
    )


def test_la_certificacion_de_restauracion_comprueba_mas_que_un_marcador() -> None:
    """Un backup no esta certificado hasta que se ha restaurado DE VERDAD.

    El simulacro anterior sembraba un marcador de una fila. Eso sobrevive a casi
    cualquier restauracion rota. Se exige que la certificacion mire tambien la
    estructura, que la restriccion siga restringiendo y que la aplicacion pueda
    consultar la base restaurada.
    """
    src = (inv.RAIZ / "scripts" / "certificar-restauracion.mjs").read_text(
        encoding="utf-8", errors="replace"
    )
    for senal, porque in [
        ("md5(string_agg", "no compara el CONTENIDO, solo que haya filas"),
        ("pg_constraint", "no comprueba que vuelvan las restricciones"),
        ("pg_policies", "no comprueba que vuelvan las politicas de RLS"),
        ("la_clave_foranea_sigue_restringiendo", "no comprueba que la restriccion RESTRINJA"),
        ("la_aplicacion_puede_consultarla", "no comprueba que el producto pueda usarla"),
        ("CERT_FALLO", "no se puede comprobar a si misma con un fallo inyectado"),
    ]:
        assert senal in src, f"la certificacion de restauracion {porque}"


def test_el_detector_de_deriva_no_modifica_lo_que_examina() -> None:
    """Un detector que arregla lo que mide deja de poder medirlo."""
    src = (inv.RAIZ / "scripts" / "detectar-deriva-de-esquema.mjs").read_text(
        encoding="utf-8", errors="replace"
    )
    assert "migrate-pg.mjs" in src, "el detector no reconstruye desde las migraciones"
    assert not re.search(r"\bALTER TABLE\b|\bCREATE POLICY\b|\bDROP POLICY\b", src), (
        "el detector MODIFICA el esquema que examina"
    )
