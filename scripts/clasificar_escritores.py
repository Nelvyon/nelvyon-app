"""Clasifica los ESCRITORES de cada tabla candidata. Solo lee.

LA PREGUNTA QUE DECIDE EL RIESGO
--------------------------------
Activar RLS rompe una escritura cuando quien escribe no tiene fijado el contexto
de inquilino. Asi que lo unico que importa de cada escritor es POR DONDE LLEGA:

    ruta HTTP autenticada   el gancho `after_begin` fija el contexto en cada
                            transaccion -> la politica lo dejara pasar
    barrido de fondo        usa `nelvyon_jobs`, que tiene BYPASSRLS -> RLS no le
                            afecta en absoluto
    webhook / publico       NO hay usuario autenticado, y por tanto no hay
                            contexto -> la escritura FALLARIA
    script / migracion      corre como `postgres` -> BYPASSRLS

Los dos primeros son seguros. El tercero es el que puede romper produccion, y es
el unico que hay que mirar de verdad.

COMO SE DETECTA UN CAMINO SIN AUTENTICAR
----------------------------------------
Por lo que declara la ruta: si su fichero no exige `get_current_user`,
`require_workspace` ni equivalente, no hay usuario. Es una heuristica, y por eso
el informe la marca como «revisar» en vez de decidir por su cuenta: lo que hace
es reducir 85 tablas a la lista corta que merece leerse a mano.
"""
from __future__ import annotations

import json
import pathlib
import re
import sys

RAIZ = pathlib.Path(__file__).resolve().parents[1]
BACKEND = RAIZ / "backend"

#: Marcas de que una ruta exige usuario autenticado y contexto de inquilino.
_AUTENTICA = re.compile(
    r"get_current_user|require_workspace|WorkspaceContext|Depends\(get_current|"
    r"require_auth|current_user\s*:",
    re.IGNORECASE)

#: Marcas de que el fichero corre como barrido de fondo (rol con BYPASSRLS).
_BARRIDO = re.compile(r"sesion_de_barrido|ensure_jobs_session_maker|nelvyon_jobs")

#: Marcas de entrada publica: sin usuario, y por tanto sin contexto.
_PUBLICO = re.compile(
    r"webhook|/public|public_api|include_in_schema\s*=\s*False|"
    r"stripe_signature|verify_signature|x-hub-signature",
    re.IGNORECASE)


def _clasificar(fichero: str, texto: str) -> str:
    if _BARRIDO.search(texto):
        return "barrido"          # BYPASSRLS: RLS no le afecta
    if _PUBLICO.search(texto) and not _AUTENTICA.search(texto):
        return "publico"          # el unico peligroso
    if _AUTENTICA.search(texto):
        return "autenticado"      # el gancho fija el contexto
    if fichero.startswith("services") or fichero.startswith("core"):
        return "servicio"         # depende de quien lo llame: revisar
    return "revisar"


def main() -> int:
    detalle = RAIZ / "docs" / "evidence" / "aislamiento_tablas_sin_rls.json"
    if not detalle.exists():
        print("Falta el informe de auditar_aislamiento.py", file=sys.stderr)
        return 2
    tablas = json.loads(detalle.read_text(encoding="utf-8"))

    cache: dict[str, str] = {}

    def _texto(rel: str) -> str:
        if rel not in cache:
            p = BACKEND / rel.replace("\\", "/")
            try:
                cache[rel] = p.read_text(encoding="utf-8", errors="replace")
            except OSError:
                cache[rel] = ""
        return cache[rel]

    resumen: dict[str, list[str]] = {}
    for t in tablas:
        if t["lote"] != "C":
            continue
        clases = set()
        for f in t["escribe"]:
            clases.add(_clasificar(f, _texto(f)))
        # La clase de la TABLA es la peor de sus escritores: basta uno que pueda
        # romperse para que el lote entero no sea seguro.
        if "publico" in clases:
            clase = "PELIGRO_publico"
        elif "revisar" in clases or "servicio" in clases:
            clase = "REVISAR_servicio"
        elif clases == {"barrido"}:
            clase = "SEGURO_barrido"
        else:
            clase = "SEGURO_autenticado"
        resumen.setdefault(clase, []).append(t["tabla"])

    for clase in sorted(resumen):
        filas = resumen[clase]
        print(f"── {clase} ({len(filas)})")
        for t in sorted(filas):
            print(f"   {t}")
        print()

    destino = RAIZ / "docs" / "evidence" / "aislamiento_escritores.json"
    destino.write_text(json.dumps(resumen, indent=2, ensure_ascii=False),
                       encoding="utf-8")
    print(f"detalle: {destino}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
