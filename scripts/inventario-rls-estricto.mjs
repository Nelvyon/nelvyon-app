/** La version ESTRICTA: toda tabla scoped sin RLS, tenga grants o no. SOLO LECTURA. */
import pg from "pg";
const C=["DATABASE_PUBLIC_URL","POSTGRES_PUBLIC_URL","DATABASE_URL","POSTGRES_URL"];
const n=C.find(x=>(process.env[x]??"").trim().length>0);
const cli=new pg.Client({connectionString:process.env[n],ssl:{rejectUnauthorized:false},statement_timeout:120000});
const o={ok:true};
try{
  await cli.connect(); await cli.query("BEGIN TRANSACTION READ ONLY");
  const q=async(s,p)=>(await cli.query(s,p)).rows;
  const sinRls=await q(
    `SELECT t.table_name AS tabla,
            (SELECT string_agg(DISTINCT c.column_name,'+' ORDER BY c.column_name) FROM information_schema.columns c
              WHERE c.table_schema='public' AND c.table_name=t.table_name
                AND c.column_name IN ('user_id','tenant_id','workspace_id')) AS cols,
            COALESCE((SELECT string_agg(DISTINCT tp.grantee,',' ORDER BY tp.grantee) FROM information_schema.table_privileges tp
              WHERE tp.table_schema='public' AND tp.table_name=t.table_name
                AND tp.grantee NOT IN ('postgres','PUBLIC')), '(solo postgres)') AS grants
       FROM information_schema.tables t
       JOIN pg_class pc ON pc.relname=t.table_name
       JOIN pg_namespace pn ON pn.oid=pc.relnamespace AND pn.nspname='public'
      WHERE t.table_schema='public' AND t.table_type='BASE TABLE' AND NOT pc.relrowsecurity
        AND left(t.table_name,5)<>'cert_'
        AND EXISTS (SELECT 1 FROM information_schema.columns c WHERE c.table_schema='public'
                     AND c.table_name=t.table_name AND c.column_name IN ('user_id','tenant_id','workspace_id'))
      ORDER BY 1`);
  for (const a of sinRls) a.filas=Number((await q(`SELECT count(*)::int AS n FROM public."${a.tabla}"`))[0].n);
  o.scopedSinRls=sinRls; o.cuantas=sinRls.length;
  o.filas=sinRls.reduce((s,a)=>s+a.filas,0);
  o.conDatos=sinRls.filter(a=>a.filas>0).length;
  await cli.query("ROLLBACK");
}catch(e){o.ok=false;o.error=e instanceof Error?e.message:String(e);}
finally{await cli.end().catch(()=>{});}
console.log(JSON.stringify(o,null,2));
