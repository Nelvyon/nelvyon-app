/** Verificacion post-592 + reinventario completo. SOLO LECTURA, sin valores. */
import pg from "pg";
const C=["DATABASE_PUBLIC_URL","POSTGRES_PUBLIC_URL","DATABASE_URL","POSTGRES_URL"];
const n=C.find(x=>(process.env[x]??"").trim().length>0);
const cli=new pg.Client({connectionString:process.env[n],ssl:{rejectUnauthorized:false},statement_timeout:120000});
const CINCO=["os_sector_shield_audits","saas_pack_entitlements","saas_tenants","saas_autopilot_settings","saas_activation_checklist"];
const o={ok:true};
try{
  await cli.connect(); await cli.query("BEGIN TRANSACTION READ ONLY");
  const q=async(s,p)=>(await cli.query(s,p)).rows;

  o.ledger={total:Number((await q("SELECT count(*)::int AS n FROM _migrations"))[0].n),
            ultimas:(await q("SELECT name FROM _migrations ORDER BY name DESC LIMIT 4")).map(r=>r.name)};

  o.cinco=[];
  for (const t of CINCO) {
    const r=(await q(`SELECT c.relrowsecurity AS rls, c.relforcerowsecurity AS force,
        (SELECT count(*)::int FROM pg_policies p WHERE p.tablename=c.relname AND p.policyname LIKE '%\_592\_%') AS pol
        FROM pg_class c JOIN pg_namespace nn ON nn.oid=c.relnamespace AND nn.nspname='public'
       WHERE c.relkind='r' AND c.relname=$1`,[t]))[0];
    const filas=Number((await q(`SELECT count(*)::int AS n FROM public."${t}"`))[0].n);
    const idx=(await q(`SELECT count(*)::int AS n FROM pg_class WHERE relkind='i' AND relname LIKE $1`,[t+'%']))[0].n;
    o.cinco.push({tabla:t,rls:r.rls,force:r.force,politicas:Number(r.pol),filas,indices:Number(idx)});
  }
  o.politicas592=Number((await q(`SELECT count(*)::int AS n FROM pg_policies WHERE policyname LIKE '%\_592\_%'`))[0].n);
  o.tablasCon592=Number((await q(`SELECT count(DISTINCT tablename)::int AS n FROM pg_policies WHERE policyname LIKE '%\_592\_%'`))[0].n);

  // REINVENTARIO COMPLETO DE LAS 733.
  const abiertas=await q(
    `SELECT t.table_name AS tabla,
            (SELECT string_agg(DISTINCT c.column_name,'+' ORDER BY c.column_name) FROM information_schema.columns c
              WHERE c.table_schema='public' AND c.table_name=t.table_name
                AND c.column_name IN ('user_id','tenant_id','workspace_id')) AS cols,
            (SELECT string_agg(DISTINCT tp.grantee,',' ORDER BY tp.grantee) FROM information_schema.table_privileges tp
              WHERE tp.table_schema='public' AND tp.table_name=t.table_name AND tp.privilege_type='SELECT'
                AND tp.grantee IN ('anon','authenticated','nelvyon_web_app','nelvyon_web_jobs')) AS lee
       FROM information_schema.tables t
       JOIN pg_class pc ON pc.relname=t.table_name
       JOIN pg_namespace pn ON pn.oid=pc.relnamespace AND pn.nspname='public'
      WHERE t.table_schema='public' AND t.table_type='BASE TABLE' AND NOT pc.relrowsecurity
        AND left(t.table_name,5)<>'cert_'
        AND EXISTS (SELECT 1 FROM information_schema.columns c WHERE c.table_schema='public'
                     AND c.table_name=t.table_name AND c.column_name IN ('user_id','tenant_id','workspace_id'))
        AND EXISTS (SELECT 1 FROM information_schema.table_privileges tp WHERE tp.table_schema='public'
                     AND tp.table_name=t.table_name AND tp.privilege_type='SELECT'
                     AND tp.grantee IN ('anon','authenticated','nelvyon_web_app','nelvyon_web_jobs'))
      ORDER BY 1`);
  for (const a of abiertas) a.filas=Number((await q(`SELECT count(*)::int AS n FROM public."${a.tabla}"`))[0].n);
  o.inventario={
    tablasTotales:Number((await q(`SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'`))[0].n),
    conRls:Number((await q(`SELECT count(*)::int AS n FROM pg_class c JOIN pg_namespace nn ON nn.oid=c.relnamespace AND nn.nspname='public' WHERE c.relkind='r' AND c.relrowsecurity`))[0].n),
    scoped:Number((await q(`SELECT count(DISTINCT c.table_name)::int AS n FROM information_schema.columns c
        JOIN information_schema.tables t ON t.table_schema=c.table_schema AND t.table_name=c.table_name AND t.table_type='BASE TABLE'
       WHERE c.table_schema='public' AND c.column_name IN ('user_id','tenant_id','workspace_id')`))[0].n),
    abiertas, cuantasAbiertas:abiertas.length,
    filasExpuestas:abiertas.reduce((s,a)=>s+a.filas,0),
  };

  o.salud={bloqueos:Number((await q(`SELECT count(*)::int AS n FROM pg_locks WHERE NOT granted`))[0].n),
    txLargas:Number((await q(`SELECT count(*)::int AS n FROM pg_stat_activity WHERE xact_start IS NOT NULL AND now()-xact_start > interval '60 seconds'`))[0].n),
    conexiones:Number((await q(`SELECT count(*)::int AS n FROM pg_stat_activity`))[0].n),
    tamano:(await q(`SELECT pg_size_pretty(pg_database_size(current_database())) AS t`))[0].t};
  o.jobs=await q(`SELECT status, count(*)::int AS n FROM os_jobs GROUP BY status`);

  await cli.query("ROLLBACK");
}catch(e){o.ok=false;o.error=e instanceof Error?e.message:String(e);}
finally{await cli.end().catch(()=>{});}
console.log(JSON.stringify(o,null,2));
