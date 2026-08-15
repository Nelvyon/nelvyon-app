"""Una migracion no puede apartar una tabla que alguien consulta por SQL crudo.

EL FALLO QUE ESTO IMPIDE
------------------------
La migracion 532 aparto `conversations` como `conversations_saas_legacy` para
que `create_all` creara la version del ORM. Lo justifico con este recuento,
escrito en su propia cabecera:

    conversations   workspace_id 0 · tenant_id 0   ningun SQL crudo; solo ORM

Era falso. Hay veintidos referencias en SQL crudo, todas por `tenant_id`, en
TypeScript que aquel barrido no miro: `SaasInboxService`, `SaasWhatsAppService`
y `SaasWhatsAppCloudService`.

Lo que se rompio, medido en staging: `/api/saas/inbox` -> 503 SCHEMA_MISMATCH,
porque la consulta hace `FROM conversations c WHERE c.tenant_id = $1` sobre una
tabla que ya no tiene esa columna. Y produccion, consultada en lectura, tiene la
forma MIGRADA con `tenant_id` — o sea que reconstruir desde el repositorio
producia una base distinta de la real.

El fallo de fondo no fue la decision, fue el recuento. Por eso este test no
comprueba una conclusion: RECUENTA, y compara con lo que la migracion afirma.
"""
from __future__ import annotations

import re
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent.parent
MIGRACIONES = REPO / "backend" / "db" / "migrations"

#: Directorios donde vive SQL crudo. `backend/saas` es TypeScript dentro de
#: `backend/`, que es exactamente lo que el barrido de la 532 se salto.
FUENTES = (
    REPO / "backend",
    REPO / "apps" / "web" / "src",
    REPO / "packages",
)

_EXTENSIONES = {".ts", ".tsx", ".py", ".mts", ".js", ".mjs"}


def _ficheros():
    for raiz in FUENTES:
        if not raiz.is_dir():
            continue
        for f in raiz.rglob("*"):
            if (f.suffix in _EXTENSIONES
                    and f.is_file()
                    and "node_modules" not in f.parts
                    and ".next" not in f.parts
                    and "__tests__" not in f.parts
                    and not f.name.startswith("test_")):
                yield f


def consumidores_sql(tabla: str) -> dict[str, int]:
    """Ficheros con SQL crudo sobre `tabla`, y cuantas referencias cada uno.

    Se exige limite de palabra por los dos lados para no contar `chat_x`,
    `chatbot_x`, `omnichannel_x` ni `x_legacy` como si fueran la tabla.
    """
    patron = re.compile(
        rf"\b(?:FROM|JOIN|INTO|UPDATE)\s+(?:public\.)?{tabla}\b(?!_)",
        re.IGNORECASE,
    )
    encontrados: dict[str, int] = {}
    for f in _ficheros():
        n = len(patron.findall(f.read_text(encoding="utf-8", errors="replace")))
        if n:
            encontrados[f.relative_to(REPO).as_posix()] = n
    return encontrados


def tablas_apartadas_por_migraciones() -> set[str]:
    """Tablas que alguna migracion renombra a `<tabla>_saas_legacy`."""
    apartadas: set[str] = set()
    for fichero in sorted(MIGRACIONES.glob("*.sql")):
        texto = fichero.read_text(encoding="utf-8", errors="replace")
        # La 532 construye el nombre: `objetivo || '_saas_legacy'` sobre una lista.
        if "_saas_legacy" not in texto:
            continue
        for bloque in re.findall(r"ARRAY\s*\[([^\]]+)\]", texto):
            apartadas.update(re.findall(r"'([a-z_]+)'", bloque))
    return apartadas


def test_la_migracion_534_existe_y_restaura_la_canonica():
    """Sin ella, una base reconstruida no se parece a produccion."""
    f = MIGRACIONES / "534_conversations_canonica_es_la_migrada.sql"
    assert f.is_file(), "falta la migracion 534"
    sql = f.read_text(encoding="utf-8")
    # El renombrado se hace con `format()` sobre una lista de tablas, no escrito
    # a mano: se comprueba que la lista incluya las dos y que exista el RENAME.
    assert "ALTER TABLE public.%I RENAME TO %I" in sql, "la 534 no renombra nada"
    for tabla in ("conversations", "deals"):
        assert f"'{tabla}'" in sql, f"la 534 no cubre {tabla}"
    assert "_saas_legacy" in sql, "la 534 no parte de las tablas apartadas"
    for destructivo in ("DROP TABLE", "DELETE FROM", "TRUNCATE", "DROP COLUMN"):
        assert destructivo not in sql.upper(), f"la 534 hace {destructivo}"


