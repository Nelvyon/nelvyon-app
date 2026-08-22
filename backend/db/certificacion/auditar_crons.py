"""Que servicios alcanzan los crons, y que mutaciones hacen sin acotar.

Se sigue el grafo de imports desde cada ruta de cron: el SQL no vive en la ruta,
vive en los servicios que llama, y auditar solo el fichero de la ruta no ve nada.
"""
import io
import json
import pathlib
import re
import collections

R = pathlib.Path(r"C:\Users\Daniel\nelvyon-w2")
WEB = R / "apps" / "web" / "src"
RUTA = pathlib.Path(r"C:\Users\Daniel\AppData\Local\Temp\claude"
                    r"\c--Proyectos-Nelvyon\e5b3fd2e-c6c8-4045-845a-22bd5c8c89e5\scratchpad")

ALIAS = {"@nelvyon/saas": R / "backend" / "saas",
         "@nelvyon/os-agents": R / "backend" / "os-agents",
         "@nelvyon/billing": R / "backend" / "billing",
         "@nelvyon/admin": R / "backend" / "admin",
         "@nelvyon/email": R / "backend" / "email",
         "@nelvyon/auth": R / "backend" / "auth"}


def resolver(desde: pathlib.Path, spec: str):
    """Ruta del modulo importado, si se puede resolver a un fichero del repo."""
    base = None
    if spec.startswith("."):
        base = (desde.parent / spec).resolve()
    elif spec.startswith("@/"):
        base = (WEB / spec[2:]).resolve()
    else:
        for a, d in ALIAS.items():
            if spec == a or spec.startswith(a + "/"):
                resto = spec[len(a):].lstrip("/")
                base = (d / resto).resolve() if resto else (d / "index").resolve()
                break
    if base is None:
        return None
    for cand in (base.with_suffix(".ts"), base.with_suffix(".tsx"),
                 base / "index.ts", base):
        if cand.is_file():
            return cand
    return None


def alcanzables(semillas, tope=4000):
    vistos, cola = set(), list(semillas)
    while cola and len(vistos) < tope:
        f = cola.pop()
        if f in vistos or not f.is_file():
            continue
        vistos.add(f)
        try:
            s = io.open(f, encoding="utf-8", errors="replace").read()
        except OSError:
            continue
        for spec in re.findall(r"""from\s+["']([^"']+)["']""", s):
            d = resolver(f, spec)
            if d and d not in vistos:
                cola.append(d)
        for spec in re.findall(r"""import\(\s*["']([^"']+)["']""", s):
            d = resolver(f, spec)
            if d and d not in vistos:
                cola.append(d)
    return vistos


def literales(texto):
    i = 0
    while (i := texto.find("`", i)) != -1:
        j = i + 1
        while j < len(texto) and texto[j] != "`":
            if texto[j] == "\\":
                j += 1
            j += 1
        yield texto[i + 1:j]
        i = j + 1


def main() -> None:
    crons = sorted((WEB / "app" / "api" / "cron").rglob("route.ts"))
    print(f"rutas de cron: {len(crons)}")
    mod = alcanzables(crons)
    print(f"modulos alcanzables desde ellas: {len(mod)}")

    mutaciones = []
    for f in sorted(mod):
        if "__tests__" in str(f):
            continue
        s = io.open(f, encoding="utf-8", errors="replace").read()
        for q in literales(s):
            m = re.match(r"\s*(UPDATE|DELETE\s+FROM)\s+(?:public\.)?([a-z_][a-z0-9_]*)", q, re.I)
            if not m:
                continue
            verbo = "UPDATE" if m.group(1).upper().startswith("UPDATE") else "DELETE"
            tabla = m.group(2).lower()
            acotada = bool(re.search(r"\b(tenant_id|workspace_id|client_id|user_id)\b", q, re.I))
            tiene_where = bool(re.search(r"\bWHERE\b", q, re.I))
            mutaciones.append({
                "f": f.relative_to(R).as_posix(), "verbo": verbo, "tabla": tabla,
                "acotada": acotada, "where": tiene_where,
                "q": " ".join(q.split())[:160],
            })

    total = len(mutaciones)
    sin_acotar = [m for m in mutaciones if not m["acotada"]]
    sin_where = [m for m in mutaciones if not m["where"]]
    print(f"\nmutaciones alcanzables desde crons : {total}")
    print(f"  sin columna de inquilino          : {len(sin_acotar)}")
    print(f"  SIN NINGUN WHERE                  : {len(sin_where)}")
    print()
    for m in sin_where[:12]:
        print(f"   SIN WHERE  {m['tabla']:32} {m['f']}")
    print()
    c = collections.Counter(m["tabla"] for m in sin_acotar)
    print("tablas mutadas sin columna de inquilino (top):")
    for t, n in c.most_common(12):
        print(f"   {n:3}x  {t}")
    io.open(RUTA / "mutaciones_cron.json", "w", encoding="utf-8").write(
        json.dumps(sin_acotar, indent=1))


main()
