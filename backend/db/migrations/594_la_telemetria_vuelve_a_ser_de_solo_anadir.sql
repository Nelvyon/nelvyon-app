-- 594 — la telemetria y los pedidos vuelven a no ser editables por su inquilino.
--
-- QUE PASA
-- ---------
-- Tres tablas cuyo control de integridad NO es una politica, sino la AUSENCIA
-- de ciertos verbos:
--
--   landing_analytics  visitas de una landing. Sin UPDATE ni DELETE.
--   qr_scans           escaneos de un QR. Sin UPDATE ni DELETE.
--   os_store_orders    pedidos. Sin DELETE: es un registro financiero.
--
-- Una fila de telemetria que su propio inquilino puede reescribir no mide nada
-- —y las dos primeras alimentan atribucion, o sea dinero—. Un pedido que se
-- puede borrar deja de ser la prueba de que hubo una venta.
--
-- La 507 les crea una politica `FOR ALL`:
--
--     CREATE POLICY landing_analytics_tenant ON landing_analytics FOR ALL …
--     CREATE POLICY qr_scans_tenant          ON qr_scans          FOR ALL …
--     CREATE POLICY os_store_orders_tenant   ON os_store_orders   FOR ALL …
--
-- `FOR ALL` incluye UPDATE y DELETE. Con ella, el control desaparece.
--
-- POR QUE NO SE HABIA VISTO
-- --------------------------
-- Porque en produccion NO EXISTE. La 507 quedo registrada en el libro de
-- migraciones sin llegar a ejecutar sus sentencias —el mismo defecto que dejo
-- 55 sentencias suyas sin correr—, asi que produccion tiene lo correcto:
-- `landing_analytics` y `qr_scans` con INSERT y SELECT, y `os_store_orders`
-- con INSERT, SELECT y UPDATE. Ninguna con DELETE. Medido en solo lectura el
-- 2026-09-01.
--
-- El esquema volvio a construirse desde cero el 2026-08-28 (commit 6afa77f4).
-- Desde entonces la 507 SI corre, y cualquier base nueva nace con el control
-- quitado. Es la divergencia local/produccion de siempre, pero AL REVES: aqui
-- lo local es mas debil que lo que hay desplegado, y por eso ninguna alarma
-- productiva podia sonar. La sono una prueba que declara la lista de tablas de
-- solo-anadir y comprueba que sigue siendo exactamente esa.
--
-- QUE HACE
-- ---------
-- Quita las tres politicas `FOR ALL`. Deja exactamente los verbos que
-- produccion tiene hoy y que la lista de tablas de solo-anadir declara.
--
-- EN PRODUCCION NO HACE NADA: las politicas no estan. `DROP POLICY IF EXISTS`
-- sobre algo que no existe es un no-op, y por eso esta migracion es segura
-- aplicada en cualquier orden y cualquier numero de veces.
--
-- NO SE TOCA LA 507. Es un fichero ya aplicado; editarlo cambiaria lo que dice
-- haber hecho sin cambiar lo que hizo.
--
-- COSTE EXTERNO: 0 EUR.

DROP POLICY IF EXISTS landing_analytics_tenant ON public.landing_analytics;
DROP POLICY IF EXISTS qr_scans_tenant          ON public.qr_scans;
DROP POLICY IF EXISTS os_store_orders_tenant    ON public.os_store_orders;

-- Autocomprobacion: si alguna de las dos conserva una politica que permita
-- UPDATE o DELETE, esta migracion no ha hecho su trabajo y hay que mirarlo.
DO $$
DECLARE
    sobran TEXT;
BEGIN
    SELECT string_agg(tablename || '.' || policyname || ' (' || cmd || ')', ', ')
      INTO sobran
      FROM pg_policies
     WHERE schemaname = 'public'
       AND ((tablename IN ('landing_analytics', 'qr_scans')
             AND cmd IN ('ALL', 'UPDATE', 'DELETE'))
         OR (tablename = 'os_store_orders' AND cmd IN ('ALL', 'DELETE')));

    IF sobran IS NOT NULL THEN
        RAISE EXCEPTION
          'migracion 594: sigue habiendo verbos que el control prohibe: %',
          sobran;
    END IF;
END
$$;
