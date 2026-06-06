-- Validación post-migración OS (281 + 282) — solo lectura

-- 1) Migraciones aplicadas
SELECT name, executed_at
FROM _migrations
WHERE name IN ('281_os_deals_tasks.sql', '282_os_expenses_cashflow.sql')
ORDER BY name;

-- 2) Tablas existen
SELECT
  to_regclass('public.os_deals') IS NOT NULL AS os_deals,
  to_regclass('public.os_tasks') IS NOT NULL AS os_tasks,
  to_regclass('public.os_expenses') IS NOT NULL AS os_expenses,
  to_regclass('public.os_cashflow') IS NOT NULL AS os_cashflow;

-- 3) Conteos (pueden ser 0)
SELECT 'os_deals' AS tbl, COUNT(*)::bigint AS n FROM os_deals
UNION ALL SELECT 'os_tasks', COUNT(*) FROM os_tasks
UNION ALL SELECT 'os_expenses', COUNT(*) FROM os_expenses
UNION ALL SELECT 'os_cashflow', COUNT(*) FROM os_cashflow;
