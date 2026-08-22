# Migraciones apartadas

Migraciones escritas y certificadas que el fundador ha decidido **no aplicar
todavia**. No estan en el arbol desplegable, y una prueba lo impone.

## Por que no basta con no pedir su autorizacion

La puerta ADR-064 es **binaria**: `NELVYON_PROD_MIGRATE_APPROVED=1` habilita
`migrate:prod`, que aplica **todas** las migraciones pendientes del commit
desplegado. No sabe distinguir «estas cinco si, esa no».

Es decir: pedir ADR-064 para 568/569/570/572/573 y dejar 571 en el arbol
**la aplicaria igual**, sin que nadie lo hubiera autorizado y sin un solo error.
El mensaje de commit «NO MERGEAR» no lo impide: un mensaje no ejecuta nada.

La unica defensa que funciona es que el fichero **no este** en el commit que se
despliega. Eso es lo que hay aqui, y `test_las_migraciones_apartadas_no_estan_en_el_arbol`
lo comprueba en cada suite.

## Apartadas

| Mig | Fichero | SHA256 del blob | Motivo |
|-----|---------|-----------------|--------|
| 571 | `571_equipo_de_redes_sociales.sql` | `61e2ba44279dffc048e9aa389bb2602bc1abceb2ecdc623406c0c46da29dccba` | El fundador la aparto: quiere el sistema de agentes disenado como el equipo completo de elite de NELVYON antes de fijar su esquema. Aplicarla ahora congelaria un diseno que va a cambiar. |

## Recuperarla cuando toque

    git show d4126605:backend/db/migrations/571_equipo_de_redes_sociales.sql \
      > backend/db/migrations/571_equipo_de_redes_sociales.sql

Verificar despues que el SHA256 coincide con el de la tabla, quitar su fila de
aqui, y solo entonces pedir ADR-064.