def test_ningun_consumidor_del_buzon_se_perdio_al_renombrar():
    """La 535 renombro la tabla; NO podia perder consumidores por el camino.

    Antes estas 22 referencias apuntaban a `conversations` y refutaban el
    recuento de la 532. Ahora apuntan a `saas_conversations`, que es el nombre
    correcto de la generacion tenant. El numero tiene que seguir ahi: si baja,
    es que se elimino funcionalidad en vez de renombrarla.
    """
    # Recuento POR FICHERO, medido antes de renombrar. Es mas exigente que un
    # total: un total permite que una consulta desaparezca de un servicio y
    # aparezca en otro sin que nadie se entere.
    #
    # (Las 22 referencias del informe anterior mezclaban las dos generaciones:
    # incluian `routers/conversations.py` y la revision de alembic, que son de
    # la generacion workspace y siguen apuntando a `conversations`, como debe
    # ser. Los consumidores tenant siempre fueron estos 18.)
    #
    # `SaasCeoBriefService` entro despues, y NO por un renombrado: contaba las
    # conversaciones abiertas contra `saas_inbox_conversations`, una tabla que
    # no existe y que no crea ninguna migracion. El `.catch` que envolvia la
    # consulta devolvia cero, asi que el resumen del CEO llevaba tiempo
    # afirmando que no habia ninguna conversacion abierta sin que se viera un
    # solo error. Su consulta pasa a la tabla real, que es esta.
    ESPERADO = {
        "backend/saas/SaasCeoBriefService.ts": 1,
        "backend/saas/SaasInboxService.ts": 10,
        "backend/saas/SaasWhatsAppCloudService.ts": 5,
        "backend/saas/SaasWhatsAppService.ts": 3,
    }
    consumidores = consumidores_sql("saas_conversations")
    assert consumidores == ESPERADO, (
        "el renombrado perdio o movio consultas del buzon.\n"
        f"  esperado: {ESPERADO}\n  encontrado: {consumidores}"
    )


def test_ya_nadie_consulta_conversations_por_tenant_id():
    """La otra mitad: el nombre sin prefijo quedo libre para el ORM.

    Si alguien vuelve a escribir `FROM conversations ... tenant_id`, reaparece
    exactamente el conflicto que costo dos despliegues encontrar.
    """
    for rel in consumidores_sql("conversations"):
        if not rel.startswith("backend/saas/"):
            continue
        raise AssertionError(f"{rel} vuelve a consultar `conversations` sin prefijo")


def test_el_barrido_no_confunde_tablas_con_prefijo_o_sufijo():
    """Control negativo: `chatbot_conversations` y `conversations_saas_legacy`
    NO son `conversations`. Sin esta distincion el recuento se infla y el test
    pasaria por razones equivocadas."""
    consumidores = consumidores_sql("conversations")
    texto_junto = " ".join(
        (REPO / f).read_text(encoding="utf-8", errors="replace") for f in consumidores
    )
    # Hay ficheros que mencionan ambas; lo que se comprueba es que el patron en
    # si no captura los nombres compuestos.
    patron = re.compile(r"\b(?:FROM|JOIN|INTO|UPDATE)\s+(?:public\.)?conversations\b(?!_)", re.I)
    for falso in ("FROM chatbot_conversations", "FROM conversations_saas_legacy",
                  "JOIN sms_conversations"):
        assert not patron.search(falso), f"el barrido captura {falso!r}"
    assert texto_junto, "sin fuentes que revisar"


def test_toda_tabla_apartada_se_restaura_despues():
    """La propiedad que importa es el estado FINAL de una base reconstruida.

    Apartar una tabla a mitad de la cadena es legitimo; dejarla apartada al
    final no lo es si produccion tiene la forma migrada, porque entonces el
    repositorio ya no sabe reproducir produccion — que fue justo lo que paso.

    Consultado en lectura sobre produccion (`information_schema` y `count(*)`),
    `conversations`, `deals`, `calendar_events`, `social_posts` y `audit_logs`
    tienen la forma MIGRADA, todas con 0 filas.
    """
    apartadas = tablas_apartadas_por_migraciones()
    restauracion = (MIGRACIONES / "534_conversations_canonica_es_la_migrada.sql").read_text(
        encoding="utf-8"
    )
    sin_restaurar = sorted(
        t for t in apartadas
        if f"'{t}'" not in restauracion and t != "subscriptions"
    )
    assert not sin_restaurar, (
        f"tablas que quedan apartadas al final de la cadena: {sin_restaurar}\n"
        "Si produccion tiene la forma migrada, hay que restaurarlas en la 534."
    )


def test_el_recuento_por_forma_distingue_los_dos_consumidores():
    """Lo que fallo en la 532 fue el RECUENTO, no la decision.

    Su cabecera afirmaba `conversations  workspace_id 0 · tenant_id 0`. Este
    test recuenta de verdad y exige que las DOS familias sean visibles, que es
    lo que convierte esto en una decision de producto y no en un descuido.
    """
    for tabla, esperado_tenant, esperado_workspace in (("saas_conversations", 3, 0), ("deals", 0, 2)):
        consumidores = consumidores_sql(tabla)
        por_tenant, por_workspace = [], []
        for rel in consumidores:
            texto = (REPO / rel).read_text(encoding="utf-8", errors="replace")
            if "tenant_id" in texto:
                por_tenant.append(rel)
            if "workspace_id" in texto:
                por_workspace.append(rel)
        assert len(por_tenant) >= esperado_tenant, (
            f"{tabla}: solo {len(por_tenant)} consumidores por tenant_id: {sorted(por_tenant)}"
        )
        assert len(por_workspace) >= esperado_workspace, (
            f"{tabla}: solo {len(por_workspace)} consumidores por workspace_id: {sorted(por_workspace)}"
        )
