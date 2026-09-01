/** Los dos datos que faltan para cerrar el modelo. SOLO LECTURA, sin valores. */
import pg from "pg";
const C=["DATABASE_PUBLIC_URL","POSTGRES_PUBLIC_URL","DATABASE_URL","POSTGRES_URL"];
const n=C.find(x=>(process.env[x]??"").trim().length>0);
const cli=new pg.Client({connectionString:process.env[n],ssl:{rejectUnauthorized:false},statement_timeout:60000});
const o={ok:true};
try{
  await cli.connect(); await cli.query("BEGIN TRANSACTION READ ONLY");
  const q=async(s,p)=>(await cli.query(s,p)).rows;

  // activation_checklist: su tenant_id es TEXT. ¿Parece un uuid de saas_tenants?
  o.activationChecklist=(await q(
    `SELECT count(*)::int AS total,
            count(*) FILTER (WHERE tenant_id IS NULL)::int AS sin_tenant,
            count(*) FILTER (WHERE tenant_id ~ '^[0-9a-f]{8}-')::int AS con_forma_uuid,
            count(*) FILTER (WHERE EXISTS (SELECT 1 FROM saas_tenants st WHERE st.id::text = tenant_id))::int AS coincide_saas_tenants,
            count(*) FILTER (WHERE EXISTS (SELECT 1 FROM workspaces w WHERE w.id::text = tenant_id))::int AS coincide_workspace
       FROM saas_activation_checklist`))[0];

  // La familia canonica por workspace en el OS, para os_sector_shield_audits.
  o.familiaOs=(await q(
    `SELECT p.qual, count(DISTINCT p.tablename)::int AS tablas
       FROM pg_policies p
      WHERE p.schemaname='public' AND p.cmd='SELECT'
        AND p.qual LIKE '%nelvyon_os_workspace_select%'
      GROUP BY p.qual ORDER BY tablas DESC LIMIT 2`));

  // La familia canonica por tenant uuid.
  o.familiaTenantUuid=(await q(
    `SELECT p.qual, count(DISTINCT p.tablename)::int AS tablas
       FROM pg_policies p
      WHERE p.schemaname='public' AND p.cmd IN ('SELECT','ALL')
        AND p.qual LIKE '%nelvyon_current_saas_tenant_uuid%'
      GROUP BY p.qual ORDER BY tablas DESC LIMIT 3`));

  // Y la familia por user_id, que ya aplico la 591.
  o.familiaUsuario=(await q(
    `SELECT p.qual, count(DISTINCT p.tablename)::int AS tablas
       FROM pg_policies p
      WHERE p.schemaname='public' AND p.cmd='SELECT'
        AND p.qual LIKE '%nelvyon_jwt_user_id%'
      GROUP BY p.qual ORDER BY tablas DESC LIMIT 2`));

  await cli.query("ROLLBACK");
}catch(e){o.ok=false;o.error=e instanceof Error?e.message:String(e);}
finally{await cli.end().catch(()=>{});}
console.log(JSON.stringify(o,null,2));
