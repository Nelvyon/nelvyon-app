# Si falla una migración a mitad

Lo escribe `scripts/son-atomicas-las-migraciones.mjs`. **No aplica ninguna.**

La pregunta que decide si se puede migrar con una copia de hace 28 horas no es
«¿van a fallar?» sino **«si falla la número 13, en qué estado queda la base?»**.

## De dónde sale la atomicidad

El migrador manda cada fichero entero en un solo `pool.query(sql)`, **sin `BEGIN`**.
Eso no es un descuido: PostgreSQL envuelve cada petición del protocolo simple en una
**transacción implícita**, así que un fallo en la sentencia 7 revierte también las 6
anteriores. Cada migración es todo o nada.

Eso se rompe con tres cosas —`CREATE INDEX CONCURRENTLY`, un `COMMIT` dentro del
fichero, o `VACUUM`— y por eso se comprueban una a una.

## ¿Alguna rompe la transacción?

**Ninguna de las 21.** Ni un `CREATE INDEX CONCURRENTLY`, ni un `COMMIT` suelto, ni un
`VACUUM`. Las 21 son atómicas: cada una se aplica entera o no se aplica.

Consecuencia para la decisión: **un fallo en la número N deja las N−1 anteriores
aplicadas y la N sin empezar.** No hay estado a medias. Se corrige la N y se sigue.

## La ventana que sí existe

El apunte en `_migrations` va en una petición **separada** de la migración. Si la
migración aplica y el apunte falla —se cae la red justo ahí—, la base queda cambiada y
el libro dice que no. Al reintentar, esa migración se ejecutaría por segunda vez.

Cuánto importa depende de si la migración aguanta ejecutarse dos veces, y eso se mide
abajo: las que usan `IF NOT EXISTS` en todo lo que crean sí aguantan.

## Qué hace cada una

| Migración | Tablas | Índices | Políticas | Columnas | RLS | UPDATE | Destructivo | Bloquea |
|---|---|---|---|---|---|---|---|---|
| `568_rls_os_tablas_vacias_restantes` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | no |
| `569_rls_os_tablas_con_datos` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | no |
| `570_rls_saas_tenant_id_no_uuid` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | no |
| `572_rls_saas_tablas_con_datos` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | no |
| `573_indices_de_inquilino_en_tablas_sociales` | 0 | 2 | 0 | 0 | 0 | 0 | 0 | no |
| `574_atribuir_las_auditorias_de_shield_sin_dueno` | 1 | 0 | 0 | 0 | 0 | 0 | 0 | no |
| `575_reparar_lo_que_la_507_y_la_406_no_llegaron_a_crear` | 4 | 4 | 1 | 1 | 1 | 0 | 0 | no |
| `576_columnas_que_el_codigo_escribe_y_no_existian` | 0 | 0 | 0 | 8 | 0 | 0 | 0 | no |
| `577_roles_del_lado_web` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | no |
| `578_las_cinco_tablas_que_nunca_se_crearon` | 5 | 5 | 1 | 0 | 1 | 0 | 0 | no |
| `579_la_cola_que_nadie_vaciaba` | 0 | 3 | 0 | 9 | 0 | 0 | 0 | no |
| `580_autorizacion_de_gasto_externo` | 2 | 3 | 2 | 0 | 2 | 0 | 0 | no |
| `581_cerebro_de_negocio` | 2 | 3 | 2 | 0 | 2 | 0 | 0 | no |
| `582_el_cliente_puede_pedir_y_conectar` | 2 | 3 | 2 | 0 | 2 | 0 | 0 | no |
| `583_motor_de_resultados` | 4 | 5 | 4 | 0 | 4 | 0 | 0 | no |
| `584_inteligencia_entre_departamentos` | 1 | 3 | 1 | 0 | 1 | 0 | 0 | no |
| `585_indice_por_inquilino_donde_manda_rls` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | no |
| `586_prospeccion_responsable` | 2 | 2 | 1 | 0 | 1 | 0 | 0 | no |
| `587_dos_chatbots_dos_tablas` | 1 | 2 | 1 | 0 | 1 | 0 | 0 | no |
| `588_lo_que_faltaba_de_verdad` | 0 | 2 | 0 | 1 | 0 | 0 | 0 | no |
| `589_del_prospecto_al_cliente` | 2 | 3 | 2 | 0 | 2 | 0 | 0 | no |

## Reversibilidad, una por una

**Lo que crea una migración se puede tirar; lo que cambia un `UPDATE` no vuelve solo.**
Ésa es toda la diferencia entre poder deshacer sin restaurar y no poder.

**Ninguna de las 21 modifica datos existentes.** Todas son aditivas.

**Ninguna quita ni renombra nada** fuera de comentarios. Es lo que permite el rollback
lógico: deshacerlas es tirar lo que crearon, sin tocar lo que ya había.

**12 no documentan su vuelta atrás en la cabecera:**

- `576_columnas_que_el_codigo_escribe_y_no_existian.sql`
- `579_la_cola_que_nadie_vaciaba.sql`
- `580_autorizacion_de_gasto_externo.sql`
- `581_cerebro_de_negocio.sql`
- `582_el_cliente_puede_pedir_y_conectar.sql`
- `583_motor_de_resultados.sql`
- `584_inteligencia_entre_departamentos.sql`
- `585_indice_por_inquilino_donde_manda_rls.sql`
- `586_prospeccion_responsable.sql`
- `587_dos_chatbots_dos_tablas.sql`
- `588_lo_que_faltaba_de_verdad.sql`
- `589_del_prospecto_al_cliente.sql`

## Qué hacer si falla la número N

1. **Parar.** El migrador ya lo hace: al primer fallo corta y no sigue con las demás.
2. **Mirar el libro.** `_migrations` dice exactamente cuáles entraron. Las N−1 anteriores
   están aplicadas y completas; la N no ha dejado nada.
3. **No restaurar todavía.** Restaurar la copia de hace 28 horas cuesta 28 horas de
   trabajo de clientes. Con las migraciones aditivas, el esquema a medias **funciona**:
   tiene más tablas de las que tenía y ninguna menos.
4. **Arreglar la N y seguir.** Las N−1 no se repiten: el libro las salta.

**El único escenario que obliga a restaurar** es que una migración destruya o modifique
datos y falle después. Según la tabla de arriba, eso hoy no puede pasar con ninguna de
las 21.
